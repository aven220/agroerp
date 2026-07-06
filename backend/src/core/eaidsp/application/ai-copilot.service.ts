import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class AiCopilotService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.aiCopilotDefinition.findMany({
      where: { organizationId, isActive: true },
      orderBy: { category: 'asc' },
    });
  }

  async findOne(organizationId: string, copilotKey: string) {
    const copilot = await this.prisma.aiCopilotDefinition.findFirst({
      where: { organizationId, copilotKey },
    });
    if (!copilot) throw new NotFoundException('Copiloto no encontrado');
    return copilot;
  }

  async getForUser(organizationId: string, userPermissions: string[]) {
    const copilots = await this.findAll(organizationId);
    return copilots.filter((c) => {
      const required = (c.permissions as string[]) ?? [];
      if (!required.length) return true;
      return required.some((p) => userPermissions.includes(p));
    });
  }
}
