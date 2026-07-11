/**
 * PM-28 — Búsqueda enterprise sobre APIs existentes (sin backend nuevo).
 * Productores, fincas, lotes, tickets de compra y trámites recientes.
 */

import { listProducers } from '../api/prm';
import { listFarms } from '../api/ftip';
import { listLots } from '../api/fmdt';
import { listCoffeeTickets } from '../api/coffee';

export type EnterpriseSearchKind =
  | 'producer'
  | 'farm'
  | 'lot'
  | 'document'
  | 'purchase'
  | 'process'
  | 'report'
  | 'config'
  | 'person';

export interface EnterpriseSearchHit {
  id: string;
  kind: EnterpriseSearchKind;
  kindLabel: string;
  label: string;
  subtitle?: string;
  to: string;
  icon: string;
}

const KIND_META: Record<EnterpriseSearchKind, { label: string; icon: string }> = {
  producer: { label: 'Productor', icon: '👤' },
  farm: { label: 'Finca', icon: '🌿' },
  lot: { label: 'Lote', icon: '📍' },
  document: { label: 'Documento', icon: '📄' },
  purchase: { label: 'Compra', icon: '☕' },
  process: { label: 'Proceso', icon: '⚙' },
  report: { label: 'Reporte', icon: '📊' },
  config: { label: 'Configuración', icon: '⚙' },
  person: { label: 'Persona', icon: '👤' },
};

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object' && Array.isArray((value as { items?: unknown }).items)) {
    return (value as { items: T[] }).items;
  }
  return [];
}

/** Busca entidades en vivo con APIs ya existentes. Mínimo 2 caracteres. */
export async function searchEnterpriseEntities(
  query: string,
  opts?: { hasPermission?: (p: string) => boolean },
): Promise<EnterpriseSearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const can = opts?.hasPermission ?? (() => true);
  const hits: EnterpriseSearchHit[] = [];

  const tasks: Array<Promise<void>> = [];

  if (can('producer:read')) {
    tasks.push(
      listProducers({ search: q, limit: 5 })
        .then((res) => {
          for (const p of res.items ?? []) {
            hits.push({
              id: `producer-${p.id}`,
              kind: 'producer',
              kindLabel: KIND_META.producer.label,
              label: p.legalName || p.commercialName || p.producerNumber,
              subtitle: p.documentNumber ? `Doc. ${p.documentNumber}` : p.producerNumber,
              to: `/productores/${p.id}`,
              icon: KIND_META.producer.icon,
            });
          }
        })
        .catch(() => undefined),
    );
  }

  if (can('farm:read')) {
    tasks.push(
      listFarms({ search: q, limit: 5 })
        .then((res) => {
          for (const f of res.items ?? []) {
            hits.push({
              id: `farm-${f.id}`,
              kind: 'farm',
              kindLabel: KIND_META.farm.label,
              label: f.farmName || f.farmCode,
              subtitle: f.farmCode,
              to: `/fincas/${f.id}`,
              icon: KIND_META.farm.icon,
            });
          }
        })
        .catch(() => undefined),
    );
  }

  if (can('lot:read')) {
    tasks.push(
      listLots({ search: q, limit: 5 })
        .then((res) => {
          for (const lot of res.items ?? []) {
            hits.push({
              id: `lot-${lot.id}`,
              kind: 'lot',
              kindLabel: KIND_META.lot.label,
              label: lot.lotName || lot.lotCode,
              subtitle: lot.farmUnit?.farmName ?? lot.lotCode,
              to: `/lotes/${lot.id}`,
              icon: KIND_META.lot.icon,
            });
          }
        })
        .catch(() => undefined),
    );
  }

  if (can('coffee:read')) {
    tasks.push(
      listCoffeeTickets()
        .then((tickets) => {
          const lower = q.toLowerCase();
          const matched = asArray<{
            id?: string;
            ticketKey?: string;
            producerName?: string;
            status?: string;
          }>(tickets)
            .filter((t) => {
              const hay = `${t.ticketKey ?? ''} ${t.producerName ?? ''} ${t.status ?? ''}`.toLowerCase();
              return hay.includes(lower);
            })
            .slice(0, 5);
          for (const t of matched) {
            const key = t.ticketKey ?? t.id ?? '';
            if (!key) continue;
            hits.push({
              id: `purchase-${key}`,
              kind: 'purchase',
              kindLabel: KIND_META.purchase.label,
              label: t.ticketKey ?? key,
              subtitle: t.producerName ?? 'Compra de café',
              to: `/compras?ticket=${encodeURIComponent(String(t.ticketKey ?? key))}`,
              icon: KIND_META.purchase.icon,
            });
          }
        })
        .catch(() => undefined),
    );
  }

  await Promise.all(tasks);
  return hits.slice(0, 24);
}

export function groupSearchHits(hits: EnterpriseSearchHit[]): Map<string, EnterpriseSearchHit[]> {
  const map = new Map<string, EnterpriseSearchHit[]>();
  for (const hit of hits) {
    const list = map.get(hit.kindLabel) ?? [];
    list.push(hit);
    map.set(hit.kindLabel, list);
  }
  return map;
}
