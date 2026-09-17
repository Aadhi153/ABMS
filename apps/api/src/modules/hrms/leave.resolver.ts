import { UseGuards } from "@nestjs/common";
import { Args, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { LeaveService } from "./leave.service";
import { HolidayModel, LeaveBalanceModel, LeaveRequestModel, LeaveTypeModel, WeeklyOffModel } from "./models/leave.model";
import {
  AdjustLeaveBalanceInput,
  BulkAllocateLeaveBalanceInput,
  CreateHolidayInput,
  CreateLeaveRequestInput,
  CreateLeaveTypeInput,
  HolidayFilterInput,
  LeaveRequestFilterInput,
  RecordLeaveEntryInput,
  SetWeeklyOffsInput,
} from "./dto/leave.input";

@Resolver(() => LeaveRequestModel)
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class LeaveResolver {
  constructor(
    private readonly leaveService: LeaveService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [LeaveTypeModel])
  leaveTypes() {
    return this.leaveService.findLeaveTypes();
  }

  @Query(() => [LeaveBalanceModel])
  leaveBalances(
    @Args("employeeId", { nullable: true }) employeeId?: string,
    @Args("year", { type: () => Int, nullable: true }) year?: number,
    @Args("department", { nullable: true }) department?: string,
  ) {
    return this.leaveService.findLeaveBalances(employeeId, year, department);
  }

  @Query(() => [LeaveRequestModel])
  leaveRequests(@Args("filter", { nullable: true }) filter?: LeaveRequestFilterInput) {
    return this.leaveService.findLeaveRequests(filter);
  }

  @Query(() => LeaveRequestModel, { nullable: true })
  leaveRequest(@Args("id") id: string) {
    return this.leaveService.findLeaveRequestById(id);
  }

  @Query(() => [HolidayModel])
  holidays(@Args("filter", { nullable: true }) filter?: HolidayFilterInput) {
    return this.leaveService.findHolidays(filter);
  }

  @Query(() => [WeeklyOffModel])
  weeklyOffs() {
    return this.leaveService.findWeeklyOffs();
  }

  @Mutation(() => LeaveTypeModel)
  async createLeaveType(@Args("input") input: CreateLeaveTypeInput, @CurrentUser() actor: User) {
    const leaveType = await this.leaveService.createLeaveType(input, actor.organizationId);
    await this.audit.logCreate(actor, "LeaveType", leaveType.id, leaveType);
    return leaveType;
  }

  @Mutation(() => LeaveTypeModel)
  async updateLeaveType(@Args("id") id: string, @Args("input") input: CreateLeaveTypeInput, @CurrentUser() actor: User) {
    const leaveType = await this.leaveService.updateLeaveType(id, input);
    await this.audit.logUpdate(actor, "LeaveType", id, null, leaveType);
    return leaveType;
  }

  @Mutation(() => Boolean)
  async deleteLeaveType(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.leaveService.deleteLeaveType(id);
    await this.audit.logDelete(actor, "LeaveType", id, deleted);
    return true;
  }

  @Mutation(() => LeaveBalanceModel)
  adjustLeaveBalance(@Args("input") input: AdjustLeaveBalanceInput, @CurrentUser() actor: User) {
    return this.leaveService.adjustLeaveBalance(input, actor.organizationId);
  }

  @Mutation(() => Int)
  async bulkAllocateLeaveBalance(@Args("input") input: BulkAllocateLeaveBalanceInput, @CurrentUser() actor: User) {
    const count = await this.leaveService.bulkAllocateLeaveBalance(input, actor.organizationId);
    await this.audit.logCreate(actor, "LeaveBalance", input.leaveTypeId, { bulkAllocated: count, ...input });
    return count;
  }

  @Mutation(() => LeaveRequestModel)
  async createLeaveRequest(@Args("input") input: CreateLeaveRequestInput, @CurrentUser() actor: User) {
    const request = await this.leaveService.createLeaveRequest(input, actor.organizationId);
    await this.audit.logCreate(actor, "LeaveRequest", request.id, request);
    return request;
  }

  @Mutation(() => LeaveRequestModel)
  async recordLeaveEntry(@Args("input") input: RecordLeaveEntryInput, @CurrentUser() actor: User) {
    const request = await this.leaveService.recordLeaveEntry(input, actor.organizationId, actor.id);
    await this.audit.logCreate(actor, "LeaveRequest", request.id, request);
    return request;
  }

  @Mutation(() => LeaveRequestModel)
  async updateLeaveRequest(@Args("id") id: string, @Args("input") input: CreateLeaveRequestInput, @CurrentUser() actor: User) {
    const before = await this.leaveService.findLeaveRequestById(id);
    const request = await this.leaveService.updateLeaveRequest(id, input);
    await this.audit.logUpdate(actor, "LeaveRequest", id, before, request);
    return request;
  }

  @Mutation(() => LeaveRequestModel)
  async approveLeaveRequest(@Args("id") id: string, @CurrentUser() actor: User) {
    const before = await this.leaveService.findLeaveRequestById(id);
    const request = await this.leaveService.approveLeaveRequest(id, actor.id);
    await this.audit.logUpdate(actor, "LeaveRequest", id, before, request);
    return request;
  }

  @Mutation(() => LeaveRequestModel)
  async rejectLeaveRequest(@Args("id") id: string, @Args("reason") reason: string, @CurrentUser() actor: User) {
    const before = await this.leaveService.findLeaveRequestById(id);
    const request = await this.leaveService.rejectLeaveRequest(id, reason, actor.id);
    await this.audit.logUpdate(actor, "LeaveRequest", id, before, request);
    return request;
  }

  @Mutation(() => LeaveRequestModel)
  async cancelLeaveRequest(@Args("id") id: string, @CurrentUser() actor: User) {
    const before = await this.leaveService.findLeaveRequestById(id);
    const request = await this.leaveService.cancelLeaveRequest(id);
    await this.audit.logUpdate(actor, "LeaveRequest", id, before, request);
    return request;
  }

  @Mutation(() => Boolean)
  async deleteLeaveRequest(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.leaveService.deleteLeaveRequest(id);
    await this.audit.logDelete(actor, "LeaveRequest", id, deleted);
    return true;
  }

  @Mutation(() => HolidayModel)
  async createHoliday(@Args("input") input: CreateHolidayInput, @CurrentUser() actor: User) {
    const holiday = await this.leaveService.createHoliday(input, actor.organizationId);
    await this.audit.logCreate(actor, "Holiday", holiday.id, holiday);
    return holiday;
  }

  @Mutation(() => HolidayModel)
  async updateHoliday(@Args("id") id: string, @Args("input") input: CreateHolidayInput, @CurrentUser() actor: User) {
    const holiday = await this.leaveService.updateHoliday(id, input);
    await this.audit.logUpdate(actor, "Holiday", id, null, holiday);
    return holiday;
  }

  @Mutation(() => Boolean)
  async deleteHoliday(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.leaveService.deleteHoliday(id);
    await this.audit.logDelete(actor, "Holiday", id, deleted);
    return true;
  }

  @Mutation(() => [WeeklyOffModel])
  async setWeeklyOffs(@Args("input") input: SetWeeklyOffsInput, @CurrentUser() actor: User) {
    const offs = await this.leaveService.setWeeklyOffs(input, actor.organizationId);
    await this.audit.logUpdate(actor, "WeeklyOff", actor.organizationId, null, offs);
    return offs;
  }
}
