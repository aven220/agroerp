import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class AiContextManagerService {
  constructor(private readonly prisma: PrismaService) {}

  async buildContext(
    organizationId: string,
    userId: string,
    options?: { moduleContext?: string; copilotKey?: string; permissions?: string[] },
  ) {
    const [user, org, copilot] = await Promise.all([
      this.prisma.user.findFirst({
        where: { id: userId, organizationId },
        select: { firstName: true, lastName: true, email: true, locale: true, timezone: true },
      }),
      this.prisma.organization.findFirst({
        where: { id: organizationId },
        select: { name: true, slug: true, settings: true },
      }),
      options?.copilotKey
        ? this.prisma.aiCopilotDefinition.findFirst({
            where: { organizationId, copilotKey: options.copilotKey, isActive: true },
          })
        : null,
    ]);

    const erpSnapshot = await this.getErpSnapshot(organizationId, options?.moduleContext);

    return {
      organizationId,
      userId,
      user: user ? { name: `${user.firstName} ${user.lastName}`, email: user.email, locale: user.locale } : null,
      organization: org ? { name: org.name, slug: org.slug } : null,
      moduleContext: options?.moduleContext ?? 'general',
      copilot: copilot
        ? { key: copilot.copilotKey, category: copilot.category, scopes: copilot.contextScopes }
        : null,
      permissions: options?.permissions ?? [],
      erpSnapshot,
      generatedAt: new Date().toISOString(),
    };
  }

  toSystemPrompt(context: Awaited<ReturnType<AiContextManagerService['buildContext']>>, copilotPrompt?: string) {
    const lines = [
      'Eres el asistente de inteligencia artificial de AGROERP.',
      `organizationId: ${context.organizationId}`,
      `Usuario: ${context.user?.name ?? 'N/A'} (${context.user?.email ?? ''})`,
      `Organización: ${context.organization?.name ?? 'N/A'}`,
      `Módulo: ${context.moduleContext}`,
      `Datos ERP: ${JSON.stringify(context.erpSnapshot)}`,
      `Fecha contexto: ${context.generatedAt}`,
    ];
    if (copilotPrompt) lines.push(copilotPrompt);
    return lines.join('\n');
  }

  private async getErpSnapshot(organizationId: string, moduleContext?: string) {
    const base = {
      producers: await this.prisma.producer.count({ where: { organizationId, deletedAt: null } }),
      farms: await this.prisma.farmUnit.count({ where: { organizationId, deletedAt: null } }),
      lots: await this.prisma.fieldLotProfile.count({ where: { organizationId, deletedAt: null } }),
      activeWorkflows: await this.prisma.workflowInstance.count({ where: { organizationId, status: 'active' } }),
      unreadNotifications: await this.prisma.notificationMessage.count({
        where: { organizationId, status: 'unread', deletedAt: null },
      }),
    };

    if (moduleContext === 'producers') {
      return {
        ...base,
        activeProducers: await this.prisma.producer.count({
          where: { organizationId, lifecycleStatus: 'active', deletedAt: null },
        }),
      };
    }
    if (moduleContext === 'agronomic' || moduleContext === 'lots') {
      return {
        ...base,
        fieldOperations: await this.prisma.fieldOperation.count({ where: { organizationId } }),
      };
    }
    return base;
  }
}
