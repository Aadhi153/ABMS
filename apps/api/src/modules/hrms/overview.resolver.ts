import { UseGuards } from "@nestjs/common";
import { Query, Resolver } from "@nestjs/graphql";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { OverviewService } from "./overview.service";
import { HrmsOverviewModel } from "./models/overview.model";

@Resolver(() => HrmsOverviewModel)
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class OverviewResolver {
  constructor(private readonly overviewService: OverviewService) {}

  @Query(() => HrmsOverviewModel)
  hrmsOverview() {
    return this.overviewService.getOverview();
  }
}
