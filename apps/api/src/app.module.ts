import { join } from "path";
import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { GraphQLModule } from "@nestjs/graphql";
import { PrismaModule } from "./common/prisma/prisma.module";
import { SessionModule } from "./common/session/session.module";
import { AuditModule } from "./common/audit/audit.module";
import { TenancyModule } from "./common/tenancy/tenancy.module";
import { TenantContextInterceptor } from "./common/tenancy/tenant.interceptor";
import { MailerModule } from "./common/mailer/mailer.module";
import { StorageModule } from "./common/storage/storage.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { SessionsModule } from "./modules/sessions/sessions.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { ProductsModule } from "./modules/products/products.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { CrmModule } from "./modules/crm/crm.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { SuppliersModule } from "./modules/suppliers/suppliers.module";
import { SalesModule } from "./modules/sales/sales.module";
import { PurchaseModule } from "./modules/purchase/purchase.module";
import { AccountsModule } from "./modules/accounts/accounts.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(process.cwd(), ".env"), join(process.cwd(), "../../.env")],
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), "src/schema.gql"),
      sortSchema: true,
      context: ({ req, res }: { req: unknown; res: unknown }) => ({ req, res }),
    }),
    PrismaModule,
    TenancyModule,
    MailerModule,
    StorageModule,
    SessionModule,
    AuditModule,
    AuthModule,
    UsersModule,
    SessionsModule,
    NotificationsModule,
    SettingsModule,
    ProductsModule,
    InventoryModule,
    CrmModule,
    CustomersModule,
    SuppliersModule,
    SalesModule,
    PurchaseModule,
    AccountsModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor }],
})
export class AppModule {}
