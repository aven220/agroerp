import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BiDashboardDefinition } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class BiDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, userId: string, filters?: { category?: string; status?: string }) {
    const dashboards = await this.prisma.biDashboard.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(filters?.category ? { category: filters.category } : {}),
        ...(filters?.status ? { status: filters.status as 'draft' | 'published' | 'archived' } : {}),
        OR: [
          { createdBy: userId },
          { isSystem: true },
          { shares: { some: { sharedWith: userId } } },
          { status: 'published' },
        ],
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: {
        versions: { orderBy: { version: 'desc' }, take: 1 },
        shares: true,
      },
    });
    return dashboards;
  }

  async findOne(organizationId: string, id: string, userId: string) {
    const dashboard = await this.prisma.biDashboard.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        versions: { orderBy: { version: 'desc' } },
        shares: true,
      },
    });
    if (!dashboard) throw new NotFoundException('Dashboard no encontrado');
    this.assertAccess(dashboard, userId, 'read');
    return dashboard;
  }

  async create(
    organizationId: string,
    userId: string,
    data: {
      dashboardKey: string;
      name: string;
      description?: string;
      category?: string;
      definition?: BiDashboardDefinition;
      settings?: Record<string, unknown>;
    },
  ) {
    const exists = await this.prisma.biDashboard.findFirst({
      where: { organizationId, dashboardKey: data.dashboardKey, deletedAt: null },
    });
    if (exists) throw new BadRequestException('dashboardKey ya existe');

    const definition = data.definition ?? { version: 1, widgets: [] };
    const layout = this.definitionToLayout(definition);

    const dashboard = await this.prisma.biDashboard.create({
      data: {
        organizationId,
        dashboardKey: data.dashboardKey,
        name: data.name,
        description: data.description,
        category: data.category ?? 'custom',
        status: 'draft',
        layout,
        settings: (data.settings ?? {}) as object,
        createdBy: userId,
        versions: {
          create: {
            version: 1,
            status: 'draft',
            definition: definition as object,
            createdBy: userId,
          },
        },
      },
      include: { versions: true },
    });
    return dashboard;
  }

  async update(
    organizationId: string,
    id: string,
    userId: string,
    data: {
      name?: string;
      description?: string;
      category?: string;
      definition?: BiDashboardDefinition;
      settings?: Record<string, unknown>;
      permissions?: Record<string, unknown>;
    },
  ) {
    const dashboard = await this.findOne(organizationId, id, userId);
    this.assertAccess(dashboard, userId, 'write');

    const latestVersion = dashboard.versions[0];
    const nextDefinition = data.definition ?? (latestVersion?.definition as unknown as BiDashboardDefinition);
    const layout = data.definition ? this.definitionToLayout(data.definition) : undefined;

    if (data.definition && latestVersion) {
      const newVersion = latestVersion.version + 1;
      await this.prisma.biDashboardVersion.create({
        data: {
          dashboardId: id,
          version: newVersion,
          status: 'draft',
          definition: data.definition as object,
          changelog: 'Actualización desde diseñador',
          createdBy: userId,
        },
      });
    }

    return this.prisma.biDashboard.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.category ? { category: data.category } : {}),
        ...(layout ? { layout: layout as object } : {}),
        ...(data.settings ? { settings: data.settings as object } : {}),
        ...(data.permissions ? { permissions: data.permissions as object } : {}),
        ...(nextDefinition ? { metadata: { lastVersion: nextDefinition.version } as object } : {}),
      },
      include: { versions: { orderBy: { version: 'desc' }, take: 5 } },
    });
  }

  async remove(organizationId: string, id: string, userId: string) {
    const dashboard = await this.findOne(organizationId, id, userId);
    if (dashboard.isSystem) throw new BadRequestException('No se puede eliminar un dashboard de sistema');
    this.assertAccess(dashboard, userId, 'write');
    return this.prisma.biDashboard.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async duplicate(organizationId: string, id: string, userId: string, newKey?: string, newName?: string) {
    const source = await this.findOne(organizationId, id, userId);
    const latest = source.versions[0];
    const definition = (latest?.definition ?? { version: 1, widgets: [] }) as unknown as BiDashboardDefinition;
    const key = newKey ?? `${source.dashboardKey}-copy-${Date.now()}`;
    return this.create(organizationId, userId, {
      dashboardKey: key,
      name: newName ?? `${source.name} (copia)`,
      description: source.description ?? undefined,
      category: source.category,
      definition,
      settings: source.settings as Record<string, unknown>,
    });
  }

  async publish(organizationId: string, id: string, userId: string, changelog?: string) {
    const dashboard = await this.findOne(organizationId, id, userId);
    this.assertAccess(dashboard, userId, 'write');
    const latest = dashboard.versions[0];
    if (!latest) throw new BadRequestException('Sin versión para publicar');

    await this.prisma.biDashboardVersion.update({
      where: { id: latest.id },
      data: {
        status: 'published',
        publishedAt: new Date(),
        publishedBy: userId,
        changelog: changelog ?? latest.changelog,
      },
    });

    return this.prisma.biDashboard.update({
      where: { id },
      data: { status: 'published' },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });
  }

  async share(
    organizationId: string,
    id: string,
    userId: string,
    sharedWith: string,
    permission: 'read' | 'write' = 'read',
  ) {
    const dashboard = await this.findOne(organizationId, id, userId);
    this.assertAccess(dashboard, userId, 'write');
    return this.prisma.biDashboardShare.upsert({
      where: { dashboardId_sharedWith: { dashboardId: id, sharedWith } },
      update: { permission },
      create: { dashboardId: id, sharedWith, permission },
    });
  }

  async listVersions(organizationId: string, id: string, userId: string) {
    await this.findOne(organizationId, id, userId);
    return this.prisma.biDashboardVersion.findMany({
      where: { dashboardId: id },
      orderBy: { version: 'desc' },
    });
  }

  async restoreVersion(organizationId: string, id: string, version: number, userId: string) {
    const dashboard = await this.findOne(organizationId, id, userId);
    this.assertAccess(dashboard, userId, 'write');
    const target = await this.prisma.biDashboardVersion.findFirst({
      where: { dashboardId: id, version },
    });
    if (!target) throw new NotFoundException('Versión no encontrada');
    const definition = target.definition as unknown as BiDashboardDefinition;
    return this.update(organizationId, id, userId, { definition });
  }

  private definitionToLayout(definition: BiDashboardDefinition) {
    return {
      version: definition.version,
      widgets: definition.widgets.map((w) => ({
        id: w.id,
        type: w.type,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
      })),
    };
  }

  private assertAccess(
    dashboard: { createdBy: string | null; isSystem: boolean; shares: Array<{ sharedWith: string; permission: string }> },
    userId: string,
    mode: 'read' | 'write',
  ) {
    if (dashboard.isSystem || dashboard.createdBy === userId) return;
    const share = dashboard.shares.find((s) => s.sharedWith === userId);
    if (!share && mode === 'read') return;
    if (share?.permission === 'write' || (mode === 'read' && share)) return;
    if (mode === 'read' && dashboard.createdBy !== userId) return;
    throw new BadRequestException('Sin permisos sobre este dashboard');
  }
}
