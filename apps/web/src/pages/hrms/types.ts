export interface EmployeeLite {
  id: string;
  employeeCode: string;
  fullName: string;
  department: string;
  designation: string;
  status: string;
  avatarUrl: string | null;
  dateOfJoining?: string;
}

export interface Employee {
  id: string;
  employeeCode: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  dateOfJoining: string;
  dateOfExit: string | null;
  designation: string;
  department: string;
  employmentType: string;
  status: string;
  reportingManagerId: string | null;
  reportingManagerName: string | null;
  shiftId: string | null;
  shiftName: string | null;
  shiftCode: string | null;
  gradeId: string | null;
  gradeName: string | null;
  branchId: string | null;
  branchName: string | null;
  biometricId: string | null;
  bloodGroup: string | null;
  maritalStatus: string | null;
  workHoursPerDay: string | null;
  fatherOrSpouseName: string | null;
  qualification: string | null;
  religion: string | null;
  temporaryAddress: string | null;
  aadharNumber: string | null;
  pfEligible: boolean;
  esiEligible: boolean;
  leaveWithPayEligible: boolean;
  dailyWagesEligible: boolean;
  uan: string | null;
  esiNumber: string | null;
  payMode: string;
  tdsType: string;
  tdsValue: number;
  monthlyGrossSalary: number;
  bankAccountNumber: string | null;
  bankName: string | null;
  bankIfsc: string | null;
  panNumber: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  experiences: EmployeeExperience[];
  avatarUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  active: boolean;
  employeeCount: number;
}

export interface EmployeeExperience {
  id: string;
  organizationName: string;
  startDate: string;
  endDate: string | null;
  ctc: number | null;
}

export interface EmployeeDocument {
  id: string;
  experienceId: string | null;
  category: string;
  label: string | null;
  fileName: string;
  createdAt: string;
}

export const MARITAL_STATUS_OPTIONS = ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"] as const;
export const PAY_MODE_OPTIONS = ["BANK", "CASH"] as const;
export const EMPLOYEE_DOCUMENT_CATEGORIES = ["AADHAR", "PAN", "BANK_PASSBOOK", "EXPERIENCE", "ADDITIONAL"] as const;

export interface Department {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  active: boolean;
  employeeCount: number;
}

export interface Designation {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  active: boolean;
  employeeCount: number;
}

export interface Grade {
  id: string;
  name: string;
  code: string | null;
  level: number | null;
  minSalary: number | null;
  maxSalary: number | null;
  promotionTenureMonths: number | null;
  description: string | null;
  active: boolean;
  employeeCount: number;
}

export interface Shift {
  id: string;
  name: string;
  code: string | null;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  gracePeriodMinutes: number;
  workingDays: string[];
  active: boolean;
  employeeCount: number;
}

export interface AttendanceLog {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  designation: string;
  branchId: string | null;
  branchName: string | null;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  workedHours: number | null;
  shiftId: string | null;
  shiftName: string | null;
  shiftCode: string | null;
  notes: string | null;
  markedByName: string | null;
}

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  description: string | null;
  color: string;
  defaultDaysPerYear: number;
  maxCarryForwardDays: number;
  accrualType: string;
  paid: boolean;
  isLOP: boolean;
  requiresApproval: boolean;
  encashable: boolean;
  applicableGender: string | null;
  restrictedDesignations: string[];
  restrictedEmployeeIds: string[];
  minServiceDays: number;
  minNoticeDays: number;
  maxConsecutiveDays: number;
  active: boolean;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string | null;
  leaveTypeId: string;
  leaveTypeName: string;
  year: number;
  allocatedDays: number;
  usedDays: number;
  carriedOverDays: number;
  remainingDays: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string | null;
  department: string | null;
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string | null;
  startDate: string;
  endDate: string;
  halfDay: boolean;
  totalDays: number;
  reason: string | null;
  status: string;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  type: string;
  description: string | null;
  paid: boolean;
}

export interface WeeklyOff {
  id: string;
  dayOfWeek: number;
}

export const LEAVE_TYPE_COLORS = ["#22c55e", "#3b82f6", "#f97316", "#ef4444", "#a855f7", "#ec4899", "#06b6d4", "#eab308", "#8b5cf6", "#64748b"];
export const HOLIDAY_TYPE_OPTIONS = ["PUBLIC", "COMPANY", "OPTIONAL", "RESTRICTED"] as const;
export const LEAVE_ACCRUAL_OPTIONS = ["ANNUAL", "MONTHLY", "QUARTERLY"] as const;
export const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface AllowanceDeductionEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  type: string;
  date: string;
  amount: number;
  paymentMode: string;
  remarks: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface AllowanceDeductionSummary {
  totalAllowances: number;
  totalDeductions: number;
  netAdjustment: number;
  totalRecords: number;
}

