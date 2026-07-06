import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HcmAuditService } from './hcm-audit.service';
import {
  DEFAULT_SS_PPE,
  generateSsKey,
  mergeConcurrentDeliveries,
  ppeExpiresAt,
  ppeNeedsReplacement,
  validateOfflineDeliveryRow,
} from '../domain/hcm-sst.engine';
import type { HcmSsDeliveryType, HcmSsPpeCategory } from '@prisma/client';

@Injectable()
export class HcmSsPpeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: HcmAuditService,
  ) {}

  listItems(organizationId: string) {
    return this.prisma.hcmSsPpeItem.findMany({ where: { organizationId, isActive: true }, orderBy: { name: 'asc' } });
  }

  listPositionRules(organizationId: string, positionKey?: string) {
    return this.prisma.hcmSsPpePositionRule.findMany({
      where: { organizationId, ...(positionKey ? { positionKey } : {}) },
      include: { ppe: true },
      orderBy: { positionKey: 'asc' },
    });
  }

  listAssignments(organizationId: string, employeeKey?: string) {
    return this.prisma.hcmSsPpeAssignment.findMany({
      where: { organizationId, isActive: true, ...(employeeKey ? { employeeKey } : {}) },
      include: { ppe: true },
      orderBy: { assignedAt: 'desc' },
    });
  }

  listDeliveries(organizationId: string, employeeKey?: string) {
    return this.prisma.hcmSsPpeDelivery.findMany({
      where: { organizationId, ...(employeeKey ? { employeeKey } : {}) },
      include: { ppe: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async seedDefaults(organizationId: string, userId: string) {
    for (const [i, p] of DEFAULT_SS_PPE.entries()) {
      await this.prisma.hcmSsPpeItem.create({
        data: {
          organizationId,
          ppeKey: generateSsKey('PPE', i + 1),
          code: p.code,
          name: p.name,
          category: p.category as HcmSsPpeCategory,
          usefulLifeDays: p.usefulLifeDays,
        },
      });
    }
    await this.audit.log(organizationId, 'HcmSsPpeItem', 'defaults', 'seeded', userId);
  }

  async upsertItem(organizationId: string, userId: string, input: {
    ppeKey?: string; code: string; name: string; category: HcmSsPpeCategory;
    brand?: string; standard?: string; usefulLifeDays?: number;
  }) {
    if (input.ppeKey) {
      const existing = await this.prisma.hcmSsPpeItem.findFirst({ where: { organizationId, ppeKey: input.ppeKey } });
      if (existing) {
        return this.prisma.hcmSsPpeItem.update({
          where: { id: existing.id },
          data: { name: input.name, brand: input.brand, standard: input.standard, usefulLifeDays: input.usefulLifeDays },
        });
      }
    }
    const ppeKey = input.ppeKey ?? generateSsKey('PPE', (await this.prisma.hcmSsPpeItem.count({ where: { organizationId } })) + 1);
    const item = await this.prisma.hcmSsPpeItem.create({
      data: {
        organizationId, ppeKey, code: input.code, name: input.name, category: input.category,
        brand: input.brand, standard: input.standard, usefulLifeDays: input.usefulLifeDays,
      },
    });
    await this.audit.log(organizationId, 'HcmSsPpeItem', ppeKey, 'created', userId);
    return item;
  }

  async assignToPosition(organizationId: string, userId: string, input: {
    positionKey: string; ppeKey: string; quantity?: number; isMandatory?: boolean;
  }) {
    const ruleKey = generateSsKey('PPR', (await this.prisma.hcmSsPpePositionRule.count({ where: { organizationId } })) + 1);
    const rule = await this.prisma.hcmSsPpePositionRule.create({
      data: {
        organizationId, ruleKey, positionKey: input.positionKey, ppeKey: input.ppeKey,
        quantity: input.quantity ?? 1, isMandatory: input.isMandatory ?? true,
      },
    });
    await this.audit.log(organizationId, 'HcmSsPpePositionRule', ruleKey, 'created', userId);
    return rule;
  }

  async assignToEmployee(organizationId: string, userId: string, input: {
    employeeKey: string; ppeKey: string; quantity?: number;
  }) {
    const assignmentKey = generateSsKey('PAS', (await this.prisma.hcmSsPpeAssignment.count({ where: { organizationId } })) + 1);
    const assignment = await this.prisma.hcmSsPpeAssignment.create({
      data: {
        organizationId, assignmentKey, employeeKey: input.employeeKey,
        ppeKey: input.ppeKey, quantity: input.quantity ?? 1, createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'HcmSsPpeAssignment', assignmentKey, 'created', userId);
    return assignment;
  }

  async deliver(organizationId: string, userId: string, input: {
    employeeKey: string; ppeKey: string; deliveryType: HcmSsDeliveryType;
    quantity?: number; signatureName?: string; notes?: string; offlineBatchKey?: string;
  }) {
    const ppe = await this.prisma.hcmSsPpeItem.findFirst({ where: { organizationId, ppeKey: input.ppeKey } });
    if (!ppe) throw new NotFoundException('EPP no encontrado');

    const deliveredAt = new Date();
    const expiresAt = ppeExpiresAt(deliveredAt, ppe.usefulLifeDays);
    const deliveryKey = generateSsKey('PDL', (await this.prisma.hcmSsPpeDelivery.count({ where: { organizationId } })) + 1);
    const signed = Boolean(input.signatureName);

    const delivery = await this.prisma.hcmSsPpeDelivery.create({
      data: {
        organizationId, deliveryKey, employeeKey: input.employeeKey, ppeKey: input.ppeKey,
        deliveryType: input.deliveryType,
        status: signed ? 'signed' : 'delivered',
        quantity: input.quantity ?? 1,
        deliveredAt,
        expiresAt,
        signatureName: input.signatureName,
        signatureAt: signed ? deliveredAt : null,
        offlineBatchKey: input.offlineBatchKey,
        notes: input.notes,
        createdBy: userId,
      },
    });

    await this.audit.log(organizationId, 'HcmSsPpeDelivery', deliveryKey, 'delivered', userId, {
      deliveryType: input.deliveryType, signed,
    });
    await this.core.emitUserAction(organizationId, 'HcmSsPpeDelivery', deliveryKey, EVENT_TYPES.HCM_SS_PPE_DELIVERED, input);
    return delivery;
  }

  async signDelivery(organizationId: string, deliveryKey: string, userId: string, signatureName: string) {
    const delivery = await this.prisma.hcmSsPpeDelivery.findFirst({ where: { organizationId, deliveryKey } });
    if (!delivery) throw new NotFoundException('Entrega no encontrada');
    const updated = await this.prisma.hcmSsPpeDelivery.update({
      where: { id: delivery.id },
      data: { status: 'signed', signatureName, signatureAt: new Date() },
    });
    await this.audit.log(organizationId, 'HcmSsPpeDelivery', deliveryKey, 'signed', userId);
    return updated;
  }

  async syncOffline(organizationId: string, userId: string, input: {
    employeeKey: string; deviceId?: string;
    deliveries: Array<{ deliveryKey?: string; ppeKey: string; deliveryType: HcmSsDeliveryType; quantity?: number; signatureName?: string; notes?: string }>;
  }) {
    const batchKey = generateSsKey('BAT', (await this.prisma.hcmSsOfflineSyncBatch.count({ where: { organizationId } })) + 1);
    const validated = input.deliveries.map((d, i) => ({
      ...d,
      validation: validateOfflineDeliveryRow({
        employeeKey: input.employeeKey,
        ppeKey: d.ppeKey,
        deliveryType: d.deliveryType,
        quantity: d.quantity,
      }, i),
    }));
    const validRows = validated.filter((v) => v.validation.valid);
    const unique = mergeConcurrentDeliveries(validRows.map((r, i) => ({
      deliveryKey: r.deliveryKey ?? `OFF-${i}`,
      employeeKey: input.employeeKey,
      ppeKey: r.ppeKey,
    })));

    const results = [];
    for (const row of unique) {
      const source = validRows.find((v) => (v.deliveryKey ?? `OFF-${validRows.indexOf(v)}`) === row.deliveryKey) ?? validRows.find((v) => v.ppeKey === row.ppeKey);
      if (!source) continue;
      results.push(await this.deliver(organizationId, userId, {
        employeeKey: input.employeeKey,
        ppeKey: source.ppeKey,
        deliveryType: source.deliveryType,
        quantity: source.quantity,
        signatureName: source.signatureName,
        notes: source.notes,
        offlineBatchKey: batchKey,
      }));
    }

    await this.prisma.hcmSsOfflineSyncBatch.create({
      data: {
        organizationId, batchKey, employeeKey: input.employeeKey,
        deviceId: input.deviceId, deliveryCount: results.length,
        metadata: { errors: validated.filter((v) => !v.validation.valid).map((v) => v.validation) },
      },
    });

    await this.audit.log(organizationId, 'HcmSsOfflineSyncBatch', batchKey, 'synced', userId, { deliveryCount: results.length });
    await this.core.emitUserAction(organizationId, 'HcmSsOfflineSyncBatch', batchKey, EVENT_TYPES.HCM_SS_OFFLINE_SYNCED, { deliveryCount: results.length });
    return { batchKey, synced: results.length, errors: validated.filter((v) => !v.validation.valid).map((v) => v.validation), deliveries: results };
  }

  async expiryAlerts(organizationId: string) {
    const deliveries = await this.prisma.hcmSsPpeDelivery.findMany({
      where: { organizationId, status: { in: ['delivered', 'signed'] }, expiresAt: { not: null } },
      include: { ppe: true },
    });
    return deliveries.filter((d) => ppeNeedsReplacement(d.expiresAt));
  }
}
