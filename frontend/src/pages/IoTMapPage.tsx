import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getIotDeviceMap, type IotDevice } from '../api/iot';

export function IoTMapPage() {
  const [devices, setDevices] = useState<IotDevice[]>([]);
  useEffect(() => { getIotDeviceMap().then(setDevices); }, []);

  return (
    <>
      <Header title="Mapa de dispositivos" subtitle="Ubicación GPS y estado" actions={<Link to="/iot" className="btn">Centro</Link>} />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Dispositivo</th><th>Tipo</th><th>Estado</th><th>Lat</th><th>Lng</th><th>Última conexión</th></tr></thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td>{d.deviceType}</td>
                <td>{d.status}</td>
                <td>{d.latitude?.toFixed(5) ?? '—'}</td>
                <td>{d.longitude?.toFixed(5) ?? '—'}</td>
                <td>{d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
