import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  ArrowLeft,
  Ban,
  Building2,
  Camera,
  ChevronRight,
  Lock,
  Plus,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Warehouse as WarehouseIcon,
  type LucideIcon,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch,
  cn,
  toast,
} from "@abms/ui";
import { ALL_ROLES, NAV_MODULES, ROLE_LABELS, ROLE_MODULE_ACCESS, Role } from "@abms/shared";
import { ModulePlaceholder } from "../../components/module-placeholder";
import { FORM_ENTER, LIST_ENTER, LIST_EXIT, sectionMotion, usePageTransition } from "../products/form-motion";
import { SETTINGS_CARDS_BY_KEY, SETTINGS_CATEGORIES, type SettingCardDef } from "./settings-data";

export default function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const segment = location.pathname.split("/")[2];
  const card = segment ? SETTINGS_CARDS_BY_KEY[segment] : undefined;

  useEffect(() => {
    if (segment && !card) {
      navigate("/settings", { replace: true });
    }
  }, [segment, card, navigate]);

  if (!segment) {
    return <SettingsLanding />;
  }

  if (!card) {
    return null;
  }

  return (
    <div className={cn("space-y-6", FORM_ENTER)}>
      <div>
        <button
          type="button"
          onClick={() => navigate("/settings")}
          className="group mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors duration-150 ease-out hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 ease-out group-hover:-translate-x-0.5 motion-reduce:transition-none" />
          Settings
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{card.label}</h1>
          {card.restricted && <Lock className="h-4 w-4 text-muted-foreground" aria-label="Admin-only" />}
        </div>
        <p className="text-sm text-muted-foreground">{card.description}</p>
      </div>

      {card.key === "organization" && <OrganizationTab />}
      {card.key === "users" && <UsersTab />}
      {card.key === "permissions" && <PermissionsTab />}
      {card.key === "warehouses" && <WarehousesTab />}
      {card.key === "security" && <SecurityTab />}
      {card.key === "tax-configuration" && <TaxConfigurationView />}
      {card.key === "pricing-discounts" && <PricingDiscountsView />}
      {card.status === "placeholder" && <ModulePlaceholder title={card.label} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Landing — categorized settings grid
// ---------------------------------------------------------------------------

function SettingsLanding() {
  const { leaving, goWithExit } = usePageTransition();

  return (
    <div className={cn("space-y-6", leaving ? LIST_EXIT : LIST_ENTER)}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Organization configuration, access control, and master data.</p>
      </div>
      <div className="space-y-4">
        {SETTINGS_CATEGORIES.map((category, index) => {
          const motion = sectionMotion(index);
          return (
          <Card
            key={category.key}
            className={cn("p-5 transition-shadow duration-200 ease-out hover:shadow-sm", motion.className)}
            style={motion.style}
          >
            <h2 className="text-sm font-medium text-foreground">{category.title}</h2>
            <p className="mb-3.5 mt-0.5 text-xs text-muted-foreground">{category.description}</p>
            <div className="grid grid-cols-1 gap-3 sm:[grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
              {category.cards.map((card) => (
                <SettingCard
                  key={card.key}
                  card={card}
                  onClick={() => goWithExit(`/settings/${card.key}`)}
                  extra={card.key === "users" ? <PendingInvitesBadge /> : null}
                />
              ))}
            </div>
          </Card>
          );
        })}
      </div>
    </div>
  );
}

function SettingCard({
  card,
  onClick,
  extra,
}: {
  card: SettingCardDef;
  onClick: () => void;
  extra?: React.ReactNode;
}) {
  const Icon = card.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative rounded-lg border border-border bg-muted/30 p-3.5 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card hover:shadow-md active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <ChevronRight className="absolute right-3 top-3.5 h-3.5 w-3.5 text-muted-foreground/70 transition-all duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none" />
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors duration-200 ease-out group-hover:bg-primary/15">
        <Icon className="h-[18px] w-[18px] transition-transform duration-200 ease-out group-hover:scale-110 motion-reduce:transition-none" />
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 pr-4">
        <p className="text-[13px] font-medium text-foreground">{card.label}</p>
        {card.badge && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium leading-none",
              card.badge.tone === "accent" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            {card.badge.label}
          </span>
        )}
        {card.restricted && <Lock className="h-3 w-3 shrink-0 text-muted-foreground/70" aria-label="Admin-only" />}
      </div>
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{card.description}</p>
      {extra}
    </button>
  );
}

