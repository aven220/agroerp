import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HepAuditService } from './hep-audit.service';
import { HepDashboardService } from './hep-dashboard.service';
import {
  buildMinimalPdfBase64,
  canCancelRequest,
  canDecideRequest,
  canSubmitRequest,
  categoryFromRequestType,
  computeRequestDays,
  defaultRequestTitle,
  fullDisplayName,
  generateHepKey,
  validateAttachment,
  validateRequestCreate,
  vacationBalanceSummary,
  type HepRequestTypeCode,
} from '../domain/hep-portal.engine';
import type { HepRequestStatus, HepRequestType } from '@prisma/client';

@Injectable()
export class HepRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: HepAuditService,
    private readonly core: CoreEngineService,
    private readonly dashboard: HepDashboardService,
  ) {}

  list(organizationId: string, userId: string, filters?: {
    employeeKey?: string; status?: HepRequestStatus; category?: string;
  }) {
    return this.dashboard.resolveEmployeeKey(organizationId, userId, filters?.employeeKey).then((employeeKey) =>
      this.prisma.hepRequest.findMany({
        where: {
          organizationId,
          employeeKey,
          ...(filters?.status ? { status: filters.status } : {}),
          ...(filters?.category ? { category: filters.category as never } : {}),
        },
        include: { attachments: true, events: { orderBy: { createdAt: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  async get(organizationId: string, userId: string, requestKey: string) {
    const employeeKey = await this.dashboard.resolveEmployeeKey(organizationId, userId);
    const request = await this.prisma.hepRequest.findFirst({
      where: { organizationId, requestKey, employeeKey },
      include: { attachments: true, events: { orderBy: { createdAt: 'asc' } } },
    });
    if (!request) throw new NotFoundException(`Solicitud ${requestKey} no encontrada`);
    await this.audit.log({
      organizationId, action: 'query', resource: 'HepRequest', employeeKey, userId,
      details: { requestKey },
    });
    return request;
  }

  async vacationSummary(organizationId: string, userId: string, employeeKey?: string) {
    const key = await this.dashboard.resolveEmployeeKey(organizationId, userId, employeeKey);
    const [balance, requests] = await Promise.all([
      this.prisma.hcmPyVacationBalance.findFirst({ where: { organizationId, employeeKey: key } }),
      this.prisma.hepRequest.findMany({
        where: { organizationId, employeeKey: key, category: 'vacation' },
        orderBy: { startDate: 'desc' },
      }),
    ]);
    const enjoyed = requests.filter((r) => r.status === 'approved' || r.status === 'completed');
    const scheduled = requests.filter((r) => ['submitted', 'pending_approval', 'approved'].includes(r.status)
      && r.endDate && r.endDate >= new Date());
    await this.audit.log({
      organizationId, action: 'query', resource: 'HepVacationSummary', employeeKey: key, userId,
    });
    return {
      balance: vacationBalanceSummary(balance),
      enjoyed,
      scheduled,
      requests,
    };
  }

  async create(organizationId: string, userId: string, input: {
    requestType: HepRequestTypeCode;
    title?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    hours?: number;
    days?: number;
    observations?: string;
    submit?: boolean;
    employeeKey?: string;
  }) {
    const employeeKey = await this.dashboard.resolveEmployeeKey(organizationId, userId, input.employeeKey);
    const validation = validateRequestCreate(input);
    if (!validation.valid) throw new BadRequestException(validation.errors.join('; '));

    const category = categoryFromRequestType(input.requestType);
    const days = computeRequestDays(input.startDate, input.endDate, input.days);

    if (category === 'vacation') {
      const balance = await this.prisma.hcmPyVacationBalance.findFirst({ where: { organizationId, employeeKey } });
      const available = balance?.availableDays ?? 0;
      if (days > available) throw new BadRequestException(`Saldo insuficiente (${available} días disponibles)`);
    }

    const requestKey = generateHepKey('REQ', (await this.prisma.hepRequest.count({ where: { organizationId } })) + 1);
    const status: HepRequestStatus = input.submit ? 'pending_approval' : 'draft';
    const request = await this.prisma.hepRequest.create({
      data: {
        organizationId, requestKey, employeeKey,
        category, requestType: input.requestType as HepRequestType,
        status,
        title: input.title ?? defaultRequestTitle(input.requestType),
        description: input.description,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        hours: input.hours, days: days || input.days,
        observations: input.observations,
        createdBy: userId,
        metadata: { source: 'portal_self_service' },
      },
    });

    await this.addEvent(organizationId, requestKey, 'created', userId, 'Solicitud creada');
    await this.audit.log({
      organizationId, action: 'request_created', resource: 'HepRequest', employeeKey, userId,
      details: { requestKey, requestType: input.requestType, status },
    });

    if (input.submit) {
      return this.submit(organizationId, userId, requestKey);
    }
    return this.get(organizationId, userId, requestKey);
  }

  async submit(organizationId: string, userId: string, requestKey: string) {
    const request = await this.getOwned(organizationId, userId, requestKey);
    if (!canSubmitRequest(request.status)) throw new BadRequestException('Solicitud no puede enviarse');

    const workflowId = generateHepKey('WF', Date.now() % 100000000);
    const updated = await this.prisma.hepRequest.update({
      where: { id: request.id },
      data: {
        status: 'pending_approval',
        workflowId,
        metadata: {
          ...(request.metadata as object),
          workflowQueued: true,
          notificationQueued: true,
          submittedAt: new Date().toISOString(),
        },
      },
    });

    await this.addEvent(organizationId, requestKey, 'submitted', userId, 'Enviada a aprobación');
    await this.audit.log({
      organizationId, action: 'request_submitted', resource: 'HepRequest',
      employeeKey: request.employeeKey, userId, details: { requestKey, workflowId },
    });
    await this.core.emitUserAction(organizationId, 'HepRequest', requestKey, EVENT_TYPES.HEP_REQUEST_SUBMITTED, {
      requestType: request.requestType,
      employeeKey: request.employeeKey,
      workflowId,
      category: request.category,
    });

    if (request.category === 'certificate') {
      return this.generateCertificateFromRequest(organizationId, userId, requestKey);
    }
    return updated;
  }

  async cancel(organizationId: string, userId: string, requestKey: string, reason?: string) {
    const request = await this.getOwned(organizationId, userId, requestKey);
    if (!canCancelRequest(request.status)) throw new BadRequestException('Solicitud no puede cancelarse');
    const updated = await this.prisma.hepRequest.update({
      where: { id: request.id },
      data: { status: 'cancelled', rejectionReason: reason },
    });
    await this.addEvent(organizationId, requestKey, 'cancelled', userId, reason ?? 'Cancelada por el colaborador');
    await this.audit.log({
      organizationId, action: 'request_cancelled', resource: 'HepRequest',
      employeeKey: request.employeeKey, userId, details: { requestKey, reason },
    });
    await this.core.emitUserAction(organizationId, 'HepRequest', requestKey, EVENT_TYPES.HEP_REQUEST_CANCELLED, { reason });
    return updated;
  }

  async decide(organizationId: string, userId: string, requestKey: string, approved: boolean, comment?: string) {
    const request = await this.prisma.hepRequest.findFirst({
      where: { organizationId, requestKey },
      include: { attachments: true, events: true },
    });
    if (!request) throw new NotFoundException('Solicitud no encontrada');
    if (!canDecideRequest(request.status)) throw new BadRequestException('Solicitud no pendiente de decisión');

    const status: HepRequestStatus = approved ? 'approved' : 'rejected';
    const updated = await this.prisma.hepRequest.update({
      where: { id: request.id },
      data: {
        status,
        approvedBy: userId,
        approvedAt: new Date(),
        rejectionReason: approved ? null : comment,
        metadata: {
          ...(request.metadata as object),
          workflowCompleted: true,
          notificationQueued: true,
        },
      },
    });

    await this.addEvent(organizationId, requestKey, approved ? 'approved' : 'rejected', userId, comment);
    await this.audit.log({
      organizationId,
      action: approved ? 'request_approved' : 'request_rejected',
      resource: 'HepRequest',
      employeeKey: request.employeeKey,
      userId,
      details: { requestKey, comment },
    });
    await this.core.emitUserAction(organizationId, 'HepRequest', requestKey, EVENT_TYPES.HEP_REQUEST_DECIDED, {
      approved, comment, employeeKey: request.employeeKey,
    });

    if (approved && request.category === 'vacation' && request.days) {
      const balance = await this.prisma.hcmPyVacationBalance.findFirst({
        where: { organizationId, employeeKey: request.employeeKey },
      });
      if (balance) {
        await this.prisma.hcmPyVacationBalance.update({
          where: { id: balance.id },
          data: {
            pendingDays: Math.max(0, balance.pendingDays + request.days),
            availableDays: Math.max(0, balance.availableDays - request.days),
          },
        });
      }
    }

    return updated;
  }

  async addAttachment(organizationId: string, userId: string, input: {
    requestKey: string; fileName: string; mimeType?: string; storageKey?: string;
    fileSize?: number; caption?: string;
  }) {
    const request = await this.getOwned(organizationId, userId, input.requestKey);
    if (['cancelled', 'rejected', 'completed'].includes(request.status)) {
      throw new BadRequestException('No se pueden adjuntar archivos a esta solicitud');
    }
    const check = validateAttachment(input.fileName, input.mimeType);
    if (!check.valid) throw new BadRequestException(check.reason);

    const attachmentKey = generateHepKey('ATT', (await this.prisma.hepRequestAttachment.count({ where: { organizationId } })) + 1);
    const attachment = await this.prisma.hepRequestAttachment.create({
      data: {
        organizationId, attachmentKey, requestKey: input.requestKey,
        fileName: input.fileName, mimeType: input.mimeType, storageKey: input.storageKey,
        fileSize: input.fileSize, caption: input.caption, createdBy: userId,
        metadata: { documentQueued: true },
      },
    });
    await this.addEvent(organizationId, input.requestKey, 'attachment', userId, `Adjunto: ${input.fileName}`);
    await this.audit.log({
      organizationId, action: 'query', resource: 'HepRequestAttachment',
      employeeKey: request.employeeKey, userId, details: { attachmentKey, requestKey: input.requestKey },
    });
    await this.core.emitUserAction(organizationId, 'HepRequestAttachment', attachmentKey, EVENT_TYPES.HEP_ATTACHMENT_ADDED, {
      requestKey: input.requestKey, fileName: input.fileName,
    });
    return attachment;
  }

  async history(organizationId: string, userId: string, employeeKey?: string) {
    const key = await this.dashboard.resolveEmployeeKey(organizationId, userId, employeeKey);
    const requests = await this.prisma.hepRequest.findMany({
      where: { organizationId, employeeKey: key },
      include: { events: { orderBy: { createdAt: 'asc' } }, attachments: true },
      orderBy: { createdAt: 'desc' },
    });
    await this.audit.log({
      organizationId, action: 'query', resource: 'HepRequestHistory', employeeKey: key, userId,
      details: { count: requests.length },
    });
    return requests;
  }

  async generateCertificate(organizationId: string, userId: string, input: {
    certificateType: 'certificate_labor' | 'certificate_income' | 'certificate_custom';
    title?: string;
    observations?: string;
    employeeKey?: string;
  }) {
    const request = await this.create(organizationId, userId, {
      requestType: input.certificateType,
      title: input.title,
      observations: input.observations,
      employeeKey: input.employeeKey,
      submit: true,
    });
    return request;
  }

  async downloadCertificate(organizationId: string, userId: string, certificateKey: string) {
    const employeeKey = await this.dashboard.resolveEmployeeKey(organizationId, userId);
    const cert = await this.prisma.hepCertificate.findFirst({
      where: { organizationId, certificateKey, employeeKey },
    });
    if (!cert) throw new NotFoundException('Certificado no encontrado');
    await this.prisma.hepCertificate.update({
      where: { id: cert.id },
      data: { status: 'downloaded' },
    });
    await this.audit.log({
      organizationId, action: 'query', resource: 'HepCertificate', employeeKey, userId,
      details: { certificateKey, download: true },
    });
    return {
      certificateKey: cert.certificateKey,
      fileName: cert.fileName,
      mimeType: 'application/pdf',
      pdfBase64: cert.pdfBase64,
      content: cert.content,
      issuedAt: cert.issuedAt,
    };
  }

  listCertificates(organizationId: string, userId: string, employeeKey?: string) {
    return this.dashboard.resolveEmployeeKey(organizationId, userId, employeeKey).then((key) =>
      this.prisma.hepCertificate.findMany({
        where: { organizationId, employeeKey: key },
        orderBy: { issuedAt: 'desc' },
      }),
    );
  }

  private async generateCertificateFromRequest(organizationId: string, userId: string, requestKey: string) {
    const request = await this.getOwned(organizationId, userId, requestKey);
    const employee = await this.prisma.hcmEmployee.findFirst({
      where: { organizationId, employeeKey: request.employeeKey },
      include: { contracts: { where: { status: 'active' }, take: 1 } },
    });
    if (!employee) throw new NotFoundException('Empleado no encontrado');

    const contract = employee.contracts[0];
    const certificateKey = generateHepKey('CRT', (await this.prisma.hepCertificate.count({ where: { organizationId } })) + 1);
    const fullName = fullDisplayName(employee);
    const content = {
      employeeKey: employee.employeeKey,
      fullName,
      documentNumber: employee.documentNumber,
      positionKey: employee.positionKey,
      departmentKey: employee.departmentKey,
      hireDate: employee.hireDate,
      employmentStatus: employee.employmentStatus,
      contractType: contract?.contractType,
      salary: contract?.salary,
      currencyKey: contract?.currencyKey,
      issuedAt: new Date().toISOString(),
      certificateType: request.requestType,
      observations: request.observations,
    };
    const lines = [
      request.title,
      `Empleado: ${fullName}`,
      `Documento: ${employee.documentNumber}`,
      `Estado: ${employee.employmentStatus}`,
      contract?.salary != null ? `Ingresos: ${contract.salary} ${contract.currencyKey}` : 'Ingresos: N/D',
      `Emitido: ${new Date().toISOString().slice(0, 10)}`,
    ];
    const pdfBase64 = buildMinimalPdfBase64(lines);
    const fileName = `${request.requestType}-${employee.employeeKey}.pdf`;

    const cert = await this.prisma.hepCertificate.create({
      data: {
        organizationId, certificateKey, employeeKey: request.employeeKey,
        requestKey, certificateType: request.requestType, title: request.title,
        content, pdfBase64, fileName, createdBy: userId,
      },
    });

    await this.prisma.hepRequest.update({
      where: { id: request.id },
      data: { status: 'completed', certificateKey, approvedAt: new Date(), approvedBy: userId },
    });
    await this.addEvent(organizationId, requestKey, 'certificate_generated', userId, 'Certificado generado');
    await this.audit.log({
      organizationId, action: 'certificate_generated', resource: 'HepCertificate',
      employeeKey: request.employeeKey, userId, details: { certificateKey, requestKey },
    });
    await this.core.emitUserAction(organizationId, 'HepCertificate', certificateKey, EVENT_TYPES.HEP_CERTIFICATE_GENERATED, {
      requestKey, certificateType: request.requestType,
    });

    return this.get(organizationId, userId, requestKey).then((r) => ({ ...r, certificate: cert }));
  }

  private async getOwned(organizationId: string, userId: string, requestKey: string) {
    const employeeKey = await this.dashboard.resolveEmployeeKey(organizationId, userId);
    const request = await this.prisma.hepRequest.findFirst({ where: { organizationId, requestKey, employeeKey } });
    if (!request) throw new NotFoundException(`Solicitud ${requestKey} no encontrada`);
    return request;
  }

  private async addEvent(organizationId: string, requestKey: string, eventType: string, userId: string, comment?: string) {
    const eventKey = generateHepKey('EVT', Date.now() % 100000000);
    return this.prisma.hepRequestEvent.create({
      data: {
        organizationId, eventKey, requestKey, eventType, comment,
        actorUserId: userId,
      },
    });
  }
}
