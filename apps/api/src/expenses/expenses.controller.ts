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
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ListExpensesDto } from './dto/list-expenses.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { AuditLog } from '../audit/decorators/audit-log.decorator';

@Controller('expenses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('expense.create')
  @AuditLog({ action: 'CREATE', resource: 'expense' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expensesService.create(user.tenantId, user.id, dto);
  }

  @Get()
  @RequirePermissions('expense.read')
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListExpensesDto,
  ) {
    return this.expensesService.findAll(user.tenantId, query);
  }

  @Get('stats')
  @RequirePermissions('expense.read')
  async getStats(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.expensesService.getStats(user.tenantId, from, to, projectId);
  }

  @Get(':id')
  @RequirePermissions('expense.read')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.expensesService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('expense.update')
  @AuditLog({ action: 'UPDATE', resource: 'expense' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(user.tenantId, user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('expense.delete')
  @AuditLog({ action: 'DELETE', resource: 'expense' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.expensesService.remove(user.tenantId, user.id, id);
  }
}