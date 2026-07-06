import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  EpopBundleMetricPayload,
  EpopCacheSetPayload,
  EpopMobilePerfPayload,
  EpopPerfMetricPayload,
  EpopSlowQueryPayload,
} from '@agroerp/shared';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { PerfCenterService } from '../application/perf-center.service';
import { PerfCacheService } from '../application/perf-cache.service';
import { PerfQueryService } from '../application/perf-query.service';
import { PerfMetricsService } from '../application/perf-metrics.service';
import { PerfDbService } from '../application/perf-db.service';
import { PerfBenchmarkService } from '../application/perf-benchmark.service';
import { PerfPaginationService } from '../application/perf-pagination.service';
import { PerfBundleService } from '../application/perf-bundle.service';
import { PerfMobileService } from '../application/perf-mobile.service';
import { PerfAuditService } from '../application/perf-audit.service';
import {
  ArchiveJobDto,
  BenchmarkDto,
  BundleMetricDto,
  CacheSetDto,
  MobilePerfDto,
  PartitionJobDto,
  PerfMetricBatchDto,
  PerfMetricDto,
  SlowQueryDto,
} from './epop.dto';

@ApiTags('EPOP — Enterprise Performance & Optimization Platform')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('epop')
export class EpopController {
  constructor(
    private readonly center: PerfCenterService,
    private readonly cache: PerfCacheService,
    private readonly queries: PerfQueryService,
    private readonly metrics: PerfMetricsService,
    private readonly db: PerfDbService,
    private readonly benchmarks: PerfBenchmarkService,
    private readonly pagination: PerfPaginationService,
    private readonly bundles: PerfBundleService,
    private readonly mobile: PerfMobileService,
    private readonly audit: PerfAuditService,
  ) {}

  @Get('center')
  @RequirePermissions('performance:read')
  performanceCenter(@CurrentUser() user: { organizationId: string }) {
    return this.center.dashboard(user.organizationId);
  }

  @Get('cache/stats/summary')
  @RequirePermissions('performance:read')
  cacheStats(@CurrentUser() user: { organizationId: string }) {
    return this.cache.stats(user.organizationId);
  }

  @Post('cache/purge')
  @RequirePermissions('performance:admin')
  purgeCache() {
    return this.cache.purgeExpired();
  }

  @Get('cache/:cacheKey')
  @RequirePermissions('performance:cache:manage')
  getCache(
    @CurrentUser() user: { organizationId: string },
    @Param('cacheKey') cacheKey: string,
    @Query('layer') layer?: string,
  ) {
    return this.cache.get(user.organizationId, cacheKey, (layer as 'server') ?? 'server');
  }

  @Post('cache')
  @RequirePermissions('performance:cache:manage')
  setCache(@CurrentUser() user: { organizationId: string }, @Body() dto: CacheSetDto) {
    return this.cache.set(user.organizationId, dto as EpopCacheSetPayload);
  }

  @Delete('cache/:cacheKey')
  @RequirePermissions('performance:cache:manage')
  invalidateCache(@Param('cacheKey') cacheKey: string, @Query('layer') layer?: string) {
    return this.cache.invalidate(cacheKey, (layer as 'server') ?? 'server');
  }

  @Get('slow-queries')
  @RequirePermissions('performance:read')
  listSlowQueries(
    @CurrentUser() user: { organizationId: string },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.pagination.paginateSlowQueries(user.organizationId, {
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 25,
    });
  }

  @Post('slow-queries')
  @RequirePermissions('performance:optimize')
  recordSlowQuery(@CurrentUser() user: { organizationId: string }, @Body() dto: SlowQueryDto) {
    return this.queries.recordSlowQuery(user.organizationId, dto as EpopSlowQueryPayload);
  }

  @Get('indexes')
  @RequirePermissions('performance:read')
  listIndexes(@Query('status') status?: string) {
    return this.queries.listIndexRecommendations(status);
  }

  @Post('indexes/analyze')
  @RequirePermissions('performance:optimize')
  analyzeIndexes(@CurrentUser() user: { organizationId: string }) {
    return this.queries.analyzeAndOptimize(user.organizationId);
  }

  @Post('indexes/:recommendationKey/apply')
  @RequirePermissions('performance:admin')
  applyIndex(
    @CurrentUser() user: { id: string },
    @Param('recommendationKey') recommendationKey: string,
  ) {
    return this.queries.applyIndexRecommendation(recommendationKey, user.id);
  }

  @Get('metrics')
  @RequirePermissions('performance:read')
  listMetrics(
    @CurrentUser() user: { organizationId: string },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('kind') kind?: string,
  ) {
    return this.pagination.paginatePerfMetrics(
      user.organizationId,
      { page: page ? Number(page) : 1, pageSize: pageSize ? Number(pageSize) : 25 },
      kind,
    );
  }

