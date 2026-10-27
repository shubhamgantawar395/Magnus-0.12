import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CustomersModule } from './modules/customers/customers.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { ChallansModule } from './modules/challans/challans.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { TrayModule } from './modules/trays/tray.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ExportModule } from './modules/exports/export.module';
import { VendorInvoiceModule } from './modules/vendor-invoices/vendor-invoice.module';
import { ExecutiveModule } from './modules/executive/executive.module';
import { AutomationModule } from './modules/automation/automation.module';
import { AiModule } from './modules/ai/ai.module';

import { AppController } from './app.controller';
import { EndCustomersModule } from './modules/end-customers/end-customers.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { VendorRateCardsModule } from './modules/vendor-rate-cards/vendor-rate-cards.module';
import { StockStatementsModule } from './modules/stock-statements/stock-statements.module';
import { QualityModule } from './modules/quality/quality.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { MachinesModule } from './modules/machines/machines.module';
import { PartDevelopmentsModule } from './modules/part-developments/part-developments.module';
import { CustomerOrdersModule } from './modules/customer-orders/customer-orders.module';
import { MaterialReceiptsModule } from './modules/material-receipts/material-receipts.module';
import { VendorLedgerModule } from './modules/vendor-ledger/vendor-ledger.module';
import { PlatformModule } from './modules/platform/platform.module';
import { PartsModule } from './modules/parts/parts.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { GatePassesModule } from './modules/gate-passes/gate-passes.module';
import { SupplierGRNModule } from './modules/supplier-grn/supplier-grn.module';
import { LineDeadlinesModule } from './modules/line-deadlines/line-deadlines.module';
import { AuxStatusModule } from './modules/aux-status/aux-status.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        PrismaModule,
        AuthModule,
        UsersModule,
        CustomersModule,
        VendorsModule,
        ChallansModule,
        JobsModule,
        DispatchModule,
        InvoicesModule,
        TrayModule,
        ReportsModule,
        ExportModule,
        VendorInvoiceModule,
        ExecutiveModule,
        AiModule,
        EndCustomersModule,
        OrganizationsModule,
        PurchaseOrdersModule,
        VendorRateCardsModule,
        StockStatementsModule,
        QualityModule,
        NotificationsModule,
        AutomationModule,
        MachinesModule,
        PartDevelopmentsModule,
        CustomerOrdersModule,
        MaterialReceiptsModule,
        VendorLedgerModule,
        PlatformModule,
        PartsModule,
        SuppliersModule,
        GatePassesModule,
        SupplierGRNModule,
        LineDeadlinesModule,
        AuxStatusModule,
    ],
    controllers: [AppController],
})
export class AppModule { }
