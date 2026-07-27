import { Global, Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { PrismaService } from "../prisma/prisma.service";
import { TenantContextService } from "./tenant-context";
import { TenantContextInterceptor } from "./tenant.interceptor";
import { SCOPED_PRISMA, createScopedPrismaClient } from "./scoped-prisma.service";

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    TenantContextService,
    TenantContextInterceptor,
    {
      provide: SCOPED_PRISMA,
      useFactory: createScopedPrismaClient,
      inject: [PrismaService, TenantContextService],
    },
  ],
  exports: [TenantContextService, TenantContextInterceptor, SCOPED_PRISMA],
})
export class TenancyModule {}
