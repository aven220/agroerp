import { Injectable } from '@nestjs/common';
import { AI_CAPABILITIES, buildAiStubInsight, type AiCapabilityCode } from '../domain/hpa-analytics.engine';
import type { HpaAiInsightRequest, HpaAiInsightResult, HpaAiPort } from '../domain/hpa-ai.port';

@Injectable()
export class HpaAiStubAdapter implements HpaAiPort {
  listCapabilities(): AiCapabilityCode[] {
    return [...AI_CAPABILITIES];
  }

  async predict(request: HpaAiInsightRequest): Promise<HpaAiInsightResult> {
    return buildAiStubInsight(request.capability, request.employeeKey);
  }
}
