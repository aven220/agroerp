export type PyConceptDef = {
  code: string;
  name: string;
  kind: 'earning' | 'deduction' | 'employer_contribution' | 'provision' | 'informational';
  category: string;
  rate?: number;
  fixedAmount?: number;
  isTaxable?: boolean;
  isSocialBase?: boolean;
  affectsNet?: boolean;
};

export type PyFundDef = {
  code: string;
  name: string;
  fundType: string;
  employeeRate: number;
  employerRate: number;
  entityName?: string;
};

export type PyNoveltyInput = {
  noveltyType: string;
  hours?: number | null;
  quantity?: number | null;
  multiplier: number;
};

export type PyGarnishmentInput = {
  garnishmentType: string;
  fixedAmount?: number | null;
  percentage?: number | null;
  balance?: number | null;
};

export type PyPayslipLineCalc = {
  conceptCode: string;
  conceptName: string;
  kind: PyConceptDef['kind'];
  category: string;
  quantity: number;
  rate: number;
  amount: number;
};

export type PyPayslipCalcResult = {
  baseSalary: number;
  lines: PyPayslipLineCalc[];
  totalEarnings: number;
  totalDeductions: number;
  totalEmployer: number;
  netPay: number;
  socialBase: number;
};

export const DEFAULT_PY_CONCEPTS: readonly PyConceptDef[] = [
  { code: 'SAL', name: 'Salario básico', kind: 'earning', category: 'base_salary', isTaxable: true, isSocialBase: true },
  { code: 'HEX', name: 'Horas extras', kind: 'earning', category: 'overtime', isTaxable: true, isSocialBase: true },
  { code: 'RN', name: 'Recargo nocturno', kind: 'earning', category: 'night_surcharge', isTaxable: true, isSocialBase: true },
  { code: 'RD', name: 'Recargo dominical', kind: 'earning', category: 'sunday_surcharge', isTaxable: true, isSocialBase: true },
  { code: 'RF', name: 'Recargo festivo', kind: 'earning', category: 'holiday_surcharge', isTaxable: true, isSocialBase: true },
  { code: 'COM', name: 'Comisiones', kind: 'earning', category: 'commission', isTaxable: true, isSocialBase: true },
  { code: 'BON', name: 'Bonificaciones', kind: 'earning', category: 'bonus', isTaxable: true, isSocialBase: true },
  { code: 'AUXT', name: 'Auxilio de transporte', kind: 'earning', category: 'transport', isTaxable: false, isSocialBase: false },
  { code: 'AUXN', name: 'Auxilio no salarial', kind: 'earning', category: 'allowance', isTaxable: false, isSocialBase: false },
  { code: 'VAC', name: 'Vacaciones', kind: 'earning', category: 'vacation', isTaxable: true, isSocialBase: true },
  { code: 'LIC', name: 'Licencia', kind: 'earning', category: 'license', isTaxable: false, isSocialBase: false },
  { code: 'INC', name: 'Incapacidad', kind: 'earning', category: 'incapacity', isTaxable: false, isSocialBase: false },
  { code: 'SUS', name: 'Suspensión', kind: 'deduction', category: 'suspension', affectsNet: true },
  { code: 'EPS-E', name: 'Salud empleado', kind: 'deduction', category: 'health', rate: 0.04, isSocialBase: false },
  { code: 'AFP-E', name: 'Pensión empleado', kind: 'deduction', category: 'pension', rate: 0.04, isSocialBase: false },
  { code: 'RTF', name: 'Retención en la fuente', kind: 'deduction', category: 'withholding', isSocialBase: false },
  { code: 'EMB', name: 'Embargo judicial', kind: 'deduction', category: 'garnishment', isSocialBase: false },
  { code: 'LIB', name: 'Libranza', kind: 'deduction', category: 'loan', isSocialBase: false },
  { code: 'DAV', name: 'Descuento autorizado', kind: 'deduction', category: 'authorized_discount', isSocialBase: false },
  { code: 'VOL', name: 'Aporte voluntario', kind: 'deduction', category: 'voluntary', isSocialBase: false },
  { code: 'EPS-R', name: 'Salud empleador', kind: 'employer_contribution', category: 'health', rate: 0.085 },
  { code: 'AFP-R', name: 'Pensión empleador', kind: 'employer_contribution', category: 'pension', rate: 0.12 },
  { code: 'ARL-R', name: 'ARL empleador', kind: 'employer_contribution', category: 'arl', rate: 0.00522 },
  { code: 'CCF-R', name: 'Caja compensación', kind: 'employer_contribution', category: 'compensation_fund', rate: 0.04 },
  { code: 'SENA-R', name: 'SENA', kind: 'employer_contribution', category: 'sena', rate: 0.02 },
  { code: 'ICBF-R', name: 'ICBF', kind: 'employer_contribution', category: 'icbf', rate: 0.03 },
  { code: 'CES-P', name: 'Provisión cesantías', kind: 'provision', category: 'cesantias', rate: 0.0833 },
  { code: 'INT-P', name: 'Intereses cesantías', kind: 'provision', category: 'cesantias_interest', rate: 0.01 },
  { code: 'PRI-P', name: 'Provisión prima', kind: 'provision', category: 'prima', rate: 0.0833 },
  { code: 'VAC-P', name: 'Provisión vacaciones', kind: 'provision', category: 'vacation_provision', rate: 0.0417 },
  { code: 'DOT-P', name: 'Provisión dotación', kind: 'provision', category: 'dotacion', rate: 0.0833 },
] as const;

