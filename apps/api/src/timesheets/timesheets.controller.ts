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
import { TimesheetsService } from './timesheets.service';
import {
  CreateTimesheetDto,
  UpdateTimesheetDto,
  ListTimesheetsDto,
} from './dto/create-timesheet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { AuditLog } from '../audit/decorators/audit-log.decorator';

@Controller('timesheets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TimesheetsController {
  constructor(private readonly timesheetsService: TimesheetsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('timesheet.create')
  @AuditLog({ action: 'CREATE', resource: 'timesheet' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTimesheetDto,
  ) {
    return this.timesheetsService.create(user.tenantId, user.id, dto);
  }

  @Get()
  @RequirePermissions('timesheet.read')
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListTimesheetsDto,
  ) {
    return this.timesheetsService.findAll(user.tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('timesheet.read')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.timesheetsService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('timesheet.update')
  @AuditLog({ action: 'UPDATE', resource: 'timesheet' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTimesheetDto,
  ) {
    return this.timesheetsService.update(user.tenantId, user.id, id, dto);
  }

   @Patch(':id/approve')
  @RequirePermissions('timesheet.approve')
  @AuditLog({ action: 'UPDATE', resource: 'timesheet' })
  async approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.timesheetsService.approve(user.tenantId, user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('timesheet.delete')
  @AuditLog({ action: 'DELETE', resource: 'timesheet' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.timesheetsService.remove(user.tenantId, user.id, id);
  }
}