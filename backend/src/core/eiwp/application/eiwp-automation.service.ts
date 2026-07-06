import { Injectable, NotFoundException } from '@nestjs/common';
import { EiwpPrismaService } from '@/shared/infrastructure/database/eiwp-prisma.service';
import { EIWP_AUTOMATION_DEVICE_TYPES, buildAgronomicRecommendation, generateEiwpKey } from '../domain/eiwp.engine';
import { EiwpAuditService } from './eiwp-audit.service';

@Injectable()
export class EiwpAutomationService {
  constructor(
    private readonly prisma: EiwpPrismaService,
    private readonly audit: EiwpAuditService,
  ) {}

  deviceTypes() {
    return EIWP_AUTOMATION_DEVICE_TYPES;
  }

  listDevices(organizationId: string) {
    return this.prisma.eiwpAutomationDevice.findMany({
      where: { organizationId, status: 'active' },
      include: { commands: { take: 5, orderBy: { issuedAt: 'desc' } } },
    });
  }

  async registerDevice(
    organizationId: string,
    data: { name: string; deviceType: string; sectorId?: string; vendor?: string; metadata?: Record<string, unknown> },
  ) {
    const count = await this.prisma.eiwpAutomationDevice.count({ where: { organizationId } });
    const deviceKey = generateEiwpKey('AUT', count + 1);
    return this.prisma.eiwpAutomationDevice.create({
      data: {
        organizationId,
        deviceKey,
        name: data.name,
        deviceType: data.deviceType,
        sectorId: data.sectorId,
        vendor: data.vendor ?? 'generic',
        metadata: (data.metadata ?? {}) as object,
      },
    });
  }

  async issueCommand(
    organizationId: string,
    userId: string | undefined,
    data: { deviceKey: string; commandType: string; payload?: Record<string, unknown> },
  ) {
    const device = await this.prisma.eiwpAutomationDevice.findFirst({
      where: { organizationId, deviceKey: data.deviceKey },
    });
    if (!device) throw new NotFoundException('Dispositivo de automatización no encontrado');
    const count = await this.prisma.eiwpAutomationCommand.count({ where: { organizationId } });
    const commandKey = generateEiwpKey('CMD', count + 1);
    const cmd = await this.prisma.eiwpAutomationCommand.create({
      data: {
        organizationId,
        commandKey,
        deviceId: device.id,
        commandType: data.commandType,
        payload: (data.payload ?? {}) as object,
        status: 'pending',
      },
    });
    await this.audit.log(organizationId, 'EiwpAutomationCommand', commandKey, 'automation_command', userId, {
      commandType: data.commandType,
    });
    return cmd;
  }
}

@Injectable()
export class EiwpRecommendationService {
  constructor(private readonly prisma: EiwpPrismaService) {}

  list(organizationId: string, fieldLotId?: string) {
    return this.prisma.eiwpAgronomicRecommendation.findMany({
      where: { organizationId, status: 'active', ...(fieldLotId ? { fieldLotId } : {}) },
      orderBy: { generatedAt: 'desc' },
      take: 100,
    });
  }

  async generate(
    organizationId: string,
    data: {
      fieldLotId?: string;
      sectorId?: string;
      phenologyStage?: string;
      soilType?: string;
      deficitMm: number;
      excessMm: number;
      availabilityM3: number;
      temperatureC?: number;
    },
  ) {
    const text = buildAgronomicRecommendation(data);
    const count = await this.prisma.eiwpAgronomicRecommendation.count({ where: { organizationId } });
    const recKey = generateEiwpKey('REC', count + 1);
    return this.prisma.eiwpAgronomicRecommendation.create({
      data: {
        organizationId,
        recKey,
        fieldLotId: data.fieldLotId,
        sectorId: data.sectorId,
        phenologyStage: data.phenologyStage,
        soilType: data.soilType,
        recommendation: text,
        priority: data.deficitMm > 10 ? 'high' : 'medium',
        metadata: { deficitMm: data.deficitMm, excessMm: data.excessMm } as object,
      },
    });
  }
}

@Injectable()
export class EiwpFieldEventService {
  constructor(
    private readonly prisma: EiwpPrismaService,
    private readonly audit: EiwpAuditService,
  ) {}

  listRainfall(organizationId: string, fieldLotId?: string) {
    return this.prisma.eiwpRainfallEvent.findMany({
      where: { organizationId, ...(fieldLotId ? { fieldLotId } : {}) },
      orderBy: { recordedAt: 'desc' },
      take: 200,
    });
  }

  async recordRainfall(
    organizationId: string,
    userId: string,
    data: {
      fieldLotId?: string;
      farmUnitId?: string;
      depthMm: number;
      photoRefs?: string[];
      metadata?: Record<string, unknown>;
    },
  ) {
    const count = await this.prisma.eiwpRainfallEvent.count({ where: { organizationId } });
    const eventKey = generateEiwpKey('RN', count + 1);
    const row = await this.prisma.eiwpRainfallEvent.create({
      data: {
        organizationId,
        eventKey,
        fieldLotId: data.fieldLotId,
        farmUnitId: data.farmUnitId,
        depthMm: data.depthMm,
        recordedBy: userId,
        photoRefs: data.photoRefs ?? [],
        metadata: (data.metadata ?? {}) as object,
      },
    });
    await this.audit.log(organizationId, 'EiwpRainfallEvent', eventKey, 'rainfall_recorded', userId, {
      depthMm: data.depthMm,
    });
    return row;
  }

  listIncidents(organizationId: string) {
    return this.prisma.eiwpFieldIncident.findMany({
      where: { organizationId },
      orderBy: { recordedAt: 'desc' },
      take: 200,
    });
  }

  async recordIncident(
    organizationId: string,
    userId: string,
    data: {
      fieldLotId?: string;
      incidentType: string;
      description?: string;
      photoRefs?: string[];
      metadata?: Record<string, unknown>;
    },
  ) {
    const count = await this.prisma.eiwpFieldIncident.count({ where: { organizationId } });
    const incidentKey = generateEiwpKey('INC', count + 1);
    const row = await this.prisma.eiwpFieldIncident.create({
      data: {
        organizationId,
        incidentKey,
        fieldLotId: data.fieldLotId,
        incidentType: data.incidentType,
        description: data.description,
        recordedBy: userId,
        photoRefs: data.photoRefs ?? [],
        metadata: (data.metadata ?? {}) as object,
      },
    });
    await this.audit.log(organizationId, 'EiwpFieldIncident', incidentKey, 'incident_recorded', userId);
    return row;
  }
}
