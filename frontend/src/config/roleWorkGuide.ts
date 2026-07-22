/**
 * PM-47 — Guía de trabajo por rol (solo frontend, datos existentes).
 */

import type { WorkspaceRole } from './workspaceRoles';
import type { WorkspaceData } from '../hooks/useWorkspaceData';

export interface RoleWorkGuide {
  /** ¿Qué hago aquí? */
  what: string;
  /** ¿Qué sigue? */
  next: string;
  /** ¿Qué falta? */
  missing: string;
  /** ¿Qué riesgo tengo? */
  risk: string;
  /** CTA principal del día */
  primary: { label: string; to: string };
}

export function buildRoleWorkGuide(role: WorkspaceRole, data: WorkspaceData): RoleWorkGuide {
  const queue = data.center?.queueLength ?? 0;
  const alerts = data.alerts.length;
  const overdue = data.wfDash?.summary.overdueProcesses ?? 0;

  if (role === 'executive' || role === 'consulta') {
    return {
      what: 'Revisar indicadores, alertas y riesgos — sin registrar operaciones.',
      next: alerts > 0 ? 'Abra las alertas abiertas y decida si escalar.' : 'Consulte reportes gerenciales o BI.',
      missing: overdue > 0 ? `${overdue} trámites vencidos requieren atención.` : 'Sin pendientes críticos detectados.',
      risk: queue > 5 ? `Cola operativa elevada (${queue}).` : alerts > 0 ? `${alerts} alertas abiertas.` : 'Sin riesgos urgentes.',
      primary: { label: 'Ver reportes', to: '/bi' },
    };
  }

  if (role === 'admin') {
    return {
      what: 'Completar puesta en marcha: empresa, usuarios, roles y Go Live.',
      next: data.certified ? 'Revisar estado de preparación.' : 'Continuar checklist de implementación.',
      missing: data.certified ? 'Nada crítico pendiente.' : 'Falta certificar Go Live.',
      risk: alerts > 0 ? `${alerts} alertas abiertas.` : 'Sin alertas.',
      primary: {
        label: data.certified ? 'Preparación' : 'Implementación',
        to: data.certified ? '/implementacion/estado' : '/implementacion',
      },
    };
  }

  if (role === 'quality') {
    return {
      what: 'Evaluar muestras y liberar tickets de calidad.',
      next: data.quality.length > 0 ? `Atender ${data.quality.length} evaluaciones pendientes.` : 'Sin cola de calidad; revise indicadores.',
      missing: data.quality.length > 0 ? 'Evaluaciones sin registrar.' : 'Calidad al día.',
      risk: alerts > 0 ? `${alerts} alertas.` : 'Sin alertas de calidad.',
      primary: { label: 'Abrir calidad', to: '/compras/calidad' },
    };
  }

  if (role === 'inventory') {
    return {
      what: 'Controlar entradas, movimientos, stock bajo y kardex.',
      next:
        data.lowStock.length > 0
          ? `Revisar ${data.lowStock.length} artículos con stock bajo.`
          : 'Registrar movimientos o consultar kardex.',
      missing: data.reservations.length > 0 ? `${data.reservations.length} reservas activas.` : 'Sin faltantes críticos.',
      risk: data.lowStock.length > 0 ? 'Riesgo de quiebre de stock.' : 'Inventario estable.',
      primary: { label: 'Movimientos', to: '/inventario/movimientos' },
    };
  }

  if (role === 'field') {
    return {
      what: 'Atender visitas, formularios y pendientes de campo.',
      next: data.inbox.length > 0 ? 'Resolver aprobaciones de campo.' : 'Abrir formularios o productores.',
      missing: data.inbox.length > 0 ? `${data.inbox.length} pendientes en bandeja.` : 'Sin trámites pendientes.',
      risk: alerts > 0 ? `${alerts} alertas.` : 'Sin alertas.',
      primary: { label: 'Formularios', to: '/formularios' },
    };
  }

  // purchasing / supervisor
  return {
    what: 'Atender recepciones, pesajes, calidad y liquidaciones del día.',
    next:
      queue > 0
        ? `Hay ${queue} en cola: llame el siguiente turno.`
        : data.weighing.length > 0
          ? `Completar ${data.weighing.length} pesajes.`
          : data.settlements.length > 0
            ? `Liquidar ${data.settlements.length} tickets.`
            : 'Registrar una nueva recepción si llega café.',
    missing:
      [
        queue > 0 ? `${queue} en cola` : null,
        data.weighing.length ? `${data.weighing.length} pesajes` : null,
        data.settlements.length ? `${data.settlements.length} liquidaciones` : null,
      ]
        .filter(Boolean)
        .join(' · ') || 'Sin pendientes operativos.',
    risk: queue > 8 ? 'Cola saturada: priorice llamado.' : alerts > 0 ? `${alerts} alertas.` : 'Operación estable.',
    primary:
      queue > 0
        ? { label: 'Abrir cola', to: '/compras/cola' }
        : data.weighing.length > 0
          ? { label: 'Ir a pesaje', to: '/compras/pesaje' }
          : data.settlements.length > 0
            ? { label: 'Liquidaciones', to: '/compras/liquidaciones' }
            : { label: 'Nueva recepción', to: '/compras/recepcion' },
  };
}
