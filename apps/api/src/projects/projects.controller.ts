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
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';

@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('project.create')
  @AuditLog({ action: 'CREATE', resource: 'project' }) 
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.create(user.tenantId, user.id, dto);
  }

  @Get()
  @RequirePermissions('project.read')
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListProjectsDto,
  ) {
    return this.projectsService.findAll(user.tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('project.read')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.projectsService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('project.update')
  @AuditLog({ action: 'UPDATE', resource: 'project' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(user.tenantId, user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('project.delete')
  @AuditLog({ action: 'DELETE', resource: 'project' }) 
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.projectsService.remove(user.tenantId, user.id, id);
  }
}