import { Injectable } from '@nestjs/common';
import { BpmsElementType } from '@agroerp/prisma-bpms-client';
import { BpmsPrismaService } from '@/shared/infrastructure/database/bpms-prisma.service';
import { generateBpmsKey, validateBpmnGraph } from '../domain/bpms.engine';

@Injectable()
export class BpmsDesignerService {
  constructor(private readonly prisma: BpmsPrismaService) {}

  getDiagram(organizationId: string, versionKey: string) {
    return Promise.all([
      this.prisma.bpmsProcessElement.findMany({ where: { organizationId, versionKey } }),
      this.prisma.bpmsProcessFlow.findMany({ where: { organizationId, versionKey } }),
    ]).then(([elements, flows]) => ({ elements, flows }));
  }

  async saveDiagram(
    organizationId: string,
    versionKey: string,
    elements: Array<{ elementKey: string; elementType: BpmsElementType; name: string; config?: object; posX: number; posY: number }>,
    flows: Array<{ flowKey?: string; fromElementKey: string; toElementKey: string; condition?: string }>,
  ) {
    const validation = validateBpmnGraph(
      elements.map((e) => ({ elementKey: e.elementKey, elementType: e.elementType, name: e.name })),
      flows.map((f, i) => ({ flowKey: f.flowKey ?? `flow_${i}`, fromElementKey: f.fromElementKey, toElementKey: f.toElementKey, condition: f.condition })),
    );
    await this.prisma.bpmsProcessElement.deleteMany({ where: { organizationId, versionKey } });
    await this.prisma.bpmsProcessFlow.deleteMany({ where: { organizationId, versionKey } });
    for (const e of elements) {
      await this.prisma.bpmsProcessElement.create({
        data: { organizationId, elementKey: e.elementKey, versionKey, elementType: e.elementType, name: e.name, config: (e.config ?? {}) as object, posX: e.posX, posY: e.posY },
      });
    }
    for (const f of flows) {
      const seq = await this.prisma.bpmsProcessFlow.count({ where: { organizationId } });
      await this.prisma.bpmsProcessFlow.create({
        data: {
          organizationId,
          flowKey: f.flowKey ?? generateBpmsKey('FLW', seq + 1),
          versionKey,
          fromElementKey: f.fromElementKey,
          toElementKey: f.toElementKey,
          condition: f.condition,
        },
      });
    }
    return { validation, elements: elements.length, flows: flows.length };
  }

  validate(organizationId: string, versionKey: string) {
    return this.getDiagram(organizationId, versionKey).then(({ elements, flows }) =>
      validateBpmnGraph(
        elements.map((e) => ({ elementKey: e.elementKey, elementType: e.elementType, name: e.name })),
        flows.map((f) => ({ flowKey: f.flowKey, fromElementKey: f.fromElementKey, toElementKey: f.toElementKey, condition: f.condition ?? undefined })),
      ),
    );
  }
}
