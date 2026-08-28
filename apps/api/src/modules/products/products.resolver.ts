import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { StockLedgerEntryModel } from "../inventory/models/stock-ledger-entry.model";
import { ProductsService } from "./products.service";
import { ProductModel } from "./models/product.model";
import { CreateProductInput, UpdateProductInput } from "./dto/product.input";

@Resolver(() => ProductModel)
@UseGuards(SessionAuthGuard, RolesGuard)
export class ProductsResolver {
  constructor(
    private readonly productsService: ProductsService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [ProductModel])
  products() {
    return this.productsService.findAll();
  }

  @Query(() => ProductModel, { nullable: true })
  product(@Args("id") id: string) {
    return this.productsService.findById(id);
  }

  @Query(() => [StockLedgerEntryModel])
  productStockHistory(@Args("productId") productId: string) {
    return this.productsService.stockHistory(productId);
  }

  @Mutation(() => ProductModel)
  @Roles(Role.ADMIN, Role.PURCHASE)
  async createProduct(@Args("input") input: CreateProductInput, @CurrentUser() actor: User) {
    const product = await this.productsService.create(input, actor.organizationId);
    await this.audit.logCreate(actor, "Product", product.id, product);
    return product;
  }

  @Mutation(() => ProductModel)
  @Roles(Role.ADMIN, Role.PURCHASE)
  async updateProduct(@Args("id") id: string, @Args("input") input: UpdateProductInput, @CurrentUser() actor: User) {
    const before = await this.productsService.findById(id);
    const product = await this.productsService.update(id, input);
    await this.audit.logUpdate(actor, "Product", id, before, product);
    return product;
  }
}
