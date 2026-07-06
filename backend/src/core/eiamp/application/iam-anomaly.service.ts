import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class IamAnomalyService {
  constructor(private readonly prisma: PrismaService) {}

  async analyzeLogin(organizationId: string, userId: string, ipAddress?: string, success?: boolean) {
    const recent = await this.prisma.iamAuthAttempt.findMany({
      where: { userId, createdAt: { gte: new Date(Date.now() - 3600000) } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const failures = recent.filter((r) => !r.success).length;
    const uniqueIps = new Set(recent.map((r) => r.ipAddress).filter(Boolean));

    let score = 0;
    const alerts: Array<{ type: string; severity: 'low' | 'medium' | 'high' | 'critical'; desc: string; rec: string }> = [];

    if (!success && failures >= 3) {
      score += 0.4;
      alerts.push({
        type: 'brute_force',
        severity: failures >= 5 ? 'high' : 'medium',
        desc: `${failures} intentos fallidos en la última hora`,
        rec: 'Verificar bloqueo automático y habilitar MFA',
      });
    }

    if (uniqueIps.size >= 3) {
      score += 0.35;
      alerts.push({
        type: 'impossible_travel',
        severity: 'medium',
        desc: `Accesos desde ${uniqueIps.size} IPs distintas en 1h`,
        rec: 'Revisar sesiones activas y revocar dispositivos desconocidos',
      });
    }

    if (ipAddress && recent.some((r) => r.ipAddress && r.ipAddress !== ipAddress && r.success)) {
      score += 0.2;
    }

    for (const a of alerts) {
      await this.prisma.iamAnomalyAlert.create({
        data: {
          organizationId,
          userId,
          alertType: a.type,
          severity: a.severity,
          score,
          description: a.desc,
          recommendation: a.rec,
        },
      });
      await this.prisma.iamSecurityEvent.create({
        data: {
          organizationId,
          userId,
          eventType: 'anomaly_detected',
          details: { alertType: a.type, score } as object,
        },
      });
    }

    return { score, alerts };
  }

  async listAlerts(organizationId: string, unresolvedOnly = true) {
    return this.prisma.iamAnomalyAlert.findMany({
      where: { organizationId, ...(unresolvedOnly ? { isResolved: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async resolve(organizationId: string, alertId: string) {
    return this.prisma.iamAnomalyAlert.updateMany({
      where: { id: alertId, organizationId },
      data: { isResolved: true },
    });
  }
}
