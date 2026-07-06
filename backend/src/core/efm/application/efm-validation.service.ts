import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EfmRuleService } from './efm-rule.service';
import { EfmCoaService } from './efm-coa.service';
import { validateJournalLines, type JournalLineInput } from '../domain/efm-accounting.engine';

@Injectable()
export class EfmValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rules: EfmRuleService,
    private readonly coa: EfmCoaService,
  ) {}

  async validatePanel(organizationId: string) {
    const [accounts, rules, openPeriods, activeVersion] = await Promise.all([
      this.coa.listAccounts(organizationId),
      this.rules.list(organizationId, { status: 'active' }),
      this.prisma.efmAccountingPeriod.count({ where: { organizationId, status: 'open' } }),
      this.coa.getActiveVersion(organizationId),
    ]);

    const accountKeys = new Set(accounts.map((a) => a.accountKey));
    const issues: Array<{ severity: string; code: string; message: string }> = [];

    if (!activeVersion) {
      issues.push({ severity: 'critical', code: 'NO_ACTIVE_COA', message: 'No hay versión activa del plan de cuentas' });
    }
    if (openPeriods === 0) {
      issues.push({ severity: 'critical', code: 'NO_OPEN_PERIOD', message: 'No hay períodos contables abiertos' });
    }

    for (const rule of rules) {
      const ruleErrors = this.rules.validateRule({
        debitAccountKey: rule.debitAccountKey,
        creditAccountKey: rule.creditAccountKey,
      });
      for (const e of ruleErrors) {
        issues.push({ severity: 'error', code: 'RULE_INVALID', message: `${rule.ruleKey}: ${e}` });
      }
      if (!accountKeys.has(rule.debitAccountKey)) {
        issues.push({ severity: 'error', code: 'RULE_DEBIT_MISSING', message: `${rule.ruleKey}: cuenta débito ${rule.debitAccountKey} no existe` });
      }
      if (!accountKeys.has(rule.creditAccountKey)) {
        issues.push({ severity: 'error', code: 'RULE_CREDIT_MISSING', message: `${rule.ruleKey}: cuenta crédito ${rule.creditAccountKey} no existe` });
      }
    }

    const headersWithoutChildren = accounts.filter(
      (a) => a.accountType === 'header' && !accounts.some((c) => c.parentAccountKey === a.accountKey),
    );
    for (const h of headersWithoutChildren.slice(0, 5)) {
      issues.push({ severity: 'warning', code: 'HEADER_ORPHAN', message: `Cuenta agrupadora sin hijos: ${h.code} ${h.name}` });
    }

    return {
      valid: issues.filter((i) => i.severity === 'critical' || i.severity === 'error').length === 0,
      issues,
      summary: {
        accounts: accounts.length,
        activeRules: rules.length,
        openPeriods,
        activeCoaVersion: activeVersion?.versionKey ?? null,
      },
    };
  }

  validateLines(lines: JournalLineInput[]) {
    return { errors: validateJournalLines(lines), valid: validateJournalLines(lines).length === 0 };
  }

  async simulateRule(
    organizationId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    const matching = await this.rules.findMatchingRules(organizationId, eventType, payload);
    return {
      eventType,
      matchingRules: matching.map((r) => ({
        ruleKey: r.ruleKey,
        name: r.name,
        debitAccountKey: r.debitAccountKey,
        creditAccountKey: r.creditAccountKey,
        priority: r.priority,
      })),
    };
  }
}
