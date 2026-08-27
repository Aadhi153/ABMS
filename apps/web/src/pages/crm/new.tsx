import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import { ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
  toast,
} from "@abms/ui";
import { DealStage } from "@abms/shared";
import { InlineEntityCreate } from "./inline-entity-create";

type EntityType = "contact" | "company" | "deal" | "task";

const TYPES: { key: EntityType; label: string }[] = [
  { key: "contact", label: "Contact" },
  { key: "company", label: "Company" },
  { key: "deal", label: "Deal" },
  { key: "task", label: "Task" },
];

const STAGES: DealStage[] = [DealStage.LEAD, DealStage.QUALIFIED, DealStage.PROPOSAL, DealStage.WON, DealStage.LOST];

const STAGE_LABELS: Record<DealStage, string> = {
  [DealStage.LEAD]: "Lead",
  [DealStage.QUALIFIED]: "Qualified",
  [DealStage.PROPOSAL]: "Proposal",
  [DealStage.WON]: "Won",
  [DealStage.LOST]: "Lost",
};

const CRM_NEW_BOOTSTRAP_QUERY = gql`
  query CrmNewBootstrap {
    contacts {
      id
      name
    }
    companies {
      id
      name
    }
    deals {
      id
      title
    }
  }
`;

const CREATE_CONTACT_MUTATION = gql`
  mutation CreateContact($input: CreateContactInput!) {
    createContact(input: $input) {
      id
    }
  }
`;

const CREATE_COMPANY_MUTATION = gql`
  mutation CreateCompany($input: CreateCompanyInput!) {
    createCompany(input: $input) {
      id
    }
  }
`;

const CREATE_DEAL_MUTATION = gql`
  mutation CreateDeal($input: CreateDealInput!) {
    createDeal(input: $input) {
      id
    }
  }
`;

const CREATE_TASK_MUTATION = gql`
  mutation CreateTask($input: CreateTaskInput!) {
    createTask(input: $input) {
      id
    }
  }
`;

interface Option {
  id: string;
  name: string;
}

interface ContactFormState {
  name: string;
  email: string;
  phone: string;
  companyId: string;
  source: string;
  tags: string;
}

interface CompanyFormState {
  name: string;
  industry: string;
  website: string;
}

interface DealFormState {
  title: string;
  value: string;
  probability: string;
  stage: DealStage;
  contactId: string;
  companyId: string;
}

interface TaskFormState {
  title: string;
  dueDate: string;
  contactId: string;
  dealId: string;
}

interface RecentEntity {
  kind: "contact" | "deal";
  id: string;
  label: string;
  at: number;
}

const RECENCY_KEY = "abms.crm.lastEntity";

function writeRecency(entry: RecentEntity) {
  try {
    sessionStorage.setItem(RECENCY_KEY, JSON.stringify(entry));
  } catch {
    // sessionStorage unavailable — recency suggestion is a convenience, safe to skip
  }
}

function readRecency(): RecentEntity | null {
  try {
    const raw = sessionStorage.getItem(RECENCY_KEY);
    return raw ? (JSON.parse(raw) as RecentEntity) : null;
  } catch {
    return null;
  }
}

function requiredFieldClass(empty: boolean) {
  return empty ? "border-primary/40 ring-2 ring-primary/10" : "";
}

