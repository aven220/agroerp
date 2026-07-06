import { Injectable, NotFoundException } from '@nestjs/common';
import { EaccPrismaService } from '@/shared/infrastructure/database/eacc-prisma.service';
import { EACC_CERTIFICATION_TYPES, generateEaccKey } from '../domain/eacc.engine';
import { EaccAuditService } from './eacc-audit.service';

@Injectable()
export class EaccCertificationService {
  constructor(
    private readonly prisma: EaccPrismaService,
    private readonly audit: EaccAuditService,
  ) {}

  listFrameworks(organizationId: string) {
    return this.prisma.eaccComplianceFramework.findMany({ where: { organizationId, status: 'active' } });
  }

  async registerFramework(organizationId: string, data: { code: string; name: string; frameworkType: string; description?: string }) {
    const count = await this.prisma.eaccComplianceFramework.count({ where: { organizationId } });
    const frameworkKey = generateEaccKey('FRM', count + 1);
    return this.prisma.eaccComplianceFramework.create({
      data: { organizationId, frameworkKey, code: data.code, name: data.name, frameworkType: data.frameworkType, description: data.description },
    });
  }

  listCertifications(organizationId: string, certType?: string) {
    return this.prisma.eaccCertification.findMany({
      where: { organizationId, ...(certType ? { certType } : {}) },
      include: { framework: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async registerCertification(
    organizationId: string,
    userId: string,
    data: {
      certType: string; name: string; certNumber?: string; frameworkId?: string;
      issuedAt?: string; expiresAt?: string; fieldLotId?: string; responsibleId?: string;
    },
  ) {
    const count = await this.prisma.eaccCertification.count({ where: { organizationId } });
    const certKey = generateEaccKey('CRT', count + 1);
    const row = await this.prisma.eaccCertification.create({
      data: {
        organizationId, certKey, certType: data.certType, name: data.name, certNumber: data.certNumber,
        frameworkId: data.frameworkId, fieldLotId: data.fieldLotId, responsibleId: data.responsibleId,
        issuedAt: data.issuedAt ? new Date(data.issuedAt) : new Date(),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        status: 'active',
      },
    });
    await this.audit.log(organizationId, 'EaccCertification', certKey, 'certification_registered', userId);
    return row;
  }

  async renewCertification(organizationId: string, userId: string, certKey: string, notes?: string) {
    const cert = await this.prisma.eaccCertification.findFirst({ where: { organizationId, certKey } });
    if (!cert) throw new NotFoundException('Certification not found');
    const count = await this.prisma.eaccCertificationRenewal.count({ where: { organizationId } });
    const renewalKey = generateEaccKey('RNW', count + 1);
    const renewal = await this.prisma.eaccCertificationRenewal.create({
      data: { organizationId, renewalKey, certificationId: cert.id, notes, status: 'pending' },
    });
    await this.prisma.eaccCertification.update({
      where: { id: cert.id },
      data: { renewedAt: new Date(), status: 'pending' },
    });
    await this.audit.log(organizationId, 'EaccCertification', certKey, 'certification_renewed', userId);
    return renewal;
  }

  certificationTypes() { return EACC_CERTIFICATION_TYPES; }
}
