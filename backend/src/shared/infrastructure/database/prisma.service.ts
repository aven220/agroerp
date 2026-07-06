import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly config: ConfigService) {
    super({
      log:
        config.get('NODE_ENV') === 'development'
          ? ['query', 'warn', 'error']
          : ['warn', 'error'],
    });
  }

  async onModuleInit() {
    const maxAttempts = this.config.get('NODE_ENV') === 'development' ? 30 : 1;
    const delayMs = 1000;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Database connected');
        return;
      } catch (err) {
        if (attempt === maxAttempts) throw err;
        this.logger.warn(
          `Database not ready (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs}ms...`,
        );
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  async setTenantContext(organizationId: string): Promise<void> {
    await this.$executeRawUnsafe(
      `SELECT set_config('app.current_org_id', '${organizationId}', true)`,
    );
  }
}
