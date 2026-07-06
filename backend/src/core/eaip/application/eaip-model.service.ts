import { Injectable, NotFoundException } from '@nestjs/common';
import { EaipPrismaService } from '@/shared/infrastructure/database/eaip-prisma.service';
import { EAIP_PREDICTION_SERVICES, generateEaipKey } from '../domain/eaip.engine';
import { EaipAuditService } from './eaip-audit.service';

@Injectable()
export class EaipModelService {
  constructor(
    private readonly prisma: EaipPrismaService,
    private readonly audit: EaipAuditService,
  ) {}

  list(organizationId: string, serviceType?: string) {
    return this.prisma.eaipModelRegistry.findMany({
      where: { organizationId, ...(serviceType ? { serviceType } : {}) },
      include: { versions: { where: { isActive: true }, take: 1 } },
    });
  }

  async register(
    organizationId: string,
    userId: string,
    data: { name: string; serviceType: string; providerRef?: string; config?: Record<string, unknown>; costLimit?: number },
  ) {
    const count = await this.prisma.eaipModelRegistry.count({ where: { organizationId } });
    const modelKey = generateEaipKey('MDL', count + 1);
    const model = await this.prisma.eaipModelRegistry.create({
      data: {
        organizationId, modelKey, name: data.name, serviceType: data.serviceType,
        providerRef: data.providerRef, config: (data.config ?? {}) as object, costLimit: data.costLimit,
      },
    });
    const versionKey = `${modelKey}-V1`;
    await this.prisma.eaipModelVersion.create({
      data: { organizationId, versionKey, modelId: model.id, version: '1.0.0', isActive: true, config: (data.config ?? {}) as object },
    });
    await this.audit.log(organizationId, 'EaipModelRegistry', modelKey, 'model_registered', userId);
    return model;
  }

  async activate(organizationId: string, userId: string, modelKey: string) {
    const model = await this.prisma.eaipModelRegistry.findFirst({ where: { organizationId, modelKey } });
    if (!model) throw new NotFoundException('Model not found');
    const updated = await this.prisma.eaipModelRegistry.update({ where: { id: model.id }, data: { status: 'active' } });
    await this.audit.log(organizationId, 'EaipModelRegistry', modelKey, 'model_activated', userId);
    return updated;
  }

  async deactivate(organizationId: string, userId: string, modelKey: string) {
    const model = await this.prisma.eaipModelRegistry.findFirst({ where: { organizationId, modelKey } });
    if (!model) throw new NotFoundException('Model not found');
    const updated = await this.prisma.eaipModelRegistry.update({ where: { id: model.id }, data: { status: 'inactive' } });
    await this.audit.log(organizationId, 'EaipModelRegistry', modelKey, 'model_deactivated', userId);
    return updated;
  }

  listExecutions(organizationId: string, modelId?: string) {
    return this.prisma.eaipModelExecution.findMany({
      where: { organizationId, ...(modelId ? { modelId } : {}) },
      orderBy: { executedAt: 'desc' },
      take: 100,
    });
  }

  predictionServices() { return EAIP_PREDICTION_SERVICES; }
}
