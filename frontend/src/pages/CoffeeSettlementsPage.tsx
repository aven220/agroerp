import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
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

export function CoffeeSettlementsPage() {
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
    setPending(p);
    setRows(s as Array<Record<string, unknown>>);
    setDocs(d as Array<Record<string, unknown>>);
    setKpis(k);
  };

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
    <>
      <Header
        title="Centro de liquidaciones"
        subtitle="Simulación, pagos, documentos e inventario"
        actions={
          <>
            <Link to="/compras/liquidaciones/reportes" className="btn">Reportes</Link>
            <Link to="/compras" className="btn">Centro</Link>
          </>
        }
      />

      {kpis ? (
        <section className="panel grid-4">
          <div><strong>Liquidaciones</strong><div>{String(kpis.count)}</div></div>
          <div><strong>Total</strong><div>{Number(kpis.totalAmount ?? 0).toLocaleString()}</div></div>
          <div><strong>Pagado</strong><div>{Number(kpis.paidAmount ?? 0).toLocaleString()}</div></div>
          <div><strong>Pendiente</strong><div>{Number(kpis.outstanding ?? 0).toLocaleString()}</div></div>
        </section>
      ) : null}

      {error ? <section className="panel error-panel">{error}</section> : null}

      <section className="panel">
        <h3>Cola de liquidación</h3>
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
      </section>

      {session ? (
        <section className="panel">
          <h3>Wizard {String(session.sessionKey)}</h3>
          <p>
            Ticket <strong>{String(ticket?.ticketKey ?? '')}</strong> · Productor{' '}
            <strong>{String(ticket?.producerName ?? '')}</strong> · Estado{' '}
            <strong>{String(session.status)}</strong>
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
            {flow.map((s) => (
              <div
                key={String(s.key)}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  background: s.current ? '#1f6feb33' : s.done ? '#2ea04333' : '#ffffff10',
                  fontSize: 12,
                }}
              >
                {String(s.step)}. {String(s.label)}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <label>Flete <input value={transport} onChange={(e) => setTransport(e.target.value)} /></label>
            <label>Anticipos <input value={advances} onChange={(e) => setAdvances(e.target.value)} /></label>
            <label>Firmante <input value={signerName} onChange={(e) => setSignerName(e.target.value)} /></label>
            <button className="btn" disabled={busy} onClick={resimulate}>Simular</button>
            <button className="btn" disabled={busy} onClick={confirmAndRegister}>Confirmar y registrar</button>
          </div>

          <div className="grid-4">
            <div><strong>Bruto</strong><div>{String(simulation.grossWeightKg ?? '—')} kg</div></div>
            <div><strong>Neto</strong><div>{String(simulation.netWeightKg ?? '—')} kg</div></div>
            <div><strong>Precio aplicado</strong><div>{Number(simulation.appliedPricePerKg ?? 0).toLocaleString()}</div></div>
            <div><strong>Valor final</strong><div>{Number(simulation.totalAmount ?? 0).toLocaleString()}</div></div>
          </div>

          <h4>Bonificaciones</h4>
          <ul>{bonusLines.map((l, i) => <li key={i}>{String(l.label)}: {Number(l.amount).toLocaleString()}</li>)}</ul>
          <h4>Castigos</h4>
          <ul>{penaltyLines.map((l, i) => <li key={i}>{String(l.label)}: {Number(l.amount).toLocaleString()}</li>)}</ul>
          <h4>Descuentos</h4>
          <ul>{discountLines.map((l, i) => <li key={i}>{String(l.label)}: {Number(l.amount).toLocaleString()}</li>)}</ul>
        </section>
      ) : null}

      <section className="panel">
        <h3>Historial de liquidaciones</h3>
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
                  <td style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn"
                      onClick={() => {
                        const amount = Number(payAmount || r.netPayable || r.totalAmount);
                        registerCoffeePayment(String(t?.ticketKey), {
                          paidAmount: amount,
                          method: payMethod,
                          reference: `PAY-${Date.now()}`,
                        }).then(reload);
                      }}
                    >
                      Pagar
                    </button>
                    <button
                      className="btn"
                      onClick={() =>
                        voidSettlement(String(r.settlementKey), 'Anulación controlada operativa').then(reload).catch((e) => setError(e.message))
                      }
                    >
                      Anular
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input placeholder="Monto pago" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
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
        </div>
      </section>

      <section className="panel">
        <h3>Documentos</h3>
        <table className="data-table data-table-compact">
          <thead>
            <tr><th>Tipo</th><th>Título</th><th>QR</th><th>PDF</th><th>Reimpresiones</th><th></th></tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={String(d.id)}>
                <td>{String(d.documentType)}</td>
                <td>{String(d.title)}</td>
                <td>{String(d.qrPayload ?? '—')}</td>
                <td>{String(d.pdfUrl ?? '—')}</td>
                <td>{String(d.reprintCount ?? 0)}</td>
                <td>
                  <button className="btn" onClick={() => reprintCoffeeDocument(String(d.documentKey)).then(reload)}>
                    Reimprimir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
