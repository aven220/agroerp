import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';

export function EfmTrCenterPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  const reload = () => import('../api/efm-tr').then(({ getEfmTrCenter }) => getEfmTrCenter().then(setCenter));
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header
        title="Centro de Tesorería"
        subtitle="Bancos, cajas, flujo de caja y conciliación"
        actions={
          <div className="row-actions">
            <button className="btn" onClick={() => import('../api/efm-tr').then(({ seedEfmTr }) => seedEfmTr().then(reload))}>Cargar configuración inicial</button>
            <Link to="/finanzas/tesoreria/bancos" className="btn">Bancos</Link>
            <Link to="/finanzas/tesoreria/cajas" className="btn">Cajas</Link>
            <Link to="/finanzas/tesoreria/movimientos" className="btn">Movimientos</Link>
            <Link to="/finanzas/tesoreria/conciliacion" className="btn">Conciliación</Link>
            <Link to="/finanzas/tesoreria/flujo-caja" className="btn">Flujo de caja</Link>
            <Link to="/finanzas/tesoreria/proyeccion" className="btn">Proyección</Link>
            <Link to="/finanzas" className="btn">EFM</Link>
          </div>
        }
      />
      {center ? (
        <div className="kpi-grid kpi-grid-lg">
          <div className="kpi-card kpi-card-primary"><span className="kpi-label">Liquidez total</span><span className="kpi-value">{Number(center.totalLiquidity ?? 0).toLocaleString()}</span></div>
          <div className="kpi-card"><span className="kpi-label">Bancos</span><span className="kpi-value">{String(center.bankCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Cuentas</span><span className="kpi-value">{String(center.accountCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Saldo bancos</span><span className="kpi-value">{Number(center.totalBankBalance ?? 0).toLocaleString()}</span></div>
          <div className="kpi-card"><span className="kpi-label">Saldo cajas</span><span className="kpi-value">{Number(center.totalCashBalance ?? 0).toLocaleString()}</span></div>
          <div className="kpi-card"><span className="kpi-label">Cajas</span><span className="kpi-value">{String(center.cashBoxCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Sesiones abiertas</span><span className="kpi-value">{String(center.openSessions ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Movimientos</span><span className="kpi-value">{String(center.movementCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Conciliaciones pend.</span><span className="kpi-value">{String(center.pendingReconciliations ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Alertas liquidez</span><span className="kpi-value">{String(center.liquidityAlerts ?? 0)}</span></div>
        </div>
      ) : null}
    </>
  );
}

export function EfmTrBanksPage() {
  const [banks, setBanks] = useState<Array<Record<string, unknown>>>([]);
  const [balances, setBalances] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/efm-tr').then(({ listEfmTrBanks, getEfmTrBalances }) => {
      listEfmTrBanks().then((r) => setBanks(r as Array<Record<string, unknown>>));
      getEfmTrBalances().then((r) => setBalances(r as Array<Record<string, unknown>>));
    });
  }, []);
  return (
    <>
      <Header title="Administrador de bancos" subtitle="Cuentas corrientes, ahorro y firmantes" actions={<Link to="/finanzas/tesoreria" className="btn">Tesorería</Link>} />
      <section className="panel">
        <h3>Bancos ({banks.length})</h3>
        <table className="data-table">
          <thead><tr><th>Código</th><th>Nombre</th><th>País</th><th>Cuentas</th></tr></thead>
          <tbody>
            {banks.map((b) => (
              <tr key={String(b.bankKey)}>
                <td>{String(b.code)}</td>
                <td>{String(b.name)}</td>
                <td>{String(b.countryCode ?? '')}</td>
                <td>{Array.isArray(b.accounts) ? b.accounts.length : 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Saldos por cuenta</h3>
        <table className="data-table">
          <thead><tr><th>Cuenta</th><th>Banco</th><th>Tipo</th><th>Moneda</th><th>Saldo</th></tr></thead>
          <tbody>
            {balances.map((a) => (
              <tr key={String(a.accountKey)}>
                <td>{String(a.accountNumber)}</td>
                <td>{String((a.bank as Record<string, unknown>)?.name ?? '')}</td>
                <td>{String(a.accountType)}</td>
                <td>{String(a.currencyKey)}</td>
                <td>{Number(a.currentBalance ?? 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EfmTrCashBoxesPage() {
  const [boxes, setBoxes] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/efm-tr').then(({ listEfmTrCashBoxes }) =>
      listEfmTrCashBoxes().then((r) => setBoxes(r as Array<Record<string, unknown>>)));
  }, []);
  return (
    <>
      <Header title="Gestor de cajas" subtitle="Apertura, cierre, arqueos y diferencias" actions={<Link to="/finanzas/tesoreria" className="btn">Tesorería</Link>} />
      <table className="data-table panel">
        <thead><tr><th>Código</th><th>Nombre</th><th>Tipo</th><th>Saldo</th><th>Sesión</th></tr></thead>
        <tbody>
          {boxes.map((b) => (
            <tr key={String(b.cashBoxKey)}>
              <td>{String(b.code)}</td>
              <td>{String(b.name)}</td>
              <td>{String(b.cashBoxType)}</td>
              <td>{Number(b.currentBalance ?? 0).toLocaleString()}</td>
              <td>{Array.isArray(b.sessions) && b.sessions.length ? 'Abierta' : 'Cerrada'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function EfmTrMovementsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/efm-tr').then(({ listEfmTrMovements }) =>
      listEfmTrMovements().then((r) => setRows(r as Array<Record<string, unknown>>)));
  }, []);
  return (
    <>
      <Header title="Movimientos de tesorería" subtitle="Transferencias, consignaciones, pagos y recaudos" actions={<Link to="/finanzas/tesoreria" className="btn">Tesorería</Link>} />
      <table className="data-table panel">
        <thead><tr><th>Movimiento</th><th>Tipo</th><th>Estado</th><th>Monto</th><th>Fecha</th><th>Descripción</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r.movementKey)}>
              <td>{String(r.movementKey)}</td>
              <td>{String(r.movementType)}</td>
              <td>{String(r.status)}</td>
              <td>{Number(r.amount ?? 0).toLocaleString()}</td>
              <td>{String(r.movementDate).slice(0, 10)}</td>
              <td>{String(r.description)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function EfmTrReconciliationPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/efm-tr').then(({ listEfmTrReconciliations }) =>
      listEfmTrReconciliations().then((r) => setRows(r as Array<Record<string, unknown>>)));
  }, []);
  return (
    <>
      <Header title="Conciliación bancaria" subtitle="Extractos, reglas automáticas y ajustes" actions={<Link to="/finanzas/tesoreria" className="btn">Tesorería</Link>} />
      <table className="data-table panel">
        <thead><tr><th>Conciliación</th><th>Cuenta</th><th>Estado</th><th>Libros</th><th>Banco</th><th>Diferencia</th><th>Conciliadas</th><th>Pendientes</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r.reconciliationKey)}>
              <td>{String(r.reconciliationKey)}</td>
              <td>{String(r.bankAccountKey)}</td>
              <td>{String(r.status)}</td>
              <td>{Number(r.bookBalance ?? 0).toLocaleString()}</td>
              <td>{Number(r.bankBalance ?? 0).toLocaleString()}</td>
              <td>{Number(r.differenceAmount ?? 0).toLocaleString()}</td>
              <td>{String(r.matchedCount ?? 0)}</td>
              <td>{String(r.pendingCount ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function EfmTrCashflowPage() {
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    const now = new Date();
    const from = new Date(now);
    from.setMonth(from.getMonth() - 3);
    import('../api/efm-tr').then(({ getEfmTrCashflowMonthly }) =>
      getEfmTrCashflowMonthly(from.toISOString().slice(0, 10), now.toISOString().slice(0, 10)).then(setReport as never));
  }, []);
  const buckets = (report?.buckets ?? []) as Array<Record<string, unknown>>;
  return (
    <>
      <Header title="Flujo de caja" subtitle="Diario, semanal y mensual" actions={<Link to="/finanzas/tesoreria" className="btn">Tesorería</Link>} />
      <section className="panel">
        <div>Saldo inicial: {Number(report?.openingBalance ?? 0).toLocaleString()} · Movimientos: {String(report?.movementCount ?? 0)}</div>
        <table className="data-table">
          <thead><tr><th>Período</th><th>Entradas</th><th>Salidas</th><th>Neto</th><th>Acumulado</th></tr></thead>
          <tbody>
            {buckets.map((b) => (
              <tr key={String(b.period)}>
                <td>{String(b.period)}</td>
                <td>{Number(b.inflows ?? 0).toLocaleString()}</td>
                <td>{Number(b.outflows ?? 0).toLocaleString()}</td>
                <td>{Number(b.netFlow ?? 0).toLocaleString()}</td>
                <td>{Number(b.cumulativeBalance ?? 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EfmTrProjectionPage() {
  const [proj, setProj] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    import('../api/efm-tr').then(({ getEfmTrProjection }) => getEfmTrProjection(90).then(setProj as never));
  }, []);
  const buckets = (proj?.buckets ?? []) as Array<Record<string, unknown>>;
  const alerts = (proj?.alerts ?? []) as Array<Record<string, unknown>>;
  return (
    <>
      <Header title="Proyección de liquidez" subtitle="Escenarios y alertas de déficit" actions={<Link to="/finanzas/tesoreria" className="btn">Tesorería</Link>} />
      <section className="panel">
        <div>Saldo inicial: {Number(proj?.openingBalance ?? 0).toLocaleString()} · Horizonte: {String(proj?.horizonDays ?? 90)} días</div>
        {alerts.length ? (
          <div className="error-panel" style={{ marginBottom: 12 }}>
            {alerts.map((a) => <div key={String(a.alertKey)}>{String(a.message)}</div>)}
          </div>
        ) : null}
        <table className="data-table">
          <thead><tr><th>Semana</th><th>Entradas proj.</th><th>Salidas proj.</th><th>Neto</th><th>Saldo acumulado</th></tr></thead>
          <tbody>
            {buckets.map((b) => (
              <tr key={String(b.period)} style={Number(b.cumulativeBalance) < 0 ? { color: 'crimson' } : undefined}>
                <td>{String(b.period)}</td>
                <td>{Number(b.inflows ?? 0).toLocaleString()}</td>
                <td>{Number(b.outflows ?? 0).toLocaleString()}</td>
                <td>{Number(b.netFlow ?? 0).toLocaleString()}</td>
                <td>{Number(b.cumulativeBalance ?? 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
