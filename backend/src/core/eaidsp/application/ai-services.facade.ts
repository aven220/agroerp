import { Injectable } from '@nestjs/common';
import { AiCompletionRequest, AiServiceType } from '@agroerp/shared';
import { AiGatewayService } from './ai-gateway.service';

@Injectable()
export class AiServicesFacade {
  constructor(private readonly gateway: AiGatewayService) {}

  chat(orgId: string, userId: string, prompt: string, opts?: Partial<AiCompletionRequest>, perms?: string[]) {
    return this.gateway.complete(orgId, userId, { serviceType: 'chat', prompt, ...opts }, perms);
  }

  summarize(orgId: string, userId: string, text: string, opts?: Partial<AiCompletionRequest>, perms?: string[]) {
    return this.gateway.complete(orgId, userId, {
      serviceType: 'summarization',
      prompt: `Resume el siguiente contenido:\n\n${text}`,
      ...opts,
    }, perms);
  }

  classify(orgId: string, userId: string, text: string, categories: string[], perms?: string[]) {
    return this.gateway.complete(orgId, userId, {
      serviceType: 'classification',
      prompt: `Clasifica en [${categories.join(', ')}]:\n${text}`,
    }, perms);
  }

  extract(orgId: string, userId: string, text: string, fields: string[], perms?: string[]) {
    return this.gateway.complete(orgId, userId, {
      serviceType: 'extraction',
      prompt: `Extrae campos ${fields.join(', ')} de:\n${text}`,
    }, perms);
  }

  translate(orgId: string, userId: string, text: string, targetLang: string, perms?: string[]) {
    return this.gateway.complete(orgId, userId, {
      serviceType: 'translation',
      prompt: `Traduce a ${targetLang}:\n${text}`,
    }, perms);
  }

  correct(orgId: string, userId: string, text: string, perms?: string[]) {
    return this.gateway.complete(orgId, userId, { serviceType: 'correction', prompt: text }, perms);
  }

  analyzeDocument(orgId: string, userId: string, content: string, perms?: string[]) {
    return this.gateway.complete(orgId, userId, { serviceType: 'document_analysis', prompt: content }, perms);
  }

  ocr(orgId: string, userId: string, content: string, perms?: string[]) {
    return this.gateway.complete(orgId, userId, { serviceType: 'ocr', prompt: content }, perms);
  }

  analyzeImage(orgId: string, userId: string, description: string, perms?: string[]) {
    return this.gateway.complete(orgId, userId, { serviceType: 'image_analysis', prompt: description }, perms);
  }

  analyzeAudio(orgId: string, userId: string, transcript: string, perms?: string[]) {
    return this.gateway.complete(orgId, userId, { serviceType: 'audio_analysis', prompt: transcript }, perms);
  }

  speechToText(orgId: string, userId: string, audioHint: string, perms?: string[]) {
    return this.gateway.complete(orgId, userId, { serviceType: 'speech_recognition', prompt: audioHint }, perms);
  }

  recommend(orgId: string, userId: string, context: string, perms?: string[]) {
    return this.gateway.complete(orgId, userId, { serviceType: 'recommendation', prompt: context, useRag: true }, perms);
  }

  detectAnomalies(orgId: string, userId: string, data: string, perms?: string[]) {
    return this.gateway.complete(orgId, userId, { serviceType: 'anomaly_detection', prompt: data }, perms);
  }

  predict(orgId: string, userId: string, indicators: string, perms?: string[]) {
    return this.gateway.complete(orgId, userId, { serviceType: 'prediction', prompt: indicators }, perms);
  }

  explain(orgId: string, userId: string, indicator: string, perms?: string[]) {
    return this.gateway.complete(orgId, userId, { serviceType: 'explanation', prompt: indicator, useRag: true }, perms);
  }

  invoke(orgId: string, userId: string, serviceType: AiServiceType, prompt: string, opts?: Partial<AiCompletionRequest>, perms?: string[]) {
    return this.gateway.complete(orgId, userId, { serviceType, prompt, ...opts }, perms);
  }
}
