import { useMemo } from 'react';
import { DomainLanding } from '../components/landing/DomainLanding';
import { canAccessPath } from '../config/routePermissions';
import { useAuth } from '../context/AuthContext';

/**
 * PM-46 — Configuración: Empresa · Usuarios · Roles · Numeraciones · dominios · Preferencias.
 * Solo muestra áreas a las que el usuario tiene permiso.
 */
export function ConfigLandingPage() {
  const { hasPermission } = useAuth();

  const modules = useMemo(
    () =>
      [
        { id: 'emp', title: 'Empresa', description: 'Datos fiscales y ficha', to: '/implementacion/empresa', icon: '🏢' },
        { id: 'usr', title: 'Usuarios', description: 'Cuentas de acceso', to: '/implementacion/usuarios', icon: '👥' },
        { id: 'rol', title: 'Roles', description: 'Perfiles y permisos', to: '/implementacion/roles', icon: '🔐' },
        { id: 'ser', title: 'Numeraciones', description: 'Series y consecutivos', to: '/implementacion/documentos', icon: '🔢' },
        { id: 'com', title: 'Compras', description: 'Parámetros y centros', to: '/compras/config', icon: '🛒' },
        { id: 'inv', title: 'Inventario', description: 'Parámetros de stock', to: '/inventario/parametros', icon: '📦' },
        { id: 'wf', title: 'Workflow', description: 'Procesos y aprobaciones', to: '/procesos', icon: '🔄' },
        { id: 'doc', title: 'Documentos', description: 'Plantillas y evidencias', to: '/implementacion/documentos', icon: '📄' },
        { id: 'int', title: 'Integraciones', description: 'Balanzas y conexiones', to: '/implementacion/integraciones', icon: '🔗' },
      ].filter((m) => canAccessPath(m.to, hasPermission)),
    [hasPermission],
  );

  const quickActions = useMemo(
    () =>
      [
        { label: 'Empresa', to: '/implementacion/empresa', primary: true as const },
        { label: 'Preparación', to: '/implementacion/estado' },
      ].filter((a) => canAccessPath(a.to, hasPermission)),
    [hasPermission],
  );

  const pending = useMemo(
    () =>
      [
        { id: 'go', label: 'Revisar Go Live', to: '/implementacion/go-live' },
        { id: 'est', label: 'Estado de preparación', to: '/implementacion/estado' },
      ].filter((p) => canAccessPath(p.to, hasPermission)),
    [hasPermission],
  );

  const activity = useMemo(
    () =>
      [
        { id: 'a1', label: 'Usuarios', to: '/implementacion/usuarios' },
        { id: 'a2', label: 'Roles', to: '/implementacion/roles' },
      ].filter((a) => canAccessPath(a.to, hasPermission)),
    [hasPermission],
  );

  return (
    <DomainLanding
      title="Configuración"
      subtitle="Empresa, accesos, numeraciones y preferencias"
      description="Configure el ERP por área de negocio. Sin módulos técnicos."
      metrics={[
        { label: 'Áreas', value: modules.length, tone: 'teal' },
        { label: 'Puesta en marcha', value: 'Lista', hint: 'Checklist de preparación' },
      ]}
      quickActions={quickActions}
      modules={modules}
      pending={pending}
      activity={activity}
      activityTitle="Accesos frecuentes"
      pendingTitle="Próximas acciones"
      modulesTitle="Áreas de configuración"
    />
  );
}
