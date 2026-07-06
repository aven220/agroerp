import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { BreExecutorService } from './bre-executor.service';

@Injectable()
export class BreSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(BreSchedulerService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly executor: BreExecutorService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => this.tick().catch(() => undefined), 60_000);
    this.timer.unref?.();
    this.logger.log('EBRE scheduler started (60s interval)');
  }

  private async tick() {
    const rules = await this.prisma.breBusinessRule.findMany({
      where: {
        status: 'published',
        deletedAt: null,
        triggerType: 'scheduled',
      },
      include: { decisionTable: true },
    });

    const now = new Date();
    for (const rule of rules) {
      const schedule = rule.schedule as { intervalMinutes?: number; allowedHours?: { start: string; end: string } };
      if (schedule.allowedHours) {
        const h = now.getHours();
        const start = parseInt(schedule.allowedHours.start.split(':')[0], 10);
        const end = parseInt(schedule.allowedHours.end.split(':')[0], 10);
        if (h < start || h >= end) continue;
      }
      const interval = schedule.intervalMinutes ?? 60;
      const last = await this.prisma.breRuleExecution.findFirst({
        where: { ruleId: rule.id },
        orderBy: { executedAt: 'desc' },
      });
      if (last && now.getTime() - last.executedAt.getTime() < interval * 60_000) continue;

      await this.executor.executeRule(rule, {
        eventType: 'ScheduledRule',
        payload: { scheduledAt: now.toISOString() },
        dryRun: false,
      });
    }
  }
}
