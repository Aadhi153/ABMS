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
  Loader2,
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

const RELATION_OPTIONS = ["Father", "Mother", "Spouse", "Guardian", "Other"];
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
  /** Captured from the `File` object at upload time for the file-chip size tag — not
   * persisted server-side (EmployeeDocument has no size column), so it's lost on reload. */
  fileSizeBytes?: number;
}

export interface EmployeeExperienceRow {
  organizationName: string;
  designation: string;
  startDate: string;
  endDate: string;
  currentlyServing: boolean;
  ctc: string;
  fixedCtc: string;
  bonusCtc: string;
  reasonForLeaving: string;
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
  isFresher: boolean;
  experiences: EmployeeExperienceRow[];
  phone: string;
  emergencyContactPhone: string;
  email: string;
  fatherOrSpouseName: string;
  fatherOrSpouseRelation: string;
  qualification: string;
  religion: string;
  addressLine: string;
  addressCity: string;
  addressState: string;
  addressPincode: string;
  temporaryAddressSameAsPermanent: boolean;
  temporaryAddressLine: string;
  temporaryAddressCity: string;
  temporaryAddressState: string;
  temporaryAddressPincode: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
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
    isFresher: false,
    experiences: [],
    phone: "",
    emergencyContactPhone: "",
    email: "",
    fatherOrSpouseName: "",
    fatherOrSpouseRelation: "Father",
    qualification: "",
    religion: "",
    addressLine: "",
    addressCity: "",
    addressState: "",
    addressPincode: "",
    temporaryAddressSameAsPermanent: false,
    temporaryAddressLine: "",
    temporaryAddressCity: "",
    temporaryAddressState: "",
    temporaryAddressPincode: "",
    emergencyContactName: "",
    emergencyContactRelation: "Father",
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function useDocumentUpload() {
  const [requestUploadUrl] = useMutation(REQUEST_EMPLOYEE_DOCUMENT_UPLOAD_URL);

  async function upload(file: File): Promise<{ objectKey: string; fileName: string; fileSizeBytes: number } | null> {
    try {
      const { data } = await requestUploadUrl({ variables: { contentType: file.type, fileSizeBytes: file.size } });
      const { uploadUrl, objectKey } = data.requestEmployeeDocumentUploadUrl;
      const putResponse = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!putResponse.ok) throw new Error("Upload to storage failed");
      return { objectKey, fileName: file.name, fileSizeBytes: file.size };
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload file");
      return null;
    }
  }

  return upload;
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

const DOCUMENT_UPLOAD_ACCEPT = "image/png,image/jpeg,image/webp,application/pdf";
// Mirrors assertDocumentUpload's MAX_DOCUMENT_BYTES in apps/api/src/common/storage/storage.resolver.ts —
// matching it client-side turns a server 400 into an inline toast before the request even fires.
const MAX_DOCUMENT_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Dashed-border drag-and-drop target shared by every document upload surface on this form
 * (statutory ID scans, additional documents, experience proof) so they all get the same
 * affordance — click, drag-drop, busy spinner — instead of the bare icon-only button. */
function DocumentDropzone({
  hint,
  compact,
  onUploaded,
}: {
  /** Caption under the call-to-action, e.g. "Aadhaar card · PDF, PNG, JPG up to 10MB". */
  hint: string;
  /** Tighter padding for use inside an already-bordered statutory card. */
  compact?: boolean;
  onUploaded: (result: { objectKey: string; fileName: string; fileSizeBytes: number }) => void;
}) {
  const upload = useDocumentUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
      toast.error("File must be under 10MB");
      return;
    }
    setBusy(true);
    const result = await upload(file);
    setBusy(false);
    if (result) onUploaded(result);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-center transition-colors duration-150",
        compact ? "p-2.5" : "p-3",
        dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={DOCUMENT_UPLOAD_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          handleFile(file);
        }}
      />
      {busy ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Upload className="h-4 w-4 text-muted-foreground" />}
      <p className="text-xs font-medium text-foreground">{busy ? "Uploading…" : "Drag & drop or click to upload"}</p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