  @Get('metrics/dashboard')
  @RequirePermissions('performance:read')
  metricsDashboard(@CurrentUser() user: { organizationId: string }) {
    return this.metrics.dashboard(user.organizationId);
  }

  @Post('metrics')
  @RequirePermissions('performance:optimize')
  ingestMetric(@CurrentUser() user: { organizationId: string }, @Body() dto: PerfMetricDto) {
    return this.metrics.ingest(user.organizationId, dto as EpopPerfMetricPayload);
  }

  @Post('metrics/batch')
  @RequirePermissions('performance:optimize')
  ingestMetricBatch(@CurrentUser() user: { organizationId: string }, @Body() dto: PerfMetricBatchDto) {
    return this.metrics.ingestBatch(user.organizationId, dto.metrics as EpopPerfMetricPayload[]);
  }

  @Get('metrics/stream')
  @RequirePermissions('performance:read')
  @Header('Content-Type', 'application/x-ndjson')
  @ApiOperation({ summary: 'Streaming NDJSON de métricas' })
  async streamMetrics(@CurrentUser() user: { organizationId: string }) {
    return this.pagination.streamMetrics(user.organizationId);
  }

  @Get('partitions')
  @RequirePermissions('performance:read')
  listPartitions() {
    return this.db.listPartitionJobs();
  }

  @Post('partitions')
  @RequirePermissions('performance:admin')
  schedulePartition(@CurrentUser() user: { organizationId: string }, @Body() dto: PartitionJobDto) {
    return this.db.schedulePartition(user.organizationId, dto.tableName, dto.strategy);
  }

  @Post('partitions/:jobKey/run')
  @RequirePermissions('performance:admin')
  runPartition(@Param('jobKey') jobKey: string) {
    return this.db.runPartition(jobKey);
  }

  @Get('archives')
  @RequirePermissions('performance:read')
  listArchives() {
    return this.db.listArchiveJobs();
  }

  @Post('archives')
  @RequirePermissions('performance:admin')
  scheduleArchive(@CurrentUser() user: { organizationId: string }, @Body() dto: ArchiveJobDto) {
    return this.db.scheduleArchive(user.organizationId, dto.tableName, dto.olderThanDays);
  }

  @Post('archives/:jobKey/run')
  @RequirePermissions('performance:admin')
  runArchive(@Param('jobKey') jobKey: string) {
    return this.db.runArchive(jobKey);
  }

  @Get('maintenance')
  @RequirePermissions('performance:read')
  listMaintenance() {
    return this.db.listMaintenanceJobs();
  }

  @Post('maintenance/:jobKey/run')
  @RequirePermissions('performance:admin')
  runMaintenance(@Param('jobKey') jobKey: string) {
    return this.db.runMaintenance(jobKey);
  }

  @Get('benchmarks')
  @RequirePermissions('performance:read')
  listBenchmarks(@CurrentUser() user: { organizationId: string }) {
    return this.benchmarks.list(user.organizationId);
  }

  @Post('benchmarks')
  @RequirePermissions('performance:benchmark')
  runBenchmark(@CurrentUser() user: { organizationId: string }, @Body() dto: BenchmarkDto) {
    return this.benchmarks.run(user.organizationId, dto.name, dto.scenario);
  }

  @Get('bundles')
  @RequirePermissions('performance:read')
  listBundles(@Query('platform') platform?: string) {
    return this.bundles.list(platform);
  }

  @Get('bundles/summary')
  @RequirePermissions('performance:read')
  bundleSummary() {
    return this.bundles.summary('web');
  }

  @Post('bundles')
  @RequirePermissions('performance:optimize')
  recordBundle(@CurrentUser() user: { organizationId: string }, @Body() dto: BundleMetricDto) {
    return this.bundles.record(user.organizationId, dto as EpopBundleMetricPayload);
  }

  @Get('mobile')
  @RequirePermissions('performance:read')
  mobileSummary(@CurrentUser() user: { organizationId: string }) {
    return this.mobile.summary(user.organizationId);
  }

  @Get('mobile/samples')
  @RequirePermissions('performance:read')
  mobileSamples(@CurrentUser() user: { organizationId: string }) {
    return this.mobile.list(user.organizationId);
  }

  @Post('mobile')
  @RequirePermissions('performance:optimize')
  ingestMobile(@CurrentUser() user: { organizationId: string }, @Body() dto: MobilePerfDto) {
    return this.mobile.ingest(user.organizationId, dto as EpopMobilePerfPayload);
  }

  @Get('audit')
  @RequirePermissions('performance:audit:read')
  listAudit(@CurrentUser() user: { organizationId: string }) {
    return this.audit.findAll(user.organizationId);
  }
}
