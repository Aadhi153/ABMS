import { useMemo, useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { IdCard, Loader2, Save } from "lucide-react";
import {
  Badge,
  Button,
  SheetClose,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Skeleton,
  StatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
  toast,
} from "@abms/ui";
import { BUTTON_PRESS } from "../products/form-motion";
import {
  PersonalSection,
  JobSection,
  ContactSection,
  DocumentsSection,
  SalarySection,
  BankTaxSection,
  emptyEmployeeForm,
  type EmployeeFormState,
  type ManagerOption,
} from "./employee-form-sections";
import type { Department, Designation, Employee, Grade, Shift } from "./types";
import { fmtDate, inr } from "./hrms-helpers";

const EDIT_PANEL_QUERY = gql`
  query EmployeeEditPanelData($id: String!) {
    employee(id: $id) {
      id
      employeeCode
      firstName
      middleName
      lastName
      fullName
      email
      phone
      gender
      nationality
      dateOfBirth
      dateOfJoining
      designation
      department
      employmentType
      status
      reportingManagerId
      shiftId
      gradeId
      branchId
      biometricId
      bloodGroup
      maritalStatus
      workHoursPerDay
      fatherOrSpouseName
      fatherOrSpouseRelation
      qualification
      religion
      addressLine
      addressCity
      addressState
      addressPincode
      temporaryAddressSameAsPermanent
      temporaryAddressLine
      temporaryAddressCity
      temporaryAddressState
      temporaryAddressPincode
      aadharNumber
      pfEligible
      esiEligible
      leaveWithPayEligible
      dailyWagesEligible
      uan
      esiNumber
      payMode
      tdsType
      tdsValue
      monthlyGrossSalary
      bankAccountNumber
      bankName
      bankIfsc
      panNumber
      emergencyContactName
      emergencyContactPhone
      emergencyContactRelation
      avatarUrl
      experiences {
        id
        organizationName
        designation
        startDate
        endDate
        currentlyServing
        ctc
        fixedCtc
        bonusCtc
        reasonForLeaving
      }
    }
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
    employeeDocuments(employeeId: $id) {
      id
      experienceId
      category
      label
      fileName
    }
    employeeSalaryComponents(employeeId: $id) {
      id
      salaryComponentId
      amount
      effectiveFrom
    }
  }
`;

const UPDATE_EMPLOYEE = gql`
  mutation UpdateEmployeeFromPanel($id: String!, $input: CreateEmployeeInput!) {
    updateEmployee(id: $id, input: $input) {
      id
    }
  }
`;
const UPDATE_EMPLOYEE_STATUS = gql`
  mutation UpdateEmployeeStatusFromPanel($id: String!, $status: String!) {
    updateEmployeeStatus(id: $id, status: $status) {
      id
    }
  }
`;
const ADD_EMPLOYEE_DOCUMENT = gql`
  mutation AddEmployeeDocumentFromPanel($input: AddEmployeeDocumentInput!) {
    addEmployeeDocument(input: $input) {
      id
    }
  }
`;
const DELETE_EMPLOYEE_DOCUMENT = gql`
  mutation DeleteEmployeeDocumentFromPanel($id: String!) {
    deleteEmployeeDocument(id: $id)
  }
`;
const ASSIGN_SALARY_COMPONENT = gql`
  mutation AssignEmployeeSalaryComponentFromPanel($input: AssignEmployeeSalaryComponentInput!) {
    assignEmployeeSalaryComponent(input: $input) {
      id
    }
  }
`;
const UPDATE_SALARY_COMPONENT = gql`
  mutation UpdateEmployeeSalaryComponentFromPanel($id: String!, $input: AssignEmployeeSalaryComponentInput!) {
    updateEmployeeSalaryComponent(id: $id, input: $input) {
      id
    }
  }
`;

const TABS = [
  { key: "personal", label: "Personal" },
  { key: "job", label: "Job" },
  { key: "experience", label: "Experience" },
  { key: "contact", label: "Contact" },
  { key: "documents", label: "Documents" },
  { key: "salary", label: "Salary" },
  { key: "bank", label: "Bank/Tax" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const SALARY_COMPONENT_CODES_HANDLED_ELSEWHERE = new Set(["PF", "PT", "TDS"]);

function toFormState(
  employee: Employee,
  orgSalaryComponents: { id: string; code: string; name: string; calculationType: string; value: number; active: boolean }[],
  employeeSalaryComponents: { id: string; salaryComponentId: string; amount: number | null; effectiveFrom: string }[],
  documents: { id: string; experienceId: string | null; category: string; label: string | null; fileName: string }[],
): EmployeeFormState {
  const basic = employee.monthlyGrossSalary;
  const existingByComponentId = new Map(employeeSalaryComponents.map((r) => [r.salaryComponentId, r]));
  const salaryComponents = orgSalaryComponents
    .filter((c) => c.active && !SALARY_COMPONENT_CODES_HANDLED_ELSEWHERE.has(c.code))
    .map((c) => {
      const existing = existingByComponentId.get(c.id);
      const amount =
        existing?.amount != null
          ? String(existing.amount)
          : c.calculationType === "PERCENTAGE"
            ? String(Math.round((basic * c.value) / 100))
            : String(c.value);
      return { code: c.code, name: c.name, amount, isMonthly: true };
    });

  return {
    ...emptyEmployeeForm(),
    branchId: employee.branchId ?? "",
    biometricId: employee.biometricId ?? "",
    firstName: employee.firstName,
    middleName: "",
    lastName: employee.lastName,
    gender: employee.gender ?? "",
    nationality: employee.nationality ?? "Indian",
    maritalStatus: employee.maritalStatus ?? "",
    bloodGroup: employee.bloodGroup ?? "",
    dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.slice(0, 10) : "",
    avatarUrl: employee.avatarUrl ?? "",
    gradeId: employee.gradeId ?? "",
    department: employee.department,
    designation: employee.designation,
    dateOfJoining: employee.dateOfJoining.slice(0, 10),
    shiftId: employee.shiftId ?? "",
    workHoursPerDay: employee.workHoursPerDay ?? "",
    employmentType: employee.employmentType,
    status: employee.status,
    reportingManagerId: employee.reportingManagerId ?? "",
    isFresher: employee.experiences.length === 0,
    experiences: [],
    phone: employee.phone ?? "",
    emergencyContactPhone: employee.emergencyContactPhone ?? "",
    email: employee.email,
    fatherOrSpouseName: employee.fatherOrSpouseName ?? "",
    fatherOrSpouseRelation: employee.fatherOrSpouseRelation ?? "Father",
    qualification: employee.qualification ?? "",
    religion: employee.religion ?? "",
    addressLine: employee.addressLine ?? "",
    addressCity: employee.addressCity ?? "",
    addressState: employee.addressState ?? "",
    addressPincode: employee.addressPincode ?? "",
    temporaryAddressSameAsPermanent: employee.temporaryAddressSameAsPermanent,
    temporaryAddressLine: employee.temporaryAddressLine ?? "",
    temporaryAddressCity: employee.temporaryAddressCity ?? "",
    temporaryAddressState: employee.temporaryAddressState ?? "",
    temporaryAddressPincode: employee.temporaryAddressPincode ?? "",
    emergencyContactName: employee.emergencyContactName ?? "",
    emergencyContactRelation: employee.emergencyContactRelation ?? "Father",
    aadharNumber: employee.aadharNumber ?? "",
    panNumber: employee.panNumber ?? "",
    uan: employee.uan ?? "",
    esiNumber: employee.esiNumber ?? "",
    tdsType: employee.tdsType,
    tdsValue: String(employee.tdsValue),
    payMode: employee.payMode,
    bankAccountNumber: employee.bankAccountNumber ?? "",
    bankAccountNumberConfirm: employee.bankAccountNumber ?? "",
    bankIfsc: employee.bankIfsc ?? "",
    bankName: employee.bankName ?? "",
    monthlyGrossSalary: String(employee.monthlyGrossSalary),
    salaryComponents,
    pfEligible: employee.pfEligible,
    esiEligible: employee.esiEligible,
    leaveWithPayEligible: employee.leaveWithPayEligible,
    dailyWagesEligible: employee.dailyWagesEligible,
    documents: documents.map((d) => ({
      key: d.id,
      category: d.category as EmployeeFormState["documents"][number]["category"],
      label: d.label ?? undefined,
      objectKey: "",
      fileName: d.fileName,
    })),
  };
}

/** Past-employer history can only be recorded when an employee is first created — the API
 * has no mutation to add/edit/remove experience rows afterwards (only the nested write on
 * `createEmployee`). Shown read-only here instead of wiring up edits that would silently
 * never save. */
function ExperienceReadOnlyTab({ employee }: { employee: Employee }) {
  if (employee.experiences.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No prior work experience was recorded for this employee.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Recorded at onboarding — past employment history can't be edited afterwards.
      </p>
      {employee.experiences.map((exp) => (
        <div key={exp.id} className="rounded-lg border border-border p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">{exp.organizationName}</p>
              <p className="text-xs text-muted-foreground">{exp.designation || "—"}</p>
            </div>
            {exp.currentlyServing && <Badge tone="info">Current</Badge>}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {fmtDate(exp.startDate)} – {exp.currentlyServing ? "Present" : exp.endDate ? fmtDate(exp.endDate) : "—"}
          </p>
          {exp.ctc != null && <p className="mt-1 text-xs text-foreground">CTC: {inr(exp.ctc)}</p>}
          {exp.reasonForLeaving && <p className="mt-1 text-xs text-muted-foreground">Reason for leaving: {exp.reasonForLeaving}</p>}
        </div>
      ))}
    </div>
  );
}

/** The full Personal/Job/Experience/Contact/Documents/Salary/Bank-Tax form — the same
 * section components New Employee uses — reused here for editing so the two stay visually
 * and functionally in sync, prefilled from the existing employee. Rendered inside the
 * half-width Sheet opened from the Employee Management list's Edit action. */
export function EmployeeEditPanel({ id, onClose, onSaved }: { id: string; onClose: () => void; onSaved?: () => void }) {
  const { data, loading, refetch } = useQuery<{
    employee: Employee | null;
    shifts: Shift[];
    grades: Grade[];
    departments: Department[];
    designations: Designation[];
    branches: { id: string; name: string }[];
    employees: ManagerOption[];
    salaryComponents: { id: string; code: string; name: string; type: string; calculationType: string; value: number; active: boolean }[];
    employeeDocuments: { id: string; experienceId: string | null; category: string; label: string | null; fileName: string }[];
    employeeSalaryComponents: { id: string; salaryComponentId: string; amount: number | null; effectiveFrom: string }[];
  }>(EDIT_PANEL_QUERY, { variables: { id }, skip: !id });

  const [updateEmployee] = useMutation(UPDATE_EMPLOYEE);
  const [updateEmployeeStatus] = useMutation(UPDATE_EMPLOYEE_STATUS);
  const [addEmployeeDocument] = useMutation(ADD_EMPLOYEE_DOCUMENT);
  const [deleteEmployeeDocument] = useMutation(DELETE_EMPLOYEE_DOCUMENT);
  const [assignSalaryComponent] = useMutation(ASSIGN_SALARY_COMPONENT);
  const [updateSalaryComponent] = useMutation(UPDATE_SALARY_COMPONENT);

  const employee = data?.employee;
  const shifts = data?.shifts ?? [];
  const grades = data?.grades ?? [];
  const departments = data?.departments ?? [];
  const designations = data?.designations ?? [];
  const branches = data?.branches ?? [];
  const managers = data?.employees ?? [];
  const orgSalaryComponents = useMemo(() => data?.salaryComponents ?? [], [data?.salaryComponents]);
  const originalDocuments = useMemo(() => data?.employeeDocuments ?? [], [data?.employeeDocuments]);
  const originalSalaryComponents = useMemo(() => data?.employeeSalaryComponents ?? [], [data?.employeeSalaryComponents]);

  const [tab, setTab] = useState<TabKey>("personal");
  const [form, setForm] = useState<EmployeeFormState | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting">("idle");

  // Lazily seeds `form` the first time the query lands, instead of an effect — avoids a
  // render where `form` is stale emptyEmployeeForm() right after data arrives.
  if (!form && employee) {
    setForm(toFormState(employee, orgSalaryComponents, originalSalaryComponents, originalDocuments));
  }

  async function handleSave() {
    if (!employee || !form) return;
    setStatus("submitting");
    try {
      await updateEmployee({
        variables: {
          id,
          input: {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone || undefined,
            gender: form.gender && form.gender !== "DECLINED" ? form.gender : undefined,
            nationality: form.nationality || undefined,
            dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth) : undefined,
            dateOfJoining: new Date(form.dateOfJoining),
            designation: form.designation,
            department: form.department,
            employmentType: form.employmentType,
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
          },
        },
      });

      // Status isn't part of CreateEmployeeInput's update path (it has its own lifecycle
      // mutation, same as the status dropdown elsewhere in the app) — only fire it when
      // the Job tab's status field was actually touched.
      if (form.status !== employee.status) {
        await updateEmployeeStatus({ variables: { id, status: form.status } });
      }

      const componentIdByCode = new Map(orgSalaryComponents.map((c) => [c.code, c.id]));
      const originalByComponentId = new Map(originalSalaryComponents.map((r) => [r.salaryComponentId, r]));
      await Promise.all(
        form.salaryComponents.map((row) => {
          const componentId = componentIdByCode.get(row.code);
          const amount = Number(row.amount);
          if (!componentId || !row.amount || Number.isNaN(amount)) return Promise.resolve();
          const existing = originalByComponentId.get(componentId);
          if (existing) {
            if (Number(existing.amount) === amount) return Promise.resolve();
            return updateSalaryComponent({
              variables: {
                id: existing.id,
                input: { employeeId: id, salaryComponentId: componentId, amount, effectiveFrom: new Date(existing.effectiveFrom) },
              },
            });
          }
          return assignSalaryComponent({
            variables: {
              input: { employeeId: id, salaryComponentId: componentId, amount, effectiveFrom: new Date(employee.dateOfJoining) },
            },
          });
        }),
      );

      const currentDocIds = new Set(form.documents.map((d) => d.key));
      const originalDocIds = new Set(originalDocuments.map((d) => d.id));
      await Promise.all([
        ...form.documents
          .filter((d) => !originalDocIds.has(d.key))
          .map((d) =>
            addEmployeeDocument({
              variables: { input: { employeeId: id, category: d.category, label: d.label, objectKey: d.objectKey, fileName: d.fileName } },
            }),
          ),
        ...originalDocuments.filter((d) => !currentDocIds.has(d.id)).map((d) => deleteEmployeeDocument({ variables: { id: d.id } })),
      ]);

      toast.success("Employee updated");
      await refetch();
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update employee");
    } finally {
      setStatus("idle");
    }
  }

  if (loading && !data) {
    return (
      <div className="flex h-full flex-col">
        <SheetHeader>
          <SheetTitle>Edit Employee</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }
  if (!employee || !form) {
    return (
      <div className="flex h-full flex-col">
        <SheetHeader>
          <SheetTitle>Edit Employee</SheetTitle>
        </SheetHeader>
        <p className="p-6 text-sm text-muted-foreground">Employee not found.</p>
      </div>
    );
  }

  const updateFormState = (updater: (f: EmployeeFormState) => EmployeeFormState) => setForm((f) => (f ? updater(f) : f));

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <IdCard className="h-4 w-4 text-primary" />
          Edit Employee
          <Badge tone="muted" className="font-mono">
            {employee.employeeCode}
          </Badge>
          <StatusBadge status={employee.status} />
        </SheetTitle>
        <p className="text-sm text-muted-foreground">
          {employee.fullName} · {employee.designation} · {employee.department}
        </p>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList>
            {TABS.map((t, i) => (
              <TabsTrigger key={t.key} value={t.key} className="inline-flex items-center gap-1.5 py-1.5">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                  {i + 1}
                </span>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="personal">
            <PersonalSection form={form} setForm={updateFormState} branches={branches} />
          </TabsContent>
          <TabsContent value="job">
            <JobSection form={form} setForm={updateFormState} departments={departments} designations={designations} grades={grades} shifts={shifts} managers={managers} />
          </TabsContent>
          <TabsContent value="experience">
            <ExperienceReadOnlyTab employee={employee} />
          </TabsContent>
          <TabsContent value="contact">
            <ContactSection form={form} setForm={updateFormState} />
          </TabsContent>
          <TabsContent value="documents">
            <DocumentsSection form={form} setForm={updateFormState} />
          </TabsContent>
          <TabsContent value="salary">
            <SalarySection form={form} setForm={updateFormState} orgSalaryComponents={orgSalaryComponents} grades={grades} />
          </TabsContent>
          <TabsContent value="bank">
            <BankTaxSection form={form} setForm={updateFormState} onViewDocuments={() => setTab("documents")} />
          </TabsContent>
        </Tabs>
      </div>

      <SheetFooter>
        <SheetClose asChild>
          <Button type="button" variant="outline" size="sm" disabled={status === "submitting"} className={BUTTON_PRESS}>
            Cancel
          </Button>
        </SheetClose>
        <Button type="button" size="sm" onClick={handleSave} disabled={status === "submitting"} className={cn("gap-1.5", BUTTON_PRESS)}>
          {status === "submitting" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {status === "submitting" ? "Saving…" : "Save changes"}
        </Button>
      </SheetFooter>
    </div>
  );
}
