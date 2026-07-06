import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  }

  findByModule(moduleId?: string) {
    return this.prisma.permission.findMany({
      where: moduleId ? { moduleId } : undefined,
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  }
}
