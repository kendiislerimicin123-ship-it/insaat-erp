import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import {
  UpdateInvoiceDto,
  PayInvoiceDto,
  CancelInvoiceDto,
} from './dto/update-invoice.dto';
import { ListInvoicesDto, InvoiceStatsDto } from './dto/list-invoices.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { AuditLog } from '../audit/decorators/audit-log.decorator';

@Controller('invoices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  // ════════════════════════════════════
  // CREATE (DRAFT olarak oluşur)
  // ════════════════════════════════════
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('invoice.create')
  @AuditLog({ action: 'CREATE', resource: 'invoice' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoicesService.create(user.tenantId, user.id, dto);
  }

  // ════════════════════════════════════
  // LIST
  // ════════════════════════════════════
  @Get()
  @RequirePermissions('invoice.read')
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListInvoicesDto,
  ) {
    return this.invoicesService.findAll(user.tenantId, query);
  }

  // ════════════════════════════════════
  // STATS
  // ⚠️ /stats route'u :id'den ÖNCE gelmeli
  // ════════════════════════════════════
  @Get('stats')
  @RequirePermissions('invoice.read')
  async getStats(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: InvoiceStatsDto,
  ) {
    return this.invoicesService.getStats(user.tenantId, query);
  }

  // ════════════════════════════════════
  // DETAIL (kalemler + üretilen kayıtlar)
  // ════════════════════════════════════
  @Get(':id')
  @RequirePermissions('invoice.read')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.invoicesService.findOne(user.tenantId, id);
  }

  // ════════════════════════════════════
  // UPDATE (sadece DRAFT)
  // ════════════════════════════════════
  @Patch(':id')
  @RequirePermissions('invoice.update')
  @AuditLog({ action: 'UPDATE', resource: 'invoice' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(user.tenantId, user.id, id, dto);
  }

  // ════════════════════════════════════
  // CONFIRM — otomasyon zinciri tetiklenir
  // ════════════════════════════════════
  @Patch(':id/confirm')
  @RequirePermissions('invoice.confirm')
  @AuditLog({ action: 'UPDATE', resource: 'invoice' })
  async confirm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.invoicesService.confirm(user.tenantId, user.id, id);
  }

  // ════════════════════════════════════
  // PAY — ödeme işaretleme (+ çek üretimi)
  // ════════════════════════════════════
  @Patch(':id/pay')
  @RequirePermissions('invoice.pay')
  @AuditLog({ action: 'UPDATE', resource: 'invoice' })
  async pay(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: PayInvoiceDto,
  ) {
    return this.invoicesService.pay(user.tenantId, user.id, id, dto);
  }

  // ════════════════════════════════════
  // CANCEL — tüm otomatik kayıtlar geri çekilir
  // ════════════════════════════════════
  @Patch(':id/cancel')
  @RequirePermissions('invoice.cancel')
  @AuditLog({ action: 'UPDATE', resource: 'invoice' })
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelInvoiceDto,
  ) {
    return this.invoicesService.cancel(user.tenantId, user.id, id, dto.reason);
  }

  // ════════════════════════════════════
  // DELETE (soft, sadece DRAFT)
  // ════════════════════════════════════
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('invoice.delete')
  @AuditLog({ action: 'DELETE', resource: 'invoice' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.invoicesService.remove(user.tenantId, user.id, id);
  }
}