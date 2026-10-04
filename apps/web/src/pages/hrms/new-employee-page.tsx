import { useEffect, useRef, useState, type FormEvent } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { ArrowLeft, ArrowRight, Check, IdCard } from "lucide-react";
import { Badge, Button, Tabs, TabsContent, TabsList, TabsTrigger, cn, toast } from "@abms/ui";
import {
  FormCancelButton,
  FormErrorBanner,
  FormFooter,
  FormPage,
  FormPageHeader,
  FormSubmitButton,
  useDiscardGuard,
} from "../products/form-page";
import { BUTTON_PRESS } from "../products/form-motion";
import { holdSuccessThen } from "../products/form-motion";
import {
  PersonalSection,
  JobSection,
  ExperienceSection,
  ContactSection,
  DocumentsSection,
  SalarySection,
  BankTaxSection,
  emptyEmployeeForm,
  type EmployeeFormState,
  type ManagerOption,
} from "./employee-form-sections";
import { EmployeeLiveRail } from "./employee-live-rail";
import type { Department, Designation, Grade, Shift } from "./types";

const EMPLOYEES_ROUTE = "/hrms/employees";
const DRAFT_STORAGE_KEY = "abms:new-employee-draft";

const FORM_DATA_QUERY = gql`
  query NewEmployeeFormData {
    shifts {
      id
      name
      startTime
      endTime
    }
    grades {
      id
      name
      minSalary
      maxSalary
    }
    departments {
      id
      name
    }
    designations {
      id
      name
    }
    branches {
      id
      name
    }
    employees {
      id
      fullName
      designation
      employeeCode
      status
      branchName
    }
    salaryComponents {
      id
      code
      name
      type
      calculationType
      value
      active
    }
  }
`;

const CREATE_EMPLOYEE = gql`
  mutation CreateEmployeePage($input: CreateEmployeeInput!) {
    createEmployee(input: $input) {
      id
      experiences {
        id
      }
    }
  }
`;

const ADD_EMPLOYEE_DOCUMENT = gql`
  mutation AddEmployeeDocumentFromNewEmployee($input: AddEmployeeDocumentInput!) {
    addEmployeeDocument(input: $input) {
      id
    }
  }
`;

const TABS = [
  {
    key: "personal",
    label: "Personal",
    preview: "Personal Information",
    description: "Identity, demographics, and statutory ID numbers.",
  },
  {
    key: "job",
    label: "Job",
    preview: "Job Role & Hierarchy",
    description: "Designation, department allocation, line manager, and probation rules.",
  },
  {
    key: "experience",
    label: "Experience",
    preview: "Previous Employment History",
    description: "Past employers, tenure, and last-drawn compensation.",
  },
  {
    key: "contact",
    label: "Contact",
    preview: "Contact & Address Details",
    description: "Phone, email, and emergency contact details.",
  },
  {
    key: "documents",
    label: "Documents",
    preview: "Identity & Supporting Documents",
    description: "Identity proofs and supporting certificate scans.",
  },
  {
    key: "salary",
    label: "Salary",
    preview: "Compensation & Eligibility",
    description: "CTC breakdown, allowances, and statutory eligibility.",
  },
  {
    key: "bank",
    label: "Bank/Tax",
    preview: "Bank & Statutory Tax Details",
    description: "Bank account, IFSC, and TDS configuration.",
  },
] as const;
type TabKey = (typeof TABS)[number]["key"];

type FieldKey = keyof EmployeeFormState;

const TAB_REQUIRED_FIELDS: Record<TabKey, FieldKey[]> = {
  personal: ["branchId", "firstName", "lastName", "maritalStatus", "dateOfBirth", "aadharNumber", "panNumber"],
  job: ["department", "designation"],
  experience: [],
  contact: ["phone", "email", "addressLine", "addressCity", "addressState", "addressPincode"],
  documents: [],
  salary: ["monthlyGrossSalary"],
  bank: [],
};

function filledRatio(form: EmployeeFormState, keys: FieldKey[]): number {
  if (keys.length === 0) return 1;
  const filled = keys.filter((k) => String(form[k] ?? "").trim() !== "").length;
  return filled / keys.length;
}

/** Fraction (0..1) of a tab's own required fields that are filled — 1 means that step is
 * done. Drives validate(), the per-tab checkmarks, the "Continue" gate, and the overall
 * progress meter from one shared source instead of four divergent checks. */
function tabFraction(key: TabKey, form: EmployeeFormState): number {
  if (key === "bank") {
    if (form.payMode !== "BANK") return 1;
    if (form.bankAccountNumberConfirm !== form.bankAccountNumber) return 0;
    return filledRatio(form, ["bankAccountNumber", "bankAccountNumberConfirm", "bankIfsc", "bankName"]);
  }
  return filledRatio(form, TAB_REQUIRED_FIELDS[key]);
}

