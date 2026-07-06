export const DEFAULT_HEP_QUICK_LINKS = [
  { linkKey: 'QL-PROFILE', label: 'Mi perfil', description: 'Datos personales y contacto', routePath: '/portal/perfil', icon: '👤', sortOrder: 1, moduleCode: 'profile' },
  { linkKey: 'QL-PAYSLIP', label: 'Desprendibles', description: 'Consultar nómina', routePath: '/portal/nomina/desprendibles', icon: '💵', sortOrder: 2, moduleCode: 'payroll' },
  { linkKey: 'QL-SALARY', label: 'Historial salarial', description: 'Cambios de salario y cargo', routePath: '/portal/nomina/historial', icon: '📈', sortOrder: 2, moduleCode: 'salary' },
  { linkKey: 'QL-CONTRIB', label: 'Aportes', description: 'Salud, pensión y parafiscales', routePath: '/portal/nomina/aportes', icon: '🏦', sortOrder: 2, moduleCode: 'contributions' },
  { linkKey: 'QL-TIME', label: 'Asistencia', description: 'Marcaciones y turnos', routePath: '/portal/asistencia', icon: '⏱', sortOrder: 3, moduleCode: 'attendance' },
  { linkKey: 'QL-REQ', label: 'Solicitudes', description: 'Vacaciones, permisos y licencias', routePath: '/portal/solicitudes', icon: '📝', sortOrder: 4, moduleCode: 'requests' },
  { linkKey: 'QL-VAC', label: 'Vacaciones', description: 'Saldos y programadas', routePath: '/portal/solicitudes?tab=vacaciones', icon: '🏖', sortOrder: 5, moduleCode: 'vacation' },
  { linkKey: 'QL-TRAIN', label: 'Capacitación', description: 'Cursos y certificaciones', routePath: '/portal/capacitacion', icon: '🎓', sortOrder: 5, moduleCode: 'training' },
  { linkKey: 'QL-SST', label: 'SST', description: 'Salud y seguridad', routePath: '/portal/sst', icon: '🛡', sortOrder: 6, moduleCode: 'sst' },
  { linkKey: 'QL-DOCS', label: 'Documentos', description: 'Expediente digital', routePath: '/portal/documentos', icon: '📄', sortOrder: 7, moduleCode: 'documents' },
  { linkKey: 'QL-CERTS', label: 'Certificados', description: 'Laborales e ingresos', routePath: '/portal/documentos/certificados', icon: '📑', sortOrder: 7, moduleCode: 'certificates' },
  { linkKey: 'QL-NEWS', label: 'Noticias', description: 'Comunicados corporativos', routePath: '/portal/noticias', icon: '📰', sortOrder: 8, moduleCode: 'news' },
] as const;

