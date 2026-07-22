# PM-46 — Report
## Enterprise Navigation Refinement

**Fecha:** 2026-07-22  
**Alcance:** Solo frontend · sin backend · sin APIs · sin permisos · sin lógica de negocio  
**Validación:** `pnpm exec tsc --noEmit` · `pnpm build`

---

### Árbol nuevo (5 pilares)

```
Inicio
Operación
  ├─ Compras
  ├─ Productores
  ├─ Fincas
  ├─ Lotes
  ├─ Calidad
  ├─ Inventario
  ├─ Documentos
  └─ Procesos
Reportes
  ├─ Operativos
  ├─ Gerenciales
  ├─ Auditoría
  └─ BI
Configuración
  ├─ Empresa
  ├─ Usuarios
  ├─ Roles
  ├─ Numeraciones
  ├─ Compras
  ├─ Inventario
  ├─ Workflow
  ├─ Documentos
  ├─ Integraciones
  └─ Preferencias
Ayuda
  ├─ Centro de ayuda
  └─ Preparación
```

---

### Rutas eliminadas del menú (visibles)

| Antes | Ahora |
|---|---|
| Grupo **Empresa** (organización, sucursales, centros) | Absorbido en **Configuración** |
| Grupo **Analítica** | Renombrado/reemplazado por **Reportes** |
| Mi Día (duplicado de Inicio) | Solo **Inicio** → `/operacion` |
| Dashboard Ejecutivo / Indicadores / BI sueltos | **Gerenciales** · **Operativos** · **BI** |
| Accesos IAM / EIMS / CPEP / Ops Center en menú | Eliminados del sidebar |
| Manual duplicado (mismo `/ayuda`) | Eliminado |
| Estado del sistema | **Preparación** |

Rutas profundas **siguen existiendo** (no se borraron del router) para no romper deep-links, permisos ni EIC.

---

### Rutas fusionadas / puente

| Ruta | Acción |
|---|---|
| `/inicio-workspace` | Redirige a `/operacion` (pantalla puente eliminada) |
| `/` | Sigue redirigiendo al home del centro activo |
| Landings Config / Reportes | Reorganizados a lenguaje empresarial |

Pantallas con datos reales (no solo redirect) se **relabelaron**, no se borraron:
- `/compras/ops` → “Operación de compras”
- `/inventario/ops` → “Operación de inventario”
- `/operaciones` → “Monitoreo técnico” (fuera del menú)
- `/administracion` → “Usuarios y roles”

---

### Nuevos grupos

| Grupo | Contenido |
|---|---|
| **Operación** | Dominios de negocio (no módulos técnicos) |
| **Reportes** | Operativos · Gerenciales · Auditoría · BI |
| **Configuración** | 10 áreas de setup empresarial |
| **Ayuda** | Ayuda + Preparación |

---

### Accesos simplificados

- Sidebar: **5 pilares** (antes 6+ con Empresa/Analítica y duplicados).
- Acordeón: **todos colapsados por defecto** (`DEFAULT_EXPANDED = []`, storage `nav_collapsed_v5`).
- Solo se abre el grupo de la ruta activa (nunca expandir todo).
- Breadcrumbs: raíz siempre `Inicio | Operación | Reportes | Configuración | Ayuda`.
- Centros de experiencia: etiquetas sin “Centro de …” / Management / Platform.
- Command Palette: bloquea `/operaciones` e `/inicio-workspace`; permite `/iam/auditoria` como Auditoría.

---

### Clics ahorrados (estimación)

| Flujo | Antes | Después | Ahorro |
|---|---|---|---|
| Ir a Compras desde home | 2–3 (expandir + Mi Día/Compras) | 2 (Operación → Compras) | ~1 |
| Ir a Usuarios | 2–3 vía Empresa o IAM | 2 (Configuración → Usuarios) | ~1 |
| Ir a Reportes BI | 2–3 vía Analítica | 2 (Reportes → BI) | ~1 |
| Evitar puente workspace | 1 click perdido | 0 | 1 |
| **Promedio diario (usuario operativo)** | — | — | **~3–5 clics/día** |

---

### Resultado esperado

El usuario percibe **un solo ERP** con cinco puertas:
**Inicio · Operación · Reportes · Configuración · Ayuda.**

No ve IAM, EIMS, CPEP, Ops Center, Workspace, Administration ni Master Data como títulos de menú.

---

### Build

- TypeScript: OK (`tsc --noEmit`)  
- Production build: OK (`pnpm build`)

### Pendientes menores

- Depurar del router rutas de monitoreo `/operaciones/*` si producto confirma que no se usan en piloto.
- Unificar `/implementacion/documentos` (Numeraciones + Documentos) en dos destinos distintos si se crean pantallas separadas.
- Actualizar textos residuales “Centro de …” en módulos fuera del paquete coop (Finanzas, SCM, etc.).
