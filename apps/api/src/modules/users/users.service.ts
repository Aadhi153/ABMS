import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { CreateUserInput, UpdateUserInput } from "./dto/create-user.input";

/**
 * Uses the raw (unscoped) PrismaService, not ScopedPrismaClient: findByEmail is
 * called from AuthService.login() before any session/tenant context exists, so
 * it must stay a global lookup. Admin-facing methods (findAll/create/update)
 * scope manually by organizationId instead of relying on the auto-scoping
 * extension, since a single service can't mix both.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.user.findMany({ where: { organizationId }, orderBy: { createdAt: "asc" } });
  }

  async findById(id: string, organizationId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user && user.organizationId === organizationId ? user : null;
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(input: CreateUserInput, organizationId: string) {
    const existing = await this.findByEmail(input.email);
    if (existing) throw new ConflictException("A user with this email already exists");

    const passwordHash = await bcrypt.hash(input.password, 10);
    return this.prisma.user.create({
      data: { email: input.email, name: input.name, role: input.role, passwordHash, organizationId },
    });
  }

  async update(id: string, input: UpdateUserInput, organizationId: string) {
    const existing = await this.findById(id, organizationId);
    if (!existing) throw new NotFoundException("User not found");
    return this.prisma.user.update({ where: { id }, data: input });
  }
}
