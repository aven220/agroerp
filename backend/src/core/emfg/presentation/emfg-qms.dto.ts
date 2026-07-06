import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import {
  EmfgQmsCapaType, EmfgQmsEvidenceType, EmfgQmsInspectionType,
  EmfgQmsNcSeverity, EmfgQmsPlanScope,
} from '@prisma/client';

export class EmfgQmsPlanDto {
  @IsString()
  name!: string;

  @IsEnum(EmfgQmsPlanScope)
  scope!: EmfgQmsPlanScope;

  @IsOptional()
  @IsString()
  itemKey?: string;

  @IsOptional()
  @IsString()
  supplierKey?: string;

  @IsOptional()
  @IsString()
  processKey?: string;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @IsArray()
  criteria?: Array<{
    name: string; unit?: string; minValue?: number; maxValue?: number;
    targetValue?: number; acceptText?: string; rejectText?: string; sequence?: number;
  }>;
}

export class EmfgQmsInspectionDto {
  @IsEnum(EmfgQmsInspectionType)
  inspectionType!: EmfgQmsInspectionType;

  @IsOptional()
  @IsString()
  planKey?: string;

  @IsOptional()
  @IsString()
  itemKey?: string;

  @IsOptional()
  @IsString()
  lotKey?: string;

  @IsOptional()
  @IsString()
  orderKey?: string;

  @IsOptional()
  @IsString()
  supplierKey?: string;

  @IsOptional()
  @IsString()
  purchaseKey?: string;

  @IsOptional()
  @IsString()
  lineKey?: string;

  @IsOptional()
  @IsString()
  inspectorKey?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class EmfgQmsMeasurementDto {
  @IsOptional()
  @IsString()
  criterionKey?: string;

  @IsString()
  name!: string;

  @IsNumber()
  value!: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  minValue?: number;

  @IsOptional()
  @IsNumber()
  maxValue?: number;
}

export class EmfgQmsEvidenceDto {
  @IsEnum(EmfgQmsEvidenceType)
  evidenceType!: EmfgQmsEvidenceType;

  @IsString()
  value!: string;

  @IsOptional()
  @IsString()
  storageUrl?: string;
}

export class EmfgQmsNcDto {
  @IsOptional()
  @IsString()
  inspectionKey?: string;

  @IsOptional()
  @IsString()
  lotKey?: string;

  @IsOptional()
  @IsString()
  orderKey?: string;

  @IsOptional()
  @IsString()
  itemKey?: string;

  @IsOptional()
  @IsString()
  supplierKey?: string;

  @IsString()
  classification!: string;

  @IsEnum(EmfgQmsNcSeverity)
  severity!: EmfgQmsNcSeverity;

  @IsString()
  origin!: string;

  @IsOptional()
  @IsString()
  impact?: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  responsibleKey?: string;
}

export class EmfgQmsCapaDto {
  @IsOptional()
  @IsString()
  ncKey?: string;

  @IsEnum(EmfgQmsCapaType)
  capaType!: EmfgQmsCapaType;

  @IsString()
  title!: string;

  @IsString()
  actionPlan!: string;

  @IsOptional()
  @IsString()
  responsibleKey?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;
}

export class EmfgQmsCapaVerifyDto {
  @IsBoolean()
  effective!: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class EmfgQmsReleaseDecisionDto {
  @IsString()
  action!: 'approve' | 'reject' | 'hold';

  @IsOptional()
  @IsString()
  reason?: string;
}

export class EmfgQmsOfflineBatchDto {
  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsArray()
  actions!: Array<{ type: string; inspectionKey?: string; payload: Record<string, unknown> }>;
}