const PENDING_INVITES_QUERY = gql`
  query PendingInvites {
    pendingInvites {
      id
      email
      role
      expiresAt
      acceptedAt
      revokedAt
      createdAt
    }
  }
`;

function PendingInvitesBadge() {
  const { data, loading } = useQuery<{ pendingInvites: InviteRow[] }>(PENDING_INVITES_QUERY);
  if (loading) return <Skeleton className="mt-1.5 h-4 w-20" />;
  const count =
    data?.pendingInvites.filter((i) => !i.acceptedAt && !i.revokedAt && new Date(i.expiresAt).getTime() >= Date.now())
      .length ?? 0;
  if (!count) return null;
  return (
    <Badge tone="warning" className="mt-1.5">
      {count} pending invite{count === 1 ? "" : "s"}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Tax Configuration / Pricing & Discounts — reuse existing Products data,
// no duplicate CRUD. Each is a small full-page menu of links out to the
// already-built Products module tabs.
// ---------------------------------------------------------------------------

function LinkOutCard({
  icon: Icon,
  label,
  description,
  to,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  to: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="group flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3.5 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card hover:shadow-md active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors duration-200 ease-out group-hover:bg-primary/15">
        <Icon className="h-[18px] w-[18px] transition-transform duration-200 ease-out group-hover:scale-110 motion-reduce:transition-none" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70 transition-all duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none" />
    </button>
  );
}

function TaxConfigurationView() {
  return (
    <Card className="p-5">
      <p className="mb-3.5 text-xs text-muted-foreground">
        Tax Configuration is managed from the Products module — links below open the existing screens directly.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <LinkOutCard
          icon={Receipt}
          label="Tax Rates"
          description="GST/VAT rates applied to products and documents."
          to="/products/taxrates"
        />
        <LinkOutCard
          icon={Receipt}
          label="Tax Groups"
          description="Group multiple tax rates for compound taxation."
          to="/products/taxgroups"
        />
      </div>
    </Card>
  );
}

function PricingDiscountsView() {
  return (
    <Card className="p-5">
      <p className="mb-3.5 text-xs text-muted-foreground">
        Pricing & Discounts are managed from the Products module — links below open the existing screens directly.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:[grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        <LinkOutCard
          icon={Receipt}
          label="Price Lists"
          description="Customer- or channel-specific price overrides."
          to="/products/pricelist"
        />
        <LinkOutCard
          icon={Receipt}
          label="Pricing Tiers"
          description="Volume or customer-tier pricing rules."
          to="/products/pricingtiers"
        />
        <LinkOutCard
          icon={Receipt}
          label="Discounts"
          description="Promotional and negotiated discount rules."
          to="/products/discounts"
        />
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Organization profile
// ---------------------------------------------------------------------------

const ORG_SETTINGS_QUERY = gql`
  query OrgSettings {
    orgSettings {
      id
      companyName
      logoUrl
      address
      taxId
      defaultCurrency
    }
  }
`;

const UPDATE_ORG_SETTINGS_MUTATION = gql`
  mutation UpdateOrgSettings($input: UpdateOrgSettingsInput!) {
    updateOrgSettings(input: $input) {
      id
      companyName
      logoUrl
      address
      taxId
      defaultCurrency
    }
  }
`;

const REQUEST_ORG_LOGO_UPLOAD_URL_MUTATION = gql`
  mutation RequestOrgLogoUploadUrl($contentType: String!, $fileSizeBytes: Int!) {
    requestOrgLogoUploadUrl(contentType: $contentType, fileSizeBytes: $fileSizeBytes) {
      uploadUrl
      publicUrl
    }
  }
`;

const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

interface OrgSettings {
  id: string;
  companyName: string;
  logoUrl: string | null;
  address: string | null;
  taxId: string | null;
  defaultCurrency: string;
}

function OrganizationTab() {
  const { data, loading } = useQuery<{ orgSettings: OrgSettings }>(ORG_SETTINGS_QUERY);
  const [updateOrgSettings] = useMutation(UPDATE_ORG_SETTINGS_MUTATION);
  const [requestLogoUploadUrl] = useMutation(REQUEST_ORG_LOGO_UPLOAD_URL_MUTATION);
  const [form, setForm] = useState<OrgSettings | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const org = form ?? data?.orgSettings;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!org) return;
    setSubmitting(true);
    try {
      await updateOrgSettings({
        variables: {
          input: {
            companyName: org.companyName,
            logoUrl: org.logoUrl || undefined,
            address: org.address || undefined,
            taxId: org.taxId || undefined,
            defaultCurrency: org.defaultCurrency,
          },
        },
      });
      toast.success("Organization profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !org) return;

    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      toast.error("Please choose a PNG, JPEG, or WEBP image");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploadingLogo(true);
    try {
      const { data: uploadData } = await requestLogoUploadUrl({
        variables: { contentType: file.type, fileSizeBytes: file.size },
      });
      const { uploadUrl, publicUrl } = uploadData.requestOrgLogoUploadUrl;
      const putResponse = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!putResponse.ok) throw new Error("Upload to storage failed");

      await updateOrgSettings({
        variables: { input: { companyName: org.companyName, logoUrl: publicUrl, defaultCurrency: org.defaultCurrency } },
      });
      setForm({ ...org, logoUrl: publicUrl });
      toast.success("Logo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  }

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
            <Skeleton className="h-9 sm:col-span-2" />
            <Skeleton className="h-14 w-14 rounded-lg sm:col-span-2" />
            <Skeleton className="h-9 sm:col-span-2" />
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-9 w-28" />
          </div>
        </CardContent>
      </Card>
    );
  }
  if (!org) return null;

  return (
    <Card className="transition-shadow duration-200 ease-out">
      <CardHeader>
        <CardTitle>Organization profile</CardTitle>
        <CardDescription>Shown on invoices, purchase orders, and other generated documents.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid max-w-2xl gap-4 sm:grid-cols-2" onSubmit={handleSave}>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="companyName">Company name</Label>
            <Input
              id="companyName"
              required
              value={org.companyName}
              onChange={(e) => setForm({ ...org, companyName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                className="group relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed"
                aria-label="Change organization logo"
              >
                {org.logoUrl ? (
                  <img src={org.logoUrl} alt={org.companyName} className="h-full w-full object-contain" />
                ) : (
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="h-4 w-4" />
                </span>
              </button>
              <div>
                <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                  {uploadingLogo ? "Uploading…" : "Change logo"}
                </Button>
                <p className="mt-1.5 text-xs text-muted-foreground">PNG, JPEG, or WEBP. Max 5MB.</p>
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={org.address ?? ""} onChange={(e) => setForm({ ...org, address: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="taxId">Tax ID</Label>
            <Input id="taxId" value={org.taxId ?? ""} onChange={(e) => setForm({ ...org, taxId: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="defaultCurrency">Default currency</Label>
            <Input
              id="defaultCurrency"
              required
              value={org.defaultCurrency}
              onChange={(e) => setForm({ ...org, defaultCurrency: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Security (org-wide policy — distinct from Profile > Security, which is the
// signed-in user's own password and sessions)
// ---------------------------------------------------------------------------

const ORG_SECURITY_QUERY = gql`
  query OrgSecuritySettings {
    orgSettings {
      id
      sessionTimeoutMins
      passwordMinLength
      twoFactorRequired
    }
  }
`;

interface OrgSecuritySettings {
  id: string;
  sessionTimeoutMins: number;
  passwordMinLength: number;
  twoFactorRequired: boolean;
}

function SecurityTab() {
  const { data, loading } = useQuery<{ orgSettings: OrgSecuritySettings }>(ORG_SECURITY_QUERY);
  const [updateOrgSettings] = useMutation(UPDATE_ORG_SETTINGS_MUTATION);
  const [form, setForm] = useState<OrgSecuritySettings | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const settings = form ?? data?.orgSettings;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSubmitting(true);
    try {
      await updateOrgSettings({
        variables: {
          input: {
            sessionTimeoutMins: settings.sessionTimeoutMins,
            passwordMinLength: settings.passwordMinLength,
            twoFactorRequired: settings.twoFactorRequired,
          },
        },
      });
      toast.success("Security settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="grid max-w-lg gap-4 sm:grid-cols-2">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-12 sm:col-span-2" />
            <Skeleton className="h-9 w-28" />
          </div>
        </CardContent>
      </Card>
    );
  }
  if (!settings) return null;

  return (
    <Card className="transition-shadow duration-200 ease-out">
      <CardHeader>
        <CardTitle>Security</CardTitle>
        <CardDescription>
          Organization-wide security policy, applied to every user. For your own password and signed-in devices, see
          Profile &gt; Security.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid max-w-lg gap-4 sm:grid-cols-2" onSubmit={handleSave}>
          <div className="space-y-1.5">
            <Label htmlFor="sessionTimeoutMins">Session timeout (minutes)</Label>
            <Input
              id="sessionTimeoutMins"
              type="number"
              min={5}
              required
              value={settings.sessionTimeoutMins}
              onChange={(e) => setForm({ ...settings, sessionTimeoutMins: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="passwordMinLength">Minimum password length</Label>
            <Input
              id="passwordMinLength"
              type="number"
              min={4}
              required
              value={settings.passwordMinLength}
              onChange={(e) => setForm({ ...settings, passwordMinLength: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2.5 transition-colors duration-150 ease-out hover:bg-muted/40 sm:col-span-2">
            <div>
              <p className="text-sm font-medium">Require two-factor authentication</p>
              <p className="text-xs text-muted-foreground">Applies to every user in this organization.</p>
            </div>
            <Switch
              checked={settings.twoFactorRequired}
              onCheckedChange={(v) => setForm({ ...settings, twoFactorRequired: v })}
              aria-label="Require two-factor authentication"
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Users & Teams
// ---------------------------------------------------------------------------

const USERS_QUERY = gql`
  query Users {
    users {
      id
      email
      name
      role
      active
    }
  }
`;

const UPDATE_USER_MUTATION = gql`
  mutation UpdateUser($id: String!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      role
      active
    }
  }
`;

const RESEND_INVITE_MUTATION = gql`
  mutation ResendInvite($id: String!) {
    resendInvite(id: $id) {
      id
    }
  }
`;

const REVOKE_INVITE_MUTATION = gql`
  mutation RevokeInvite($id: String!) {
    revokeInvite(id: $id)
  }
`;

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
}

interface InviteRow {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

function UsersTab() {
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery<{ users: UserRow[] }>(USERS_QUERY);
  const { data: inviteData, loading: invitesLoading, refetch: refetchInvites } =
    useQuery<{ pendingInvites: InviteRow[] }>(PENDING_INVITES_QUERY);
  const [resendInvite] = useMutation(RESEND_INVITE_MUTATION);
  const [revokeInvite] = useMutation(REVOKE_INVITE_MUTATION);
  const [updateUser] = useMutation(UPDATE_USER_MUTATION);
  const [editing, setEditing] = useState<UserRow | null>(null);

  async function handleResendInvite(invite: InviteRow) {
    try {
      await resendInvite({ variables: { id: invite.id } });
      toast.success(`Invite resent to ${invite.email}`);
      await refetchInvites();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend invite");
    }
  }

  async function handleRevokeInvite(invite: InviteRow) {
    try {
      await revokeInvite({ variables: { id: invite.id } });
      toast.success(`Invite revoked for ${invite.email}`);
      await refetchInvites();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke invite");
    }
  }

  async function handleRoleChange(user: UserRow, role: Role) {
    try {
      await updateUser({ variables: { id: user.id, input: { role } } });
      toast.success(`${user.name} is now ${ROLE_LABELS[role]}`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    }
  }

  async function handleToggleActive(user: UserRow) {
    try {
      await updateUser({ variables: { id: user.id, input: { active: !user.active } } });
      toast.success(`${user.name} ${user.active ? "deactivated" : "reactivated"}`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setEditing(null);
    }
  }

  return (
    <div className="space-y-6">
    <Card className="transition-shadow duration-200 ease-out">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Users & Teams</CardTitle>
          <CardDescription>Invite teammates by email — they set their own password.</CardDescription>
        </div>
        <Button size="sm" onClick={() => navigate("/settings/users/invite")}>
          <Plus className="h-4 w-4" />
          Invite User
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <TableSkeleton columns={5} />
        ) : data?.users.length === 0 ? (
          <EmptyState label="user" onAdd={() => navigate("/settings/users/invite")} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Email</th>
                <th className="py-2 font-medium">Role</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.users.map((u) => (
                <tr key={u.id} className="border-b border-border transition-colors duration-150 ease-out last:border-0 hover:bg-muted/40">
                  <td className="py-2">{u.name}</td>
                  <td className="py-2 text-muted-foreground">{u.email}</td>
                  <td className="py-2">
                    <Select value={u.role} onValueChange={(role) => handleRoleChange(u, role as Role)}>
                      <SelectTrigger className="h-8 w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-2">
                    <Badge tone={u.active ? "success" : "muted"}>{u.active ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="py-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(u)}>
                      {u.active ? "Deactivate" : "Reactivate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.active ? "Deactivate" : "Reactivate"} user</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {editing?.active
              ? `${editing?.name} will no longer be able to log in.`
              : `${editing?.name} will regain access to log in.`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button variant={editing?.active ? "destructive" : "default"} onClick={() => editing && handleToggleActive(editing)}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>

    <Card className="transition-shadow duration-200 ease-out">
      <CardHeader>
        <CardTitle>Pending Invites</CardTitle>
        <CardDescription>Invites awaiting acceptance. Resend if the link expired, or revoke to cancel.</CardDescription>
      </CardHeader>
      <CardContent>
        {invitesLoading ? (
          <TableSkeleton columns={4} rows={2} />
        ) : !inviteData?.pendingInvites.length ? (
          <p className="text-sm text-muted-foreground">No pending invites.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-medium">Email</th>
                <th className="py-2 font-medium">Role</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {inviteData.pendingInvites.map((invite) => {
                const expired = new Date(invite.expiresAt).getTime() < Date.now();
                return (
                  <tr key={invite.id} className="border-b border-border transition-colors duration-150 ease-out last:border-0 hover:bg-muted/40">
                    <td className="py-2 text-muted-foreground">{invite.email}</td>
                    <td className="py-2">{ROLE_LABELS[invite.role]}</td>
                    <td className="py-2">
                      <Badge tone={expired ? "muted" : "warning"}>
                        {expired ? "Expired" : `Expires ${new Date(invite.expiresAt).toLocaleDateString()}`}
                      </Badge>
                    </td>
                    <td className="py-2 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleResendInvite(invite)}>
                        <RefreshCw className="h-4 w-4" />
                        Resend
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleRevokeInvite(invite)}>
                        <Ban className="h-4 w-4" />
                        Revoke
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Roles & Permissions (matrix is code-defined in packages/shared — read only)
// ---------------------------------------------------------------------------

function PermissionsTab() {
  const modules = NAV_MODULES.filter((m) => m.id !== "dashboard");
  return (
    <Card className="transition-shadow duration-200 ease-out">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          Roles & Permissions
        </CardTitle>
        <CardDescription>
          Module access per role. Admin always has full access. This matrix is defined in code
          (packages/shared/src/permissions.ts) as the single RBAC source read by both the API guard and the sidebar —
          it is not yet editable from the UI.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-4 font-medium">Module</th>
              {ALL_ROLES.map((role) => (
                <th key={role} className="px-2 py-2 text-center font-medium">
                  {ROLE_LABELS[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map((m) => (
              <tr key={m.id} className="border-b border-border transition-colors duration-150 ease-out last:border-0 hover:bg-muted/40">
                <td className="py-2.5 pr-4">{m.label}</td>
                {ALL_ROLES.map((role) => {
                  const checked = role === Role.ADMIN || (ROLE_MODULE_ACCESS[role]?.includes(m.id as never) ?? false);
                  return (
                    <td key={role} className="px-2 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled
                        className="h-4 w-4 accent-primary transition-transform duration-150 ease-out disabled:opacity-70"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Warehouses
// ---------------------------------------------------------------------------

const WAREHOUSES_QUERY = gql`
  query Warehouses {
    warehouses {
      id
      name
      address
      active
    }
  }
`;

const UPDATE_WAREHOUSE_MUTATION = gql`
  mutation UpdateWarehouse($id: String!, $input: UpdateWarehouseInput!) {
    updateWarehouse(id: $id, input: $input) {
      id
    }
  }
`;

interface WarehouseRow {
  id: string;
  name: string;
  address: string | null;
  active: boolean;
}

function WarehousesTab() {
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery<{ warehouses: WarehouseRow[] }>(WAREHOUSES_QUERY);
  const [updateWarehouse] = useMutation(UPDATE_WAREHOUSE_MUTATION);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseRow | null>(null);
  const [form, setForm] = useState({ name: "", address: "" });
  const [submitting, setSubmitting] = useState(false);

  function openEdit(w: WarehouseRow) {
    setEditing(w);
    setForm({ name: w.name, address: w.address ?? "" });
    setOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSubmitting(true);
    try {
      await updateWarehouse({ variables: { id: editing.id, input: form } });
      toast.success(`${form.name} updated`);
      setOpen(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save warehouse");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(w: WarehouseRow) {
    try {
      await updateWarehouse({ variables: { id: w.id, input: { active: !w.active } } });
      toast.success(`${w.name} ${w.active ? "archived" : "reactivated"}`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update warehouse");
    }
  }

  return (
    <Card className="transition-shadow duration-200 ease-out">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <WarehouseIcon className="h-4 w-4 text-muted-foreground" />
            Warehouses
          </CardTitle>
          <CardDescription>Physical or virtual stock locations used across Inventory, Sales, and Purchase.</CardDescription>
        </div>
        <Button size="sm" onClick={() => navigate("/settings/warehouses/new")}>
          <Plus className="h-4 w-4" />
          New Warehouse
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <TableSkeleton columns={4} />
        ) : data?.warehouses.length === 0 ? (
          <EmptyState label="warehouse" onAdd={() => navigate("/settings/warehouses/new")} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Address</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.warehouses.map((w) => (
                <tr key={w.id} className="border-b border-border transition-colors duration-150 ease-out last:border-0 hover:bg-muted/40">
                  <td className="py-2">{w.name}</td>
                  <td className="py-2 text-muted-foreground">{w.address || "—"}</td>
                  <td className="py-2">
                    <Badge tone={w.active ? "success" : "muted"}>{w.active ? "Active" : "Archived"}</Badge>
                  </td>
                  <td className="py-2 text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(w)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleToggleActive(w)}>
                      {w.active ? "Archive" : "Reactivate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit warehouse</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="wh-name">Name</Label>
              <Input id="wh-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wh-address">Address</Label>
              <Input id="wh-address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Shared empty state
// ---------------------------------------------------------------------------

function EmptyState({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center animate-in fade-in duration-300 motion-reduce:animate-none">
      <div className="group flex h-12 w-12 items-center justify-center rounded-full bg-muted transition-colors duration-200 hover:bg-primary/10">
        <Plus className="h-5 w-5 text-muted-foreground transition-colors duration-200 group-hover:text-primary" />
      </div>
      <div>
        <p className="text-sm font-medium">No {label}s yet</p>
        <p className="text-sm text-muted-foreground">Get started by adding your first {label}.</p>
      </div>
      <Button size="sm" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Add your first {label}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared table loading skeleton
// ---------------------------------------------------------------------------

function TableSkeleton({ columns, rows = 3 }: { columns: number; rows?: number }) {
  return (
    <div className="space-y-3 py-1">
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 animate-in fade-in duration-300 motion-reduce:animate-none"
          style={{ animationDelay: `${r * 60}ms`, animationFillMode: "backwards" }}
        >
          {Array.from({ length: columns }).map((__, c) => (
            <Skeleton key={c} className={cn("h-4", c === 0 ? "w-1/5" : "flex-1")} />
          ))}
        </div>
      ))}
    </div>
  );
}
