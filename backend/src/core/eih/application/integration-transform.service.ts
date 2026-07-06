import { Injectable } from '@nestjs/common';
import { EihDataFormat } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { detectFormat, transformData } from '../domain/transform.engine';
import { applyFieldMappings } from '../domain/field-map.engine';

@Injectable()
export class IntegrationTransformService {
  constructor(private readonly prisma: PrismaService) {}

  detect(payload: unknown) {
    return { format: detectFormat(payload) };
  }

  transform(input: unknown, inputFormat: EihDataFormat, outputFormat: EihDataFormat) {
    return { result: transformData(input, inputFormat, outputFormat) };
  }

  async applyFlowTransform(flowId: string, sourceData: Record<string, unknown>) {
    const mappings = await this.prisma.eihFieldMapping.findMany({ where: { flowId } });
    const rules = await this.prisma.eihTransformRule.findMany({ where: { flowId, isActive: true } });

    let data: unknown = applyFieldMappings(
      sourceData,
      mappings.map((m) => ({
        sourceField: m.sourceField,
        targetField: m.targetField,
        transform: m.transform ?? undefined,
        isRequired: m.isRequired,
        defaultValue: m.defaultValue ?? undefined,
      })),
    );
    for (const rule of rules) {
      data = transformData(data, rule.inputFormat, rule.outputFormat);
    }
    return data;
  }

  async upsertTransformRule(flowId: string, data: {
    ruleKey: string; name: string; inputFormat: EihDataFormat; outputFormat: EihDataFormat; expression: string;
  }) {
    return this.prisma.eihTransformRule.upsert({
      where: { flowId_ruleKey: { flowId, ruleKey: data.ruleKey } },
      update: {
        name: data.name,
        inputFormat: data.inputFormat,
        outputFormat: data.outputFormat,
        expression: data.expression,
      },
      create: {
        flowId,
        ruleKey: data.ruleKey,
        name: data.name,
        inputFormat: data.inputFormat,
        outputFormat: data.outputFormat,
        expression: data.expression,
      },
    });
  }
}
