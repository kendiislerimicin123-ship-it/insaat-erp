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
import { ChequesService } from './cheques.service';
import {
  CreateChequeDto,
  UpdateChequeStatusDto,
  ListChequesDto,
} from './dto/create-cheque.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { AuditLog } from '../audit/decorators/audit-log.decorator';

@Controller('cheques')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ChequesController {
  constructor(private readonly chequesService: ChequesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('cheque.create')
  @AuditLog({ action: 'CREATE', resource: 'cheque' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateChequeDto,
  ) {
    return this.chequesService.create(user.tenantId, user.id, dto);
  }

  @Get()
  @RequirePermissions('cheque.read')
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListChequesDto,
  ) {
    return this.chequesService.findAll(user.tenantId, query);
  }

  @Get('stats')
  @RequirePermissions('cheque.read')
  async getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.chequesService.getStats(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('cheque.read')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.chequesService.findOne(user.tenantId, id);
  }

  @Patch(':id/status')
  @RequirePermissions('cheque.update')
  @AuditLog({ action: 'UPDATE', resource: 'cheque' })
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateChequeStatusDto,
  ) {
    return this.chequesService.updateStatus(user.tenantId, user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('cheque.delete')
  @AuditLog({ action: 'DELETE', resource: 'cheque' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.chequesService.remove(user.tenantId, user.id, id);
  }
}