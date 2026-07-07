import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FormLifecycleService } from '../application/form-lifecycle.service';
import { FormImportService } from '../application/form-import.service';
import { FormTemplatesService } from '../application/form-templates.service';
import { FormAssignmentsService } from '../application/form-assignments.service';
import { FormCampaignsService } from '../application/form-campaigns.service';
import { FormDashboardService } from '../application/form-dashboard.service';
import { UdfeReportsService } from '../application/udfe-reports.service';
import {
  CreateFormAssignmentDto,
  CreateFormCampaignDto,
  CreateFormTemplateDto,
  DuplicateFormDto,
  ImportFormsDto,
  InstantiateTemplateDto,
  LifecycleNotesDto,
  UpdateFormCampaignDto,
} from './forms.dto';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { AgroRequest } from '@/core/engine/middleware/request-context.middleware';

@ApiTags('UDFE — Universal Dynamic Forms Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('udfe')
export class UdfeController {
  constructor(
    private readonly lifecycle: FormLifecycleService,
    private readonly formImport: FormImportService,
    private readonly templates: FormTemplatesService,
    private readonly assignments: FormAssignmentsService,
    private readonly campaigns: FormCampaignsService,
    private readonly dashboard: FormDashboardService,
    private readonly reports: UdfeReportsService,
  ) {}

  @Get('dashboard')
  @RequirePermissions('form:read')
  getDashboard(@CurrentUser() user: { organizationId: string }) {
    return this.dashboard.getDashboard(user.organizationId);
  }

  @Get('templates')
  @RequirePermissions('form:read')
  listTemplates(
    @CurrentUser() user: { organizationId: string },
    @Query('sectorCode') sectorCode?: string,
  ) {
    return this.templates.findAll(user.organizationId, sectorCode);
  }

  @Post('templates')
  @RequirePermissions('form:design')
  createTemplate(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateFormTemplateDto,
  ) {
    return this.templates.create(user.organizationId, user.id, dto);
  }

  @Post('templates/:templateId/instantiate')
  @RequirePermissions('form:create')
  instantiateTemplate(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('templateId') templateId: string,
    @Body() dto: InstantiateTemplateDto,
    @Req() req: AgroRequest,
  ) {
    return this.templates.instantiate(
      user.organizationId,
      user.id,
      templateId,
      dto.formKey,
      dto.name,
      req.agroContext,
    );
  }

  @Get('assignments')
  @RequirePermissions('form:read')
  listAssignments(
    @CurrentUser() user: { organizationId: string },
    @Query('assigneeId') assigneeId?: string,
    @Query('status') status?: string,
  ) {
    return this.assignments.findAll(user.organizationId, { assigneeId, status });
  }

  @Post('assignments')
  @RequirePermissions('form:assign')
  createAssignment(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateFormAssignmentDto,
    @Req() req: AgroRequest,
  ) {
    return this.assignments.create(user.organizationId, user.id, dto, req.agroContext);
  }

  @Post('assignments/:id/complete')
  @RequirePermissions('form:assign')
  completeAssignment(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
  ) {
    return this.assignments.complete(user.organizationId, id, user.id);
  }

  @Get('campaigns')
  @RequirePermissions('form:read')
  listCampaigns(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('formId') formId?: string,
    @Query('search') search?: string,
  ) {
    return this.campaigns.findAll(user.organizationId, { status, formId, search });
  }

  @Get('campaigns/:id')
  @RequirePermissions('form:read')
  getCampaign(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.campaigns.findOne(user.organizationId, id);
  }

  @Get('campaigns/:id/stats')
  @RequirePermissions('form:read')
  campaignStats(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.campaigns.getStats(user.organizationId, id);
  }

  @Post('campaigns')
  @RequirePermissions('form:assign')
  createCampaign(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateFormCampaignDto,
    @Req() req: AgroRequest,
  ) {
    return this.campaigns.create(user.organizationId, user.id, dto, req.agroContext);
  }

  @Post('campaigns/:id')
  @RequirePermissions('form:assign')
  updateCampaign(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateFormCampaignDto,
  ) {
    return this.campaigns.update(user.organizationId, id, dto);
  }

  @Post('campaigns/:id/activate')
  @RequirePermissions('form:assign')
  activateCampaign(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Req() req: AgroRequest,
  ) {
    return this.campaigns.activate(user.organizationId, id, user.id, req.agroContext);
  }

  @Post('campaigns/:id/close')
  @RequirePermissions('form:assign')
  closeCampaign(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Req() req: AgroRequest,
  ) {
    return this.campaigns.close(user.organizationId, id, user.id, req.agroContext);
  }

  @Post('campaigns/:id/archive')
  @RequirePermissions('form:admin')
  archiveCampaign(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Req() req: AgroRequest,
  ) {
    return this.campaigns.archive(user.organizationId, id, user.id, req.agroContext);
  }

  @Get('import/template')
  @RequirePermissions('form:import')
  importTemplate() {
    return this.formImport.getTemplateCsv();
  }

  @Post('import')
  @RequirePermissions('form:import')
  importForms(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: ImportFormsDto,
    @Req() req: AgroRequest,
  ) {
    return this.formImport.importJson(user.organizationId, user.id, dto, req.agroContext);
  }

  @Get('forms/:id/export')
  @RequirePermissions('form:export')
  exportForm(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Query('format') format?: 'json' | 'csv',
  ) {
    return this.formImport.exportForm(user.organizationId, id, format ?? 'json');
  }

  @Get('forms/:id/versions')
  @RequirePermissions('form:read')
  versionHistory(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.lifecycle.getVersionHistory(user.organizationId, id);
  }

  @Post('forms/:id/duplicate')
  @RequirePermissions('form:create')
  duplicate(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: DuplicateFormDto,
    @Req() req: AgroRequest,
  ) {
    return this.lifecycle.duplicate(
      user.organizationId,
      id,
      user.id,
      dto.newFormKey,
      req.agroContext,
    );
  }

  @Post('forms/:id/submit-review')
  @RequirePermissions('form:update')
  submitReview(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: LifecycleNotesDto,
    @Req() req: AgroRequest,
  ) {
    return this.lifecycle.submitForReview(
      user.organizationId,
      id,
      user.id,
      dto.reasonNotes,
      req.agroContext,
    );
  }

  @Post('forms/:id/approve')
  @RequirePermissions('form:approve')
  approve(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Req() req: AgroRequest,
  ) {
    return this.lifecycle.approve(user.organizationId, id, user.id, req.agroContext);
  }

  @Post('forms/:id/reject')
  @RequirePermissions('form:approve')
  reject(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: LifecycleNotesDto,
    @Req() req: AgroRequest,
  ) {
    return this.lifecycle.reject(
      user.organizationId,
      id,
      user.id,
      dto.reasonNotes,
      req.agroContext,
    );
  }

  @Post('forms/:id/unpublish')
  @RequirePermissions('form:publish')
  unpublish(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Req() req: AgroRequest,
  ) {
    return this.lifecycle.unpublish(user.organizationId, id, user.id, req.agroContext);
  }

  @Post('forms/:id/archive')
  @RequirePermissions('form:admin')
  archive(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Req() req: AgroRequest,
  ) {
    return this.lifecycle.archive(user.organizationId, id, user.id, req.agroContext);
  }

  @Post('forms/:id/restore')
  @RequirePermissions('form:admin')
  restore(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Req() req: AgroRequest,
  ) {
    return this.lifecycle.restore(user.organizationId, id, user.id, req.agroContext);
  }

  @Delete('forms/:id')
  @RequirePermissions('form:delete')
  remove(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Req() req: AgroRequest,
  ) {
    return this.lifecycle.softDelete(user.organizationId, id, user.id, req.agroContext);
  }

  @Get('reports/export/download')
  @RequirePermissions('form:read')
  @ApiOperation({ summary: 'Download forms report as CSV (Excel compatible)' })
  exportReport(
    @CurrentUser() user: { organizationId: string },
    @Query('type') type?: 'full' | 'catalog' | 'submissions',
    @Query('formId') formId?: string,
  ) {
    return this.reports.exportReport(user.organizationId, { type, formId });
  }

  @Get('reports/:reportCode')
  @RequirePermissions('form:read')
  runReport(
    @CurrentUser() user: { organizationId: string },
    @Param('reportCode') reportCode: string,
    @Query('formId') formId?: string,
  ) {
    return this.reports.runReport(user.organizationId, reportCode, { formId });
  }
}
