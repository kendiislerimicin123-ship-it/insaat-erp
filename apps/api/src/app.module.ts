import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { UsersModule } from './users/users.module';
import { AuditModule } from './audit/audit.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { SubcontractorsModule } from './subcontractors/subcontractors.module';
import { ProgressPaymentsModule } from './progress-payments/progress-payments.module';
import { MaterialsModule } from './materials/materials.module';
import { ContactsModule } from './contacts/contacts.module';
import { ContactTransactionsModule } from './contact-transactions/contact-transactions.module';
import { ChequesModule } from './cheques/cheques.module';
import { EmployeesModule } from './employees/employees.module';
import { TimesheetsModule } from './timesheets/timesheets.module';
import { TenantContextModule } from './common/tenant-context/tenant-context.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExpensesModule } from './expenses/expenses.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env'],
    }),
    TenantContextModule,
    PrismaModule,
    AuthModule,
    AuditModule,
    ProjectsModule,
    UsersModule,
    SubcontractorsModule,
    ProgressPaymentsModule,
    MaterialsModule,
    ContactsModule,
    ContactTransactionsModule,
    ChequesModule,
    EmployeesModule,
    TimesheetsModule,
    ExpensesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}