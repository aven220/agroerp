/**
 * PM-29 — Motor de implementación (solo frontend).
 * Estados derivados de APIs existentes; sin checkboxes manuales ni backend nuevo.
 */

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getCoffeeCenter, getCoffeeConfigCenter, listCoffeeDocuments, listCoffeeParameters, listCoffeePrices, listCoffeePurchaseCenters, listCoffeeScales, upsertCoffeeParameter } from '../api/coffee';
import { getEimsCenter, listEimsMovements } from '../api/eims';
import { getIamCenter } from '../api/iam';
import { listUsers, listRoles } from '../api/identity';
import { listProducers } from '../api/prm';
import { listWorkflowDefinitions } from '../api/workflows';
import {
  companyMissingFields,
  companyRequiredComplete,
  loadCompanyProfile,
  matchRequiredRoles,
  type CompanyProfile,
} from './companyProfile';

export type DomainStatus = 'not_started' | 'in_progress' | 'complete' | 'blocked';

export type DomainId =
  | 'empresa'
  | 'usuarios'
  | 'configuracion'
  | 'compras'
  | 'inventario'
  | 'productores'
  | 'workflow'
  | 'documentos'
  | 'integraciones'
  | 'reportes'
  | 'prueba'
  | 'golive';

/** Cadena crítica de dependencias (orden de bloqueo). */
export const IMPLEMENTATION_CHAIN: DomainId[] = [
  'empresa',
  'usuarios',
  'configuracion',
  'compras',
  'inventario',
  'productores',
  'workflow',
  'prueba',
  'golive',
];

export interface DomainHelp {
  why: string;
  ifNot: string;
  who: string;
  duration: string;
  hours: number;
}

export interface ImplementationDomain {
  id: DomainId;
  label: string;
  href: string;
  status: DomainStatus;
  /** Estado intrínseco antes de aplicar cascada de dependencias */
  intrinsicStatus: DomainStatus;
  risk?: string;
  dependencies: DomainId[];
  blockedBy?: DomainId;
  blockedReason?: string;
  nextAction: string;
  evidence: string;
  help: DomainHelp;
  responsible: string;
  inChain: boolean;
}

export interface ImplementationSignals {
  coffeeOk: boolean;
  eimsOk: boolean;
  warehouses: number;
  items: number;
  movements: number;
  users: number;
  roles: number;
  activeUsers: number;
  requiredRolesMatched: number;
  requiredRolesMissing: string[];
  producers: number;
  prices: number;
  purchaseCenters: number;
  configOk: boolean;
  workflows: number;
  documents: number;
  scales: number;
  company: CompanyProfile | null;
  companyComplete: boolean;
  companyMissing: string[];
  ticketsToday: number;
  weighedToday: number;
  qualityToday: number;
  settlementsToday: number;
  inventoryToday: number;
  kgToday: number;
  amountToday: number;
  queueLength: number;
}

export interface ConsultantView {
  pendingCount: number;
  blockedCount: number;
  completeCount: number;
  estimatedHoursRemaining: number;
  estimatedLabel: string;
  lastModifiedAt: string | null;
  lastModifiedLabel: string;
  alerts: Array<{ id: string; title: string; detail: string; href: string }>;
  nextDomain: ImplementationDomain | null;
  canCertify: boolean;
  certifyBlockers: string[];
}

export interface ImplementationSnapshot {
  loaded: boolean;
  signals: ImplementationSignals;
  domains: ImplementationDomain[];
  chain: ImplementationDomain[];
  supporting: ImplementationDomain[];
  consultant: ConsultantView;
  certified: boolean;
  certifiedAt: string | null;
}

const STORAGE_CERT = 'agroerp_golive_certified';
const STORAGE_CERT_RECORD = 'agroerp_golive_record';

/** Clave de parámetro org (API existente cpep/config/parameters). */
const GOLIVE_PARAM_KEY = 'implementation.golive';

export interface GoLiveRecord {
  certified: boolean;
  at: string | null;
  note?: string;
}

function parseGoLiveValue(value: unknown): GoLiveRecord | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  return {
    certified: v.certified === true,
    at: typeof v.at === 'string' ? v.at : null,
    note: typeof v.note === 'string' ? v.note : undefined,
  };
}

function readCertifiedLocal(): GoLiveRecord {
  try {
    const certified = localStorage.getItem(STORAGE_CERT) === '1';
    const raw = localStorage.getItem(STORAGE_CERT_RECORD);
    const parsed = raw ? (JSON.parse(raw) as { at?: string; note?: string }) : null;
    return {
      certified,
      at: parsed?.at ?? null,
      note: parsed?.note,
    };
  } catch {
    return { certified: false, at: null };
  }
}

