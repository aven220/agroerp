import { Injectable } from '@nestjs/common';
import { EaceOrgType } from '@agroerp/prisma-eace-client';
import { EacePrismaService } from '@/shared/infrastructure/database/eace-prisma.service';
import { generateEaceKey } from '../domain/eace.engine';
import { EaceAuditService } from './eace-audit.service';

@Injectable()
export class EaceCooperativeService {
  constructor(
    private readonly prisma: EacePrismaService,
    private readonly audit: EaceAuditService,
  ) {}

  listOrgs(organizationId: string, orgType?: string) {
    return this.prisma.eaceCollaborativeOrg.findMany({
      where: { organizationId, ...(orgType ? { orgType: orgType as EaceOrgType } : {}) },
      include: { members: true, representatives: true, programs: true, agreements: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createOrg(organizationId: string, userId: string, data: {
    orgType: EaceOrgType; name: string; taxId?: string; region?: string;
  }) {
    const count = await this.prisma.eaceCollaborativeOrg.count({ where: { organizationId } });
    const org = await this.prisma.eaceCollaborativeOrg.create({
      data: {
        organizationId,
        orgKey: generateEaceKey('ORG', count + 1),
        orgType: data.orgType,
        name: data.name,
        taxId: data.taxId,
        region: data.region,
      },
    });
    await this.audit.log(organizationId, 'CollaborativeOrg', org.orgKey, 'cooperative_created', userId);
    return org;
  }

  listGroups(organizationId: string) {
    return this.prisma.eaceProducerGroup.findMany({
      where: { organizationId },
      include: { members: true },
    });
  }

  async createGroup(organizationId: string, data: { name: string; parentOrgId?: string }) {
    const count = await this.prisma.eaceProducerGroup.count({ where: { organizationId } });
    return this.prisma.eaceProducerGroup.create({
      data: {
        organizationId,
        groupKey: generateEaceKey('GRP', count + 1),
        name: data.name,
        parentOrgId: data.parentOrgId,
      },
    });
  }

  async addMember(organizationId: string, data: {
    producerRef: string; orgId?: string; groupId?: string; role?: string;
  }) {
    const count = await this.prisma.eaceGroupMember.count({ where: { organizationId } });
    return this.prisma.eaceGroupMember.create({
      data: {
        organizationId,
        memberKey: generateEaceKey('MBR', count + 1),
        producerRef: data.producerRef,
        orgId: data.orgId,
        groupId: data.groupId,
        role: data.role ?? 'member',
      },
    });
  }

  async addRepresentative(organizationId: string, orgKey: string, data: {
    name: string; role: string; contactEmail?: string;
  }) {
    const org = await this.prisma.eaceCollaborativeOrg.findFirst({ where: { organizationId, orgKey } });
    if (!org) return null;
    const count = await this.prisma.eaceRepresentative.count({ where: { organizationId } });
    return this.prisma.eaceRepresentative.create({
      data: {
        organizationId,
        representativeKey: generateEaceKey('REP', count + 1),
        orgId: org.id,
        name: data.name,
        role: data.role,
        contactEmail: data.contactEmail,
      },
    });
  }

  async createProgram(organizationId: string, orgKey: string, data: {
    name: string; description?: string; startDate?: string; endDate?: string;
  }) {
    const org = await this.prisma.eaceCollaborativeOrg.findFirst({ where: { organizationId, orgKey } });
    if (!org) return null;
    const count = await this.prisma.eaceProgram.count({ where: { organizationId } });
    return this.prisma.eaceProgram.create({
      data: {
        organizationId,
        programKey: generateEaceKey('PRG', count + 1),
        orgId: org.id,
        name: data.name,
        description: data.description,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  }

  async createAgreement(organizationId: string, orgKey: string, data: {
    title: string; signedAt?: string; expiresAt?: string; terms?: Record<string, unknown>;
  }) {
    const org = await this.prisma.eaceCollaborativeOrg.findFirst({ where: { organizationId, orgKey } });
    if (!org) return null;
    const count = await this.prisma.eaceAgreement.count({ where: { organizationId } });
    return this.prisma.eaceAgreement.create({
      data: {
        organizationId,
        agreementKey: generateEaceKey('AGR', count + 1),
        orgId: org.id,
        title: data.title,
        signedAt: data.signedAt ? new Date(data.signedAt) : undefined,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        terms: (data.terms ?? {}) as object,
      },
    });
  }

  async consolidatedIndicators(organizationId: string, orgKey: string) {
    const org = await this.prisma.eaceCollaborativeOrg.findFirst({
      where: { organizationId, orgKey },
      include: { members: true, programs: true },
    });
    if (!org) return null;
    return {
      orgKey,
      members: org.members.length,
      programs: org.programs.length,
      indicators: org.indicators,
      consolidatedAt: new Date().toISOString(),
    };
  }
}
