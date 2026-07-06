import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { IntegrationConnectorCatalogService } from './integration-connector-catalog.service';
import { IntegrationErrorService } from './integration-error.service';

@Injectable()
export class IntegrationSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(IntegrationSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: IntegrationConnectorCatalogService,
    private readonly errors: IntegrationErrorService,
  ) {}

  async onModuleInit() {
    await this.seedCatalog();
    const retryTimer = setInterval(() => this.processRetries().catch(() => undefined), 120_000);
    retryTimer.unref?.();
    this.logger.log('EIH scheduler started (error retry 120s)');
  }

  private async seedCatalog() {
    const templates = [
      { catalogKey: 'rest.generic', name: 'REST API Genérico', protocol: 'rest', category: 'custom', handlerRef: 'connector.rest.generic' },
      { catalogKey: 'soap.dian', name: 'DIAN Facturación Electrónica', protocol: 'soap', category: 'tax_authority', handlerRef: 'connector.soap.dian' },
      { catalogKey: 'rest.payment', name: 'Pasarela de Pago', protocol: 'rest', category: 'payment_gateway', handlerRef: 'connector.rest.payment' },
      { catalogKey: 'sftp.bank', name: 'Banco SFTP', protocol: 'sftp', category: 'bank', handlerRef: 'connector.sftp.bank' },
      { catalogKey: 'rest.weather', name: 'Servicio Meteorológico', protocol: 'rest', category: 'weather', handlerRef: 'connector.rest.weather' },
      { catalogKey: 'grpc.maps', name: 'Servicio Mapas gRPC', protocol: 'grpc', category: 'maps', handlerRef: 'connector.grpc.maps' },
      { catalogKey: 'mqtt.iot', name: 'Plataforma IoT MQTT', protocol: 'message_queue', category: 'iot', handlerRef: 'connector.mqtt.iot' },
      { catalogKey: 'oauth2.auth', name: 'OAuth2 Identity', protocol: 'rest', category: 'auth_service', handlerRef: 'connector.oauth2.auth' },
      { catalogKey: 'rest.signature', name: 'Firma Digital', protocol: 'rest', category: 'digital_signature', handlerRef: 'connector.rest.signature' },
      { catalogKey: 'webhook.inbound', name: 'Webhook Entrante', protocol: 'webhook', category: 'custom', handlerRef: 'connector.webhook.inbound' },
      { catalogKey: 'database.sql', name: 'Base de Datos SQL', protocol: 'database', category: 'custom', handlerRef: 'connector.database.sql' },
      { catalogKey: 'flatfile.csv', name: 'Archivo Plano CSV', protocol: 'flat_file', category: 'custom', handlerRef: 'connector.flatfile.csv' },
      { catalogKey: 'email.smtp', name: 'Correo SMTP', protocol: 'email', category: 'messaging', handlerRef: 'connector.email.smtp' },
      { catalogKey: 'sftp.storage', name: 'Almacenamiento SFTP', protocol: 'sftp', category: 'storage', handlerRef: 'connector.sftp.storage' },
      { catalogKey: 'rest.erp', name: 'ERP Externo', protocol: 'rest', category: 'external_erp', handlerRef: 'connector.rest.erp' },
      { catalogKey: 'rest.crm', name: 'CRM', protocol: 'rest', category: 'crm', handlerRef: 'connector.rest.crm' },
      { catalogKey: 'rest.accounting', name: 'Plataforma Contable', protocol: 'rest', category: 'accounting', handlerRef: 'connector.rest.accounting' },
      { catalogKey: 'rest.satellite', name: 'Servicio Satelital', protocol: 'rest', category: 'satellite', handlerRef: 'connector.rest.satellite' },
    ];
    for (const t of templates) {
      await this.catalog.register(t);
    }
  }

  private async processRetries() {
    const pending = await this.prisma.eihSyncError.findMany({
      where: {
        status: { in: ['pending', 'retrying'] },
        nextRetryAt: { lte: new Date() },
      },
      take: 20,
    });
    for (const err of pending) {
      await this.errors.retry(err.organizationId, err.id);
    }
  }
}
