import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { AuthService } from "./auth.service";
import { AuthResolver } from "./auth.resolver";
import { InvitesService } from "./invites.service";
import { InvitesResolver } from "./invites.resolver";

@Module({
  imports: [UsersModule],
  providers: [AuthService, AuthResolver, InvitesService, InvitesResolver],
})
export class AuthModule {}
