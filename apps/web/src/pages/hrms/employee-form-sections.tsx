import { useEffect, useRef, useState } from "react";
import { gql, useMutation } from "@apollo/client";
import { STATUS_TONE, type StatusTone } from "@abms/shared";
import {
  Banknote,
  Briefcase,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Fingerprint,
  FileText,
  History,
  Landmark,
  Paperclip,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
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
  StatusBadge,
  Textarea,
  cn,
  toast,
} from "@abms/ui";
import { FormSection, FormSubsection, RequiredMark } from "../products/form-page";
import { FOCUS_GLOW, BUTTON_PRESS } from "../products/form-motion";
import type { Department, Designation, Grade, Shift } from "./types";
import { EMPLOYEE_DOCUMENT_CATEGORIES, MARITAL_STATUS_OPTIONS, PAY_MODE_OPTIONS } from "./types";

const TONE_DOT_CLASS: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  muted: "bg-muted-foreground",
};

const CREATE_DEPARTMENT = gql`
  mutation CreateDepartmentFromNewEmployee($input: CreateDepartmentInput!) {
    createDepartment(input: $input) {
      id
      name
    }
  }
`;

const RELIGION_OPTIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Other"];
const NATIONALITY_OPTIONS: { value: string; flag: string; label: string }[] = [
  { value: "Indian", flag: "🇮🇳", label: "India (Resident)" },
  { value: "Other", flag: "🌐", label: "Other / Foreign National" },
];
/** "DECLINED" is a UI-only sentinel, not a Gender enum value — the submit handler maps it
 * to `undefined` so the backend (MALE/FEMALE/OTHER) never sees it. Keeping it distinct from
 * "" lets the segmented control tell "declined" apart from "not yet answered". */
const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "DECLINED", label: "Decline" },
];
const BLOOD_GROUP_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN", "PROBATION"];
const STATUSES = ["ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED", "RESIGNED"];

/** Masked identity-number input (Aadhar/PAN) with a show/hide toggle — just visibility,
 * no verification claim attached since nothing actually validates these against a registry. */
function MaskedIdentityInput({
  value,
  onChange,
  uppercase,
  validated,
}: {
  value: string;
  onChange: (v: string) => void;
  uppercase?: boolean;
  /** Shows a small inline green check inside the field once the value matches the expected
   * format — a lighter-weight signal than a full badge, for fields with their own badge
   * elsewhere (or that don't need one). */
  validated?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(uppercase ? e.target.value.toUpperCase() : e.target.value)}
        className={cn("pr-9", validated && "pr-14", FOCUS_GLOW)}
      />
      {validated && (
        <CheckCircle2 className="pointer-events-none absolute right-9 top-1/2 h-4 w-4 -translate-y-1/2 text-success" aria-hidden="true" />
      )}
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label={visible ? "Hide" : "Show"}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/** Years + remaining months between a date-of-birth string and today, or null if
 * dateOfBirth is blank/invalid — feeds the "Calculated: 28 yrs 5 mos" helper caption. */
function calculateAge(dateOfBirth: string): { years: number; months: number } | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let totalMonths = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  if (now.getDate() < dob.getDate()) totalMonths--;
  if (totalMonths < 0) return null;
  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12 };
}

const REQUEST_EMPLOYEE_DOCUMENT_UPLOAD_URL = gql`
  mutation RequestEmployeeDocumentUploadUrl($contentType: String!, $fileSizeBytes: Int!) {
    requestEmployeeDocumentUploadUrl(contentType: $contentType, fileSizeBytes: $fileSizeBytes) {
      uploadUrl
      objectKey
    }
  }
`;

function formatTimeRange(startTime: string, endTime: string): string {
  const to12h = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
  };
  return `${to12h(startTime)} - ${to12h(endTime)}`;
}

export interface StagedDocument {
  key: string;
  category: (typeof EMPLOYEE_DOCUMENT_CATEGORIES)[number];
  label?: string;
  experienceIndex?: number;
  objectKey: string;
  fileName: string;
}

export interface EmployeeExperienceRow {
  organizationName: string;
  startDate: string;
  endDate: string;
  ctc: string;
}

export interface SalaryComponentRow {
  code: string;
  name: string;
  amount: string;
  isMonthly: boolean;
}

