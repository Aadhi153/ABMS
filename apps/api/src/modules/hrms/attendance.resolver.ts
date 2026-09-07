import { UseGuards } from "@nestjs/common";
import { Args, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { AttendanceService } from "./attendance.service";
import { AttendanceLogModel, AttendanceSummaryModel } from "./models/attendance.model";
import { AttendanceFilterInput, BulkMarkAttendanceInput, MarkAttendanceInput } from "./dto/attendance.input";

@Resolver(() => AttendanceLogModel)
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AttendanceResolver {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [AttendanceLogModel])
  attendanceLogs(@Args("filter", { nullable: true }) filter?: AttendanceFilterInput) {
    return this.attendanceService.findAll(filter);
  }

  @Query(() => AttendanceLogModel, { nullable: true })
  attendanceLog(@Args("id") id: string) {
    return this.attendanceService.findById(id);
  }

  @Query(() => [AttendanceSummaryModel])
  attendanceSummary(@Args("month", { type: () => Int }) month: number, @Args("year", { type: () => Int }) year: number) {
    return this.attendanceService.summary(month, year);
  }

  @Mutation(() => AttendanceLogModel)
  async checkIn(@Args("employeeId") employeeId: string, @CurrentUser() actor: User) {
    return this.attendanceService.checkIn(employeeId, actor.organizationId);
  }

  @Mutation(() => AttendanceLogModel)
  async checkOut(@Args("employeeId") employeeId: string, @CurrentUser() actor: User) {
    return this.attendanceService.checkOut(employeeId, actor.organizationId);
  }

  @Mutation(() => AttendanceLogModel)
  async markAttendance(@Args("input") input: MarkAttendanceInput, @CurrentUser() actor: User) {
    const row = await this.attendanceService.markAttendance(input, actor.organizationId, actor.id);
    await this.audit.logCreate(actor, "AttendanceLog", row.id, row);
    return row;
  }

  @Mutation(() => [AttendanceLogModel])
  async bulkMarkAttendance(@Args("input") input: BulkMarkAttendanceInput, @CurrentUser() actor: User) {
    return this.attendanceService.bulkMarkAttendance(input, actor.organizationId, actor.id);
  }

  @Mutation(() => Boolean)
  async deleteAttendanceLog(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.attendanceService.delete(id);
    await this.audit.logDelete(actor, "AttendanceLog", id, deleted);
    return true;
  }
}