function writeCertifiedLocal(record: GoLiveRecord) {
  try {
    if (record.certified) {
      localStorage.setItem(STORAGE_CERT, '1');
      localStorage.setItem(
        STORAGE_CERT_RECORD,
        JSON.stringify({ at: record.at, note: record.note ?? '', blockers: [] as string[] }),
      );
    } else {
      localStorage.removeItem(STORAGE_CERT);
      localStorage.removeItem(STORAGE_CERT_RECORD);
    }
  } catch {
    /* ignore */
  }
}

/** Lee certificación desde backend; migra localStorage una vez si el org aún no tiene registro. */
export async function loadGoLiveRecord(): Promise<GoLiveRecord> {
  try {
    const rows = await listCoffeeParameters(GOLIVE_PARAM_KEY);
    const row = Array.isArray(rows) ? (rows[0] as { value?: unknown } | undefined) : undefined;
    const fromApi = parseGoLiveValue(row?.value);
    if (fromApi) {
      writeCertifiedLocal(fromApi);
      return fromApi;
    }

    const local = readCertifiedLocal();
    if (local.certified) {
      try {
        await upsertCoffeeParameter({
          parameterKey: GOLIVE_PARAM_KEY,
          name: 'Certificación Go Live',
          scopeType: 'organization',
          value: { certified: true, at: local.at, note: local.note ?? '' },
          dataType: 'json',
          reason: 'Migración PM-32: certificación desde navegador a organización',
        });
      } catch {
        /* sin coffee:config:manage — se mantiene lectura local hasta que un admin certifique */
      }
      return local;
    }
    return { certified: false, at: null };
  } catch {
    return readCertifiedLocal();
  }
}

const STORAGE_LAST = 'agroerp_impl_last_touch';

const HELP: Record<DomainId, DomainHelp> = {
  empresa: {
    why: 'Sin identidad de empresa no hay operación fiscal ni trazabilidad legal.',
    ifNot: 'No podrá emitir liquidaciones ni reportes confiables ante auditoría.',
    who: 'Consultor de implementación + representante legal de la cooperativa.',
    duration: '1–2 horas',
    hours: 2,
  },
  usuarios: {
    why: 'Cada rol operativo necesita acceso para recepción, calidad, inventario y supervisión.',
    ifNot: 'Un solo usuario concentra riesgos y bloquea la jornada de prueba.',
    who: 'Consultor + administrador de la cooperativa.',
    duration: '2–4 horas',
    hours: 4,
  },
  configuracion: {
    why: 'Precios, catálogos y parámetros definen cómo se compra y liquida el café.',
    ifNot: 'Las recepciones fallan o liquidan con valores incorrectos.',
    who: 'Consultor funcional de compras.',
    duration: '2–3 horas',
    hours: 3,
  },
  compras: {
    why: 'El flujo recepción → pesaje → calidad → liquidación es el núcleo de la cooperativa.',
    ifNot: 'No hay operación diaria posible aunque el resto esté listo.',
    who: 'Consultor + líder de compras.',
    duration: '3–4 horas',
    hours: 4,
  },
  inventario: {
    why: 'Bodegas y artículos permiten registrar el café liquidado en existencias.',
    ifNot: 'La liquidación no cierra el ciclo y no hay stock confiable.',
    who: 'Consultor + responsable de bodega.',
    duration: '2–3 horas',
    hours: 3,
  },
  productores: {
    why: 'Toda compra se asocia a un productor del padrón.',
    ifNot: 'No se puede registrar recepción ni liquidar a terceros.',
    who: 'Equipo de campo / afiliaciones + consultor.',
    duration: '1–2 horas (mínimo un productor de prueba)',
    hours: 2,
  },
  workflow: {
    why: 'Los procesos de aprobación evitan errores y dan control gerencial.',
    ifNot: 'Decisiones críticas quedan sin rastro ni bandeja.',
    who: 'Consultor de procesos + supervisor.',
    duration: '2–3 horas',
    hours: 3,
  },
  documentos: {
    why: 'Evidencias y formatos respaldan liquidaciones y auditorías.',
    ifNot: 'Falta soporte documental en disputas o revisiones.',
    who: 'Consultor + área administrativa.',
    duration: '1 hora',
    hours: 1,
  },
  integraciones: {
    why: 'Balanzas y conectores reducen digitación y errores de pesaje.',
    ifNot: 'Se puede operar en manual, con mayor riesgo operativo.',
    who: 'Consultor técnico + compras.',
    duration: '1–2 horas (opcional para piloto)',
    hours: 2,
  },
  reportes: {
    why: 'Gerencia necesita indicadores desde el primer día de operación.',
    ifNot: 'La operación existe pero no hay visibilidad ejecutiva.',
    who: 'Consultor + gerencia.',
    duration: '1 hora',
    hours: 1,
  },
  prueba: {
    why: 'Valida el ciclo completo antes de abrir a toda la cooperativa.',
    ifNot: 'Se certifica a ciegas y aparecen fallos en producción.',
    who: 'Consultor + equipo operativo (compras, calidad, bodega).',
    duration: 'media jornada (3–4 horas)',
    hours: 4,
  },
  golive: {
    why: 'Formaliza que la empresa está lista para operar sin acompañamiento permanente.',
    ifNot: 'No hay evidencia de cierre de implementación.',
    who: 'Consultor + sponsor de la cooperativa.',
    duration: '30–60 minutos',
    hours: 1,
  },
};

