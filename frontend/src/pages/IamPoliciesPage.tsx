import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getIamSecurityPolicy, updateIamSecurityPolicy, setupIamMfa, verifyIamMfa } from '../api/iam';

export function IamPoliciesPage() {
  const [policy, setPolicy] = useState<Record<string, unknown> | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  useEffect(() => { getIamSecurityPolicy().then(setPolicy); }, []);

  async function save() {
    if (!policy) return;
    await updateIamSecurityPolicy(policy);
    getIamSecurityPolicy().then(setPolicy);
  }

  return (
    <>
      <Header title="Políticas de Seguridad" actions={<Link to="/iam" className="btn">Centro Seguridad</Link>} />
      {policy && (
        <form className="panel form-panel" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="form-row">
            <label>Longitud mínima<input type="number" value={Number(policy.minPasswordLength)} onChange={(e) => setPolicy({ ...policy, minPasswordLength: Number(e.target.value) })} /></label>
            <label>Intentos máx.<input type="number" value={Number(policy.maxFailedAttempts)} onChange={(e) => setPolicy({ ...policy, maxFailedAttempts: Number(e.target.value) })} /></label>
            <label>Bloqueo (min)<input type="number" value={Number(policy.lockoutMinutes)} onChange={(e) => setPolicy({ ...policy, lockoutMinutes: Number(e.target.value) })} /></label>
            <label>MFA obligatorio<input type="checkbox" checked={Boolean(policy.mfaRequired)} onChange={(e) => setPolicy({ ...policy, mfaRequired: e.target.checked })} /></label>
          </div>
          <button type="submit" className="btn btn-primary">Guardar políticas</button>
        </form>
      )}
      <section className="panel">
        <h3>MFA TOTP</h3>
        <button type="button" className="btn" onClick={() => setupIamMfa().then((r) => alert(`Secreto: ${r.secret}\n${r.otpauth}`))}>Configurar TOTP</button>
        <div className="form-row">
          <input value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} placeholder="Código 6 dígitos" />
          <button type="button" className="btn btn-primary" onClick={() => verifyIamMfa(mfaCode)}>Verificar</button>
        </div>
      </section>
    </>
  );
}
