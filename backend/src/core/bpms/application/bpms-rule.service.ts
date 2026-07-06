import { Injectable } from '@nestjs/common';
import { BpmsPrismaService } from '@/shared/infrastructure/database/bpms-prisma.service';
import { evaluateExpression, generateBpmsKey } from '../domain/bpms.engine';
import { BpmsAuditService } from './bpms-audit.service';

@Injectable()
export class BpmsRuleService {
  constructor(
    private readonly prisma: BpmsPrismaService,
    private readonly audit: BpmsAuditService,
  ) {}

  list(organizationId: string) {
    return this.prisma.bpmsRule.findMany({ where: { organizationId, isActive: true } });
  }

  async create(organizationId: string, userId: string, name: string, expression: string, variables: string[] = []) {
    const seq = await this.prisma.bpmsRule.count({ where: { organizationId } });
    const rule = await this.prisma.bpmsRule.create({
      data: { organizationId, ruleKey: generateBpmsKey('RUL', seq + 1), name, expression, variables: variables as object },
    });
    await this.audit.log(organizationId, 'BpmsRule', rule.ruleKey, 'rule_evaluated', userId, { created: true });
    return rule;
  }

  evaluate(organizationId: string, userId: string, ruleKey: string, context: Record<string, unknown>) {
    return this.prisma.bpmsRule.findFirst({ where: { organizationId, ruleKey } }).then(async (rule) => {
      if (!rule) return { result: false };
      const result = evaluateExpression(rule.expression, context);
      await this.audit.log(organizationId, 'BpmsRule', ruleKey, 'rule_evaluated', userId, { result });
      return { ruleKey, result, expression: rule.expression };
    });
  }
}
