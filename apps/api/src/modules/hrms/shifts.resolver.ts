import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { ShiftsService } from "./shifts.service";
import { ShiftModel } from "./models/shift.model";
import { CreateShiftInput } from "./dto/shift.input";

@Resolver(() => ShiftModel)
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ShiftsResolver {
  constructor(
    private readonly shiftsService: ShiftsService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [ShiftModel])
  shifts() {
    return this.shiftsService.findAll();
  }

  @Query(() => ShiftModel, { nullable: true })
  shift(@Args("id") id: string) {
    return this.shiftsService.findById(id);
  }

  @Mutation(() => ShiftModel)
  async createShift(@Args("input") input: CreateShiftInput, @CurrentUser() actor: User) {
    const shift = await this.shiftsService.create(input, actor.organizationId);
    await this.audit.logCreate(actor, "Shift", shift.id, shift);
    return shift;
  }

  @Mutation(() => ShiftModel)
  async updateShift(@Args("id") id: string, @Args("input") input: CreateShiftInput, @CurrentUser() actor: User) {
    const before = await this.shiftsService.findById(id);
    const shift = await this.shiftsService.update(id, input);
    await this.audit.logUpdate(actor, "Shift", id, before, shift);
    return shift;
  }

  @Mutation(() => Boolean)
  async deleteShift(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.shiftsService.delete(id);
    await this.audit.logDelete(actor, "Shift", id, deleted);
    return true;
  }
}
