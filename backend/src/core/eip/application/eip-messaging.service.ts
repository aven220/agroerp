import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EipProviderType, EipStatus } from '@agroerp/prisma-eip-client';
import { EipPrismaService } from '@/shared/infrastructure/database/eip-prisma.service';
import { EIP_MESSAGING_SLOTS } from '../domain/eip.engine';
import { EipAuditService } from './eip-audit.service';

@Injectable()
export class EipMessagingService {
  constructor(
    private readonly prisma: EipPrismaService,
    private readonly audit: EipAuditService,
  ) {}

  slots() {
    return EIP_MESSAGING_SLOTS;
  }

  list(organizationId: string) {
    return this.prisma.eipMessagingProvider.findMany({
      where: { organizationId },
      orderBy: { providerKey: 'asc' },
    });
  }

  async configure(
    organizationId: string,
    userId: string,
    providerKey: string,
    providerType: EipProviderType,
    name: string,
    config: Record<string, unknown>,
    isPrimary = false,
  ) {
    const existing = await this.prisma.eipMessagingProvider.findFirst({ where: { organizationId, providerKey } });
    if (existing) throw new BadRequestException(`Provider ${providerKey} ya existe`);
    if (isPrimary) {
      await this.prisma.eipMessagingProvider.updateMany({
        where: { organizationId, isPrimary: true },
        data: { isPrimary: false },
      });
    }
    const provider = await this.prisma.eipMessagingProvider.create({
      data: {
        organizationId,
        providerKey,
        providerType,
        name,
        config: config as object,
        isPrimary,
        status: 'inactive',
      },
    });
    await this.audit.log(organizationId, 'EipMessagingProvider', providerKey, 'messaging_slot_configured', userId, { providerType });
    return provider;
  }

  async activate(organizationId: string, userId: string, providerKey: string) {
    const provider = await this.prisma.eipMessagingProvider.findFirst({ where: { organizationId, providerKey } });
    if (!provider) throw new NotFoundException('Provider no encontrado');
    const updated = await this.prisma.eipMessagingProvider.update({
      where: { id: provider.id },
      data: { status: 'active' },
    });
    await this.audit.log(organizationId, 'EipMessagingProvider', providerKey, 'config_changed', userId, { status: 'active' });
    return updated;
  }

  async publish(organizationId: string, topic: string, payload: Record<string, unknown>) {
    const provider = await this.prisma.eipMessagingProvider.findFirst({
      where: { organizationId, status: 'active' },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
    if (!provider) {
      return { queued: false, reason: 'no_active_provider', topic, payload };
    }
    return {
      queued: true,
      providerType: provider.providerType,
      providerKey: provider.providerKey,
      topic,
      messageId: `${provider.providerType}-${Date.now()}`,
      payload,
      adapter: this.adapterFor(provider.providerType),
    };
  }

  private adapterFor(type: EipProviderType) {
    const adapters: Record<EipProviderType, string> = {
      rabbitmq: 'amqp://',
      kafka: 'kafka://',
      azure_service_bus: 'azuresb://',
      aws_sqs: 'sqs://',
      google_pubsub: 'pubsub://',
      in_memory: 'memory://',
    };
    return adapters[type];
  }
}
