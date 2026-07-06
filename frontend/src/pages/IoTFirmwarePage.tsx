import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { createIotFirmware, deployIotFirmware, listIotDevices, listIotFirmware } from '../api/iot';

export function IoTFirmwarePage() {
  const [releases, setReleases] = useState<unknown[]>([]);
  const [devices, setDevices] = useState<Array<{ deviceKey: string; name: string }>>([]);
  const [form, setForm] = useState({ releaseKey: '', deviceType: 'temperature_sensor', version: '1.0.0', checksum: '' });

  const reload = () => {
    listIotFirmware().then(setReleases);
    listIotDevices().then((d) => setDevices(d.map((x) => ({ deviceKey: x.deviceKey, name: x.name }))));
  };
  useEffect(() => { reload(); }, []);

  const create = async () => {
    if (!form.releaseKey || !form.checksum) return;
    await createIotFirmware(form);
    reload();
  };

  return (
    <>
      <Header title="Firmware Manager" subtitle="Versiones y despliegue OTA" actions={<Link to="/iot" className="btn">Centro</Link>} />
      <section className="panel">
        <div className="form-row">
          <input placeholder="Release key" value={form.releaseKey} onChange={(e) => setForm({ ...form, releaseKey: e.target.value })} />
          <input placeholder="Versión" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
          <input placeholder="Checksum SHA256" value={form.checksum} onChange={(e) => setForm({ ...form, checksum: e.target.value })} />
          <button type="button" className="btn btn-primary" onClick={create}>Publicar firmware</button>
        </div>
        <table className="data-table">
          <thead><tr><th>Release</th><th>Tipo</th><th>Versión</th><th>Estado</th><th>Desplegar</th></tr></thead>
          <tbody>
            {releases.map((r) => {
              const row = r as { id: string; releaseKey: string; deviceType: string; version: string; status: string };
              return (
                <tr key={row.id}>
                  <td>{row.releaseKey}</td>
                  <td>{row.deviceType}</td>
                  <td>{row.version}</td>
                  <td>{row.status}</td>
                  <td>
                    {devices[0] && (
                      <button type="button" className="btn btn-sm" onClick={() => deployIotFirmware(row.id, devices[0].deviceKey).then(reload)}>
                        → {devices[0].deviceKey}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
