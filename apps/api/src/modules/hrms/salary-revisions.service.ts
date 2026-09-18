import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ApprovalStatus, CalculationType, EmployeeStatus, SalaryRevisionType } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateSalaryRevisionInput, SaveSalaryIncrementsInput } from "./dto/salary-revision.input";

const DEFAULT_PROMOTION_TENURE_MONTHS = 12;
const INCREMENT_COMPONENT_CODES = ["DA", "HRA", "OTHER"] as const;

const REVISION_INCLUDE = {
  employee: true,
  approvedBy: true,
  previousGrade: true,
  newGrade: true,
} as const;

function monthsBetween(from: Date, to: Date) {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(0, months);
}

function toModel<
  T extends {
    employee: { firstName: string; lastName: string; employeeCode: string; department: string };
    approvedBy: { name: string } | null;
    previousGrade: { name: string } | null;
    newGrade: { name: string } | null;
    previousSalary: unknown;
    newSalary: unknown;
    incrementPct: unknown;
  },
>(row: T) {
  return {
    ...row,
    employeeName: `${row.employee.firstName} ${row.employee.lastName}`,
    employeeCode: row.employee.employeeCode,
    employeeDepartment: row.employee.department,
    approvedByName: row.approvedBy?.name ?? null,
    previousGradeName: row.previousGrade?.name ?? null,
    newGradeName: row.newGrade?.name ?? null,
    previousSalary: Number(row.previousSalary),
    newSalary: Number(row.newSalary),
    incrementPct: row.incrementPct === null || row.incrementPct === undefined ? null : Number(row.incrementPct),
  };
}

