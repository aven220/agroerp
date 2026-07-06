export class AiSanitizerService {
  private readonly injectionPatterns = [
    /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
    /system\s*:\s*/i,
    /<\s*script/i,
    /javascript\s*:/i,
    /\{\{\s*system\s*\}\}/i,
    /you\s+are\s+now\s+/i,
    /disregard\s+(all\s+)?rules/i,
  ];

  private readonly sensitivePatterns = [
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    /\b\d{6,16}\b/g,
    /password\s*[:=]\s*\S+/gi,
    /api[_-]?key\s*[:=]\s*\S+/gi,
  ];

  sanitizeInput(input: string): string {
    let out = input.trim().slice(0, 32000);
    for (const pattern of this.injectionPatterns) {
      if (pattern.test(out)) {
        out = out.replace(pattern, '[filtered]');
      }
    }
    return out;
  }

  filterSensitiveOutput(content: string, maskSensitive = true): string {
    if (!maskSensitive) return content;
    let out = content;
    for (const pattern of this.sensitivePatterns) {
      out = out.replace(pattern, '[REDACTED]');
    }
    return out;
  }

  detectInjection(input: string): boolean {
    return this.injectionPatterns.some((p) => p.test(input));
  }
}