const META: Record<
  DomainId,
  { label: string; href: string; responsible: string; inChain: boolean; dependencies: DomainId[] }
> = {
  empresa: {
    label: 'Empresa',
    href: '/implementacion/empresa',
    responsible: 'Consultor + representante legal',
    inChain: true,
    dependencies: [],
  },
  usuarios: {
    label: 'Usuarios',
    href: '/implementacion/usuarios',
    responsible: 'Consultor + administrador',
    inChain: true,
    dependencies: ['empresa'],
  },
  configuracion: {
    label: 'Configuración',
    href: '/implementacion/configuracion',
    responsible: 'Consultor funcional',
    inChain: true,
    dependencies: ['usuarios'],
  },
  compras: {
    label: 'Compras',
    href: '/implementacion/configuracion',
    responsible: 'Consultor + líder de compras',
    inChain: true,
    dependencies: ['configuracion'],
  },
  inventario: {
    label: 'Inventario',
    href: '/implementacion/configuracion',
    responsible: 'Consultor + bodega',
    inChain: true,
    dependencies: ['compras'],
  },
  productores: {
    label: 'Productores',
    href: '/productores',
    responsible: 'Afiliaciones + consultor',
    inChain: true,
    dependencies: ['inventario'],
  },
  workflow: {
    label: 'Procesos',
    href: '/implementacion/procesos',
    responsible: 'Consultor de procesos',
    inChain: true,
    dependencies: ['productores'],
  },
  documentos: {
    label: 'Documentos',
    href: '/implementacion/documentos',
    responsible: 'Administración',
    inChain: false,
    dependencies: ['configuracion'],
  },
  integraciones: {
    label: 'Integraciones',
    href: '/implementacion/integraciones',
    responsible: 'Consultor técnico',
    inChain: false,
    dependencies: ['compras'],
  },
  reportes: {
    label: 'Reportes',
    href: '/bi',
    responsible: 'Consultor + gerencia',
    inChain: false,
    dependencies: ['prueba'],
  },
  prueba: {
    label: 'Prueba operativa',
    href: '/implementacion/go-live',
    responsible: 'Consultor + equipo operativo',
    inChain: true,
    dependencies: ['workflow'],
  },
  golive: {
    label: 'Go Live',
    href: '/implementacion/go-live',
    responsible: 'Consultor + sponsor',
    inChain: true,
    dependencies: ['prueba'],
  },
};

function statusLabel(s: DomainStatus): string {
  switch (s) {
    case 'complete':
      return 'Configurada';
    case 'in_progress':
      return 'En progreso';
    case 'blocked':
      return 'Bloqueada';
    default:
      return 'No iniciada';
  }
}

export { statusLabel as implementationStatusLabel };

function emptySignals(): ImplementationSignals {
  return {
    coffeeOk: false,
    eimsOk: false,
    warehouses: 0,
    items: 0,
    movements: 0,
    users: 0,
    roles: 0,
    activeUsers: 0,
    requiredRolesMatched: 0,
    requiredRolesMissing: [],
    producers: 0,
    prices: 0,
    purchaseCenters: 0,
    configOk: false,
    workflows: 0,
    documents: 0,
    scales: 0,
    company: null,
    companyComplete: false,
    companyMissing: ['Razón social', 'NIT', 'Moneda', 'Zona horaria'],
    ticketsToday: 0,
    weighedToday: 0,
    qualityToday: 0,
    settlementsToday: 0,
    inventoryToday: 0,
    kgToday: 0,
    amountToday: 0,
    queueLength: 0,
  };
}