@Injectable()
export class SalaryRevisionsService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll(filter?: { employeeId?: string; status?: string; revisionType?: string }) {
    const rows = await this.prisma.salaryRevision.findMany({
      where: {
        ...(filter?.employeeId ? { employeeId: filter.employeeId } : {}),
        ...(filter?.status ? { status: filter.status as never } : {}),
        ...(filter?.revisionType ? { revisionType: filter.revisionType as never } : {}),
      },
      include: REVISION_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.salaryRevision.findUnique({ where: { id }, include: REVISION_INCLUDE });
    return row ? toModel(row) : null;
  }

  async create(input: CreateSalaryRevisionInput, organizationId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: input.employeeId } });
    if (!employee) throw new NotFoundException("Employee not found");
    const previousSalary = Number(employee.monthlyGrossSalary);
    const incrementPct = previousSalary > 0 ? Math.round(((input.newSalary - previousSalary) / previousSalary) * 10000) / 100 : null;
    const isPromotion = !!input.newDesignation && input.newDesignation !== employee.designation;
    const row = await this.prisma.salaryRevision.create({
      data: {
        organizationId,
        employeeId: input.employeeId,
        revisionType: isPromotion ? SalaryRevisionType.PROMOTION : SalaryRevisionType.INCREMENT,
        previousDesignation: employee.designation,
        newDesignation: input.newDesignation,
        previousSalary,
        newSalary: input.newSalary,
        incrementPct,
        effectiveDate: input.effectiveDate,
        reason: input.reason,
        status: ApprovalStatus.PENDING,
      },
      include: REVISION_INCLUDE,
    });
    return toModel(row);
  }

  async approve(id: string, approverId: string) {
    const existing = await this.prisma.salaryRevision.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Salary revision not found");
    if (existing.status !== ApprovalStatus.PENDING) throw new BadRequestException("Only pending revisions can be approved");
    const [row] = await this.prisma.$transaction([
      this.prisma.salaryRevision.update({
        where: { id },
        data: { status: ApprovalStatus.APPROVED, approvedById: approverId, approvedAt: new Date() },
        include: REVISION_INCLUDE,
      }),
      this.prisma.employee.update({
        where: { id: existing.employeeId },
        data: {
          monthlyGrossSalary: existing.newSalary,
          designation: existing.newDesignation ?? undefined,
        },
      }),
    ]);
    return toModel(row);
  }

  async reject(id: string, approverId: string) {
    const existing = await this.prisma.salaryRevision.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Salary revision not found");
    if (existing.status !== ApprovalStatus.PENDING) throw new BadRequestException("Only pending revisions can be rejected");
    const row = await this.prisma.salaryRevision.update({
      where: { id },
      data: { status: ApprovalStatus.REJECTED, approvedById: approverId, approvedAt: new Date() },
      include: REVISION_INCLUDE,
    });
    return toModel(row);
  }

  async delete(id: string) {
    const existing = await this.prisma.salaryRevision.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Salary revision not found");
    if (existing.status !== ApprovalStatus.PENDING) throw new BadRequestException("Only pending revisions can be deleted");
    await this.prisma.salaryRevision.delete({ where: { id } });
    return existing;
  }

  // --- Promotion eligibility ---

  async getPromotionRecommendations() {
    const [employees, grades] = await Promise.all([
      this.prisma.employee.findMany({ where: { status: EmployeeStatus.ACTIVE }, include: { grade: true } }),
      this.prisma.grade.findMany({ where: { active: true } }),
    ]);
    if (employees.length === 0) return [];

    const lastPromotions = await this.prisma.salaryRevision.findMany({
      where: {
        revisionType: SalaryRevisionType.PROMOTION,
        status: ApprovalStatus.APPROVED,
        employeeId: { in: employees.map((e) => e.id) },
      },
      orderBy: { effectiveDate: "desc" },
    });
    const lastPromotionByEmployee = new Map<string, Date>();
    for (const p of lastPromotions) {
      if (!lastPromotionByEmployee.has(p.employeeId)) lastPromotionByEmployee.set(p.employeeId, p.effectiveDate);
    }

    const now = new Date();
    return employees.map((employee) => {
      const currentGrade = employee.grade;
      const nextGrade =
        currentGrade?.level != null ? grades.find((g) => g.level != null && g.level === currentGrade.level! + 1) ?? null : null;
      const tenureRequiredMonths = currentGrade?.promotionTenureMonths ?? DEFAULT_PROMOTION_TENURE_MONTHS;
      const tenureStart = lastPromotionByEmployee.get(employee.id) ?? employee.dateOfJoining;
      const tenureMonths = monthsBetween(new Date(tenureStart), now);
      const currentPay = Number(employee.monthlyGrossSalary);
      const proposedMinBasic = nextGrade?.minSalary != null ? Number(nextGrade.minSalary) : currentGrade?.minSalary != null ? Number(currentGrade.minSalary) : 0;
      const eligible = !!nextGrade && tenureMonths >= tenureRequiredMonths;
      const reason = !nextGrade
        ? "No higher grade configured for this employee's current grade"
        : eligible
          ? null
          : `Tenure of ${tenureMonths}/${tenureRequiredMonths} months not yet completed`;

      return {
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        currentDesignation: employee.designation,
        nextDesignation: nextGrade?.name ?? currentGrade?.name ?? employee.designation,
        tenureMonths,
        tenureRequiredMonths,
        currentPay,
        proposedMinBasic,
        eligible,
        reason,
      };
    });
  }

  async promoteEmployee(employeeId: string, actorId: string, organizationId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId }, include: { grade: true } });
    if (!employee) throw new NotFoundException("Employee not found");
    if (!employee.grade || employee.grade.level == null) throw new BadRequestException("This employee has no grade with a configured level");

    const nextGrade = await this.prisma.grade.findFirst({ where: { active: true, level: employee.grade.level + 1 } });
    if (!nextGrade) throw new BadRequestException("No higher grade is configured above this employee's current grade");

    const tenureRequiredMonths = employee.grade.promotionTenureMonths ?? DEFAULT_PROMOTION_TENURE_MONTHS;
    const lastPromotion = await this.prisma.salaryRevision.findFirst({
      where: { employeeId, revisionType: SalaryRevisionType.PROMOTION, status: ApprovalStatus.APPROVED },
      orderBy: { effectiveDate: "desc" },
    });
    const tenureStart = lastPromotion?.effectiveDate ?? employee.dateOfJoining;
    const tenureMonths = monthsBetween(new Date(tenureStart), new Date());
    if (tenureMonths < tenureRequiredMonths) {
      throw new BadRequestException(`Tenure of ${tenureMonths}/${tenureRequiredMonths} months not yet completed`);
    }

    const previousSalary = Number(employee.monthlyGrossSalary);
    const proposedMinBasic = nextGrade.minSalary != null ? Number(nextGrade.minSalary) : previousSalary;
    const newSalary = Math.max(previousSalary, proposedMinBasic);
    const incrementPct = previousSalary > 0 ? Math.round(((newSalary - previousSalary) / previousSalary) * 10000) / 100 : null;
    const now = new Date();

    const [revision] = await this.prisma.$transaction([
      this.prisma.salaryRevision.create({
        data: {
          organizationId,
          employeeId,
          revisionType: SalaryRevisionType.PROMOTION,
          previousDesignation: employee.designation,
          newDesignation: nextGrade.name,
          previousGradeId: employee.gradeId,
          newGradeId: nextGrade.id,
          previousSalary,
          newSalary,
          incrementPct,
          effectiveDate: now,
          reason: "Promotion approved from eligibility recommendation",
          status: ApprovalStatus.APPROVED,
          approvedById: actorId,
          approvedAt: now,
        },
        include: REVISION_INCLUDE,
      }),
      this.prisma.employee.update({
        where: { id: employeeId },
        data: { designation: nextGrade.name, gradeId: nextGrade.id, monthlyGrossSalary: newSalary },
      }),
    ]);
    return toModel(revision);
  }

  // --- Bulk salary increment ---

  async getSalaryIncrementRows(filter?: { branchId?: string; department?: string; search?: string }) {
    const search = filter?.search?.trim();
    const employees = await this.prisma.employee.findMany({
      where: {
        status: EmployeeStatus.ACTIVE,
        ...(filter?.branchId ? { branchId: filter.branchId } : {}),
        ...(filter?.department ? { department: filter.department } : {}),
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { employeeCode: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { employeeCode: "asc" },
    });
    if (employees.length === 0) return [];

    const { resolveAmount } = await this.buildComponentResolver(employees.map((e) => e.id));

    return employees.map((e) => {
      const basic = Number(e.monthlyGrossSalary);
      return {
        employeeId: e.id,
        employeeCode: e.employeeCode,
        employeeName: `${e.firstName} ${e.lastName}`,
        department: e.department,
        currentBasic: basic,
        currentDA: resolveAmount(e.id, basic, "DA"),
        currentHRA: resolveAmount(e.id, basic, "HRA"),
        currentOtherAllowance: resolveAmount(e.id, basic, "OTHER"),
      };
    });
  }

  private async buildComponentResolver(employeeIds: string[]) {
    const components = await this.prisma.salaryComponent.findMany({ where: { code: { in: [...INCREMENT_COMPONENT_CODES] } } });
    const componentByCode = new Map(components.map((c) => [c.code, c]));
    const componentIds = components.map((c) => c.id);
    const assignments = componentIds.length
      ? await this.prisma.employeeSalaryComponent.findMany({
          where: { employeeId: { in: employeeIds }, salaryComponentId: { in: componentIds }, active: true },
        })
      : [];
    const assignmentByKey = new Map(assignments.map((a) => [`${a.employeeId}:${a.salaryComponentId}`, a]));

    const resolveAmount = (employeeId: string, basic: number, code: string) => {
      const component = componentByCode.get(code);
      if (!component) return 0;
      const assignment = assignmentByKey.get(`${employeeId}:${component.id}`);
      if (assignment?.amount != null) return Number(assignment.amount);
      return component.calculationType === CalculationType.PERCENTAGE
        ? Math.round(basic * (Number(component.value) / 100) * 100) / 100
        : Number(component.value);
    };

    return { componentByCode, resolveAmount };
  }

  async saveSalaryIncrements(input: SaveSalaryIncrementsInput, actorId: string, organizationId: string) {
    const components = await this.prisma.salaryComponent.findMany({ where: { code: { in: [...INCREMENT_COMPONENT_CODES] } } });
    const componentByCode = new Map(components.map((c) => [c.code, c]));

    let updatedCount = 0;
    for (const row of input.rows) {
      const employee = await this.prisma.employee.findUnique({ where: { id: row.employeeId } });
      if (!employee) continue;

      const previousSalary = Number(employee.monthlyGrossSalary);
      const incrementPct = previousSalary > 0 ? Math.round(((row.newBasic - previousSalary) / previousSalary) * 10000) / 100 : null;

      await this.prisma.$transaction([
        this.prisma.salaryRevision.create({
          data: {
            organizationId,
            employeeId: row.employeeId,
            revisionType: SalaryRevisionType.INCREMENT,
            previousDesignation: employee.designation,
            newDesignation: employee.designation,
            previousSalary,
            newSalary: row.newBasic,
            incrementPct,
            effectiveDate: input.effectiveDate,
            reason: "Bulk salary increment",
            status: ApprovalStatus.APPROVED,
            approvedById: actorId,
            approvedAt: new Date(),
          },
        }),
        this.prisma.employee.update({ where: { id: row.employeeId }, data: { monthlyGrossSalary: row.newBasic } }),
      ]);

      await this.applyComponentOverride(row.employeeId, componentByCode.get("DA"), row.newDA);
      await this.applyComponentOverride(row.employeeId, componentByCode.get("HRA"), row.newHRA);
      await this.applyComponentOverride(row.employeeId, componentByCode.get("OTHER"), row.newOtherAllowance);
      updatedCount++;
    }
    return updatedCount;
  }

  private async applyComponentOverride(employeeId: string, component: { id: string } | undefined, amount: number) {
    if (!component) return;
    const existing = await this.prisma.employeeSalaryComponent.findFirst({
      where: { employeeId, salaryComponentId: component.id, active: true },
    });
    if (existing) {
      if (existing.amount !== null && Number(existing.amount) === amount) return;
      await this.prisma.employeeSalaryComponent.update({ where: { id: existing.id }, data: { amount } });
    } else {
      await this.prisma.employeeSalaryComponent.create({
        data: { employeeId, salaryComponentId: component.id, amount, effectiveFrom: new Date(), isMonthly: true, active: true },
      });
    }
  }
}
