export type AccountBalanceRow = {
  accountKey: string;
  accountCode: string;
  accountName: string;
  nature: string;
  closingBalance: number;
  compareBalance?: number;
};

export type StatementLineDraft = {
  sectionKey: string;
  lineCode: string;
  lineName: string;
  accountKey?: string;
  amount: number;
  compareAmount?: number;
  variance?: number;
  hierarchyLevel: number;
};

export type KpiInput = {
  currentAssets: number;
  currentLiabilities: number;
  inventory: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  revenue: number;
  cogs: number;
  operatingExpenses: number;
  netIncome: number;
  accountsReceivable: number;
  accountsPayable: number;
  budgetAmount: number;
  budgetExecuted: number;
  netCashFlow: number;
  openingCash: number;
};

export type KpiResult = {
  kpiCode: string;
  kpiName: string;
  kpiCategory: string;
  value: number;
  unit: string;
  target?: number;
  trend?: string;
};

export type ClosingCheckItem = {
  itemCode: string;
  itemName: string;
  isRequired: boolean;
};

export type ClosingValidationResult = {
  itemCode: string;
  passed: boolean;
  message: string;
};

export const DEFAULT_FO_CLOSING_CHECKLIST: ClosingCheckItem[] = [
  { itemCode: 'CHK-UNPOSTED', itemName: 'Asientos sin contabilizar', isRequired: true },
  { itemCode: 'CHK-DRAFT-VOUCH', itemName: 'Comprobantes en borrador', isRequired: true },
  { itemCode: 'CHK-TRIAL-BAL', itemName: 'Balance de prueba cuadrado', isRequired: true },
  { itemCode: 'CHK-PERIOD-LOCK', itemName: 'Períodos anteriores cerrados', isRequired: true },
  { itemCode: 'CHK-BANK-REC', itemName: 'Conciliación bancaria al día', isRequired: true },
  { itemCode: 'CHK-BUDGET-EXC', itemName: 'Excepciones presupuestales resueltas', isRequired: false },
  { itemCode: 'CHK-DEPRECIATION', itemName: 'Depreciación del período registrada', isRequired: true },
  { itemCode: 'CHK-AR-AP', itemName: 'Subledgers CxC/CxP conciliados', isRequired: true },
];

export const DEFAULT_FO_STATEMENT_NOTES = [
  { noteNumber: 1, title: 'Políticas contables', content: 'Los estados financieros se preparan conforme a NIIF para PYMES.' },
  { noteNumber: 2, title: 'Moneda funcional', content: 'Cifras expresadas en pesos colombianos (COP).' },
  { noteNumber: 3, title: 'Estimaciones significativas', content: 'Incluye provisiones de cartera, depreciación y valuación de inventarios.' },
];

