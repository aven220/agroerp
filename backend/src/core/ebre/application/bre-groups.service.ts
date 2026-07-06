import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class BreGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.breRuleGroup.findMany({
      where: { organizationId, isActive: true },
      include: { _count: { select: { rules: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async create(
    organizationId: string,
    data: { groupKey: string; name: string; description?: string; sortOrder?: number },
  ) {
    const existing = await this.prisma.breRuleGroup.findFirst({
      where: { organizationId, groupKey: data.groupKey },
    });
    if (existing) throw new BadRequestException(`Grupo ${data.groupKey} ya existe`);

    return this.prisma.breRuleGroup.create({
      data: {
        organizationId,
        groupKey: data.groupKey,
        name: data.name,
        description: data.description,
        sortOrder: data.sortOrder ?? 100,
      },
    });
  }
}
