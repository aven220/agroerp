import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  activateIotDevice,
  assignIotDevice,
  deactivateIotDevice,
  listIotDevices,
  registerIotDevice,
  type IotDevice,
} from '../api/iot';

export function IoTDevicesPage() {
  const [devices, setDevices] = useState<IotDevice[]>([]);
  const [form, setForm] = useState({ deviceKey: '', name: '', deviceType: 'temperature_sensor', protocol: 'mqtt' });

  const reload = () => listIotDevices().then(setDevices);
  useEffect(() => { reload(); }, []);

  const create = async () => {
    if (!form.deviceKey || !form.name) return;
    await registerIotDevice(form);
    setForm({ deviceKey: '', name: '', deviceType: 'temperature_sensor', protocol: 'mqtt' });
    reload();
  };

  return (
    <>
      <Header
        title="Administrador de dispositivos"
        subtitle="Registro, activación y asignación"
        actions={<Link to="/iot" className="btn">Centro</Link>}
      />
      <section className="panel">
        <div className="form-row">
          <input placeholder="Clave" value={form.deviceKey} onChange={(e) => setForm({ ...form, deviceKey: e.target.value })} />
          <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select value={form.deviceType} onChange={(e) => setForm({ ...form, deviceType: e.target.value })}>
            <option value="temperature_sensor">Temperatura</option>
            <option value="humidity_sensor">Humedad</option>
            <option value="electronic_scale">Balanza</option>
            <option value="gps_tracker">GPS</option>
            <option value="weather_station">Meteorológica</option>
            <option value="ble_beacon">BLE</option>
            <option value="rfid_reader">RFID</option>
            <option value="nfc_reader">NFC</option>
            <option value="qr_scanner">QR</option>
            <option value="energy_meter">Energía</option>
          </select>
          <button type="button" className="btn btn-primary" onClick={create}>Registrar</button>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Dispositivo</th><th>Tipo</th><th>Protocolo</th><th>Estado</th><th>Batería</th><th>Señal</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id}>
                <td><strong>{d.name}</strong><br /><small>{d.deviceKey}</small></td>
                <td>{d.deviceType}</td>
                <td>{d.protocol}</td>
                <td>{d.status}</td>
                <td>{d.batteryLevel ?? '—'}%</td>
                <td>{d.signalQuality ?? '—'}</td>
                <td className="row-actions">
                  <button type="button" className="btn btn-sm" onClick={() => activateIotDevice(d.deviceKey).then(reload)}>Activar</button>
                  <button type="button" className="btn btn-sm" onClick={() => deactivateIotDevice(d.deviceKey).then(reload)}>Desactivar</button>
                  <button type="button" className="btn btn-sm" onClick={() => assignIotDevice(d.deviceKey, { tags: ['field'] }).then(reload)}>Asignar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
