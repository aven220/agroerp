import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EfmAuditService } from './efm-audit.service';
import { DEFAULT_COA_ACCOUNTS } from '../domain/efm.catalogs';
import {
  buildAccountPath,
  generateAccountKey,
  generateCoaVersionKey,
} from '../domain/efm-accounting.engine';

@Injectable()
export class EfmCoaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EfmAuditService,
  ) {}

  listVersions(organizationId: string) {
    return this.prisma.efmCoaVersion.findMany({
      where: { organizationId },
      orderBy: { versionNumber: 'desc' },
    });
  }

  getActiveVersion(organizationId: string) {
    return this.prisma.efmCoaVersion.findFirst({
      where: { organizationId, isActive: true },
    });
  }

  async createVersion(
    organizationId: string,
    userId: string,
    input: { name: string; effectiveFrom: string; effectiveTo?: string; cloneFromKey?: string },
  ) {
    const count = await this.prisma.efmCoaVersion.count({ where: { organizationId } });
    const versionKey = generateCoaVersionKey(count + 1);
    const version = await this.prisma.efmCoaVersion.create({
      data: {
        organizationId,
        versionKey,
        versionNumber: count + 1,
        name: input.name,
        effectiveFrom: new Date(input.effectiveFrom),
        effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
        status: 'draft',
        createdBy: userId,
      },
    });

    if (input.cloneFromKey) {
      const source = await this.prisma.efmAccount.findMany({
        where: { organizationId, versionKey: input.cloneFromKey },
      });
      for (const acc of source) {
        await this.prisma.efmAccount.create({
          data: {
            organizationId,
            versionKey: version.versionKey,
            accountKey: acc.accountKey,
            parentAccountKey: acc.parentAccountKey,
            code: acc.code,
            name: acc.name,
            description: acc.description,
            accountType: acc.accountType,
            nature: acc.nature,
            isControl: acc.isControl,
            isTax: acc.isTax,
            isAuxiliary: acc.isAuxiliary,
            isPostingAllowed: acc.isPostingAllowed,
            companyKey: acc.companyKey,
            countryCode: acc.countryCode,
            currencyKey: acc.currencyKey,
            taxKey: acc.taxKey,
            controlAccountKey: acc.controlAccountKey,
            hierarchyLevel: acc.hierarchyLevel,
            sortOrder: acc.sortOrder,
            path: acc.path,
            metadata: acc.metadata as object,
            createdBy: userId,
          },
        });
      }
    }

    await this.audit.log(organizationId, 'EfmCoaVersion', versionKey, 'created', userId, { name: input.name }, version.versionNumber);
    await this.core.emitUserAction(organizationId, 'EfmCoaVersion', versionKey, EVENT_TYPES.EFM_COA_VERSION_CREATED, { name: input.name });
    return version;
  }

  async activateVersion(organizationId: string, versionKey: string, userId: string) {
    const version = await this.prisma.efmCoaVersion.findFirst({ where: { organizationId, versionKey } });
    if (!version) throw new NotFoundException(`Versión ${versionKey} no encontrada`);
    await this.prisma.efmCoaVersion.updateMany({
      where: { organizationId, isActive: true },
      data: { isActive: false },
    });
    const updated = await this.prisma.efmCoaVersion.update({
      where: { id: version.id },
      data: { isActive: true, status: 'active' },
    });
    await this.audit.log(organizationId, 'EfmCoaVersion', versionKey, 'activated', userId, {}, updated.versionNumber);
    await this.core.emitUserAction(organizationId, 'EfmCoaVersion', versionKey, EVENT_TYPES.EFM_COA_VERSION_ACTIVATED, {});
    return updated;
  }

  listAccounts(organizationId: string, versionKey?: string, filters?: { companyKey?: string; accountType?: string }) {
    const activeVersion = versionKey;
    return this.prisma.efmAccount.findMany({
      where: {
        organizationId,
        ...(activeVersion ? { versionKey: activeVersion } : {}),
        ...(filters?.companyKey ? { companyKey: filters.companyKey } : {}),
        ...(filters?.accountType ? { accountType: filters.accountType as never } : {}),
        isActive: true,
      },
      orderBy: [{ code: 'asc' }],
    });
  }

  async upsertAccount(
    organizationId: string,
    userId: string,
    input: {
      versionKey: string;
      accountKey?: string;
      code: string;
      name: string;
      description?: string;
      accountType?: string;
      nature?: string;
      parentAccountKey?: string;
      isControl?: boolean;
      isTax?: boolean;
      isAuxiliary?: boolean;
      isPostingAllowed?: boolean;
      companyKey?: string;
      countryCode?: string;
      currencyKey?: string;
      taxKey?: string;
      controlAccountKey?: string;
      hierarchyLevel?: number;
      sortOrder?: number;
      metadata?: Record<string, unknown>;
    },
  ) {
    const version = await this.prisma.efmCoaVersion.findFirst({
      where: { organizationId, versionKey: input.versionKey },
    });
    if (!version) throw new NotFoundException(`Versión ${input.versionKey} no encontrada`);

    let parentPath = '';
    let hierarchyLevel = input.hierarchyLevel ?? 0;
    if (input.parentAccountKey) {
      const parent = await this.prisma.efmAccount.findFirst({
        where: { organizationId, versionKey: input.versionKey, accountKey: input.parentAccountKey },
      });
      if (!parent) throw new BadRequestException(`Cuenta padre ${input.parentAccountKey} no existe`);
      parentPath = parent.path;
      hierarchyLevel = parent.hierarchyLevel + 1;
    }

    const accountKey = input.accountKey ?? generateAccountKey(
      (await this.prisma.efmAccount.count({ where: { organizationId, versionKey: input.versionKey } })) + 1,
    );
    const path = buildAccountPath(parentPath || undefined, accountKey);

    const row = await this.prisma.efmAccount.upsert({
      where: {
        organizationId_versionKey_accountKey: {
          organizationId,
          versionKey: input.versionKey,
          accountKey,
        },
      },
      update: {
        code: input.code,
        name: input.name,
        description: input.description,
        accountType: (input.accountType ?? 'detail') as never,
        nature: (input.nature ?? 'asset') as never,
        parentAccountKey: input.parentAccountKey,
        isControl: input.isControl ?? false,
        isTax: input.isTax ?? false,
        isAuxiliary: input.isAuxiliary ?? false,
        isPostingAllowed: input.isPostingAllowed ?? true,
        companyKey: input.companyKey,
        countryCode: input.countryCode,
        currencyKey: input.currencyKey ?? 'COP',
        taxKey: input.taxKey,
        controlAccountKey: input.controlAccountKey,
        hierarchyLevel,
        sortOrder: input.sortOrder ?? 0,
        path,
        metadata: (input.metadata ?? {}) as object,
        updatedBy: userId,
      },
      create: {
        organizationId,
        versionKey: input.versionKey,
        accountKey,
        code: input.code,
        name: input.name,
        description: input.description,
        accountType: (input.accountType ?? 'detail') as never,
        nature: (input.nature ?? 'asset') as never,
        parentAccountKey: input.parentAccountKey,
        isControl: input.isControl ?? false,
        isTax: input.isTax ?? false,
        isAuxiliary: input.isAuxiliary ?? false,
        isPostingAllowed: input.isPostingAllowed ?? true,
        companyKey: input.companyKey,
        countryCode: input.countryCode,
        currencyKey: input.currencyKey ?? 'COP',
        taxKey: input.taxKey,
        controlAccountKey: input.controlAccountKey,
        hierarchyLevel,
        sortOrder: input.sortOrder ?? 0,
        path,
        metadata: (input.metadata ?? {}) as object,
        createdBy: userId,
      },
    });

    await this.audit.log(organizationId, 'EfmAccount', accountKey, 'upserted', userId, { code: input.code, versionKey: input.versionKey });
    await this.core.emitUserAction(organizationId, 'EfmAccount', accountKey, EVENT_TYPES.EFM_ACCOUNT_UPDATED, { code: input.code });
    return row;
  }

  getHierarchy(organizationId: string, versionKey: string) {
    return this.listAccounts(organizationId, versionKey).then((accounts) => {
      const map = new Map(accounts.map((a) => [a.accountKey, { ...a, children: [] as typeof accounts }]));
      const roots: typeof accounts = [];
      for (const acc of accounts) {
        const node = map.get(acc.accountKey)!;
        if (acc.parentAccountKey && map.has(acc.parentAccountKey)) {
          map.get(acc.parentAccountKey)!.children.push(node as never);
        } else {
          roots.push(node as never);
        }
      }
      return roots;
    });
  }

  async seedDefaultCoa(organizationId: string, userId: string, versionKey: string) {
    for (const acc of DEFAULT_COA_ACCOUNTS) {
      await this.upsertAccount(organizationId, userId, {
        versionKey,
        accountKey: acc.accountKey,
        code: acc.code,
        name: acc.name,
        accountType: acc.accountType,
        nature: acc.nature,
        parentAccountKey: 'parentAccountKey' in acc ? acc.parentAccountKey : undefined,
        hierarchyLevel: acc.hierarchyLevel,
        isControl: 'isControl' in acc ? acc.isControl : false,
        isTax: 'isTax' in acc ? acc.isTax : false,
        isPostingAllowed: 'isPostingAllowed' in acc ? acc.isPostingAllowed : acc.accountType !== 'header',
      });
    }
    return this.listAccounts(organizationId, versionKey);
  }
}
