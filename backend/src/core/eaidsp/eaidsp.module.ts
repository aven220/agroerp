import { Module } from '@nestjs/common';
import { EventsModule } from '@/core/events/events.module';
import { EaidspController } from './presentation/eaidsp.controller';
import { AiSanitizerService } from './application/ai-sanitizer.service';
import { AiProviderRegistryService } from './application/ai-provider-registry.service';
import { AiModelRouterService } from './application/ai-model-router.service';
import { AiContextManagerService } from './application/ai-context-manager.service';
import { AiMemoryService } from './application/ai-memory.service';
import { AiRagService } from './application/ai-rag.service';
import { AiPromptManagerService } from './application/ai-prompt-manager.service';
import { AiCopilotService } from './application/ai-copilot.service';
import { AiGatewayService } from './application/ai-gateway.service';
import { AiServicesFacade } from './application/ai-services.facade';
import { AiMetricsService } from './application/ai-metrics.service';
import { AiAutomationService } from './application/ai-automation.service';
import { AiProviderAdminService } from './application/ai-provider-admin.service';
import {
  AnthropicProvider,
  CustomAiProvider,
  GoogleAiProvider,
  OllamaProvider,
  OpenAiProvider,
} from './application/providers/ai-providers';
import { EnterpriseFallbackProvider } from './application/providers/enterprise-fallback.provider';

@Module({
  imports: [EventsModule],
  controllers: [EaidspController],
  providers: [
    AiSanitizerService,
    OpenAiProvider,
    GoogleAiProvider,
    AnthropicProvider,
    OllamaProvider,
    CustomAiProvider,
    EnterpriseFallbackProvider,
    AiProviderRegistryService,
    AiModelRouterService,
    AiContextManagerService,
    AiMemoryService,
    AiRagService,
    AiPromptManagerService,
    AiCopilotService,
    AiGatewayService,
    AiServicesFacade,
    AiMetricsService,
    AiAutomationService,
    AiProviderAdminService,
  ],
  exports: [AiGatewayService, AiServicesFacade, AiRagService],
})
export class EaidspModule {}
