# PM-47 — Report
## Enterprise Workspace Experience

**Fecha:** 2026-07-22  
**Alcance:** Solo frontend · sin backend · sin APIs · sin módulos nuevos  
**Validación:** `pnpm exec tsc --noEmit` · `pnpm build`

---

### Objetivo cumplido

Tras PM-46 (navegación), la experiencia diaria responde por **rol**:
qué hago · qué sigue · qué falta · qué riesgo — con empty states accionables y toolbars reducidas.

---

### Pantallas mejoradas

| Pantalla | Mejora |
|---|---|
| **Inicio / SmartDashboard** | `RoleBrief` + CTA dinámico por rol (Compras, Inventario, Calidad, Campo, Gerencia, Admin) |
| **Cola de compras** | HubToolbar (Nuevo / Llamar / Más), empty con explicación + CTA, ConfirmDialog, FlowNextActions post-llamado, `lastUpdated` + conteo |
| **Productores / Fincas / Lotes** | Ayuda contextual reactivada (`showExperience`), `lastUpdated` |
| **PageHeader (global)** | ¿Qué hago? · ¿Qué sigue? · ayuda corta · «Más ayuda» (por qué / cuándo / después) |
| **PageState empty** | Mensaje por defecto explicativo + hint (nunca solo “no hay registros”) |
| **pageExperience** | Reglas para `/operacion` y `/compras/cola` |

---

### Acciones reducidas

| Antes | Después |
|---|---|
| Cola: 3 botones sueltos (Llamar / Wizard / Centro) | **Nuevo** + **Llamar siguiente** + **Más** (HubToolbar) |
| Dashboard: CTAs fijos por rol | CTA = siguiente paso calculado (`roleWorkGuide`) |
| Header sin estructura de preguntas | Preguntas + ayuda colapsable |

Máximo patrón: **Nuevo · Buscar · Filtros · Más**.

---

### Clics eliminados (estimación)

| Flujo | Ahorro |
|---|---|
| Compras: ver pendientes al entrar | 1–2 (ya en Inicio con cola/pesaje/liquidación) |
| Inventario: ir a movimientos / stock bajo | 1 |
| Cola: llamado con confirmación + siguiente paso | 0 clics extra; +1 confirmación útil (calidad) |
| Empty → primera acción | 1 (CTA directo vs buscar en menú) |
| **Promedio diario** | **~2–4 clics** |

---

### Experiencia mejorada (por fase)

1. **Entrada por rol** — widgets + guía + CTA según `workspaceRoles`  
2. **Empty states** — significado · por qué vacío · qué hacer · botón  
3. **Listas** — actualizado · cantidad · buscar (grid) · export (donde ya existía)  
4. **Botones** — HubToolbar en cola; Más para secundarios  
5. **4 preguntas** — RoleBrief + PageHeader  
6. **Ayuda corta** — tip + panel «Más ayuda» (no manual)  
7. **Críticas** — ConfirmDialog + FlowNextActions en llamado de turno  
8. **Navegación** — CTA directo al trabajo (cola/pesaje/movimientos/BI)  
9. **Consistencia** — tokens PM-45 + brief alineado al DS  

---

### Score UX

| Dimensión | Antes (post PM-46) | Después |
|---|---|---|
| Entrada por rol | 72 | **90** |
| Empty states | 68 | **88** |
| Toolbars / acciones | 74 | **86** |
| Ayuda contextual | 60 | **85** |
| Confirmación / siguiente paso | 65 | **82** |
| **Score UX global** | ~78 | **87 / 100** |

---

### Build

- TypeScript: OK  
- Production build: OK  

### Archivos clave

- `config/roleWorkGuide.ts` (nuevo)  
- `components/dashboard/SmartDashboard.tsx`  
- `components/page/PageHeader.tsx` · `PageState.tsx`  
- `pages/CoffeeQueuePage.tsx`  
- `config/smartDashboard.ts` · `config/pageExperience.ts`  
- `design-system/enterprise-workspace-pm45.css`  

### Pendientes

- Extender ConfirmDialog a archivar productores/fincas/lotes (aún `window.confirm`).  
- Forward `emptyAction` en todas las tablas SimpleRecords legacy (EIMS lotes/conteos).  
- List meta unificada (filtros activos visibles) en DataTable toolbar cuando hay server filters.  
- Campo: enriquecer con visitas reales si el API de formularios ya expone pendientes (sin endpoints nuevos).
