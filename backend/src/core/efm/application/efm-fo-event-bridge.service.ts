import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { EVENT_BUS_PORT, EventBusPort } from '@/shared/domain/events/event-bus.port';
import { DomainEvent } from '@/shared/domain/events/domain-event';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EfmFoKpiService } from './efm-fo-kpi.service';
import { EfmFoAiService } from './efm-fo-ai.service';
import { generateFoKey } from '../domain/efm-financial-ops.engine';

const FO_BRIDGE_EVENTS = new Set<string>([
  EVENT_TYPES.EFM_JOURNAL_POSTED,
  EVENT_TYPES.EFM_FO_CLOSING_COMPLETED,
  EVENT_TYPES.EFM_BG_EXECUTION_RECORDED,
  EVENT_TYPES.EFM_TR_MOVEMENT_PROCESSED,
]);

@Injectable()
export class EfmFoEventBridgeService implements OnModuleInit {
  private readonly logger = new Logger(EfmFoEventBridgeService.name);

  constructor(
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
    private readonly prisma: PrismaService,
    private readonly kpis: EfmFoKpiService,
    private readonly ai: EfmFoAiService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('*', async (event) => this.handleEvent(event));
    this.logger.log('EFM Financial Operations bridge subscribed to domain events');
  }

  private async handleEvent(event: DomainEvent) {
    if (!FO_BRIDGE_EVENTS.has(event.eventType)) return;
    const payload = event.payload as Record<string, unknown>;
    const periodKey = String(payload.periodKey ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);

    try {
      if (event.eventType === EVENT_TYPES.EFM_JOURNAL_POSTED) {
        await this.kpis.calculate(event.organizationId, periodKey);
        await this.ai.detectAnomalies(event.organizationId, periodKey);
      }

      if (event.eventType === EVENT_TYPES.EFM_FO_CLOSING_COMPLETED) {
        await this.kpis.calculate(event.organizationId, periodKey);
        await this.ai.generateAll(event.organizationId, periodKey);
        await this.createAlert(event.organizationId, periodKey, 'closing_completed', 'info', 'Cierre contable completado', `Período ${periodKey} cerrado exitosamente`);
      }

      if (event.eventType === EVENT_TYPES.EFM_BG_EXECUTION_RECORDED) {
        const execPct = Number(payload.utilizationPct ?? 0);
        if (execPct > 90) {
          await this.createAlert(event.organizationId, periodKey, 'budget_threshold', 'warning', 'Umbral presupuestal', `Ejecución presupuestal al ${execPct}%`);
        }
      }

      if (event.eventType === EVENT_TYPES.EFM_TR_MOVEMENT_PROCESSED) {
        await this.ai.predictCashflow(event.organizationId, periodKey);
      }
    } catch (err) {
      this.logger.warn(`EFM FO bridge skipped for ${event.eventType}: ${(err as Error).message}`);
    }
  }

  private async createAlert(
    organizationId: string,
    periodKey: string,
    alertType: string,
    severity: 'info' | 'warning' | 'critical',
    title: string,
    message: string,
  ) {
    const seq = (await this.prisma.efmFoFinancialAlert.count({ where: { organizationId } })) + 1;
    await this.prisma.efmFoFinancialAlert.create({
      data: {
        organizationId,
        alertKey: generateFoKey('ALRT', seq),
        alertType,
        severity,
        title,
        message,
        periodKey,
      },
    });
  }
}
