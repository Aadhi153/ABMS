import { Module } from "@nestjs/common";
import { SessionsService } from "./sessions.service";
import { SessionsResolver } from "./sessions.resolver";

@Module({
  providers: [SessionsService, SessionsResolver],
})
export class SessionsModule {}
