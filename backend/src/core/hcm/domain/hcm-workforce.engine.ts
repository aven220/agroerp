export type OrgTreeNode = {
  nodeKey: string;
  nodeType: string;
  refKey: string;
  parentNodeKey: string | null;
  title: string;
  sortOrder: number;
  children?: OrgTreeNode[];
};

export type EmployeeImportRow = {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  documentNumber: string;
  email?: string;
  companyKey: string;
  departmentKey?: string;
  positionKey?: string;
  hireDate?: string;
};

export type ImportValidationResult = {
  row: number;
  valid: boolean;
  errors: string[];
  data?: EmployeeImportRow;
};

export const DEFAULT_HCM_HIERARCHY_LEVELS = [
  { levelKey: 'LVL-EXEC', code: 'EXEC', name: 'Ejecutivo', rank: 1 },
  { levelKey: 'LVL-DIR', code: 'DIR', name: 'Directivo', rank: 2 },
  { levelKey: 'LVL-MGR', code: 'MGR', name: 'Gerencial', rank: 3 },
  { levelKey: 'LVL-COORD', code: 'COORD', name: 'Coordinación', rank: 4 },
  { levelKey: 'LVL-PROF', code: 'PROF', name: 'Profesional', rank: 5 },
  { levelKey: 'LVL-TECH', code: 'TECH', name: 'Técnico', rank: 6 },
  { levelKey: 'LVL-OPS', code: 'OPS', name: 'Operativo', rank: 7 },
] as const;

export const DEFAULT_HCM_POSITIONS = [
  { positionKey: 'POS-CEO', code: 'CEO', name: 'Director General', hierarchyLevelKey: 'LVL-EXEC' },
  { positionKey: 'POS-CFO', code: 'CFO', name: 'Director Financiero', hierarchyLevelKey: 'LVL-EXEC' },
  { positionKey: 'POS-HR', code: 'HR-MGR', name: 'Gerente de Talento Humano', hierarchyLevelKey: 'LVL-MGR' },
  { positionKey: 'POS-ACC', code: 'ACC', name: 'Contador', hierarchyLevelKey: 'LVL-PROF' },
  { positionKey: 'POS-OPS', code: 'OPS-LEAD', name: 'Líder Operativo', hierarchyLevelKey: 'LVL-COORD' },
] as const;

export function generateHcmKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(8, '0')}`;
}

export function buildDisplayName(
  firstName: string,
  lastName: string,
  middleName?: string,
  secondLastName?: string,
): string {
  return [firstName, middleName, lastName, secondLastName].filter(Boolean).join(' ').trim();
}

export function validateEmployeeNumber(employeeNumber: string): boolean {
  return /^[A-Z0-9-]{3,40}$/i.test(employeeNumber);
}

export function validateDocumentNumber(documentNumber: string): boolean {
  return documentNumber.length >= 5 && documentNumber.length <= 40;
}

export function validateImportRow(row: EmployeeImportRow, rowIndex: number): ImportValidationResult {
  const errors: string[] = [];
  if (!row.employeeNumber?.trim()) errors.push('Número de empleado requerido');
  else if (!validateEmployeeNumber(row.employeeNumber)) errors.push('Formato inválido de número de empleado');
  if (!row.firstName?.trim()) errors.push('Nombre requerido');
  if (!row.lastName?.trim()) errors.push('Apellido requerido');
  if (!row.documentNumber?.trim()) errors.push('Documento requerido');
  else if (!validateDocumentNumber(row.documentNumber)) errors.push('Documento inválido');
  if (!row.companyKey?.trim()) errors.push('Empresa requerida');
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push('Email inválido');
  return { row: rowIndex, valid: errors.length === 0, errors, data: row };
}

export function buildOrgTree(flat: OrgTreeNode[]): OrgTreeNode[] {
  const map = new Map<string, OrgTreeNode>();
  const roots: OrgTreeNode[] = [];
  for (const node of flat) {
    map.set(node.nodeKey, { ...node, children: [] });
  }
  for (const node of map.values()) {
    if (node.parentNodeKey && map.has(node.parentNodeKey)) {
      map.get(node.parentNodeKey)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortNodes = (nodes: OrgTreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
    for (const n of nodes) {
      if (n.children?.length) sortNodes(n.children);
    }
  };
  sortNodes(roots);
  return roots;
}

export function resolveContractEndDate(
  contractType: string,
  startDate: Date,
  endDate?: Date | null,
): Date | null {
  if (contractType === 'indefinite') return null;
  if (endDate) return endDate;
  const d = new Date(startDate);
  if (contractType === 'fixed_term' || contractType === 'apprenticeship') {
    d.setFullYear(d.getFullYear() + 1);
    return d;
  }
  if (contractType === 'intern') {
    d.setMonth(d.getMonth() + 6);
    return d;
  }
  return null;
}

export function canTransitionEmploymentStatus(
  current: string,
  next: string,
): boolean {
  const allowed: Record<string, string[]> = {
    active: ['inactive', 'suspended', 'on_leave', 'terminated', 'retired'],
    inactive: ['active', 'terminated'],
    suspended: ['active', 'terminated'],
    on_leave: ['active', 'terminated'],
    terminated: [],
    retired: [],
  };
  return (allowed[current] ?? []).includes(next);
}

export function buildSearchTokens(employee: {
  employeeNumber: string;
  displayName: string;
  documentNumber: string;
  email?: string | null;
}): string {
  return [employee.employeeNumber, employee.displayName, employee.documentNumber, employee.email ?? '']
    .join(' ')
    .toLowerCase();
}

export function filterEmployeesByQuery<T extends { employeeNumber: string; displayName: string; documentNumber: string; email?: string | null }>(
  employees: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return employees;
  return employees.filter((e) => buildSearchTokens(e).includes(q));
}
