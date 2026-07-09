import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEfmCenter, seedEfm } from '../api/efm';
import { LoadingState } from '../components/ux/LoadingState';

export function EfmCenterPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  const reload = () => getEfmCenter().then(setCenter).catch((e) => setError(e.message));
  useEffect(() => { reload(); }, []);

  if (!center && !error) return <LoadingState variant="page" message="Cargando finanzas..." />;

  return (
    <>
      <Header
        title="Finanzas"
        subtitle="Plan de cuentas, períodos, asientos y reportes contables"
        actions={
          <div className="row-actions">
            <button className="btn" onClick={() => seedEfm().then(reload).catch((e) => setError(e.message))}>Sembrar financiero</button>
            <Link to="/finanzas/plan-cuentas" className="btn">Plan de cuentas</Link>
            <Link to="/finanzas/configuracion" className="btn">Configuración</Link>
            <Link to="/finanzas/reglas" className="btn">Reglas contables</Link>
            <Link to="/finanzas/periodos" className="btn">Períodos</Link>
            <Link to="/finanzas/centros-costo" className="btn">Centros de costo</Link>
            <Link to="/finanzas/validaciones" className="btn">Validaciones</Link>
            <Link to="/finanzas/asientos" className="btn">Asientos</Link>
            <Link to="/finanzas/comprobantes" className="btn">Comprobantes</Link>
            <Link to="/finanzas/libro-diario" className="btn">Libro diario</Link>
            <Link to="/finanzas/libro-mayor" className="btn">Libro mayor</Link>
            <Link to="/finanzas/tipos-comprobante" className="btn">Tipos comprobante</Link>
            <Link to="/finanzas/cxp" className="btn">Cuentas por pagar</Link>
            <Link to="/finanzas/tesoreria" className="btn">Tesorería</Link>
            <Link to="/finanzas/activos-fijos" className="btn">Activos fijos</Link>
            <Link to="/finanzas/presupuestos" className="btn">Presupuestos</Link>
            <Link to="/finanzas/foc" className="btn">Operaciones financieras</Link>
            <Link to="/finanzas/auditoria" className="btn">Auditoría</Link>
          </div>
        }
      />
      {error ? <section className="panel error-panel">{error}</section> : null}
      {center ? (
        <div className="kpi-grid kpi-grid-lg">
          <div className="kpi-card kpi-card-primary"><span className="kpi-label">Versiones PUC</span><span className="kpi-value">{String(center.coaVersionsCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">PUC activo</span><span className="kpi-value">{String(center.activeCoaVersion ?? '—')}</span></div>
          <div className="kpi-card"><span className="kpi-label">Cuentas</span><span className="kpi-value">{String(center.accountsCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Parámetros</span><span className="kpi-value">{String(center.parametersCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Empresas</span><span className="kpi-value">{String(center.companiesCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Centros costo</span><span className="kpi-value">{String(center.costCentersCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Ejercicios</span><span className="kpi-value">{String(center.fiscalYearsCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Reglas</span><span className="kpi-value">{String(center.rulesCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Asientos</span><span className="kpi-value">{String(center.journalsCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Contabilizados</span><span className="kpi-value">{String(center.postedJournalsCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Tipos comprobante</span><span className="kpi-value">{String(center.voucherTypesCount ?? 0)}</span></div>
        </div>
      ) : null}
    </>
  );
}

export function EfmCoaPage() {
  const [accounts, setAccounts] = useState<Array<Record<string, unknown>>>([]);
  const [hierarchy, setHierarchy] = useState<unknown[]>([]);
  useEffect(() => {
    import('../api/efm').then(({ listEfmAccounts, getEfmCoaHierarchy }) => {
      listEfmAccounts().then((r) => setAccounts(r as Array<Record<string, unknown>>));
      getEfmCoaHierarchy().then(setHierarchy);
    });
  }, []);
  return (
    <>
      <Header title="Administrador del plan de cuentas" subtitle="Jerarquías, auxiliares, control e impuestos" actions={<Link to="/finanzas" className="btn">Finanzas</Link>} />
      <section className="panel">
        <h3>Cuentas ({accounts.length})</h3>
        <table className="data-table">
          <thead><tr><th>Código</th><th>Nombre</th><th>Tipo</th><th>Naturaleza</th><th>Control</th><th>Impuesto</th></tr></thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={String(a.accountKey)}>
                <td>{String(a.code)}</td>
                <td>{String(a.name)}</td>
                <td>{String(a.accountType)}</td>
                <td>{String(a.nature)}</td>
                <td>{a.isControl ? 'Sí' : ''}</td>
                <td>{a.isTax ? 'Sí' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Jerarquía ({hierarchy.length} raíces)</h3>
        <pre style={{ fontSize: 12, overflow: 'auto' }}>{JSON.stringify(hierarchy, null, 2).slice(0, 8000)}</pre>
      </section>
    </>
  );
}

export function EfmConfigPage() {
  const [params, setParams] = useState<Array<Record<string, unknown>>>([]);
  const [companies, setCompanies] = useState<Array<Record<string, unknown>>>([]);
  const [currencies, setCurrencies] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/efm').then(({ listEfmParameters, listEfmCompanies, listEfmCurrencies }) => {
      listEfmParameters().then((r) => setParams(r as Array<Record<string, unknown>>));
      listEfmCompanies().then((r) => setCompanies(r as Array<Record<string, unknown>>));
      listEfmCurrencies().then((r) => setCurrencies(r as Array<Record<string, unknown>>));
    });
  }, []);
  return (
    <>
      <Header title="Configuración financiera" subtitle="Monedas, empresas y parámetros contables" actions={<Link to="/finanzas" className="btn">Finanzas</Link>} />
      <section className="panel">
        <h3>Parámetros</h3>
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Nombre</th><th>Valor</th></tr></thead>
          <tbody>{params.map((p) => <tr key={String(p.parameterKey)}><td>{String(p.parameterKey)}</td><td>{String(p.name)}</td><td><code>{JSON.stringify(p.value)}</code></td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Empresas</h3>
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Razón social</th><th>Moneda base</th></tr></thead>
          <tbody>{companies.map((c) => <tr key={String(c.companyKey)}><td>{String(c.companyKey)}</td><td>{String(c.legalName)}</td><td>{String(c.baseCurrency)}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Monedas</h3>
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Nombre</th><th>Tasa</th><th>Base</th></tr></thead>
          <tbody>{currencies.map((c) => <tr key={String(c.currencyKey)}><td>{String(c.currencyKey)}</td><td>{String(c.name)}</td><td>{String(c.exchangeRate)}</td><td>{c.isBase ? 'Sí' : ''}</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}

export function EfmRulesPage() {
  const [rules, setRules] = useState<Array<Record<string, unknown>>>([]);
  const reload = () => import('../api/efm').then(({ listEfmRules }) => listEfmRules().then((r) => setRules(r as Array<Record<string, unknown>>)));
  useEffect(() => { reload(); }, []);
  return (
    <>
      <Header title="Centro de reglas contables" subtitle="Motor contable configurable" actions={<Link to="/finanzas" className="btn">Finanzas</Link>} />
      <table className="data-table panel">
        <thead><tr><th>Regla</th><th>Módulo</th><th>Evento</th><th>Débito</th><th>Crédito</th><th>Prioridad</th><th>Estado</th></tr></thead>
        <tbody>
          {rules.map((r) => (
            <tr key={String(r.ruleKey)}>
              <td>{String(r.name)}</td>
              <td>{String(r.sourceModule)}</td>
              <td>{String(r.eventType)}</td>
              <td>{String(r.debitAccountKey)}</td>
              <td>{String(r.creditAccountKey)}</td>
              <td>{String(r.priority)}</td>
              <td>{String(r.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function EfmPeriodsPage() {
  const [years, setYears] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/efm').then(({ listEfmFiscalYears }) => listEfmFiscalYears().then((r) => setYears(r as Array<Record<string, unknown>>)));
  }, []);
  return (
    <>
      <Header title="Administrador de períodos" subtitle="Ejercicios fiscales y períodos contables" actions={<Link to="/finanzas" className="btn">Finanzas</Link>} />
      {years.map((fy) => (
        <section className="panel" key={String(fy.fiscalYearKey)}>
          <h3>{String(fy.fiscalYearKey)} — {String(fy.status)}</h3>
          <table className="data-table">
            <thead><tr><th>Período</th><th>Nombre</th><th>Estado</th></tr></thead>
            <tbody>
              {((fy.periods ?? []) as Array<Record<string, unknown>>).map((p) => (
                <tr key={String(p.periodKey)}><td>{String(p.periodKey)}</td><td>{String(p.name)}</td><td>{String(p.status)}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </>
  );
}

export function EfmCostCentersPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/efm').then(({ listEfmCostCenters }) => listEfmCostCenters().then((r) => setRows(r as Array<Record<string, unknown>>)));
  }, []);
  return (
    <>
      <Header title="Centros de costo" subtitle="Dimensiones analíticas" actions={<Link to="/finanzas" className="btn">Finanzas</Link>} />
      <table className="data-table panel">
        <thead><tr><th>Código</th><th>Nombre</th><th>Empresa</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={String(r.costCenterKey)}><td>{String(r.code)}</td><td>{String(r.name)}</td><td>{String(r.companyKey ?? '')}</td></tr>)}</tbody>
      </table>
    </>
  );
}

export function EfmValidationPage() {
  const [panel, setPanel] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { import('../api/efm').then(({ getEfmValidation }) => getEfmValidation().then(setPanel)); }, []);
  const issues = (panel?.issues ?? []) as Array<{ severity: string; code: string; message: string }>;
  return (
    <>
      <Header title="Panel de validaciones" subtitle="Integridad contable" actions={<Link to="/finanzas" className="btn">Finanzas</Link>} />
      <section className="panel">
        <div><strong>Válido:</strong> {panel?.valid ? 'Sí' : 'No'}</div>
        <table className="data-table">
          <thead><tr><th>Severidad</th><th>Código</th><th>Mensaje</th></tr></thead>
          <tbody>{issues.map((i, idx) => <tr key={idx}><td>{i.severity}</td><td>{i.code}</td><td>{i.message}</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}

export function EfmJournalsPage() {
  const [entries, setEntries] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/efm').then(({ listEfmJournals }) => listEfmJournals().then((r) => setEntries(r as Array<Record<string, unknown>>)));
  }, []);
  return (
    <>
      <Header title="Asientos contables" subtitle="Generados por el motor contable" actions={<Link to="/finanzas" className="btn">Finanzas</Link>} />
      <table className="data-table panel">
        <thead><tr><th>Asiento</th><th>Origen</th><th>Documento</th><th>Estado</th><th>Débito</th><th>Crédito</th></tr></thead>
        <tbody>
          {entries.map((e) => (
            <tr key={String(e.entryKey)}>
              <td>{String(e.entryKey)}</td>
              <td>{String(e.sourceModule)}</td>
              <td>{String(e.sourceDocumentKey)}</td>
              <td>{String(e.status)}</td>
              <td>{Number(e.totalDebit ?? 0).toLocaleString()}</td>
              <td>{Number(e.totalCredit ?? 0).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function EfmAuditPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { import('../api/efm').then(({ listEfmAudit }) => listEfmAudit().then((r) => setRows(r as Array<Record<string, unknown>>))); }, []);
  return (
    <>
      <Header title="Auditoría financiera" subtitle="Cuentas, reglas y parámetros" actions={<Link to="/finanzas" className="btn">Finanzas</Link>} />
      <table className="data-table panel">
        <thead><tr><th>Entidad</th><th>Clave</th><th>Acción</th><th>Versión</th><th>Fecha</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r.id)}>
              <td>{String(r.entityType)}</td>
              <td>{String(r.entityKey)}</td>
              <td>{String(r.action)}</td>
              <td>{String(r.versionNumber ?? '')}</td>
              <td>{String(r.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function EfmVouchersPage() {
  const [vouchers, setVouchers] = useState<Array<Record<string, unknown>>>([]);
  const [status, setStatus] = useState('');
  const reload = () => import('../api/efm').then(({ listEfmVouchers }) =>
    listEfmVouchers(status ? { status } : undefined).then((r) => setVouchers(r as Array<Record<string, unknown>>)));
  useEffect(() => { reload(); }, [status]);
  return (
    <>
      <Header
        title="Centro de comprobantes"
        subtitle="Automáticos, manuales, borradores y aprobaciones"
        actions={
          <div className="row-actions">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="btn">
              <option value="">Todos</option>
              <option value="draft">Borrador</option>
              <option value="pending_approval">Pendiente</option>
              <option value="approved">Aprobado</option>
              <option value="posted">Contabilizado</option>
              <option value="voided">Anulado</option>
              <option value="reversed">Reversado</option>
            </select>
            <Link to="/finanzas" className="btn">Finanzas</Link>
          </div>
        }
      />
      <table className="data-table panel">
        <thead><tr><th>Número</th><th>Asiento</th><th>Origen</th><th>Estado</th><th>Fecha</th><th>Débito</th><th>Crédito</th></tr></thead>
        <tbody>
          {vouchers.map((v) => (
            <tr key={String(v.entryKey)}>
              <td>{String(v.voucherNumber ?? '—')}</td>
              <td>{String(v.entryKey)}</td>
              <td>{String(v.originType)} / {String(v.sourceModule)}</td>
              <td>{String(v.status)}</td>
              <td>{String(v.entryDate).slice(0, 10)}</td>
              <td>{Number(v.totalDebit ?? 0).toLocaleString()}</td>
              <td>{Number(v.totalCredit ?? 0).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function EfmJournalBookPage() {
  const [data, setData] = useState<{ totalEntries: number; totalLines: number; rows: Array<Record<string, unknown>> } | null>(null);
  const [periodKey, setPeriodKey] = useState('');
  useEffect(() => {
    import('../api/efm').then(({ queryEfmJournalBook }) =>
      queryEfmJournalBook(periodKey ? { periodKey } : undefined).then(setData as never));
  }, [periodKey]);
  return (
    <>
      <Header
        title="Libro diario"
        subtitle="Registro cronológico de movimientos contabilizados"
        actions={
          <div className="row-actions">
            <input placeholder="Período (FY2026-M01)" value={periodKey} onChange={(e) => setPeriodKey(e.target.value)} />
            <a href="#" className="btn" onClick={(e) => {
              e.preventDefault();
              import('../api/efm').then(({ exportEfmJournalBookUrl }) => {
                window.open(exportEfmJournalBookUrl(periodKey ? { periodKey } : undefined), '_blank');
              });
            }}>Exportar CSV</a>
            <Link to="/finanzas" className="btn">Finanzas</Link>
          </div>
        }
      />
      {data ? (
        <section className="panel">
          <div>Comprobantes: {data.totalEntries} · Líneas: {data.totalLines}</div>
          <table className="data-table">
            <thead><tr><th>Fecha</th><th>Comprobante</th><th>Cuenta</th><th>Débito</th><th>Crédito</th><th>Documento</th></tr></thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr key={i}>
                  <td>{String(r.entryDate)}</td>
                  <td>{String(r.voucherNumber ?? r.entryKey)}</td>
                  <td>{String(r.accountCode)} {String(r.accountName)}</td>
                  <td>{Number(r.debit ?? 0).toLocaleString()}</td>
                  <td>{Number(r.credit ?? 0).toLocaleString()}</td>
                  <td>{String(r.sourceDocumentKey ?? '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </>
  );
}

export function EfmLedgerPage() {
  const [report, setReport] = useState<{ periodKey: string | null; accounts: Array<Record<string, unknown>> } | null>(null);
  const [periodKey, setPeriodKey] = useState('');
  const [comparePeriodKey, setComparePeriodKey] = useState('');
  useEffect(() => {
    const f: Record<string, string> = {};
    if (periodKey) f.periodKey = periodKey;
    if (comparePeriodKey) f.comparePeriodKey = comparePeriodKey;
    import('../api/efm').then(({ queryEfmLedger }) =>
      queryEfmLedger(f).then((r) => setReport({
        periodKey: r.periodKey,
        accounts: r.accounts as Array<Record<string, unknown>>,
      })));
  }, [periodKey, comparePeriodKey]);
  return (
    <>
      <Header
        title="Libro mayor"
        subtitle="Saldos por cuenta con comparativo entre períodos"
        actions={
          <div className="row-actions">
            <input placeholder="Período" value={periodKey} onChange={(e) => setPeriodKey(e.target.value)} />
            <input placeholder="Comparar período" value={comparePeriodKey} onChange={(e) => setComparePeriodKey(e.target.value)} />
            <Link to="/finanzas" className="btn">Finanzas</Link>
          </div>
        }
      />
      {report ? (
        <table className="data-table panel">
          <thead><tr><th>Cuenta</th><th>Saldo inicial</th><th>Débitos</th><th>Créditos</th><th>Saldo final</th><th>Mov.</th></tr></thead>
          <tbody>
            {report.accounts.map((a) => (
              <tr key={String(a.accountKey)}>
                <td>{String(a.accountCode)} {String(a.accountName)}</td>
                <td>{Number(a.openingBalance ?? 0).toLocaleString()}</td>
                <td>{Number(a.totalDebit ?? 0).toLocaleString()}</td>
                <td>{Number(a.totalCredit ?? 0).toLocaleString()}</td>
                <td>{Number(a.closingBalance ?? 0).toLocaleString()}</td>
                <td>{String(a.movementCount ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </>
  );
}

export function EfmVoucherTypesPage() {
  const [types, setTypes] = useState<Array<Record<string, unknown>>>([]);
  const reload = () => import('../api/efm').then(({ listEfmVoucherTypes }) =>
    listEfmVoucherTypes().then((r) => setTypes(r as Array<Record<string, unknown>>)));
  useEffect(() => { reload(); }, []);
  return (
    <>
      <Header
        title="Tipos de comprobante"
        subtitle="Numeración, aprobación y origen permitido"
        actions={
          <div className="row-actions">
            <button className="btn" onClick={() => import('../api/efm').then(({ seedEfmVoucherTypes }) => seedEfmVoucherTypes().then(reload))}>Sembrar tipos</button>
            <Link to="/finanzas" className="btn">Finanzas</Link>
          </div>
        }
      />
      <table className="data-table panel">
        <thead><tr><th>Código</th><th>Nombre</th><th>Prefijo</th><th>Niveles</th><th>Aprobación</th><th>Auto-post</th><th>Origen</th></tr></thead>
        <tbody>
          {types.map((t) => (
            <tr key={String(t.voucherTypeKey)}>
              <td>{String(t.code)}</td>
              <td>{String(t.name)}</td>
              <td>{String(t.prefix)}</td>
              <td>{String(t.approvalLevels)}</td>
              <td>{t.requiresApproval ? 'Sí' : 'No'}</td>
              <td>{t.autoPost ? 'Sí' : 'No'}</td>
              <td>{String(t.originAllowed)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
