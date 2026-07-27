import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { UsersService } from "./users.service";
import { UserModel } from "./models/user.model";
import { CreateUserInput, UpdateUserInput } from "./dto/create-user.input";

@Resolver(() => UserModel)
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UsersResolver {
  constructor(
    private readonly usersService: UsersService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [UserModel])
  users(@CurrentUser() actor: User) {
    return this.usersService.findAll(actor.organizationId);
  }

  @Mutation(() => UserModel)
  async createUser(@Args("input") input: CreateUserInput, @CurrentUser() actor: User) {
    const user = await this.usersService.create(input, actor.organizationId);
    await this.audit.logCreate(actor, "User", user.id, { email: user.email, name: user.name, role: user.role });
    return user;
  }

  @Mutation(() => UserModel)
  async updateUser(
    @Args("id") id: string,
    @Args("input") input: UpdateUserInput,
    @CurrentUser() actor: User,
  ) {
    const before = await this.usersService.findById(id, actor.organizationId);
    const user = await this.usersService.update(id, input, actor.organizationId);
    await this.audit.logUpdate(actor, "User", id, before, user);
    return user;
  }
}
