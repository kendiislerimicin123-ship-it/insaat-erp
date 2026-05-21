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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('user.create')
  @AuditLog({ action: 'CREATE', resource: 'user' })
  async create(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(admin.tenantId, admin.id, dto);
  }

  @Get()
  @RequirePermissions('user.read')
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListUsersDto,
  ) {
    return this.usersService.findAll(user.tenantId, query);
  }

  @Get('stats')
  @RequirePermissions('user.read')
  async getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getStats(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('user.read')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.usersService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('user.update')
  @AuditLog({ action: 'UPDATE', resource: 'user' })
  async update(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(admin.tenantId, admin.id, id, dto);
  }

  @Patch(':id/roles')
  @RequirePermissions('role.assign')
  @AuditLog({ action: 'ROLE_ASSIGN', resource: 'user' })
  async updateRoles(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserRolesDto,
  ) {
    return this.usersService.updateRoles(admin.tenantId, admin.id, id, dto);
  }

  @Patch(':id/password')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('user.update')
  @AuditLog({ action: 'PASSWORD_CHANGE', resource: 'user' })
  async changePassword(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(admin.tenantId, admin.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('user.delete')
  @AuditLog({ action: 'DELETE', resource: 'user' })
  async remove(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.usersService.remove(admin.tenantId, admin.id, id);
  }
}