/** File chip shown once a document is attached — name, size, "Uploaded" badge, remove —
 * shared by the statutory cards, additional documents list, and experience proof rows. */
function UploadedDocumentChip({ fileName, fileSizeBytes, onRemove }: { fileName: string; fileSizeBytes?: number; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-xs">
      <span className="flex min-w-0 items-center gap-1.5 text-foreground">
        <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate font-medium">{fileName}</span>
        {fileSizeBytes != null && <span className="shrink-0 text-muted-foreground">({formatFileSize(fileSizeBytes)})</span>}
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <Badge tone="success" className="gap-1 px-1.5 py-0 text-[10px]">
          <CheckCircle2 className="h-2.5 w-2.5" />
          Uploaded
        </Badge>
        <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={onRemove}>
          <Trash2 className="h-3 w-3 text-danger" />
        </Button>
      </span>
    </div>
  );
}

/** Years + remaining months between a start date and (end date, or today when still
 * serving) — null while data is incomplete so the tenure badge just doesn't render yet. */
function calculateTenure(startDate: string, endDate: string, currentlyServing: boolean): { years: number; months: number } | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return null;
  const endRef = currentlyServing ? new Date() : endDate ? new Date(endDate) : null;
  if (!endRef || Number.isNaN(endRef.getTime())) return null;
  let totalMonths = (endRef.getFullYear() - start.getFullYear()) * 12 + (endRef.getMonth() - start.getMonth());
  if (endRef.getDate() < start.getDate()) totalMonths--;
  if (totalMonths < 0) return null;
  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12 };
}

function formatCtcPreview(ctc: string): string | null {
  const n = Number(ctc);
  if (!ctc || Number.isNaN(n) || n <= 0) return null;
  return `₹ ${n.toLocaleString("en-IN")} / year`;
}

/** Compact lakhs notation (₹16.2L) for the Fixed/Bonus breakdown line — distinct from
 * formatCtcPreview's full-rupee format, matching how compensation benchmarking is
 * normally skimmed in INR-denominated HR workflows. */
function formatLakhs(n: number): string {
  return `₹${(n / 100000).toFixed(1)}L`;
}

