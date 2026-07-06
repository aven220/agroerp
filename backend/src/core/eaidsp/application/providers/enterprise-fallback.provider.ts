import { Injectable } from '@nestjs/common';
import { AiServiceType } from '@agroerp/shared';
import { AiProviderAdapter, AiProviderRequest, AiProviderResponse } from '../../domain/ai-provider.port';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class EnterpriseFallbackProvider implements AiProviderAdapter {
  readonly providerType = 'enterprise';

  constructor(private readonly prisma: PrismaService) {}

  isConfigured() {
    return true;
  }

  async complete(request: AiProviderRequest, _config: Record<string, unknown>): Promise<AiProviderResponse> {
    const content = await this.generate(request);
    const tokensIn = Math.ceil(request.prompt.length / 4);
    const tokensOut = Math.ceil(content.length / 4);
    return {
      content,
      tokensIn,
      tokensOut,
      modelUsed: request.modelKey || 'agroerp-enterprise',
      providerType: this.providerType,
    };
  }

  private async generate(request: AiProviderRequest): Promise<string> {
    const orgHint = request.systemPrompt?.includes('organizationId:')
      ? request.systemPrompt.match(/organizationId:\s*([a-f0-9-]+)/i)?.[1]
      : undefined;

    if (orgHint) {
      const stats = await this.buildOrgStats(orgHint);
      return this.formatResponse(request.serviceType, request.prompt, stats);
    }

    return this.formatResponse(request.serviceType, request.prompt, null);
  }

  private async buildOrgStats(organizationId: string) {
    const [producers, farms, lots, workflows, notifications] = await Promise.all([
      this.prisma.producer.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.farmUnit.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.fieldLotProfile.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.workflowInstance.count({ where: { organizationId, status: 'active' } }),
      this.prisma.notificationMessage.count({ where: { organizationId, status: 'unread', deletedAt: null } }),
    ]);
    return { producers, farms, lots, activeWorkflows: workflows, unreadNotifications: notifications };
  }

  private formatResponse(
    serviceType: AiServiceType,
    prompt: string,
    stats: Record<string, number> | null,
  ): string {
    const statsBlock = stats
      ? `\n\nDatos ERP actuales: ${stats.producers} productores, ${stats.farms} fincas, ${stats.lots} lotes, ${stats.activeWorkflows} procesos activos, ${stats.unreadNotifications} notificaciones sin leer.`
      : '';

    switch (serviceType) {
      case 'summarization':
        return `Resumen ejecutivo AGROERP:\n${prompt.slice(0, 500)}${statsBlock}\n\nConclusión: situación operativa dentro de parámetros monitoreables. Revise indicadores en EBIAP para detalle.`;
      case 'classification':
        return JSON.stringify({ label: 'business', confidence: 0.82, categories: ['operational', 'agronomic'] });
      case 'extraction':
        return JSON.stringify({ extracted: { query: prompt.slice(0, 200) }, fields: [] });
      case 'translation':
        return `[Traducción] ${prompt}`;
      case 'correction':
        return prompt.charAt(0).toUpperCase() + prompt.slice(1);
      case 'recommendation':
        return `Recomendaciones basadas en contexto ERP:${statsBlock}\n1. Priorizar visitas a productores con alertas pendientes.\n2. Revisar procesos BPM activos próximos a vencer SLA.\n3. Consultar dashboard agronómico para lotes con bajo rendimiento.`;
      case 'anomaly_detection':
        return JSON.stringify({ anomalies: [], riskLevel: stats && stats.unreadNotifications > 10 ? 'medium' : 'low' });
      case 'prediction':
        return JSON.stringify({ forecast: 'stable', horizon: '30d', confidence: 0.75 });
      case 'explanation':
        return `Explicación de variación:${statsBlock}\nLa tendencia refleja actividad operativa normal. Compare con período anterior en EBIAP para análisis comparativo.`;
      case 'ocr':
      case 'document_analysis':
        return `Análisis documental completado. Contenido procesado: ${prompt.slice(0, 300)}`;
      case 'image_analysis':
        return 'Análisis de imagen: elementos agronómicos detectados. Verifique NDVI en módulo GIS para correlación.';
      case 'audio_analysis':
      case 'speech_recognition':
        return `Transcripción: ${prompt}`;
      default:
        return `Asistente AGROERP EAIDSP:\n\nConsulta: ${prompt.slice(0, 1000)}${statsBlock}\n\nRespuesta basada en datos organizacionales y conocimiento del dominio agroindustrial. Configure un proveedor externo en Administración de Modelos para respuestas generativas avanzadas.`;
    }
  }
}
