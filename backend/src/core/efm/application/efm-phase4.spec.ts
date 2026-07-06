import {
  buildCashFlowProjection,
  computeCashCountDifference,
  generateTrKey,
  matchMovementToLine,
  parseCsvStatement,
  parseOfxStatement,
  withinTolerance,
} from '../domain/efm-treasury.engine';

describe('EFM Treasury Engine — Fase 4', () => {
  it('generates treasury keys', () => {
    expect(generateTrKey('MOV', 1)).toBe('MOV-00000001');
  });

  it('parses CSV statement lines', () => {
    const csv = 'fecha,descripcion,referencia,debito,credito\n2026-01-15,Pago,REF1,0,1000\n2026-01-16,Retiro,REF2,500,0';
    const lines = parseCsvStatement(csv);
    expect(lines).toHaveLength(2);
    expect(lines[0].credit).toBe(1000);
    expect(lines[1].debit).toBe(500);
  });

  it('parses OFX statement', () => {
    const ofx = `<STMTTRN><DTPOSTED>20260115<TRNAMT>1500.00<MEMO>Consignacion<FITID>TX1</STMTTRN>`;
    const lines = parseOfxStatement(ofx);
    expect(lines).toHaveLength(1);
    expect(lines[0].credit).toBe(1500);
  });

  it('matches movement to statement line', () => {
    const result = matchMovementToLine(
      { amount: 1000, movementDate: new Date('2026-01-15'), referenceNumber: 'REF1', description: 'Pago' },
      { debit: 0, credit: 1000, transactionDate: new Date('2026-01-15'), reference: 'REF1', description: 'Pago proveedor' },
      [{ matchField: 'reference', matchOperator: 'eq', toleranceAmount: 0, toleranceDays: 5 }],
    );
    expect(result.matched).toBe(true);
  });

  it('computes cash count difference', () => {
    expect(computeCashCountDifference(1005000, 1000000)).toBe(5000);
  });

  it('builds cash flow projection', () => {
    const proj = buildCashFlowProjection(1000000, [
      { period: '2026-W01', inflows: 500000, outflows: 300000 },
      { period: '2026-W02', inflows: 200000, outflows: 400000 },
    ]);
    expect(proj[0].cumulativeBalance).toBe(1200000);
    expect(proj[1].netFlow).toBe(-200000);
  });

  it('checks amount tolerance', () => {
    expect(withinTolerance(1000, 1020, 1)).toBe(false);
    expect(withinTolerance(1000, 1005, 1)).toBe(true);
  });

  it('handles concurrent treasury keys', () => {
    const keys = Array.from({ length: 100 }, (_, i) => generateTrKey('BAC', i + 1));
    expect(new Set(keys).size).toBe(100);
  });
});
