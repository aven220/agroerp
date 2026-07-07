import { NavLink } from 'react-router-dom';

const PLATFORM_AREAS = [
  { to: '/formularios/plantillas', label: 'Plantillas', icon: '📚' },
  { to: '/formularios', label: 'Mis Formularios', icon: '📋', end: true },
  { to: '/formularios/campanas', label: 'Campañas', icon: '🎯' },
  { to: '/formularios/recoleccion', label: 'Recolección', icon: '📥' },
  { to: '/formularios/centro-datos', label: 'Centro de Datos', icon: '📊' },
  { to: '/formularios/exportar', label: 'Exportar', icon: '📤' },
] as const;

export function FormsPlatformNav() {
  return (
    <nav className="forms-platform-nav panel" aria-label="Plataforma de captura">
      <div className="forms-platform-nav-intro">
        <strong>Plataforma de Captura</strong>
        <span className="muted">Diseñar → Publicar → Recolectar → Analizar</span>
      </div>
      <div className="forms-platform-nav-links">
        {PLATFORM_AREAS.map((area) => (
          <NavLink
            key={area.to}
            to={area.to}
            end={'end' in area ? area.end : false}
            className={({ isActive }) => `forms-platform-nav-link${isActive ? ' active' : ''}`}
          >
            <span aria-hidden>{area.icon}</span>
            {area.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
