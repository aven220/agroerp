import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { completeMfaLogin } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export function MfaChallengePage() {
  const { user, loading, applyLoginResult } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mfaToken = (location.state as { mfaToken?: string } | null)?.mfaToken;
  const mustChangePassword = (location.state as { mustChangePassword?: boolean } | null)?.mustChangePassword;
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  if (!mfaToken) {
    return <Navigate to="/login" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await completeMfaLogin(mfaToken!, code);
      await applyLoginResult(res);
      if (res.mustChangePassword || mustChangePassword) {
        navigate('/cambiar-contrasena', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código MFA inválido');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-panel">
        <form onSubmit={handleSubmit} className="login-form">
          <h2>Verificación MFA</h2>
          <p>Ingrese el código de su autenticador.</p>
          <label>
            Código TOTP
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
              autoComplete="one-time-code"
            />
          </label>
          {error && <div className="alert alert-error">{error}</div>}
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Verificando...' : 'Verificar'}
          </button>
        </form>
      </div>
    </div>
  );
}
