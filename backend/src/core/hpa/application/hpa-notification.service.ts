import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HpaAuditService } from './hpa-audit.service';
import { generateHpaKey } from '../domain/hpa-analytics.engine';
import type { HpaNotificationType } from '@prisma/client';

@Injectable()
export class HpaNotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: HpaAuditService,
    private readonly core: CoreEngineService,
  ) {}

  listForEmployee(organizationId: string, employeeKey: string) {
    return this.prisma.hpaNotification.findMany({
      where: { organizationId, employeeKey },
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    });
  }

  async markRead(organizationId: string, notificationKey: string, userId: string) {
    const row = await this.prisma.hpaNotification.findFirst({ where: { organizationId, notificationKey } });
    if (!row) return null;
    const updated = await this.prisma.hpaNotification.update({
      where: { id: row.id },
      data: { isRead: true },
    });
    await this.audit.log({
      organizationId, action: 'query', resource: 'HpaNotificationRead', userId,
      employeeKey: row.employeeKey ?? undefined, details: { notificationKey },
    });
    return updated;
  }

  async refreshForEmployee(organizationId: string, employeeKey: string, userId?: string) {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 86400000);
    const items: Array<{
      notificationType: HpaNotificationType;
      title: string;
      message: string;
      referenceType?: string;
      referenceKey?: string;
      dueAt?: Date;
    }> = [];

    const [courses, evaluations, documents, certifications, birthdays, novelties, requests] = await Promise.all([
      this.prisma.hcmTdEnrollment.findMany({
        where: { organizationId, employeeKey, status: { in: ['enrolled', 'in_progress'] } },
        include: { course: true },
        take: 20,
      }),
      this.prisma.hcmTdEvaluation.findMany({
        where: { organizationId, employeeKey, status: { in: ['draft', 'pending', 'in_review'] } },
        take: 20,
      }),
      this.prisma.hcmEmployeeDocument.findMany({
        where: { organizationId, employeeKey, expiresAt: { gte: now, lte: in30 } },
        take: 20,
      }),
      this.prisma.hcmTdCertification.findMany({
        where: {
          organizationId,
          employeeKey,
          OR: [
            { status: 'pending_renewal' },
            { expiresAt: { gte: now, lte: in30 } },
          ],
        },
        take: 20,
      }),
      this.prisma.hcmEmployee.findMany({
        where: { organizationId, employmentStatus: 'active', birthDate: { not: null } },
        select: { employeeKey: true, displayName: true, firstName: true, lastName: true, birthDate: true },
      }),
      this.prisma.hcmTaTimeNovelty.findMany({
        where: { organizationId, employeeKey, status: { in: ['pending', 'approved'] } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.hepRequest.findMany({
        where: { organizationId, employeeKey, status: { in: ['pending_approval', 'submitted', 'approved', 'rejected'] } },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
    ]);

    for (const c of courses) {
      items.push({
        notificationType: 'course_pending',
        title: 'Curso pendiente',
        message: c.course?.title ?? c.courseKey,
        referenceType: 'HcmTdEnrollment',
        referenceKey: c.enrollmentKey,
      });
    }
    for (const e of evaluations) {
      items.push({
        notificationType: 'evaluation_pending',
        title: 'Evaluación pendiente',
        message: `${e.evaluationType} · ${e.status}`,
        referenceType: 'HcmTdEvaluation',
        referenceKey: e.evaluationKey,
      });
    }
    for (const d of documents) {
      items.push({
        notificationType: 'document_expiring',
        title: 'Documento próximo a vencer',
        message: d.title,
        referenceType: 'HcmEmployeeDocument',
        referenceKey: d.documentKey,
        dueAt: d.expiresAt ?? undefined,
      });
    }
    for (const c of certifications) {
      items.push({
        notificationType: 'certification',
        title: 'Certificación por renovar',
        message: c.name,
        referenceType: 'HcmTdCertification',
        referenceKey: c.certificationKey,
        dueAt: c.expiresAt ?? undefined,
      });
    }
    for (const b of birthdays) {
      if (!b.birthDate) continue;
      if (b.birthDate.getUTCMonth() === now.getUTCMonth() && b.birthDate.getUTCDate() === now.getUTCDate()) {
        items.push({
          notificationType: 'birthday',
          title: 'Cumpleaños',
          message: b.displayName || `${b.firstName} ${b.lastName}`,
          referenceType: 'HcmEmployee',
          referenceKey: b.employeeKey,
        });
      }
    }
    for (const n of novelties) {
      items.push({
        notificationType: 'novelty',
        title: 'Novedad laboral',
        message: `${n.noveltyType} · ${n.status}`,
        referenceType: 'HcmTaTimeNovelty',
        referenceKey: n.noveltyKey,
      });
    }
    for (const r of requests) {
      items.push({
        notificationType: 'request_status',
        title: 'Estado de solicitud',
        message: `${r.title} · ${r.status}`,
        referenceType: 'HepRequest',
        referenceKey: r.requestKey,
      });
    }

    items.push({
      notificationType: 'reminder',
      title: 'Recordatorio del portal',
      message: 'Revisa tus solicitudes, cursos y documentos pendientes.',
    });

    let created = 0;
    for (const [index, item] of items.entries()) {
      const exists = await this.prisma.hpaNotification.findFirst({
        where: {
          organizationId,
          employeeKey,
          notificationType: item.notificationType,
          ...(item.referenceKey ? { referenceKey: item.referenceKey } : { referenceKey: null }),
          isRead: false,
        },
      });
      if (exists) continue;
      await this.prisma.hpaNotification.create({
        data: {
          organizationId,
          notificationKey: generateHpaKey('NTF', (Date.now() % 1000000) * 100 + index),
          employeeKey,
          notificationType: item.notificationType,
          title: item.title,
          message: item.message,
          referenceType: item.referenceType,
          referenceKey: item.referenceKey,
          dueAt: item.dueAt,
          pushQueued: true,
          metadata: { pushReady: true },
        },
      });
      created++;
    }

    await this.audit.log({
      organizationId, action: 'query', resource: 'HpaNotificationRefresh', userId,
      employeeKey, details: { created },
    });
    await this.core.emitUserAction(organizationId, 'HpaNotification', employeeKey, EVENT_TYPES.HPA_NOTIFICATIONS_REFRESHED, {
      created,
    });

    return this.listForEmployee(organizationId, employeeKey);
  }
}
