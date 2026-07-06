import { Injectable } from '@nestjs/common';
import { PluginSandboxService } from './plugin-sandbox.service';
import { PluginExtensionPointsService } from './plugin-extension-points.service';

export interface PluginSpiHandler {
  pluginKey: string;
  serviceKey: string;
  invoke: (input: unknown) => Promise<unknown>;
}

@Injectable()
export class PluginSpiService {
  private readonly registry = new Map<string, PluginSpiHandler>();

  constructor(
    private readonly sandbox: PluginSandboxService,
    private readonly extensionPoints: PluginExtensionPointsService,
  ) {}

  register(handler: PluginSpiHandler) {
    this.registry.set(`${handler.pluginKey}:${handler.serviceKey}`, handler);
  }

  async invoke(pluginKey: string, serviceKey: string, input: unknown) {
    const key = `${pluginKey}:${serviceKey}`;
    const handler = this.registry.get(key);
    if (handler) return handler.invoke(input);
    return this.sandbox.execute(`${pluginKey}.${serviceKey}`, input);
  }

  listProviders() {
    return Array.from(this.registry.values()).map((h) => ({
      pluginKey: h.pluginKey,
      serviceKey: h.serviceKey,
    }));
  }

  async invokeExtensionPoint(pointKey: string, organizationId: string, payload: unknown) {
    const handlers = await this.extensionPoints.resolveHandlers(pointKey, organizationId);
    const results = [];
    for (const h of handlers) {
      if (!h.handler) continue;
      results.push(await this.sandbox.execute(h.handler, { ...payload as object, config: h.config }));
    }
    return results;
  }
}