export function ExperienceSection({ form, setForm }: SectionProps) {
  function setFresher(checked: boolean) {
    setForm((f) => ({
      ...f,
      isFresher: checked,
      experiences: checked ? [] : f.experiences,
      documents: checked ? f.documents.filter((d) => d.experienceIndex == null) : f.documents,
    }));
  }
  function addExperience() {
    setForm((f) => ({
      ...f,
      experiences: [
        ...f.experiences,
        { organizationName: "", designation: "", startDate: "", endDate: "", currentlyServing: false, ctc: "", fixedCtc: "", bonusCtc: "", reasonForLeaving: "" },
      ],
    }));
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
  function handleUploadDoc(idx: number, result: { objectKey: string; fileName: string; fileSizeBytes: number }) {
    setForm((f) => ({
      ...f,
      documents: [...f.documents, { key: crypto.randomUUID(), category: "EXPERIENCE", experienceIndex: idx, ...result }],
    }));
  }
  function removeDoc(key: string) {
    setForm((f) => ({ ...f, documents: f.documents.filter((d) => d.key !== key) }));
  }

  return (
    <FormSection
      title="Experience"
      description={
        form.isFresher
          ? "Previous employment history"
          : "Record verified employment history and benchmark compensation for role grading"
      }
      icon={<History className="h-5 w-5" />}
      index={0}
      badge={
        !form.isFresher && form.experiences.length > 0 ? (
          <Badge tone="info">
            {form.experiences.length} Record{form.experiences.length > 1 ? "s" : ""} Added
          </Badge>
        ) : undefined
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Checkbox id="is-fresher" checked={form.isFresher} onCheckedChange={(v) => setFresher(!!v)} />
          <Label htmlFor="is-fresher" className="font-normal text-foreground">
            Fresher <span className="text-muted-foreground">(no prior work experience — skip this step)</span>
          </Label>
        </div>
        {!form.isFresher && (
          <Button type="button" variant="outline" size="xs" onClick={addExperience} className={BUTTON_PRESS}>
            <Plus className="h-3.5 w-3.5" />
            Add Organisation
          </Button>
        )}
      </div>

      {form.isFresher ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          Marked as a fresher — no employment history required.
        </p>
      ) : form.experiences.length === 0 ? (
        <p className="text-sm text-muted-foreground">No previous experience added yet.</p>
      ) : (
        form.experiences.map((exp, idx) => {
          const docs = form.documents.filter((d) => d.experienceIndex === idx);
          const tenure = calculateTenure(exp.startDate, exp.endDate, exp.currentlyServing);
          const ctcPreview = formatCtcPreview(exp.ctc);
          const fixedNum = Number(exp.fixedCtc);
          const bonusNum = Number(exp.bonusCtc);
          const hasFixed = exp.fixedCtc !== "" && !Number.isNaN(fixedNum) && fixedNum > 0;
          const hasBonus = exp.bonusCtc !== "" && !Number.isNaN(bonusNum) && bonusNum > 0;
          const ctcBreakdown =
            hasFixed || hasBonus
              ? `Fixed: ${hasFixed ? formatLakhs(fixedNum) : "—"} | Performance Bonus: ${hasBonus ? formatLakhs(bonusNum) : "—"}`
              : null;
          return (
            <div key={idx} className="rounded-lg border border-border p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h3 className="text-sm font-semibold text-foreground">
                    Organisation #{idx + 1}
                    {idx === 0 && <span className="text-muted-foreground"> (Most Recent)</span>}
                  </h3>
                  {idx === 0 && <Badge tone="info">Last Employer</Badge>}
                  {exp.currentlyServing && (
                    <Badge tone="info" className="gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-info" />
                      Currently Serving
                    </Badge>
                  )}
                  {tenure && (
                    <Badge tone="muted" className="font-mono">
                      Tenure: {tenure.years} yrs {tenure.months} mos
                    </Badge>
                  )}
                  {tenure && docs.length > 0 && (
                    <Badge tone="success" className="gap-1">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      Verified
                    </Badge>
                  )}
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeExperience(idx)} aria-label="Remove organisation">
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Company/Organization Name</Label>
                  <Input
                    placeholder="e.g. Google DeepMind"
                    value={exp.organizationName}
                    onChange={(e) => updateExperience(idx, { organizationName: e.target.value })}
                    className={FOCUS_GLOW}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Designation / Role</Label>
                  <Input
                    placeholder="e.g. Senior Software Engineer"
                    value={exp.designation}
                    onChange={(e) => updateExperience(idx, { designation: e.target.value })}
                    className={FOCUS_GLOW}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Start Date</Label>
                  <Input type="date" value={exp.startDate} onChange={(e) => updateExperience(idx, { startDate: e.target.value })} className={FOCUS_GLOW} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label>End Date</Label>
                    <label className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                      <Checkbox
                        checked={exp.currentlyServing}
                        onCheckedChange={(v) => updateExperience(idx, { currentlyServing: !!v, endDate: v ? "" : exp.endDate, reasonForLeaving: v ? "" : exp.reasonForLeaving })}
                      />
                      Currently serving
                    </label>
                  </div>
                  <Input
                    type="date"
                    disabled={exp.currentlyServing}
                    value={exp.endDate}
                    onChange={(e) => updateExperience(idx, { endDate: e.target.value })}
                    className={FOCUS_GLOW}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>CTC / Last Drawn Salary (Annual)</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      min="0"
                      placeholder="1500000"
                      value={exp.ctc}
                      onChange={(e) => updateExperience(idx, { ctc: e.target.value })}
                      className={cn("pl-6", FOCUS_GLOW)}
                    />
                  </div>
                  {ctcPreview && <p className="text-xs text-muted-foreground">{ctcPreview}</p>}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Fixed component"
                        value={exp.fixedCtc}
                        onChange={(e) => updateExperience(idx, { fixedCtc: e.target.value })}
                        className={cn("h-8 pl-6 text-xs", FOCUS_GLOW)}
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Performance bonus"
                        value={exp.bonusCtc}
                        onChange={(e) => updateExperience(idx, { bonusCtc: e.target.value })}
                        className={cn("h-8 pl-6 text-xs", FOCUS_GLOW)}
                      />
                    </div>
                  </div>
                  {ctcBreakdown && <p className="text-[11px] text-muted-foreground">{ctcBreakdown}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Reason for Leaving</Label>
                  <Input
                    placeholder="e.g. Career growth"
                    value={exp.reasonForLeaving}
                    disabled={exp.currentlyServing}
                    onChange={(e) => updateExperience(idx, { reasonForLeaving: e.target.value })}
                    className={FOCUS_GLOW}
                  />
                </div>
              </div>
              <div className="mt-3 space-y-2 border-t border-border pt-2.5">
                <span className="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  Experience Documents
                </span>
                <DocumentDropzone hint="Relieving letter, payslips · PDF, PNG, JPG up to 10MB" onUploaded={(r) => handleUploadDoc(idx, r)} />
                {docs.length > 0 && (
                  <ul className="space-y-1.5">
                    {docs.map((d) => (
                      <li key={d.key}>
                        <UploadedDocumentChip fileName={d.fileName} fileSizeBytes={d.fileSizeBytes} onRemove={() => removeDoc(d.key)} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })
      )}

      {!form.isFresher && form.experiences.length > 0 && (
        <button
          type="button"
          onClick={addExperience}
          className={cn(
            "w-full rounded-lg border border-dashed border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:border-primary/50 hover:text-primary",
            BUTTON_PRESS,
          )}
        >
          + Add Previous Organization #{form.experiences.length + 1} (Prior Employer)
        </button>
      )}
    </FormSection>
  );
}

export function ContactSection({ form, setForm }: SectionProps) {
  function toggleSameAsPermanent(checked: boolean) {
    setForm((f) => ({
      ...f,
      temporaryAddressSameAsPermanent: checked,
      ...(checked
        ? {
            temporaryAddressLine: f.addressLine,
            temporaryAddressCity: f.addressCity,
            temporaryAddressState: f.addressState,
            temporaryAddressPincode: f.addressPincode,
          }
        : {}),
    }));
  }

  /** Updates a permanent-address field and, while the sync toggle is on, mirrors the same
   * value into the matching temporary-address field so the two never drift apart. */
  function setPermanent(patch: Partial<Pick<EmployeeFormState, "addressLine" | "addressCity" | "addressState" | "addressPincode">>) {
    setForm((f) => ({
      ...f,
      ...patch,
      ...(f.temporaryAddressSameAsPermanent
        ? {
            temporaryAddressLine: patch.addressLine ?? f.addressLine,
            temporaryAddressCity: patch.addressCity ?? f.addressCity,
            temporaryAddressState: patch.addressState ?? f.addressState,
            temporaryAddressPincode: patch.addressPincode ?? f.addressPincode,
          }
        : {}),
    }));
  }

  return (
    <FormSection title="Contact" description="Reachability, guardian details & residential records" icon={<Phone className="h-5 w-5" />} index={0}>
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
          <div className="flex gap-1.5">
            <Select value={form.emergencyContactRelation} onValueChange={(v) => setForm((f) => ({ ...f, emergencyContactRelation: v }))}>
              <SelectTrigger className={cn("w-28 shrink-0", FOCUS_GLOW)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATION_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Name" value={form.emergencyContactName} onChange={(e) => setForm((f) => ({ ...f, emergencyContactName: e.target.value }))} className={FOCUS_GLOW} />
          </div>
          <Input placeholder="Phone number" value={form.emergencyContactPhone} onChange={(e) => setForm((f) => ({ ...f, emergencyContactPhone: e.target.value }))} className={FOCUS_GLOW} />
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
          <div className="flex gap-1.5">
            <Select value={form.fatherOrSpouseRelation} onValueChange={(v) => setForm((f) => ({ ...f, fatherOrSpouseRelation: v }))}>
              <SelectTrigger className={cn("w-28 shrink-0", FOCUS_GLOW)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATION_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Full name" value={form.fatherOrSpouseName} onChange={(e) => setForm((f) => ({ ...f, fatherOrSpouseName: e.target.value }))} className={FOCUS_GLOW} />
          </div>
        </div>
      </FormSubsection>

      <FormSubsection title="Address Details" className="sm:grid-cols-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">Structured residential records for statutory filings</p>
          <div className="flex items-center gap-2">
            <Checkbox id="addr-sync" checked={form.temporaryAddressSameAsPermanent} onCheckedChange={(v) => toggleSameAsPermanent(!!v)} />
            <Label htmlFor="addr-sync" className="font-normal text-xs">
              Temporary address same as permanent
            </Label>
            {form.temporaryAddressSameAsPermanent && (
              <Badge tone="success" className="gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Synchronized
              </Badge>
            )}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2.5">
            <Label>
              Permanent Address
              <RequiredMark />
            </Label>
            <Input
              placeholder="Door / Flat No, Building & Street"
              value={form.addressLine}
              onChange={(e) => setPermanent({ addressLine: e.target.value })}
              className={FOCUS_GLOW}
            />
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="City / District" value={form.addressCity} onChange={(e) => setPermanent({ addressCity: e.target.value })} className={FOCUS_GLOW} />
              <Input placeholder="State" value={form.addressState} onChange={(e) => setPermanent({ addressState: e.target.value })} className={FOCUS_GLOW} />
              <Input placeholder="PIN Code" value={form.addressPincode} onChange={(e) => setPermanent({ addressPincode: e.target.value })} className={FOCUS_GLOW} />
            </div>
          </div>
          <div className="space-y-2.5">
            <Label>Temporary Address</Label>
            <Input
              placeholder="Door / Flat No, Building & Street"
              value={form.temporaryAddressLine}
              disabled={form.temporaryAddressSameAsPermanent}
              onChange={(e) => setForm((f) => ({ ...f, temporaryAddressLine: e.target.value }))}
              className={FOCUS_GLOW}
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="City / District"
                value={form.temporaryAddressCity}
                disabled={form.temporaryAddressSameAsPermanent}
                onChange={(e) => setForm((f) => ({ ...f, temporaryAddressCity: e.target.value }))}
                className={FOCUS_GLOW}
              />
              <Input
                placeholder="State"
                value={form.temporaryAddressState}
                disabled={form.temporaryAddressSameAsPermanent}
                onChange={(e) => setForm((f) => ({ ...f, temporaryAddressState: e.target.value }))}
                className={FOCUS_GLOW}
              />
              <Input
                placeholder="PIN Code"
                value={form.temporaryAddressPincode}
                disabled={form.temporaryAddressSameAsPermanent}
                onChange={(e) => setForm((f) => ({ ...f, temporaryAddressPincode: e.target.value }))}
                className={FOCUS_GLOW}
              />
            </div>
          </div>
        </div>
      </FormSubsection>
    </FormSection>
  );
}

/** `XXXX XXXX 1234` for a 12-digit Aadhaar number, leaving the rest of the string alone
 * (so a still-being-typed or invalid value shows as typed rather than silently vanishing). */
function maskAadhaar(value: string): string {
  const digits = value.replace(/\s/g, "");
  return digits.length === 12 ? `XXXX XXXX ${digits.slice(-4)}` : value;
}

/** One statutory ID scan slot (Aadhaar/PAN) — echoes the number entered on the Personal
 * tab next to a match indicator, so whoever uploads the scan can eyeball it against the
 * typed value instead of flipping back to the Personal tab to double check. */
function StatutoryDocumentCard({
  title,
  enteredNumber,
  numberValid,
  complianceTag,
  dropzoneHint,
  doc,
  onUpload,
  onRemove,
}: {
  title: string;
  enteredNumber: string;
  numberValid: boolean;
  complianceTag: string;
  dropzoneHint: string;
  doc?: StagedDocument;
  onUpload: (result: { objectKey: string; fileName: string; fileSizeBytes: number }) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <Label>{title}</Label>
        {numberValid ? (
          <Badge tone="success" className="shrink-0 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Matched
          </Badge>
        ) : (
          <Badge tone="warning" className="shrink-0">
            Not entered
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Number entered: <span className="font-mono text-foreground">{enteredNumber || "—"}</span>
      </p>
      {doc ? (
        <>
          <UploadedDocumentChip fileName={doc.fileName} fileSizeBytes={doc.fileSizeBytes} onRemove={onRemove} />
          {numberValid && <Badge tone="info">{complianceTag}</Badge>}
        </>
      ) : (
        <DocumentDropzone compact hint={dropzoneHint} onUploaded={onUpload} />
      )}
    </div>
  );
}

export function DocumentsSection({ form, setForm }: SectionProps) {
  const additionalDocs = form.documents.filter((d) => d.category === "ADDITIONAL");
  const aadharDoc = form.documents.find((d) => d.category === "AADHAR");
  const panDoc = form.documents.find((d) => d.category === "PAN");
  const aadharValid = /^\d{12}$/.test(form.aadharNumber.replace(/\s/g, ""));
  const panValid = /^[A-Z]{5}\d{4}[A-Z]$/.test(form.panNumber);

  function handleUpload(category: StagedDocument["category"], result: { objectKey: string; fileName: string; fileSizeBytes: number }) {
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
      <FormSubsection
        title="Mandatory Statutory Identifiers"
        description="Aadhaar and PAN numbers are entered on the Personal tab — upload the scanned cards here"
      >
        <StatutoryDocumentCard
          title="Aadhaar card scan"
          enteredNumber={maskAadhaar(form.aadharNumber)}
          numberValid={aadharValid}
          complianceTag="UIDAI-linked"
          dropzoneHint="Aadhaar card · PDF, PNG, JPG up to 10MB"
          doc={aadharDoc}
          onUpload={(r) => handleUpload("AADHAR", r)}
          onRemove={() => aadharDoc && removeDoc(aadharDoc.key)}
        />
        <StatutoryDocumentCard
          title="PAN card scan"
          enteredNumber={form.panNumber}
          numberValid={panValid}
          complianceTag="NSDL TDS-linked"
          dropzoneHint="PAN card · PDF, PNG, JPG up to 10MB"
          doc={panDoc}
          onUpload={(r) => handleUpload("PAN", r)}
          onRemove={() => panDoc && removeDoc(panDoc.key)}
        />
      </FormSubsection>

      <FormSubsection
        title="Additional Supporting Documents"
        description="Offer letter, degree certificate, background verification, or anything else relevant"
        className="sm:grid-cols-1"
      >
        <DocumentDropzone hint="Offer letter, certificates, BGV · PDF, PNG, JPG up to 10MB" onUploaded={(r) => handleUpload("ADDITIONAL", r)} />
        {additionalDocs.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground">No additional documents added yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {additionalDocs.map((d) => (
              <li key={d.key}>
                <UploadedDocumentChip fileName={d.fileName} fileSizeBytes={d.fileSizeBytes} onRemove={() => removeDoc(d.key)} />
              </li>
            ))}
          </ul>
        )}
      </FormSubsection>
    </FormSection>
  );
}

const SALARY_COMPONENT_CODES_HANDLED_ELSEWHERE = new Set(["PF", "PT", "TDS"]);

interface OrgSalaryComponent {
  id: string;
  code: string;
  name: string;
  type: string;
  calculationType: string;
  value: number;
}

export function SalarySection({
  form,
  setForm,
  orgSalaryComponents,
  grades,
}: SectionProps & { orgSalaryComponents: OrgSalaryComponent[]; grades: Grade[] }) {
  const visibleComponents = orgSalaryComponents.filter((c) => !SALARY_COMPONENT_CODES_HANDLED_ELSEWHERE.has(c.code));
  const pfComponent = orgSalaryComponents.find((c) => c.code === "PF");
  const ptComponent = orgSalaryComponents.find((c) => c.code === "PT");
  const busRow = form.salaryComponents.find((c) => c.code === "BUS");
  const grade = grades.find((g) => g.id === form.gradeId);
  const basic = Number(form.monthlyGrossSalary) || 0;

  useEffect(() => {
    if (visibleComponents.length === 0) return;
    setForm((f) =>
      f.salaryComponents.length > 0
        ? f
        : {
            ...f,
            salaryComponents: visibleComponents.map((c) => ({
              code: c.code,
              name: c.name,
              amount: c.calculationType === "PERCENTAGE" ? String(Math.round((basic * c.value) / 100)) : String(c.value),
              isMonthly: true,
            })),
          },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleComponents.length]);

  // Keeps every PERCENTAGE-of-basic row (e.g. HRA) in sync as Basic changes — those rows
  // are rendered read-only, so this effect is the only thing that ever writes their amount.
  useEffect(() => {
    setForm((f) => {
      let changed = false;
      const next = f.salaryComponents.map((row) => {
        const comp = visibleComponents.find((c) => c.code === row.code);
        if (comp?.calculationType !== "PERCENTAGE") return row;
        const computed = String(Math.round((basic * comp.value) / 100));
        if (row.amount === computed) return row;
        changed = true;
        return { ...row, amount: computed };
      });
      return changed ? { ...f, salaryComponents: next } : f;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basic, visibleComponents.length]);

  function updateAmount(code: string, amount: string) {
    setForm((f) => ({ ...f, salaryComponents: f.salaryComponents.map((c) => (c.code === code ? { ...c, amount } : c)) }));
  }
  function toggleBusMonthly(checked: boolean) {
    setForm((f) => ({ ...f, salaryComponents: f.salaryComponents.map((c) => (c.code === "BUS" ? { ...c, isMonthly: checked } : c)) }));
  }

  const grossMonthly =
    basic +
    form.salaryComponents
      .filter((row) => visibleComponents.find((c) => c.code === row.code)?.type === "EARNING")
      .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const annualCtc = grossMonthly * 12;

  return (
    <FormSection
      title="Compensation Structure & Statutory Setup"
      description="Monthly breakdown, CTC projection, and payroll eligibility"
      icon={<Banknote className="h-5 w-5" />}
      index={0}
      badge={
        <Badge tone="muted" className="font-normal">
          Wage Template: {grade?.name ?? "Not set in Job step"}
        </Badge>
      }
      compact
    >
      <FormSubsection title="Monthly Compensation Breakdown">
        <div className="space-y-1.5">
          <Label>
            Basic Salary (₹)
            <RequiredMark />
          </Label>
          <Input type="number" min="0" value={form.monthlyGrossSalary} onChange={(e) => setForm((f) => ({ ...f, monthlyGrossSalary: e.target.value }))} className={FOCUS_GLOW} />
        </div>
        {form.salaryComponents.map((row) => {
          const comp = visibleComponents.find((c) => c.code === row.code);
          const isPercentage = comp?.calculationType === "PERCENTAGE";
          return (
            <div key={row.code} className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                {row.name} (₹)
                {isPercentage && (
                  <Badge tone="muted" className="font-normal">
                    {comp!.value}% Basic
                  </Badge>
                )}
              </Label>
              <Input
                type="number"
                min="0"
                value={row.amount}
                disabled={isPercentage}
                onChange={(e) => updateAmount(row.code, e.target.value)}
                className={cn(isPercentage && "bg-muted/40", FOCUS_GLOW)}
              />
            </div>
          );
        })}
      </FormSubsection>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Gross Monthly</p>
          <p className="text-base font-semibold text-primary">₹ {grossMonthly.toLocaleString("en-IN")} / mo</p>
        </div>
        <div className="h-6 w-px bg-border" />
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Annual CTC</p>
          <p className="text-base font-semibold text-primary">₹ {annualCtc.toLocaleString("en-IN")} / annum</p>
        </div>
      </div>

      <FormSubsection title="Statutory Eligibility & Payroll Rules">
        <label htmlFor="e-pf" className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-2">
          <Checkbox id="e-pf" checked={form.pfEligible} onCheckedChange={(v) => setForm((f) => ({ ...f, pfEligible: !!v }))} className="mt-0.5" />
          <span>
            <span className="block text-sm font-medium text-foreground">PF Eligible</span>
            <span className="block text-xs text-muted-foreground">{pfComponent ? `${pfComponent.value}% of Basic` : "Provident Fund deduction"}</span>
          </span>
        </label>
        <label htmlFor="e-esi" className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-2">
          <Checkbox id="e-esi" checked={form.esiEligible} onCheckedChange={(v) => setForm((f) => ({ ...f, esiEligible: !!v }))} className="mt-0.5" />
          <span>
            <span className="block text-sm font-medium text-foreground">ESI Eligible</span>
            <span className="block text-xs text-muted-foreground">Threshold: ₹21,000 gross/mo</span>
          </span>
        </label>
        <label htmlFor="e-lwp" className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-2">
          <Checkbox id="e-lwp" checked={form.leaveWithPayEligible} onCheckedChange={(v) => setForm((f) => ({ ...f, leaveWithPayEligible: !!v }))} className="mt-0.5" />
          <span>
            <span className="block text-sm font-medium text-foreground">Leave With Pay</span>
            <span className="block text-xs text-muted-foreground">1.75 days / mo accrual</span>
          </span>
        </label>
        <label htmlFor="e-daily" className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-2">
          <Checkbox id="e-daily" checked={form.dailyWagesEligible} onCheckedChange={(v) => setForm((f) => ({ ...f, dailyWagesEligible: !!v }))} className="mt-0.5" />
          <span>
            <span className="block text-sm font-medium text-foreground">Daily Wages</span>
            <span className="block text-xs text-muted-foreground">Pay by attendance, not fixed CTC</span>
          </span>
        </label>
        {busRow && (
          <div className="flex items-center gap-2 rounded-md bg-info/10 px-3 py-2 sm:col-span-2">
            <Checkbox id="e-bus-monthly" checked={busRow.isMonthly} onCheckedChange={(v) => toggleBusMonthly(!!v)} />
            <Label htmlFor="e-bus-monthly" className="font-normal text-info">
              Is Bus Allowance Monthly? (Tick for Flat Monthly, Untick for Daily Rate)
            </Label>
          </div>
        )}
        <div className="flex items-center justify-between rounded-md border border-warning/30 bg-warning/10 px-3 py-2 sm:col-span-2">
          <span className="text-xs font-medium text-foreground">Professional Tax (state statutory slab)</span>
          <Badge tone="warning" className="font-normal">
            ₹{ptComponent?.value ?? 200}/mo
          </Badge>
        </div>
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
