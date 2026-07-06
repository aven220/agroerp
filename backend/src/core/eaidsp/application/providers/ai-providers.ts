import { Injectable } from '@nestjs/common';
import { AiProviderAdapter, AiProviderRequest, AiProviderResponse } from '../../domain/ai-provider.port';

@Injectable()
export class HttpAiProviderBase {
  protected async postJson(
    url: string,
    headers: Record<string, string>,
    body: unknown,
    timeoutMs = 60000,
  ): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Provider HTTP ${res.status}: ${text.slice(0, 500)}`);
      }
      return res.json();
    } finally {
      clearTimeout(timer);
    }
  }
}

@Injectable()
export class OpenAiProvider extends HttpAiProviderBase implements AiProviderAdapter {
  readonly providerType = 'openai';

  isConfigured(settings: Record<string, unknown>) {
    return Boolean(settings.apiKey || process.env.OPENAI_API_KEY);
  }

  async complete(request: AiProviderRequest, config: Record<string, unknown>): Promise<AiProviderResponse> {
    const apiKey = String(config.apiKey ?? process.env.OPENAI_API_KEY ?? '');
    const baseUrl = String(config.baseUrl ?? 'https://api.openai.com/v1');
    const messages = request.messages ?? [
      ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
      { role: 'user', content: request.prompt },
    ];
    const data = (await this.postJson(
      `${baseUrl}/chat/completions`,
      { Authorization: `Bearer ${apiKey}` },
      {
        model: request.modelKey,
        messages,
        temperature: request.temperature ?? 0.3,
        max_tokens: request.maxTokens ?? 2048,
      },
    )) as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } };

    return {
      content: data.choices?.[0]?.message?.content ?? '',
      tokensIn: data.usage?.prompt_tokens ?? 0,
      tokensOut: data.usage?.completion_tokens ?? 0,
      modelUsed: request.modelKey,
      providerType: this.providerType,
      raw: data,
    };
  }
}

@Injectable()
export class GoogleAiProvider extends HttpAiProviderBase implements AiProviderAdapter {
  readonly providerType = 'google';

  isConfigured(settings: Record<string, unknown>) {
    return Boolean(settings.apiKey || process.env.GOOGLE_AI_API_KEY);
  }

  async complete(request: AiProviderRequest, config: Record<string, unknown>): Promise<AiProviderResponse> {
    const apiKey = String(config.apiKey ?? process.env.GOOGLE_AI_API_KEY ?? '');
    const model = request.modelKey || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const data = (await this.postJson(url, {}, {
      contents: [{ parts: [{ text: `${request.systemPrompt ? request.systemPrompt + '\n\n' : ''}${request.prompt}` }] }],
    })) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } };

    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
      tokensIn: data.usageMetadata?.promptTokenCount ?? 0,
      tokensOut: data.usageMetadata?.candidatesTokenCount ?? 0,
      modelUsed: model,
      providerType: this.providerType,
    };
  }
}

@Injectable()
export class AnthropicProvider extends HttpAiProviderBase implements AiProviderAdapter {
  readonly providerType = 'anthropic';

  isConfigured(settings: Record<string, unknown>) {
    return Boolean(settings.apiKey || process.env.ANTHROPIC_API_KEY);
  }

  async complete(request: AiProviderRequest, config: Record<string, unknown>): Promise<AiProviderResponse> {
    const apiKey = String(config.apiKey ?? process.env.ANTHROPIC_API_KEY ?? '');
    const data = (await this.postJson(
      String(config.baseUrl ?? 'https://api.anthropic.com/v1/messages'),
      { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      {
        model: request.modelKey || 'claude-3-5-sonnet-20241022',
        max_tokens: request.maxTokens ?? 2048,
        system: request.systemPrompt,
        messages: [{ role: 'user', content: request.prompt }],
      },
    )) as { content?: Array<{ text?: string }>; usage?: { input_tokens?: number; output_tokens?: number } };

    return {
      content: data.content?.map((c) => c.text ?? '').join('') ?? '',
      tokensIn: data.usage?.input_tokens ?? 0,
      tokensOut: data.usage?.output_tokens ?? 0,
      modelUsed: request.modelKey,
      providerType: this.providerType,
    };
  }
}

@Injectable()
export class OllamaProvider extends HttpAiProviderBase implements AiProviderAdapter {
  readonly providerType = 'ollama';

  isConfigured(settings: Record<string, unknown>) {
    return Boolean(settings.baseUrl || process.env.OLLAMA_BASE_URL);
  }

  async complete(request: AiProviderRequest, config: Record<string, unknown>): Promise<AiProviderResponse> {
    const baseUrl = String(config.baseUrl ?? process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434');
    const data = (await this.postJson(`${baseUrl}/api/chat`, {}, {
      model: request.modelKey || 'llama3',
      messages: [
        ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
        { role: 'user', content: request.prompt },
      ],
      stream: false,
    })) as { message?: { content?: string }; eval_count?: number; prompt_eval_count?: number };

    return {
      content: data.message?.content ?? '',
      tokensIn: data.prompt_eval_count ?? 0,
      tokensOut: data.eval_count ?? 0,
      modelUsed: request.modelKey || 'llama3',
      providerType: this.providerType,
    };
  }
}

@Injectable()
export class CustomAiProvider extends HttpAiProviderBase implements AiProviderAdapter {
  readonly providerType = 'custom';

  isConfigured(settings: Record<string, unknown>) {
    return Boolean(settings.baseUrl);
  }

  async complete(request: AiProviderRequest, config: Record<string, unknown>): Promise<AiProviderResponse> {
    const baseUrl = String(config.baseUrl);
    const apiKey = String(config.apiKey ?? '');
    const data = (await this.postJson(
      `${baseUrl}/v1/chat/completions`,
      apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      {
        model: request.modelKey,
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          { role: 'user', content: request.prompt },
        ],
      },
    )) as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } };

    return {
      content: data.choices?.[0]?.message?.content ?? '',
      tokensIn: data.usage?.prompt_tokens ?? 0,
      tokensOut: data.usage?.completion_tokens ?? 0,
      modelUsed: request.modelKey,
      providerType: this.providerType,
    };
  }
}
