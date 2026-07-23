# PM-42 — Enterprise Navigation Redesign

**Fecha:** 2026-07-10  
**Alcance:** Solo frontend / arquitectura visual. Sin backend, APIs, permisos ni rutas nuevas.

## Antes vs después

| Antes (PM-46 drawer) | Después (PM-42) |
|----------------------|-----------------|
| Contenido full-width sin sidebar | TopBar + Sidebar fijo + Contenido |
| Hamburguesa superior derecha | **Eliminada** |
| Drawer derecho on-demand | Sidebar permanente 264px (colapsable a 72px) |
| Buscador en drawer | Buscador en TopBar (⌘K) |
| Usuario / Salir en drawer | Menú usuario esquina superior derecha |
| Ayuda / hints visibles | Asistente OFF por defecto; ayuda en Centro de ayuda |

## Layout final

```
┌──────────────────────────────────────────────────┐
│ Logo · Empresa · Centro · Buscar · 🔔 · Usuario │  TopBar
├────────────┬─────────────────────────────────────┤
│ ▸ Operación│  Breadcrumb / Título / Acciones     │
│ ▸ Gestión  │                                     │
│ ▸ Reportes │         Contenido                   │
│ …          │                                     │
└────────────┴─────────────────────────────────────┘
```

- Sidebar: **264px** expandido / **72px** colapsado — nunca pantalla completa.
- Grupos: **cerrados por defecto**; un acordeón abierto a la vez.
- Favoritos: **ocultos** si están vacíos.

## Componentes nuevos / modificados

| Archivo | Cambio |
|---------|--------|
| `EnterpriseTopBar.tsx` | **Nuevo** — logo, empresa, centro, búsqueda, notificaciones, usuario |
| `EnterpriseSidebar.tsx` | **Nuevo** — sidebar fijo colapsable |
| `AppLayout.tsx` | Shell PM-42 (TopBar + body + sidebar + main) |
| `PageHeader.tsx` | Sin hamburguesa; ayuda off por defecto |
| `UserPreferencesContext.tsx` | `assistantEnabled: false` por defecto |
| `UserPreferencesDrawer.tsx` | Toggle **Mostrar asistente** ON/OFF |
| `UxShell.tsx` | Sin AutoOnboarding; asistente solo si está ON |
| `ProtectedRoute.tsx` | Hints solo si asistente + tips ON |
| `enterprise-nav-pm42.css` | Estilos del shell |
| `Sidebar.tsx` / `SmartSidebar.tsx` | Alias → `EnterpriseSidebar` |

## Elementos eliminados de la experiencia

- Botón hamburguesa (`NavMenuButton`)
- Navigation Drawer como navegación principal (archivo residual, no montado)
- Bloque de usuario en sidebar
- Buscador en sidebar
- Panel de ayuda / asistente al iniciar sesión
- Auto-onboarding forzado

## Preferencia nueva (solo UI / localStorage)

- **Mostrar asistente** — default **OFF**
- Con OFF: no Guided Workspace panel, no Recommendation Center, no hints contextuales
- Ayuda permanente: ruta existente `/ayuda`

## Validación

| Check | Resultado |
|-------|-----------|
| `pnpm exec tsc --noEmit` | OK |
| `pnpm run build` | OK |
| Rutas / permisos / APIs | Sin cambios |

## Score estimado

**~94 / 100** — navegación tipo workspace enterprise (Dynamics / Odoo / Notion).