export function generateHepKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(8, '0')}`;
}

export function fullDisplayName(parts: {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  secondLastName?: string | null;
  displayName?: string | null;
}): string {
  if (parts.displayName?.trim()) return parts.displayName.trim();
  return [parts.firstName, parts.middleName, parts.lastName, parts.secondLastName]
    .filter(Boolean)
    .join(' ')
    .trim();
}

export function isBirthdayToday(birthDate: Date | string | null | undefined, now = new Date()): boolean {
  if (!birthDate) return false;
  const d = new Date(birthDate);
  return d.getUTCMonth() === now.getUTCMonth() && d.getUTCDate() === now.getUTCDate();
}

export function isBirthdayThisMonth(birthDate: Date | string | null | undefined, now = new Date()): boolean {
  if (!birthDate) return false;
  const d = new Date(birthDate);
  return d.getUTCMonth() === now.getUTCMonth();
}

export function noticeIsActive(notice: { isActive: boolean; startsAt: Date | string; endsAt?: Date | string | null }, now = new Date()): boolean {
  if (!notice.isActive) return false;
  const start = new Date(notice.startsAt).getTime();
  const end = notice.endsAt ? new Date(notice.endsAt).getTime() : Number.POSITIVE_INFINITY;
  const t = now.getTime();
  return t >= start && t <= end;
}

export function newsIsActive(news: { isActive: boolean; publishedAt: Date | string; expiresAt?: Date | string | null }, now = new Date()): boolean {
  if (!news.isActive) return false;
  const published = new Date(news.publishedAt).getTime();
  const expires = news.expiresAt ? new Date(news.expiresAt).getTime() : Number.POSITIVE_INFINITY;
  const t = now.getTime();
  return t >= published && t <= expires;
}

export function resolvePhotoUrl(profilePhoto?: string | null, employeePhoto?: string | null): string | null {
  return profilePhoto || employeePhoto || null;
}

export function resolveContact(profile: {
  personalEmail?: string | null;
  personalPhone?: string | null;
  personalMobile?: string | null;
  address?: string | null;
  city?: string | null;
}, employee: {
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  address?: string | null;
  city?: string | null;
}) {
  return {
    email: profile.personalEmail || employee.email || null,
    phone: profile.personalPhone || employee.phone || null,
    mobile: profile.personalMobile || employee.mobile || null,
    address: profile.address || employee.address || null,
    city: profile.city || employee.city || null,
  };
}

export function validateProfileUpdate(input: {
  personalEmail?: string;
  personalPhone?: string;
  personalMobile?: string;
  photoUrl?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (input.personalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.personalEmail)) {
    errors.push('Correo personal inválido');
  }
  if (input.photoUrl && !/^https?:\/\//.test(input.photoUrl) && !input.photoUrl.startsWith('/')) {
    errors.push('URL de fotografía inválida');
  }
  return { valid: errors.length === 0, errors };
}

export type HepRequestTypeCode =
  | 'vacation'
  | 'permission_paid'
  | 'permission_unpaid'
  | 'permission_hours'
  | 'permission_days'
  | 'leave_maternity'
  | 'leave_paternity'
  | 'leave_special'
  | 'leave_custom'
  | 'certificate_labor'
  | 'certificate_income'
  | 'certificate_custom';

export function categoryFromRequestType(requestType: HepRequestTypeCode): 'vacation' | 'permission' | 'leave' | 'certificate' {
  if (requestType === 'vacation') return 'vacation';
  if (requestType.startsWith('permission_')) return 'permission';
  if (requestType.startsWith('leave_')) return 'leave';
  return 'certificate';
}

export function defaultRequestTitle(requestType: HepRequestTypeCode): string {
  const titles: Record<HepRequestTypeCode, string> = {
    vacation: 'Solicitud de vacaciones',
    permission_paid: 'Permiso remunerado',
    permission_unpaid: 'Permiso no remunerado',
    permission_hours: 'Permiso por horas',
    permission_days: 'Permiso por días',
    leave_maternity: 'Licencia de maternidad',
    leave_paternity: 'Licencia de paternidad',
    leave_special: 'Licencia especial',
    leave_custom: 'Licencia configurable',
    certificate_labor: 'Certificado laboral',
    certificate_income: 'Certificado de ingresos',
    certificate_custom: 'Constancia configurable',
  };
  return titles[requestType];
}

export function computeRequestDays(startDate?: string | null, endDate?: string | null, days?: number | null): number {
  if (days != null && days > 0) return days;
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
  return Math.max(0, diff);
}

export function validateRequestCreate(input: {
  requestType: HepRequestTypeCode;
  startDate?: string;
  endDate?: string;
  hours?: number;
  days?: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const category = categoryFromRequestType(input.requestType);
  if (category === 'vacation' || category === 'leave' || input.requestType === 'permission_days') {
    if (!input.startDate) errors.push('Fecha inicio requerida');
    if (!input.endDate) errors.push('Fecha fin requerida');
    if (input.startDate && input.endDate && new Date(input.endDate) < new Date(input.startDate)) {
      errors.push('Fecha fin inválida');
    }
  }
  if (input.requestType === 'permission_hours' && (!input.hours || input.hours <= 0)) {
    errors.push('Horas requeridas');
  }
  return { valid: errors.length === 0, errors };
}

export function canSubmitRequest(status: string): boolean {
  return status === 'draft' || status === 'rejected';
}

export function canCancelRequest(status: string): boolean {
  return ['draft', 'submitted', 'pending_approval'].includes(status);
}

export function canDecideRequest(status: string): boolean {
  return status === 'submitted' || status === 'pending_approval';
}

export function validateAttachment(fileName: string, mimeType?: string): { valid: boolean; reason?: string } {
  if (!fileName?.trim()) return { valid: false, reason: 'Nombre de archivo requerido' };
  if (mimeType && !/^(image\/|application\/pdf|application\/msword|application\/vnd\.|text\/)/.test(mimeType)) {
    return { valid: false, reason: 'Tipo de archivo no permitido' };
  }
  return { valid: true };
}

export function buildMinimalPdfBase64(lines: string[]): string {
  const text = lines.join('\n');
  const escaped = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const content = `BT /F1 12 Tf 50 750 Td (${escaped.replace(/\n/g, ') Tj T* (')}) Tj ET`;
  const objects = [
    '1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj',
    '2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj',
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj',
    `4 0 obj<< /Length ${content.length} >>stream\n${content}\nendstream endobj`,
    '5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${obj}\n`;
  }
  const xrefPos = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return Buffer.from(pdf, 'utf8').toString('base64');
}