export function generateFoKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(8, '0')}`;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function sumByNature(accounts: AccountBalanceRow[], nature: string): number {
  return roundMoney(
    accounts
      .filter((a) => a.nature === nature)
      .reduce((s, a) => s + Math.abs(a.closingBalance), 0),
  );
}

export function buildBalanceSheetLines(accounts: AccountBalanceRow[]): StatementLineDraft[] {
  const sections: Array<{ key: string; nature: string; label: string; level: number }> = [
    { key: 'ASSETS', nature: 'asset', label: 'ACTIVOS', level: 0 },
    { key: 'LIABILITIES', nature: 'liability', label: 'PASIVOS', level: 0 },
    { key: 'EQUITY', nature: 'equity', label: 'PATRIMONIO', level: 0 },
  ];
  const lines: StatementLineDraft[] = [];

  for (const section of sections) {
    const sectionAccounts = accounts.filter((a) => a.nature === section.nature);
    lines.push({
      sectionKey: section.key,
      lineCode: section.key,
      lineName: section.label,
      amount: roundMoney(sectionAccounts.reduce((s, a) => s + a.closingBalance, 0)),
      compareAmount: sectionAccounts.some((a) => a.compareBalance !== undefined)
        ? roundMoney(sectionAccounts.reduce((s, a) => s + (a.compareBalance ?? 0), 0))
        : undefined,
      hierarchyLevel: section.level,
    });
    for (const acc of sectionAccounts) {
      lines.push({
        sectionKey: section.key,
        lineCode: acc.accountCode,
        lineName: acc.accountName,
        accountKey: acc.accountKey,
        amount: acc.closingBalance,
        compareAmount: acc.compareBalance,
        variance: acc.compareBalance !== undefined ? roundMoney(acc.closingBalance - acc.compareBalance) : undefined,
        hierarchyLevel: section.level + 1,
      });
    }
  }

  const totalAssets = sumByNature(accounts, 'asset');
  const totalLiabilities = sumByNature(accounts, 'liability');
  const totalEquity = sumByNature(accounts, 'equity');
  lines.push({
    sectionKey: 'TOTAL',
    lineCode: 'TOTAL-L+E',
    lineName: 'Total pasivo + patrimonio',
    amount: roundMoney(totalLiabilities + totalEquity),
    hierarchyLevel: 0,
  });
  lines.push({
    sectionKey: 'TOTAL',
    lineCode: 'TOTAL-A',
    lineName: 'Total activos',
    amount: totalAssets,
    hierarchyLevel: 0,
  });

  return lines;
}

export function buildIncomeStatementLines(accounts: AccountBalanceRow[]): StatementLineDraft[] {
  const revenue = accounts.filter((a) => a.nature === 'revenue');
  const expenses = accounts.filter((a) => a.nature === 'expense');
  const totalRevenue = roundMoney(revenue.reduce((s, a) => s + Math.abs(a.closingBalance), 0));
  const totalExpenses = roundMoney(expenses.reduce((s, a) => s + Math.abs(a.closingBalance), 0));
  const netIncome = roundMoney(totalRevenue - totalExpenses);

  const lines: StatementLineDraft[] = [
    { sectionKey: 'REVENUE', lineCode: 'REV-TOTAL', lineName: 'Ingresos operacionales', amount: totalRevenue, hierarchyLevel: 0 },
  ];
  for (const acc of revenue) {
    lines.push({
      sectionKey: 'REVENUE',
      lineCode: acc.accountCode,
      lineName: acc.accountName,
      accountKey: acc.accountKey,
      amount: Math.abs(acc.closingBalance),
      compareAmount: acc.compareBalance !== undefined ? Math.abs(acc.compareBalance) : undefined,
      hierarchyLevel: 1,
    });
  }
  lines.push({ sectionKey: 'EXPENSE', lineCode: 'EXP-TOTAL', lineName: 'Gastos operacionales', amount: totalExpenses, hierarchyLevel: 0 });
  for (const acc of expenses) {
    lines.push({
      sectionKey: 'EXPENSE',
      lineCode: acc.accountCode,
      lineName: acc.accountName,
      accountKey: acc.accountKey,
      amount: Math.abs(acc.closingBalance),
      compareAmount: acc.compareBalance !== undefined ? Math.abs(acc.compareBalance) : undefined,
      hierarchyLevel: 1,
    });
  }
  lines.push({ sectionKey: 'NET', lineCode: 'NET-INCOME', lineName: 'Utilidad neta del ejercicio', amount: netIncome, hierarchyLevel: 0 });
  return lines;
}

export function buildCashFlowLines(
  operating: number,
  investing: number,
  financing: number,
  openingCash: number,
): StatementLineDraft[] {
  const netChange = roundMoney(operating + investing + financing);
  const closingCash = roundMoney(openingCash + netChange);
  return [
    { sectionKey: 'OPERATING', lineCode: 'CF-OP', lineName: 'Actividades de operación', amount: operating, hierarchyLevel: 0 },
    { sectionKey: 'INVESTING', lineCode: 'CF-INV', lineName: 'Actividades de inversión', amount: investing, hierarchyLevel: 0 },
    { sectionKey: 'FINANCING', lineCode: 'CF-FIN', lineName: 'Actividades de financiación', amount: financing, hierarchyLevel: 0 },
    { sectionKey: 'SUMMARY', lineCode: 'CF-NET', lineName: 'Variación neta de efectivo', amount: netChange, hierarchyLevel: 0 },
    { sectionKey: 'SUMMARY', lineCode: 'CF-OPEN', lineName: 'Efectivo al inicio', amount: openingCash, hierarchyLevel: 0 },
    { sectionKey: 'SUMMARY', lineCode: 'CF-CLOSE', lineName: 'Efectivo al cierre', amount: closingCash, hierarchyLevel: 0 },
  ];
}

export function buildEquityChangesLines(
  openingEquity: number,
  netIncome: number,
  dividends: number,
  otherChanges: number,
): StatementLineDraft[] {
  const closingEquity = roundMoney(openingEquity + netIncome - dividends + otherChanges);
  return [
    { sectionKey: 'EQUITY', lineCode: 'EQ-OPEN', lineName: 'Saldo inicial patrimonio', amount: openingEquity, hierarchyLevel: 0 },
    { sectionKey: 'EQUITY', lineCode: 'EQ-NI', lineName: 'Utilidad del período', amount: netIncome, hierarchyLevel: 1 },
    { sectionKey: 'EQUITY', lineCode: 'EQ-DIV', lineName: 'Dividendos / retiros', amount: -dividends, hierarchyLevel: 1 },
    { sectionKey: 'EQUITY', lineCode: 'EQ-OTHER', lineName: 'Otros cambios patrimoniales', amount: otherChanges, hierarchyLevel: 1 },
    { sectionKey: 'EQUITY', lineCode: 'EQ-CLOSE', lineName: 'Saldo final patrimonio', amount: closingEquity, hierarchyLevel: 0 },
  ];
}

export function computeFinancialKpis(input: KpiInput): KpiResult[] {
  const safeDiv = (num: number, den: number) => (den !== 0 ? roundMoney(num / den) : 0);
  const grossProfit = input.revenue - input.cogs;
  const operatingIncome = grossProfit - input.operatingExpenses;

  return [
    { kpiCode: 'LIQ_CURRENT', kpiName: 'Razón corriente', kpiCategory: 'liquidity', value: safeDiv(input.currentAssets, input.currentLiabilities), unit: 'ratio', target: 1.5 },
    { kpiCode: 'LIQ_QUICK', kpiName: 'Prueba ácida', kpiCategory: 'liquidity', value: safeDiv(input.currentAssets - input.inventory, input.currentLiabilities), unit: 'ratio', target: 1.0 },
    { kpiCode: 'WC_WORKING', kpiName: 'Capital de trabajo', kpiCategory: 'working_capital', value: roundMoney(input.currentAssets - input.currentLiabilities), unit: 'currency' },
    { kpiCode: 'DEBT_RATIO', kpiName: 'Endeudamiento', kpiCategory: 'leverage', value: safeDiv(input.totalLiabilities, input.totalAssets), unit: 'ratio', target: 0.6 },
    { kpiCode: 'DEBT_EQUITY', kpiName: 'Deuda / Patrimonio', kpiCategory: 'leverage', value: safeDiv(input.totalLiabilities, input.totalEquity), unit: 'ratio' },
    { kpiCode: 'PROF_ROE', kpiName: 'ROE', kpiCategory: 'profitability', value: safeDiv(input.netIncome, input.totalEquity), unit: 'percent' },
    { kpiCode: 'PROF_ROA', kpiName: 'ROA', kpiCategory: 'profitability', value: safeDiv(input.netIncome, input.totalAssets), unit: 'percent' },
    { kpiCode: 'MARGIN_GROSS', kpiName: 'Margen bruto', kpiCategory: 'margin', value: safeDiv(grossProfit, input.revenue), unit: 'percent' },
    { kpiCode: 'MARGIN_OPER', kpiName: 'Margen operativo', kpiCategory: 'margin', value: safeDiv(operatingIncome, input.revenue), unit: 'percent' },
    { kpiCode: 'MARGIN_NET', kpiName: 'Margen neto', kpiCategory: 'margin', value: safeDiv(input.netIncome, input.revenue), unit: 'percent' },
    { kpiCode: 'ROT_AR', kpiName: 'Rotación cartera', kpiCategory: 'rotation', value: safeDiv(input.revenue, input.accountsReceivable), unit: 'times' },
    { kpiCode: 'ROT_INV', kpiName: 'Rotación inventarios', kpiCategory: 'rotation', value: safeDiv(input.cogs, input.inventory), unit: 'times' },
    { kpiCode: 'ROT_AP', kpiName: 'Rotación proveedores', kpiCategory: 'rotation', value: safeDiv(input.cogs, input.accountsPayable), unit: 'times' },
    { kpiCode: 'BUDGET_EXEC', kpiName: 'Ejecución presupuestal', kpiCategory: 'budget', value: safeDiv(input.budgetExecuted, input.budgetAmount), unit: 'percent', target: 1.0 },
    { kpiCode: 'CASHFLOW_NET', kpiName: 'Flujo de caja neto', kpiCategory: 'cashflow', value: input.netCashFlow, unit: 'currency' },
  ];
}

export function evaluateClosingChecklist(results: ClosingValidationResult[]): { passed: boolean; failedRequired: string[] } {
  const failedRequired = results.filter((r) => !r.passed).map((r) => r.itemCode);
  return { passed: failedRequired.length === 0, failedRequired };
}

export function projectScenario(
  baseRevenue: number,
  baseExpenses: number,
  revenueGrowthPct: number,
  expenseGrowthPct: number,
  horizonMonths: number,
): Array<{ month: number; revenue: number; expenses: number; netIncome: number }> {
  const monthlyRevGrowth = Math.pow(1 + revenueGrowthPct / 100, 1 / 12) - 1;
  const monthlyExpGrowth = Math.pow(1 + expenseGrowthPct / 100, 1 / 12) - 1;
  const projection = [];
  let rev = baseRevenue / 12;
  let exp = baseExpenses / 12;
  for (let m = 1; m <= horizonMonths; m += 1) {
    rev = roundMoney(rev * (1 + monthlyRevGrowth));
    exp = roundMoney(exp * (1 + monthlyExpGrowth));
    projection.push({ month: m, revenue: rev, expenses: exp, netIncome: roundMoney(rev - exp) });
  }
  return projection;
}

export function detectJournalAnomalies(
  entries: Array<{ entryKey: string; totalDebit: number; totalCredit: number; lineCount: number }>,
): Array<{ entryKey: string; anomalyType: string; severity: string }> {
  const anomalies: Array<{ entryKey: string; anomalyType: string; severity: string }> = [];
  for (const e of entries) {
    if (Math.abs(e.totalDebit - e.totalCredit) > 0.01) {
      anomalies.push({ entryKey: e.entryKey, anomalyType: 'unbalanced', severity: 'critical' });
    }
    if (e.lineCount === 1) {
      anomalies.push({ entryKey: e.entryKey, anomalyType: 'single_line', severity: 'warning' });
    }
    if (e.totalDebit > 1_000_000_000 || e.totalCredit > 1_000_000_000) {
      anomalies.push({ entryKey: e.entryKey, anomalyType: 'high_amount', severity: 'warning' });
    }
  }
  return anomalies;
}

export function buildTrendSeries(
  points: Array<{ periodKey: string; value: number }>,
): { direction: 'up' | 'down' | 'flat'; changePct: number; points: typeof points } {
  if (points.length < 2) return { direction: 'flat', changePct: 0, points };
  const first = points[0].value;
  const last = points[points.length - 1].value;
  const changePct = first !== 0 ? roundMoney(((last - first) / Math.abs(first)) * 100) : 0;
  const direction = changePct > 1 ? 'up' : changePct < -1 ? 'down' : 'flat';
  return { direction, changePct, points };
}

export function resolveClosingType(periodNumber: number, isAnnual = false): 'monthly' | 'quarterly' | 'annual' {
  if (isAnnual) return 'annual';
  if (periodNumber % 3 === 0) return 'quarterly';
  return 'monthly';
}
