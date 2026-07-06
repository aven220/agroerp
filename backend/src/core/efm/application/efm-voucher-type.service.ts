import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EfmAuditService } from './efm-audit.service';
import { DEFAULT_VOUCHER_TYPES, generateVoucherTypeKey } from '../domain/efm-voucher.engine';

@Injectable()
export class EfmVoucherTypeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EfmAuditService,
  ) {}

  list(organizationId: string) {
    return this.prisma.efmVoucherType.findMany({
      where: { organizationId, isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  getOne(organizationId: string, voucherTypeKey: string) {
    return this.prisma.efmVoucherType.findFirst({ where: { organizationId, voucherTypeKey } });
  }

  async upsert(
    organizationId: string,
    userId: string,
    input: {
      voucherTypeKey?: string;
      code: string;
      name: string;
      prefix?: string;
      numberPadding?: number;
      resetPeriod?: string;
      approvalLevels?: number;
      requiresApproval?: boolean;
      autoPost?: boolean;
      originAllowed?: string;
    },
  ) {
    const voucherTypeKey = input.voucherTypeKey ?? generateVoucherTypeKey(
      (await this.prisma.efmVoucherType.count({ where: { organizationId } })) + 1,
    );
    const row = await this.prisma.efmVoucherType.upsert({
      where: { organizationId_voucherTypeKey: { organizationId, voucherTypeKey } },
      update: {
        code: input.code,
        name: input.name,
        prefix: input.prefix ?? 'COMP',
        numberPadding: input.numberPadding ?? 6,
        resetPeriod: input.resetPeriod ?? 'year',
        approvalLevels: input.approvalLevels ?? 1,
        requiresApproval: input.requiresApproval ?? true,
        autoPost: input.autoPost ?? false,
        originAllowed: input.originAllowed ?? 'both',
        isActive: true,
      },
      create: {
        organizationId,
        voucherTypeKey,
        code: input.code,
        name: input.name,
        prefix: input.prefix ?? 'COMP',
        numberPadding: input.numberPadding ?? 6,
        resetPeriod: input.resetPeriod ?? 'year',
        approvalLevels: input.approvalLevels ?? 1,
        requiresApproval: input.requiresApproval ?? true,
        autoPost: input.autoPost ?? false,
        originAllowed: input.originAllowed ?? 'both',
      },
    });
    await this.audit.log(organizationId, 'EfmVoucherType', voucherTypeKey, 'upserted', userId);
    return row;
  }

  async seed(organizationId: string, userId: string) {
    for (const vt of DEFAULT_VOUCHER_TYPES) {
      await this.upsert(organizationId, userId, vt);
    }
    return this.list(organizationId);
  }

  async nextNumber(
    organizationId: string,
    voucherTypeKey: string,
    companyKey: string | undefined,
    entryDate: Date,
  ) {
    const vt = await this.getOne(organizationId, voucherTypeKey);
    if (!vt) throw new NotFoundException(`Tipo comprobante ${voucherTypeKey} no encontrado`);

    const periodKey = vt.resetPeriod === 'month'
      ? `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`
      : vt.resetPeriod === 'year'
        ? String(entryDate.getFullYear())
        : '_all';

    const seq = await this.prisma.efmVoucherSequence.upsert({
      where: {
        organizationId_voucherTypeKey_companyKey_periodKey: {
          organizationId,
          voucherTypeKey,
          companyKey: companyKey ?? '_all',
          periodKey,
        },
      },
      update: { lastNumber: { increment: 1 } },
      create: {
        organizationId,
        voucherTypeKey,
        companyKey: companyKey ?? '_all',
        periodKey,
        lastNumber: 1,
      },
    });

    const num = String(seq.lastNumber).padStart(vt.numberPadding, '0');
    const voucherNumber = `${vt.prefix}-${periodKey === '_all' ? '' : `${periodKey}-`}${num}`.replace('--', '-');
    return { voucherNumber, sequence: seq.lastNumber };
  }
}