function touchLastModified() {
  try {
    localStorage.setItem(STORAGE_LAST, new Date().toISOString());
  } catch {
    /* ignore */
  }
}

function readLastModified(): string | null {
  try {
    return localStorage.getItem(STORAGE_LAST);
  } catch {
    return null;
  }
}

function deriveIntrinsic(
  id: DomainId,
  s: ImplementationSignals,
  certified: boolean,
): { status: DomainStatus; risk?: string; nextAction: string; evidence: string } {
  switch (id) {
    case 'empresa':
      if (s.companyComplete) {
        return {
          status: 'complete',
          nextAction: 'Revisar ficha de empresa',
          evidence: `${s.company?.legalName ?? 'Empresa'} · NIT ${s.company?.taxId ?? '—'} · ${s.company?.currency ?? '—'}`,
        };
      }
      if (s.company && (s.company.legalName || s.company.taxId)) {
        return {
          status: 'in_progress',
          risk: `Faltan: ${s.companyMissing.join(', ')}.`,
          nextAction: 'Completar razón social, NIT, moneda y zona horaria',
          evidence: 'Ficha parcial guardada',
        };
      }
      return {
        status: 'not_started',
        risk: 'Sin razón social ni NIT verificables.',
        nextAction: 'Completar ficha de empresa',
        evidence: 'Perfil empresarial vacío',
      };
    case 'usuarios': {
      const rolesOk = s.requiredRolesMissing.length === 0;
      const usersOk = s.activeUsers >= 3;
      if (rolesOk && usersOk) {
        return {
          status: 'complete',
          nextAction: 'Revisar asignación de roles',
          evidence: `${s.activeUsers} usuarios activos · ${s.requiredRolesMatched}/6 roles mínimos`,
        };
      }
      if (s.users > 0 || s.roles > 0) {
        const gaps: string[] = [];
        if (!rolesOk) gaps.push(`Roles faltantes: ${s.requiredRolesMissing.join(', ')}`);
        if (!usersOk) gaps.push(`Se requieren al menos 3 usuarios activos (hay ${s.activeUsers})`);
        return {
          status: 'in_progress',
          risk: gaps.join('. '),
          nextAction: 'Crear roles mínimos y usuarios operativos',
          evidence: `${s.users} usuarios · ${s.roles} roles · ${s.requiredRolesMatched}/6 mínimos`,
        };
      }
      return {
        status: 'not_started',
        risk: 'No hay usuarios ni roles del paquete cooperativa.',
        nextAction: 'Crear roles mínimos y usuarios',
        evidence: '0 usuarios',
      };
    }
    case 'configuracion':
      if (s.configOk && s.prices > 0 && s.purchaseCenters > 0) {
        return {
          status: 'complete',
          nextAction: 'Revisar parámetros de compras',
          evidence: `${s.prices} precios · ${s.purchaseCenters} centros · configuración activa`,
        };
      }
      if (s.configOk || s.coffeeOk) {
        return {
          status: 'in_progress',
          risk:
            s.prices === 0
              ? 'Faltan precios de compra.'
              : s.purchaseCenters === 0
                ? 'Falta al menos un centro de compra.'
                : 'Complete catálogos y parámetros.',
          nextAction: 'Completar asistente de configuración',
          evidence: s.configOk ? 'Centro de configuración disponible' : 'Compras alcanzable',
        };
      }
      return {
        status: 'not_started',
        nextAction: 'Abrir asistente de configuración',
        evidence: 'Sin configuración verificable',
      };
    case 'compras':
      if (s.coffeeOk && s.prices > 0 && s.purchaseCenters > 0) {
        return {
          status: 'complete',
          risk: s.scales === 0 ? 'Balanza opcional: puede operar pesaje manual.' : undefined,
          nextAction: 'Probar recepción',
          evidence: `Precios ${s.prices} · centros ${s.purchaseCenters}${s.scales ? ` · balanzas ${s.scales}` : ''}`,
        };
      }
      if (s.coffeeOk) {
        const gaps: string[] = [];
        if (s.prices === 0) gaps.push('precios');
        if (s.purchaseCenters === 0) gaps.push('centro de compra');
        return {
          status: 'in_progress',
          risk: `Falta: ${gaps.join(', ') || 'cerrar parámetros'}.`,
          nextAction: 'Completar precios y centro de compra',
          evidence: 'Centro de compras disponible',
        };
      }
      return {
        status: 'not_started',
        nextAction: 'Habilitar compras de café',
        evidence: 'Centro de compras no disponible',
      };
    case 'inventario':
      if (s.warehouses > 0 && s.items > 0) {
        return {
          status: 'complete',
          risk:
            s.movements === 0 && s.inventoryToday === 0
              ? 'Aún no hay movimientos; se validarán en la prueba operativa.'
              : undefined,
          nextAction: 'Revisar bodegas y artículos',
          evidence: `${s.warehouses} bodegas · ${s.items} artículos · ${s.movements} movimientos`,
        };
      }
      if (s.warehouses > 0 || s.items > 0) {
        return {
          status: 'in_progress',
          risk: s.warehouses === 0 ? 'Falta al menos una bodega.' : 'Falta al menos un artículo.',
          nextAction: s.warehouses === 0 ? 'Crear bodega' : 'Crear artículo',
          evidence: `${s.warehouses} bodegas · ${s.items} artículos`,
        };
      }
      return {
        status: 'not_started',
        risk: 'Sin bodegas ni artículos.',
        nextAction: 'Crear bodega y artículo',
        evidence: '0 bodegas · 0 artículos',
      };
    case 'productores':
      if (s.producers > 0) {
        return {
          status: 'complete',
          nextAction: 'Revisar padrón',
          evidence: `${s.producers} productores`,
        };
      }
      return {
        status: 'not_started',
        risk: 'Se necesita al menos un productor para la prueba.',
        nextAction: 'Registrar productor de prueba',
        evidence: '0 productores',
      };
    case 'workflow':
      if (s.workflows > 0) {
        return {
          status: 'complete',
          nextAction: 'Revisar bandeja de aprobaciones',
          evidence: `${s.workflows} procesos definidos`,
        };
      }
      return {
        status: 'not_started',
        risk: 'No hay procesos de aprobación publicados.',
        nextAction: 'Configurar o publicar un proceso',
        evidence: '0 procesos',
      };
    case 'documentos':
      if (s.coffeeOk) {
        return {
          status: 'complete',
          risk: 'Series documentales: No disponible en esta versión. Almacenamiento de evidencia operativo.',
          nextAction: 'Revisar documentos de evidencia',
          evidence:
            s.documents > 0
              ? `${s.documents} documentos · series N/D`
              : 'Almacenamiento disponible · series N/D en esta versión',
        };
      }
      return {
        status: 'not_started',
        nextAction: 'Abrir documentos',
        evidence: 'Sin verificación',
      };
    case 'integraciones':
      if (s.scales > 0) {
        return {
          status: 'complete',
          nextAction: 'Probar balanza',
          evidence: `${s.scales} balanzas`,
        };
      }
      return {
        status: 'in_progress',
        risk: 'Opcional: se puede pesar en manual. SMTP/conectores: No disponible en el paquete cooperativa.',
        nextAction: 'Registrar balanza (opcional)',
        evidence: '0 balanzas',
      };
    case 'reportes':
      if (s.coffeeOk) {
        return {
          status: 'complete',
          nextAction: 'Abrir analítica',
          evidence: 'Indicadores de compras disponibles',
        };
      }
      return {
        status: 'not_started',
        nextAction: 'Verificar reportes',
        evidence: 'Sin indicadores',
      };
    case 'prueba':
      if (s.inventoryToday > 0) {
        return {
          status: 'complete',
          nextAction: 'Pasar a certificación Go Live',
          evidence: `Inventario del día: ${s.inventoryToday} · tickets: ${s.ticketsToday}`,
        };
      }
      if (s.ticketsToday > 0 || s.weighedToday > 0 || s.qualityToday > 0 || s.settlementsToday > 0) {
        return {
          status: 'in_progress',
          risk: 'Complete el ciclo hasta inventario.',
          nextAction: 'Continuar jornada: recepción → pesaje → calidad → liquidación → inventario',
          evidence: `Tickets ${s.ticketsToday} · pesados ${s.weighedToday} · calidad ${s.qualityToday} · liquidaciones ${s.settlementsToday}`,
        };
      }
      return {
        status: 'not_started',
        risk: 'No hay evidencia de jornada piloto.',
        nextAction: 'Iniciar recepción de prueba',
        evidence: 'Sin tickets ni inventario del día',
      };
    case 'golive':
      if (certified) {
        return {
          status: 'complete',
          nextAction: 'Operar en Centro de Operación',
          evidence: 'Certificación registrada en la organización',
        };
      }
      if (s.inventoryToday > 0) {
        return {
          status: 'in_progress',
          nextAction: 'Revisar prerrequisitos y certificar',
          evidence: 'Prueba operativa con evidencia de inventario',
        };
      }
      return {
        status: 'not_started',
        nextAction: 'Completar prueba operativa antes de certificar',
        evidence: 'Sin certificación',
      };
    default:
      return { status: 'not_started', nextAction: 'Revisar', evidence: '—' };
  }
}
function buildDomains(signals: ImplementationSignals, certified: boolean): ImplementationDomain[] {
  const intrinsic = new Map<DomainId, ReturnType<typeof deriveIntrinsic>>();
  (Object.keys(META) as DomainId[]).forEach((id) => {
    intrinsic.set(id, deriveIntrinsic(id, signals, certified));
  });

  const byId = new Map<DomainId, ImplementationDomain>();
  const order: DomainId[] = [
    ...IMPLEMENTATION_CHAIN,
    ...(['documentos', 'integraciones', 'reportes'] as DomainId[]),
  ];

  for (const id of order) {
    const meta = META[id];
    const base = intrinsic.get(id)!;
    let status = base.status;
    let blockedBy: DomainId | undefined;
    let blockedReason: string | undefined;

    for (const dep of meta.dependencies) {
      const depDomain = byId.get(dep);
      const depStatus = depDomain?.status ?? intrinsic.get(dep)?.status;
      if (!depStatus) continue;
      if (meta.inChain) {
        if (depStatus !== 'complete') {
          status = 'blocked';
          blockedBy = dep;
          blockedReason = `Bloqueada: complete primero «${META[dep].label}» (${statusLabel(depStatus)}).`;
          break;
        }
      } else if (depStatus === 'not_started' || depStatus === 'blocked') {
        status = 'blocked';
        blockedBy = dep;
        blockedReason = `Depende de «${META[dep].label}».`;
        break;
      }
    }

    if (id === 'golive') {
      if (certified) {
        const chainIncomplete = IMPLEMENTATION_CHAIN.filter((d) => d !== 'golive').some((d) => {
          const st = byId.get(d)?.status;
          return st !== 'complete';
        });
        if (chainIncomplete) {
          status = 'blocked';
          blockedReason =
            'Hay etapas de la cadena sin completar; resuélvalas antes de considerar la empresa lista.';
        } else {
          status = 'complete';
        }
      } else if (status !== 'blocked') {
        const prueba = byId.get('prueba');
        if (prueba?.status === 'complete') {
          status = 'in_progress';
        } else if (prueba) {
          status = 'blocked';
          blockedBy = 'prueba';
          blockedReason = `Bloqueada: complete primero «Prueba operativa» (${statusLabel(prueba.status)}).`;
        }
      }
    }

    byId.set(id, {
      id,
      label: meta.label,
      href: meta.href,
      status,
      intrinsicStatus: base.status,
      risk: status === 'blocked' ? blockedReason : base.risk,
      dependencies: meta.dependencies,
      blockedBy,
      blockedReason,
      nextAction:
        status === 'blocked' && blockedBy
          ? `Desbloquear «${META[blockedBy].label}»`
          : base.nextAction,
      evidence: base.evidence,
      help: HELP[id],
      responsible: meta.responsible,
      inChain: meta.inChain,
    });
  }

  return order.map((id) => byId.get(id)!);
}

