import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

export type ProductPackageId = 'coop-cafe-co' | 'full-platform' | 'custom';

export interface OrgProductLicense {
  packageId: ProductPackageId;
  /** Solo aplica cuando packageId === 'custom' */
  enabledModules: string[];
}

const DEFAULT_LICENSE: OrgProductLicense = {
  packageId: 'coop-cafe-co',
  enabledModules: [],
};

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function parseLicense(settings: unknown): OrgProductLicense {
  const root = asRecord(settings);
  const raw = asRecord(root.productLicense);
  const packageId = raw.packageId;
  const valid =
    packageId === 'coop-cafe-co' ||
    packageId === 'full-platform' ||
    packageId === 'custom'
      ? packageId
      : DEFAULT_LICENSE.packageId;
  const modules = Array.isArray(raw.enabledModules)
    ? raw.enabledModules.filter((m): m is string => typeof m === 'string')
    : [];
  return { packageId: valid, enabledModules: modules };
}

@Injectable()
export class OrganizationProductService {
  constructor(private readonly prisma: PrismaService) {}

  async getLicense(organizationId: string): Promise<OrgProductLicense & { organizationId: string; name: string }> {
    const org = await this.prisma.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
      select: { id: true, name: true, settings: true },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return {
      organizationId: org.id,
      name: org.name,
      ...parseLicense(org.settings),
    };
  }

  async updateLicense(
    organizationId: string,
    input: OrgProductLicense,
  ): Promise<OrgProductLicense & { organizationId: string; name: string }> {
    const org = await this.prisma.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
      select: { id: true, name: true, settings: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const packageId =
      input.packageId === 'coop-cafe-co' ||
      input.packageId === 'full-platform' ||
      input.packageId === 'custom'
        ? input.packageId
        : DEFAULT_LICENSE.packageId;

    const enabledModules =
      packageId === 'custom'
        ? [...new Set((input.enabledModules ?? []).filter(Boolean))]
        : packageId === 'full-platform'
          ? []
          : [];

    const nextSettings = {
      ...asRecord(org.settings),
      productLicense: {
        packageId,
        enabledModules,
        updatedAt: new Date().toISOString(),
      },
    };

    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: { settings: nextSettings },
      select: { id: true, name: true, settings: true },
    });

    return {
      organizationId: updated.id,
      name: updated.name,
      ...parseLicense(updated.settings),
    };
  }

  /** Helper for /auth/me */
  parseFromSettings(settings: unknown): OrgProductLicense {
    return parseLicense(settings);
  }
}
