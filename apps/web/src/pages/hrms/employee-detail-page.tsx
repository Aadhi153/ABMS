import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import { ArrowLeft, IdCard, Save } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  StatusBadge,
  cn,
  toast,
} from "@abms/ui";
import { FormBreadcrumb, FormPage } from "../products/form-page";
import { BUTTON_PRESS, FOCUS_GLOW, usePageTransition } from "../products/form-motion";
import type { AttendanceLog, Department, Designation, Employee, EmployeeLoan, Grade, LeaveRequest, Payslip, Shift } from "./types";
import { fmtDate, inr } from "./hrms-helpers";

const EMPLOYEES_ROUTE = "/hrms/employees";

const EMPLOYEE_QUERY = gql`
  query EmployeeDetailData($id: String!) {
    employee(id: $id) {
      id
      employeeCode
      firstName
      lastName
      fullName
      email
      phone
      gender
      dateOfJoining
      designation
      department
      employmentType
      status
      shiftId
      shiftName
      gradeId
      gradeName
      monthlyGrossSalary
      bankAccountNumber
      bankName
      bankIfsc
      panNumber
      address
      emergencyContactName
      emergencyContactPhone
    }
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
    attendanceLogs(filter: { employeeId: $id }) {
      id
      date
      status
      workedHours
    }
    leaveRequests(filter: { employeeId: $id }) {
      id
      leaveTypeName
      startDate
      endDate
      totalDays
      status
    }
    loans(employeeId: $id) {
      id
      loanNumber
      principalAmount
      status
      outstandingAmount
    }
    payslips(employeeId: $id) {
      id
      payslipNumber
      month
      year
      netPay
      status
    }
  }
`;
const UPDATE_EMPLOYEE = gql`
  mutation UpdateEmployeeDetail($id: String!, $input: CreateEmployeeInput!) {
    updateEmployee(id: $id, input: $input) {
      id
    }
  }
`;
const UPDATE_STATUS = gql`
  mutation UpdateEmployeeStatusDetail($id: String!, $status: String!) {
    updateEmployeeStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;

const STATUS_OPTIONS = ["ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED", "RESIGNED"];

export default function EmployeeDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { leaving, goWithExit } = usePageTransition();
  const { data, loading, refetch } = useQuery<{
    employee: Employee | null;
    shifts: Shift[];
    grades: Grade[];
    departments: Department[];
    designations: Designation[];
    attendanceLogs: AttendanceLog[];
    leaveRequests: LeaveRequest[];
    loans: EmployeeLoan[];
    payslips: Payslip[];
  }>(EMPLOYEE_QUERY, { variables: { id }, skip: !id });
  const [updateEmployee] = useMutation(UPDATE_EMPLOYEE);
  const [updateStatus] = useMutation(UPDATE_STATUS);

  const employee = data?.employee;
  const shifts = data?.shifts ?? [];
  const grades = data?.grades ?? [];
  const departments = data?.departments ?? [];
  const designations = data?.designations ?? [];

  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (employee) {
      setForm({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone ?? "",
        designation: employee.designation,
        department: employee.department,
        employmentType: employee.employmentType,
        shiftId: employee.shiftId ?? "",
        gradeId: employee.gradeId ?? "",
        monthlyGrossSalary: String(employee.monthlyGrossSalary),
        bankAccountNumber: employee.bankAccountNumber ?? "",
        bankName: employee.bankName ?? "",
        bankIfsc: employee.bankIfsc ?? "",
        panNumber: employee.panNumber ?? "",
      });
    }
  }, [employee]);

  async function handleSave() {
    if (!employee) return;
    setSaving(true);
    try {
      await updateEmployee({
        variables: {
          id,
          input: {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone || undefined,
            dateOfJoining: employee.dateOfJoining,
            designation: form.designation,
            department: form.department,
            employmentType: form.employmentType,
            shiftId: form.shiftId || undefined,
            gradeId: form.gradeId || undefined,
            monthlyGrossSalary: Number(form.monthlyGrossSalary),
            bankAccountNumber: form.bankAccountNumber || undefined,
            bankName: form.bankName || undefined,
            bankIfsc: form.bankIfsc || undefined,
            panNumber: form.panNumber || undefined,
          },
        },
      });
      toast.success("Employee updated");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update employee");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(status: string) {
    try {
      await updateStatus({ variables: { id, status } });
      toast.success(`Status updated to ${status.replaceAll("_", " ")}`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  if (loading && !data) {
    return (
      <FormPage>
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64" />
        </div>
      </FormPage>
    );
  }
  if (!loading && !employee) {
    return (
      <FormPage>
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <Button variant="ghost" size="sm" onClick={() => goWithExit(EMPLOYEES_ROUTE)} className={cn("-ml-2 mb-1 gap-1.5 px-2 text-xs text-muted-foreground hover:bg-transparent", BUTTON_PRESS)}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Employee not found</h1>
        </div>
      </FormPage>
    );
  }

  return (
    <FormPage leaving={leaving}>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="space-y-3">
          <FormBreadcrumb items={[{ label: "HRMS", to: EMPLOYEES_ROUTE }, { label: "Employee Management", to: EMPLOYEES_ROUTE }, { label: employee!.fullName }]} onNavigate={goWithExit} />
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-primary">
                <IdCard className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">{employee!.fullName}</h1>
                  <StatusBadge status={employee!.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {employee!.employeeCode} · {employee!.designation} · {employee!.department}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={employee!.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="xs" onClick={() => goWithExit(EMPLOYEES_ROUTE)} className={cn("shrink-0", BUTTON_PRESS)}>
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="min-w-0 space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Employee details</CardTitle>
                <CardDescription>Update this employee's profile</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>First name</Label>
                    <Input value={form.firstName ?? ""} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={FOCUS_GLOW} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Last name</Label>
                    <Input value={form.lastName ?? ""} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className={FOCUS_GLOW} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className={FOCUS_GLOW} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={FOCUS_GLOW} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Designation</Label>
                    <Select value={form.designation ?? ""} onValueChange={(v) => setForm({ ...form, designation: v })}>
                      <SelectTrigger className={FOCUS_GLOW}>
                        <SelectValue placeholder="Select designation" />
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
                    <Label>Department</Label>
                    <Select value={form.department ?? ""} onValueChange={(v) => setForm({ ...form, department: v })}>
                      <SelectTrigger className={FOCUS_GLOW}>
                        <SelectValue placeholder="Select department" />
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
                    <Label>Shift</Label>
                    <Select value={form.shiftId ?? ""} onValueChange={(v) => setForm({ ...form, shiftId: v })}>
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
                    <Select value={form.gradeId ?? ""} onValueChange={(v) => setForm({ ...form, gradeId: v })}>
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
                  <div className="space-y-1.5">
                    <Label>Monthly gross salary</Label>
                    <Input
                      type="number"
                      value={form.monthlyGrossSalary ?? ""}
                      onChange={(e) => setForm({ ...form, monthlyGrossSalary: e.target.value })}
                      className={FOCUS_GLOW}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Bank name</Label>
                    <Input value={form.bankName ?? ""} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className={FOCUS_GLOW} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Bank account number</Label>
                    <Input value={form.bankAccountNumber ?? ""} onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })} className={FOCUS_GLOW} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>IFSC</Label>
                    <Input value={form.bankIfsc ?? ""} onChange={(e) => setForm({ ...form, bankIfsc: e.target.value })} className={FOCUS_GLOW} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>PAN</Label>
                    <Input value={form.panNumber ?? ""} onChange={(e) => setForm({ ...form, panNumber: e.target.value })} className={FOCUS_GLOW} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving} className={cn("gap-1.5", BUTTON_PRESS)}>
                    <Save className="h-4 w-4" />
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent attendance</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {(data?.attendanceLogs ?? []).length === 0 ? (
                  <p className="px-4 py-6 text-sm text-muted-foreground">No attendance records.</p>
                ) : (
                  <table className="w-full text-sm">
                    <tbody>
                      {(data?.attendanceLogs ?? []).slice(0, 10).map((l) => (
                        <tr key={l.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-2 text-muted-foreground">{fmtDate(l.date)}</td>
                          <td className="px-4 py-2">
                            <StatusBadge status={l.status} />
                          </td>
                          <td className="px-4 py-2 text-right text-muted-foreground">{l.workedHours ?? "—"} hrs</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="min-w-0 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Leave requests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(data?.leaveRequests ?? []).length === 0 ? (
                  <p className="text-muted-foreground">None yet.</p>
                ) : (
                  (data?.leaveRequests ?? []).slice(0, 5).map((r) => (
                    <div key={r.id} className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {r.leaveTypeName} ({r.totalDays}d)
                      </span>
                      <StatusBadge status={r.status} />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Loans</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(data?.loans ?? []).length === 0 ? (
                  <p className="text-muted-foreground">None yet.</p>
                ) : (
                  (data?.loans ?? []).map((l) => (
                    <div key={l.id} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{l.loanNumber}</span>
                      <span className="font-medium text-foreground">{inr(l.outstandingAmount)}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent payslips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(data?.payslips ?? []).length === 0 ? (
                  <p className="text-muted-foreground">None yet.</p>
                ) : (
                  (data?.payslips ?? []).slice(0, 5).map((p) => (
                    <div key={p.id} className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {p.month}/{p.year}
                      </span>
                      <span className="font-medium text-foreground">{inr(p.netPay)}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </FormPage>
  );
}
