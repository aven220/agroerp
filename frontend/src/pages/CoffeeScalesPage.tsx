import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  FieldGroup,
  FormActions,
  SimpleRecordsTable,
  withRowId,
} from '../components/page';
import type { RowAction } from '../lib/data-grid/types';
import {
  diagnoseCoffeeScale,
  listRegisteredScales,
  syncCoffeeScalesFromIot,
  upsertCoffeeScale,
} from '../api/coffee';

type ScaleRow = Record<string, unknown> & { id: string };

export function CoffeeScalesPage() {
  const [scales, setScales] = useState<Array<Record<string, unknown>>>([]);
  const [diagnosis, setDiagnosis] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({
    scaleKey: '',
    name: '',
    connectionType: 'tcp_ip',
    driverKey: '',
    host: '',
    port: '4001',
    certified: true,
  });

  const reload = () => listRegisteredScales().then((r) => setScales(r as Array<Record<string, unknown>>));
  useEffect(() => { reload().catch(() => undefined); }, []);

  const save = async () => {
    await upsertCoffeeScale({
      ...form,
      port: form.port ? Number(form.port) : undefined,
      certified: form.certified,
      maxWeightKg: 20000,
      minWeightKg: 0.1,
    });
    setForm({ scaleKey: '', name: '', connectionType: 'tcp_ip', driverKey: '', host: '', port: '4001', certified: true });
    await reload();
  };

  const data = scales.map((s) => withRowId(s, 'id', 'scaleKey'));

  const rowActions: RowAction<ScaleRow>[] = [
    {
      id: 'diagnose',
      label: 'Diagnóstico',
      onAction: (r) => {
        diagnoseCoffeeScale(String(r.scaleKey)).then(setDiagnosis);
      },
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Balanzas y dispositivos"
        subtitle="USB, Serial, Ethernet, TCP/IP, Bluetooth, Wi-Fi e IoT"
        actions={
          <PageActions>
            <button type="button" className="btn" onClick={() => syncCoffeeScalesFromIot().then(reload)}>Sincronizar IoT</button>
            <Link to="/compras/pesaje" className="btn">Pesaje</Link>
            <Link to="/compras" className="btn">Centro</Link>
          </PageActions>
        }
      />

      <PageSection title="Registrar / actualizar balanza">
        <div className="form-grid">
          <FieldGroup label="Clave">
            <input placeholder="scaleKey" value={form.scaleKey} onChange={(e) => setForm({ ...form, scaleKey: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Nombre">
            <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Conexión">
            <select value={form.connectionType} onChange={(e) => setForm({ ...form, connectionType: e.target.value })}>
              <option value="usb">USB</option>
              <option value="serial_rs232">Serial RS-232</option>
              <option value="ethernet">Ethernet</option>
              <option value="tcp_ip">TCP/IP</option>
              <option value="bluetooth">Bluetooth</option>
              <option value="wifi">Wi-Fi</option>
              <option value="iot_gateway">IoT Gateway</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Driver">
            <input placeholder="Driver" value={form.driverKey} onChange={(e) => setForm({ ...form, driverKey: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Host">
            <input placeholder="Host" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Puerto">
            <input placeholder="Puerto" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} />
          </FieldGroup>
        </div>
        <FormActions>
          <button type="button" className="btn btn-primary" onClick={save}>Guardar balanza</button>
        </FormActions>
      </PageSection>

      <PageSection title="Balanzas registradas">
        <SimpleRecordsTable
          gridId="coffee-scales"
          selectable={false}
          data={data}
          columns={[
            { key: 'scaleKey', label: 'Clave', getValue: (r) => String(r.scaleKey) },
            { key: 'name', label: 'Nombre', getValue: (r) => String(r.name) },
            { key: 'connectionType', label: 'Conexión', getValue: (r) => String(r.connectionType) },
            { key: 'status', label: 'Estado', getValue: (r) => String(r.status) },
            { key: 'certified', label: 'Certificada', getValue: (r) => (r.certified ? 'Sí' : 'No') },
            { key: 'firmwareVersion', label: 'Firmware', getValue: (r) => String(r.firmwareVersion ?? '—') },
            {
              key: 'lastSeenAt',
              label: 'Última señal',
              getValue: (r) => (r.lastSeenAt ? new Date(String(r.lastSeenAt)).toLocaleString() : '—'),
            },
          ]}
          rowActions={rowActions}
        />
      </PageSection>

      {diagnosis ? (
        <PageSection title={`Diagnóstico ${String((diagnosis.scale as Record<string, unknown>)?.scaleKey ?? '')}`}>
          <p>Conectada: {diagnosis.connected ? 'Sí' : 'No'} · Saludable: {diagnosis.healthy ? 'Sí' : 'No'}</p>
          <pre className="code-block">{JSON.stringify(diagnosis, null, 2)}</pre>
        </PageSection>
      ) : null}
    </PageLayout>
  );
}
