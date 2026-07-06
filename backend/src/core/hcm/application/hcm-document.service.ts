import { Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HcmAuditService } from './hcm-audit.service';
import { HcmEmployeeService } from './hcm-employee.service';
import { generateHcmKey } from '../domain/hcm-workforce.engine';
import type { HcmDocumentType } from '@prisma/client';
import { createHash } from 'crypto';

@Injectable()
export class HcmDocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: HcmAuditService,
    private readonly employees: HcmEmployeeService,
  ) {}

  list(organizationId: string, employeeKey?: string) {
    return this.prisma.hcmEmployeeDocument.findMany({
      where: { organizationId, ...(employeeKey ? { employeeKey } : {}) },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async get(organizationId: string, documentKey: string) {
    const doc = await this.prisma.hcmEmployeeDocument.findFirst({
      where: { organizationId, documentKey },
      include: { versions: { orderBy: { versionNumber: 'desc' } } },
    });
    if (!doc) throw new NotFoundException(`Documento ${documentKey} no encontrado`);
    return doc;
  }

  async upload(organizationId: string, employeeKey: string, userId: string, input: {
    documentType: HcmDocumentType; title: string; fileName: string; contentType?: string;
    contentBase64?: string; contentUrl?: string; expiresAt?: string; isRequired?: boolean;
  }) {
    await this.employees.get(organizationId, employeeKey);

    let documentKey: string;
    let versionNumber = 1;
    const existing = await this.prisma.hcmEmployeeDocument.findFirst({
      where: { organizationId, employeeKey, documentType: input.documentType, title: input.title },
    });

    if (existing) {
      documentKey = existing.documentKey;
      versionNumber = existing.currentVersion + 1;
      await this.prisma.hcmEmployeeDocument.update({
        where: { id: existing.id },
        data: { currentVersion: versionNumber, fileName: input.fileName, contentType: input.contentType, uploadedBy: userId },
      });
    } else {
      documentKey = generateHcmKey('DOC', (await this.prisma.hcmEmployeeDocument.count({ where: { organizationId } })) + 1);
      await this.prisma.hcmEmployeeDocument.create({
        data: {
          organizationId,
          documentKey,
          employeeKey,
          documentType: input.documentType,
          title: input.title,
          fileName: input.fileName,
          contentType: input.contentType,
          isRequired: input.isRequired ?? false,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
          uploadedBy: userId,
        },
      });
    }

    const checksum = input.contentBase64
      ? createHash('sha256').update(input.contentBase64).digest('hex')
      : undefined;

    const versionKey = generateHcmKey('VER', (await this.prisma.hcmEmployeeDocumentVersion.count({ where: { organizationId } })) + 1);
    await this.prisma.hcmEmployeeDocumentVersion.create({
      data: {
        organizationId,
        versionKey,
        documentKey,
        versionNumber,
        fileName: input.fileName,
        contentUrl: input.contentUrl,
        contentBase64: input.contentBase64,
        contentType: input.contentType,
        fileSize: input.contentBase64 ? Buffer.byteLength(input.contentBase64, 'utf8') : undefined,
        checksum,
        uploadedBy: userId,
      },
    });

    if (input.documentType === 'photo') {
      await this.prisma.hcmEmployee.updateMany({
        where: { organizationId, employeeKey },
        data: { photoUrl: input.contentUrl ?? `doc://${documentKey}/v${versionNumber}` },
      });
    }
    if (input.documentType === 'signature') {
      await this.prisma.hcmEmployee.updateMany({
        where: { organizationId, employeeKey },
        data: { signatureUrl: input.contentUrl ?? `doc://${documentKey}/v${versionNumber}` },
      });
    }

    await this.audit.log(organizationId, 'HcmEmployeeDocument', documentKey, 'uploaded', userId, { versionNumber });
    await this.core.emitUserAction(organizationId, 'HcmEmployeeDocument', documentKey, EVENT_TYPES.HCM_DOCUMENT_UPLOADED, { employeeKey, documentType: input.documentType });

    return this.get(organizationId, documentKey);
  }

  async listVersions(organizationId: string, documentKey: string) {
    await this.get(organizationId, documentKey);
    return this.prisma.hcmEmployeeDocumentVersion.findMany({
      where: { organizationId, documentKey },
      orderBy: { versionNumber: 'desc' },
    });
  }
}
