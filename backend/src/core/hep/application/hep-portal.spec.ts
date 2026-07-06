import {
  buildMinimalPdfBase64,
  buildPayslipPdfLines,
  canAccessEmployeeData,
  canCancelRequest,
  canDecideRequest,
  canSubmitRequest,
  categoryFromRequestType,
  computeRequestDays,
  defaultRequestTitle,
  filterPayslipsByPeriod,
  fullDisplayName,
  generateHepKey,
  groupContributions,
  isBirthdayThisMonth,
  isBirthdayToday,
  isContributionLine,
  mapSalaryHistory,
  newsIsActive,
  noticeIsActive,
  resolveContact,
  resolvePhotoUrl,
  validateAttachment,
  validateProfileUpdate,
  validateRequestCreate,
  vacationBalanceSummary,
} from '../domain/hep-portal.engine';

describe('Employee Portal Engine — Parte 1', () => {
  it('generates HEP keys', () => {
    expect(generateHepKey('PRF', 1)).toBe('PRF-00000001');
  });

  it('builds full display name', () => {
    expect(fullDisplayName({ firstName: 'Ana', lastName: 'Pérez' })).toBe('Ana Pérez');
    expect(fullDisplayName({ displayName: 'Ana P.' })).toBe('Ana P.');
  });

  it('detects birthdays', () => {
    const now = new Date('2026-07-04T12:00:00Z');
    expect(isBirthdayToday('2020-07-04', now)).toBe(true);
    expect(isBirthdayThisMonth('2020-07-20', now)).toBe(true);
    expect(isBirthdayThisMonth('2020-06-20', now)).toBe(false);
  });

  it('filters active notices and news', () => {
    const now = new Date('2026-07-04T12:00:00Z');
    expect(noticeIsActive({ isActive: true, startsAt: '2026-07-01', endsAt: '2026-07-10' }, now)).toBe(true);
    expect(noticeIsActive({ isActive: true, startsAt: '2026-07-05', endsAt: null }, now)).toBe(false);
    expect(newsIsActive({ isActive: true, publishedAt: '2026-07-01', expiresAt: null }, now)).toBe(true);
  });

  it('resolves photo and contact overrides', () => {
    expect(resolvePhotoUrl('/portal/photo.jpg', '/hcm/photo.jpg')).toBe('/portal/photo.jpg');
    expect(resolvePhotoUrl(null, '/hcm/photo.jpg')).toBe('/hcm/photo.jpg');
    const contact = resolveContact(
      { personalEmail: 'a@x.com', personalPhone: null, personalMobile: '300', address: null, city: 'Bogotá' },
      { email: 'work@x.com', phone: '601', mobile: null, address: 'Calle 1', city: null },
    );
    expect(contact.email).toBe('a@x.com');
    expect(contact.phone).toBe('601');
    expect(contact.mobile).toBe('300');
    expect(contact.address).toBe('Calle 1');
    expect(contact.city).toBe('Bogotá');
  });

  it('validates profile updates', () => {
    expect(validateProfileUpdate({ personalEmail: 'ok@demo.com' }).valid).toBe(true);
    expect(validateProfileUpdate({ personalEmail: 'bad' }).valid).toBe(false);
    expect(validateProfileUpdate({ photoUrl: 'https://cdn/x.jpg' }).valid).toBe(true);
  });

  it('maps request categories and titles', () => {
    expect(categoryFromRequestType('vacation')).toBe('vacation');
    expect(categoryFromRequestType('permission_paid')).toBe('permission');
    expect(categoryFromRequestType('leave_maternity')).toBe('leave');
    expect(categoryFromRequestType('certificate_labor')).toBe('certificate');
    expect(defaultRequestTitle('vacation')).toContain('vacaciones');
  });

  it('computes request days and validates create', () => {
    expect(computeRequestDays('2026-07-01', '2026-07-05')).toBe(5);
    expect(validateRequestCreate({ requestType: 'vacation', startDate: '2026-07-01', endDate: '2026-07-05' }).valid).toBe(true);
    expect(validateRequestCreate({ requestType: 'permission_hours', hours: 0 }).valid).toBe(false);
  });

  it('validates request status transitions and attachments', () => {
    expect(canSubmitRequest('draft')).toBe(true);
    expect(canCancelRequest('pending_approval')).toBe(true);
    expect(canDecideRequest('pending_approval')).toBe(true);
    expect(validateAttachment('soporte.pdf', 'application/pdf').valid).toBe(true);
  });

  it('builds vacation summary and minimal pdf', () => {
    expect(vacationBalanceSummary({ availableDays: 10, takenDays: 5, pendingDays: 2, accruedDays: 17 }).availableDays).toBe(10);
    const pdf = buildMinimalPdfBase64(['Certificado laboral', 'Empleado: Ana']);
    expect(pdf.length).toBeGreaterThan(20);
    expect(Buffer.from(pdf, 'base64').toString('utf8')).toContain('%PDF');
  });

  it('filters payslips and builds payslip pdf lines', () => {
    const rows = filterPayslipsByPeriod(
      [{ periodCode: '2026-01' }, { periodCode: '2026-02' }, { periodCode: '2026-03' }],
      undefined,
      '2026-02',
      '2026-03',
    );
    expect(rows).toHaveLength(2);
    const lines = buildPayslipPdfLines({
      payslipKey: 'PSL-1', periodCode: '2026-03', employeeKey: 'E1',
      baseSalary: 100, totalEarnings: 120, totalDeductions: 20, netPay: 100,
      lines: [{ conceptName: 'Salud', amount: 4, kind: 'deduction' }],
    });
    expect(lines.some((l) => l.includes('Neto'))).toBe(true);
  });

  it('groups contributions and enforces access', () => {
    expect(isContributionLine('health', 'deduction')).toBe(true);
    const groups = groupContributions([
      { category: 'health', conceptName: 'EPS', amount: 40, kind: 'deduction', periodCode: '2026-03' },
      { category: 'pension', conceptName: 'AFP', amount: 40, kind: 'deduction', periodCode: '2026-03' },
      { category: 'base_salary', conceptName: 'Salario', amount: 1000, kind: 'earning', periodCode: '2026-03' },
    ]);
    expect(groups).toHaveLength(2);
    expect(canAccessEmployeeData(undefined, 'E1')).toBe(true);
    expect(canAccessEmployeeData('E2', 'E1')).toBe(false);
  });

  it('maps salary history', () => {
    const mapped = mapSalaryHistory([
      {
        historyKey: 'H1', eventType: 'salary_change', effectiveDate: '2026-01-01',
        toPositionKey: 'POS-1', notes: 'Aumento', metadata: { salary: 3000000, previousSalary: 2500000 },
      },
    ]);
    expect(mapped[0].salary).toBe(3000000);
    expect(mapped[0].reason).toBe('Aumento');
  });
});