export function vacationBalanceSummary(balance: {
  accruedDays?: number | null;
  takenDays?: number | null;
  pendingDays?: number | null;
  availableDays?: number | null;
} | null) {
  return {
    accruedDays: balance?.accruedDays ?? 0,
    takenDays: balance?.takenDays ?? 0,
    pendingDays: balance?.pendingDays ?? 0,
    availableDays: balance?.availableDays ?? 0,
  };
}

export const CONTRIBUTION_CATEGORIES = [
  'health', 'pension', 'arl', 'compensation_fund', 'sena', 'icbf', 'voluntary',
] as const;

export function isContributionLine(category: string, kind?: string): boolean {
  if (CONTRIBUTION_CATEGORIES.includes(category as typeof CONTRIBUTION_CATEGORIES[number])) return true;
  return kind === 'employer_contribution' || (kind === 'deduction' && ['health', 'pension'].includes(category));
}

export function filterPayslipsByPeriod<T extends { periodCode: string }>(
  payslips: T[],
  periodCode?: string,
  periodFrom?: string,
  periodTo?: string,
): T[] {
  return payslips.filter((p) => {
    if (periodCode && p.periodCode !== periodCode) return false;
    if (periodFrom && p.periodCode < periodFrom) return false;
    if (periodTo && p.periodCode > periodTo) return false;
    return true;
  });
}

export function buildPayslipPdfLines(payslip: {
  payslipKey: string;
  periodCode: string;
  employeeKey: string;
  baseSalary: number;
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  lines?: Array<{ conceptName: string; amount: number; kind: string }>;
}): string[] {
  const lines = [
    `Desprendible ${payslip.payslipKey}`,
    `Período: ${payslip.periodCode}`,
    `Empleado: ${payslip.employeeKey}`,
    `Salario base: ${payslip.baseSalary}`,
    `Devengado: ${payslip.totalEarnings}`,
    `Deducciones: ${payslip.totalDeductions}`,
    `Neto: ${payslip.netPay}`,
  ];
  for (const line of payslip.lines ?? []) {
    lines.push(`${line.conceptName} (${line.kind}): ${line.amount}`);
  }
  return lines;
}

export function groupContributions(lines: Array<{
  category: string; conceptName: string; amount: number; kind: string; periodCode?: string;
}>) {
  const groups: Record<string, { category: string; total: number; items: typeof lines }> = {};
  for (const line of lines) {
    if (!isContributionLine(line.category, line.kind)) continue;
    if (!groups[line.category]) groups[line.category] = { category: line.category, total: 0, items: [] };
    groups[line.category].total += line.amount;
    groups[line.category].items.push(line);
  }
  return Object.values(groups);
}

export function canAccessEmployeeData(requestedKey: string | undefined, resolvedKey: string): boolean {
  return !requestedKey || requestedKey === resolvedKey;
}

export function mapSalaryHistory(events: Array<{
  historyKey: string;
  eventType: string;
  effectiveDate: Date | string;
  toPositionKey?: string | null;
  fromPositionKey?: string | null;
  notes?: string | null;
  metadata?: unknown;
}>) {
  return events.map((e) => {
    const meta = (e.metadata ?? {}) as Record<string, unknown>;
    return {
      historyKey: e.historyKey,
      eventType: e.eventType,
      effectiveDate: e.effectiveDate,
      positionKey: e.toPositionKey ?? e.fromPositionKey ?? null,
      fromPositionKey: e.fromPositionKey,
      toPositionKey: e.toPositionKey,
      salary: meta.salary ?? meta.newSalary ?? null,
      previousSalary: meta.previousSalary ?? null,
      reason: e.notes ?? meta.reason ?? e.eventType,
    };
  });
}


