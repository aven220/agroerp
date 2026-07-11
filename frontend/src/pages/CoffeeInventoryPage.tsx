import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageState,
  PageToolbar,
  FieldGroup,
  FormActions,
  EmptyPanel,
  SimpleRecordsTable,
  withRowId,
} from '../components/page';
import type { RowAction } from '../lib/data-grid/types';
import {
  getInventoryLot,
  listInventoryLots,
  registerInventoryMovement,
  revalueInventoryLot,
} from '../api/coffee';
import { notifyEntityUpdated, useOnEntityUpdated } from '../lib/entitySync';

type LotRow = Record<string, unknown> & { id: string };

export function CoffeeInventoryPage() {
  const [lots, setLots] = useState<Array<Record<string, unknown>>>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [qty, setQty] = useState('');
  const [movementType, setMovementType] = useState('transfer');
  const [toWarehouse, setToWarehouse] = useState('');
  const [error, setError] = useState('');

  const reload = () => listInventoryLots().then((r) => setLots(r as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);

  useOnEntityUpdated(() => {
    reload();
  }, ['purchase', 'inventory']);

  const openLot = async (lotKey: string) => {
    setSelected(await getInventoryLot(lotKey));
  };

  const data = lots.map((l) => withRowId(l, 'id', 'lotKey'));

  const rowActions: RowAction<LotRow>[] = [
    {
      id: 'detail',
      label: 'Detalle',
      onAction: (r) => {
        openLot(String(r.lotKey));
      },
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Inventario generado por compras"
        subtitle="Lotes, existencias, costos y movimientos"
        actions={
          <PageActions>
            <Link to="/compras/trazabilidad" className="btn">Trazabilidad</Link>
            <Link to="/compras/inventario/kardex" className="btn">Kardex</Link>
            <Link to="/compras" className="btn">Centro</Link>
          </PageActions>
        }
      />

      {error ? <PageState variant="error" message={error} /> : null}

      <PageSection title="Lotes en inventario">
        {lots.length === 0 ? (
          <EmptyPanel
            title="Sin lotes en inventario de compras"
            description="Los lotes aparecen cuando una liquidación cierra el ciclo e ingresa café a inventario."
            hint="Complete recepción → pesaje → calidad → liquidación."
            action={{ label: 'Ir a liquidaciones', to: '/compras/liquidaciones' }}
          />
        ) : (
          <SimpleRecordsTable
            gridId="coffee-inventory-lots"
            selectable={false}
            data={data}
            columns={[
              { key: 'lotKey', label: 'Lote', getValue: (r) => String(r.lotKey) },
              { key: 'qrCode', label: 'QR', getValue: (r) => String(r.qrCode ?? '—') },
              { key: 'producerName', label: 'Productor', getValue: (r) => String(r.producerName ?? '—') },
              { key: 'qualityGrade', label: 'Calidad', getValue: (r) => String(r.qualityGrade ?? '—') },
              { key: 'availableKg', label: 'Disponible', getValue: (r) => `${String(r.availableKg)} kg` },
              { key: 'reservedKg', label: 'Reservado', getValue: (r) => `${String(r.reservedKg ?? 0)} kg` },
              {
                key: 'averageCost',
                label: 'Costo prom.',
                getValue: (r) => Number(r.averageCost ?? 0).toLocaleString(),
              },
              { key: 'warehouse', label: 'Bodega', getValue: (r) => String(r.warehouse) },
              { key: 'status', label: 'Estado', getValue: (r) => String(r.status) },
            ]}
            rowActions={rowActions}
          />
        )}
      </PageSection>

      {selected ? (
        <PageSection title={`Detalle ${String(selected.lotKey)}`}>
          <p className="page-help">
            Ubicación {String(selected.locationLabel ?? '—')} · Neto {String(selected.netWeightKg)} kg ·
            Unitario {Number(selected.unitCost ?? 0).toLocaleString()} · Total{' '}
            {Number(selected.totalCost ?? 0).toLocaleString()}
          </p>
          <PageToolbar>
            <FieldGroup label="Tipo de movimiento">
              <select value={movementType} onChange={(e) => setMovementType(e.target.value)}>
                <option value="transfer">Traslado</option>
                <option value="adjustment">Ajuste</option>
                <option value="reservation">Reserva</option>
                <option value="block">Bloqueo</option>
                <option value="release">Liberación</option>
                <option value="transformation">Transformación</option>
                <option value="exit">Salida</option>
              </select>
            </FieldGroup>
            <FieldGroup label="Cantidad (kg)">
              <input value={qty} onChange={(e) => setQty(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Bodega destino">
              <input value={toWarehouse} onChange={(e) => setToWarehouse(e.target.value)} placeholder="Bodega destino" />
            </FieldGroup>
          </PageToolbar>
          <FormActions>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const quantityKg = Number(qty);
                if (!quantityKg) {
                  setError('Indique la cantidad del movimiento');
                  return;
                }
                registerInventoryMovement(String(selected.lotKey), {
                  movementType,
                  quantityKg,
                  toWarehouse: movementType === 'transfer' ? toWarehouse.trim() || undefined : undefined,
                  reason: `Movimiento ${movementType}`,
                })
                  .then(() => {
                    notifyEntityUpdated('inventory', String(selected.lotKey));
                    notifyEntityUpdated('purchase', '*');
                  })
                  .then(() => openLot(String(selected.lotKey)))
                  .then(reload)
                  .catch((e) => setError(e instanceof Error ? e.message : 'Error al registrar movimiento'));
              }}
            >
              Registrar movimiento
            </button>
            <button
              type="button"
              className="btn"
              onClick={() =>
                revalueInventoryLot(String(selected.lotKey), Number(selected.unitCost) * 1.02, 'Revalorización operativa')
                  .then(() => {
                    notifyEntityUpdated('inventory', String(selected.lotKey));
                  })
                  .then(() => openLot(String(selected.lotKey)))
                  .then(reload)
                  .catch((e) => setError(e instanceof Error ? e.message : 'Error al revalorizar'))
              }
            >
              Revalorizar +2%
            </button>
            <Link className="btn" to={`/compras/trazabilidad?mode=lot&q=${encodeURIComponent(String(selected.lotKey))}`}>
              Ver trazabilidad
            </Link>
          </FormActions>
          <h4 className="form-section-title">Movimientos</h4>
          <pre className="code-block">
            {JSON.stringify(selected.movements ?? [], null, 2)}
          </pre>
        </PageSection>
      ) : null}
    </PageLayout>
  );
}
