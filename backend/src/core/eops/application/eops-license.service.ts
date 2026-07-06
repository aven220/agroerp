import { Injectable } from '@nestjs/common';
import { EopsPrismaService } from '@/shared/infrastructure/database/eops-prisma.service';
import { EOPS_LICENSE_PLANS, daysUntil } from '../domain/eops.engine';

@Injectable()
export class EopsLicenseService {
  constructor(private readonly prisma: EopsPrismaService) {}

  catalog() {
    return EOPS_LICENSE_PLANS;
  }

  listPlans(organizationId: string) {
    return this.prisma.eopsLicensePlan.findMany({ where: { organizationId }, include: { licenses: true } });
  }

  async bootstrapPlans(organizationId: string) {
    for (const p of EOPS_LICENSE_PLANS) {
      await this.prisma.eopsLicensePlan.upsert({
        where: { organizationId_planKey: { organizationId, planKey: p.planKey } },
        create: {
          organizationId,
          planKey: p.planKey,
          name: p.name,
          features: p.features,
          limits: p.limits,
        },
        update: { name: p.name, features: p.features, limits: p.limits },
      });
    }
  }

  listLicenses(organizationId: string) {
    return this.prisma.eopsLicense.findMany({ where: { organizationId }, include: { plan: true } });
  }

  async issueLicense(organizationId: string, licenseKey: string, planKey: string, seats = 1, trialDays = 0) {
    const plan = await this.prisma.eopsLicensePlan.findFirst({ where: { organizationId, planKey } });
    if (!plan) throw new Error(`Plan ${planKey} not found`);
    const trialEndsAt = trialDays > 0 ? new Date(Date.now() + trialDays * 86400000) : null;
    const expiresAt = new Date(Date.now() + 365 * 86400000);
    return this.prisma.eopsLicense.upsert({
      where: { organizationId_licenseKey: { organizationId, licenseKey } },
      create: {
        organizationId,
        licenseKey,
        planId: plan.id,
        seats,
        trialEndsAt,
        expiresAt,
        usageLimit: plan.limits as object,
      },
      update: { seats, trialEndsAt, expiresAt },
    });
  }

  listSubscriptions(organizationId: string) {
    return this.prisma.eopsSubscription.findMany({ where: { organizationId } });
  }

  upsertSubscription(organizationId: string, subscriptionKey: string, planKey: string, renewsAt?: Date) {
    return this.prisma.eopsSubscription.upsert({
      where: { organizationId_subscriptionKey: { organizationId, subscriptionKey } },
      create: { organizationId, subscriptionKey, planKey, renewsAt, billingRef: 'billing://integration-ready' },
      update: { planKey, renewsAt },
    });
  }

  async usageDashboard(organizationId: string) {
    const licenses = await this.listLicenses(organizationId);
    const nearest = licenses
      .map((l) => daysUntil(l.expiresAt))
      .sort((a, b) => a - b)[0] ?? 999;
    const alerts = nearest <= 30 ? [{ type: 'expiry_warning', daysLeft: nearest }] : [];
    return { licenses: licenses.length, licenseDaysLeft: nearest, alerts, billingIntegrationReady: true };
  }
}
