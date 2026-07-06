import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EopsPrismaService } from '@/shared/infrastructure/database/eops-prisma.service';
import { EopsAuditService } from './eops-audit.service';
import { generateEopsKey, validateSecurityConfig } from '../domain/eops.engine';

@Injectable()
export class EopsSecurityService {
  constructor(
    private readonly prisma: EopsPrismaService,
    private readonly config: ConfigService,
    private readonly audit: EopsAuditService,
  ) {}

  listPolicies(organizationId: string) {
    return this.prisma.eopsSecurityPolicy.findMany({ where: { organizationId } });
  }

  upsertPolicy(
    organizationId: string,
    userId: string,
    policyKey: string,
    name: string,
    category: string,
    rules: Record<string, unknown>,
    severity = 'medium',
  ) {
    return this.prisma.eopsSecurityPolicy.upsert({
      where: { organizationId_policyKey: { organizationId, policyKey } },
      create: { organizationId, policyKey, name, category, rules: rules as object, severity, createdBy: userId },
      update: { name, category, rules: rules as object, severity, version: { increment: 1 } },
    });
  }

  listSecrets(organizationId: string) {
    return this.prisma.eopsSecretRef.findMany({
      where: { organizationId },
      select: { id: true, secretKey: true, provider: true, rotationDays: true, lastRotatedAt: true, status: true },
    });
  }

  registerSecret(organizationId: string, secretKey: string, provider = 'vault', rotationDays = 90) {
    return this.prisma.eopsSecretRef.upsert({
      where: { organizationId_secretKey: { organizationId, secretKey } },
      create: { organizationId, secretKey, provider, rotationDays },
      update: { provider, rotationDays },
    });
  }

  async rotateSecret(organizationId: string, userId: string, secretKey: string) {
    const row = await this.prisma.eopsSecretRef.update({
      where: { organizationId_secretKey: { organizationId, secretKey } },
      data: { lastRotatedAt: new Date() },
    });
    await this.audit.log(organizationId, 'Secret', secretKey, 'secret_rotated', userId);
    return row;
  }

  listAlerts(organizationId: string, resolved = false) {
    return this.prisma.eopsSecurityAlert.findMany({
      where: { organizationId, resolved },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async raiseAlert(organizationId: string, title: string, severity: string, source: string, details?: Record<string, unknown>) {
    const count = await this.prisma.eopsSecurityAlert.count({ where: { organizationId } });
    const alertKey = generateEopsKey('SEC', count + 1);
    return this.prisma.eopsSecurityAlert.create({
      data: { organizationId, alertKey, title, severity, source, details: (details ?? {}) as object },
    });
  }

  async scanConfiguration(organizationId: string) {
    const cfg = {
      jwtSecret: this.config.get<string>('JWT_SECRET'),
      allowHttp: this.config.get<boolean>('ALLOW_HTTP', false),
      mfaRequired: this.config.get<boolean>('MFA_REQUIRED', true),
      environment: this.config.get<string>('NODE_ENV', 'development'),
    };
    const issues = validateSecurityConfig(cfg);
    if (issues.length) {
      await this.raiseAlert(organizationId, 'Insecure configuration detected', 'high', 'config_scan', { issues });
    }
    return { issues, secure: issues.length === 0, scannedAt: new Date().toISOString() };
  }

  resolveAlert(organizationId: string, alertKey: string) {
    return this.prisma.eopsSecurityAlert.update({
      where: { organizationId_alertKey: { organizationId, alertKey } },
      data: { resolved: true, resolvedAt: new Date() },
    });
  }
}
