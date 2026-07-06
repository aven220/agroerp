import { Injectable, NotFoundException } from '@nestjs/common';
import { EpscmCollabPartnerStatus, EpscmCollabPartnerType } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEpscmCollabKey } from '../domain/epscm-collab-analytics.engine';
import { EpscmAuditService } from './epscm-audit.service';

@Injectable()
export class EpscmCollabPartnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EpscmAuditService,
  ) {}

  list(organizationId: string, partnerType?: EpscmCollabPartnerType) {
    return this.prisma.epscmCollabPartner.findMany({
      where: { organizationId, ...(partnerType ? { partnerType } : {}) },
      include: { users: true },
      orderBy: { name: 'asc' },
    });
  }

  async get(organizationId: string, partnerKey: string) {
    const p = await this.prisma.epscmCollabPartner.findFirst({
      where: { organizationId, partnerKey },
      include: { users: true, contracts: true },
    });
    if (!p) throw new NotFoundException('Partner not found');
    return p;
  }

  async create(
    organizationId: string,
    userId: string,
    input: { partnerType: EpscmCollabPartnerType; code: string; name: string; taxId?: string; email?: string },
  ) {
    const seq = await this.prisma.epscmCollabPartner.count({ where: { organizationId } });
    const partner = await this.prisma.epscmCollabPartner.create({
      data: {
        organizationId,
        partnerKey: generateEpscmCollabKey('PTR', seq + 1),
        partnerType: input.partnerType,
        code: input.code,
        name: input.name,
        taxId: input.taxId,
        email: input.email,
      },
    });
    await this.audit.log(organizationId, 'EpscmCollabPartner', partner.partnerKey, 'created', userId);
    return partner;
  }

  async linkUser(organizationId: string, userId: string, partnerKey: string, targetUserId: string, role = 'viewer') {
    return this.prisma.epscmCollabPartnerUser.create({
      data: { organizationId, partnerKey, userId: targetUserId, role },
    });
  }

  async seed(organizationId: string, userId: string) {
    const existing = await this.prisma.epscmCollabPartner.count({ where: { organizationId } });
    if (existing > 0) return this.list(organizationId);

    await this.create(organizationId, userId, { partnerType: 'supplier', code: 'SUP-01', name: 'Proveedor Principal', taxId: '900123456' });
    await this.create(organizationId, userId, { partnerType: 'operator', code: 'OPR-01', name: 'Operador Logístico', email: 'ops@carrier.com' });
    return this.list(organizationId);
  }
}
