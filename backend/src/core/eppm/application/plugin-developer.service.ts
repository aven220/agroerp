import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class PluginDeveloperService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.eppmDeveloperAccount.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async register(
    organizationId: string,
    data: { developerKey: string; name: string; contactEmail: string },
  ) {
    const apiKey = `eppm_${randomBytes(24).toString('hex')}`;
    const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');
    const account = await this.prisma.eppmDeveloperAccount.create({
      data: {
        organizationId,
        developerKey: data.developerKey,
        name: data.name,
        contactEmail: data.contactEmail,
        apiKeyHash,
      },
    });
    return { account, apiKey };
  }
}
