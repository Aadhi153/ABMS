import { useEffect, useRef } from "react";
import { gql, useMutation } from "@apollo/client";
import { Banknote, Briefcase, FileText, History, Landmark, Paperclip, Phone, Plus, Trash2, Upload, User } from "lucide-react";
import {
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  cn,
  toast,
} from "@abms/ui";
import { FormSection, FormSubsection, RequiredMark } from "../products/form-page";
import { FOCUS_GLOW, BUTTON_PRESS } from "../products/form-motion";
import type { Department, Designation, Grade, Shift } from "./types";
import { EMPLOYEE_DOCUMENT_CATEGORIES, MARITAL_STATUS_OPTIONS, PAY_MODE_OPTIONS } from "./types";

const RELIGION_OPTIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Other"];
const GENDERS = ["MALE", "FEMALE", "OTHER"];
const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN", "PROBATION"];
const STATUSES = ["ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED", "RESIGNED"];

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
  lastName: string;
  gender: string;
  maritalStatus: string;
  bloodGroup: string;
  dateOfBirth: string;
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
    lastName: "",
    gender: "",
    maritalStatus: "",
    bloodGroup: "",
    dateOfBirth: "",
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

export function PersonalSection({ form, setForm, branches }: SectionProps & { branches: { id: string; name: string }[] }) {
  return (
    <FormSection title="Personal Information" description="Identity and basic details" icon={<User className="h-5 w-5" />} index={0}>
      <FormSubsection title="Identity">
        <div className="space-y-1.5">
          <Label>
            Branch
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
        </div>
        <div className="space-y-1.5">
          <Label>eSSL / Biometric ID</Label>
          <Input placeholder="e.g. 101" value={form.biometricId} onChange={(e) => setForm((f) => ({ ...f, biometricId: e.target.value }))} className={FOCUS_GLOW} />
        </div>
      </FormSubsection>

      <FormSubsection title="Basic Details">
        <div className="space-y-1.5">
          <Label>
            First name
            <RequiredMark />
          </Label>
          <Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} className={FOCUS_GLOW} />
        </div>
        <div className="space-y-1.5">
          <Label>
            Last name
            <RequiredMark />
          </Label>
          <Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} className={FOCUS_GLOW} />
        </div>
        <div className="space-y-1.5">
          <Label>Gender</Label>
          <Select value={form.gender} onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}>
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
        <div className="space-y-1.5">
          <Label>Blood Group</Label>
          <Input placeholder="O+" value={form.bloodGroup} onChange={(e) => setForm((f) => ({ ...f, bloodGroup: e.target.value }))} className={FOCUS_GLOW} />
        </div>
        <div className="space-y-1.5">
          <Label>
            Date of Birth
            <RequiredMark />
          </Label>
          <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} className={FOCUS_GLOW} />
        </div>
      </FormSubsection>
    </FormSection>
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
  managers: { id: string; fullName: string }[];
}) {
  return (
    <FormSection title="Job Details" description="Role, grade, and schedule" icon={<Briefcase className="h-5 w-5" />} index={0}>
      <FormSubsection title="Role">
        <div className="space-y-1.5">
          <Label>Grade</Label>
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
                Salary Limit: ₹{selected.minSalary ?? 0} – ₹{selected.maxSalary ?? "—"}
              </p>
            ) : null;
          })()}
        </div>
        <div className="space-y-1.5">
          <Label>
            Department
            <RequiredMark />
          </Label>
          <Select value={form.department} onValueChange={(v) => setForm((f) => ({ ...f, department: v }))}>
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
            Date of joining
            <RequiredMark />
          </Label>
          <Input type="date" value={form.dateOfJoining} onChange={(e) => setForm((f) => ({ ...f, dateOfJoining: e.target.value }))} className={FOCUS_GLOW} />
        </div>
        <div className="space-y-1.5">
          <Label>Reporting manager</Label>
          <Select value={form.reportingManagerId} onValueChange={(v) => setForm((f) => ({ ...f, reportingManagerId: v }))}>
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
      </FormSubsection>

      <FormSubsection title="Schedule">
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
          <Label>Work Hrs/Day</Label>
          <Input placeholder="8.30" value={form.workHoursPerDay} onChange={(e) => setForm((f) => ({ ...f, workHoursPerDay: e.target.value }))} className={FOCUS_GLOW} />
          <p className="text-xs text-muted-foreground">Use HH.MM format (e.g. 8.30 for 8h 30m)</p>
        </div>
        <div className="space-y-1.5">
          <Label>Employment Type</Label>
          <Select value={form.employmentType} onValueChange={(v) => setForm((f) => ({ ...f, employmentType: v }))}>
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
          <Label>
            Status
            <RequiredMark />
          </Label>
          <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
            <SelectTrigger className={FOCUS_GLOW}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FormSubsection>
    </FormSection>
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
      <FormSubsection title="Identity Documents">
        <div className="space-y-1.5">
          <Label>
            Aadhar
            <RequiredMark />
          </Label>
          <div className="flex gap-2">
            <Input value={form.aadharNumber} onChange={(e) => setForm((f) => ({ ...f, aadharNumber: e.target.value }))} className={cn("flex-1", FOCUS_GLOW)} />
            <DocumentUploadButton onUploaded={(r) => handleUpload("AADHAR", r)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>
            PAN
            <RequiredMark />
          </Label>
          <div className="flex gap-2">
            <Input value={form.panNumber} onChange={(e) => setForm((f) => ({ ...f, panNumber: e.target.value }))} className={cn("flex-1", FOCUS_GLOW)} />
            <DocumentUploadButton onUploaded={(r) => handleUpload("PAN", r)} />
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