function buildConsultant(domains: ImplementationDomain[], lastModifiedAt: string | null): ConsultantView {
  const pending = domains.filter((d) => d.status !== 'complete');
  const blocked = domains.filter((d) => d.status === 'blocked');
  const complete = domains.filter((d) => d.status === 'complete');
  const hours = pending
    .filter((d) => d.status !== 'blocked' || d.inChain)
    .reduce((sum, d) => sum + (d.status === 'complete' ? 0 : d.help.hours), 0);

  const chainPending = IMPLEMENTATION_CHAIN.map((id) => domains.find((d) => d.id === id)!).filter(
    (d) => d && d.status !== 'complete',
  );

  const certifyBlockers: string[] = [];
  for (const id of IMPLEMENTATION_CHAIN) {
    if (id === 'golive') continue;
    const d = domains.find((x) => x.id === id);
    if (!d || d.status !== 'complete') {
      certifyBlockers.push(d ? `${d.label}: ${statusLabel(d.status)}` : id);
    }
  }

  const optionalRisks = domains.filter(
    (d) => !d.inChain && d.status !== 'complete' && d.risk,
  );

  const nextDomain =
    chainPending.find((d) => d.status === 'in_progress' || d.status === 'not_started') ??
    chainPending.find((d) => d.status === 'blocked') ??
    null;

  const alerts = [
    ...blocked.map((d) => ({
      id: `block-${d.id}`,
      title: `${d.label} bloqueada`,
      detail: d.blockedReason ?? d.risk ?? '',
      href: d.href,
    })),
    ...domains
      .filter((d) => d.status === 'in_progress' && d.risk)
      .map((d) => ({
        id: `risk-${d.id}`,
        title: `Riesgo en ${d.label}`,
        detail: d.risk!,
        href: d.href,
      })),
    ...optionalRisks.slice(0, 2).map((d) => ({
      id: `opt-${d.id}`,
      title: `${d.label} pendiente`,
      detail: d.risk ?? d.nextAction,
      href: d.href,
    })),
  ];

  let lastModifiedLabel = 'Sin actividad registrada en este navegador';
  if (lastModifiedAt) {
    try {
      lastModifiedLabel = new Date(lastModifiedAt).toLocaleString();
    } catch {
      lastModifiedLabel = lastModifiedAt;
    }
  }

  return {
    pendingCount: pending.length,
    blockedCount: blocked.length,
    completeCount: complete.length,
    estimatedHoursRemaining: hours,
    estimatedLabel: hours <= 0 ? 'Sin pendientes estimados' : `≈ ${hours} h restantes`,
    lastModifiedAt,
    lastModifiedLabel,
    alerts: alerts.slice(0, 8),
    nextDomain,
    canCertify: certifyBlockers.length === 0,
    certifyBlockers,
  };
}

