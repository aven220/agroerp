import { Injectable } from '@nestjs/common';
import { EacePrismaService } from '@/shared/infrastructure/database/eace-prisma.service';
import { computeContractCompliance, generateEaceKey } from '../domain/eace.engine';
import { EaceAuditService } from './eace-audit.service';
import { EaceNotificationService } from './eace-notification.service';

@Injectable()
export class EaceContractService {
  constructor(
    private readonly prisma: EacePrismaService,
    private readonly audit: EaceAuditService,
    private readonly notifications: EaceNotificationService,
  ) {}

  listContracts(organizationId: string, status?: string) {
    return this.prisma.eaceAgContract.findMany({
      where: { organizationId, ...(status ? { status: status as never } : {}) },
      include: { crops: true, schedules: true, compliance: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getContract(organizationId: string, contractKey: string) {
    return this.prisma.eaceAgContract.findFirst({
      where: { organizationId, contractKey },
      include: { crops: true, schedules: true, compliance: true },
    });
  }

  async createContract(organizationId: string, userId: string, data: {
    producerRef: string; title: string; buyerRef?: string; contractNumber?: string;
    startDate?: string; endDate?: string; conditions?: Record<string, unknown>; pricing?: Record<string, unknown>;
  }) {
    const count = await this.prisma.eaceAgContract.count({ where: { organizationId } });
    const contract = await this.prisma.eaceAgContract.create({
      data: {
        organizationId,
        contractKey: generateEaceKey('CTR', count + 1),
        contractNumber: data.contractNumber,
        producerRef: data.producerRef,
        buyerRef: data.buyerRef,
        title: data.title,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        conditions: (data.conditions ?? {}) as object,
        pricing: (data.pricing ?? {}) as object,
        status: 'pending',
      },
    });
    await this.audit.log(organizationId, 'AgContract', contract.contractKey, 'contract_signed', userId);
    await this.notifications.send(organizationId, data.producerRef, 'Contrato registrado', data.title);
    return contract;
  }

  async addCrop(organizationId: string, contractKey: string, data: {
    cropCode: string; variety?: string; committedVolume?: number; unit?: string; qualitySpecs?: Record<string, unknown>;
  }) {
    const contract = await this.prisma.eaceAgContract.findFirst({ where: { organizationId, contractKey } });
    if (!contract) return null;
    const count = await this.prisma.eaceContractCrop.count({ where: { organizationId } });
    return this.prisma.eaceContractCrop.create({
      data: {
        organizationId,
        cropKey: generateEaceKey('CRC', count + 1),
        contractId: contract.id,
        cropCode: data.cropCode,
        variety: data.variety,
        committedVolume: data.committedVolume,
        unit: data.unit,
        qualitySpecs: (data.qualitySpecs ?? {}) as object,
      },
    });
  }

  async addSchedule(organizationId: string, contractKey: string, data: {
    milestone: string; dueDate?: string;
  }) {
    const contract = await this.prisma.eaceAgContract.findFirst({ where: { organizationId, contractKey } });
    if (!contract) return null;
    const count = await this.prisma.eaceContractSchedule.count({ where: { organizationId } });
    return this.prisma.eaceContractSchedule.create({
      data: {
        organizationId,
        scheduleKey: generateEaceKey('SCH', count + 1),
        contractId: contract.id,
        milestone: data.milestone,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    });
  }

  async recordCompliance(organizationId: string, userId: string, contractKey: string, data: {
    metric: string; targetValue?: number; actualValue?: number;
  }) {
    const contract = await this.prisma.eaceAgContract.findFirst({ where: { organizationId, contractKey } });
    if (!contract) return null;
    const count = await this.prisma.eaceContractCompliance.count({ where: { organizationId } });
    const isCompliant = data.targetValue != null && data.actualValue != null ? data.actualValue >= data.targetValue : false;
    const record = await this.prisma.eaceContractCompliance.create({
      data: {
        organizationId,
        complianceKey: generateEaceKey('CMP', count + 1),
        contractId: contract.id,
        metric: data.metric,
        targetValue: data.targetValue,
        actualValue: data.actualValue,
        isCompliant,
      },
    });
    const all = await this.prisma.eaceContractCompliance.findMany({ where: { contractId: contract.id } });
    const { compliancePct } = computeContractCompliance(all.map((r) => ({
      targetValue: r.targetValue ?? undefined,
      actualValue: r.actualValue ?? undefined,
    })));
    await this.prisma.eaceAgContract.update({
      where: { id: contract.id },
      data: { compliancePct },
    });
    await this.audit.log(organizationId, 'AgContract', contractKey, 'compliance_updated', userId, { metric: data.metric, compliancePct });
    return record;
  }

  async activateContract(organizationId: string, userId: string, contractKey: string) {
    const updated = await this.prisma.eaceAgContract.updateMany({
      where: { organizationId, contractKey },
      data: { status: 'active' },
    });
    if (updated.count) await this.audit.log(organizationId, 'AgContract', contractKey, 'contract_amended', userId, { status: 'active' });
    return this.getContract(organizationId, contractKey);
  }
}
