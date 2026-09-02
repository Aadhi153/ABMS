import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { BrandsService } from "./brands.service";
import { BrandModel } from "./models/brand.model";
import { CreateBrandInput, UpdateBrandInput } from "./dto/brand.input";

@Resolver(() => BrandModel)
@UseGuards(SessionAuthGuard, RolesGuard)
export class BrandsResolver {
  constructor(
    private readonly brandsService: BrandsService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [BrandModel])
  brands() {
    return this.brandsService.findAll();
  }

  @Query(() => BrandModel, { nullable: true })
  brand(@Args("id") id: string) {
    return this.brandsService.findById(id);
  }

  @Mutation(() => BrandModel)
  @Roles(Role.ADMIN, Role.PURCHASE)
  async createBrand(@Args("input") input: CreateBrandInput, @CurrentUser() actor: User) {
    const brand = await this.brandsService.create(input, actor.organizationId);
    await this.audit.logCreate(actor, "Brand", brand.id, brand);
    return brand;
  }

  @Mutation(() => BrandModel)
  @Roles(Role.ADMIN, Role.PURCHASE)
  async updateBrand(@Args("id") id: string, @Args("input") input: UpdateBrandInput, @CurrentUser() actor: User) {
    const before = await this.brandsService.findById(id);
    const brand = await this.brandsService.update(id, input);
    await this.audit.logUpdate(actor, "Brand", id, before, brand);
    return brand;
  }

  @Mutation(() => Boolean)
  @Roles(Role.ADMIN, Role.PURCHASE)
  async deleteBrand(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.brandsService.delete(id);
    await this.audit.logDelete(actor, "Brand", id, deleted);
    return true;
  }
}
