import { useState, type FormEvent } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { IdCard } from "lucide-react";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from "@abms/ui";
import {
  FormCancelButton,
  FormErrorBanner,
  FormFooter,
  FormPage,
  FormPageHeader,
  FormScrollArea,
  FormSection,
  FormSubmitButton,
  RequiredMark,
  useDiscardGuard,
} from "../products/form-page";
import { FOCUS_GLOW, holdSuccessThen } from "../products/form-motion";
import type { Department, Designation, Grade, Shift } from "./types";

const EMPLOYEES_ROUTE = "/hrms/employees";

const FORM_DATA_QUERY = gql`
  query NewEmployeeFormData {
    shifts {
      id
      name
    }
    grades {
      id
      name
    }
    departments {
      id
      name
    }
    designations {
      id
      name
    }
    employees {
      id
      fullName
    }
  }
`;
const CREATE_EMPLOYEE = gql`
  mutation CreateEmployeePage($input: CreateEmployeeInput!) {
    createEmployee(input: $input) {
      id
    }
  }
`;

const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN", "PROBATION"];
const GENDERS = ["MALE", "FEMALE", "OTHER"];

export default function NewEmployeePage() {
  const { data } = useQuery<{
    shifts: Shift[];
    grades: Grade[];
    departments: Department[];
    designations: Designation[];
    employees: { id: string; fullName: string }[];
  }>(FORM_DATA_QUERY);
  const [createEmployee] = useMutation(CREATE_EMPLOYEE);
  const shifts = data?.shifts ?? [];
  const grades = data?.grades ?? [];
  const departments = data?.departments ?? [];
  const designations = data?.designations ?? [];
  const managers = data?.employees ?? [];

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfJoining, setDateOfJoining] = useState(new Date().toISOString().slice(0, 10));
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [employmentType, setEmploymentType] = useState("FULL_TIME");
  const [reportingManagerId, setReportingManagerId] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [monthlyGrossSalary, setMonthlyGrossSalary] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  const dirty = !!firstName || !!lastName || !!email;
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(EMPLOYEES_ROUTE, dirty && status === "idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!firstName || !lastName || !email || !designation || !department || !monthlyGrossSalary) {
      setError("Please fill in all required fields");
      return;
    }
    setError(null);
    setStatus("submitting");
    try {
      await createEmployee({
        variables: {
          input: {
            firstName,
            lastName,
            email,
            phone: phone || undefined,
            gender: gender || undefined,
            dateOfJoining,
            designation,
            department,
            employmentType,
            reportingManagerId: reportingManagerId || undefined,
            shiftId: shiftId || undefined,
            gradeId: gradeId || undefined,
            monthlyGrossSalary: Number(monthlyGrossSalary),
            bankAccountNumber: bankAccountNumber || undefined,
            bankName: bankName || undefined,
            bankIfsc: bankIfsc || undefined,
            panNumber: panNumber || undefined,
            address: address || undefined,
            emergencyContactName: emergencyContactName || undefined,
            emergencyContactPhone: emergencyContactPhone || undefined,
          },
        },
      });
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

        <form id="new-employee-form" onSubmit={handleSubmit} className="space-y-6">
          <FormSection title="Personal information" index={0}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>
                  First name
                  <RequiredMark />
                </Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={FOCUS_GLOW} />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Last name
                  <RequiredMark />
                </Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className={FOCUS_GLOW} />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Email
                  <RequiredMark />
                </Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={FOCUS_GLOW} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} className={FOCUS_GLOW} />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className={FOCUS_GLOW}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FormSection>

          <FormSection title="Employment details" index={1}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>
                  Designation
                  <RequiredMark />
                </Label>
                <Select value={designation} onValueChange={setDesignation}>
                  <SelectTrigger className={FOCUS_GLOW}>
                    <SelectValue placeholder={designations.length ? "Select designation" : "Add designations first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {designations.map((d) => (
                      <SelectItem key={d.id} value={d.name}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  Department
                  <RequiredMark />
                </Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className={FOCUS_GLOW}>
                    <SelectValue placeholder={departments.length ? "Select department" : "Add departments first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.name}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  Date of joining
                  <RequiredMark />
                </Label>
                <Input type="date" value={dateOfJoining} onChange={(e) => setDateOfJoining(e.target.value)} className={FOCUS_GLOW} />
              </div>
              <div className="space-y-1.5">
                <Label>Employment type</Label>
                <Select value={employmentType} onValueChange={setEmploymentType}>
                  <SelectTrigger className={FOCUS_GLOW}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replaceAll("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Reporting manager</Label>
                <Select value={reportingManagerId} onValueChange={setReportingManagerId}>
                  <SelectTrigger className={FOCUS_GLOW}>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Shift</Label>
                <Select value={shiftId} onValueChange={setShiftId}>
                  <SelectTrigger className={FOCUS_GLOW}>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    {shifts.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Grade</Label>
                <Select value={gradeId} onValueChange={setGradeId}>
                  <SelectTrigger className={FOCUS_GLOW}>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FormSection>

          <FormSection title="Salary & banking" index={2}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>
                  Monthly gross salary
                  <RequiredMark />
                </Label>
                <Input type="number" min="0" value={monthlyGrossSalary} onChange={(e) => setMonthlyGrossSalary(e.target.value)} className={FOCUS_GLOW} />
              </div>
              <div className="space-y-1.5">
                <Label>PAN number</Label>
                <Input value={panNumber} onChange={(e) => setPanNumber(e.target.value)} className={FOCUS_GLOW} />
              </div>
              <div className="space-y-1.5">
                <Label>Bank name</Label>
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} className={FOCUS_GLOW} />
              </div>
              <div className="space-y-1.5">
                <Label>Bank account number</Label>
                <Input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} className={FOCUS_GLOW} />
              </div>
              <div className="space-y-1.5">
                <Label>IFSC</Label>
                <Input value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value)} className={FOCUS_GLOW} />
              </div>
            </div>
          </FormSection>

          <FormSection title="Address & emergency contact" index={3}>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)} className={FOCUS_GLOW} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Emergency contact name</Label>
                <Input value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} className={FOCUS_GLOW} />
              </div>
              <div className="space-y-1.5">
                <Label>Emergency contact phone</Label>
                <Input value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} className={FOCUS_GLOW} />
              </div>
            </div>
          </FormSection>
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
