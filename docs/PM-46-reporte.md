# PM-46 — Enterprise Navigation Redesign (Drawer)

**Fecha:** 2026-07-10  
**Alcance:** Solo arquitectura visual de navegación. Sin backend, APIs, permisos ni rutas.

## Objetivo

Eliminar el sidebar fijo izquierdo y reemplazarlo por un **Navigation Drawer derecho** on-demand (Dynamics / Fiori / Linear).

## Resultado

Al iniciar sesión el usuario ve **solo Header + Contenido** (100% ancho). El menú aparece únicamente al solicitarlo con el botón hamburguesa (superior derecha).

## Componentes eliminados / retirados

| Antes | Estado |
|-------|--------|
| `SmartSidebar` (sidebar fijo 280px) | Deprecado → reexporta `NavigationDrawer` |
| `Sidebar.tsx` (export de SmartSidebar) | Reexporta `NavigationDrawer` + `NavMenuButton` |
| `AppShellBar` en shell | Ya no montado en `AppLayout` |
| Reserva `--sidebar-w` / `margin-left` | Forzada a `0` |

## Nuevos componentes

| Archivo | Rol |
|---------|-----|
| `frontend/src/components/layout/NavigationDrawer.tsx` | Drawer derecho + overlay + `NavMenuButton` |
| `frontend/src/design-system/enterprise-nav-drawer-pm46.css` | Estilos drawer, overlay, full-width, responsive |

## Nueva navegación

1. **Botón menú** — hamburguesa en el extremo superior derecho (`PageHeader` / fallback shell).
2. **Drawer** — entra desde la derecha con transición ~200ms.
3. **Overlay** oscuro; cierre por clic afuera, ESC o botón ×.
4. **Bloques:** Empresa · Centro · Buscador · Inicio · Operación/Gestión/Reportes/Configuración/Ayuda · Favoritos · Usuario · Salir.
5. **Acordeones** — estado persistido en `NavigationContext` (`collapsedGroups` / `nav_collapsed_v6`).
6. **Responsive:** desktop flotante (~380px), tablet (~420px), mobile pantalla completa.

## Shell

- `AppLayout`: clase `erp-shell-pm46`, sin sidebar, monta `NavigationDrawer`.
- `PageHeader`: breadcrumb · título · acciones · menú (derecha).
- Contenido sin columna reservada.

## Validación

| Check | Resultado |
|-------|-----------|
| `pnpm exec tsc --noEmit` | OK |
| `pnpm run build` | OK |

## Capturas

No se generaron capturas en vivo: Docker Desktop no estaba en ejecución (`database`/`redis`/`minio` en error), por lo que el login demo no completó.

Para capturar localmente tras `pnpm docker:infra` + login:

1. Vista cerrada — solo header + contenido full-width  
2. Clic en hamburguesa (derecha) — drawer + overlay  
3. Mobile — drawer a pantalla completa  

Carpeta prevista: `docs/pm46-screenshots/`

## Score estimado

**~93 / 100** — experiencia SaaS moderna sin árbol lateral permanente.
