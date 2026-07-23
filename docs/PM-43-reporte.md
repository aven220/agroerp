# PM-43 — Enterprise Navigation Rebuild

**Fecha:** 2026-07-23  
**Alcance:** Solo frontend. Sin backend, APIs, permisos, rutas ni lógica de negocio.

## Antes → Después

| Antes (PM-42) | Después (PM-43) |
|---------------|-----------------|
| TopBar + **Sidebar fijo** | **Header enterprise** + contenido full-width |
| Menús en árbol lateral (`esb-*`) | Navegación **horizontal** con dropdowns |
| Módulos siempre visibles en rail | Módulos solo al abrir un menú |
| Colapsar / expandir sidebar | Sin panel lateral |
| Sensación de app con sidebar | Sensación de ERP web (Dynamics / Odoo / SAP B1 Web) |

## Layout final

```
┌─────────────────────────────────────────────────────────┐
│ Logo · Empresa · Centro ·     Buscar     · 🔔 · Usuario │
├─────────────────────────────────────────────────────────┤
│ Inicio · Operación ▼ · Gestión ▼ · Reportes ▼ · …      │
└─────────────────────────────────────────────────────────┘
                        Contenido 100% ancho
```

## Componentes eliminados / neutralizados

| Componente / arquitectura | Estado |
|---------------------------|--------|
| `EnterpriseSidebar` (UI) | Stub `null` — ya no monta DOM |
| `esb-nav`, `esb-group`, `esb-block`, `esb-toolbar`, `esb-home`, `esb-divider` | CSS anulado + markup eliminado |
| Sidebar fijo / rail / colapso | Eliminado del shell |
| Hamburguesa / cerrar panel | Eliminados |
| Favoritos vacíos / usuario lateral / buscador lateral | Eliminados |
| `EnterpriseTopBar` como barra sola | Reemplazado por `EnterpriseHeader` |

## Componentes nuevos

| Archivo | Rol |
|---------|-----|
| `EnterpriseHeader.tsx` | Chrome (logo, empresa, centro, buscar, notif, usuario) + nav horizontal |
| `enterprise-nav-pm43.css` | Shell full-bleed + header + dropdowns |
| `AppLayout.tsx` | Solo Header + Main (sin sidebar) |

## Navegación (dropdowns)

Datos existentes (`visibleCategories` / enterprise nav) — sin cambiar rutas ni permisos:

- **Inicio** → enlace directo  
- **Operación** → Compras, Calidad, Inventario, Documentos, Procesos  
- **Gestión** → Productores, Fincas, Lotes  
- **Reportes** → Operativos, Gerenciales, Auditoría, …  
- **Configuración** → Empresa, Usuarios, Roles, Documentos, Inventario, Preferencias, …  
- **Ayuda** → Centro de ayuda, Documentación  

## Ayuda / tutorial

- Auto-onboarding **desactivado**  
- Asistente **OFF** por defecto (`assistantEnabled`)  
- Ayuda operativa: **Ayuda → Centro de ayuda** (`/ayuda`)

## Validación

| Check | Resultado |
|-------|-----------|
| `pnpm exec tsc --noEmit` | OK |
| `pnpm run build` | OK |
| Backend / APIs / permisos / rutas | Sin cambios |

## Score estimado

**~95 / 100** — navegación horizontal enterprise, sin rastro estructural de sidebar.
