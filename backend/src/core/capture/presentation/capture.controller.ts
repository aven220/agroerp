import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CaptureQueryService } from '../application/capture-query.service';
import { CaptureSyncService } from '../application/capture-sync.service';
import { CapturePackageService } from '../application/capture-package.service';
import { CaptureCatalogService } from '../application/capture-catalog.service';
import { CaptureSyncDto } from './capture.dto';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { AgroRequest } from '@/core/engine/middleware/request-context.middleware';

@ApiTags('Capture Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('capture')
export class CaptureController {
  constructor(
    private readonly query: CaptureQueryService,
    private readonly sync: CaptureSyncService,
    private readonly packages: CapturePackageService,
    private readonly catalogs: CaptureCatalogService,
  ) {}

  @Get('mobile/package')
  @RequirePermissions('form:read')
  @ApiOperation({
    summary: 'Download complete offline capture package',
    description:
      'Returns assigned forms with full definitions, rules, catalogs keys and offline settings in a single payload.',
  })
  getMobilePackage(
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.packages.buildMobilePackage(user.organizationId, user.id);
  }

  @Get('mobile/check-version')
  @RequirePermissions('form:read')
  @ApiOperation({
    summary: 'Check if mobile package has changed',
    description:
      'Compare client packageVersion with server to detect form updates, new versions or pending assignments.',
  })
  checkMobilePackageVersion(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('packageVersion') packageVersion?: string,
  ) {
    return this.packages.checkVersion(
      user.organizationId,
      user.id,
      packageVersion,
    );
  }

  @Get('catalogs')
  @RequirePermissions('form:read')
  @ApiOperation({
    summary: 'Dynamic catalogs for offline capture',
    description:
      'Returns configurable lists (departments, municipalities, crops, etc.). Optional keys filter.',
  })
  getCatalogs(@Query('keys') keys?: string) {
    const keyList = keys
      ? keys.split(',').map((k) => k.trim()).filter(Boolean)
      : undefined;
    return this.catalogs.getCatalogs(keyList);
  }

  @Get('forms/available')
  @RequirePermissions('form:read')
  @ApiOperation({
    summary: 'Published forms available for mobile capture',
    description:
      'Returns offline-capable published forms for the authenticated user organization.',
  })
  getAvailableForms(
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.query.getAvailableForms(user.organizationId, user.id);
  }

  @Get('forms/:id')
  @RequirePermissions('form:read')
  @ApiOperation({
    summary: 'Form definition ready for mobile rendering',
    description:
      'Returns schema, active version, fields, rules, options and render metadata.',
  })
  getFormDefinition(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
  ) {
    return this.query.getFormDefinition(user.organizationId, id);
  }

  @Post('sync')
  @RequirePermissions('form:submit')
  @ApiOperation({
    summary: 'Batch sync mobile submissions',
    description:
      'Accepts submissions, device metadata and optional file references. Delegates to Form Engine sync.',
  })
  syncSubmissions(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CaptureSyncDto,
    @Req() req: AgroRequest,
  ) {
    return this.sync.sync(
      user.organizationId,
      user.id,
      dto,
      req.agroContext,
    );
  }
}
