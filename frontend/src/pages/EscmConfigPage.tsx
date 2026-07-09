import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  listEscmCreditPolicies,
  listEscmDiscountRules,
  listEscmPromotions,
  upsertEscmCreditPolicy,
  upsertEscmCustomerPricing,
  upsertEscmDiscountRule,
  upsertEscmPromotion,
  upsertEscmRegionalPricing,
  upsertEscmSeasonPricing,
  upsertEscmCreditLimit,
} from '../api/escm';

export function EscmConfigPage() {
  const [discounts, setDiscounts] = useState<Array<Record<string, unknown>>>([]);
  const [promotions, setPromotions] = useState<Array<Record<string, unknown>>>([]);
  const [policies, setPolicies] = useState<Array<Record<string, unknown>>>([]);
  const [discountForm, setDiscountForm] = useState({ name: '', discountPct: 5, autoApply: true, priority: 10 });
  const [promoForm, setPromoForm] = useState({ name: '', discountPct: 10, validFrom: '', validTo: '' });
  const [creditForm, setCreditForm] = useState({ name: '', maxDays: 30, graceDays: 5 });
  const [customerPricing, setCustomerPricing] = useState({ customerKey: '', itemKey: '', unitPrice: 0 });
  const [regionalPricing, setRegionalPricing] = useState({ regionKey: '', itemKey: '', unitPrice: 0 });
  const [seasonPricing, setSeasonPricing] = useState({ seasonKey: '', itemKey: '', unitPrice: 0, validFrom: '', validTo: '' });
  const [creditLimit, setCreditLimit] = useState({ customerKey: '', creditLimit: 0 });

  const reload = () => Promise.all([
    listEscmDiscountRules().then((r) => setDiscounts(r as Array<Record<string, unknown>>)),
    listEscmPromotions().then((r) => setPromotions(r as Array<Record<string, unknown>>)),
    listEscmCreditPolicies().then((r) => setPolicies(r as Array<Record<string, unknown>>)),
  ]);
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header title="Configuración comercial" subtitle="Descuentos, promociones, crédito y precios especiales" actions={<Link to="/comercial" className="btn">Comercial</Link>} />
      <section className="panel">
        <h3>Descuentos automáticos</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="Nombre" value={discountForm.name} onChange={(e) => setDiscountForm({ ...discountForm, name: e.target.value })} />
          <input type="number" placeholder="%" value={discountForm.discountPct} onChange={(e) => setDiscountForm({ ...discountForm, discountPct: Number(e.target.value) })} />
          <button className="btn" onClick={() => upsertEscmDiscountRule(discountForm).then(reload)}>Guardar</button>
        </div>
        <ul>{discounts.map((d) => <li key={String(d.ruleKey)}>{String(d.name)} — {String(d.discountPct)}%</li>)}</ul>
      </section>
      <section className="panel">
        <h3>Promociones</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="Nombre" value={promoForm.name} onChange={(e) => setPromoForm({ ...promoForm, name: e.target.value })} />
          <input type="number" placeholder="%" value={promoForm.discountPct} onChange={(e) => setPromoForm({ ...promoForm, discountPct: Number(e.target.value) })} />
          <input type="date" value={promoForm.validFrom} onChange={(e) => setPromoForm({ ...promoForm, validFrom: e.target.value })} />
          <input type="date" value={promoForm.validTo} onChange={(e) => setPromoForm({ ...promoForm, validTo: e.target.value })} />
          <button className="btn" onClick={() => upsertEscmPromotion(promoForm).then(reload)}>Guardar</button>
        </div>
        <ul>{promotions.map((p) => <li key={String(p.promotionKey)}>{String(p.name)} — {String(p.discountPct)}%</li>)}</ul>
      </section>
      <section className="panel">
        <h3>Políticas de crédito</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="Nombre" value={creditForm.name} onChange={(e) => setCreditForm({ ...creditForm, name: e.target.value })} />
          <input type="number" placeholder="Días máx" value={creditForm.maxDays} onChange={(e) => setCreditForm({ ...creditForm, maxDays: Number(e.target.value) })} />
          <button className="btn" onClick={() => upsertEscmCreditPolicy(creditForm).then(reload)}>Guardar</button>
        </div>
        <ul>{policies.map((p) => <li key={String(p.policyKey)}>{String(p.name)} — {String(p.maxDays)} días</li>)}</ul>
      </section>
      <section className="panel">
        <h3>Precio por cliente</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="Código de cliente" value={customerPricing.customerKey} onChange={(e) => setCustomerPricing({ ...customerPricing, customerKey: e.target.value })} />
          <input placeholder="Código del artículo" value={customerPricing.itemKey} onChange={(e) => setCustomerPricing({ ...customerPricing, itemKey: e.target.value })} />
          <input type="number" placeholder="Precio" value={customerPricing.unitPrice} onChange={(e) => setCustomerPricing({ ...customerPricing, unitPrice: Number(e.target.value) })} />
          <button className="btn" onClick={() => upsertEscmCustomerPricing(customerPricing.customerKey, customerPricing)}>Guardar</button>
        </div>
      </section>
      <section className="panel">
        <h3>Precio por región</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="regionKey" value={regionalPricing.regionKey} onChange={(e) => setRegionalPricing({ ...regionalPricing, regionKey: e.target.value })} />
          <input placeholder="Código del artículo" value={regionalPricing.itemKey} onChange={(e) => setRegionalPricing({ ...regionalPricing, itemKey: e.target.value })} />
          <input type="number" value={regionalPricing.unitPrice} onChange={(e) => setRegionalPricing({ ...regionalPricing, unitPrice: Number(e.target.value) })} />
          <button className="btn" onClick={() => upsertEscmRegionalPricing(regionalPricing)}>Guardar</button>
        </div>
      </section>
      <section className="panel">
        <h3>Precio por temporada</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="seasonKey" value={seasonPricing.seasonKey} onChange={(e) => setSeasonPricing({ ...seasonPricing, seasonKey: e.target.value })} />
          <input placeholder="Código del artículo" value={seasonPricing.itemKey} onChange={(e) => setSeasonPricing({ ...seasonPricing, itemKey: e.target.value })} />
          <input type="number" value={seasonPricing.unitPrice} onChange={(e) => setSeasonPricing({ ...seasonPricing, unitPrice: Number(e.target.value) })} />
          <input type="date" value={seasonPricing.validFrom} onChange={(e) => setSeasonPricing({ ...seasonPricing, validFrom: e.target.value })} />
          <input type="date" value={seasonPricing.validTo} onChange={(e) => setSeasonPricing({ ...seasonPricing, validTo: e.target.value })} />
          <button className="btn" onClick={() => upsertEscmSeasonPricing(seasonPricing)}>Guardar</button>
        </div>
      </section>
      <section className="panel">
        <h3>Límite de crédito por cliente</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Código de cliente" value={creditLimit.customerKey} onChange={(e) => setCreditLimit({ ...creditLimit, customerKey: e.target.value })} />
          <input type="number" placeholder="Límite" value={creditLimit.creditLimit} onChange={(e) => setCreditLimit({ ...creditLimit, creditLimit: Number(e.target.value) })} />
          <button className="btn" onClick={() => upsertEscmCreditLimit(creditLimit.customerKey, creditLimit)}>Guardar</button>
        </div>
      </section>
    </>
  );
}
