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
import { MaterialsService } from './materials.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { ListMaterialsDto } from './dto/list-materials.dto';
import {
  CreateMovementDto,
  ListMovementsDto,
} from './dto/create-movement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { AuditLog } from '../audit/decorators/audit-log.decorator';

@Controller('materials')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  // ─── Material CRUD ───
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('material.create')
  @AuditLog({ action: 'CREATE', resource: 'material' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMaterialDto,
  ) {
    return this.materialsService.create(user.tenantId, user.id, dto);
  }

  @Get()
  @RequirePermissions('material.read')
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListMaterialsDto,
  ) {
    return this.materialsService.findAll(user.tenantId, query);
  }

  @Get('stats')
  @RequirePermissions('material.read')
  async getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.materialsService.getStats(user.tenantId);
  }

  // ─── Stock Movements (önce, :id'den önce!) ───
  @Get('movements')
  @RequirePermissions('material.read')
  async findMovements(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListMovementsDto,
  ) {
    return this.materialsService.findMovements(user.tenantId, query);
  }

  @Get('movements/stats')
  @RequirePermissions('material.read')
  async getMovementStats(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.materialsService.getMovementStats(user.tenantId, from, to);
  }

  @Post('movements')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('material.movement')
  @AuditLog({ action: 'CREATE', resource: 'material-movement' })
  async createMovement(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMovementDto,
  ) {
    return this.materialsService.createMovement(user.tenantId, user.id, dto);
  }

  @Post('movements/bulk-delete')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('material.movement')
  @AuditLog({ action: 'DELETE', resource: 'material-movement' })
  async removeMovementsBulk(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { ids: string[] },
  ) {
    return this.materialsService.removeMovementsBulk(user.tenantId, user.id, body.ids);
  }

  @Delete('movements/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('material.movement')
  @AuditLog({ action: 'DELETE', resource: 'material-movement' })
  async removeMovement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.materialsService.removeMovement(user.tenantId, user.id, id);
  }

  // ─── Material CRUD (:id route'ları) ───
  @Get(':id')
  @RequirePermissions('material.read')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.materialsService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('material.update')
  @AuditLog({ action: 'UPDATE', resource: 'material' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateMaterialDto,
  ) {
    return this.materialsService.update(user.tenantId, user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('material.delete')
  @AuditLog({ action: 'DELETE', resource: 'material' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.materialsService.remove(user.tenantId, user.id, id);
  }
}