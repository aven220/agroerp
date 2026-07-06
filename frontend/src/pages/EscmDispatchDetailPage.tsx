import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEscmDispatchTracking, registerEscmDelivery } from '../api/escm';

export function EscmDispatchDetailPage() {
  const { dispatchKey = '' } = useParams();
  const [tracking, setTracking] = useState<Record<string, unknown> | null>(null);

  const reload = () => getEscmDispatchTracking(dispatchKey).then(setTracking);
  useEffect(() => {
    if (dispatchKey) reload();
  }, [dispatchKey]);

  const dispatch = (tracking?.dispatch ?? {}) as Record<string, unknown>;
  const lines = (dispatch.lines ?? []) as Array<Record<string, unknown>>;

  return (
    <>
      <Header title={`Despacho ${dispatchKey}`} subtitle="Seguimiento en tiempo real" actions={<Link to="/comercial/despachos" className="btn">Despachos</Link>} />
      <section className="panel">
        <p><strong>Estado:</strong> {String(dispatch.status)}</p>
        <p><strong>Pedido:</strong> {String(dispatch.orderKey)}</p>
        <p><strong>Cliente:</strong> {String(dispatch.customerKey)}</p>
        <button
          className="btn"
          onClick={() =>
            registerEscmDelivery(dispatchKey, {
              lines: lines.map((l) => ({ itemKey: String(l.itemKey), quantity: Number(l.quantity) })),
              signatureUrl: 'web://signature',
            }).then(reload)
          }
        >
          Registrar entrega
        </button>
      </section>
      <section className="panel">
        <h3>Líneas</h3>
        <table className="data-table">
          <thead><tr><th>Artículo</th><th>Cantidad</th><th>Pickeado</th><th>Empacado</th><th>Despachado</th></tr></thead>
          <tbody>
            {lines.map((l) => (
              <tr key={String(l.lineKey)}>
                <td>{String(l.itemKey)}</td>
                <td>{Number(l.quantity)}</td>
                <td>{Number(l.pickedQty ?? 0)}</td>
                <td>{Number(l.packedQty ?? 0)}</td>
                <td>{Number(l.shippedQty ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