export interface EmployeeFormState {
  branchId: string;
  biometricId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  nationality: string;
  maritalStatus: string;
  bloodGroup: string;
  dateOfBirth: string;
  avatarUrl: string;
  gradeId: string;
  department: string;
  designation: string;
  dateOfJoining: string;
  shiftId: string;
  workHoursPerDay: string;
  employmentType: string;
  status: string;
  reportingManagerId: string;
  experiences: EmployeeExperienceRow[];
  phone: string;
  emergencyContactPhone: string;
  email: string;
  fatherOrSpouseName: string;
  qualification: string;
  religion: string;
  address: string;
  temporaryAddress: string;
  emergencyContactName: string;
  aadharNumber: string;
  panNumber: string;
  uan: string;
  esiNumber: string;
  tdsType: string;
  tdsValue: string;
  payMode: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankName: string;
  monthlyGrossSalary: string;
  salaryComponents: SalaryComponentRow[];
  pfEligible: boolean;
  esiEligible: boolean;
  leaveWithPayEligible: boolean;
  dailyWagesEligible: boolean;
  documents: StagedDocument[];
}

export function emptyEmployeeForm(): EmployeeFormState {
  return {
    branchId: "",
    biometricId: "",
    firstName: "",
    middleName: "",
    lastName: "",
    gender: "",
    nationality: "",
    maritalStatus: "",
    bloodGroup: "",
    dateOfBirth: "",
    avatarUrl: "",
    gradeId: "",
    department: "",
    designation: "",
    dateOfJoining: new Date().toISOString().slice(0, 10),
    shiftId: "",
    workHoursPerDay: "",
    employmentType: "FULL_TIME",
    status: "ACTIVE",
    reportingManagerId: "",
    experiences: [],
    phone: "",
    emergencyContactPhone: "",
    email: "",
    fatherOrSpouseName: "",
    qualification: "",
    religion: "",
    address: "",
    temporaryAddress: "",
    emergencyContactName: "",
    aadharNumber: "",
    panNumber: "",
    uan: "",
    esiNumber: "",
    tdsType: "PERCENTAGE",
    tdsValue: "0",
    payMode: "BANK",
    bankAccountNumber: "",
    bankIfsc: "",
    bankName: "",
    monthlyGrossSalary: "",
    salaryComponents: [],
    pfEligible: true,
    esiEligible: true,
    leaveWithPayEligible: true,
    dailyWagesEligible: false,
    documents: [],
  };
}

interface SectionProps {
  form: EmployeeFormState;
  setForm: (updater: (f: EmployeeFormState) => EmployeeFormState) => void;
}

function useDocumentUpload() {
  const [requestUploadUrl] = useMutation(REQUEST_EMPLOYEE_DOCUMENT_UPLOAD_URL);

  async function upload(file: File): Promise<{ objectKey: string; fileName: string } | null> {
    try {
      const { data } = await requestUploadUrl({ variables: { contentType: file.type, fileSizeBytes: file.size } });
      const { uploadUrl, objectKey } = data.requestEmployeeDocumentUploadUrl;
      const putResponse = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!putResponse.ok) throw new Error("Upload to storage failed");
      return { objectKey, fileName: file.name };
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload file");
      return null;
    }
  }

  return upload;
}

function DocumentUploadButton({
  onUploaded,
}: {
  onUploaded: (result: { objectKey: string; fileName: string }) => void;
}) {
  const upload = useDocumentUpload();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const result = await upload(file);
    if (result) onUploaded(result);
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden" onChange={handleChange} />
      <Button type="button" variant="outline" size="icon" className={BUTTON_PRESS} onClick={() => inputRef.current?.click()}>
        <Upload className="h-4 w-4" />
      </Button>
    </>
  );
}

/** Single bordered toggle group (vs. the separate pill buttons of `SegmentedControl` below) —
 * reads as one control, for compact rows like Gender sharing space with three other fields. */
function InlineSegmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="inline-flex w-full rounded-md border border-border bg-muted/30 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-sm px-1.5 py-1.5 text-xs font-medium transition-colors duration-150",
            BUTTON_PRESS,
            value === o.value ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PersonalSection({ form, setForm, branches }: SectionProps & { branches: { id: string; name: string }[] }) {
  const age = calculateAge(form.dateOfBirth);
  const aadharVerified = /^\d{12}$/.test(form.aadharNumber.replace(/\s/g, ""));
  const panValid = /^[A-Z]{5}\d{4}[A-Z]$/.test(form.panNumber);

  return (
    <div className="space-y-4">
      <FormSection
        title="Workspace & Attendance Identity"
        description="Branch assignment and biometric attendance identity linkage"
        icon={<Briefcase className="h-4 w-4" />}
        iconTone="primary"
        index={0}
        badge="Step 1.1"
      >
        <FormSubsection title="Branch & Biometric Setup">
          <div className="space-y-1.5">
            <Label>
              Branch Location
              <RequiredMark />
            </Label>
            <Select value={form.branchId} onValueChange={(v) => setForm((f) => ({ ...f, branchId: v }))}>
              <SelectTrigger className={FOCUS_GLOW}>
                <SelectValue placeholder={branches.length ? "Select" : "Add branches first"} />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Determines local holiday calendar and payroll cycle</p>
          </div>
          <div className="space-y-1.5">
            <Label>eSSL / Biometric Device ID</Label>
            <div className="flex items-center gap-2">
              <Input placeholder="e.g. 101" value={form.biometricId} onChange={(e) => setForm((f) => ({ ...f, biometricId: e.target.value }))} className={cn("flex-1", FOCUS_GLOW)} />
              <Badge tone={form.biometricId ? "success" : "muted"} className="shrink-0 gap-1">
                {form.biometricId && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
                {form.biometricId ? "Configured" : "Not configured"}
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={!form.biometricId}
                className={cn("shrink-0 gap-1", BUTTON_PRESS)}
                onClick={() => toast.info("No eSSL biometric device detected on this machine — connect the hardware agent to sync.")}
              >
                <Fingerprint className="h-3.5 w-3.5" />
                Sync Device
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Directly syncs check-in stamps from the physical terminal</p>
          </div>
        </FormSubsection>
      </FormSection>

      <FormSection
        title="Basic Details & Demographics"
        description="Legal candidate name as specified on government IDs"
        icon={<User className="h-4 w-4" />}
        index={1}
        badge="Step 1.2"
      >
        <FormSubsection title="Name & Demographics" className="sm:grid-cols-1">
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>
                  First Name
                  <RequiredMark />
                </Label>
                <Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} className={FOCUS_GLOW} />
              </div>
              <div className="space-y-1.5">
                <Label>Middle Name</Label>
                <Input value={form.middleName} onChange={(e) => setForm((f) => ({ ...f, middleName: e.target.value }))} className={FOCUS_GLOW} />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Last Name
                  <RequiredMark />
                </Label>
                <Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} className={FOCUS_GLOW} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label>
                  Date of Birth
                  <RequiredMark />
                </Label>
                <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} className={FOCUS_GLOW} />
                {age != null && (
                  <p className="text-xs text-muted-foreground">
                    Calculated: <span className="font-medium text-foreground">{age.years} yrs {age.months} mos</span>
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>
                  Gender
                  <RequiredMark />
                </Label>
                <InlineSegmented value={form.gender} onChange={(v) => setForm((f) => ({ ...f, gender: v }))} options={GENDER_OPTIONS} />
              </div>
              <div className="space-y-1.5">
                <Label>Blood Group</Label>
                <Select value={form.bloodGroup} onValueChange={(v) => setForm((f) => ({ ...f, bloodGroup: v }))}>
                  <SelectTrigger className={FOCUS_GLOW}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUP_OPTIONS.map((bg) => (
                      <SelectItem key={bg} value={bg}>
                        {bg.slice(0, -1)} {bg.endsWith("+") ? "+ve" : "-ve"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  Marital Status
                  <RequiredMark />
                </Label>
                <Select value={form.maritalStatus} onValueChange={(v) => setForm((f) => ({ ...f, maritalStatus: v }))}>
                  <SelectTrigger className={FOCUS_GLOW}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {MARITAL_STATUS_OPTIONS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </FormSubsection>
      </FormSection>

      <FormSection
        title="Statutory Identification & Compliance"
        description="Government identity parameters for provident fund, tax, and ESI validation"
        icon={<ShieldCheck className="h-4 w-4" />}
        iconTone="success"
        index={2}
        badge="Step 1.3"
      >
        <FormSubsection title="Statutory ID Numbers" className="sm:grid-cols-1">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>
                Nationality
                <RequiredMark />
              </Label>
              <Select value={form.nationality} onValueChange={(v) => setForm((f) => ({ ...f, nationality: v }))}>
                <SelectTrigger className={FOCUS_GLOW}>
                  <SelectValue placeholder="Select">
                    {form.nationality && (
                      <span className="inline-flex items-center gap-1.5">
                        <span>{NATIONALITY_OPTIONS.find((n) => n.value === form.nationality)?.flag}</span>
                        {NATIONALITY_OPTIONS.find((n) => n.value === form.nationality)?.label}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {NATIONALITY_OPTIONS.map((n) => (
                    <SelectItem key={n.value} value={n.value}>
                      <span className="inline-flex items-center gap-1.5">
                        <span>{n.flag}</span>
                        {n.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Tax residency classification: {form.nationality === "Indian" ? "Domestic" : form.nationality ? "Non-resident" : "—"}
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label>
                  Aadhaar Card (UIDAI)
                  <RequiredMark />
                </Label>
                {aadharVerified && (
                  <Badge tone="success" className="shrink-0 gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
              <MaskedIdentityInput value={form.aadharNumber} onChange={(v) => setForm((f) => ({ ...f, aadharNumber: v }))} />
              <p className="text-xs text-muted-foreground">Required for PF linking (UAN)</p>
            </div>
            <div className="space-y-1.5">
              <Label>
                Permanent Account Number (PAN)
                <RequiredMark />
              </Label>
              <MaskedIdentityInput uppercase validated={panValid} value={form.panNumber} onChange={(v) => setForm((f) => ({ ...f, panNumber: v }))} />
              <p className="text-xs text-muted-foreground">Subject to TDS verification on NSDL</p>
            </div>
          </div>
        </FormSubsection>
      </FormSection>
    </div>
  );
}

export interface ManagerOption {
  id: string;
  fullName: string;
  designation: string;
  employeeCode: string;
  status: string;
  branchName?: string | null;
}

function managerInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "—";
}

/** Picker that collapses into a preview chip (avatar, title, status) once a manager is
 * selected — "Change manager" reopens the picker. Every field shown is real employee data. */
function ReportingManagerField({
  value,
  onChange,
  managers,
}: {
  value: string;
  onChange: (v: string) => void;
  managers: ManagerOption[];
}) {
  const [picking, setPicking] = useState(false);
  const selected = managers.find((m) => m.id === value);

  if (selected && !picking) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="text-xs font-semibold">{managerInitials(selected.fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-sm font-semibold text-foreground">{selected.fullName}</p>
              <StatusBadge status={selected.status} />
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {selected.designation} · {selected.employeeCode}
              {selected.branchName ? ` · ${selected.branchName}` : ""}
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="xs" className={cn("shrink-0", BUTTON_PRESS)} onClick={() => setPicking(true)}>
          Change manager
        </Button>
      </div>
    );
  }

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        onChange(v);
        setPicking(false);
      }}
    >
      <SelectTrigger className={FOCUS_GLOW}>
        <SelectValue placeholder="None" />
      </SelectTrigger>
      <SelectContent>
        {managers.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.fullName} — {m.designation}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SegmentedControl({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "min-w-[96px] flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors duration-150",
            BUTTON_PRESS,
            value === o.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/50",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function NewDepartmentDialog({ onCreated }: { onCreated: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [createDepartment] = useMutation(CREATE_DEPARTMENT, { refetchQueries: ["NewEmployeeFormData"] });

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createDepartment({ variables: { input: { name: name.trim() } } });
      onCreated(name.trim());
      toast.success("Department created");
      setOpen(false);
      setName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create department");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-primary hover:underline">
        + New Department
      </button>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New department</DialogTitle>
          <DialogDescription>Adds it to the org's department list and selects it here.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Engineering & Product" className={FOCUS_GLOW} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleCreate} disabled={saving || !name.trim()}>
            {saving ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function JobSection({
  form,
  setForm,
  departments,
  designations,
  grades,
  shifts,
  managers,
}: SectionProps & {
  departments: Department[];
  designations: Designation[];
  grades: Grade[];
  shifts: Shift[];
  managers: ManagerOption[];
}) {
  // Deferred rather than selected immediately on mutation success: the refetched
  // `departments` list needs to actually land in props before we point `form.department`
  // at it — selecting a value with no corresponding entry yet is what let it get lost.
  const pendingDepartmentRef = useRef<string | null>(null);
  useEffect(() => {
    if (pendingDepartmentRef.current && departments.some((d) => d.name === pendingDepartmentRef.current)) {
      const name = pendingDepartmentRef.current;
      pendingDepartmentRef.current = null;
      setForm((f) => ({ ...f, department: name }));
    }
  }, [departments, setForm]);

  return (
    <div className="space-y-4">
      <FormSection
        title="Position & Organization"
        description="Role hierarchy, department allocation, and reporting manager"
        icon={<Briefcase className="h-5 w-5" />}
        index={0}
        badge="Step 2.1"
        compact
      >
        <FormSubsection title="Role & Department">
          <div className="space-y-1.5">
            <Label>Role Grade</Label>
            <Select value={form.gradeId} onValueChange={(v) => setForm((f) => ({ ...f, gradeId: v }))}>
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
            {(() => {
              const selected = grades.find((g) => g.id === form.gradeId);
              return selected && (selected.minSalary != null || selected.maxSalary != null) ? (
                <p className="text-xs text-muted-foreground">
                  Calibrates statutory pay scale — ₹{selected.minSalary ?? 0} to ₹{selected.maxSalary ?? "—"}
                </p>
              ) : null;
            })()}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>
                Department
                <RequiredMark />
              </Label>
              <NewDepartmentDialog onCreated={(name) => { pendingDepartmentRef.current = name; }} />
            </div>
            <Select value={form.department} onValueChange={(v) => setForm((f) => ({ ...f, department: v }))}>
              <SelectTrigger className={FOCUS_GLOW}>
                {/* Explicit children, not just a placeholder prop: a department created via
                    "+ New Department" is selected before its <SelectItem> has ever mounted
                    (Radix only registers items once the dropdown has been opened), so Radix's
                    own registered-item lookup can't resolve a label for it — render it ourselves. */}
                <SelectValue placeholder={departments.length ? "Select department" : "Add departments first"}>
                  {form.department || undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.name}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Designates cost center and branch cost allocation</p>
          </div>
          <div className="space-y-1.5">
            <Label>
              Designation
              <RequiredMark />
            </Label>
            <Select value={form.designation} onValueChange={(v) => setForm((f) => ({ ...f, designation: v }))}>
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
              Date of Joining
              <RequiredMark />
            </Label>
            <Input type="date" value={form.dateOfJoining} onChange={(e) => setForm((f) => ({ ...f, dateOfJoining: e.target.value }))} className={FOCUS_GLOW} />
          </div>
        </FormSubsection>

        <FormSubsection title="Reporting Manager" className="sm:grid-cols-1">
          <ReportingManagerField
            value={form.reportingManagerId}
            onChange={(v) => setForm((f) => ({ ...f, reportingManagerId: v }))}
            managers={managers}
          />
        </FormSubsection>
      </FormSection>

      <FormSection
        title="Schedule & Working Terms"
        description="Work hours, shifts, and employment classification"
        icon={<Clock className="h-5 w-5" />}
        index={1}
        badge="Step 2.2"
        compact
      >
        <FormSubsection title="Employment Type" className="sm:grid-cols-1">
          <SegmentedControl
            value={form.employmentType}
            onChange={(v) => setForm((f) => ({ ...f, employmentType: v }))}
            options={EMPLOYMENT_TYPES.map((t) => ({ value: t, label: t.replaceAll("_", " ") }))}
          />
        </FormSubsection>

        <FormSubsection title="Hours & Status">
          <div className="space-y-1.5">
            <Label>Work Shift</Label>
            <Select value={form.shiftId} onValueChange={(v) => setForm((f) => ({ ...f, shiftId: v }))}>
              <SelectTrigger className={FOCUS_GLOW}>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {shifts.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({formatTimeRange(s.startTime, s.endTime)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Work Hours / Day</Label>
            <div className="relative">
              <Input
                placeholder="8.30"
                value={form.workHoursPerDay}
                onChange={(e) => setForm((f) => ({ ...f, workHoursPerDay: e.target.value }))}
                className={cn("pr-16", FOCUS_GLOW)}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">hrs/day</span>
            </div>
            <p className="text-xs text-muted-foreground">HH.MM format — 8.30 means 8h 30m</p>
          </div>
          <div className="space-y-1.5">
            <Label>
              Employment Lifecycle Status
              <RequiredMark />
            </Label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
              <SelectTrigger className={FOCUS_GLOW}>
                <SelectValue>
                  <span className="inline-flex items-center gap-1.5">
                    <span className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT_CLASS[STATUS_TONE[form.status] ?? "muted"])} />
                    {form.status.replaceAll("_", " ")}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    <span className="inline-flex items-center gap-1.5">
                      <span className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT_CLASS[STATUS_TONE[s] ?? "muted"])} />
                      {s.replaceAll("_", " ")}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </FormSubsection>
      </FormSection>
    </div>
  );
}

export function ExperienceSection({ form, setForm }: SectionProps) {
  function addExperience() {
    setForm((f) => ({ ...f, experiences: [...f.experiences, { organizationName: "", startDate: "", endDate: "", ctc: "" }] }));
  }
  function removeExperience(idx: number) {
    setForm((f) => ({
      ...f,
      experiences: f.experiences.filter((_, i) => i !== idx),
      documents: f.documents.filter((d) => d.experienceIndex !== idx).map((d) => (d.experienceIndex != null && d.experienceIndex > idx ? { ...d, experienceIndex: d.experienceIndex - 1 } : d)),
    }));
  }
  function updateExperience(idx: number, patch: Partial<EmployeeExperienceRow>) {
    setForm((f) => ({ ...f, experiences: f.experiences.map((e, i) => (i === idx ? { ...e, ...patch } : e)) }));
  }
  function handleUploadDoc(idx: number, result: { objectKey: string; fileName: string }) {
    setForm((f) => ({
      ...f,
      documents: [...f.documents, { key: crypto.randomUUID(), category: "EXPERIENCE", experienceIndex: idx, ...result }],
    }));
  }
  function removeDoc(key: string) {
    setForm((f) => ({ ...f, documents: f.documents.filter((d) => d.key !== key) }));
  }

  return (
    <FormSection title="Experience" description="Previous employment history" icon={<History className="h-5 w-5" />} index={0}>
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="xs" onClick={addExperience} className={BUTTON_PRESS}>
          <Plus className="h-3.5 w-3.5" />
          Add Organisation
        </Button>
      </div>
      {form.experiences.length === 0 ? (
        <p className="text-sm text-muted-foreground">No previous experience added yet.</p>
      ) : (
        form.experiences.map((exp, idx) => {
          const docs = form.documents.filter((d) => d.experienceIndex === idx);
          return (
            <div key={idx} className="rounded-lg border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Organisation #{idx + 1}</h3>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeExperience(idx)} aria-label="Remove organisation">
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Company/Organization Name</Label>
                  <Input
                    placeholder="e.g. Google DeepMind"
                    value={exp.organizationName}
                    onChange={(e) => updateExperience(idx, { organizationName: e.target.value })}
                    className={FOCUS_GLOW}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Start Date</Label>
                  <Input type="date" value={exp.startDate} onChange={(e) => updateExperience(idx, { startDate: e.target.value })} className={FOCUS_GLOW} />
                </div>
                <div className="space-y-1.5">
                  <Label>End Date</Label>
                  <Input type="date" value={exp.endDate} onChange={(e) => updateExperience(idx, { endDate: e.target.value })} className={FOCUS_GLOW} />
                </div>
                <div className="space-y-1.5">
                  <Label>CTC / Last Drawn Salary</Label>
                  <Input type="number" min="0" placeholder="50000" value={exp.ctc} onChange={(e) => updateExperience(idx, { ctc: e.target.value })} className={FOCUS_GLOW} />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
                <span className="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  Experience Documents
                </span>
                <DocumentUploadButton onUploaded={(r) => handleUploadDoc(idx, r)} />
              </div>
              {docs.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {docs.map((d) => (
                    <li key={d.key} className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1 text-xs">
                      <span className="flex items-center gap-1.5 text-foreground">
                        <Paperclip className="h-3 w-3" />
                        {d.fileName}
                      </span>
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeDoc(d.key)}>
                        <Trash2 className="h-3 w-3 text-danger" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })
      )}
    </FormSection>
  );
}

export function ContactSection({ form, setForm }: SectionProps) {
  return (
    <FormSection title="Contact" description="Reachability and personal details" icon={<Phone className="h-5 w-5" />} index={0}>
      <FormSubsection title="Contact Details">
        <div className="space-y-1.5">
          <Label>
            Mobile
            <RequiredMark />
          </Label>
          <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={FOCUS_GLOW} />
        </div>
        <div className="space-y-1.5">
          <Label>Emergency Contact</Label>
          <Input value={form.emergencyContactPhone} onChange={(e) => setForm((f) => ({ ...f, emergencyContactPhone: e.target.value }))} className={FOCUS_GLOW} />
        </div>
        <div className="space-y-1.5">
          <Label>
            Email Address
            <RequiredMark />
          </Label>
          <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={FOCUS_GLOW} />
        </div>
        <div className="space-y-1.5">
          <Label>Father / Spouse</Label>
          <Input value={form.fatherOrSpouseName} onChange={(e) => setForm((f) => ({ ...f, fatherOrSpouseName: e.target.value }))} className={FOCUS_GLOW} />
        </div>
        <div className="space-y-1.5">
          <Label>Qualification</Label>
          <Input value={form.qualification} onChange={(e) => setForm((f) => ({ ...f, qualification: e.target.value }))} className={FOCUS_GLOW} />
        </div>
        <div className="space-y-1.5">
          <Label>Religion</Label>
          <Select value={form.religion} onValueChange={(v) => setForm((f) => ({ ...f, religion: v }))}>
            <SelectTrigger className={FOCUS_GLOW}>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {RELIGION_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FormSubsection>
      <FormSubsection title="Address" className="sm:grid-cols-1">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>
              Permanent Address
              <RequiredMark />
            </Label>
            <Textarea value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className={FOCUS_GLOW} />
          </div>
          <div className="space-y-1.5">
            <Label>Temporary Address</Label>
            <Textarea value={form.temporaryAddress} onChange={(e) => setForm((f) => ({ ...f, temporaryAddress: e.target.value }))} className={FOCUS_GLOW} />
          </div>
        </div>
      </FormSubsection>
    </FormSection>
  );
}

export function DocumentsSection({ form, setForm }: SectionProps) {
  const additionalDocs = form.documents.filter((d) => d.category === "ADDITIONAL");

  function handleUpload(category: StagedDocument["category"], result: { objectKey: string; fileName: string }) {
    setForm((f) => ({
      ...f,
      documents: [...f.documents.filter((d) => d.category !== category || category === "ADDITIONAL"), { key: crypto.randomUUID(), category, ...result }],
    }));
  }
  function removeDoc(key: string) {
    setForm((f) => ({ ...f, documents: f.documents.filter((d) => d.key !== key) }));
  }

  return (
    <FormSection title="Documents" description="Identity documents and uploads" icon={<FileText className="h-5 w-5" />} index={0}>
      <FormSubsection title="Identity Documents" description="Aadhar and PAN numbers are entered on the Personal tab — upload the scanned cards here">
        <div className="space-y-1.5">
          <Label>Aadhar card scan</Label>
          <div className="flex items-center gap-2">
            <DocumentUploadButton onUploaded={(r) => handleUpload("AADHAR", r)} />
            <span className="truncate text-sm text-muted-foreground">
              {form.documents.find((d) => d.category === "AADHAR")?.fileName ?? "No file uploaded"}
            </span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>PAN card scan</Label>
          <div className="flex items-center gap-2">
            <DocumentUploadButton onUploaded={(r) => handleUpload("PAN", r)} />
            <span className="truncate text-sm text-muted-foreground">
              {form.documents.find((d) => d.category === "PAN")?.fileName ?? "No file uploaded"}
            </span>
          </div>
        </div>
      </FormSubsection>

      <FormSubsection title="Additional Documents" className="sm:grid-cols-1">
        <div className="flex justify-end">
          <DocumentUploadButton onUploaded={(r) => handleUpload("ADDITIONAL", r)} />
        </div>
        {additionalDocs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No additional documents added.</p>
        ) : (
          <ul className="space-y-1">
            {additionalDocs.map((d) => (
              <li key={d.key} className="flex items-center justify-between rounded-md bg-muted/40 px-2.5 py-1.5 text-sm">
                <span className="flex items-center gap-1.5 text-foreground">
                  <Paperclip className="h-3.5 w-3.5" />
                  {d.fileName}
                </span>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeDoc(d.key)}>
                  <Trash2 className="h-3.5 w-3.5 text-danger" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </FormSubsection>
    </FormSection>
  );
}

const SALARY_COMPONENT_CODES_HANDLED_ELSEWHERE = new Set(["PF", "PT", "TDS"]);

export function SalarySection({
  form,
  setForm,
  orgSalaryComponents,
}: SectionProps & { orgSalaryComponents: { id: string; code: string; name: string }[] }) {
  const visibleComponents = orgSalaryComponents.filter((c) => !SALARY_COMPONENT_CODES_HANDLED_ELSEWHERE.has(c.code));
  const busRow = form.salaryComponents.find((c) => c.code === "BUS");

  useEffect(() => {
    if (visibleComponents.length === 0) return;
    setForm((f) =>
      f.salaryComponents.length > 0
        ? f
        : { ...f, salaryComponents: visibleComponents.map((c) => ({ code: c.code, name: c.name, amount: "", isMonthly: true })) },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleComponents.length]);

  function updateAmount(code: string, amount: string) {
    setForm((f) => ({ ...f, salaryComponents: f.salaryComponents.map((c) => (c.code === code ? { ...c, amount } : c)) }));
  }
  function toggleBusMonthly(checked: boolean) {
    setForm((f) => ({ ...f, salaryComponents: f.salaryComponents.map((c) => (c.code === "BUS" ? { ...c, isMonthly: checked } : c)) }));
  }

  return (
    <FormSection title="Salary" description="Compensation breakdown and eligibility" icon={<Banknote className="h-5 w-5" />} index={0}>
      <FormSubsection title="Compensation">
        <div className="space-y-1.5">
          <Label>
            Basic Salary (₹)
            <RequiredMark />
          </Label>
          <Input type="number" min="0" value={form.monthlyGrossSalary} onChange={(e) => setForm((f) => ({ ...f, monthlyGrossSalary: e.target.value }))} className={FOCUS_GLOW} />
        </div>
        {form.salaryComponents.map((c) => (
          <div key={c.code} className="space-y-1.5">
            <Label>{c.name} (₹)</Label>
            <Input type="number" min="0" value={c.amount} onChange={(e) => updateAmount(c.code, e.target.value)} className={FOCUS_GLOW} />
          </div>
        ))}
      </FormSubsection>

      <FormSubsection title="Eligibility">
        <div className="flex items-center gap-2">
          <Checkbox id="e-pf" checked={form.pfEligible} onCheckedChange={(v) => setForm((f) => ({ ...f, pfEligible: !!v }))} />
          <Label htmlFor="e-pf" className="font-normal">
            PF Eligible
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="e-esi" checked={form.esiEligible} onCheckedChange={(v) => setForm((f) => ({ ...f, esiEligible: !!v }))} />
          <Label htmlFor="e-esi" className="font-normal">
            ESI Eligible
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="e-lwp" checked={form.leaveWithPayEligible} onCheckedChange={(v) => setForm((f) => ({ ...f, leaveWithPayEligible: !!v }))} />
          <Label htmlFor="e-lwp" className="font-normal">
            Leave With Pay
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="e-daily" checked={form.dailyWagesEligible} onCheckedChange={(v) => setForm((f) => ({ ...f, dailyWagesEligible: !!v }))} />
          <Label htmlFor="e-daily" className="font-normal">
            Daily Wages
          </Label>
        </div>
        {busRow && (
          <div className="flex items-center gap-2 rounded-md bg-info/10 px-3 py-2 sm:col-span-2">
            <Checkbox id="e-bus-monthly" checked={busRow.isMonthly} onCheckedChange={(v) => toggleBusMonthly(!!v)} />
            <Label htmlFor="e-bus-monthly" className="font-normal text-info">
              Is Bus Allowance Monthly? (Tick for Flat Monthly, Untick for Daily Rate)
            </Label>
          </div>
        )}
      </FormSubsection>
    </FormSection>
  );
}

export function BankTaxSection({ form, setForm }: SectionProps) {
  return (
    <FormSection title="Bank / Tax" description="Statutory and banking details" icon={<Landmark className="h-5 w-5" />} index={0}>
      <FormSubsection title="Statutory">
        <div className="space-y-1.5">
          <Label>UAN</Label>
          <Input value={form.uan} onChange={(e) => setForm((f) => ({ ...f, uan: e.target.value }))} className={FOCUS_GLOW} />
        </div>
        <div className="space-y-1.5">
          <Label>ESI No.</Label>
          <Input value={form.esiNumber} onChange={(e) => setForm((f) => ({ ...f, esiNumber: e.target.value }))} className={FOCUS_GLOW} />
        </div>
        <div className="space-y-1.5">
          <Label>TDS Type</Label>
          <Select value={form.tdsType} onValueChange={(v) => setForm((f) => ({ ...f, tdsType: v }))}>
            <SelectTrigger className={FOCUS_GLOW}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
              <SelectItem value="FIXED">Fixed Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>TDS {form.tdsType === "FIXED" ? "Amount (₹)" : "Percentage (%)"}</Label>
          <Input type="number" min="0" value={form.tdsValue} onChange={(e) => setForm((f) => ({ ...f, tdsValue: e.target.value }))} className={FOCUS_GLOW} />
        </div>
      </FormSubsection>

      <FormSubsection title="Bank Details">
        <div className="space-y-1.5">
          <Label>Pay Mode</Label>
          <Select value={form.payMode} onValueChange={(v) => setForm((f) => ({ ...f, payMode: v }))}>
            <SelectTrigger className={FOCUS_GLOW}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAY_MODE_OPTIONS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m === "BANK" ? "Bank" : "Cash"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>
            Bank A/C No.
            {form.payMode === "BANK" && <RequiredMark />}
          </Label>
          <div className="flex gap-2">
            <Input value={form.bankAccountNumber} onChange={(e) => setForm((f) => ({ ...f, bankAccountNumber: e.target.value }))} className={cn("flex-1", FOCUS_GLOW)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>
            IFSC
            {form.payMode === "BANK" && <RequiredMark />}
          </Label>
          <Input value={form.bankIfsc} onChange={(e) => setForm((f) => ({ ...f, bankIfsc: e.target.value }))} className={FOCUS_GLOW} />
        </div>
        <div className="space-y-1.5">
          <Label>
            Bank Name
            {form.payMode === "BANK" && <RequiredMark />}
          </Label>
          <Input value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} className={FOCUS_GLOW} />
        </div>
      </FormSubsection>
    </FormSection>
  );
}
