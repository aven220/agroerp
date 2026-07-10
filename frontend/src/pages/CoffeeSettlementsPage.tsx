import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageState,
  PageSummary,
  MetricCard,
  PageToolbar,
  FieldGroup,
  FormActions,
  EmptyPanel,
} from '../components/page';
import {
  confirmSettlementOperator,
  confirmSettlementProducer,
  getSettlementKpis,
  listCoffeeDocuments,
  listCoffeeSettlements,
  listSettlementPending,
  registerCoffeePayment,
  registerSettlement,
  reprintCoffeeDocument,
  resimulateSettlement,
  startSettlementSession,
  voidSettlement,
  type CoffeeTicket,
} from '../api/coffee';
import { notifyEntityUpdated, useOnEntityUpdated } from '../lib/entitySync';
import { useIsMounted } from '../hooks/useIsMounted';

export function CoffeeSettlementsPage() {
  const mounted = useIsMounted();
  const [searchParams] = useSearchParams();
  const [pending, setPending] = useState<CoffeeTicket[]>([]);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [docs, setDocs] = useState<Array<Record<string, unknown>>>([]);
  const [kpis, setKpis] = useState<Record<string, unknown> | null>(null);
  const [session, setSession] = useState<Record<string, unknown> | null>(null);
  const [transport, setTransport] = useState('50000');
  const [advances, setAdvances] = useState('0');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [signerName, setSignerName] = useState('Productor');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    const [p, s, d, k] = await Promise.all([
      listSettlementPending(),
      listCoffeeSettlements(),
      listCoffeeDocuments(),
      getSettlementKpis(),
    ]);
    if (!mounted.current) return;
    setPending(p);
    setRows(s as Array<Record<string, unknown>>);
    setDocs(d as Array<Record<string, unknown>>);
    setKpis(k);
  };

  useOnEntityUpdated(() => {
    reload().catch(() => undefined);
  }, ['purchase', 'document', 'inventory']);

  useEffect(() => {
    reload().catch(() => undefined);
    const ticket = searchParams.get('ticket');
    if (ticket) {
      startSettlementSession(ticket)
        .then(setSession)
        .catch((e) => setError(e instanceof Error ? e.message : 'Error'));
    }
  }, [searchParams]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      const result = await fn();
      if (result && typeof result === 'object' && 'sessionKey' in (result as object)) {
        setSession(result as Record<string, unknown>);
      } else if (result && typeof result === 'object' && 'session' in (result as object)) {
        setSession((result as { session: Record<string, unknown> }).session);
      }
      await reload();
      const ticketKey = String(
        (session?.ticket as Record<string, unknown> | undefined)?.ticketKey ??
          searchParams.get('ticket') ??
          '*',
      );
      notifyEntityUpdated('purchase', ticketKey);
      notifyEntityUpdated('document', '*');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de liquidación');
    } finally {
      setBusy(false);
    }
  };

  const start = (ticketKey: string) => run(() => startSettlementSession(ticketKey));

  const resimulate = () =>
    run(() =>
      resimulateSettlement(String(session?.sessionKey), {
        transportTotal: Number(transport),
        advancesTotal: Number(advances),
        roundingMode: 'nearest',
        roundingPrecision: 0,
      }),
    );

  const paySettlement = (ticketKey: string, amount: number) => {
    if (busy) return;
    setBusy(true);
    setError('');
    registerCoffeePayment(ticketKey, {
      paidAmount: amount,
      method: payMethod,
      reference: `PAY-${Date.now()}`,
    })
      .then(() => {
        notifyEntityUpdated('purchase', ticketKey);
        return reload();
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al registrar pago'))
      .finally(() => setBusy(false));
  };

  const voidRow = (settlementKey: string) => {
    if (busy) return;
    setBusy(true);
    setError('');
    voidSettlement(settlementKey, 'Anulación controlada operativa')
      .then(() => {
        notifyEntityUpdated('purchase', '*');
        return reload();
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al anular'))
      .finally(() => setBusy(false));
  };

  const confirmAndRegister = () =>
    run(async () => {
      const key = String(session?.sessionKey);
      await confirmSettlementOperator(key);
      await confirmSettlementProducer(key, {
        signerName,
        signatureData: `signed-${Date.now()}`,
      });
      return registerSettlement(key);
    });

  const simulation = (session?.simulation ?? {}) as Record<string, unknown>;
  const bonusLines = (simulation.bonusLines ?? []) as Array<Record<string, unknown>>;
  const penaltyLines = (simulation.penaltyLines ?? []) as Array<Record<string, unknown>>;
  const discountLines = (simulation.discountLines ?? []) as Array<Record<string, unknown>>;
  const flow = (session?.flow ?? []) as Array<Record<string, unknown>>;
  const ticket = session?.ticket as Record<string, unknown> | undefined;

  return (
    <PageLayout>
      <PageHeader
        title="Centro de liquidaciones"
        subtitle="Simulación, pagos, documentos e inventario"
        actions={
          <PageActions>
            <Link to="/compras/liquidaciones/reportes" className="btn">Reportes</Link>
            <Link to="/compras" className="btn">Centro</Link>
          </PageActions>
        }
      />

      {kpis ? (
        <PageSummary>
          <MetricCard label="Liquidaciones" value={String(kpis.count)} tone="blue" />
          <MetricCard label="Total" value={Number(kpis.totalAmount ?? 0).toLocaleString()} />
          <MetricCard label="Pagado" value={Number(kpis.paidAmount ?? 0).toLocaleString()} tone="green" />
          <MetricCard label="Pendiente" value={Number(kpis.outstanding ?? 0).toLocaleString()} tone="coffee" />
        </PageSummary>
      ) : null}

      {error ? <PageState variant="error" message={error} /> : null}

      <PageSection title="Cola de liquidación">
        {pending.length === 0 ? (
          <EmptyPanel title="Sin tickets" description="No hay tickets pendientes de liquidación." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Ticket</th><th>Productor</th><th>Neto</th><th>Calidad</th><th></th></tr>
              </thead>
              <tbody>
                {pending.map((t) => {
                  const quality = (t as CoffeeTicket & { quality?: Record<string, unknown> }).quality;
                  return (
                    <tr key={t.id}>
                      <td>{t.ticketKey}</td>
                      <td>{t.producerName ?? '—'}</td>
                      <td>{t.netWeightKg != null ? `${t.netWeightKg} kg` : '—'}</td>
                      <td>{String(quality?.decision ?? quality?.grade ?? '—')}</td>
                      <td><button className="btn" disabled={busy} onClick={() => start(t.ticketKey)}>Liquidar</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>

      {session ? (
        <PageSection title={`Wizard ${String(session.sessionKey)}`}>
          <p>
            Ticket <strong>{String(ticket?.ticketKey ?? '')}</strong> · Productor{' '}
            <strong>{String(ticket?.producerName ?? '')}</strong> · Estado{' '}
            <strong>{String(session.status)}</strong>
          </p>
          <div className="kpi-grid">
            {flow.map((s) => (
              <div
                key={String(s.key)}
                className={`kpi-card ${s.current ? 'kpi-blue' : s.done ? 'kpi-green' : ''}`}
              >
                <span className="kpi-label">{String(s.step)}. {String(s.label)}</span>
              </div>
            ))}
          </div>

          <PageToolbar>
            <FieldGroup label="Flete">
              <input value={transport} onChange={(e) => setTransport(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Anticipos">
              <input value={advances} onChange={(e) => setAdvances(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Firmante">
              <input value={signerName} onChange={(e) => setSignerName(e.target.value)} />
            </FieldGroup>
          </PageToolbar>
          <FormActions sticky={false}>
            <button className="btn" disabled={busy} onClick={resimulate}>Simular</button>
            <button className="btn" disabled={busy} onClick={confirmAndRegister}>Confirmar y registrar</button>
          </FormActions>

          <PageSummary>
            <MetricCard label="Bruto" value={`${String(simulation.grossWeightKg ?? '—')} kg`} />
            <MetricCard label="Neto" value={`${String(simulation.netWeightKg ?? '—')} kg`} />
            <MetricCard label="Precio aplicado" value={Number(simulation.appliedPricePerKg ?? 0).toLocaleString()} />
            <MetricCard label="Valor final" value={Number(simulation.totalAmount ?? 0).toLocaleString()} tone="green" />
          </PageSummary>

          <h4>Bonificaciones</h4>
          <ul>{bonusLines.map((l, i) => <li key={i}>{String(l.label)}: {Number(l.amount).toLocaleString()}</li>)}</ul>
          <h4>Castigos</h4>
          <ul>{penaltyLines.map((l, i) => <li key={i}>{String(l.label)}: {Number(l.amount).toLocaleString()}</li>)}</ul>
          <h4>Descuentos</h4>
          <ul>{discountLines.map((l, i) => <li key={i}>{String(l.label)}: {Number(l.amount).toLocaleString()}</li>)}</ul>
        </PageSection>
      ) : null}

      <PageSection title="Historial de liquidaciones">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Clave</th><th>Ticket</th><th>Neto</th><th>Precio</th><th>Total</th><th>Pagado</th><th>Estado</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const t = r.ticket as Record<string, unknown> | undefined;
                return (
                  <tr key={String(r.id)}>
                    <td>{String(r.settlementKey)}</td>
                    <td>{String(t?.ticketKey ?? '')}</td>
                    <td>{String(r.netWeightKg)}</td>
                    <td>{Number(r.appliedPricePerKg ?? r.basePricePerKg).toLocaleString()}</td>
                    <td>{Number(r.totalAmount).toLocaleString()}</td>
                    <td>{Number(r.paidAmount).toLocaleString()}</td>
                    <td>{String(r.paymentStatus)}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn"
                          disabled={busy}
                          onClick={() => {
                            const amount = Number(payAmount || r.netPayable || r.totalAmount);
                            if (!amount || Number.isNaN(amount)) {
                              setError('Indique un monto de pago válido');
                              return;
                            }
                            paySettlement(String(t?.ticketKey), amount);
                          }}
                        >
                          Pagar
                        </button>
                        <button
                          className="btn"
                          disabled={busy}
                          onClick={() => voidRow(String(r.settlementKey))}
                        >
                          Anular
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <PageToolbar>
          <FieldGroup label="Monto pago">
            <input placeholder="Monto pago" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
          </FieldGroup>
          <FieldGroup label="Método">
            <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              <option value="cash">Efectivo</option>
              <option value="bank_transfer">Transferencia</option>
              <option value="deposit">Consignación</option>
              <option value="check">Cheque</option>
              <option value="digital_wallet">Billetera digital</option>
              <option value="mixed">Mixto</option>
              <option value="deferred">Diferido</option>
              <option value="partial">Parcial</option>
            </select>
          </FieldGroup>
        </PageToolbar>
      </PageSection>

      <PageSection title="Documentos">
        <div className="table-wrap">
          <table className="data-table data-table-compact">
            <thead>
              <tr><th>Tipo</th><th>Título</th><th>QR</th><th>PDF</th><th>Reimpresiones</th><th></th></tr>
            </thead>
            <tbody>
              {docs.map((d) => {
                const isCpep = d.source !== 'prm';
                return (
                <tr key={String(d.id)}>
                  <td>{String(d.documentType)}</td>
                  <td>{String(d.title)}</td>
                  <td>{isCpep ? String(d.qrPayload ?? '—') : '—'}</td>
                  <td>{isCpep ? String(d.pdfUrl ?? '—') : '—'}</td>
                  <td>{isCpep ? String(d.reprintCount ?? 0) : '—'}</td>
                  <td>
                    {isCpep ? (
                      <button className="btn" disabled={busy} onClick={() => reprintCoffeeDocument(String(d.documentKey)).then(() => {
                        notifyEntityUpdated('document', String(d.documentKey));
                        return reload();
                      })}>
                        Reimprimir
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      </PageSection>
    </PageLayout>
  );
}