export const DEFAULT_PY_FUNDS: readonly PyFundDef[] = [
  { code: 'EPS', name: 'Salud EPS', fundType: 'health', employeeRate: 0.04, employerRate: 0.085, entityName: 'EPS Demo' },
  { code: 'AFP', name: 'Pensión AFP', fundType: 'pension', employeeRate: 0.04, employerRate: 0.12, entityName: 'AFP Demo' },
  { code: 'ARL', name: 'ARL Riesgos', fundType: 'arl', employeeRate: 0, employerRate: 0.00522, entityName: 'ARL Demo' },
  { code: 'CCF', name: 'Caja compensación', fundType: 'compensation_fund', employeeRate: 0, employerRate: 0.04, entityName: 'CCF Demo' },
  { code: 'SENA', name: 'SENA', fundType: 'sena', employeeRate: 0, employerRate: 0.02 },
  { code: 'ICBF', name: 'ICBF', fundType: 'icbf', employeeRate: 0, employerRate: 0.03 },
] as const;

export function generatePyKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(8, '0')}`;
}

export function buildPeriodCode(year: number, month: number, periodicity: string): string {
  if (periodicity === 'biweekly') return `${year}-${String(month).padStart(2, '0')}-Q${month <= 6 ? 1 : 2}`;
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function qualifiesTransportAllowance(baseSalary: number, smmlv: number): boolean {
  return baseSalary <= smmlv * 2;
}

export function hourlyRate(baseSalary: number, monthlyHours = 240): number {
  return baseSalary / monthlyHours;
}

export function mapNoveltyToConceptCode(noveltyType: string): string {
  const map: Record<string, string> = {
    overtime: 'HEX',
    night_surcharge: 'RN',
    sunday_surcharge: 'RD',
    holiday_surcharge: 'RF',
    commission: 'COM',
    vacation: 'VAC',
    license: 'LIC',
    incapacity: 'INC',
    suspension: 'SUS',
    bonus: 'BON',
  };
  return map[noveltyType] ?? 'BON';
}

export function computeNoveltyAmount(baseSalary: number, novelty: PyNoveltyInput, monthlyHours = 240): number {
  const hr = hourlyRate(baseSalary, monthlyHours);
  const hours = novelty.hours ?? novelty.quantity ?? 0;
  if (hours <= 0) return 0;
  return roundMoney(hr * hours * novelty.multiplier);
}

export function computeWithholdingTax(taxableIncome: number, uvt: number): number {
  const incomeUvt = taxableIncome / uvt;
  if (incomeUvt <= 95) return 0;
  if (incomeUvt <= 150) return roundMoney((taxableIncome - 95 * uvt) * 0.19);
  if (incomeUvt <= 360) return roundMoney((taxableIncome - 150 * uvt) * 0.28 + 10.4 * uvt * 0.19);
  if (incomeUvt <= 640) return roundMoney((taxableIncome - 360 * uvt) * 0.33 + 69 * uvt * 0.28);
  if (incomeUvt <= 945) return roundMoney((taxableIncome - 640 * uvt) * 0.35 + 162 * uvt * 0.33);
  return roundMoney((taxableIncome - 945 * uvt) * 0.37 + 268.8 * uvt * 0.35);
}

export function computeGarnishmentAmount(netBefore: number, g: PyGarnishmentInput): number {
  if (g.fixedAmount && g.fixedAmount > 0) return roundMoney(Math.min(g.fixedAmount, netBefore));
  if (g.percentage && g.percentage > 0) {
    const amt = roundMoney(netBefore * (g.percentage / 100));
    if (g.balance != null) return roundMoney(Math.min(amt, g.balance, netBefore));
    return amt;
  }
  return 0;
}

export function computeProvisionAmount(baseSalary: number, rate: number): number {
  return roundMoney(baseSalary * rate);
}

export type PyCalcInput = {
  baseSalary: number;
  workedDays: number;
  periodDays: number;
  smmlv: number;
  transportAllowance: number;
  uvt: number;
  concepts: PyConceptDef[];
  novelties?: PyNoveltyInput[];
  garnishments?: PyGarnishmentInput[];
  benefits?: Array<{ name: string; amount: number; benefitType: string }>;
};

export function calculatePayslip(input: PyCalcInput): PyPayslipCalcResult {
  const lines: PyPayslipLineCalc[] = [];
  const prorate = input.workedDays / input.periodDays;
  const baseSalary = roundMoney(input.baseSalary * prorate);

  lines.push({
    conceptCode: 'SAL',
    conceptName: 'Salario básico',
    kind: 'earning',
    category: 'base_salary',
    quantity: prorate,
    rate: input.baseSalary,
    amount: baseSalary,
  });

  let totalEarnings = baseSalary;
  let taxableEarnings = baseSalary;

  if (qualifiesTransportAllowance(input.baseSalary, input.smmlv)) {
    const transport = roundMoney(input.transportAllowance * prorate);
    lines.push({
      conceptCode: 'AUXT',
      conceptName: 'Auxilio de transporte',
      kind: 'earning',
      category: 'transport',
      quantity: prorate,
      rate: input.transportAllowance,
      amount: transport,
    });
    totalEarnings += transport;
  }

  for (const n of input.novelties ?? []) {
    const code = mapNoveltyToConceptCode(n.noveltyType);
    const concept = input.concepts.find((c) => c.code === code);
    const amount = computeNoveltyAmount(input.baseSalary, n);
    if (amount <= 0) continue;
    lines.push({
      conceptCode: code,
      conceptName: concept?.name ?? code,
      kind: 'earning',
      category: concept?.category ?? 'bonus',
      quantity: n.hours ?? n.quantity ?? 1,
      rate: n.multiplier,
      amount,
    });
    totalEarnings += amount;
    if (concept?.isTaxable !== false) taxableEarnings += amount;
  }

  for (const b of input.benefits ?? []) {
    if (b.amount <= 0) continue;
    lines.push({
      conceptCode: 'BON',
      conceptName: b.name,
      kind: 'earning',
      category: 'bonus',
      quantity: 1,
      rate: b.amount,
      amount: b.amount,
    });
    totalEarnings += b.amount;
    taxableEarnings += b.amount;
  }

  const socialBase = roundMoney(taxableEarnings);
  let totalDeductions = 0;
  let totalEmployer = 0;

  const employeeConcepts = input.concepts.filter((c) => c.kind === 'deduction' && c.rate);
  for (const c of employeeConcepts) {
    if (c.code === 'RTF') continue;
    const amount = roundMoney(socialBase * (c.rate ?? 0));
    if (amount <= 0) continue;
    lines.push({
      conceptCode: c.code,
      conceptName: c.name,
      kind: 'deduction',
      category: c.category,
      quantity: 1,
      rate: c.rate ?? 0,
      amount,
    });
    totalDeductions += amount;
  }

  const withholding = computeWithholdingTax(Math.max(0, taxableEarnings - totalDeductions), input.uvt);
  if (withholding > 0) {
    lines.push({
      conceptCode: 'RTF',
      conceptName: 'Retención en la fuente',
      kind: 'deduction',
      category: 'withholding',
      quantity: 1,
      rate: 0,
      amount: withholding,
    });
    totalDeductions += withholding;
  }

  let netBeforeGarnishments = roundMoney(totalEarnings - totalDeductions);
  for (const g of input.garnishments ?? []) {
    const amount = computeGarnishmentAmount(netBeforeGarnishments, g);
    if (amount <= 0) continue;
    const code = g.garnishmentType === 'judicial' ? 'EMB' : g.garnishmentType === 'loan' ? 'LIB' : g.garnishmentType === 'voluntary_contribution' ? 'VOL' : 'DAV';
    lines.push({
      conceptCode: code,
      conceptName: code,
      kind: 'deduction',
      category: g.garnishmentType,
      quantity: 1,
      rate: g.percentage ?? 0,
      amount,
    });
    totalDeductions += amount;
    netBeforeGarnishments -= amount;
  }

  const employerConcepts = input.concepts.filter((c) => c.kind === 'employer_contribution' && c.rate);
  for (const c of employerConcepts) {
    const amount = roundMoney(socialBase * (c.rate ?? 0));
    if (amount <= 0) continue;
    lines.push({
      conceptCode: c.code,
      conceptName: c.name,
      kind: 'employer_contribution',
      category: c.category,
      quantity: 1,
      rate: c.rate ?? 0,
      amount,
    });
    totalEmployer += amount;
  }

  const provisionConcepts = input.concepts.filter((c) => c.kind === 'provision' && c.rate);
  for (const c of provisionConcepts) {
    const amount = computeProvisionAmount(socialBase, c.rate ?? 0);
    if (amount <= 0) continue;
    lines.push({
      conceptCode: c.code,
      conceptName: c.name,
      kind: 'provision',
      category: c.category,
      quantity: 1,
      rate: c.rate ?? 0,
      amount,
    });
  }

  const netPay = roundMoney(totalEarnings - totalDeductions);
  return {
    baseSalary,
    lines,
    totalEarnings: roundMoney(totalEarnings),
    totalDeductions: roundMoney(totalDeductions),
    totalEmployer: roundMoney(totalEmployer),
    netPay,
    socialBase,
  };
}

export function computeSettlementBreakdown(input: {
  baseSalary: number;
  hireDate: Date;
  terminationDate: Date;
  smmlv: number;
  transportAllowance: number;
  pendingVacationDays: number;
  concepts: PyConceptDef[];
}): { lines: PyPayslipLineCalc[]; totalEarnings: number; totalDeductions: number; totalNet: number } {
  const daysWorked = Math.max(0, Math.floor((input.terminationDate.getTime() - input.hireDate.getTime()) / 86400000));
  const monthsWorked = daysWorked / 30;
  const cesantias = roundMoney(input.baseSalary * 0.0833 * monthsWorked);
  const prima = roundMoney(input.baseSalary * 0.0833 * (monthsWorked % 6 || 6) / 6);
  const vacPay = roundMoney((input.baseSalary / 30) * input.pendingVacationDays);
  const lines: PyPayslipLineCalc[] = [
    { conceptCode: 'CES', conceptName: 'Cesantías', kind: 'earning', category: 'cesantias', quantity: monthsWorked, rate: input.baseSalary * 0.0833, amount: cesantias },
    { conceptCode: 'PRI', conceptName: 'Prima proporcional', kind: 'earning', category: 'prima', quantity: 1, rate: prima, amount: prima },
    { conceptCode: 'VAC', conceptName: 'Vacaciones pendientes', kind: 'earning', category: 'vacation', quantity: input.pendingVacationDays, rate: input.baseSalary / 30, amount: vacPay },
  ];
  const totalEarnings = roundMoney(cesantias + prima + vacPay);
  return { lines, totalEarnings, totalDeductions: 0, totalNet: totalEarnings };
}

export function validatePayrollRunConcurrency(activeRuns: number): { valid: boolean; reason?: string } {
  if (activeRuns > 1) return { valid: false, reason: 'Ya existe un proceso de nómina en ejecución' };
  return { valid: true };
}

export function mergeBulkPayslipResults<T extends { employeeKey: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (seen.has(r.employeeKey)) return false;
    seen.add(r.employeeKey);
    return true;
  });
}
