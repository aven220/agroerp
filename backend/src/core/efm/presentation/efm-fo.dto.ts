import { IsBoolean, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import type { EfmFoClosingType, EfmFoReportCategory, EfmFoReportFormat, EfmFoStatementType } from '@prisma/client';

export class EfmFoGenerateStatementDto {
  @IsString()
  statementType!: EfmFoStatementType;

  @IsString()
  periodKey!: string;

  @IsOptional()
  @IsString()
  comparePeriodKey?: string;

  @IsOptional()
  @IsString()
  companyKey?: string;

  @IsOptional()
  @IsString()
  branchKey?: string;

  @IsOptional()
  @IsBoolean()
  isConsolidated?: boolean;
}

export class EfmFoStatementNoteDto {
  @IsNumber()
  noteNumber!: number;

  @IsString()
  title!: string;

  @IsString()
  content!: string;
}

export class EfmFoStartClosingDto {
  @IsString()
  periodKey!: string;

  @IsOptional()
  @IsString()
  closingType?: EfmFoClosingType;

  @IsOptional()
  @IsString()
  companyKey?: string;

  @IsOptional()
  @IsString()
  branchKey?: string;
}

export class EfmFoReopenClosingDto {
  @IsString()
  reason!: string;
}

export class EfmFoLockPeriodDto {
  @IsString()
  periodKey!: string;
}

export class EfmFoGenerateReportDto {
  @IsString()
  name!: string;

  @IsString()
  category!: EfmFoReportCategory;

  @IsString()
  reportType!: string;

  @IsOptional()
  @IsString()
  periodKey?: string;

  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;
}

export class EfmFoExportReportDto {
  @IsString()
  format!: EfmFoReportFormat;
}

export class EfmFoCustomReportDto {
  @IsOptional()
  @IsString()
  customReportKey?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  definition!: Record<string, unknown>;
}

export class EfmFoScenarioDto {
  @IsString()
  name!: string;

  @IsString()
  basePeriodKey!: string;

  @IsOptional()
  @IsNumber()
  horizonMonths?: number;

  @IsOptional()
  @IsNumber()
  revenueGrowthPct?: number;

  @IsOptional()
  @IsNumber()
  expenseGrowthPct?: number;
}

export class EfmFoRunCustomReportDto {
  @IsOptional()
  @IsString()
  periodKey?: string;
}
