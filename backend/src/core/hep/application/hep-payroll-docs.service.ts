import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HepAuditService } from './hep-audit.service';
import { HepDashboardService } from './hep-dashboard.service';
import {
  buildMinimalPdfBase64,
  buildPayslipPdfLines,
  canAccessEmployeeData,
  filterPayslipsByPeriod,
  generateHepKey,
  groupContributions,
  mapSalaryHistory,
} from '../domain/hep-portal.engine';

@Injectable()
export class HepPayrollDocsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: HepAuditService,
    private readonly core: CoreEngineService,
    private readonly dashboard: HepDashboardService,
  ) {}

  private async ownKey(organizationId: string, userId: string, employeeKey?: string) {
    const resolved = await this.dashboard.resolveEmployeeKey(organizationId, userId, employeeKey);
    if (!canAccessEmployeeData(employeeKey, resolved)) {
      throw new ForbiddenException('Acceso denegado al expediente de otro colaborador');
    }
    return resolved;
  }

  async listPayslips(organizationId: string, userId: string, filters?: {
    employeeKey?: string; periodCode?: string; periodFrom?: string; periodTo?: string;
  }) {
    const employeeKey = await this.ownKey(organizationId, userId, filters?.employeeKey);
    const payslips = await this.prisma.hcmPyPayslip.findMany({
      where: {
        organizationId,
        employeeKey,
        status: { in: ['calculated', 'approved', 'paid'] },
      },
      include: { lines: true, run: true },
      orderBy: { periodCode: 'desc' },
    });
    const filtered = filterPayslipsByPeriod(payslips, filters?.periodCode, filters?.periodFrom, filters?.periodTo);
    await this.audit.log({
      organizationId, action: 'query', resource: 'HepPayslips', employeeKey, userId,
      details: { count: filtered.length, periodCode: filters?.periodCode },
    });
    return filtered;
  }

  async previewPayslip(organizationId: string, userId: string, payslipKey: string) {
    const employeeKey = await this.ownKey(organizationId, userId);
    const payslip = await this.prisma.hcmPyPayslip.findFirst({
      where: { organizationId, payslipKey, employeeKey },
      include: { lines: true, run: true },
    });
    if (!payslip) throw new NotFoundException('Desprendible no encontrado');
    await this.audit.log({
      organizationId, action: 'view', resource: 'HepPayslip', employeeKey, userId,
      details: { payslipKey },
    });
    await this.core.emitUserAction(organizationId, 'HepPayslip', payslipKey, EVENT_TYPES.HEP_PAYSLIP_VIEWED, { employeeKey });
    return payslip;
  }

  async downloadPayslipPdf(organizationId: string, userId: string, payslipKey: string) {
    const payslip = await this.previewPayslip(organizationId, userId, payslipKey);
    const pdfBase64 = buildMinimalPdfBase64(buildPayslipPdfLines({
      payslipKey: payslip.payslipKey,
      periodCode: payslip.periodCode,
      employeeKey: payslip.employeeKey,
      baseSalary: payslip.baseSalary,
      totalEarnings: payslip.totalEarnings,
      totalDeductions: payslip.totalDeductions,
      netPay: payslip.netPay,
      lines: payslip.lines.map((l) => ({ conceptName: l.conceptName, amount: l.amount, kind: l.kind })),
    }));
    const fileName = `desprendible-${payslip.periodCode}-${payslip.payslipKey}.pdf`;
    await this.audit.log({
      organizationId, action: 'download', resource: 'HepPayslip', employeeKey: payslip.employeeKey, userId,
      details: { payslipKey, fileName },
    });
    await this.core.emitUserAction(organizationId, 'HepPayslip', payslipKey, EVENT_TYPES.HEP_PAYSLIP_DOWNLOADED, {
      employeeKey: payslip.employeeKey, fileName,
    });
    return { payslipKey, fileName, mimeType: 'application/pdf', pdfBase64, periodCode: payslip.periodCode };
  }

  async downloadPayslipsBulk(organizationId: string, userId: string, payslipKeys: string[]) {
    const files = [];
    for (const key of payslipKeys) {
      files.push(await this.downloadPayslipPdf(organizationId, userId, key));
    }
    await this.audit.log({
      organizationId, action: 'download', resource: 'HepPayslipsBulk', userId,
      details: { count: files.length, payslipKeys },
    });
    return { count: files.length, files };
  }

  async salaryHistory(organizationId: string, userId: string, employeeKey?: string) {
    const key = await this.ownKey(organizationId, userId, employeeKey);
    const [history, contracts, payslips] = await Promise.all([
      this.prisma.hcmEmployeeHistory.findMany({
        where: { organizationId, employeeKey: key, eventType: { in: ['salary_change', 'promotion', 'transfer'] } },
        orderBy: { effectiveDate: 'desc' },
      }),
      this.prisma.hcmContract.findMany({
        where: { organizationId, employeeKey: key },
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.hcmPyPayslip.findMany({
        where: { organizationId, employeeKey: key, status: { in: ['approved', 'paid'] } },
        orderBy: { periodCode: 'asc' },
        select: { periodCode: true, baseSalary: true, netPay: true, payslipKey: true },
      }),
    ]);
    await this.audit.log({
      organizationId, action: 'query', resource: 'HepSalaryHistory', employeeKey: key, userId,
    });
    return {
      events: mapSalaryHistory(history),
      contracts: contracts.map((c) => ({
        contractKey: c.contractKey,
        contractType: c.contractType,
        positionKey: c.positionKey,
        salary: c.salary,
        startDate: c.startDate,
        endDate: c.endDate,
        status: c.status,
      })),
      payslipTrend: payslips,
    };
  }

  async listCertificates(organizationId: string, userId: string, employeeKey?: string) {
    const key = await this.ownKey(organizationId, userId, employeeKey);
    const [portalCerts, payrollDocs] = await Promise.all([
      this.prisma.hepCertificate.findMany({ where: { organizationId, employeeKey: key }, orderBy: { issuedAt: 'desc' } }),
      this.prisma.hcmPyDocument.findMany({
        where: {
          organizationId,
          employeeKey: key,
          documentType: { in: ['labor_certificate', 'income_certificate', 'salary_history', 'settlement'] },
        },
        orderBy: { issuedAt: 'desc' },
      }),
    ]);
    await this.audit.log({
      organizationId, action: 'query', resource: 'HepCertificates', employeeKey: key, userId,
      details: { portal: portalCerts.length, payroll: payrollDocs.length },
    });
    return {
      portal: portalCerts,
      payroll: payrollDocs,
      retention: payrollDocs.filter((d) => d.documentType === 'income_certificate' || (d.metadata as Record<string, unknown>)?.retention === true),
    };
  }

  async downloadCertificate(organizationId: string, userId: string, certificateKey: string, source: 'portal' | 'payroll' = 'portal') {
    const key = await this.ownKey(organizationId, userId);
    if (source === 'portal') {
      const cert = await this.prisma.hepCertificate.findFirst({
        where: { organizationId, certificateKey, employeeKey: key },
      });
      if (!cert) throw new NotFoundException('Certificado no encontrado');
      let pdfBase64 = cert.pdfBase64;
      if (!pdfBase64) {
        pdfBase64 = buildMinimalPdfBase64([
          cert.title,
          `Empleado: ${cert.employeeKey}`,
          `Tipo: ${cert.certificateType}`,
          `Emitido: ${cert.issuedAt.toISOString().slice(0, 10)}`,
        ]);
      }
      await this.prisma.hepCertificate.update({ where: { id: cert.id }, data: { status: 'downloaded' } });
      await this.audit.log({
        organizationId, action: 'download', resource: 'HepCertificate', employeeKey: key, userId,
        details: { certificateKey, source },
      });
      return { certificateKey, fileName: cert.fileName, mimeType: 'application/pdf', pdfBase64, source };
    }

    const doc = await this.prisma.hcmPyDocument.findFirst({
      where: { organizationId, documentKey: certificateKey, employeeKey: key },
    });
    if (!doc) throw new NotFoundException('Documento de nómina no encontrado');
    const content = doc.content as Record<string, unknown>;
    const pdfBase64 = buildMinimalPdfBase64([
      doc.title,
      `Tipo: ${doc.documentType}`,
      `Período: ${doc.periodCode ?? 'N/D'}`,
      `Empleado: ${doc.employeeKey}`,
      JSON.stringify(content).slice(0, 500),
    ]);
    await this.audit.log({
      organizationId, action: 'download', resource: 'HcmPyDocument', employeeKey: key, userId,
      details: { documentKey: certificateKey, source },
    });
    return {
      certificateKey: doc.documentKey,
      fileName: `${doc.documentType}-${doc.documentKey}.pdf`,
      mimeType: 'application/pdf',
      pdfBase64,
      source,
    };
  }

  async contributions(organizationId: string, userId: string, filters?: {
    employeeKey?: string; periodCode?: string; periodFrom?: string; periodTo?: string;
  }) {
    const employeeKey = await this.ownKey(organizationId, userId, filters?.employeeKey);
    const payslips = await this.listPayslips(organizationId, userId, filters);
    const lines = payslips.flatMap((p) =>
      p.lines.map((l) => ({
        category: l.category,
        conceptName: l.conceptName,
        amount: l.amount,
        kind: l.kind,
        periodCode: p.periodCode,
        payslipKey: p.payslipKey,
      })),
    );
    const groups = groupContributions(lines);
    await this.audit.log({
      organizationId, action: 'query', resource: 'HepContributions', employeeKey, userId,
      details: { categories: groups.map((g) => g.category) },
    });
    return { employeeKey, groups, periods: [...new Set(payslips.map((p) => p.periodCode))] };
  }

  async personalDocuments(organizationId: string, userId: string, employeeKey?: string) {
    const key = await this.ownKey(organizationId, userId, employeeKey);
    const [documents, contracts, evaluations] = await Promise.all([
      this.prisma.hcmEmployeeDocument.findMany({
        where: { organizationId, employeeKey: key },
        include: { versions: { orderBy: { versionNumber: 'desc' } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.hcmContract.findMany({
        where: { organizationId, employeeKey: key },
        include: { renewals: true },
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.hcmTdEvaluation.findMany({
        where: { organizationId, employeeKey: key, status: 'completed' },
        orderBy: { completedAt: 'desc' },
        take: 50,
      }).catch(() => []),
    ]);

    await this.audit.log({
      organizationId, action: 'query', resource: 'HepPersonalDocuments', employeeKey: key, userId,
      details: { documents: documents.length, contracts: contracts.length },
    });

    return {
      documents: documents.map((d) => ({
        documentKey: d.documentKey,
        documentType: d.documentType,
        title: d.title,
        fileName: d.fileName,
        contentType: d.contentType,
        currentVersion: d.currentVersion,
        expiresAt: d.expiresAt,
        versions: d.versions,
      })),
      contracts: contracts.map((c) => ({
        contractKey: c.contractKey,
        contractType: c.contractType,
        status: c.status,
        startDate: c.startDate,
        endDate: c.endDate,
        salary: c.salary,
        renewals: c.renewals,
        documentType: 'contract',
      })),
      signedEvaluations: evaluations.map((e) => ({
        evaluationKey: e.evaluationKey,
        evaluationType: e.evaluationType,
        overallScore: e.overallScore,
        completedAt: e.completedAt,
        documentType: 'evaluation',
      })),
    };
  }

  async downloadPersonalDocument(organizationId: string, userId: string, documentKey: string) {
    const key = await this.ownKey(organizationId, userId);
    const document = await this.prisma.hcmEmployeeDocument.findFirst({
      where: { organizationId, documentKey, employeeKey: key },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });
    if (!document) throw new NotFoundException('Documento no encontrado');
    const version = document.versions[0];
    let pdfBase64 = version?.contentBase64 ?? null;
    if (!pdfBase64) {
      pdfBase64 = buildMinimalPdfBase64([
        document.title,
        `Tipo: ${document.documentType}`,
        `Empleado: ${document.employeeKey}`,
        `Archivo: ${document.fileName ?? document.documentKey}`,
        version?.contentUrl ? `URL: ${version.contentUrl}` : 'Sin contenido embebido',
      ]);
    }
    const fileName = version?.fileName ?? document.fileName ?? `${document.documentKey}.pdf`;
    await this.audit.log({
      organizationId, action: 'download', resource: 'HepPersonalDocument', employeeKey: key, userId,
      details: { documentKey, fileName },
    });
    await this.core.emitUserAction(organizationId, 'HepPersonalDocument', documentKey, EVENT_TYPES.HEP_DOCUMENT_DOWNLOADED, {
      employeeKey: key, fileName,
    });
    return {
      documentKey,
      fileName,
      mimeType: version?.contentType ?? document.contentType ?? 'application/pdf',
      pdfBase64,
      contentUrl: version?.contentUrl,
    };
  }

  async saveOffline(organizationId: string, userId: string, input: {
    sourceType: string; sourceKey: string; title: string; fileName: string;
    pdfBase64?: string; mimeType?: string; periodCode?: string;
  }) {
    const employeeKey = await this.ownKey(organizationId, userId);
    const existing = await this.prisma.hepOfflineDocument.findFirst({
      where: { organizationId, employeeKey, sourceType: input.sourceType, sourceKey: input.sourceKey },
    });
    if (existing) {
      return this.prisma.hepOfflineDocument.update({
        where: { id: existing.id },
        data: {
          title: input.title,
          fileName: input.fileName,
          pdfBase64: input.pdfBase64,
          mimeType: input.mimeType ?? 'application/pdf',
          periodCode: input.periodCode,
          savedAt: new Date(),
        },
      });
    }
    const offlineKey = generateHepKey('OFF', (await this.prisma.hepOfflineDocument.count({ where: { organizationId } })) + 1);
    const row = await this.prisma.hepOfflineDocument.create({
      data: {
        organizationId, offlineKey, employeeKey,
        sourceType: input.sourceType, sourceKey: input.sourceKey,
        title: input.title, fileName: input.fileName,
        pdfBase64: input.pdfBase64, mimeType: input.mimeType ?? 'application/pdf',
        periodCode: input.periodCode,
      },
    });
    await this.audit.log({
      organizationId, action: 'download', resource: 'HepOfflineDocument', employeeKey, userId,
      details: { offlineKey, sourceType: input.sourceType, sourceKey: input.sourceKey },
    });
    return row;
  }

  listOffline(organizationId: string, userId: string) {
    return this.ownKey(organizationId, userId).then((employeeKey) =>
      this.prisma.hepOfflineDocument.findMany({
        where: { organizationId, employeeKey },
        orderBy: { savedAt: 'desc' },
      }),
    );
  }

  async documentsCenter(organizationId: string, userId: string, employeeKey?: string) {
    const [payslips, certificates, personal, offline] = await Promise.all([
      this.listPayslips(organizationId, userId, { employeeKey }),
      this.listCertificates(organizationId, userId, employeeKey),
      this.personalDocuments(organizationId, userId, employeeKey),
      this.listOffline(organizationId, userId),
    ]);
    return {
      payslipCount: payslips.length,
      certificateCount: certificates.portal.length + certificates.payroll.length,
      personalDocumentCount: personal.documents.length,
      contractCount: personal.contracts.length,
      offlineCount: offline.length,
      recentPayslips: payslips.slice(0, 5),
      recentDocuments: personal.documents.slice(0, 5),
    };
  }
}
