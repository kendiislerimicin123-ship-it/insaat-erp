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
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ListContactsDto } from './dto/list-contacts.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { AuditLog } from '../audit/decorators/audit-log.decorator';

@Controller('contacts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('contact.create')
  @AuditLog({ action: 'CREATE', resource: 'contact' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateContactDto,
  ) {
    return this.contactsService.create(user.tenantId, user.id, dto);
  }

  @Get()
  @RequirePermissions('contact.read')
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListContactsDto,
  ) {
    return this.contactsService.findAll(user.tenantId, query);
  }

  @Get('stats')
  @RequirePermissions('contact.read')
  async getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.contactsService.getStats(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('contact.read')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.contactsService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('contact.update')
  @AuditLog({ action: 'UPDATE', resource: 'contact' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactsService.update(user.tenantId, user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('contact.delete')
  @AuditLog({ action: 'DELETE', resource: 'contact' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.contactsService.remove(user.tenantId, user.id, id);
  }
}