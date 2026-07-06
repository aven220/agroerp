import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CreateOrgUnitDto, UpdateOrgUnitDto } from '../presentation/identity.dto';

@Injectable()
export class OrgUnitsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.orgUnit.findMany({
      where: { organizationId },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async findTree(organizationId: string) {
    const units = await this.findAll(organizationId);
    const byParent = new Map<string | null, typeof units>();
    for (const u of units) {
      const key = u.parentId ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(u);
    }
    const build = (parentId: string | null): unknown[] =>
      (byParent.get(parentId) ?? []).map((u) => ({
        ...u,
        children: build(u.id),
      }));
    return build(null);
  }

  async findOne(organizationId: string, id: string) {
    const unit = await this.prisma.orgUnit.findFirst({
      where: { id, organizationId },
    });
    if (!unit) throw new NotFoundException('Org unit not found');
    return unit;
  }

  async create(organizationId: string, dto: CreateOrgUnitDto) {
    const existing = await this.prisma.orgUnit.findFirst({
      where: { organizationId, code: dto.code },
    });
    if (existing) throw new ConflictException('Org unit code exists');

    return this.prisma.orgUnit.create({
      data: {
        organizationId,
        parentId: dto.parentId,
        type: dto.type,
        name: dto.name,
        code: dto.code,
        metadata: (dto.metadata ?? {}) as object,
      },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateOrgUnitDto) {
    await this.findOne(organizationId, id);
    return this.prisma.orgUnit.update({
      where: { id },
      data: {
        name: dto.name,
        parentId: dto.parentId,
        metadata: dto.metadata as object | undefined,
        active: dto.active,
      },
    });
  }
}
