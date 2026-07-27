import { useState, type FormEvent } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  Ban,
  Building2,
  Landmark,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users as UsersIcon,
  Warehouse as WarehouseIcon,
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
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@abms/ui";
import { ALL_ROLES, NAV_MODULES, ROLE_LABELS, ROLE_MODULE_ACCESS, Role } from "@abms/shared";

const TABS = [
  { key: "org", label: "Organization", icon: Building2 },
  { key: "users", label: "Users & Teams", icon: UsersIcon },
  { key: "permissions", label: "Roles & Permissions", icon: ShieldCheck },
  { key: "warehouses", label: "Warehouses", icon: WarehouseIcon },
  { key: "tax", label: "Tax Configuration", icon: Landmark },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function SettingsPage() {
  const [tab, setTab] = useState<TabKey>("org");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Organization configuration, access control, and master data.</p>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>
      {tab === "org" && <OrgProfileTab />}
      {tab === "users" && <UsersTab />}
      {tab === "permissions" && <PermissionsTab />}
      {tab === "warehouses" && <WarehousesTab />}
      {tab === "tax" && <TaxRatesTab />}
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
  const [form, setForm] = useState<OrgSettings | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              placeholder="https://…"
              value={org.logoUrl ?? ""}
              onChange={(e) => setForm({ ...org, logoUrl: e.target.value })}
            />
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

const INVITE_USER_MUTATION = gql`
  mutation InviteUser($input: InviteUserInput!) {
    inviteUser(input: $input) {
      id
      email
      role
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
  const { data, loading, refetch } = useQuery<{ users: UserRow[] }>(USERS_QUERY);
  const { data: inviteData, loading: invitesLoading, refetch: refetchInvites } =
    useQuery<{ pendingInvites: InviteRow[] }>(PENDING_INVITES_QUERY);
  const [inviteUser] = useMutation(INVITE_USER_MUTATION);
  const [resendInvite] = useMutation(RESEND_INVITE_MUTATION);
  const [revokeInvite] = useMutation(REVOKE_INVITE_MUTATION);
  const [updateUser] = useMutation(UPDATE_USER_MUTATION);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ email: "", role: Role.SALES });
  const [submitting, setSubmitting] = useState(false);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await inviteUser({ variables: { input: form } });
      toast.success(`Invite sent to ${form.email}`);
      setOpen(false);
      setForm({ email: "", role: Role.SALES });
      await refetchInvites();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setSubmitting(false);
    }
  }

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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite user</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleInvite}>
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(role) => setForm((f) => ({ ...f, role: role as Role }))}>
                  <SelectTrigger>
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
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Sending…" : "Send invite"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data?.users.length === 0 ? (
          <EmptyState label="user" onAdd={() => setOpen(true)} />
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

const CREATE_WAREHOUSE_MUTATION = gql`
  mutation CreateWarehouse($input: CreateWarehouseInput!) {
    createWarehouse(input: $input) {
      id
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
  const { data, loading, refetch } = useQuery<{ warehouses: WarehouseRow[] }>(WAREHOUSES_QUERY);
  const [createWarehouse] = useMutation(CREATE_WAREHOUSE_MUTATION);
  const [updateWarehouse] = useMutation(UPDATE_WAREHOUSE_MUTATION);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseRow | null>(null);
  const [form, setForm] = useState({ name: "", address: "" });
  const [submitting, setSubmitting] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", address: "" });
    setOpen(true);
  }

  function openEdit(w: WarehouseRow) {
    setEditing(w);
    setForm({ name: w.name, address: w.address ?? "" });
    setOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await updateWarehouse({ variables: { id: editing.id, input: form } });
        toast.success(`${form.name} updated`);
      } else {
        await createWarehouse({ variables: { input: form } });
        toast.success(`${form.name} added`);
      }
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
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Warehouse
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data?.warehouses.length === 0 ? (
          <EmptyState label="warehouse" onAdd={openCreate} />
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
            <DialogTitle>{editing ? "Edit warehouse" : "New warehouse"}</DialogTitle>
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
                {submitting ? "Saving…" : editing ? "Save changes" : "Create warehouse"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tax rates
// ---------------------------------------------------------------------------

const TAX_RATES_QUERY = gql`
  query TaxRates {
    taxRates {
      id
      name
      rate
      isDefault
    }
  }
`;

const CREATE_TAX_RATE_MUTATION = gql`
  mutation CreateTaxRate($input: CreateTaxRateInput!) {
    createTaxRate(input: $input) {
      id
    }
  }
`;

const DELETE_TAX_RATE_MUTATION = gql`
  mutation DeleteTaxRate($id: String!) {
    deleteTaxRate(id: $id)
  }
`;

interface TaxRateRow {
  id: string;
  name: string;
  rate: number;
  isDefault: boolean;
}

function TaxRatesTab() {
  const { data, loading, refetch } = useQuery<{ taxRates: TaxRateRow[] }>(TAX_RATES_QUERY);
  const [createTaxRate] = useMutation(CREATE_TAX_RATE_MUTATION);
  const [deleteTaxRate] = useMutation(DELETE_TAX_RATE_MUTATION);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<TaxRateRow | null>(null);
  const [form, setForm] = useState({ name: "", rate: "", isDefault: false });
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createTaxRate({ variables: { input: { name: form.name, rate: Number(form.rate), isDefault: form.isDefault } } });
      toast.success(`${form.name} added`);
      setOpen(false);
      setForm({ name: "", rate: "", isDefault: false });
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create tax rate");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteTaxRate({ variables: { id: deleting.id } });
      toast.success(`${deleting.name} deleted`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete tax rate");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Tax Configuration</CardTitle>
          <CardDescription>Tax rates available when building invoices and sales orders.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          New Tax Rate
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data?.taxRates.length === 0 ? (
          <EmptyState label="tax rate" onAdd={() => setOpen(true)} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Rate</th>
                <th className="py-2 font-medium">Default</th>
                <th className="py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.taxRates.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="py-2">{t.name}</td>
                  <td className="py-2">{t.rate}%</td>
                  <td className="py-2">{t.isDefault ? <Badge tone="info">Default</Badge> : "—"}</td>
                  <td className="py-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(t)}>
                      <Trash2 className="h-3.5 w-3.5" />
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
            <DialogTitle>New tax rate</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="space-y-1.5">
              <Label htmlFor="tax-name">Name</Label>
              <Input id="tax-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tax-rate">Rate (%)</Label>
              <Input
                id="tax-rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                value={form.rate}
                onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="tax-default"
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
              />
              <Label htmlFor="tax-default">Set as default</Label>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create tax rate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete tax rate</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <span className="font-medium text-foreground">{deleting?.name}</span>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
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
