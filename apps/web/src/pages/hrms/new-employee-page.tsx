import { useState, type FormEvent } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { IdCard } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger, toast } from "@abms/ui";
import {
  FormCancelButton,
  FormErrorBanner,
  FormFooter,
  FormPage,
  FormPageHeader,
  FormScrollArea,
  FormSubmitButton,
  useDiscardGuard,
} from "../products/form-page";
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
} from "./employee-form-sections";
import type { Department, Designation, Grade, Shift } from "./types";

const EMPLOYEES_ROUTE = "/hrms/employees";

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
    }
    salaryComponents {
      id
      code
      name
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
  { key: "personal", label: "Personal" },
  { key: "job", label: "Job" },
  { key: "experience", label: "Experience" },
  { key: "contact", label: "Contact" },
  { key: "documents", label: "Documents" },
  { key: "salary", label: "Salary" },
  { key: "bank", label: "Bank/Tax" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function NewEmployeePage() {
  const { data } = useQuery<{
    shifts: Shift[];
    grades: Grade[];
    departments: Department[];
    designations: Designation[];
    branches: { id: string; name: string }[];
    employees: { id: string; fullName: string }[];
    salaryComponents: { id: string; code: string; name: string; active: boolean }[];
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

  const [form, setForm] = useState<EmployeeFormState>(emptyEmployeeForm);
  const [tab, setTab] = useState<TabKey>("personal");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");

  const dirty = JSON.stringify(form) !== JSON.stringify(emptyEmployeeForm());
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(EMPLOYEES_ROUTE, dirty && status === "idle");

  function validate(): TabKey | null {
    if (!form.branchId || !form.firstName || !form.lastName || !form.maritalStatus || !form.dateOfBirth) return "personal";
    if (!form.department || !form.designation) return "job";
    if (!form.phone || !form.email || !form.address) return "contact";
    if (!form.aadharNumber || !form.panNumber) return "documents";
    if (!form.monthlyGrossSalary) return "salary";
    if (form.payMode === "BANK" && (!form.bankAccountNumber || !form.bankIfsc || !form.bankName)) return "bank";
    return null;
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
            lastName: form.lastName,
            email: form.email,
            phone: form.phone || undefined,
            gender: form.gender || undefined,
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
            address: form.address || undefined,
            temporaryAddress: form.temporaryAddress || undefined,
            fatherOrSpouseName: form.fatherOrSpouseName || undefined,
            qualification: form.qualification || undefined,
            religion: form.religion || undefined,
            emergencyContactName: form.emergencyContactName || undefined,
            emergencyContactPhone: form.emergencyContactPhone || undefined,
            experiences: form.experiences.length
              ? form.experiences.map((exp) => ({
                  organizationName: exp.organizationName,
                  startDate: new Date(exp.startDate),
                  endDate: exp.endDate ? new Date(exp.endDate) : undefined,
                  ctc: exp.ctc ? Number(exp.ctc) : undefined,
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

  return (
    <FormPage leaving={leaving}>
      <FormScrollArea>
        <FormPageHeader
          breadcrumb={[{ label: "HRMS", to: EMPLOYEES_ROUTE }, { label: "Employee Management", to: EMPLOYEES_ROUTE }, { label: "New" }]}
          title="New Employee"
          subtitle="Add a new employee record"
          icon={<IdCard className="h-5 w-5" />}
          backLabel="Back to Employees"
          onBack={goBack}
          onNavigate={requestNavigate}
        />

        <FormErrorBanner message={error} />

        <form id="new-employee-form" onSubmit={handleSubmit} noValidate>
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
            <TabsList>
              {TABS.map((t) => (
                <TabsTrigger key={t.key} value={t.key}>
                  {t.label}
                </TabsTrigger>
              ))}
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
              <SalarySection form={form} setForm={setForm} orgSalaryComponents={salaryComponents} />
            </TabsContent>
            <TabsContent value="bank">
              <BankTaxSection form={form} setForm={setForm} />
            </TabsContent>
          </Tabs>
        </form>
      </FormScrollArea>

      <FormFooter>
        <FormCancelButton onClick={goBack} disabled={status !== "idle"} />
        <FormSubmitButton
          formId="new-employee-form"
          status={status}
          idleIcon={<IdCard className="h-4 w-4" />}
          idleLabel="Create Employee"
          loadingLabel="Creating…"
          successLabel="Created"
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