export async function loadImplementationSignals(): Promise<ImplementationSignals> {
  const signals = emptySignals();

  const results = await Promise.allSettled([
    getCoffeeCenter(),
    getEimsCenter(),
    getIamCenter(),
    listUsers(),
    listRoles(),
    listProducers({ limit: 1, page: 1 }),
    listCoffeePrices(),
    getCoffeeConfigCenter(),
    listWorkflowDefinitions(),
    listCoffeeDocuments(),
    listCoffeeScales(),
    listCoffeePurchaseCenters(),
    listEimsMovements(),
    loadCompanyProfile(),
  ]);

  const coffee = results[0].status === 'fulfilled' ? results[0].value : null;
  if (coffee) {
    signals.coffeeOk = true;
    signals.ticketsToday = coffee.ticketsToday ?? 0;
    signals.weighedToday = coffee.weighedToday ?? 0;
    signals.qualityToday = coffee.qualityToday ?? 0;
    signals.settlementsToday = coffee.settlementsToday ?? 0;
    signals.inventoryToday = coffee.inventoryToday ?? 0;
    signals.kgToday = coffee.kgToday ?? 0;
    signals.amountToday = coffee.amountToday ?? 0;
    signals.queueLength = coffee.queueLength ?? 0;
  }

  const eims = results[1].status === 'fulfilled' ? (results[1].value as Record<string, unknown>) : null;
  if (eims) {
    signals.eimsOk = true;
    signals.warehouses = Number(eims.warehousesCount ?? 0);
    signals.items = Number(eims.itemsCount ?? 0);
  }

  const iam = results[2].status === 'fulfilled' ? results[2].value : null;
  if (iam) {
    signals.users = Math.max(signals.users, iam.userCount ?? 0);
    signals.roles = Math.max(signals.roles, iam.roleCount ?? 0);
  }

  if (results[3].status === 'fulfilled') {
    const users = results[3].value;
    signals.users = Math.max(signals.users, users.length);
    signals.activeUsers = users.filter((u) => u.status === 'active' && !u.lockedAt).length;
  }
  if (results[4].status === 'fulfilled') {
    const roles = results[4].value;
    signals.roles = Math.max(signals.roles, roles.length);
    const matched = matchRequiredRoles(roles);
    signals.requiredRolesMatched = matched.matched.length;
    signals.requiredRolesMissing = matched.missing;
  }
  if (results[5].status === 'fulfilled') {
    signals.producers = results[5].value.pagination?.total ?? results[5].value.items?.length ?? 0;
  }
  if (results[6].status === 'fulfilled') {
    signals.prices = Array.isArray(results[6].value) ? results[6].value.length : 0;
  }
  if (results[7].status === 'fulfilled') {
    signals.configOk = true;
    const dash = results[7].value as Record<string, unknown>;
    if (typeof dash.purchaseCenters === 'number') {
      signals.purchaseCenters = Math.max(signals.purchaseCenters, dash.purchaseCenters);
    }
  }
  if (results[8].status === 'fulfilled') {
    signals.workflows = Array.isArray(results[8].value) ? results[8].value.length : 0;
  }
  if (results[9].status === 'fulfilled') {
    signals.documents = Array.isArray(results[9].value) ? results[9].value.length : 0;
  }
  if (results[10].status === 'fulfilled') {
    const scales = results[10].value;
    signals.scales = Array.isArray(scales) ? scales.length : 0;
  }
  if (results[11].status === 'fulfilled') {
    const centers = results[11].value;
    if (Array.isArray(centers)) {
      signals.purchaseCenters = Math.max(signals.purchaseCenters, centers.length);
    }
  }
  if (results[12].status === 'fulfilled') {
    const movs = results[12].value;
    signals.movements = Array.isArray(movs) ? movs.length : 0;
  }
  if (results[13].status === 'fulfilled') {
    signals.company = results[13].value;
    signals.companyComplete = companyRequiredComplete(signals.company);
    signals.companyMissing = companyMissingFields(signals.company);
  }

  return signals;
}

