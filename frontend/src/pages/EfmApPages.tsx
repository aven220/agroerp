import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';

export function EfmApCenterPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const reload = () => import('../api/efm-ap').then(({ getEfmApCenter }) =>
    getEfmApCenter().then(setCenter).catch((e) => setError(e.message)));
  useEffect(() => { reload(); }, []);

  const aging = (center?.aging ?? []) as Array<{ label: string; amount: number; count: number }>;

  return (
    <>
      <Header
        title="Cuentas por Pagar — CxP"
        subtitle="Obligaciones, pagos, programación y proveedores"
        actions={
          <div className="row-actions">
            <button className="btn" onClick={() => import('../api/efm-ap').then(({ seedEfmAp }) => seedEfmAp().then(reload))}>Cargar configuración inicial</button>
            <Link to="/finanzas/cxp/facturas" className="btn">Facturas</Link>
            <Link to="/finanzas/cxp/pagos" className="btn">Pagos</Link>
            <Link to="/finanzas/cxp/programacion" className="btn">Programación</Link>
            <Link to="/finanzas/cxp/aprobaciones" className="btn">Aprobaciones</Link>
            <Link to="/finanzas/cxp/proveedores" className="btn">Proveedores</Link>
            <Link to="/finanzas" className="btn">EFM</Link>
          </div>
        }
      />
      {error ? <section className="panel error-panel">{error}</section> : null}
      {center ? (
        <>
          <div className="kpi-grid kpi-grid-lg">
            <div className="kpi-card kpi-card-primary"><span className="kpi-label">Proveedores</span><span className="kpi-value">{String(center.supplierCount ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Facturas</span><span className="kpi-value">{String(center.invoiceCount ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Obligaciones abiertas</span><span className="kpi-value">{String(center.openPayables ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Vencidas</span><span className="kpi-value">{String(center.overduePayables ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Saldo pendiente</span><span className="kpi-value">{Number(center.totalOpenBalance ?? 0).toLocaleString()}</span></div>
            <div className="kpi-card"><span className="kpi-label">Anticipos</span><span className="kpi-value">{Number(center.advanceBalance ?? 0).toLocaleString()}</span></div>
            <div className="kpi-card"><span className="kpi-label">Pagos procesados</span><span className="kpi-value">{String(center.paymentCount ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Pend. aprobación</span><span className="kpi-value">{String(center.pendingApprovals ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Programados</span><span className="kpi-value">{String(center.scheduledCount ?? 0)}</span></div>
          </div>
          <section className="panel">
            <h3>Antigüedad de obligaciones</h3>
            <table className="data-table">
              <thead><tr><th>Tramo</th><th>Monto</th><th>Documentos</th></tr></thead>
              <tbody>
                {aging.map((b) => (
                  <tr key={b.label}><td>{b.label}</td><td>{b.amount.toLocaleString()}</td><td>{b.count}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </>
  );
}

export function EfmApInvoicesPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [status, setStatus] = useState('');
  useEffect(() => {
    import('../api/efm-ap').then(({ listEfmApInvoices }) =>
      listEfmApInvoices(status ? { status } : undefined).then((r) => setRows(r as Array<Record<string, unknown>>)));
  }, [status]);
  return (
    <>
      <Header title="Gestor de facturas proveedor" subtitle="Registro, validación y obligaciones" actions={
        <div className="row-actions">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="btn">
            <option value="">Todos</option>
            <option value="posted">Contabilizadas</option>
            <option value="validation_exception">Excepción</option>
            <option value="partially_paid">Parcial</option>
            <option value="paid">Pagadas</option>
          </select>
          <Link to="/finanzas/cxp" className="btn">CxP</Link>
        </div>
      } />
      <table className="data-table panel">
        <thead><tr><th>Factura</th><th>Proveedor</th><th>Núm. proveedor</th><th>Estado</th><th>Total</th><th>Saldo</th><th>Vence</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r.invoiceKey)}>
              <td>{String(r.invoiceKey)}</td>
              <td>{String(r.supplierKey)}</td>
              <td>{String(r.supplierInvoiceNumber ?? '')}</td>
              <td>{String(r.status)}</td>
              <td>{Number(r.totalAmount ?? 0).toLocaleString()}</td>
              <td>{Number(r.balanceAmount ?? 0).toLocaleString()}</td>
              <td>{String(r.dueDate).slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function EfmApPaymentsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/efm-ap').then(({ listEfmApPayments }) =>
      listEfmApPayments().then((r) => setRows(r as Array<Record<string, unknown>>)));
  }, []);
  return (
    <>
      <Header title="Pagos a proveedores" subtitle="Parciales, totales y anticipos" actions={<Link to="/finanzas/cxp" className="btn">CxP</Link>} />
      <table className="data-table panel">
        <thead><tr><th>Pago</th><th>Proveedor</th><th>Estado</th><th>Monto</th><th>Programado</th><th>Procesado</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r.paymentKey)}>
              <td>{String(r.paymentKey)}</td>
              <td>{String(r.supplierKey)}</td>
              <td>{String(r.status)}</td>
              <td>{Number(r.amount ?? 0).toLocaleString()}</td>
              <td>{r.scheduledDate ? String(r.scheduledDate).slice(0, 10) : '—'}</td>
              <td>{r.processedAt ? String(r.processedAt).slice(0, 10) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function EfmApSchedulePage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/efm-ap').then(({ listEfmApSchedule }) =>
      listEfmApSchedule({ status: 'scheduled' }).then((r) => setRows(r as Array<Record<string, unknown>>)));
  }, []);
  return (
    <>
      <Header title="Programador de pagos" subtitle="Calendario, prioridades y lotes" actions={<Link to="/finanzas/cxp" className="btn">CxP</Link>} />
      <table className="data-table panel">
        <thead><tr><th>Programación</th><th>Proveedor</th><th>Fecha</th><th>Prioridad</th><th>Monto</th><th>Desc. pronto pago</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r.scheduleKey)}>
              <td>{String(r.scheduleKey)}</td>
              <td>{String(r.supplierKey)}</td>
              <td>{String(r.scheduledDate).slice(0, 10)}</td>
              <td>{String(r.priority)}</td>
              <td>{Number(r.amount ?? 0).toLocaleString()}</td>
              <td>{Number(r.earlyDiscountAmount ?? 0).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function EfmApApprovalsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const reload = () => import('../api/efm-ap').then(({ listEfmApPendingApprovals }) =>
    listEfmApPendingApprovals().then((r) => setRows(r as Array<Record<string, unknown>>)));
  useEffect(() => { reload(); }, []);
  return (
    <>
      <Header title="Panel de aprobaciones CxP" subtitle="Flujos multinivel y delegaciones" actions={<Link to="/finanzas/cxp" className="btn">CxP</Link>} />
      <table className="data-table panel">
        <thead><tr><th>Pago</th><th>Proveedor</th><th>Monto</th><th>Estado</th><th>Acción</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r.paymentKey)}>
              <td>{String(r.paymentKey)}</td>
              <td>{String(r.supplierKey)}</td>
              <td>{Number(r.amount ?? 0).toLocaleString()}</td>
              <td>{String(r.status)}</td>
              <td>
                <button className="btn" onClick={() => import('../api/efm-ap').then(({ approveEfmApPayment }) =>
                  approveEfmApPayment(String(r.paymentKey)).then(reload))}>Aprobar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function EfmApSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Array<Record<string, unknown>>>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    import('../api/efm-ap').then(({ listEfmApSuppliers }) =>
      listEfmApSuppliers().then((r) => setSuppliers(r as Array<Record<string, unknown>>)));
  }, []);
  return (
    <>
      <Header title="Consulta de proveedores" subtitle="Estados de cuenta e historial financiero" actions={<Link to="/finanzas/cxp" className="btn">CxP</Link>} />
      <div className="panel" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
        <table className="data-table">
          <thead><tr><th>Proveedor</th><th>Nombre</th></tr></thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={String(s.supplierKey)} style={{ cursor: 'pointer' }} onClick={() => {
                import('../api/efm-ap').then(({ getEfmApSupplierStatement }) =>
                  getEfmApSupplierStatement(String(s.supplierKey)).then(setSelected as never));
              }}>
                <td>{String(s.supplierKey)}</td>
                <td>{String(s.legalName)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {selected ? (
          <section>
            <h3>{String((selected.supplier as Record<string, unknown>)?.legalName ?? '')}</h3>
            <div>Saldo abierto: {Number((selected.summary as Record<string, unknown>)?.openBalance ?? 0).toLocaleString()}</div>
            <div>Anticipos: {Number((selected.summary as Record<string, unknown>)?.advanceBalance ?? 0).toLocaleString()}</div>
            <div>Neto a pagar: {Number((selected.summary as Record<string, unknown>)?.netPayable ?? 0).toLocaleString()}</div>
            <h4>Obligaciones pendientes</h4>
            <table className="data-table">
              <thead><tr><th>Factura</th><th>Saldo</th><th>Vence</th></tr></thead>
              <tbody>
                {((selected.payables ?? []) as Array<Record<string, unknown>>).filter((p) => p.status !== 'paid').map((p) => (
                  <tr key={String(p.payableKey)}>
                    <td>{String(p.invoiceKey)}</td>
                    <td>{Number(p.balanceAmount ?? 0).toLocaleString()}</td>
                    <td>{String(p.dueDate).slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : <div>Seleccione un proveedor</div>}
      </div>
    </>
  );
}
