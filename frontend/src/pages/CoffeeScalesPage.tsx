import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  diagnoseCoffeeScale,
  listRegisteredScales,
  syncCoffeeScalesFromIot,
  upsertCoffeeScale,
} from '../api/coffee';

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

  return (
    <>
      <Header
        title="Balanzas y dispositivos"
        subtitle="USB, Serial, Ethernet, TCP/IP, Bluetooth, Wi-Fi e IoT"
        actions={
          <>
            <button className="btn" onClick={() => syncCoffeeScalesFromIot().then(reload)}>Sincronizar IoT</button>
            <Link to="/compras/pesaje" className="btn">Pesaje</Link>
            <Link to="/compras" className="btn">Centro</Link>
          </>
        }
      />

      <section className="panel">
        <h3>Registrar / actualizar balanza</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <input placeholder="scaleKey" value={form.scaleKey} onChange={(e) => setForm({ ...form, scaleKey: e.target.value })} />
          <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select value={form.connectionType} onChange={(e) => setForm({ ...form, connectionType: e.target.value })}>
            <option value="usb">USB</option>
            <option value="serial_rs232">Serial RS-232</option>
            <option value="ethernet">Ethernet</option>
            <option value="tcp_ip">TCP/IP</option>
            <option value="bluetooth">Bluetooth</option>
            <option value="wifi">Wi-Fi</option>
            <option value="iot_gateway">IoT Gateway</option>
          </select>
          <input placeholder="Driver" value={form.driverKey} onChange={(e) => setForm({ ...form, driverKey: e.target.value })} />
          <input placeholder="Host" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} />
          <input placeholder="Puerto" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} />
        </div>
        <button className="btn" style={{ marginTop: 8 }} onClick={save}>Guardar balanza</button>
      </section>

      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Clave</th>
              <th>Nombre</th>
              <th>Conexión</th>
              <th>Estado</th>
              <th>Certificada</th>
              <th>Firmware</th>
              <th>Última señal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {scales.map((s) => (
              <tr key={String(s.id ?? s.scaleKey)}>
                <td>{String(s.scaleKey)}</td>
                <td>{String(s.name)}</td>
                <td>{String(s.connectionType)}</td>
                <td>{String(s.status)}</td>
                <td>{s.certified ? 'Sí' : 'No'}</td>
                <td>{String(s.firmwareVersion ?? '—')}</td>
                <td>{s.lastSeenAt ? new Date(String(s.lastSeenAt)).toLocaleString() : '—'}</td>
                <td>
                  <button
                    className="btn"
                    onClick={() => diagnoseCoffeeScale(String(s.scaleKey)).then(setDiagnosis)}
                  >
                    Diagnóstico
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {diagnosis ? (
        <section className="panel">
          <h3>Diagnóstico {String((diagnosis.scale as Record<string, unknown>)?.scaleKey ?? '')}</h3>
          <p>Conectada: {diagnosis.connected ? 'Sí' : 'No'} · Saludable: {diagnosis.healthy ? 'Sí' : 'No'}</p>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(diagnosis, null, 2)}</pre>
        </section>
      ) : null}
    </>
  );
}
