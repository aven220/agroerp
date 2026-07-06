import { Injectable } from '@nestjs/common';
import { BpmsProcessStatus } from '@agroerp/prisma-bpms-client';
import { BpmsPrismaService } from '@/shared/infrastructure/database/bpms-prisma.service';
import { exportBpmnPackage, generateBpmsKey, validateBpmnGraph, BpmnElement, BpmnFlow } from '../domain/bpms.engine';
import { BpmsAuditService } from './bpms-audit.service';
import { BpmsIntegrationService } from './bpms-integration.service';

@Injectable()
export class BpmsProcessService {
  constructor(
    private readonly prisma: BpmsPrismaService,
    private readonly audit: BpmsAuditService,
    private readonly integration: BpmsIntegrationService,
  ) {}

  list(organizationId: string, status?: BpmsProcessStatus) {
    return this.prisma.bpmsProcess.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  get(organizationId: string, processKey: string) {
    return this.prisma.bpmsProcess.findFirst({
      where: { organizationId, processKey },
      include: { versions: { orderBy: { versionNumber: 'desc' } } },
    });
  }

  async create(organizationId: string, userId: string, processKey: string, name: string, moduleTarget?: string, description?: string) {
    const process = await this.prisma.bpmsProcess.create({
      data: { organizationId, processKey, name, description, moduleTarget, createdBy: userId, status: 'draft' },
    });
    await this.createVersion(organizationId, userId, processKey, 1);
    await this.audit.log(organizationId, 'BpmsProcess', processKey, 'process_created', userId, { name });
    return process;
  }

  async createVersion(organizationId: string, userId: string, processKey: string, versionNumber?: number) {
    const last = await this.prisma.bpmsProcessVersion.findFirst({
      where: { organizationId, processKey },
      orderBy: { versionNumber: 'desc' },
    });
    const num = versionNumber ?? (last ? last.versionNumber + 1 : 1);
    const seq = await this.prisma.bpmsProcessVersion.count({ where: { organizationId } });
    return this.prisma.bpmsProcessVersion.create({
      data: {
        organizationId,
        versionKey: generateBpmsKey('VER', seq + 1),
        processKey,
        versionNumber: num,
        status: 'draft',
        createdBy: userId,
        bpmnModel: { bpmnVersion: '2.0' },
      },
    });
  }

  async publish(organizationId: string, userId: string, versionKey: string) {
    const version = await this.prisma.bpmsProcessVersion.findFirst({
      where: { organizationId, versionKey },
      include: { elements: true, flows: true },
    });
    if (!version) return null;
    const validation = validateBpmnGraph(
      version.elements.map((e) => ({ elementKey: e.elementKey, elementType: e.elementType, name: e.name })),
      version.flows.map((f) => ({ flowKey: f.flowKey, fromElementKey: f.fromElementKey, toElementKey: f.toElementKey, condition: f.condition ?? undefined })),
    );
    if (!validation.valid) throw new Error(validation.errors.join('; '));
    const updated = await this.prisma.bpmsProcessVersion.update({
      where: { organizationId_versionKey: { organizationId, versionKey } },
      data: { status: 'published', publishedAt: new Date(), publishedBy: userId },
    });
    await this.prisma.bpmsProcess.update({
      where: { organizationId_processKey: { organizationId, processKey: version.processKey } },
      data: { status: 'published' },
    });
    await this.audit.log(organizationId, 'BpmsProcess', version.processKey, 'process_published', userId, { versionKey });
    await this.integration.onProcessPublished(organizationId, version.processKey);
    return updated;
  }

  async duplicate(organizationId: string, userId: string, sourceProcessKey: string, newProcessKey: string, newName: string) {
    const source = await this.get(organizationId, sourceProcessKey);
    if (!source) return null;
    const dup = await this.create(organizationId, userId, newProcessKey, newName, source.moduleTarget ?? undefined, source.description ?? undefined);
    const latest = source.versions[0];
    if (latest) {
      const newVer = await this.prisma.bpmsProcessVersion.findFirst({ where: { organizationId, processKey: newProcessKey }, orderBy: { versionNumber: 'desc' } });
      if (newVer) {
        const elements = await this.prisma.bpmsProcessElement.findMany({ where: { organizationId, versionKey: latest.versionKey } });
        const flows = await this.prisma.bpmsProcessFlow.findMany({ where: { organizationId, versionKey: latest.versionKey } });
        for (const e of elements) {
          const ek = `${newProcessKey}-${e.elementKey}`;
          await this.prisma.bpmsProcessElement.create({
            data: { organizationId, elementKey: ek, versionKey: newVer.versionKey, elementType: e.elementType, name: e.name, config: (e.config ?? {}) as object, posX: e.posX, posY: e.posY },
          });
        }
        for (const f of flows) {
          const seq = await this.prisma.bpmsProcessFlow.count({ where: { organizationId } });
          await this.prisma.bpmsProcessFlow.create({
            data: {
              organizationId,
              flowKey: generateBpmsKey('FLW', seq + 1),
              versionKey: newVer.versionKey,
              fromElementKey: `${newProcessKey}-${f.fromElementKey}`,
              toElementKey: `${newProcessKey}-${f.toElementKey}`,
              condition: f.condition,
            },
          });
        }
      }
    }
    await this.audit.log(organizationId, 'BpmsProcess', newProcessKey, 'process_duplicated', userId, { sourceProcessKey });
    return dup;
  }

  async exportProcess(organizationId: string, userId: string, processKey: string) {
    const process = await this.get(organizationId, processKey);
    if (!process?.versions[0]) return null;
    const ver = process.versions[0];
    const elements = await this.prisma.bpmsProcessElement.findMany({ where: { organizationId, versionKey: ver.versionKey } });
    const flows = await this.prisma.bpmsProcessFlow.findMany({ where: { organizationId, versionKey: ver.versionKey } });
    const pkg = exportBpmnPackage(
      processKey,
      process.name,
      elements.map((e) => ({ elementKey: e.elementKey, elementType: e.elementType, name: e.name, config: e.config as Record<string, unknown>, posX: e.posX, posY: e.posY })),
      flows.map((f) => ({ flowKey: f.flowKey, fromElementKey: f.fromElementKey, toElementKey: f.toElementKey, condition: f.condition ?? undefined })),
      ver.versionNumber,
    );
    await this.audit.log(organizationId, 'BpmsProcess', processKey, 'process_exported', userId, {});
    return pkg;
  }

  async importProcess(organizationId: string, userId: string, processKey: string, name: string, pkg: { elements: BpmnElement[]; flows: BpmnFlow[]; moduleTarget?: string }) {
    const existing = await this.prisma.bpmsProcess.findFirst({ where: { organizationId, processKey } });
    if (!existing) await this.create(organizationId, userId, processKey, name, pkg.moduleTarget);
    const ver = await this.prisma.bpmsProcessVersion.findFirst({ where: { organizationId, processKey }, orderBy: { versionNumber: 'desc' } });
    if (!ver) return null;
    for (const e of pkg.elements) {
      await this.prisma.bpmsProcessElement.upsert({
        where: { organizationId_elementKey: { organizationId, elementKey: e.elementKey } },
        create: { organizationId, elementKey: e.elementKey, versionKey: ver.versionKey, elementType: e.elementType, name: e.name, config: (e.config ?? {}) as object, posX: e.posX ?? 0, posY: e.posY ?? 0 },
        update: { name: e.name, config: (e.config ?? {}) as object, posX: e.posX ?? 0, posY: e.posY ?? 0 },
      });
    }
    for (const f of pkg.flows) {
      await this.prisma.bpmsProcessFlow.upsert({
        where: { organizationId_flowKey: { organizationId, flowKey: f.flowKey } },
        create: { organizationId, flowKey: f.flowKey, versionKey: ver.versionKey, fromElementKey: f.fromElementKey, toElementKey: f.toElementKey, condition: f.condition },
        update: { fromElementKey: f.fromElementKey, toElementKey: f.toElementKey, condition: f.condition },
      });
    }
    await this.audit.log(organizationId, 'BpmsProcess', processKey, 'process_imported', userId, {});
    return this.get(organizationId, processKey);
  }
}
