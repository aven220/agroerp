import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class WorkflowMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(organizationId: string) {
    const now = new Date();

    const [
      activeCount,
      suspendedCount,
      overdueCount,
      completedLast30d,
      instancesByState,
      assignmentsByUser,
      avgDuration,
    ] = await Promise.all([
      this.prisma.workflowInstance.count({
        where: { organizationId, status: 'active' },
      }),
      this.prisma.workflowInstance.count({
        where: { organizationId, status: 'suspended' },
      }),
      this.prisma.workflowInstance.count({
        where: {
          organizationId,
          status: 'active',
          dueAt: { lt: now },
        },
      }),
      this.prisma.workflowInstance.count({
        where: {
          organizationId,
          status: 'completed',
          completedAt: { gte: new Date(now.getTime() - 30 * 24 * 3600000) },
        },
      }),
      this.prisma.workflowInstance.groupBy({
        by: ['currentState'],
        where: { organizationId, status: 'active' },
        _count: { id: true },
      }),
      this.prisma.workflowAssignment.groupBy({
        by: ['userId'],
        where: { organizationId, status: 'pending' },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      this.prisma.$queryRaw<{ avg_hours: number }[]>`
        SELECT AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 3600) as avg_hours
        FROM workflow_instances
        WHERE organization_id = ${organizationId}::uuid
          AND status = 'completed'
          AND completed_at IS NOT NULL
      `,
    ]);

    const bottlenecks = instancesByState
      .map((row) => ({
        state: row.currentState,
        count: row._count.id,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      summary: {
        activeProcesses: activeCount,
        suspendedProcesses: suspendedCount,
        overdueProcesses: overdueCount,
        completedLast30Days: completedLast30d,
        averageCompletionHours: Number(avgDuration[0]?.avg_hours ?? 0),
      },
      bottlenecks,
      workloadByUser: assignmentsByUser.map((row) => ({
        userId: row.userId,
        pendingAssignments: row._count.id,
      })),
      sla: {
        overdue: overdueCount,
        onTrack: activeCount - overdueCount,
      },
    };
  }
}
