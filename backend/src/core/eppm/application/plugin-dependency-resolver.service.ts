import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { compareSemver } from './plugin-semver.util';

@Injectable()
export class PluginDependencyResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    organizationId: string,
    dependencies: Array<{ pluginKey: string; version: string }>,
  ): Promise<{ satisfied: boolean; missing: string[]; conflicts: string[] }> {
    const missing: string[] = [];
    const conflicts: string[] = [];

    for (const dep of dependencies) {
      const install = await this.prisma.eppmPluginInstall.findFirst({
        where: {
          organizationId,
          pluginKey: dep.pluginKey,
          status: { in: ['installed', 'enabled'] },
        },
      });
      if (!install) {
        missing.push(dep.pluginKey);
        continue;
      }
      if (compareSemver(install.installedVersion, dep.version) < 0) {
        conflicts.push(`${dep.pluginKey}: requiere >=${dep.version}, instalado ${install.installedVersion}`);
      }
    }

    return { satisfied: missing.length === 0 && conflicts.length === 0, missing, conflicts };
  }

  async assertCompatible(
    organizationId: string,
    dependencies: Array<{ pluginKey: string; version: string }>,
  ) {
    const result = await this.resolve(organizationId, dependencies);
    if (!result.satisfied) {
      throw new BadRequestException({
        message: 'Dependencias no satisfechas',
        missing: result.missing,
        conflicts: result.conflicts,
      });
    }
  }
}
