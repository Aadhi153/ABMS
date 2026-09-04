import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  ArrowLeft,
  Ban,
  Building2,
  Camera,
  ChevronRight,
  Landmark,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users as UsersIcon,
  Warehouse,
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
  Switch,
  toast,
} from "@abms/ui";
import { ALL_ROLES, NAV_MODULES, ROLE_LABELS, ROLE_MODULE_ACCESS, Role } from "@abms/shared";
import { ModulePlaceholder } from "../../components/module-placeholder";

interface SettingsTab {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  deferred?: boolean;
}

const TABS: SettingsTab[] = [
  {
    key: "org",
    label: "Organization Profile",
    description: "Company name, logo, address, tax ID, and default currency.",
    icon: Building2,
  },
  {
    key: "users",
    label: "Users & Teams",
    description: "Invite teammates, manage roles, and control access.",
    icon: UsersIcon,
  },
  {
    key: "permissions",
    label: "Roles & Permissions",
    description: "Review the module access matrix for each role.",
    icon: ShieldCheck,
  },
  {
    key: "warehouses",
    label: "Warehouses",
    description: "Physical and virtual stock locations used across the app.",
    icon: Warehouse,
  },
  {
    key: "bankaccounts",
    label: "Bank Accounts",
    description: "Manage bank accounts used for payments and collections.",
    icon: Landmark,
    deferred: true,
  },
  {
    key: "security",
    label: "Security",
    description: "Session timeout, password policy, and two-factor requirements.",
    icon: Lock,
  },
];

export default function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const segment = location.pathname.split("/")[2];
  const activeTab = TABS.find((t) => t.key === segment);

  useEffect(() => {
    if (segment && !activeTab) {
      navigate("/settings", { replace: true });
    }
  }, [segment, activeTab, navigate]);

  if (!segment) {
    return <SettingsLanding />;
  }

  if (!activeTab) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={() => navigate("/settings")}
          className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Settings
        </button>
        <h1 className="text-2xl font-semibold tracking-tight">{activeTab.label}</h1>
        <p className="text-sm text-muted-foreground">{activeTab.description}</p>
      </div>
      {activeTab.deferred ? (
        <ModulePlaceholder title={activeTab.label} />
      ) : (
        <>
          {activeTab.key === "org" && <OrgProfileTab />}
          {activeTab.key === "users" && <UsersTab />}
          {activeTab.key === "permissions" && <PermissionsTab />}
          {activeTab.key === "warehouses" && <WarehousesTab />}
          {activeTab.key === "security" && <SecurityTab />}
        </>
      )}
    </div>
  );
}

function SettingsLanding() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Organization configuration, access control, and master data.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TABS.map((tab) => (
          <button key={tab.key} type="button" onClick={() => navigate(`/settings/${tab.key}`)} className="text-left">
            <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/40">
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <tab.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{tab.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{tab.description}</p>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          </button>
        ))}
      </div>
    </div>
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

function OrgProfileTab() {
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

  if (loading && !data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!org) return null;

  return (
    <Card>
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

  if (loading && !data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!settings) return null;

  return (
    <Card>
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
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2.5 sm:col-span-2">
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
    <Card>
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
          <p className="text-sm text-muted-foreground">Loading…</p>
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
                <tr key={u.id} className="border-b border-border last:border-0">
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

    <Card>
      <CardHeader>
        <CardTitle>Pending Invites</CardTitle>
        <CardDescription>Invites awaiting acceptance. Resend if the link expired, or revoke to cancel.</CardDescription>
      </CardHeader>
      <CardContent>
        {invitesLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
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
                  <tr key={invite.id} className="border-b border-border last:border-0">
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
    <Card>
      <CardHeader>
        <CardTitle>Roles & Permissions</CardTitle>
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
              <tr key={m.id} className="border-b border-border last:border-0">
                <td className="py-2.5 pr-4">{m.label}</td>
                {ALL_ROLES.map((role) => {
                  const checked = role === Role.ADMIN || (ROLE_MODULE_ACCESS[role]?.includes(m.id as never) ?? false);
                  return (
                    <td key={role} className="px-2 py-2.5 text-center">
                      <input type="checkbox" checked={checked} disabled className="h-4 w-4 accent-primary disabled:opacity-70" />
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
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Warehouses</CardTitle>
          <CardDescription>Physical or virtual stock locations used across Inventory, Sales, and Purchase.</CardDescription>
        </div>
        <Button size="sm" onClick={() => navigate("/settings/warehouses/new")}>
          <Plus className="h-4 w-4" />
          New Warehouse
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
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
                <tr key={w.id} className="border-b border-border last:border-0">
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
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Plus className="h-5 w-5 text-muted-foreground" />
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