export interface SalaryComponent {
  id: string;
  name: string;
  code: string;
  type: string;
  calculationType: string;
  value: number;
  percentageOf: string;
  taxable: boolean;
  active: boolean;
  assignedEmployeeCount: number;
}

export interface EmployeeSalaryComponent {
  id: string;
  employeeId: string;
  employeeName: string;
  salaryComponentId: string;
  salaryComponentName: string;
  type: string;
  calculationType: string;
  amount: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  active: boolean;
}

export interface SalaryRevision {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string | null;
  employeeDepartment: string | null;
  revisionType: string;
  previousDesignation: string | null;
  newDesignation: string | null;
  previousGradeName: string | null;
  newGradeName: string | null;
  previousSalary: number;
  newSalary: number;
  incrementPct: number | null;
  effectiveDate: string;
  reason: string | null;
  status: string;
  approvedByName: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface PromotionRecommendation {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  currentDesignation: string;
  nextDesignation: string;
  tenureMonths: number;
  tenureRequiredMonths: number;
  currentPay: number;
  proposedMinBasic: number;
  eligible: boolean;
  reason: string | null;
}

export interface SalaryIncrementRow {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  currentBasic: number;
  currentDA: number;
  currentHRA: number;
  currentOtherAllowance: number;
}

export interface LoanRepayment {
  id: string;
  loanId: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  status: string;
  paidAt: string | null;
  payslipId: string | null;
}

export const LOAN_TYPE_OPTIONS = ["PERSONAL", "VEHICLE", "EDUCATION", "MEDICAL", "EMERGENCY", "HOUSING"] as const;

export interface EmployeeLoan {
  id: string;
  loanNumber: string;
  employeeId: string;
  employeeName: string;
  loanType: string;
  principalAmount: number;
  interestRatePct: number;
  tenureMonths: number;
  emiAmount: number;
  startDate: string;
  status: string;
  reason: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  outstandingAmount: number;
  repayments: LoanRepayment[];
  createdAt: string;
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  employeeName: string;
  reviewerId: string;
  reviewerName: string;
  reviewPeriodStart: string;
  reviewPeriodEnd: string;
  period: string;
  rating: number | null;
  selfScore: number | null;
  goals: string | null;
  achievements: string | null;
  areasOfImprovement: string | null;
  managerComments: string | null;
  employeeComments: string | null;
  status: string;
  submittedAt: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
}

export interface Incentive {
  id: string;
  employeeId: string;
  employeeName: string;
  type: string;
  source: string;
  appraisalId: string | null;
  appraisalPeriod: string | null;
  finalScore: number | null;
  title: string;
  amount: number;
  reason: string | null;
  awardDate: string;
  status: string;
  approvedByName: string | null;
  approvedAt: string | null;
  payslipId: string | null;
  createdAt: string;
}

export interface KpiTemplateTarget {
  id: string;
  kpiTemplateId: string;
  weightagePct: number;
  targetName: string;
  targetValueDefinition: string;
  incentiveName: string;
}

export interface KpiTemplate {
  id: string;
  title: string;
  description: string | null;
  department: string | null;
  designation: string | null;
  active: boolean;
  targets: KpiTemplateTarget[];
  createdAt: string;
  updatedAt: string;
}

export interface IncentiveMatrixRule {
  id: string;
  minScore: number;
  maxScore: number;
  bonusAmount: number;
  incrementPct: number | null;
  createdAt: string;
}

export interface PerformanceGoal {
  id: string;
  employeeId: string;
  employeeName: string;
  branchId: string | null;
  branchName: string | null;
  kpiTemplateId: string;
  kpiTemplateTitle: string;
  targetId: string | null;
  targetName: string | null;
  period: string;
  weightagePct: number;
  status: string;
  assignedByName: string;
  createdAt: string;
}

export interface PayslipComponent {
  id: string;
  name: string;
  type: string;
  amount: number;
}

export interface Payslip {
  id: string;
  payslipNumber: string;
  payrollRunId: string;
  month: number;
  year: number;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  daysPresent: number;
  daysOnLeave: number;
  status: string;
  generatedAt: string;
  paidAt: string | null;
  components: PayslipComponent[];
}

export interface PayrollRun {
  id: string;
  month: number;
  year: number;
  status: string;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  processedByName: string | null;
  processedAt: string | null;
  payslipCount: number;
  createdAt: string;
}

export interface DepartmentHeadcount {
  department: string;
  count: number;
}

export interface HrmsOverview {
  totalEmployees: number;
  activeEmployees: number;
  onLeaveToday: number;
  presentToday: number;
  absentToday: number;
  pendingLeaveRequests: number;
  pendingLoanApprovals: number;
  pendingSalaryRevisions: number;
  pendingIncentiveApprovals: number;
  upcomingPayrollRun: PayrollRun | null;
  headcountByDepartment: DepartmentHeadcount[];
  recentJoiners: EmployeeLite[];
  recentPayrollRuns: PayrollRun[];
}
