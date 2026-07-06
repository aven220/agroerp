import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class AiPromptManagerService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.aiPromptTemplate.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });
  }

  async findOne(organizationId: string, id: string) {
    const tpl = await this.prisma.aiPromptTemplate.findFirst({
      where: { id, organizationId },
      include: { versions: { orderBy: { version: 'desc' } } },
    });
    if (!tpl) throw new NotFoundException('Prompt no encontrado');
    return tpl;
  }

  async create(
    organizationId: string,
    userId: string,
    data: {
      promptKey: string;
      name: string;
      description?: string;
      serviceType?: string;
      template: string;
      systemPrompt?: string;
      variables?: unknown[];
    },
  ) {
    const exists = await this.prisma.aiPromptTemplate.findFirst({
      where: { organizationId, promptKey: data.promptKey },
    });
    if (exists) throw new BadRequestException('promptKey ya existe');

    return this.prisma.aiPromptTemplate.create({
      data: {
        organizationId,
        promptKey: data.promptKey,
        name: data.name,
        description: data.description,
        serviceType: (data.serviceType ?? 'chat') as 'chat',
        variables: (data.variables ?? []) as object[],
        createdBy: userId,
        versions: {
          create: {
            version: 1,
            template: data.template,
            systemPrompt: data.systemPrompt,
            createdBy: userId,
          },
        },
      },
      include: { versions: true },
    });
  }

  async addVersion(
    organizationId: string,
    id: string,
    userId: string,
    data: { template: string; systemPrompt?: string; changelog?: string },
  ) {
    const tpl = await this.findOne(organizationId, id);
    const latest = tpl.versions[0];
    const version = (latest?.version ?? 0) + 1;
    await this.prisma.aiPromptVersion.create({
      data: {
        templateId: id,
        version,
        template: data.template,
        systemPrompt: data.systemPrompt,
        changelog: data.changelog,
        createdBy: userId,
      },
    });
    return this.findOne(organizationId, id);
  }

  async approve(organizationId: string, id: string, version: number, userId: string) {
    await this.findOne(organizationId, id);
    const ver = await this.prisma.aiPromptVersion.findFirst({
      where: { templateId: id, version },
    });
    if (!ver) throw new NotFoundException('Versión no encontrada');

    await this.prisma.aiPromptVersion.update({
      where: { id: ver.id },
      data: { status: 'approved', approvedBy: userId, approvedAt: new Date() },
    });
    await this.prisma.aiPromptTemplate.update({
      where: { id },
      data: { status: 'approved' },
    });
    return this.findOne(organizationId, id);
  }

  async activate(organizationId: string, id: string, version: number, userId: string) {
    await this.approve(organizationId, id, version, userId);
    const ver = await this.prisma.aiPromptVersion.findFirst({
      where: { templateId: id, version },
    });
    if (!ver) throw new NotFoundException('Versión no encontrada');

    await this.prisma.aiPromptVersion.update({
      where: { id: ver.id },
      data: { status: 'active', publishedAt: new Date() },
    });
    await this.prisma.aiPromptTemplate.update({
      where: { id },
      data: { status: 'active' },
    });
    return this.findOne(organizationId, id);
  }

  async test(
    organizationId: string,
    id: string,
    version: number,
    variables: Record<string, string>,
  ) {
    const ver = await this.prisma.aiPromptVersion.findFirst({
      where: { templateId: id, version, promptTemplate: { organizationId } },
    });
    if (!ver) throw new NotFoundException('Versión no encontrada');

    let rendered = ver.template;
    for (const [k, v] of Object.entries(variables)) {
      rendered = rendered.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
    }
    return { rendered, systemPrompt: ver.systemPrompt };
  }

  async resolveActive(organizationId: string, promptKey: string) {
    const tpl = await this.prisma.aiPromptTemplate.findFirst({
      where: { organizationId, promptKey, status: 'active' },
      include: { versions: { where: { status: 'active' }, orderBy: { version: 'desc' }, take: 1 } },
    });
    if (!tpl?.versions[0]) return null;
    return { template: tpl, version: tpl.versions[0] };
  }

  renderTemplate(template: string, variables?: Record<string, unknown>) {
    let out = template;
    if (!variables) return out;
    for (const [k, v] of Object.entries(variables)) {
      out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v ?? ''));
    }
    return out;
  }
}