export default function CrmNewPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialType: EntityType = (() => {
    const t = searchParams.get("type");
    return TYPES.some((x) => x.key === t) ? (t as EntityType) : "contact";
  })();
  const [type, setType] = useState<EntityType>(initialType);

  const { data } = useQuery<{ contacts: Option[]; companies: Option[]; deals: { id: string; title: string }[] }>(
    CRM_NEW_BOOTSTRAP_QUERY,
  );
  const [createContact] = useMutation(CREATE_CONTACT_MUTATION);
  const [createCompany] = useMutation(CREATE_COMPANY_MUTATION);
  const [createDeal] = useMutation(CREATE_DEAL_MUTATION);
  const [createTask] = useMutation(CREATE_TASK_MUTATION);

  const [contactForm, setContactForm] = useState<ContactFormState>({ name: "", email: "", phone: "", companyId: "", source: "", tags: "" });
  const [companyForm, setCompanyForm] = useState<CompanyFormState>({ name: "", industry: "", website: "" });
  const [dealForm, setDealForm] = useState<DealFormState>({ title: "", value: "", probability: "10", stage: DealStage.LEAD, contactId: "", companyId: "" });
  const [taskForm, setTaskForm] = useState<TaskFormState>({ title: "", dueDate: "", contactId: "", dealId: "" });

  const [createDealToo, setCreateDealToo] = useState(false);
  const [linkedDeal, setLinkedDeal] = useState({ title: "", value: "", stage: DealStage.LEAD as DealStage });

  const [extraContacts, setExtraContacts] = useState<Option[]>([]);
  const [extraCompanies, setExtraCompanies] = useState<Option[]>([]);

  const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!contactForm.companyId) setCreateDealToo(false);
  }, [contactForm.companyId]);

  const contacts = [...(data?.contacts ?? []), ...extraContacts];
  const companies = [...(data?.companies ?? []), ...extraCompanies];
  const deals = data?.deals ?? [];
  const recent = type === "task" ? readRecency() : null;

  async function createContactRaw(input: Record<string, string | undefined>) {
    const res = await createContact({ variables: { input } });
    return res.data?.createContact;
  }
  async function createCompanyRaw(input: Record<string, string | undefined>) {
    const res = await createCompany({ variables: { input } });
    return res.data?.createCompany;
  }

  function acceptRecent(entry: RecentEntity) {
    setTaskForm((f) => (entry.kind === "contact" ? { ...f, contactId: entry.id, dealId: "" } : { ...f, dealId: entry.id, contactId: "" }));
  }

  const isValid = (() => {
    switch (type) {
      case "contact":
        return contactForm.name.trim().length > 0 && (!createDealToo || linkedDeal.title.trim().length > 0);
      case "company":
        return companyForm.name.trim().length > 0;
      case "deal":
        return dealForm.title.trim().length > 0 && dealForm.value.trim().length > 0;
      case "task":
        return taskForm.title.trim().length > 0;
    }
  })();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    try {
      if (type === "contact") {
        const input = {
          name: contactForm.name,
          email: contactForm.email || undefined,
          phone: contactForm.phone || undefined,
          companyId: contactForm.companyId || undefined,
          source: contactForm.source || undefined,
          tags: contactForm.tags ? contactForm.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        };

        let newContactId: string | undefined;
        try {
          const res = await createContact({ variables: { input } });
          newContactId = res.data?.createContact?.id;
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to create contact");
          return;
        }
        if (!newContactId) {
          toast.error("Failed to create contact");
          return;
        }

        if (createDealToo) {
          try {
            await createDeal({
              variables: {
                input: {
                  title: linkedDeal.title,
                  value: Number(linkedDeal.value) || 0,
                  stage: linkedDeal.stage,
                  contactId: newContactId,
                  companyId: contactForm.companyId || undefined,
                },
              },
            });
            writeRecency({ kind: "deal", id: newContactId, label: linkedDeal.title, at: Date.now() });
            toast.success(`${contactForm.name} and deal created`);
          } catch (err) {
            writeRecency({ kind: "contact", id: newContactId, label: contactForm.name, at: Date.now() });
            toast.error(`Contact created, but deal failed: ${err instanceof Error ? err.message : "unknown error"}`);
          }
        } else {
          writeRecency({ kind: "contact", id: newContactId, label: contactForm.name, at: Date.now() });
          toast.success(`${contactForm.name} added`);
        }
        navigate("/crm/contacts");
      } else if (type === "company") {
        await createCompany({
          variables: { input: { name: companyForm.name, industry: companyForm.industry || undefined, website: companyForm.website || undefined } },
        });
        toast.success(`${companyForm.name} added`);
        navigate("/crm/companies");
      } else if (type === "deal") {
        const res = await createDeal({
          variables: {
            input: {
              title: dealForm.title,
              value: Number(dealForm.value) || 0,
              probability: dealForm.probability ? Number(dealForm.probability) : undefined,
              stage: dealForm.stage,
              contactId: dealForm.contactId || undefined,
              companyId: dealForm.companyId || undefined,
            },
          },
        });
        const id = res.data?.createDeal?.id;
        if (id) writeRecency({ kind: "deal", id, label: dealForm.title, at: Date.now() });
        toast.success(`${dealForm.title} added`);
        navigate("/crm/deals");
      } else {
        await createTask({
          variables: {
            input: {
              title: taskForm.title,
              dueDate: taskForm.dueDate || undefined,
              contactId: taskForm.contactId || undefined,
              dealId: taskForm.dealId || undefined,
            },
          },
        });
        toast.success(`${taskForm.title} added`);
        navigate("/crm/tasks");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  const activeLabel = TYPES.find((t) => t.key === type)!.label;

  return (
    <div className="mx-auto max-w-[640px] space-y-6">
      <nav className="text-sm text-muted-foreground">
        <Link to="/crm" className="hover:text-foreground">
          CRM
        </Link>{" "}
        <span>›</span> <span className="text-foreground">New</span>
      </nav>
      <h1 className="text-2xl font-semibold tracking-tight">Add to CRM</h1>

      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="inline-flex rounded-md bg-muted p-1">
            {TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setType(t.key)}
                className={cn(
                  "rounded-sm px-4 py-1.5 text-sm font-medium transition-colors",
                  type === t.key ? "bg-card font-bold text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div key={type} className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
              {type === "contact" && (
                <ContactFields
                  form={contactForm}
                  setForm={setContactForm}
                  companies={companies}
                  createCompany={createCompanyRaw}
                  onCompanyCreated={(id, name) => {
                    setExtraCompanies((prev) => [...prev, { id, name }]);
                    setContactForm((f) => ({ ...f, companyId: id }));
                  }}
                />
              )}
              {type === "company" && <CompanyFields form={companyForm} setForm={setCompanyForm} />}
              {type === "deal" && (
                <DealFields
                  form={dealForm}
                  setForm={setDealForm}
                  contacts={contacts}
                  companies={companies}
                  createContact={createContactRaw}
                  createCompany={createCompanyRaw}
                  onContactCreated={(id, name) => {
                    setExtraContacts((prev) => [...prev, { id, name }]);
                    setDealForm((f) => ({ ...f, contactId: id }));
                  }}
                  onCompanyCreated={(id, name) => {
                    setExtraCompanies((prev) => [...prev, { id, name }]);
                    setDealForm((f) => ({ ...f, companyId: id }));
                  }}
                />
              )}
              {type === "task" && (
                <TaskFields form={taskForm} setForm={setTaskForm} contacts={contacts} deals={deals} recent={recent} onAcceptRecent={acceptRecent} />
              )}
            </div>

            {type === "contact" && contactForm.companyId && (
              <div className="rounded-lg border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.06] to-sky-400/[0.06] p-4">
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-sky-400">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <p className="text-sm text-foreground">This looks like a new prospect. Want to start a Deal for them right away?</p>
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={createDealToo}
                        onChange={(e) => setCreateDealToo(e.target.checked)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                      />
                      Also create a deal for this contact
                    </label>
                    {createDealToo && (
                      <div className="space-y-3 border-t border-violet-500/20 pt-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="ld-title">Deal title</Label>
                          <Input
                            id="ld-title"
                            autoFocus
                            value={linkedDeal.title}
                            onChange={(e) => setLinkedDeal((f) => ({ ...f, title: e.target.value }))}
                            className={cn(requiredFieldClass(!linkedDeal.title.trim()))}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="ld-value">Value ($)</Label>
                            <Input
                              id="ld-value"
                              type="number"
                              min="0"
                              value={linkedDeal.value}
                              onChange={(e) => setLinkedDeal((f) => ({ ...f, value: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Stage</Label>
                            <Select value={linkedDeal.stage} onValueChange={(v) => setLinkedDeal((f) => ({ ...f, stage: v as DealStage }))}>
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
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {type === "contact" && (
              <div>
                <button
                  type="button"
                  onClick={() => setMoreDetailsOpen((o) => !o)}
                  className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  {moreDetailsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  More details — source &amp; tags
                </button>
                {moreDetailsOpen && (
                  <div className="mt-3 space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="c-source">Source</Label>
                      <Input
                        id="c-source"
                        placeholder="Referral, Website, Trade Show…"
                        value={contactForm.source}
                        onChange={(e) => setContactForm((f) => ({ ...f, source: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="c-tags">Tags (comma separated)</Label>
                      <Input id="c-tags" value={contactForm.tags} onChange={(e) => setContactForm((f) => ({ ...f, tags: e.target.value }))} />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="secondary" asChild>
                <Link to="/crm">Cancel</Link>
              </Button>
              <Button type="submit" disabled={submitting || !isValid}>
                {submitting ? "Saving…" : `Save ${activeLabel.toLowerCase()}`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ContactFields({
  form,
  setForm,
  companies,
  createCompany,
  onCompanyCreated,
}: {
  form: ContactFormState;
  setForm: Dispatch<SetStateAction<ContactFormState>>;
  companies: Option[];
  createCompany: (input: Record<string, string | undefined>) => Promise<{ id: string } | null | undefined>;
  onCompanyCreated: (id: string, name: string) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="c-name">Full name</Label>
        <Input
          id="c-name"
          autoFocus
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className={cn(requiredFieldClass(!form.name.trim()))}
        />
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
        <div className="mt-2">
          <InlineEntityCreate kind="company" create={createCompany} onCreated={onCompanyCreated} />
        </div>
      </div>
    </>
  );
}

function CompanyFields({ form, setForm }: { form: CompanyFormState; setForm: Dispatch<SetStateAction<CompanyFormState>> }) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="co-name">Name</Label>
        <Input
          id="co-name"
          autoFocus
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className={cn(requiredFieldClass(!form.name.trim()))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="co-industry">Industry</Label>
        <Input id="co-industry" value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="co-website">Website</Label>
        <Input id="co-website" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} />
      </div>
    </>
  );
}

function DealFields({
  form,
  setForm,
  contacts,
  companies,
  createContact,
  createCompany,
  onContactCreated,
  onCompanyCreated,
}: {
  form: DealFormState;
  setForm: Dispatch<SetStateAction<DealFormState>>;
  contacts: Option[];
  companies: Option[];
  createContact: (input: Record<string, string | undefined>) => Promise<{ id: string } | null | undefined>;
  createCompany: (input: Record<string, string | undefined>) => Promise<{ id: string } | null | undefined>;
  onContactCreated: (id: string, name: string) => void;
  onCompanyCreated: (id: string, name: string) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="d-title">Title</Label>
        <Input
          id="d-title"
          autoFocus
          required
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className={cn(requiredFieldClass(!form.title.trim()))}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="d-value">Value ($)</Label>
          <Input
            id="d-value"
            type="number"
            min="0"
            required
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            className={cn(requiredFieldClass(!form.value.trim()))}
          />
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
        <div className="mt-2">
          <InlineEntityCreate kind="contact" create={createContact} onCreated={onContactCreated} />
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
        <div className="mt-2">
          <InlineEntityCreate kind="company" create={createCompany} onCreated={onCompanyCreated} />
        </div>
      </div>
    </>
  );
}

function TaskFields({
  form,
  setForm,
  contacts,
  deals,
  recent,
  onAcceptRecent,
}: {
  form: TaskFormState;
  setForm: Dispatch<SetStateAction<TaskFormState>>;
  contacts: Option[];
  deals: { id: string; title: string }[];
  recent: RecentEntity | null;
  onAcceptRecent: (entry: RecentEntity) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="t-title">Title</Label>
        <Input
          id="t-title"
          autoFocus
          required
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className={cn(requiredFieldClass(!form.title.trim()))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="t-due">Due date</Label>
        <Input id="t-due" type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
      </div>
      {recent && !form.contactId && !form.dealId && (
        <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          <span>
            Link to <span className="font-medium text-foreground">{recent.label}</span>?
          </span>
          <Button type="button" size="sm" variant="outline" onClick={() => onAcceptRecent(recent)}>
            Link it
          </Button>
        </div>
      )}
      <div className="space-y-1.5">
        <Label>Linked contact</Label>
        <Select
          value={form.contactId || "none"}
          onValueChange={(v) => setForm((f) => ({ ...f, contactId: v === "none" ? "" : v, dealId: v === "none" ? f.dealId : "" }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {contacts.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Linked deal</Label>
        <Select
          value={form.dealId || "none"}
          onValueChange={(v) => setForm((f) => ({ ...f, dealId: v === "none" ? "" : v, contactId: v === "none" ? f.contactId : "" }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {deals.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
