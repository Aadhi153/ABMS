import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { AssignEmployeeSalaryComponentInput, CreateSalaryComponentInput } from "./dto/salary-component.input";

const COMPONENT_INCLUDE = { _count: { select: { employeeSalaryComponents: true } } } as const;

function toComponentModel<T extends { value: unknown; _count: { employeeSalaryComponents: number } }>(row: T) {
  const { _count, ...rest } = row;
  return { ...rest, value: Number(row.value), assignedEmployeeCount: _count.employeeSalaryComponents };
}

function toAssignmentModel<
  T extends {
    employee: { firstName: string; lastName: string };
    salaryComponent: { name: string; type: string; calculationType: string };
    amount: unknown;
  },
>(row: T) {
  return {
    ...row,
    employeeName: `${row.employee.firstName} ${row.employee.lastName}`,
    salaryComponentName: row.salaryComponent.name,
    type: row.salaryComponent.type,
    calculationType: row.salaryComponent.calculationType,
    amount: row.amount === null || row.amount === undefined ? null : Number(row.amount),
  };
}

@Injectable()
export class SalaryComponentsService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll() {
    const rows = await this.prisma.salaryComponent.findMany({ include: COMPONENT_INCLUDE, orderBy: { name: "asc" } });
    return rows.map(toComponentModel);
  }

  async findById(id: string) {
    const row = await this.prisma.salaryComponent.findUnique({ where: { id }, include: COMPONENT_INCLUDE });
    return row ? toComponentModel(row) : null;
  }

  async create(input: CreateSalaryComponentInput, organizationId: string) {
    const row = await this.prisma.salaryComponent.create({
      data: {
        name: input.name,
        code: input.code,
        type: input.type,
        calculationType: input.calculationType,
        value: input.value,
        percentageOf: input.percentageOf,
        taxable: input.taxable,
        active: input.active,
        organizationId,
      },
      include: COMPONENT_INCLUDE,
    });
    return toComponentModel(row);
  }

  async update(id: string, input: CreateSalaryComponentInput) {
    const existing = await this.prisma.salaryComponent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Salary component not found");
    const row = await this.prisma.salaryComponent.update({
      where: { id },
      data: {
        name: input.name,
        code: input.code,
        type: input.type,
        calculationType: input.calculationType,
        value: input.value,
        percentageOf: input.percentageOf,
        taxable: input.taxable,
        active: input.active,
      },
      include: COMPONENT_INCLUDE,
    });
    return toComponentModel(row);
  }

  async delete(id: string) {
    const existing = await this.prisma.salaryComponent.findUnique({ where: { id }, include: COMPONENT_INCLUDE });
    if (!existing) throw new NotFoundException("Salary component not found");
    if (existing._count.employeeSalaryComponents > 0) {
      throw new BadRequestException("This salary component is assigned to employees and cannot be deleted");
    }
    const payslipUsage = await this.prisma.payslipComponent.count({ where: { salaryComponentId: id } });
    if (payslipUsage > 0) {
      throw new BadRequestException("This salary component has been used in payroll history and cannot be deleted — deactivate it instead");
    }
    await this.prisma.salaryComponent.delete({ where: { id } });
    return toComponentModel(existing);
  }

  // --- Per-employee assignments ---

  async findEmployeeComponents(employeeId: string) {
    const rows = await this.prisma.employeeSalaryComponent.findMany({
      where: { employeeId },
      include: { employee: true, salaryComponent: true },
      orderBy: { effectiveFrom: "desc" },
    });
    return rows.map(toAssignmentModel);
  }

  async assign(input: AssignEmployeeSalaryComponentInput) {
    const row = await this.prisma.employeeSalaryComponent.create({
      data: {
        employeeId: input.employeeId,
        salaryComponentId: input.salaryComponentId,
        amount: input.amount,
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo,
      },
      include: { employee: true, salaryComponent: true },
    });
    return toAssignmentModel(row);
  }

  async updateAssignment(id: string, input: AssignEmployeeSalaryComponentInput) {
    const existing = await this.prisma.employeeSalaryComponent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Assignment not found");
    const row = await this.prisma.employeeSalaryComponent.update({
      where: { id },
      data: { amount: input.amount, effectiveFrom: input.effectiveFrom, effectiveTo: input.effectiveTo },
      include: { employee: true, salaryComponent: true },
    });
    return toAssignmentModel(row);
  }

  async removeAssignment(id: string) {
    const existing = await this.prisma.employeeSalaryComponent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Assignment not found");
    await this.prisma.employeeSalaryComponent.delete({ where: { id } });
    return existing;
  }
}
