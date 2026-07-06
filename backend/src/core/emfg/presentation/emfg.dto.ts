import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { EmfgBomLineType, EmfgOrderOrigin, EmfgOrderPriority, EmfgOrderStatus } from '@prisma/client';

export class EmfgCenterSeedDto {
  @IsOptional() @IsString() itemKey?: string;
}

export class EmfgProductionCenterDto {
  @IsOptional() @IsString() centerKey?: string;
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() installedCapacity?: number;
  @IsOptional() @IsString() calendarKey?: string;
}

export class EmfgProductionLineDto {
  @IsOptional() @IsString() lineKey?: string;
  @IsString() centerKey!: string;
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsNumber() installedCapacity?: number;
}

export class EmfgWorkCenterDto {
  @IsOptional() @IsString() workCenterKey?: string;
  @IsString() centerKey!: string;
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsNumber() installedCapacity?: number;
  @IsOptional() @IsNumber() costRate?: number;
}

export class EmfgMachineDto {
  @IsOptional() @IsString() machineKey?: string;
  @IsString() workCenterKey!: string;
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsNumber() capacityFactor?: number;
}

export class EmfgCalendarDto {
  @IsString() name!: string;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class EmfgCalendarDayDto {
  @IsString() calendarKey!: string;
  @IsNumber() dayOfWeek!: number;
  @IsOptional() @IsString() startTime?: string;
  @IsOptional() @IsString() endTime?: string;
  @IsOptional() @IsNumber() availableHours?: number;
  @IsOptional() @IsBoolean() isWorking?: boolean;
}

export class EmfgMasterPlanDto {
  @IsString() name!: string;
  @IsOptional() @IsNumber() horizonDays?: number;
  @IsOptional() @IsString() horizonStart?: string;
  @IsOptional() @IsString() calendarKey?: string;
  @IsOptional() @IsEnum(EmfgOrderPriority) priority?: EmfgOrderPriority;
}

export class EmfgMasterPlanLineDto {
  @IsString() itemKey!: string;
  @IsNumber() plannedQty!: number;
  @IsString() periodStart!: string;
  @IsString() periodEnd!: string;
  @IsOptional() @IsString() bomKey?: string;
  @IsOptional() @IsString() routingKey?: string;
  @IsOptional() @IsEnum(EmfgOrderPriority) priority?: EmfgOrderPriority;
}

export class EmfgGenerateOrdersDto {
  @IsString() centerKey!: string;
}

export class EmfgBomDto {
  @IsString() itemKey!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() version?: string;
  @IsOptional() @IsNumber() yieldPct?: number;
  @IsOptional() @IsNumber() scrapPct?: number;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class EmfgBomLineDto {
  @IsString() componentKey!: string;
  @IsEnum(EmfgBomLineType) lineType!: EmfgBomLineType;
  @IsNumber() quantity!: number;
  @IsOptional() @IsString() uomKey?: string;
  @IsOptional() @IsNumber() yieldPct?: number;
  @IsOptional() @IsNumber() scrapPct?: number;
  @IsOptional() @IsNumber() sequence?: number;
}

export class EmfgBomSubstitutionDto {
  @IsString() componentKey!: string;
  @IsString() substituteKey!: string;
  @IsOptional() @IsNumber() factor?: number;
  @IsOptional() @IsNumber() priority?: number;
}

export class EmfgBomExplodeDto {
  @IsNumber() orderQty!: number;
  @IsOptional() @IsBoolean() useSubstitutions?: boolean;
}

export class EmfgRoutingDto {
  @IsString() itemKey!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() version?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class EmfgRoutingOperationDto {
  @IsString() workCenterKey!: string;
  @IsString() name!: string;
  @IsNumber() sequence!: number;
  @IsOptional() @IsNumber() setupMinutes?: number;
  @IsOptional() @IsNumber() runMinutesPerUnit?: number;
  @IsOptional() @IsString() machineKey?: string;
}

export class EmfgProductionOrderDto {
  @IsString() itemKey!: string;
  @IsString() centerKey!: string;
  @IsNumber() plannedQty!: number;
  @IsOptional() @IsString() bomKey?: string;
  @IsOptional() @IsString() routingKey?: string;
  @IsOptional() @IsString() lineKey?: string;
  @IsOptional() @IsEnum(EmfgOrderOrigin) origin?: EmfgOrderOrigin;
  @IsOptional() @IsEnum(EmfgOrderPriority) priority?: EmfgOrderPriority;
  @IsOptional() @IsString() plannedStart?: string;
  @IsOptional() @IsString() plannedEnd?: string;
  @IsOptional() @IsString() responsibleKey?: string;
  @IsOptional() @IsString() planKey?: string;
  @IsOptional() @IsString() salesOrderKey?: string;
}

export class EmfgOrderStatusDto {
  @IsEnum(EmfgOrderStatus) status!: EmfgOrderStatus;
}

export class EmfgOrderProgressDto {
  @IsOptional() @IsString() orderOpKey?: string;
  @IsOptional() @IsNumber() qtyProduced?: number;
  @IsOptional() @IsNumber() qtyScrap?: number;
  @IsOptional() @IsString() notes?: string;
}

export class EmfgOperationStatusDto {
  @IsString() status!: string;
}

export class EmfgScheduleManualDto {
  @IsString() orderKey!: string;
  @IsOptional() @IsString() orderOpKey?: string;
  @IsString() workCenterKey!: string;
  @IsString() startAt!: string;
  @IsString() endAt!: string;
  @IsOptional() @IsNumber() loadMinutes?: number;
}

export class EmfgScheduleAutoDto {
  @IsOptional() @IsString() horizonStart?: string;
}

export class EmfgRescheduleDto {
  @IsString() newStart!: string;
  @IsString() newEnd!: string;
  @IsOptional() @IsString() reason?: string;
}
