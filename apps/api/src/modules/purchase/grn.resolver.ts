import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { GrnService } from "./grn.service";
import { GoodsReceivedNoteModel } from "./models/grn.model";
import { CreateGrnInput } from "./dto/grn.input";

@Resolver(() => GoodsReceivedNoteModel)
@UseGuards(SessionAuthGuard, RolesGuard)
export class GrnResolver {
  constructor(
    private readonly grnService: GrnService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [GoodsReceivedNoteModel])
  goodsReceivedNotes() {
    return this.grnService.findAll();
  }

  @Mutation(() => GoodsReceivedNoteModel)
  @Roles(Role.ADMIN, Role.WAREHOUSE, Role.PURCHASE)
  async createGrn(@Args("input") input: CreateGrnInput, @CurrentUser() actor: User) {
    const grn = await this.grnService.create(input, actor.id, actor.organizationId);
    await this.audit.logCreate(actor, "GoodsReceivedNote", grn.id, grn);
    return grn;
  }
}
