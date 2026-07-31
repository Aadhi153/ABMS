import { useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Building2, CheckSquare, Kanban, Plus, Trash2, Users as UsersIcon } from "lucide-react";
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
  toast,
} from "@abms/ui";
import { DealStage } from "@abms/shared";

const TABS = [
  { key: "contacts", label: "Contacts", icon: UsersIcon },
  { key: "companies", label: "Companies", icon: Building2 },
  { key: "deals", label: "Deals", icon: Kanban },
  { key: "tasks", label: "Tasks", icon: CheckSquare },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function CrmPage() {
  const [searchParams] = useSearchParams();
  const initialTab = TABS.find((t) => t.key === searchParams.get("tab"))?.key ?? "contacts";
  const [tab, setTab] = useState<TabKey>(initialTab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">CRM</h1>
        <p className="text-sm text-muted-foreground">Contacts, companies, deal pipeline, and follow-up tasks.</p>
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
      {tab === "contacts" && <ContactsTab />}
      {tab === "companies" && <CompaniesTab />}
      {tab === "deals" && <DealsTab />}
      {tab === "tasks" && <TasksTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

interface Company {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  contactCount: number;
  dealCount: number;
}

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tags: string[];
  source: string | null;
  owner: { id: string; name: string };
  companyId: string | null;
  companyName: string | null;
}

const CONTACTS_QUERY = gql`
  query Contacts {
    contacts {
      id
      name
      email
      phone
      tags
      source
      owner {
        id
        name
      }
      companyId
      companyName
    }
    companies {
      id
      name
    }
  }
`;

const UPDATE_CONTACT_MUTATION = gql`
  mutation UpdateContact($id: String!, $input: UpdateContactInput!) {
    updateContact(id: $id, input: $input) {
      id
    }
  }
`;

const DELETE_CONTACT_MUTATION = gql`
  mutation DeleteContact($id: String!) {
    deleteContact(id: $id)
  }
`;

function ContactsTab() {
  const { data, loading, refetch } = useQuery<{ contacts: Contact[]; companies: { id: string; name: string }[] }>(CONTACTS_QUERY);
  const [updateContact] = useMutation(UPDATE_CONTACT_MUTATION);
  const [deleteContact] = useMutation(DELETE_CONTACT_MUTATION);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [detail, setDetail] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState<Contact | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", tags: "", source: "", companyId: "" });
  const [submitting, setSubmitting] = useState(false);

  const companies = data?.companies ?? [];

  function openEdit(c: Contact) {
    setEditing(c);
    setForm({ name: c.name, email: c.email ?? "", phone: c.phone ?? "", tags: c.tags.join(", "), source: c.source ?? "", companyId: c.companyId ?? "" });
    setFormOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const input = {
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      source: form.source || undefined,
      companyId: form.companyId || undefined,
    };
    try {
      await updateContact({ variables: { id: editing!.id, input } });
      toast.success(`${form.name} updated`);
      setFormOpen(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save contact");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteContact({ variables: { id: deleting.id } });
      toast.success(`${deleting.name} deleted`);
      setDetail(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete contact");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Contacts</CardTitle>
          <CardDescription>Click a row to view details.</CardDescription>
        </div>
        <Button size="sm" asChild>
          <Link to="/crm/new?type=contact">
            <Plus className="h-4 w-4" />
            New Contact
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data?.contacts.length === 0 ? (
          <EmptyState label="contact" href="/crm/new?type=contact" icon={UsersIcon} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Email</th>
                <th className="py-2 font-medium">Company</th>
                <th className="py-2 font-medium">Owner</th>
                <th className="py-2 font-medium">Tags</th>
              </tr>
            </thead>
            <tbody>
              {data?.contacts.map((c) => (
                <tr key={c.id} className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50" onClick={() => setDetail(c)}>
                  <td className="py-2">{c.name}</td>
                  <td className="py-2 text-muted-foreground">{c.email || "—"}</td>
                  <td className="py-2">{c.companyName || "—"}</td>
                  <td className="py-2 text-muted-foreground">{c.owner.name}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <Badge key={t} tone="info">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit contact</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Name</Label>
              <Input id="c-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="c-email">Email</Label>
                <Input id="c-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-phone">Phone</Label>
                <Input id="c-phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Select value={form.companyId || "none"} onValueChange={(v) => setForm((f) => ({ ...f, companyId: v === "none" ? "" : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="No company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No company</SelectItem>
                  {companies.map((co) => (
                    <SelectItem key={co.id} value={co.id}>
                      {co.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-source">Source</Label>
              <Input id="c-source" placeholder="Referral, Website, Trade Show…" value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-tags">Tags (comma separated)</Label>
              <Input id="c-tags" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          {detail && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>{detail.name}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p>{detail.email || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p>{detail.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Company</p>
                  <p>{detail.companyName || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Owner</p>
                  <p>{detail.owner.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Source</p>
                  <p>{detail.source || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {detail.tags.length === 0 ? "—" : detail.tags.map((t) => <Badge key={t} tone="info">{t}</Badge>)}
                  </div>
                </div>
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Activity timeline</p>
                <p className="text-sm text-muted-foreground">Activity logging lands in a later build pass — no logged activity yet.</p>
              </div>
              <DialogFooter>
                <Button variant="destructive" onClick={() => setDeleting(detail)}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    openEdit(detail);
                    setDetail(null);
                  }}
                >
                  Edit
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete contact</DialogTitle>
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
// Companies
// ---------------------------------------------------------------------------

const COMPANIES_QUERY = gql`
  query Companies {
    companies {
      id
      name
      industry
      website
      contactCount
      dealCount
    }
  }
`;

const COMPANY_CONTACTS_QUERY = gql`
  query CompanyContacts($companyId: String!) {
    companyContacts(companyId: $companyId) {
      id
      name
      email
    }
  }
`;

const UPDATE_COMPANY_MUTATION = gql`
  mutation UpdateCompany($id: String!, $input: UpdateCompanyInput!) {
    updateCompany(id: $id, input: $input) {
      id
    }
  }
`;

const DELETE_COMPANY_MUTATION = gql`
  mutation DeleteCompany($id: String!) {
    deleteCompany(id: $id)
  }
`;

function CompaniesTab() {
  const { data, loading, refetch } = useQuery<{ companies: Company[] }>(COMPANIES_QUERY);
  const [updateCompany] = useMutation(UPDATE_COMPANY_MUTATION);
  const [deleteCompany] = useMutation(DELETE_COMPANY_MUTATION);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [detail, setDetail] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState<Company | null>(null);
  const [form, setForm] = useState({ name: "", industry: "", website: "" });
  const [submitting, setSubmitting] = useState(false);

  function openEdit(c: Company) {
    setEditing(c);
    setForm({ name: c.name, industry: c.industry ?? "", website: c.website ?? "" });
    setFormOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const input = { name: form.name, industry: form.industry || undefined, website: form.website || undefined };
    try {
      await updateCompany({ variables: { id: editing!.id, input } });
      toast.success(`${form.name} updated`);
      setFormOpen(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save company");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteCompany({ variables: { id: deleting.id } });
      toast.success(`${deleting.name} deleted`);
      setDetail(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete company");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Companies</CardTitle>
          <CardDescription>Click a row to view linked contacts.</CardDescription>
        </div>
        <Button size="sm" asChild>
          <Link to="/crm/new?type=company">
            <Plus className="h-4 w-4" />
            New Company
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data?.companies.length === 0 ? (
          <EmptyState label="company" href="/crm/new?type=company" icon={Building2} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Industry</th>
                <th className="py-2 font-medium">Website</th>
                <th className="py-2 font-medium">Contacts</th>
                <th className="py-2 font-medium">Deals</th>
              </tr>
            </thead>
            <tbody>
              {data?.companies.map((c) => (
                <tr key={c.id} className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50" onClick={() => setDetail(c)}>
                  <td className="py-2">{c.name}</td>
                  <td className="py-2 text-muted-foreground">{c.industry || "—"}</td>
                  <td className="py-2 text-muted-foreground">{c.website || "—"}</td>
                  <td className="py-2">{c.contactCount}</td>
                  <td className="py-2">{c.dealCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit company</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="co-name">Name</Label>
              <Input id="co-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-industry">Industry</Label>
              <Input id="co-industry" value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-website">Website</Label>
              <Input id="co-website" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          {detail && <CompanyDetail company={detail} onEdit={() => { openEdit(detail); setDetail(null); }} onDelete={() => setDeleting(detail)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete company</DialogTitle>
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

function CompanyDetail({ company, onEdit, onDelete }: { company: Company; onEdit: () => void; onDelete: () => void }) {
  const { data } = useQuery<{ companyContacts: { id: string; name: string; email: string | null }[] }>(COMPANY_CONTACTS_QUERY, {
    variables: { companyId: company.id },
  });

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>{company.name}</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">Industry</p>
          <p>{company.industry || "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Website</p>
          <p>{company.website || "—"}</p>
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium">Linked contacts</p>
        {data?.companyContacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contacts linked yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {data?.companyContacts.map((c) => (
              <li key={c.id} className="flex justify-between border-b border-border pb-1 last:border-0">
                <span>{c.name}</span>
                <span className="text-muted-foreground">{c.email}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <DialogFooter>
        <Button variant="destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
        <Button variant="outline" onClick={onEdit}>
          Edit
        </Button>
      </DialogFooter>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deals (Kanban)
// ---------------------------------------------------------------------------

interface Deal {
  id: string;
  title: string;
  value: number;
  stage: DealStage;
  probability: number;
  contactId: string | null;
  contactName: string | null;
  companyId: string | null;
  companyName: string | null;
  owner: { id: string; name: string };
}

const DEALS_QUERY = gql`
  query Deals {
    deals {
      id
      title
      value
      stage
      probability
      contactId
      contactName
      companyId
      companyName
      owner {
        id
        name
      }
    }
    contacts {
      id
      name
    }
    companies {
      id
      name
    }
  }
`;

const UPDATE_DEAL_MUTATION = gql`
  mutation UpdateDeal($id: String!, $input: UpdateDealInput!) {
    updateDeal(id: $id, input: $input) {
      id
    }
  }
`;

const DELETE_DEAL_MUTATION = gql`
  mutation DeleteDeal($id: String!) {
    deleteDeal(id: $id)
  }
`;

const STAGES: DealStage[] = [DealStage.LEAD, DealStage.QUALIFIED, DealStage.PROPOSAL, DealStage.WON, DealStage.LOST];

const STAGE_LABELS: Record<DealStage, string> = {
  [DealStage.LEAD]: "Lead",
  [DealStage.QUALIFIED]: "Qualified",
  [DealStage.PROPOSAL]: "Proposal",
  [DealStage.WON]: "Won",
  [DealStage.LOST]: "Lost",
};

function DealsTab() {
  const { data, loading, refetch } = useQuery<{
    deals: Deal[];
    contacts: { id: string; name: string }[];
    companies: { id: string; name: string }[];
  }>(DEALS_QUERY);
  const [updateDeal] = useMutation(UPDATE_DEAL_MUTATION);
  const [deleteDeal] = useMutation(DELETE_DEAL_MUTATION);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [deleting, setDeleting] = useState<Deal | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", value: "", stage: DealStage.LEAD as DealStage, probability: "10", contactId: "", companyId: "" });
  const [submitting, setSubmitting] = useState(false);

  const contacts = data?.contacts ?? [];
  const companies = data?.companies ?? [];

  const dealsByStage = useMemo(() => {
    const map: Record<DealStage, Deal[]> = { LEAD: [], QUALIFIED: [], PROPOSAL: [], WON: [], LOST: [] } as Record<DealStage, Deal[]>;
    for (const d of data?.deals ?? []) map[d.stage].push(d);
    return map;
  }, [data]);

  function openEdit(d: Deal) {
    setEditing(d);
    setForm({
      title: d.title,
      value: String(d.value),
      stage: d.stage,
      probability: String(d.probability),
      contactId: d.contactId ?? "",
      companyId: d.companyId ?? "",
    });
    setFormOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const input = {
      title: form.title,
      value: Number(form.value),
      stage: form.stage,
      probability: Number(form.probability),
      contactId: form.contactId || undefined,
      companyId: form.companyId || undefined,
    };
    try {
      await updateDeal({ variables: { id: editing!.id, input } });
      toast.success(`${form.title} updated`);
      setFormOpen(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save deal");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteDeal({ variables: { id: deleting.id } });
      toast.success(`${deleting.title} deleted`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete deal");
    } finally {
      setDeleting(null);
    }
  }

  async function handleDrop(stage: DealStage) {
    if (!dragging) return;
    const deal = data?.deals.find((d) => d.id === dragging);
    setDragging(null);
    if (!deal || deal.stage === stage) return;
    try {
      await updateDeal({ variables: { id: deal.id, input: { stage } } });
      toast.success(`${deal.title} moved to ${STAGE_LABELS[stage]}`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to move deal");
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Deal pipeline</CardTitle>
          <CardDescription>Drag a card to change its stage.</CardDescription>
        </div>
        <Button size="sm" asChild>
          <Link to="/crm/new?type=deal">
            <Plus className="h-4 w-4" />
            New Deal
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data?.deals.length === 0 ? (
          <EmptyState label="deal" href="/crm/new?type=deal" icon={Kanban} />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {STAGES.map((stage) => (
              <div
                key={stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(stage)}
                className="flex min-h-[200px] flex-col gap-2 rounded-md border border-border bg-muted/30 p-2"
              >
                <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {STAGE_LABELS[stage]} · {dealsByStage[stage].length}
                </p>
                {dealsByStage[stage].map((d) => (
                  <div
                    key={d.id}
                    draggable
                    onDragStart={() => setDragging(d.id)}
                    onClick={() => openEdit(d)}
                    className="cursor-grab space-y-1 rounded-md border border-border bg-card p-2.5 text-sm shadow-sm active:cursor-grabbing"
                  >
                    <p className="font-medium">{d.title}</p>
                    <p className="text-muted-foreground">${d.value.toLocaleString()}</p>
                    {d.contactName && <p className="text-xs text-muted-foreground">{d.contactName}</p>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit deal</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="d-title">Title</Label>
              <Input id="d-title" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="d-value">Value ($)</Label>
                <Input id="d-value" type="number" min="0" required value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-prob">Probability (%)</Label>
                <Input id="d-prob" type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm((f) => ({ ...f, probability: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Select value={form.stage} onValueChange={(v) => setForm((f) => ({ ...f, stage: v as DealStage }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STAGE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Contact</Label>
              <Select value={form.contactId || "none"} onValueChange={(v) => setForm((f) => ({ ...f, contactId: v === "none" ? "" : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="No contact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No contact</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Select value={form.companyId || "none"} onValueChange={(v) => setForm((f) => ({ ...f, companyId: v === "none" ? "" : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="No company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No company</SelectItem>
                  {companies.map((co) => (
                    <SelectItem key={co.id} value={co.id}>
                      {co.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="justify-between">
              <Button type="button" variant="destructive" onClick={() => { setDeleting(editing); setFormOpen(false); }}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
              <Button type="submit" disabled={submitting} className="ml-auto">
                {submitting ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete deal</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <span className="font-medium text-foreground">{deleting?.title}</span>? This cannot be undone.
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
// Tasks
// ---------------------------------------------------------------------------

interface CrmTask {
  id: string;
  title: string;
  dueDate: string | null;
  status: "OPEN" | "DONE";
  assignee: { id: string; name: string };
  contactId: string | null;
  contactName: string | null;
  dealId: string | null;
  dealTitle: string | null;
}

const TASKS_QUERY = gql`
  query CrmTasks {
    crmTasks {
      id
      title
      dueDate
      status
      assignee {
        id
        name
      }
      contactId
      contactName
      dealId
      dealTitle
    }
  }
`;

const UPDATE_TASK_MUTATION = gql`
  mutation UpdateTask($id: String!, $input: UpdateTaskInput!) {
    updateTask(id: $id, input: $input) {
      id
    }
  }
`;

const DELETE_TASK_MUTATION = gql`
  mutation DeleteTask($id: String!) {
    deleteTask(id: $id)
  }
`;

function TasksTab() {
  const { data, loading, refetch } = useQuery<{ crmTasks: CrmTask[] }>(TASKS_QUERY);
  const [updateTask] = useMutation(UPDATE_TASK_MUTATION);
  const [deleteTask] = useMutation(DELETE_TASK_MUTATION);

  const [deleting, setDeleting] = useState<CrmTask | null>(null);

  async function handleToggleStatus(t: CrmTask) {
    try {
      await updateTask({ variables: { id: t.id, input: { status: t.status === "OPEN" ? "DONE" : "OPEN" } } });
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update task");
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteTask({ variables: { id: deleting.id } });
      toast.success(`${deleting.title} deleted`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete task");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Tasks</CardTitle>
          <CardDescription>Follow-ups linked to contacts or deals.</CardDescription>
        </div>
        <Button size="sm" asChild>
          <Link to="/crm/new?type=task">
            <Plus className="h-4 w-4" />
            New Task
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data?.crmTasks.length === 0 ? (
          <EmptyState label="task" href="/crm/new?type=task" icon={CheckSquare} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-medium">Title</th>
                <th className="py-2 font-medium">Due</th>
                <th className="py-2 font-medium">Linked to</th>
                <th className="py-2 font-medium">Assignee</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.crmTasks.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className={`py-2 ${t.status === "DONE" ? "text-muted-foreground line-through" : ""}`}>{t.title}</td>
                  <td className="py-2 text-muted-foreground">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</td>
                  <td className="py-2 text-muted-foreground">{t.contactName || t.dealTitle || "—"}</td>
                  <td className="py-2 text-muted-foreground">{t.assignee.name}</td>
                  <td className="py-2">
                    <Badge tone={t.status === "DONE" ? "success" : "muted"}>{t.status === "DONE" ? "Done" : "Open"}</Badge>
                  </td>
                  <td className="py-2 text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(t)}>
                      {t.status === "OPEN" ? "Mark done" : "Reopen"}
                    </Button>
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

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete task</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <span className="font-medium text-foreground">{deleting?.title}</span>?
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

function EmptyState({ label, href, icon: Icon }: { label: string; href: string; icon: typeof UsersIcon }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">No {label}s yet</p>
        <p className="text-sm text-muted-foreground">Get started by adding your first {label}.</p>
      </div>
      <Button size="sm" asChild>
        <Link to={href}>
          <Plus className="h-4 w-4" />
          Add your first {label}
        </Link>
      </Button>
    </div>
  );
}
