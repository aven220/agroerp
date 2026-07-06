import { Injectable } from '@nestjs/common';
import { EaipPrismaService } from '@/shared/infrastructure/database/eaip-prisma.service';
import { generateEaipKey, simulatePredictionOutput } from '../domain/eaip.engine';
import { EaipAuditService } from './eaip-audit.service';

@Injectable()
export class EaipPredictionService {
  constructor(
    private readonly prisma: EaipPrismaService,
    private readonly audit: EaipAuditService,
  ) {}

  list(organizationId: string, serviceType?: string) {
    return this.prisma.eaipPrediction.findMany({
      where: { organizationId, ...(serviceType ? { serviceType } : {}) },
      orderBy: { predictedAt: 'desc' },
      take: 100,
    });
  }

  async runPrediction(
    organizationId: string,
    userId: string,
    data: { serviceType: string; fieldLotId?: string; cropCode?: string; targetDate?: string; input?: Record<string, unknown> },
  ) {
    const start = Date.now();
    const model = await this.prisma.eaipModelRegistry.findFirst({
      where: { organizationId, serviceType: data.serviceType, status: 'active' },
    });
    const output = simulatePredictionOutput(data.serviceType, { ...data.input, modelRef: model?.modelKey });
    const count = await this.prisma.eaipPrediction.count({ where: { organizationId } });
    const predictionKey = generateEaipKey('PRD', count + 1);
    const prediction = await this.prisma.eaipPrediction.create({
      data: {
        organizationId, predictionKey, serviceType: data.serviceType, modelId: model?.id,
        fieldLotId: data.fieldLotId, cropCode: data.cropCode,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
        predictedValue: output.predictedValue, confidence: output.confidence,
        payload: output as object,
      },
    });
    if (model) {
      const execKey = generateEaipKey('EXE', count + 1);
      await this.prisma.eaipModelExecution.create({
        data: {
          organizationId, executionKey: execKey, modelId: model.id, status: 'completed',
          input: (data.input ?? {}) as object, output: output as object,
          durationMs: Date.now() - start, executedBy: userId, fallbackUsed: !model.providerRef,
        },
      });
    }
    await this.audit.log(organizationId, 'EaipPrediction', predictionKey, 'prediction_executed', userId, output);
    return prediction;
  }
}
