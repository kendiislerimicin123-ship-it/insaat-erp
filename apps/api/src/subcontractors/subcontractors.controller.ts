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
import { SubcontractorsService } from './subcontractors.service';
import { CreateSubcontractorDto } from './dto/create-subcontractor.dto';
import { UpdateSubcontractorDto } from './dto/update-subcontractor.dto';
import { ListSubcontractorsDto } from './dto/list-subcontractors.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { AuditLog } from '../audit/decorators/audit-log.decorator';

@Controller('subcontractors')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SubcontractorsController {
  constructor(private readonly subcontractorsService: SubcontractorsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('subcontractor.create')
  @AuditLog({ action: 'CREATE', resource: 'subcontractor' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSubcontractorDto,
  ) {
    return this.subcontractorsService.create(user.tenantId, user.id, dto);
  }

  @Get()
  @RequirePermissions('subcontractor.read')
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListSubcontractorsDto,
  ) {
    return this.subcontractorsService.findAll(user.tenantId, query);
  }

  @Get('stats')
  @RequirePermissions('subcontractor.read')
  async getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.subcontractorsService.getStats(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('subcontractor.read')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.subcontractorsService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('subcontractor.update')
  @AuditLog({ action: 'UPDATE', resource: 'subcontractor' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateSubcontractorDto,
  ) {
    return this.subcontractorsService.update(user.tenantId, user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('subcontractor.delete')
  @AuditLog({ action: 'DELETE', resource: 'subcontractor' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.subcontractorsService.remove(user.tenantId, user.id, id);
  }
}