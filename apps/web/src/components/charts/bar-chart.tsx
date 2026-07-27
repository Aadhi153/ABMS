import { useState } from "react";

export interface BarDatum {
  label: string;
  value: number;
  colorVar?: string;
}

/** Minimal dependency-free bar chart: thin bars, rounded data-ends, hover tooltip, direct value labels. */
export function BarChart({
  data,
  colorVar = "--primary",
  formatValue = (v: number) => v.toLocaleString(),
  height = 220,
}: {
  data: BarDatum[];
  colorVar?: string;
  formatValue?: (v: number) => string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const barWidth = 100 / data.length;
  const gap = barWidth * 0.28;

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No data yet.</p>;
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="h-56 w-full overflow-visible">
        <line x1="0" y1={height - 24} x2="100" y2={height - 24} stroke="hsl(var(--border))" strokeWidth="0.5" />
        {data.map((d, i) => {
          const barHeight = (d.value / max) * (height - 48);
          const x = i * barWidth + gap / 2;
          const w = barWidth - gap;
          const y = height - 24 - barHeight;
          const isHover = hover === i;
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect
                x={x}
                y={y}
                width={w}
                height={barHeight}
                rx={Math.min(1.5, w / 2)}
                fill={`hsl(var(${d.colorVar ?? colorVar}))`}
                opacity={isHover ? 1 : 0.85}
              />
              <text x={x + w / 2} y={height - 12} textAnchor="middle" fontSize="3.2" fill="hsl(var(--muted-foreground))">
                {d.label.length > 10 ? `${d.label.slice(0, 9)}…` : d.label}
              </text>
              {isHover && (
                <text x={x + w / 2} y={y - 3} textAnchor="middle" fontSize="3.6" fill="hsl(var(--foreground))" fontWeight={600}>
                  {formatValue(d.value)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
