import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  getEscmOrderTracking,
  reserveEscmOrder,
  transitionEscmOrder,
  validateEscmOrder,
  createEscmDispatch,
} from '../api/escm';

export function EscmOrderDetailPage() {
  const { orderKey = '' } = useParams();
  const [tracking, setTracking] = useState<Record<string, unknown> | null>(null);

  const reload = () => getEscmOrderTracking(orderKey).then(setTracking);
  useEffect(() => {
    if (orderKey) reload();
  }, [orderKey]);

  const order = (tracking?.order ?? {}) as Record<string, unknown>;
  const timeline = (tracking?.timeline ?? []) as Array<Record<string, unknown>>;
  const reservations = (tracking?.reservations ?? []) as Array<Record<string, unknown>>;

  return (
    <>
      <Header
        title={`Pedido ${orderKey}`}
        subtitle="Seguimiento en tiempo real"
        actions={<Link to="/comercial/pedidos" className="btn">Centro pedidos</Link>}
      />
      <section className="panel">
        <p><strong>Estado:</strong> {String(order.status)}</p>
        <p><strong>Cliente:</strong> {String(order.customerKey)}</p>
        <p><strong>Total:</strong> {Number(order.totalAmount ?? 0).toLocaleString()}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <button className="btn" onClick={() => createEscmDispatch(orderKey).then(reload)}>Crear despacho</button>
          <button className="btn" onClick={() => validateEscmOrder(orderKey).then(reload)}>Validar</button>
          <button className="btn" onClick={() => reserveEscmOrder(orderKey, { forcePartial: true }).then(reload)}>Reservar</button>
          <button className="btn" onClick={() => transitionEscmOrder(orderKey, 'in_preparation').then(reload)}>Preparar</button>
          <button className="btn" onClick={() => transitionEscmOrder(orderKey, 'ready_for_dispatch').then(reload)}>Listo despacho</button>
          <button className="btn" onClick={() => transitionEscmOrder(orderKey, 'dispatched').then(reload)}>Despachar</button>
          <button className="btn" onClick={() => transitionEscmOrder(orderKey, 'delivered').then(reload)}>Entregar</button>
        </div>
      </section>
      <section className="panel">
        <h3>Historial de estados</h3>
        <ul>
          {timeline.map((t) => (
            <li key={String(t.id)}>
              {String(t.fromStatus)} → {String(t.toStatus)} · {new Date(String(t.createdAt)).toLocaleString()}
              {t.reason ? ` — ${String(t.reason)}` : ''}
            </li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <h3>Reservas</h3>
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Artículo</th><th>Cantidad</th><th>Estado</th></tr></thead>
          <tbody>
            {reservations.map((r) => (
              <tr key={String(r.reservationKey)}>
                <td>{String(r.reservationKey)}</td>
                <td>{String(r.itemKey)}</td>
                <td>{Number(r.quantity)}</td>
                <td>{String(r.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
