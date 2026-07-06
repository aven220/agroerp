import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class ObsServiceMapService {
  constructor(private readonly prisma: PrismaService) {}

  listNodes(organizationId?: string) {
    return this.prisma.eopServiceNode.findMany({
      where: organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {},
      orderBy: { name: 'asc' },
    });
  }

  upsertNode(data: {
    nodeKey: string; name: string; component: string; organizationId?: string;
    status?: string; version?: string; metadata?: Record<string, unknown>;
  }) {
    return this.prisma.eopServiceNode.upsert({
      where: { nodeKey: data.nodeKey },
      update: {
        name: data.name,
        status: (data.status ?? 'healthy') as 'healthy',
        version: data.version,
        metadata: (data.metadata ?? {}) as object,
        lastSeenAt: new Date(),
        organizationId: data.organizationId,
      },
      create: {
        nodeKey: data.nodeKey,
        name: data.name,
        component: data.component as 'backend',
        status: (data.status ?? 'healthy') as 'healthy',
        version: data.version,
        metadata: (data.metadata ?? {}) as object,
        organizationId: data.organizationId,
        lastSeenAt: new Date(),
      },
    });
  }

  async addDependency(data: {
    sourceNodeKey: string; targetNodeKey: string; dependencyType?: string;
    organizationId?: string; latencyMsAvg?: number; errorRate?: number;
  }) {
    const source = await this.prisma.eopServiceNode.findUnique({ where: { nodeKey: data.sourceNodeKey } });
    const target = await this.prisma.eopServiceNode.findUnique({ where: { nodeKey: data.targetNodeKey } });
    if (!source || !target) throw new Error('Nodos de dependencia no encontrados');

    return this.prisma.eopServiceDependency.upsert({
      where: {
        sourceNodeId_targetNodeId_dependencyType: {
          sourceNodeId: source.id,
          targetNodeId: target.id,
          dependencyType: data.dependencyType ?? 'calls',
        },
      },
      update: {
        latencyMsAvg: data.latencyMsAvg,
        errorRate: data.errorRate,
      },
      create: {
        organizationId: data.organizationId,
        sourceNodeId: source.id,
        targetNodeId: target.id,
        dependencyType: data.dependencyType ?? 'calls',
        latencyMsAvg: data.latencyMsAvg,
        errorRate: data.errorRate,
      },
    });
  }

  async graph(organizationId?: string) {
    const nodes = await this.listNodes(organizationId);
    const nodeIds = nodes.map((n) => n.id);
    const edges = await this.prisma.eopServiceDependency.findMany({
      where: { sourceNodeId: { in: nodeIds } },
      include: { sourceNode: true, targetNode: true },
    });
    return {
      nodes: nodes.map((n) => ({
        id: n.id,
        key: n.nodeKey,
        name: n.name,
        component: n.component,
        status: n.status,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.sourceNode.nodeKey,
        target: e.targetNode.nodeKey,
        type: e.dependencyType,
        latencyMsAvg: e.latencyMsAvg,
        errorRate: e.errorRate,
      })),
    };
  }
}