export function buildImplementationSnapshot(
  signals: ImplementationSignals,
  loaded: boolean,
  goLive: GoLiveRecord = { certified: false, at: null },
): ImplementationSnapshot {
  const { certified, at } = goLive;
  const lastModifiedAt = at ?? readLastModified();
  const domains = loaded ? buildDomains(signals, certified) : [];
  const chain = domains.filter((d) => d.inChain);
  const supporting = domains.filter((d) => !d.inChain);
  const consultant = buildConsultant(domains, lastModifiedAt);

  return {
    loaded,
    signals,
    domains,
    chain,
    supporting,
    consultant,
    certified,
    certifiedAt: at,
  };
}

/** Persiste certificación a nivel organización (API parámetros café). */
export async function certifyGoLive(
  note: string,
  consultant: ConsultantView,
): Promise<{ ok: boolean; error?: string }> {
  if (!consultant.canCertify) {
    return {
      ok: false,
      error: `No se puede certificar. Bloqueos: ${consultant.certifyBlockers.join('; ')}`,
    };
  }
  const at = new Date().toISOString();
  const record: GoLiveRecord = { certified: true, at, note };
  try {
    await upsertCoffeeParameter({
      parameterKey: GOLIVE_PARAM_KEY,
      name: 'Certificación Go Live',
      scopeType: 'organization',
      value: { certified: true, at, note },
      dataType: 'json',
      reason: note || 'Certificación Go Live',
    });
    writeCertifiedLocal(record);
    touchLastModified();
    return { ok: true };
  } catch {
    return {
      ok: false,
      error:
        'No se pudo guardar la certificación en el servidor. Se requiere permiso de configuración de compras (coffee:config:manage).',
    };
  }
}

