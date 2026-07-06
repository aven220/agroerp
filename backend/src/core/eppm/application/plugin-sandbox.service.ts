import { Injectable, Logger } from '@nestjs/common';
import { EppmPluginManifest } from '@agroerp/shared';

@Injectable()
export class PluginSandboxService {
  private readonly logger = new Logger(PluginSandboxService.name);
  private readonly handlers = new Map<string, (payload: unknown) => Promise<unknown>>();

  registerHandler(handlerRef: string, fn: (payload: unknown) => Promise<unknown>) {
    this.handlers.set(handlerRef, fn);
  }

  async execute(
    handlerRef: string,
    payload: unknown,
    permissions: string[] = [],
  ): Promise<Record<string, unknown>> {
    const handler = this.handlers.get(handlerRef);
    if (!handler) {
      this.logger.warn(`Sandbox handler no registrado: ${handlerRef}`);
      return { executed: false, reason: 'handler_not_found', handlerRef };
    }
    const started = Date.now();
    try {
      const output = await Promise.race([
        handler({ payload, permissions, sandbox: true }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Sandbox timeout')), 30_000),
        ),
      ]);
      return {
        executed: true,
        handlerRef,
        durationMs: Date.now() - started,
        output: output as Record<string, unknown>,
      };
    } catch (err) {
      return {
        executed: false,
        handlerRef,
        durationMs: Date.now() - started,
        error: (err as Error).message,
      };
    }
  }

  validateManifestIsolation(manifest: EppmPluginManifest): boolean {
    const forbidden = ['eval', 'require', 'child_process', 'fs.write'];
    const serialized = JSON.stringify(manifest);
    return !forbidden.some((f) => serialized.includes(f));
  }
}
