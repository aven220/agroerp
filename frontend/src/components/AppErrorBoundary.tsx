import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Evita pantalla en blanco total si un provider/página lanza en runtime. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AGROERP] UI crash', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: 480, margin: '10vh auto' }}>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No se pudo cargar AGROERP</h1>
          <p style={{ color: '#555', marginBottom: '1rem' }}>
            {this.state.error.message || 'Error inesperado en la interfaz.'}
          </p>
          <button
            type="button"
            style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
            onClick={() => {
              try {
                localStorage.removeItem('agroerp_token');
                localStorage.removeItem('agroerp_refresh');
              } catch {
                /* ignore */
              }
              window.location.href = '/login';
            }}
          >
            Ir al login
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