export async function revokeGoLiveCertification(): Promise<{ ok: boolean; error?: string }> {
  const at = new Date().toISOString();
  try {
    await upsertCoffeeParameter({
      parameterKey: GOLIVE_PARAM_KEY,
      name: 'Certificación Go Live',
      scopeType: 'organization',
      value: { certified: false, at, note: 'Revocada' },
      dataType: 'json',
      reason: 'Revocación de certificación Go Live',
    });
    writeCertifiedLocal({ certified: false, at: null });
    touchLastModified();
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: 'No se pudo revocar en el servidor. Se requiere coffee:config:manage.',
    };
  }
}

export function useImplementationEngineState(): ImplementationSnapshot & { refresh: () => void } {
  const [signals, setSignals] = useState<ImplementationSignals>(emptySignals);
  const [goLive, setGoLive] = useState<GoLiveRecord>({ certified: false, at: null });
  const [loaded, setLoaded] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    Promise.all([loadImplementationSignals(), loadGoLiveRecord()]).then(([s, cert]) => {
      if (cancelled) return;
      setSignals(s);
      setGoLive(cert);
      touchLastModified();
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const snapshot = useMemo(
    () => buildImplementationSnapshot(signals, loaded, goLive),
    [signals, loaded, goLive, tick],
  );

  return {
    ...snapshot,
    refresh: () => setTick((t) => t + 1),
  };
}

const ImplementationEngineContext = createContext<
  (ImplementationSnapshot & { refresh: () => void }) | null
>(null);

/** PM-36 — Una sola carga de señales por árbol EIC (evita 2×14 APIs por página). */
export function ImplementationEngineProvider({ children }: { children: ReactNode }) {
  const value = useImplementationEngineState();
  return createElement(ImplementationEngineContext.Provider, { value }, children);
}

export function useImplementationEngine(): ImplementationSnapshot & { refresh: () => void } {
  const ctx = useContext(ImplementationEngineContext);
  if (!ctx) {
    throw new Error('useImplementationEngine must be used within ImplementationEngineProvider');
  }
  return ctx;
}
