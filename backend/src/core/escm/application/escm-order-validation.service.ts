import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EscmPriceListService } from './escm-price-list.service';
import { EscmParameterService } from './escm-parameter.service';
import { runOrderValidation, type ValidationCheck } from '../domain/escm-order-validation.engine';
import { computeAvailableQty } from '@/core/eims/domain/eims-planning.engine';

@Injectable()
export class EscmOrderValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: EscmPriceListService,
    private readonly parameters: EscmParameterService,
  ) {}

  async validate(
    organizationId: string,
    input: {
      customerKey: string;
      lines: Array<{
        itemKey: string;
        quantity: number;
        unitPrice: number;
        discountPct?: number;
      }>;
      warehouseKey?: string;
      userCanCreateOrder?: boolean;
      userCanOverrideDiscount?: boolean;
      commercialPolicyOk?: boolean;
    },
  ): Promise<{ passed: boolean; hasErrors: boolean; checks: ValidationCheck[] }> {
    const customer = await this.prisma.escmCustomer.findFirst({
      where: { organizationId, customerKey: input.customerKey, deletedAt: null },
    });
    if (!customer) {
      return {
        passed: false,
        hasErrors: true,
        checks: [{
          key: 'customer',
          passed: false,
          severity: 'error',
          message: `Cliente ${input.customerKey} no encontrado`,
        }],
      };
    }

    const params = await this.parameters.list(organizationId);
    const creditParam = params.find((p) => p.parameterKey === 'credit_check_enabled');
    const creditCheckEnabled = (creditParam?.value as { enabled?: boolean })?.enabled !== false;
    const maxDiscountParam = params.find((p) => p.parameterKey === 'max_discount_pct');
    const maxDiscountPct = Number((maxDiscountParam?.value as { pct?: number })?.pct ?? 20);

    const warehouseKey = input.warehouseKey ?? 'WH-MAIN';
    const warehouse = await this.prisma.eimsWarehouse.findFirst({
      where: { organizationId, warehouseKey, isActive: true },
    });

    const enrichedLines = [];
    let orderSubtotal = 0;
    for (const line of input.lines) {
      const price = await this.pricing.resolvePrice(organizationId, {
        customerKey: input.customerKey,
        itemKey: line.itemKey,
        quantity: line.quantity,
      });
      const item = await this.prisma.eimsItem.findFirst({
        where: { organizationId, itemKey: line.itemKey, isActive: true },
      });
      let availableQty = 0;
      let blockedQty = 0;
      if (item && warehouse) {
        const balance = await this.prisma.eimsStockBalance.findFirst({
          where: { organizationId, itemId: item.id, warehouseId: warehouse.id },
        });
        availableQty = computeAvailableQty({
          onHandQty: balance?.onHandQty ?? 0,
          reservedQty: balance?.reservedQty ?? 0,
          availableQty: balance?.availableQty ?? 0,
        });
        blockedQty = balance?.blockedQty ?? 0;
      }
      const lineSubtotal = line.quantity * line.unitPrice * (1 - (line.discountPct ?? 0) / 100);
      orderSubtotal += lineSubtotal;
      enrichedLines.push({
        itemKey: line.itemKey,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountPct: line.discountPct ?? 0,
        resolvedPrice: price.unitPrice,
        availableQty,
        blockedQty,
      });
    }

    return runOrderValidation({
      customerStatus: customer.status,
      creditLimit: customer.creditLimit ?? 0,
      creditUsed: customer.creditUsed,
      orderTotal: orderSubtotal,
      creditCheckEnabled,
      lines: enrichedLines,
      maxDiscountPct,
      userCanOverrideDiscount: input.userCanOverrideDiscount ?? false,
      userCanCreateOrder: input.userCanCreateOrder ?? true,
      commercialPolicyOk: input.commercialPolicyOk ?? true,
    });
  }
}
