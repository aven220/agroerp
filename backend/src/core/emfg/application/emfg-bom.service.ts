import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EmfgBomLineType } from '@prisma/client';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { DEFAULT_EMFG_BOM_LINES, applySubstitutionQty, computeComponentQty, generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import { EmfgAuditService } from './emfg-audit.service';

@Injectable()
export class EmfgBomService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
    private readonly core: CoreEngineService,
  ) {}

  list(organizationId: string, itemKey?: string) {
    return this.prisma.emfgBom.findMany({
      where: { organizationId, ...(itemKey ? { itemKey } : {}), isActive: true },
      include: { lines: { orderBy: { sequence: 'asc' } }, substitutions: true },
      orderBy: { version: 'desc' },
    });
  }

  get(organizationId: string, bomKey: string) {
    return this.prisma.emfgBom.findUnique({
      where: { organizationId_bomKey: { organizationId, bomKey } },
      include: { lines: { orderBy: { sequence: 'asc' } }, substitutions: true },
    });
  }

  async create(organizationId: string, userId: string, payload: {
    itemKey: string; name: string; version?: string; yieldPct?: number; scrapPct?: number; isDefault?: boolean;
  }) {
    const seq = await this.prisma.emfgBom.count({ where: { organizationId } });
    const bomKey = generateEmfgKey('BOM', seq + 1);
    const bom = await this.prisma.emfgBom.create({
      data: {
        organizationId,
        bomKey,
        itemKey: payload.itemKey,
        name: payload.name,
        version: payload.version ?? '1.0',
        yieldPct: payload.yieldPct ?? 100,
        scrapPct: payload.scrapPct ?? 0,
        isDefault: payload.isDefault ?? true,
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'EmfgBom', bomKey, 'created', userId);
    await this.core.emitUserAction(organizationId, 'EmfgBom', bomKey, EVENT_TYPES.EMFG_BOM_CREATED, { bomKey, itemKey: payload.itemKey });
    return bom;
  }

  async addLine(organizationId: string, userId: string, bomKey: string, payload: {
    componentKey: string; lineType: EmfgBomLineType; quantity: number; uomKey?: string;
    yieldPct?: number; scrapPct?: number; sequence?: number;
  }) {
    const bom = await this.get(organizationId, bomKey);
    if (!bom) throw new NotFoundException('BOM not found');
    const seq = await this.prisma.emfgBomLine.count({ where: { organizationId, bomKey } });
    const bomLineKey = generateEmfgKey('BL', seq + 1);
    const line = await this.prisma.emfgBomLine.create({
      data: {
        organizationId,
        bomLineKey,
        bomKey,
        componentKey: payload.componentKey,
        lineType: payload.lineType,
        quantity: payload.quantity,
        uomKey: payload.uomKey ?? 'UN',
        yieldPct: payload.yieldPct ?? 100,
        scrapPct: payload.scrapPct ?? 0,
        sequence: payload.sequence ?? (seq + 1) * 10,
      },
    });
    await this.audit.log(organizationId, 'EmfgBomLine', bomLineKey, 'created', userId, { bomKey });
    return line;
  }

  async addSubstitution(organizationId: string, userId: string, bomKey: string, payload: {
    componentKey: string; substituteKey: string; factor?: number; priority?: number;
  }) {
    const seq = await this.prisma.emfgBomSubstitution.count({ where: { organizationId, bomKey } });
    const substitutionKey = generateEmfgKey('SUB', seq + 1);
    return this.prisma.emfgBomSubstitution.create({
      data: {
        organizationId,
        substitutionKey,
        bomKey,
        componentKey: payload.componentKey,
        substituteKey: payload.substituteKey,
        factor: payload.factor ?? 1,
        priority: payload.priority ?? 1,
      },
    });
  }

  explode(organizationId: string, bomKey: string, orderQty: number, useSubstitutions = false) {
    const bom = this.get(organizationId, bomKey);
    return bom.then(async (b) => {
      if (!b) throw new NotFoundException('BOM not found');
      const subs = useSubstitutions ? b.substitutions : [];
      return b.lines.map((line) => {
        const sub = subs.find((s) => s.componentKey === line.componentKey);
        const componentKey = sub?.substituteKey ?? line.componentKey;
        const qty = computeComponentQty(orderQty, line.quantity, b.yieldPct, line.yieldPct, line.scrapPct);
        return {
          componentKey,
          lineType: line.lineType,
          requiredQty: sub ? applySubstitutionQty(qty, sub.factor) : qty,
          uomKey: line.uomKey,
        };
      });
    });
  }

  async seedDefaults(organizationId: string, userId: string, itemKey: string) {
    const existing = await this.prisma.emfgBom.findFirst({ where: { organizationId, itemKey } });
    if (existing) return existing;
    const bom = await this.create(organizationId, userId, { itemKey, name: `BOM ${itemKey}`, isDefault: true });
    for (const line of DEFAULT_EMFG_BOM_LINES) {
      await this.addLine(organizationId, userId, bom.bomKey, {
        componentKey: line.componentKey,
        lineType: 'raw_material',
        quantity: line.quantity,
        yieldPct: line.yieldPct,
        scrapPct: line.scrapPct,
      });
    }
    return this.get(organizationId, bom.bomKey);
  }
}
