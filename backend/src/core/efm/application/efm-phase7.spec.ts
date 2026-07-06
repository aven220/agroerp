import {
  buildBalanceSheetLines,
  buildCashFlowLines,
  buildEquityChangesLines,
  buildIncomeStatementLines,
  buildTrendSeries,
  computeFinancialKpis,
  detectJournalAnomalies,
  evaluateClosingChecklist,
  generateFoKey,
  projectScenario,
  resolveClosingType,
  roundMoney,
} from '../domain/efm-financial-ops.engine';

describe('EFM Financial Operations Engine — Fase 7', () => {
  it('generates FO keys', () => {
    expect(generateFoKey('STMT', 1)).toBe('STMT-00000001');
  });

  it('builds balance sheet lines', () => {
    const lines = buildBalanceSheetLines([
      { accountKey: 'A1', accountCode: '1105', accountName: 'Caja', nature: 'asset', closingBalance: 100000 },
      { accountKey: 'L1', accountCode: '2205', accountName: 'Proveedores', nature: 'liability', closingBalance: -50000 },
      { accountKey: 'E1', accountCode: '3105', accountName: 'Capital', nature: 'equity', closingBalance: 50000 },
    ]);
    expect(lines.find((l) => l.lineCode === 'TOTAL-A')?.amount).toBe(100000);
  });

  it('builds income statement lines', () => {
    const lines = buildIncomeStatementLines([
      { accountKey: 'R1', accountCode: '4135', accountName: 'Ventas', nature: 'revenue', closingBalance: -200000 },
      { accountKey: 'X1', accountCode: '6135', accountName: 'Gastos', nature: 'expense', closingBalance: 80000 },
    ]);
    expect(lines.find((l) => l.lineCode === 'NET-INCOME')?.amount).toBe(120000);
  });

  it('builds cash flow lines', () => {
    const lines = buildCashFlowLines(50000, -10000, 5000, 100000);
    expect(lines.find((l) => l.lineCode === 'CF-CLOSE')?.amount).toBe(145000);
  });

  it('builds equity changes lines', () => {
    const lines = buildEquityChangesLines(100000, 20000, 5000, 0);
    expect(lines.find((l) => l.lineCode === 'EQ-CLOSE')?.amount).toBe(115000);
  });

  it('computes financial KPIs', () => {
    const kpis = computeFinancialKpis({
      currentAssets: 200000,
      currentLiabilities: 100000,
      inventory: 50000,
      totalAssets: 500000,
      totalLiabilities: 200000,
      totalEquity: 300000,
      revenue: 400000,
      cogs: 150000,
      operatingExpenses: 100000,
      netIncome: 50000,
      accountsReceivable: 80000,
      accountsPayable: 60000,
      budgetAmount: 300000,
      budgetExecuted: 180000,
      netCashFlow: 25000,
      openingCash: 100000,
    });
    expect(kpis.find((k) => k.kpiCode === 'LIQ_CURRENT')?.value).toBe(2);
    expect(kpis.find((k) => k.kpiCode === 'MARGIN_NET')?.value).toBe(0.13);
    expect(kpis.length).toBe(15);
  });

  it('evaluates closing checklist', () => {
    const result = evaluateClosingChecklist([
      { itemCode: 'CHK-1', passed: true, message: 'OK' },
      { itemCode: 'CHK-2', passed: false, message: 'Fail' },
    ]);
    expect(result.passed).toBe(false);
    expect(result.failedRequired).toContain('CHK-2');
  });

  it('projects financial scenario', () => {
    const projection = projectScenario(1200000, 900000, 10, 5, 6);
    expect(projection).toHaveLength(6);
    expect(projection[5].netIncome).toBeGreaterThan(0);
  });

  it('detects journal anomalies', () => {
    const anomalies = detectJournalAnomalies([
      { entryKey: 'E1', totalDebit: 100, totalCredit: 90, lineCount: 2 },
      { entryKey: 'E2', totalDebit: 50, totalCredit: 50, lineCount: 1 },
    ]);
    expect(anomalies.some((a) => a.anomalyType === 'unbalanced')).toBe(true);
    expect(anomalies.some((a) => a.anomalyType === 'single_line')).toBe(true);
  });

  it('builds trend series', () => {
    const trend = buildTrendSeries([
      { periodKey: '2026-01', value: 100 },
      { periodKey: '2026-02', value: 120 },
    ]);
    expect(trend.direction).toBe('up');
    expect(trend.changePct).toBe(20);
  });

  it('resolves closing type', () => {
    expect(resolveClosingType(3)).toBe('quarterly');
    expect(resolveClosingType(12, true)).toBe('annual');
    expect(resolveClosingType(2)).toBe('monthly');
  });

  it('rounds money correctly', () => {
    expect(roundMoney(1.006)).toBe(1.01);
    expect(roundMoney(1.004)).toBe(1);
  });
});
