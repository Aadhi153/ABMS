import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { CategoriesService } from "./categories.service";
import { CategoryModel } from "./models/category.model";
import { CreateCategoryInput, UpdateCategoryInput } from "./dto/category.input";

@Resolver(() => CategoryModel)
@UseGuards(SessionAuthGuard, RolesGuard)
export class CategoriesResolver {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [CategoryModel])
  categories() {
    return this.categoriesService.findAll();
  }

  @Mutation(() => CategoryModel)
  @Roles(Role.ADMIN, Role.PURCHASE)
  async createCategory(@Args("input") input: CreateCategoryInput, @CurrentUser() actor: User) {
    const category = await this.categoriesService.create(input, actor.organizationId);
    await this.audit.logCreate(actor, "Category", category.id, category);
    return category;
  }

  @Mutation(() => CategoryModel)
  @Roles(Role.ADMIN, Role.PURCHASE)
  async updateCategory(@Args("id") id: string, @Args("input") input: UpdateCategoryInput, @CurrentUser() actor: User) {
    const before = await this.categoriesService.findById(id);
    const category = await this.categoriesService.update(id, input);
    await this.audit.logUpdate(actor, "Category", id, before, category);
    return category;
  }

  @Mutation(() => Boolean)
  @Roles(Role.ADMIN, Role.PURCHASE)
  async deleteCategory(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.categoriesService.delete(id);
    await this.audit.logDelete(actor, "Category", id, deleted);
    return true;
  }
}
