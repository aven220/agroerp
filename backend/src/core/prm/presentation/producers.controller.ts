import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { AgroRequest } from '@/core/engine/middleware/request-context.middleware';
import { ProducersService } from '../application/producers.service';
import { ProducerLifecycleService } from '../application/producer-lifecycle.service';
import { ProducerRelationsService } from '../application/producer-relations.service';
import { ProducerSyncService } from '../application/producer-sync.service';
import {
  CreateAddressDto,
  CreateAssignmentDto,
  CreateCertificationDto,
  CreateCommunicationDto,
  CreateContactDto,
  CreateDocumentDto,
  CreateNoteDto,
  CreateProducerDto,
  ImportProducersDto,
  LifecycleTransitionDto,
  LinkFarmDto,
  MergeProducersDto,
  SyncProducersDto,
  UpdateContactDto,
  UpdateProducerDto,
} from './producers.dto';

@ApiTags('PRM — Productores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('prm')
export class ProducersController {
  constructor(
    private readonly producers: ProducersService,
    private readonly lifecycle: ProducerLifecycleService,
    private readonly relations: ProducerRelationsService,
    private readonly sync: ProducerSyncService,
  ) {}

  @Get('producers')
  @RequirePermissions('producer:read')
  @ApiOperation({ summary: 'Listar productores' })
  findAll(
    @CurrentUser() user: { organizationId: string },
    @Query('lifecycleStatus') lifecycleStatus?: string,
    @Query('municipalityCode') municipalityCode?: string,
    @Query('veredaCode') veredaCode?: string,
    @Query('assignedBuyerId') assignedBuyerId?: string,
    @Query('assignedTechnicianId') assignedTechnicianId?: string,
    @Query('segmentId') segmentId?: string,
    @Query('categoryCode') categoryCode?: string,
    @Query('certificationScheme') certificationScheme?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.producers.findAll(user.organizationId, {
      lifecycleStatus: lifecycleStatus as never,
      municipalityCode,
      veredaCode,
      assignedBuyerId,
      assignedTechnicianId,
      segmentId,
      categoryCode,
      certificationScheme,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Post('producers')
  @RequirePermissions('producer:create')
  create(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateProducerDto,
    @Req() req: AgroRequest,
  ) {
    return this.producers.create(
      user.organizationId,
      user.id,
      dto,
      req.agroContext,
    );
  }

  @Get('producers/check-duplicate')
  @RequirePermissions('producer:read')
  checkDuplicate(
    @CurrentUser() user: { organizationId: string },
    @Query('documentNumber') documentNumber: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.producers.checkDuplicate(
      user.organizationId,
      documentNumber,
      excludeId,
    );
  }

  @Get('producers/dashboard')
  @RequirePermissions('producer:read')
  dashboard(@CurrentUser() user: { organizationId: string }) {
    return this.producers.getDashboard(user.organizationId);
  }

  @Get('producers/map')
  @RequirePermissions('producer:read')
  map(
    @CurrentUser() user: { organizationId: string },
    @Query('lifecycleStatus') lifecycleStatus?: string,
    @Query('municipalityCode') municipalityCode?: string,
  ) {
    return this.producers.getMapData(user.organizationId, {
      lifecycleStatus: lifecycleStatus as never,
      municipalityCode,
    });
  }

  @Get('producers/export')
  @RequirePermissions('producer:export')
  @Header('Content-Type', 'text/csv')
  export(
    @CurrentUser() user: { organizationId: string },
    @Query('lifecycleStatus') lifecycleStatus?: string,
    @Query('municipalityCode') municipalityCode?: string,
    @Query('search') search?: string,
  ) {
    return this.producers.exportCsv(user.organizationId, {
      lifecycleStatus: lifecycleStatus as never,
      municipalityCode,
      search,
    });
  }

  @Post('producers/import')
  @RequirePermissions('producer:import')
  import(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: ImportProducersDto,
    @Req() req: AgroRequest,
  ) {
    return this.producers.importBatch(
      user.organizationId,
      user.id,
      dto.items,
      req.agroContext,
    );
  }

  @Post('producers/sync')
  @RequirePermissions('producer:create')
  syncBatch(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: SyncProducersDto,
    @Req() req: AgroRequest,
  ) {
    return this.sync.syncBatch(
      user.organizationId,
      user.id,
      dto,
      req.agroContext,
    );
  }

  @Get('producers/bootstrap')
  @RequirePermissions('producer:read')
  bootstrap(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.sync.getBootstrap(user.organizationId, user.id);
  }

  @Post('producers/merge')
  @RequirePermissions('producer:admin')
  merge(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: MergeProducersDto,
    @Req() req: AgroRequest,
  ) {
    return this.relations.merge(
      user.organizationId,
      user.id,
      dto,
      req.agroContext,
    );
  }

  @Get('producers/:id')
  @RequirePermissions('producer:read')
  findOne(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.producers.findOne(user.organizationId, id);
  }

  @Patch('producers/:id')
  @RequirePermissions('producer:update')
  update(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateProducerDto,
    @Req() req: AgroRequest,
  ) {
    return this.producers.update(
      user.organizationId,
      id,
      user.id,
      dto,
      req.agroContext,
    );
  }

  @Delete('producers/:id')
  @RequirePermissions('producer:delete')
  remove(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Req() req: AgroRequest,
  ) {
    return this.producers.remove(
      user.organizationId,
      id,
      user.id,
      req.agroContext,
    );
  }

  @Post('producers/:id/lifecycle')
  @RequirePermissions('producer:lifecycle')
  lifecycleTransition(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: LifecycleTransitionDto,
    @Req() req: AgroRequest,
  ) {
    return this.lifecycle.transition(
      user.organizationId,
      id,
      user.id,
      dto,
      req.agroContext,
    );
  }

  @Get('producers/:id/timeline')
  @RequirePermissions('producer:read')
  timeline(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.producers.getTimeline(user.organizationId, id);
  }

  @Get('producers/:id/360')
  @RequirePermissions('producer:read')
  view360(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.producers.get360(user.organizationId, id);
  }

  @Get('producers/:id/indicators')
  @RequirePermissions('producer:read')
  indicators(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.producers.getIndicators(user.organizationId, id);
  }

  @Post('producers/:id/contacts')
  @RequirePermissions('producer:update')
  addContact(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: CreateContactDto,
    @Req() req: AgroRequest,
  ) {
    return this.relations.addContact(
      user.organizationId,
      id,
      user.id,
      dto,
      req.agroContext,
    );
  }

  @Patch('producers/:id/contacts/:contactId')
  @RequirePermissions('producer:update')
  updateContact(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Body() dto: UpdateContactDto,
    @Req() req: AgroRequest,
  ) {
    return this.relations.updateContact(
      user.organizationId,
      id,
      contactId,
      user.id,
      dto,
      req.agroContext,
    );
  }

  @Post('producers/:id/addresses')
  @RequirePermissions('producer:update')
  addAddress(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: CreateAddressDto,
    @Req() req: AgroRequest,
  ) {
    return this.relations.addAddress(
      user.organizationId,
      id,
      user.id,
      dto,
      req.agroContext,
    );
  }

  @Post('producers/:id/certifications')
  @RequirePermissions('producer:update')
  addCertification(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: CreateCertificationDto,
    @Req() req: AgroRequest,
  ) {
    return this.relations.addCertification(
      user.organizationId,
      id,
      user.id,
      dto,
      req.agroContext,
    );
  }

  @Post('producers/:id/documents')
  @RequirePermissions('document:upload')
  addDocument(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: CreateDocumentDto,
    @Req() req: AgroRequest,
  ) {
    return this.relations.addDocument(
      user.organizationId,
      id,
      user.id,
      dto,
      req.agroContext,
    );
  }

  @Post('producers/:id/communications')
  @RequirePermissions('producer:update')
  addCommunication(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: CreateCommunicationDto,
    @Req() req: AgroRequest,
  ) {
    return this.relations.addCommunication(
      user.organizationId,
      id,
      user.id,
      dto,
      req.agroContext,
    );
  }

  @Post('producers/:id/notes')
  @RequirePermissions('producer:update')
  addNote(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: CreateNoteDto,
    @Req() req: AgroRequest,
  ) {
    return this.relations.addNote(
      user.organizationId,
      id,
      user.id,
      dto,
      req.agroContext,
    );
  }

  @Post('producers/:id/assignments')
  @RequirePermissions('producer:assign')
  assign(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: CreateAssignmentDto,
    @Req() req: AgroRequest,
  ) {
    return this.relations.assign(
      user.organizationId,
      id,
      user.id,
      dto,
      req.agroContext,
    );
  }

  @Get('producers/:id/assignments')
  @RequirePermissions('producer:read')
  getAssignments(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.relations.getAssignments(user.organizationId, id);
  }

  @Post('producers/:id/farms')
  @RequirePermissions('farm:create')
  linkFarm(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: LinkFarmDto,
    @Req() req: AgroRequest,
  ) {
    return this.relations.linkFarm(
      user.organizationId,
      id,
      user.id,
      dto,
      req.agroContext,
    );
  }

  @Delete('producers/:id/farms/:farmLinkId')
  @RequirePermissions('farm:update')
  unlinkFarm(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Param('farmLinkId') farmLinkId: string,
    @Req() req: AgroRequest,
  ) {
    return this.relations.unlinkFarm(
      user.organizationId,
      id,
      farmLinkId,
      user.id,
      req.agroContext,
    );
  }
}
