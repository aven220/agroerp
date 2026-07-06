import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FormsService } from '../application/forms.service';
import { FormSubmissionsService } from '../application/form-submissions.service';
import {
  CreateFormDto,
  RenderFormDto,
  SubmitFormDto,
  SyncSubmissionsDto,
  UpdateFormDto,
} from './forms.dto';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { AgroRequest } from '@/core/engine/middleware/request-context.middleware';

@ApiTags('Form Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('forms')
export class FormsController {
  constructor(
    private readonly forms: FormsService,
    private readonly submissions: FormSubmissionsService,
  ) {}

  @Get()
  @RequirePermissions('form:read')
  @ApiOperation({ summary: 'List form definitions' })
  findAll(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.forms.findAll(user.organizationId, status, search);
  }

  @Get('bootstrap')
  @RequirePermissions('form:read')
  @ApiOperation({ summary: 'Download active published forms for offline cache (Android)' })
  bootstrap(@CurrentUser() user: { organizationId: string }) {
    return this.forms.bootstrap(user.organizationId);
  }

  @Get('published/:formKey')
  @RequirePermissions('form:read')
  @ApiOperation({ summary: 'Get latest published form by key' })
  findPublishedByKey(
    @CurrentUser() user: { organizationId: string },
    @Param('formKey') formKey: string,
  ) {
    return this.forms.findPublishedByKey(user.organizationId, formKey);
  }

  @Get(':formId/submissions')
  @RequirePermissions('form:read')
  @ApiOperation({ summary: 'List submissions for a form' })
  listSubmissions(
    @CurrentUser() user: { organizationId: string },
    @Param('formId') formId: string,
  ) {
    return this.submissions.findAll(user.organizationId, { formId });
  }

  @Get(':id')
  @RequirePermissions('form:read')
  @ApiOperation({ summary: 'Get form definition by id' })
  findOne(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.forms.findOne(user.organizationId, id);
  }

  @Post()
  @RequirePermissions('form:create')
  @ApiOperation({ summary: 'Create form definition (draft)' })
  create(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateFormDto,
    @Req() req: AgroRequest,
  ) {
    return this.forms.create(
      user.organizationId,
      user.id,
      dto,
      req.agroContext,
    );
  }

  @Patch(':id')
  @RequirePermissions('form:update')
  @ApiOperation({ summary: 'Update draft form definition' })
  update(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: UpdateFormDto,
    @Req() req: AgroRequest,
  ) {
    return this.forms.update(user.organizationId, id, dto, req.agroContext);
  }

  @Post(':id/publish')
  @RequirePermissions('form:publish')
  @ApiOperation({ summary: 'Publish form (deprecates previous published version)' })
  publish(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Req() req: AgroRequest,
  ) {
    return this.forms.publish(
      user.organizationId,
      id,
      user.id,
      req.agroContext,
    );
  }

  @Post('keys/:formKey/versions')
  @RequirePermissions('form:create')
  @ApiOperation({ summary: 'Create new draft version from existing form key' })
  newVersion(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('formKey') formKey: string,
    @Req() req: AgroRequest,
  ) {
    return this.forms.createNewVersion(
      user.organizationId,
      formKey,
      user.id,
      req.agroContext,
    );
  }

  @Post(':id/render')
  @RequirePermissions('form:read')
  @ApiOperation({ summary: 'Render form with conditional logic applied' })
  render(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: RenderFormDto,
  ) {
    return this.forms.render(
      user.organizationId,
      id,
      dto.partialData ?? {},
    );
  }

  @Post(':id/submit')
  @RequirePermissions('form:submit')
  @ApiOperation({ summary: 'Submit form data (creates Resource + FormSubmission)' })
  submit(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: SubmitFormDto,
    @Req() req: AgroRequest,
  ) {
    return this.submissions.submit(
      user.organizationId,
      id,
      user.id,
      dto,
      req.agroContext,
    );
  }
}

@ApiTags('Form Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('form-submissions')
export class FormSubmissionsController {
  constructor(private readonly submissions: FormSubmissionsService) {}

  @Get()
  @RequirePermissions('form:read')
  @ApiOperation({ summary: 'List all form submissions' })
  findAll(
    @CurrentUser() user: { organizationId: string },
    @Query('formKey') formKey?: string,
    @Query('formId') formId?: string,
  ) {
    return this.submissions.findAll(user.organizationId, { formKey, formId });
  }

  @Get(':id')
  @RequirePermissions('form:read')
  @ApiOperation({ summary: 'Get submission by id' })
  findOne(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.submissions.findOne(user.organizationId, id);
  }

  @Post('sync')
  @RequirePermissions('form:submit')
  @ApiOperation({ summary: 'Batch sync offline submissions from mobile' })
  sync(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: SyncSubmissionsDto,
    @Req() req: AgroRequest,
  ) {
    return this.submissions.syncBatch(
      user.organizationId,
      user.id,
      dto,
      req.agroContext,
    );
  }
}
