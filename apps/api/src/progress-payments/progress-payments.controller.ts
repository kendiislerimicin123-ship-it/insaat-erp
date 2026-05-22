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
import { ProgressPaymentsService } from './progress-payments.service';
import { CreateProgressPaymentDto } from './dto/create-progress-payment.dto';
import { UpdateProgressPaymentDto } from './dto/update-progress-payment.dto';
import { ListProgressPaymentsDto } from './dto/list-progress-payments.dto';
import { PayProgressPaymentDto } from './dto/pay-progress-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { AuditLog } from '../audit/decorators/audit-log.decorator';

@Controller('progress-payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProgressPaymentsController {
  constructor(
    private readonly progressPaymentsService: ProgressPaymentsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('progress-payment.create')
  @AuditLog({ action: 'CREATE', resource: 'progress-payment' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProgressPaymentDto,
  ) {
    return this.progressPaymentsService.create(user.tenantId, user.id, dto);
  }

  @Get()
  @RequirePermissions('progress-payment.read')
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListProgressPaymentsDto,
  ) {
    return this.progressPaymentsService.findAll(user.tenantId, query);
  }

  @Get('stats')
  @RequirePermissions('progress-payment.read')
  async getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.progressPaymentsService.getStats(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('progress-payment.read')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.progressPaymentsService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('progress-payment.update')
  @AuditLog({ action: 'UPDATE', resource: 'progress-payment' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProgressPaymentDto,
  ) {
    return this.progressPaymentsService.update(
      user.tenantId,
      user.id,
      id,
      dto,
    );
  }

  @Patch(':id/approve')
  @RequirePermissions('progress-payment.approve')
  @AuditLog({ action: 'UPDATE', resource: 'progress-payment' })
  async approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.progressPaymentsService.approve(user.tenantId, user.id, id);
  }

  @Patch(':id/pay')
  @RequirePermissions('progress-payment.pay')
  @AuditLog({ action: 'UPDATE', resource: 'progress-payment' })
  async pay(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: PayProgressPaymentDto,
  ) {
    return this.progressPaymentsService.pay(user.tenantId, user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('progress-payment.delete')
  @AuditLog({ action: 'DELETE', resource: 'progress-payment' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.progressPaymentsService.remove(user.tenantId, user.id, id);
  }
}