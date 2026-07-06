import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { HpaPersonalService } from '../application/hpa-personal.service';
import { HpaAnalyticsService } from '../application/hpa-analytics.service';
import { HpaNotificationService } from '../application/hpa-notification.service';
import { HpaAiService } from '../application/hpa-ai.service';
import { HpaAuditService } from '../application/hpa-audit.service';
import type { AiCapabilityCode } from '../domain/hpa-analytics.engine';

class HpaAiProviderDto {
  @IsOptional() @IsString() configKey?: string;
  @IsString() providerName!: string;
  @IsOptional() @IsString() baseUrl?: string;
  @IsOptional() @IsString() apiKeyRef?: string;
  @IsOptional() @IsArray() capabilities?: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@ApiTags('Portal — Analítica, KPIs e IA')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('portal/analytics')
export class HpaController {
  constructor(
    private readonly personal: HpaPersonalService,
    private readonly analytics: HpaAnalyticsService,
    private readonly notifications: HpaNotificationService,
    private readonly ai: HpaAiService,
    private readonly audit: HpaAuditService,
  ) {}

  @Get('personal-dashboard')
  @RequirePermissions('portal:read')
  personalDashboard(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.personal.personalDashboard(user.organizationId, user.id, employeeKey);
  }

  @Get('kpis')
  @RequirePermissions('hcm:hpa_read')
  kpis(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('companyKey') companyKey?: string,
    @Query('branchKey') branchKey?: string,
    @Query('departmentKey') departmentKey?: string,
  ) {
    return this.analytics.kpis(user.organizationId, user.id, { from, to, companyKey, branchKey, departmentKey });
  }

  @Get('center')
  @RequirePermissions('hcm:hpa_read')
  analyticsCenter(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analytics.analytics(user.organizationId, user.id, { from, to });
  }

  @Post('export')
  @RequirePermissions('hcm:hpa_export')
  exportAnalytics(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analytics.exportAnalytics(user.organizationId, user.id, { from, to });
  }

  @Get('load-check')
  @RequirePermissions('hcm:hpa_read')
  loadCheck(@CurrentUser() user: { organizationId: string }) {
    return this.analytics.loadCheck(user.organizationId);
  }

  @Get('notifications')
  @RequirePermissions('portal:read')
  async notificationsList(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    const key = await this.personal.resolveEmployeeKey(user.organizationId, user.id, employeeKey);
    return this.notifications.refreshForEmployee(user.organizationId, key, user.id);
  }

  @Post('notifications/:notificationKey/read')
  @RequirePermissions('portal:read')
  markRead(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('notificationKey') notificationKey: string,
  ) {
    return this.notifications.markRead(user.organizationId, notificationKey, user.id);
  }

  @Get('ai')
  @RequirePermissions('hcm:hpa_ai')
  aiPanel(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.ai.panel(user.organizationId, user.id, employeeKey);
  }

  @Get('ai/capabilities')
  @RequirePermissions('hcm:hpa_ai')
  aiCapabilities() {
    return this.ai.capabilities();
  }

  @Get('ai/providers')
  @RequirePermissions('hcm:hpa_ai')
  aiProviders(@CurrentUser() user: { organizationId: string }) {
    return this.ai.listProviders(user.organizationId);
  }

  @Post('ai/providers')
  @RequirePermissions('hcm:hpa_config')
  upsertProvider(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HpaAiProviderDto) {
    return this.ai.upsertProvider(user.organizationId, user.id, dto);
  }

  @Get('ai/insights/:capability')
  @RequirePermissions('hcm:hpa_ai')
  aiInsight(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('capability') capability: AiCapabilityCode,
    @Query('employeeKey') employeeKey?: string,
  ) {
    return this.ai.insight(user.organizationId, user.id, capability, employeeKey);
  }

  @Get('mobile/sync')
  @RequirePermissions('portal:read')
  async mobileSync(
    @CurrentUser() user: { id: string; organizationId: string },
    @Query('employeeKey') employeeKey?: string,
  ) {
    const personal = await this.personal.personalDashboard(user.organizationId, user.id, employeeKey);
    return {
      personal,
      notifications: personal.notifications,
      objectives: personal.activeObjectives,
      performance: personal.pendingEvaluations,
      vacationsAvailable: personal.vacationsAvailable,
      courses: personal.upcomingCourses,
      syncedAt: new Date().toISOString(),
    };
  }

  @Get('audit')
  @RequirePermissions('hcm:hpa_audit')
  auditLogs(@CurrentUser() user: { organizationId: string }) {
    return this.audit.list(user.organizationId);
  }
}
