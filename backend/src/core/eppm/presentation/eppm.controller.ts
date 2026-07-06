import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EppmPluginDefinition } from '@agroerp/shared';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { PluginRegistryService } from '../application/plugin-registry.service';
import { PluginMarketplaceService } from '../application/plugin-marketplace.service';
import { PluginLifecycleService } from '../application/plugin-lifecycle.service';
import { PluginUpdateService } from '../application/plugin-update.service';
import { PluginMetricsService } from '../application/plugin-metrics.service';
import { PluginAiService } from '../application/plugin-ai.service';
import { PluginAuditService } from '../application/plugin-audit.service';
import { PluginSdkService } from '../application/plugin-sdk.service';
import { PluginDeveloperService } from '../application/plugin-developer.service';
import { PluginExtensionPointsService } from '../application/plugin-extension-points.service';
import { PluginSpiService } from '../application/plugin-spi.service';
import {
  CloneConfigDto,
  CreateEppmPluginDto,
  InstallPluginDto,
  PluginReviewDto,
  RegisterDeveloperDto,
  ScheduleUpdateDto,
  ToggleAutoUpdateDto,
  ValidateManifestDto,
} from './eppm.dto';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@ApiTags('EPPM — Enterprise Plugin Platform & Marketplace')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('eppm')
export class EppmController {
  constructor(
    private readonly registry: PluginRegistryService,
    private readonly marketplace: PluginMarketplaceService,
    private readonly lifecycle: PluginLifecycleService,
    private readonly updates: PluginUpdateService,
    private readonly metrics: PluginMetricsService,
    private readonly ai: PluginAiService,
    private readonly auditService: PluginAuditService,
    private readonly sdk: PluginSdkService,
    private readonly developerService: PluginDeveloperService,
    private readonly extensionPointsService: PluginExtensionPointsService,
    private readonly spi: PluginSpiService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('center')
  @RequirePermissions('plugin:read')
  async center(@CurrentUser() user: { organizationId: string }) {
    const [dashboard, suggestions, installs] = await Promise.all([
      this.metrics.dashboard(user.organizationId),
      this.ai.recommend(user.organizationId),
      this.lifecycle.findInstalls(user.organizationId),
    ]);
    return { dashboard, suggestions, installs };
  }

  @Get('marketplace')
  @RequirePermissions('plugin:read')
  searchMarketplace(
    @CurrentUser() user: { organizationId: string },
    @Query('q') q?: string,
    @Query('categoryKey') categoryKey?: string,
    @Query('pluginType') pluginType?: string,
  ) {
    return this.marketplace.search({ q, categoryKey, pluginType, organizationId: user.organizationId });
  }

  @Get('marketplace/categories')
  @RequirePermissions('plugin:read')
  categories() {
    return this.registry.listCategories();
  }

  @Get('marketplace/:pluginKey')
  @RequirePermissions('plugin:read')
  getMarketplacePlugin(@Param('pluginKey') pluginKey: string) {
    return this.registry.findOne(pluginKey);
  }

  @Post('marketplace/:pluginKey/reviews')
  @RequirePermissions('plugin:read')
  reviewPlugin(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('pluginKey') pluginKey: string,
    @Body() dto: PluginReviewDto,
  ) {
    return this.marketplace.addReview(user.organizationId, user.id, pluginKey, dto.rating, dto.comment);
  }

  @Get('plugins')
  @RequirePermissions('plugin:read')
  listInstalled(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: string,
  ) {
    return this.lifecycle.findInstalls(user.organizationId, status);
  }

  @Post('plugins')
  @RequirePermissions('plugin:publish')
  createPlugin(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: CreateEppmPluginDto,
  ) {
    return this.registry.create(user.id, dto as EppmPluginDefinition, user.organizationId);
  }

  @Post('plugins/:pluginKey/publish')
  @RequirePermissions('plugin:publish')
  publishPlugin(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('pluginKey') pluginKey: string,
  ) {
    return this.registry.publish(pluginKey, user.id, user.organizationId);
  }

  @Get('plugins/:pluginKey/versions')
  @RequirePermissions('plugin:read')
  listVersions(@Param('pluginKey') pluginKey: string) {
    return this.registry.listVersions(pluginKey);
  }

  @Post('plugins/:pluginKey/install')
  @RequirePermissions('plugin:install')
  installPlugin(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('pluginKey') pluginKey: string,
    @Body() dto: InstallPluginDto,
  ) {
    return this.lifecycle.install(user.organizationId, user.id, pluginKey, dto.config, dto.version);
  }

  @Post('installs/:id/enable')
  @RequirePermissions('plugin:update')
  enable(@CurrentUser() user: { id: string; organizationId: string }, @Param('id') id: string) {
    return this.lifecycle.enable(user.organizationId, user.id, id);
  }

  @Post('installs/:id/disable')
  @RequirePermissions('plugin:update')
  disable(@CurrentUser() user: { id: string; organizationId: string }, @Param('id') id: string) {
    return this.lifecycle.disable(user.organizationId, user.id, id);
  }

  @Post('installs/:id/uninstall')
  @RequirePermissions('plugin:uninstall')
  uninstall(@CurrentUser() user: { id: string; organizationId: string }, @Param('id') id: string) {
    return this.lifecycle.uninstall(user.organizationId, user.id, id);
  }

  @Post('installs/:id/clone-config')
  @RequirePermissions('plugin:install')
  cloneConfig(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: CloneConfigDto,
  ) {
    return this.lifecycle.cloneConfig(user.organizationId, user.id, id, dto.targetPluginKey);
  }

  @Patch('installs/:id/auto-update')
  @RequirePermissions('plugin:update')
  async toggleAutoUpdate(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Body() dto: ToggleAutoUpdateDto,
  ) {
    return this.prisma.eppmPluginInstall.updateMany({
      where: { id, organizationId: user.organizationId },
      data: { autoUpdate: dto.autoUpdate },
    });
  }

  @Get('updates')
  @RequirePermissions('plugin:read')
  listUpdates(@CurrentUser() user: { organizationId: string }) {
    return this.updates.listJobs(user.organizationId);
  }

  @Post('installs/:id/schedule-update')
  @RequirePermissions('plugin:update')
  scheduleUpdate(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @Body() dto: ScheduleUpdateDto,
  ) {
    return this.updates.scheduleUpdate(
      user.organizationId,
      user.id,
      id,
      dto.toVersion,
      dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
    );
  }

  @Post('updates/:jobId/execute')
  @RequirePermissions('plugin:update')
  executeUpdate(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('jobId') jobId: string,
  ) {
    return this.updates.executeUpdate(user.organizationId, user.id, jobId);
  }

  @Post('installs/:id/rollback')
  @RequirePermissions('plugin:update')
  rollback(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
  ) {
    return this.updates.rollback(user.organizationId, user.id, id);
  }

  @Get('updates/compare')
  @RequirePermissions('plugin:read')
  compareVersions(
    @Query('pluginKey') pluginKey: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.updates.compareVersions(pluginKey, from, to);
  }

  @Get('extension-points')
  @RequirePermissions('plugin:read')
  listExtensionPoints() {
    return this.extensionPointsService.findAll();
  }

  @Get('spi/providers')
  @RequirePermissions('plugin:read')
  spiProviders() {
    return this.spi.listProviders();
  }

  @Get('audit')
  @RequirePermissions('plugin:audit:read')
  listAudit(
    @CurrentUser() user: { organizationId: string },
    @Query('pluginKey') pluginKey?: string,
  ) {
    return this.auditService.findAll(user.organizationId, pluginKey);
  }

  @Get('ai/suggestions')
  @RequirePermissions('plugin:read')
  aiSuggestions(@CurrentUser() user: { organizationId: string }) {
    return this.ai.recommend(user.organizationId);
  }

  @Get('developers')
  @RequirePermissions('plugin:developer:manage')
  listDevelopers(@CurrentUser() user: { organizationId: string }) {
    return this.developerService.findAll(user.organizationId);
  }

  @Post('developers')
  @RequirePermissions('plugin:developer:manage')
  registerDeveloper(
    @CurrentUser() user: { organizationId: string },
    @Body() dto: RegisterDeveloperDto,
  ) {
    return this.developerService.register(user.organizationId, dto);
  }

  @Post('sdk/validate')
  @RequirePermissions('plugin:developer:manage')
  validateManifest(@Body() dto: ValidateManifestDto) {
    return this.sdk.validateManifest(dto.manifest as never);
  }

  @Post('sdk/package')
  @RequirePermissions('plugin:developer:manage')
  packageManifest(@Body() dto: ValidateManifestDto) {
    return this.sdk.packageManifest(dto.manifest as never);
  }

  @Get('sdk/template/:pluginType')
  @RequirePermissions('plugin:developer:manage')
  sdkTemplate(@Param('pluginType') pluginType: string) {
    return this.sdk.getTemplate(pluginType);
  }

  @Get('mobile/installed')
  @ApiOperation({ summary: 'Plugins instalados para móvil' })
  @RequirePermissions('plugin:read')
  async mobileInstalled(@CurrentUser() user: { organizationId: string }) {
    const installs = await this.lifecycle.findInstalls(user.organizationId, 'enabled');
    return {
      plugins: installs.map((i) => ({
        pluginKey: i.pluginKey,
        name: i.plugin.name,
        version: i.installedVersion,
        pluginType: i.plugin.pluginType,
        config: i.config,
      })),
      syncedAt: new Date().toISOString(),
    };
  }

  @Get('mobile/resources')
  @ApiOperation({ summary: 'Recursos móviles de plugins' })
  @RequirePermissions('plugin:read')
  async mobileResources(@CurrentUser() user: { organizationId: string }) {
    const installs = await this.lifecycle.findInstalls(user.organizationId, 'enabled');
    const mobile = installs.filter((i) => i.plugin.pluginType === 'mobile_component');
    return mobile.map((i) => {
      const manifest = i.plugin.manifest as { mobile?: { screens?: unknown[] } };
      return {
        pluginKey: i.pluginKey,
        screens: manifest.mobile?.screens ?? [],
        version: i.installedVersion,
      };
    });
  }
}
