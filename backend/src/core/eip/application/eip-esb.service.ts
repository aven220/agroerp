import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EipStatus } from '@agroerp/prisma-eip-client';
import { EipPrismaService } from '@/shared/infrastructure/database/eip-prisma.service';
import { applyTransform, generateEipKey, routeEsbMessage } from '../domain/eip.engine';
import { EipAuditService } from './eip-audit.service';

@Injectable()
export class EipEsbService {
  constructor(
    private readonly prisma: EipPrismaService,
    private readonly audit: EipAuditService,
  ) {}

  listRoutes(organizationId: string, status?: EipStatus) {
    return this.prisma.eipEsbRoute.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      orderBy: [{ priority: 'asc' }, { routeKey: 'asc' }],
    });
  }

  async createRoute(
    organizationId: string,
    userId: string,
    routeKey: string,
    name: string,
    sourceType: string,
    targetType: string,
    sourceRef: string,
    targetRef: string,
    opts: { transform?: Record<string, unknown>; orchestration?: unknown[]; syncMode?: string; priority?: number },
  ) {
    const existing = await this.prisma.eipEsbRoute.findFirst({ where: { organizationId, routeKey } });
    if (existing) throw new BadRequestException(`Ruta ${routeKey} ya existe`);
    const route = await this.prisma.eipEsbRoute.create({
      data: {
        organizationId,
        routeKey,
        name,
        sourceType,
        targetType,
        sourceRef,
        targetRef,
        transform: (opts.transform ?? {}) as object,
        orchestration: (opts.orchestration ?? []) as object,
        syncMode: opts.syncMode ?? 'async',
        priority: opts.priority ?? 100,
        createdBy: userId,
        status: 'draft',
      },
    });
    await this.audit.log(organizationId, 'EipEsbRoute', routeKey, 'esb_route_created', userId);
    return route;
  }

  async publishRoute(organizationId: string, userId: string, routeKey: string) {
    const route = await this.prisma.eipEsbRoute.findFirst({ where: { organizationId, routeKey } });
    if (!route) throw new NotFoundException('Ruta no encontrada');
    const updated = await this.prisma.eipEsbRoute.update({
      where: { id: route.id },
      data: { status: 'active', version: route.version + 1 },
    });
    await this.audit.log(organizationId, 'EipEsbRoute', routeKey, 'esb_route_published', userId);
    return updated;
  }

  async routeMessage(
    organizationId: string,
    sourceRef: string,
    payload: Record<string, unknown>,
    sync = false,
  ) {
    const routes = await this.prisma.eipEsbRoute.findMany({
      where: { organizationId, status: 'active' },
    });
    const routeKey = routeEsbMessage(
      routes.map((r) => ({
        routeKey: r.routeKey,
        sourceRef: r.sourceRef,
        conditions: (r.metadata as Record<string, unknown>)?.condition as string | undefined,
        priority: r.priority,
      })),
      sourceRef,
      payload,
    );
    if (!routeKey) throw new NotFoundException('Sin ruta ESB para origen');
    const route = routes.find((r) => r.routeKey === routeKey)!;
    const transformed = applyTransform((route.transform as Record<string, unknown>) ?? {}, payload);
    const seq = await this.prisma.eipEsbMessage.count({ where: { organizationId } });
    const start = Date.now();
    const message = await this.prisma.eipEsbMessage.create({
      data: {
        organizationId,
        routeId: route.id,
        messageKey: generateEipKey('ESB', seq + 1),
        status: sync ? 'processing' : 'pending',
        payload: payload as object,
        transformed: transformed as object,
      },
    });
    if (sync) {
      const durationMs = Date.now() - start;
      await this.prisma.eipEsbMessage.update({
        where: { id: message.id },
        data: { status: 'completed', durationMs, completedAt: new Date() },
      });
    } else {
      setImmediate(async () => {
        const durationMs = Date.now() - start;
        await this.prisma.eipEsbMessage.update({
          where: { id: message.id },
          data: { status: 'completed', durationMs, completedAt: new Date() },
        }).catch(() => undefined);
      });
    }
    await this.audit.log(organizationId, 'EipEsbRoute', routeKey, 'esb_message_routed', undefined, { messageKey: message.messageKey, sync });
    return { messageKey: message.messageKey, routeKey, transformed, syncMode: route.syncMode };
  }

  messages(organizationId: string, status?: string, limit = 100) {
    return this.prisma.eipEsbMessage.findMany({
      where: { organizationId, ...(status ? { status: status as 'pending' } : {}) },
      include: { route: { select: { routeKey: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  adapters() {
    return [
      { key: 'rest', name: 'REST Adapter', modes: ['sync', 'async'] },
      { key: 'soap', name: 'SOAP Adapter', modes: ['sync'] },
      { key: 'file', name: 'File Adapter', modes: ['async'] },
      { key: 'db', name: 'Database Adapter', modes: ['sync', 'async'] },
      { key: 'event', name: 'Event Adapter', modes: ['async'] },
    ];
  }
}
