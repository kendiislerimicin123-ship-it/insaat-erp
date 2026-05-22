import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ContactTransactionsService } from './contact-transactions.service';
import {
  CreateContactTransactionDto,
  ListContactTransactionsDto,
} from './dto/create-contact-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { AuditLog } from '../audit/decorators/audit-log.decorator';

@Controller('contact-transactions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ContactTransactionsController {
  constructor(
    private readonly contactTransactionsService: ContactTransactionsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('contact-transaction.create')
  @AuditLog({ action: 'CREATE', resource: 'contact-transaction' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateContactTransactionDto,
  ) {
    return this.contactTransactionsService.create(user.tenantId, user.id, dto);
  }

  @Get()
  @RequirePermissions('contact-transaction.read')
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListContactTransactionsDto,
  ) {
    return this.contactTransactionsService.findAll(user.tenantId, query);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('contact-transaction.delete')
  @AuditLog({ action: 'DELETE', resource: 'contact-transaction' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.contactTransactionsService.remove(user.tenantId, user.id, id);
  }
}