/** Whether a tab should show a green checkmark in the stepper. Distinct from tabFraction:
 * Experience and Documents have no required fields, so tabFraction trivially reads 1 before
 * the user has touched them — showing a checkmark there on a blank form would be misleading. */
function tabHasCheckmark(key: TabKey, form: EmployeeFormState): boolean {
  const requiredCount = key === "bank" && form.payMode === "BANK" ? 4 : TAB_REQUIRED_FIELDS[key].length;
  return requiredCount > 0 && tabFraction(key, form) >= 1;
}

function loadDraft(): { form: EmployeeFormState; savedAt: number | null } {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return { form: emptyEmployeeForm(), savedAt: null };
    const parsed = JSON.parse(raw) as { form: Partial<EmployeeFormState>; savedAt: number };
    return { form: { ...emptyEmployeeForm(), ...parsed.form }, savedAt: parsed.savedAt ?? null };
  } catch {
    return { form: emptyEmployeeForm(), savedAt: null };
  }
}

export default function NewEmployeePage() {
  const { data } = useQuery<{
    shifts: Shift[];
    grades: Grade[];
    departments: Department[];
    designations: Designation[];
    branches: { id: string; name: string }[];
    employees: ManagerOption[];
    salaryComponents: { id: string; code: string; name: string; type: string; calculationType: string; value: number; active: boolean }[];
  }>(FORM_DATA_QUERY);
  const [createEmployee] = useMutation(CREATE_EMPLOYEE, { refetchQueries: ["EmployeesTabData"] });
  const [addEmployeeDocument] = useMutation(ADD_EMPLOYEE_DOCUMENT);

  const shifts = data?.shifts ?? [];
  const grades = data?.grades ?? [];
  const departments = data?.departments ?? [];
  const designations = data?.designations ?? [];
  const branches = data?.branches ?? [];
  const managers = data?.employees ?? [];
  const salaryComponents = (data?.salaryComponents ?? []).filter((c) => c.active);

  const initialDraft = useRef(loadDraft()).current;
  const [form, setForm] = useState<EmployeeFormState>(initialDraft.form);
  const [tab, setTab] = useState<TabKey>("personal");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(initialDraft.savedAt);
  const [, forceTick] = useState(0);

  const dirty = JSON.stringify(form) !== JSON.stringify(emptyEmployeeForm());
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(EMPLOYEES_ROUTE, dirty && status === "idle");

  const employeeCodePreview = `EMP-${String(managers.length + 1).padStart(4, "0")}`;
  const branchName = branches.find((b) => b.id === form.branchId)?.name;
  const completedSteps = TABS.filter((t) => tabFraction(t.key, form) >= 1).length;
  const overallPct = Math.round((TABS.reduce((sum, t) => sum + tabFraction(t.key, form), 0) / TABS.length) * 100);
  const currentTabIdx = TABS.findIndex((t) => t.key === tab);
  const nextTab = TABS[currentTabIdx + 1];
  const nextStep = nextTab ? { label: `Step ${currentTabIdx + 2}: ${nextTab.preview}`, description: nextTab.description } : null;

  function saveDraft(silent = false) {
    const savedAt = Date.now();
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ form, savedAt }));
    setLastSavedAt(savedAt);
    if (!silent) toast.success("Draft saved");
  }

  // Autosave: debounce 1.5s after the last keystroke so Save Draft isn't the only way to
  // avoid losing work, without writing to localStorage on every keystroke.
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => saveDraft(true), 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  // Ticks the "saved Xs ago" label once a second without recomputing anything else.
  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  function savedAgoLabel(): string {
    if (lastSavedAt == null) return "Not saved yet";
    const secs = Math.round((Date.now() - lastSavedAt) / 1000);
    if (secs < 5) return "Draft saved just now";
    if (secs < 60) return `Draft saved ${secs}s ago`;
    return `Draft saved ${Math.round(secs / 60)}m ago`;
  }

  function validate(): TabKey | null {
    return TABS.find((t) => tabFraction(t.key, form) < 1)?.key ?? null;
  }

  function handleContinue() {
    if (tabFraction(tab, form) < 1) {
      setError(`Please fill in all required fields for ${TABS.find((t) => t.key === tab)?.label}`);
      return;
    }
    setError(null);
    const idx = TABS.findIndex((t) => t.key === tab);
    const next = TABS[idx + 1];
    if (next) setTab(next.key);
  }

  function handlePrevious() {
    setError(null);
    const idx = TABS.findIndex((t) => t.key === tab);
    const prev = TABS[idx - 1];
    if (prev) setTab(prev.key);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const invalidTab = validate();
    if (invalidTab) {
      setError("Please fill in all required fields");
      setTab(invalidTab);
      return;
    }
    setError(null);
    setStatus("submitting");
    try {
      const { data: created } = await createEmployee({
        variables: {
          input: {
            firstName: form.firstName,
            middleName: form.middleName || undefined,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone || undefined,
            gender: form.gender && form.gender !== "DECLINED" ? form.gender : undefined,
            nationality: form.nationality || undefined,
            avatarUrl: form.avatarUrl || undefined,
            dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth) : undefined,
            dateOfJoining: new Date(form.dateOfJoining),
            designation: form.designation,
            department: form.department,
            employmentType: form.employmentType,
            status: form.status,
            reportingManagerId: form.reportingManagerId || undefined,
            shiftId: form.shiftId || undefined,
            gradeId: form.gradeId || undefined,
            branchId: form.branchId || undefined,
            biometricId: form.biometricId || undefined,
            bloodGroup: form.bloodGroup || undefined,
            maritalStatus: form.maritalStatus || undefined,
            workHoursPerDay: form.workHoursPerDay || undefined,
            monthlyGrossSalary: Number(form.monthlyGrossSalary),
            bankAccountNumber: form.bankAccountNumber || undefined,
            bankName: form.bankName || undefined,
            bankIfsc: form.bankIfsc || undefined,
            panNumber: form.panNumber || undefined,
            aadharNumber: form.aadharNumber || undefined,
            payMode: form.payMode || undefined,
            tdsType: form.tdsType || undefined,
            tdsValue: form.tdsValue ? Number(form.tdsValue) : undefined,
            uan: form.uan || undefined,
            esiNumber: form.esiNumber || undefined,
            pfEligible: form.pfEligible,
            esiEligible: form.esiEligible,
            leaveWithPayEligible: form.leaveWithPayEligible,
            dailyWagesEligible: form.dailyWagesEligible,
            addressLine: form.addressLine || undefined,
            addressCity: form.addressCity || undefined,
            addressState: form.addressState || undefined,
            addressPincode: form.addressPincode || undefined,
            temporaryAddressSameAsPermanent: form.temporaryAddressSameAsPermanent,
            temporaryAddressLine: form.temporaryAddressLine || undefined,
            temporaryAddressCity: form.temporaryAddressCity || undefined,
            temporaryAddressState: form.temporaryAddressState || undefined,
            temporaryAddressPincode: form.temporaryAddressPincode || undefined,
            fatherOrSpouseName: form.fatherOrSpouseName || undefined,
            fatherOrSpouseRelation: form.fatherOrSpouseRelation || undefined,
            qualification: form.qualification || undefined,
            religion: form.religion || undefined,
            emergencyContactName: form.emergencyContactName || undefined,
            emergencyContactPhone: form.emergencyContactPhone || undefined,
            emergencyContactRelation: form.emergencyContactRelation || undefined,
            experiences: form.experiences.length
              ? form.experiences.map((exp) => ({
                  organizationName: exp.organizationName,
                  designation: exp.designation || undefined,
                  startDate: new Date(exp.startDate),
                  endDate: exp.endDate ? new Date(exp.endDate) : undefined,
                  currentlyServing: exp.currentlyServing,
                  ctc: exp.ctc ? Number(exp.ctc) : undefined,
                  fixedCtc: exp.fixedCtc ? Number(exp.fixedCtc) : undefined,
                  bonusCtc: exp.bonusCtc ? Number(exp.bonusCtc) : undefined,
                  reasonForLeaving: exp.reasonForLeaving || undefined,
                }))
              : undefined,
            salaryComponents: form.salaryComponents.some((c) => c.amount)
              ? form.salaryComponents.filter((c) => c.amount).map((c) => ({ code: c.code, amount: Number(c.amount), isMonthly: c.isMonthly }))
              : undefined,
          },
        },
      });

      const employeeId: string = created.createEmployee.id;
      const createdExperienceIds: string[] = created.createEmployee.experiences.map((exp: { id: string }) => exp.id);

      await Promise.all(
        form.documents.map((doc) => {
          const experienceId = doc.experienceIndex != null ? createdExperienceIds[doc.experienceIndex] : undefined;
          return addEmployeeDocument({
            variables: {
              input: {
                employeeId,
                experienceId,
                category: doc.category,
                label: doc.label,
                objectKey: doc.objectKey,
                fileName: doc.fileName,
              },
            },
          });
        }),
      );

      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setStatus("success");
      toast.success("Employee created");
      holdSuccessThen(() => exitTo(EMPLOYEES_ROUTE));
    } catch (err) {
      setStatus("idle");
      const message = err instanceof Error ? err.message : "Failed to create employee";
      setError(message);
      toast.error(message);
    }
  }

  const isLastTab = tab === TABS[TABS.length - 1].key;

  return (
    <div className="-m-3 min-h-full bg-background p-3 sm:-m-5 sm:p-5">
    <FormPage leaving={leaving}>
      <div className="mx-auto max-w-6xl space-y-4">
        <FormPageHeader
          breadcrumb={[{ label: "HRMS", to: EMPLOYEES_ROUTE }, { label: "Employee Management", to: EMPLOYEES_ROUTE }, { label: "New Employee Setup" }]}
          title="New Employee Onboarding"
          titleBadges={
            <>
              <Badge tone="muted" className="font-mono">{employeeCodePreview}</Badge>
              <Badge tone="success" className="gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Draft Autosaved
              </Badge>
            </>
          }
          subtitle="Provide legal identification and personal demographics to create the HR master record."
          icon={<IdCard className="h-5 w-5" />}
          backLabel="Back to Employees"
          onBack={goBack}
          onNavigate={requestNavigate}
          compact
        />

        <FormErrorBanner message={error} />

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_280px]">
          <form id="new-employee-form" onSubmit={handleSubmit} noValidate className="min-w-0">
            <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
              <TabsList>
                {TABS.map((t, i) => {
                  const done = tabHasCheckmark(t.key, form);
                  return (
                    <TabsTrigger key={t.key} value={t.key} className="inline-flex items-center gap-1.5 py-1.5">
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                          done ? "bg-success text-white" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {done ? <Check className="h-2.5 w-2.5" /> : i + 1}
                      </span>
                      {t.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              <TabsContent value="personal">
                <PersonalSection form={form} setForm={setForm} branches={branches} />
              </TabsContent>
              <TabsContent value="job">
                <JobSection form={form} setForm={setForm} departments={departments} designations={designations} grades={grades} shifts={shifts} managers={managers} />
              </TabsContent>
              <TabsContent value="experience">
                <ExperienceSection form={form} setForm={setForm} />
              </TabsContent>
              <TabsContent value="contact">
                <ContactSection form={form} setForm={setForm} />
              </TabsContent>
              <TabsContent value="documents">
                <DocumentsSection form={form} setForm={setForm} />
              </TabsContent>
              <TabsContent value="salary">
                <SalarySection form={form} setForm={setForm} orgSalaryComponents={salaryComponents} grades={grades} />
              </TabsContent>
              <TabsContent value="bank">
                <BankTaxSection form={form} setForm={setForm} onViewDocuments={() => setTab("documents")} />
              </TabsContent>
            </Tabs>
          </form>

          <EmployeeLiveRail
            form={form}
            setForm={setForm}
            employeeCodePreview={employeeCodePreview}
            branchName={branchName}
            overallPct={overallPct}
            completedSteps={completedSteps}
            totalSteps={TABS.length}
            nextStep={nextStep}
            activeTab={tab}
          />
        </div>
      </div>

      <FormFooter>
        <span className="mr-auto hidden text-xs text-muted-foreground sm:inline">
          Step {TABS.findIndex((t) => t.key === tab) + 1} of {TABS.length}: {TABS.find((t) => t.key === tab)?.label} · {savedAgoLabel()}
        </span>
        <FormCancelButton onClick={goBack} disabled={status !== "idle"} />
        <Button type="button" variant="outline" size="default" onClick={() => saveDraft()} disabled={status !== "idle"} className={BUTTON_PRESS}>
          Save Draft
        </Button>
        {tab !== TABS[0].key && (
          <Button type="button" variant="outline" onClick={handlePrevious} disabled={status !== "idle"} className={BUTTON_PRESS}>
            <ArrowLeft className="h-4 w-4" />
            Previous: {TABS[TABS.findIndex((t) => t.key === tab) - 1].label}
          </Button>
        )}
        {isLastTab ? (
          <FormSubmitButton
            formId="new-employee-form"
            status={status}
            idleIcon={<IdCard className="h-4 w-4" />}
            idleLabel="Create Employee"
            loadingLabel="Creating…"
            successLabel="Created"
          />
        ) : (
          <Button type="button" onClick={handleContinue} className={BUTTON_PRESS}>
            Continue to {TABS[TABS.findIndex((t) => t.key === tab) + 1].label}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </FormFooter>
      {discardDialog}
    </FormPage>
    </div>
  );
}
