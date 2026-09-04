import { Injectable, Logger } from "@nestjs/common";

const LOOKUP_TIMEOUT_MS = 1500;
const CACHE_TTL_MS = 60 * 60_000;

interface CacheEntry {
  value: string | null;
  expiresAt: number;
}

/**
 * Best-effort city-level IP geolocation. Loopback/private ranges (the common
 * case in dev, where every session comes from ::1 or a LAN IP) short-circuit
 * to a "Local network" label with no network call. Public IPs go through a
 * free lookup with a short timeout — failures/timeouts resolve to null so
 * callers always have a safe fallback, never a hung request.
 */
@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  private readonly cache = new Map<string, CacheEntry>();

  async resolveLocation(ip: string | null | undefined): Promise<string | null> {
    if (!ip) return null;
    const normalized = ip.trim();
    if (!normalized || this.isPrivateOrLoopback(normalized)) return "Local network";

    const cached = this.cache.get(normalized);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const value = await this.lookup(normalized);
    this.cache.set(normalized, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  }

  private async lookup(ip: string): Promise<string | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
    try {
      const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,city,regionName,country`, {
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { status: string; city?: string; regionName?: string; country?: string };
      if (data.status !== "success") return null;
      const parts = [data.city, data.regionName || data.country].filter(Boolean);
      return parts.length ? parts.join(", ") : null;
    } catch (err) {
      this.logger.debug(`Geo lookup failed for ${ip}: ${err instanceof Error ? err.message : err}`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  private isPrivateOrLoopback(ip: string): boolean {
    const bare = ip.replace(/^::ffff:/, "");
    if (bare === "::1" || bare === "127.0.0.1" || bare === "localhost") return true;
    if (/^127\./.test(bare)) return true;
    if (/^10\./.test(bare)) return true;
    if (/^192\.168\./.test(bare)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(bare)) return true;
    if (/^f[cd][0-9a-f]{2}:/i.test(bare)) return true; // fc00::/7 unique local
    if (/^fe80:/i.test(bare)) return true; // link-local
    return false;
  }
}
