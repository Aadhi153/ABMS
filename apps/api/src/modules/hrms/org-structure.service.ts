import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateDepartmentInput, CreateDesignationInput, CreateGradeInput } from "./dto/org-structure.input";

@Injectable()
export class OrgStructureService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  // --- Departments ---

  async findDepartments() {
    const rows = await this.prisma.department.findMany({ orderBy: { name: "asc" } });
    return Promise.all(rows.map(async (d) => ({ ...d, employeeCount: await this.prisma.employee.count({ where: { department: d.name } }) })));
  }

  async createDepartment(input: CreateDepartmentInput, organizationId: string) {
    const row = await this.prisma.department.create({
      data: { name: input.name, code: input.code, description: input.description, active: input.active, organizationId },
    });
    return { ...row, employeeCount: 0 };
  }

  async updateDepartment(id: string, input: CreateDepartmentInput) {
    const existing = await this.prisma.department.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Department not found");
    const row = await this.prisma.department.update({
      where: { id },
      data: { name: input.name, code: input.code, description: input.description, active: input.active },
    });
    const employeeCount = await this.prisma.employee.count({ where: { department: row.name } });
    return { ...row, employeeCount };
  }

  async deleteDepartment(id: string) {
    const existing = await this.prisma.department.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Department not found");
    const employeeCount = await this.prisma.employee.count({ where: { department: existing.name } });
    if (employeeCount > 0) throw new BadRequestException("This department has employees assigned to it and cannot be deleted");
    await this.prisma.department.delete({ where: { id } });
    return { ...existing, employeeCount: 0 };
  }

  // --- Designations ---

  async findDesignations() {
    const rows = await this.prisma.designation.findMany({ orderBy: { name: "asc" } });
    return Promise.all(rows.map(async (d) => ({ ...d, employeeCount: await this.prisma.employee.count({ where: { designation: d.name } }) })));
  }

  async createDesignation(input: CreateDesignationInput, organizationId: string) {
    const row = await this.prisma.designation.create({
      data: { name: input.name, code: input.code, description: input.description, active: input.active, organizationId },
    });
    return { ...row, employeeCount: 0 };
  }

  async updateDesignation(id: string, input: CreateDesignationInput) {
    const existing = await this.prisma.designation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Designation not found");
    const row = await this.prisma.designation.update({
      where: { id },
      data: { name: input.name, code: input.code, description: input.description, active: input.active },
    });
    const employeeCount = await this.prisma.employee.count({ where: { designation: row.name } });
    return { ...row, employeeCount };
  }

  async deleteDesignation(id: string) {
    const existing = await this.prisma.designation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Designation not found");
    const employeeCount = await this.prisma.employee.count({ where: { designation: existing.name } });
    if (employeeCount > 0) throw new BadRequestException("This designation has employees assigned to it and cannot be deleted");
    await this.prisma.designation.delete({ where: { id } });
    return { ...existing, employeeCount: 0 };
  }

  // --- Grades ---

  private async toGradeModel<T extends { id: string; minSalary: unknown; maxSalary: unknown }>(row: T) {
    const employeeCount = await this.prisma.employee.count({ where: { gradeId: row.id } });
    return {
      ...row,
      minSalary: row.minSalary === null || row.minSalary === undefined ? null : Number(row.minSalary),
      maxSalary: row.maxSalary === null || row.maxSalary === undefined ? null : Number(row.maxSalary),
      employeeCount,
    };
  }

  async findGrades() {
    const rows = await this.prisma.grade.findMany({ orderBy: [{ level: "asc" }, { name: "asc" }] });
    return Promise.all(rows.map((r) => this.toGradeModel(r)));
  }

  async createGrade(input: CreateGradeInput, organizationId: string) {
    const row = await this.prisma.grade.create({
      data: {
        name: input.name,
        code: input.code,
        level: input.level,
        minSalary: input.minSalary,
        maxSalary: input.maxSalary,
        description: input.description,
        active: input.active,
        organizationId,
      },
    });
    return this.toGradeModel(row);
  }

  async updateGrade(id: string, input: CreateGradeInput) {
    const existing = await this.prisma.grade.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Grade not found");
    const row = await this.prisma.grade.update({
      where: { id },
      data: {
        name: input.name,
        code: input.code,
        level: input.level,
        minSalary: input.minSalary,
        maxSalary: input.maxSalary,
        description: input.description,
        active: input.active,
      },
    });
    return this.toGradeModel(row);
  }

  async deleteGrade(id: string) {
    const existing = await this.prisma.grade.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Grade not found");
    const employeeCount = await this.prisma.employee.count({ where: { gradeId: id } });
    if (employeeCount > 0) throw new BadRequestException("This grade has employees assigned to it and cannot be deleted");
    await this.prisma.grade.delete({ where: { id } });
    return this.toGradeModel(existing);
  }
}
