import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { BI_DASHBOARD_CATEGORIES, BI_DATA_SOURCES, BI_REPORT_FORMATS } from '@agroerp/shared';

export class CreateDashboardDto {
  @IsString() @MaxLength(100) dashboardKey!: string;
  @IsString() @MaxLength(255) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn([...BI_DASHBOARD_CATEGORIES]) category?: string;
  @IsOptional() @IsObject() definition?: Record<string, unknown>;
  @IsOptional() @IsObject() settings?: Record<string, unknown>;
}

export class UpdateDashboardDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn([...BI_DASHBOARD_CATEGORIES]) category?: string;
  @IsOptional() @IsObject() definition?: Record<string, unknown>;
  @IsOptional() @IsObject() settings?: Record<string, unknown>;
  @IsOptional() @IsObject() permissions?: Record<string, unknown>;
}

export class ShareDashboardDto {
  @IsUUID() sharedWith!: string;
  @IsOptional() @IsIn(['read', 'write']) permission?: 'read' | 'write';
}

export class DuplicateDashboardDto {
  @IsOptional() @IsString() dashboardKey?: string;
  @IsOptional() @IsString() name?: string;
}

export class PublishDashboardDto {
  @IsOptional() @IsString() changelog?: string;
}

export class CreateKpiDto {
  @IsString() @MaxLength(100) kpiKey!: string;
  @IsString() @MaxLength(255) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() targetValue?: number;
  @IsOptional() @IsNumber() goalValue?: number;
  @IsOptional() @IsString() frequency?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsArray() alertRules?: unknown[];
  @IsOptional() @IsObject() queryDef?: Record<string, unknown>;
  @IsOptional() @IsUUID() responsibleId?: string;
  @IsOptional() @IsString() unit?: string;
}

export class UpdateKpiDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() targetValue?: number;
  @IsOptional() @IsNumber() goalValue?: number;
  @IsOptional() @IsString() frequency?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsArray() alertRules?: unknown[];
  @IsOptional() @IsObject() queryDef?: Record<string, unknown>;
  @IsOptional() @IsUUID() responsibleId?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class CaptureKpiDto {
  @IsOptional() @IsNumber() value?: number;
}

export class CreateReportDto {
  @IsString() @MaxLength(100) reportKey!: string;
  @IsString() @MaxLength(255) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsObject() queryDef!: Record<string, unknown>;
  @IsOptional() @IsArray() columns?: unknown[];
  @IsOptional() @IsArray() parameters?: unknown[];
}

export class UpdateReportDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsObject() queryDef?: Record<string, unknown>;
  @IsOptional() @IsArray() columns?: unknown[];
  @IsOptional() @IsArray() parameters?: unknown[];
  @IsOptional() @IsString() status?: string;
}

export class RunReportDto {
  @IsOptional() @IsIn([...BI_REPORT_FORMATS]) format?: string;
  @IsOptional() @IsObject() parameters?: Record<string, unknown>;
}

export class ScheduleReportDto {
  @IsOptional() @IsString() cronExpression?: string;
  @IsString() nextRunAt!: string;
  @IsOptional() @IsIn([...BI_REPORT_FORMATS]) format?: string;
  @IsOptional() @IsArray() recipients?: string[];
}

export class CreateQueryDto {
  @IsString() @MaxLength(100) queryKey!: string;
  @IsString() @MaxLength(255) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsIn([...BI_DATA_SOURCES]) dataSource!: string;
  @IsObject() definition!: Record<string, unknown>;
  @IsOptional() @IsArray() parameters?: unknown[];
}

export class UpdateQueryDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsObject() definition?: Record<string, unknown>;
  @IsOptional() @IsArray() parameters?: unknown[];
}

export class PreviewQueryDto {
  @IsObject() definition!: Record<string, unknown>;
}

export class ExportDataDto {
  @IsArray() rows!: Record<string, unknown>[];
  @IsOptional() @IsArray() columns?: Array<{ key: string; label: string }>;
  @IsIn([...BI_REPORT_FORMATS]) format!: string;
  @IsOptional() @IsString() title?: string;
}

export class ResolveWidgetsDto {
  @IsArray() widgets!: Record<string, unknown>[];
  @IsOptional() @IsString() category?: string;
}

export class AnalysisRankingDto {
  @IsIn([...BI_DATA_SOURCES]) dataSource!: string;
  @IsString() groupField!: string;
  @IsOptional() @IsString() metricField?: string;
  @IsOptional() @IsIn(['count', 'sum', 'avg', 'min', 'max']) fn?: 'count' | 'sum' | 'avg';
  @IsOptional() @IsNumber() @Min(1) limit?: number;
}

export class AnalysisCompareDto {
  @IsIn([...BI_DATA_SOURCES]) dataSource!: string;
  @IsString() groupField!: string;
  @IsOptional() @IsIn(['previous_period', 'previous_year']) period?: 'previous_period' | 'previous_year';
}
