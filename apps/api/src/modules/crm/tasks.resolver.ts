import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { TasksService } from "./tasks.service";
import { TaskModel } from "./models/task.model";
import { CreateTaskInput, UpdateTaskInput } from "./dto/task.input";

@Resolver(() => TaskModel)
@UseGuards(SessionAuthGuard, RolesGuard)
export class TasksResolver {
  constructor(
    private readonly tasksService: TasksService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [TaskModel])
  crmTasks() {
    return this.tasksService.findAll();
  }

  @Mutation(() => TaskModel)
  @Roles(Role.ADMIN, Role.SALES)
  async createTask(@Args("input") input: CreateTaskInput, @CurrentUser() actor: User) {
    const task = await this.tasksService.create(input, actor.id, actor.organizationId);
    await this.audit.logCreate(actor, "Task", task.id, task);
    return task;
  }

  @Mutation(() => TaskModel)
  @Roles(Role.ADMIN, Role.SALES)
  async updateTask(@Args("id") id: string, @Args("input") input: UpdateTaskInput, @CurrentUser() actor: User) {
    const task = await this.tasksService.update(id, input);
    await this.audit.logUpdate(actor, "Task", id, null, task);
    return task;
  }

  @Mutation(() => Boolean)
  @Roles(Role.ADMIN, Role.SALES)
  async deleteTask(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.tasksService.delete(id);
    await this.audit.logDelete(actor, "Task", id, deleted);
    return true;
  }
}
