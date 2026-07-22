import { useEffect, useState } from 'react';
import { DomainLanding } from '../components/landing/DomainLanding';
import { LoadingState } from '../components/ux/LoadingState';
import {
  getCoffeeCenter,
  listQualityPending,
  listSettlementPending,
  listWeighingPending,
  type CoffeeDashboard,
  type CoffeeTicket,
} from '../api/coffee';
import { useOnEntityUpdated } from '../lib/entitySync';
import { labelTicketStatus } from '../lib/productLabels';

/**
 * PM-43 — Centro de Compras (landing). Sin tablas; el proceso está en rutas hijas.
 */
export function CoffeeCenterPage() {
  const [dash, setDash] = useState<CoffeeDashboard | null>(null);
  const [quality, setQuality] = useState<CoffeeTicket[]>([]);
  const [weighing, setWeighing] = useState<CoffeeTicket[]>([]);
  const [settlements, setSettlements] = useState<CoffeeTicket[]>([]);

  const reload = () => {
    getCoffeeCenter().then(setDash).catch(() => setDash(null));
    listQualityPending().then((r) => setQuality(Array.isArray(r) ? r : [])).catch(() => setQuality([]));
    listWeighingPending().then((r) => setWeighing(Array.isArray(r) ? r : [])).catch(() => setWeighing([]));
    listSettlementPending().then((r) => setSettlements(Array.isArray(r) ? r : [])).catch(() => setSettlements([]));
  };

  useEffect(() => {
    reload();
  }, []);

  useOnEntityUpdated(() => reload(), ['purchase']);

  if (!dash) return <LoadingState variant="page" message="Cargando centro de compras…" />;

  const queue = dash.queue ?? [];

  return (
    <DomainLanding
      title="Centro de Compras"
      subtitle="Recepción → pesaje → calidad → liquidación"
      description="Resumen del dominio. Entre a cada proceso solo cuando necesite operar."
      metrics={[
        { label: 'Tickets hoy', value: dash.ticketsToday, tone: 'coffee' },
        { label: 'En cola', value: dash.queueLength },
        { label: 'Pesados', value: dash.weighedToday },
        { label: 'Calidad', value: dash.qualityToday, tone: 'green' },
        { label: 'Liquidaciones', value: dash.settlementsToday },
        { label: 'Kg hoy', value: dash.kgToday.toFixed(0), tone: 'teal' },
      ]}
      quickActions={[
        { label: 'Nueva recepción', to: '/compras/recepcion', primary: true },
        { label: 'Cola de espera', to: '/compras/cola' },
      ]}
      modules={[
        {
          id: 'rec',
          title: 'Recepciones',
          description: 'Registrar llegadas y turnos',
          to: '/compras/recepcion',
          icon: '📥',
          badge: dash.queueLength || undefined,
        },
        {
          id: 'pes',
          title: 'Pesajes',
          description: 'Balanza y confirmación de pesos',
          to: '/compras/pesaje',
          icon: '⚖',
          badge: weighing.length || undefined,
        },
        {
          id: 'cal',
          title: 'Calidad',
          description: 'Muestras y evaluación',
          to: '/compras/calidad',
          icon: '✓',
          badge: quality.length || undefined,
        },
        {
          id: 'liq',
          title: 'Liquidaciones',
          description: 'Cierre y pago al productor',
          to: '/compras/liquidaciones',
          icon: '💵',
          badge: settlements.length || undefined,
        },
        {
          id: 'dia',
          title: 'Compras del día',
          description: 'Vista operativa del día',
          to: '/compras/cola',
          icon: '🛒',
        },
        {
          id: 'inv',
          title: 'Café en bodega',
          description: 'Inventario del flujo de compra',
          to: '/compras/inventario',
          icon: '📦',
        },
      ]}
      pending={[
        ...(dash.queueLength
          ? [{ id: 'q', label: 'Tickets en cola', meta: String(dash.queueLength), to: '/compras/cola' }]
          : []),
        ...(weighing.length
          ? [{ id: 'w', label: 'Pesajes pendientes', meta: String(weighing.length), to: '/compras/pesaje' }]
          : []),
        ...(quality.length
          ? [{ id: 'c', label: 'Calidad pendiente', meta: String(quality.length), to: '/compras/calidad' }]
          : []),
        ...(settlements.length
          ? [{ id: 's', label: 'Liquidaciones pendientes', meta: String(settlements.length), to: '/compras/liquidaciones' }]
          : []),
      ]}
      activity={queue.slice(0, 6).map((t) => ({
        id: t.id || t.ticketKey,
        label: t.producerName || t.ticketKey,
        meta: labelTicketStatus(t.status),
        to: `/compras/pesaje?ticket=${encodeURIComponent(t.ticketKey)}`,
      }))}
      activityTitle="Actividad en cola"
    />
  );
}
