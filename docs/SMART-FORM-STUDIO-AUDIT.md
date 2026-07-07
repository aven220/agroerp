# Smart Form Studio — Auditoría y propuesta 2.0

**Fecha:** Julio 2026  
**Alcance:** Solo análisis (sin cambios de código, UI ni base de datos)  
**Contexto:** UDFE + Capture Engine operativo (API móvil, Processing Engine, Analytics). Este documento audita el diseñador actual y propone evolución hacia **Smart Form Studio 2.0**.

---

## 1. Resumen ejecutivo

El Smart Form Studio actual es un **editor funcional de nivel MVP+** con biblioteca rica de componentes, vista previa multi-dispositivo, simulador básico y persistencia JSON compatible con backend UDFE y cliente Android. Sin embargo, existen **brechas significativas** entre lo que el catálogo promete, lo que el inspector permite configurar, lo que el renderer web muestra y lo que Android/Capture ejecutan en producción.

La propuesta 2.0 no reemplaza EBIAP ni crea un BI nuevo: alinea el Studio con **Capture Engine** (paquete offline, catálogos, `processingType`, render server-side) y cierra la brecha diseño → runtime en web y móvil.

---

## 2. Arquitectura actual

```
┌─────────────────────────────────────────────────────────────────┐
│                    FormDesignerPage (Web)                        │
│  Plantillas · Diseño · Componentes · Preview · Simulador · JSON │
└────────────┬────────────────────────────────────────────────────┘
             │ createForm / updateForm (schema JSON)
             ▼
┌─────────────────────────────────────────────────────────────────┐
│  FormDefinition (PostgreSQL)                                     │
│  schema: { version, fields[], sections?, settings? }             │
│  metadata: { processingType?, ... }  ← no expuesto en Studio UI  │
└────────────┬────────────────────────────────────────────────────┘
             │ publish
             ▼
┌──────────────────────┐     ┌──────────────────────────────────┐
│ Capture Package API  │────▶│ Android (render + offline + sync) │
│ render JSON          │     └──────────────────────────────────┘
└──────────────────────┘
             │
             ▼
┌──────────────────────┐     ┌──────────────────────────────────┐
│ Submission Processor │────▶│ Capture Analytics → EBIAP events  │
└──────────────────────┘     └──────────────────────────────────┘
```

**Archivos clave**

| Capa | Ruta |
|------|------|
| Studio UI | `frontend/src/pages/FormDesignerPage.tsx` |
| Biblioteca | `frontend/src/form-studio/` |
| Inspector reglas | `frontend/src/components/forms/ConditionalRuleEditor.tsx` |
| Inspector opciones | `frontend/src/components/forms/FieldOptionsEditor.tsx` |
| Render web | `frontend/src/form-studio/FormStudioRenderer.tsx` → `FormFieldControl.tsx` |
| Esquema compartido | `shared/src/index.ts` (`FormDefinitionSchema`, `FormFieldDefinition`) |
| DTO backend | `backend/src/core/forms/presentation/forms.dto.ts` |
| Render servidor | `backend/src/core/forms/application/form-renderer.service.ts` |
| Validación | `backend/src/core/forms/application/form-validation.engine.ts` |
| Capture render | `backend/src/core/capture/application/capture-query.service.ts` |
| Catálogos Capture | `backend/src/core/capture/domain/catalogs/capture-catalog.registry.ts` |
| Catálogos Studio (demo) | `frontend/src/form-studio/form-dynamic-catalogs.ts` |

---

## 3. Estado actual — Frontend

### 3.1 ComponentLibraryPanel

**Ubicación:** `frontend/src/form-studio/ComponentLibraryPanel.tsx`  
**Fuente de verdad:** `frontend/src/form-studio/form-field-catalog.ts`

#### Categorías (`STUDIO_COMPONENT_GROUPS`)

| Grupo | Componentes |
|-------|-------------|
| Texto y datos | text, textarea, email, phone, url, number, currency, color |
| Selección | select, multi_select, radio, checkbox/boolean, autocomplete, cascade_geo, switch |
| Fecha y hora | date, time, datetime |
| Multimedia | photo, gallery, signature, audio, video, file |
| Ubicación | geo, map |
| Códigos | qrcode, barcode |
| Layout | heading, separator, html |
| Avanzado | repeat_group, subform, calculated, matrix, likert, rating |

**Total:** ~35 definiciones en catálogo (algunos comparten `type` base, p. ej. email/phone son `text` + metadata).

#### Tipos soportados en catálogo vs runtime

| Tipo Studio | En catálogo | FormFieldControl (web) | Android | Backend validación |
|-------------|-------------|------------------------|---------|-------------------|
| text / textarea / number / currency | ✅ | ✅ | ✅ | ✅ |
| select / radio / multi_select / boolean | ✅ | ✅ | ✅ | ✅ |
| date / time / datetime | ✅ | ✅ | ⚠️ time/datetime como texto | ✅ |
| photo / signature / file / gallery | ✅ | ⚠️ file input simulado | ✅ foto/firma | ✅ |
| geo / map | ✅ | ✅ manual + GPS | ✅ | ✅ |
| qrcode / barcode | ✅ | ⚠️ como text | ⚠️ como text | ✅ barcode |
| calculated | ✅ | ✅ solo lectura | ✅ | N/A |
| repeat_group / subform | ✅ | ⚠️ una sola fila | ❌ fallback text | ⚠️ array |
| matrix | ✅ | ❌ fallback text | ❌ fallback text | ⚠️ pasa valor |
| likert / rating / scale | ✅ | ⚠️ range genérico | ✅ rating | ⚠️ laxo |
| audio / video | ✅ | ⚠️ file | ⚠️ usa PhotoField | ✅ |
| heading / separator / html | ✅ | ✅ | parcial | N/A layout |

#### Capacidades del panel

- Búsqueda por label/descripción.
- Agrupación por categoría.
- Modo aprendizaje (clic derecho): casos de uso, tips, errores comunes.
- **No** arrastrar y soltar; solo clic para agregar al canvas.
- **No** vista previa del componente en la paleta.

---

### 3.2 FormStudioRenderer

**Ubicación:** `frontend/src/form-studio/FormStudioRenderer.tsx`

#### Comportamiento

1. Resuelve visibilidad y obligatoriedad:
   - **Cliente:** `client-conditional.ts` → `resolvePreviewFields`.
   - **Servidor (opcional):** `serverFields` desde `POST /forms/:id/render`.
2. Enriquece opciones dinámicas vía `resolveCatalogOptions` (`metadata.catalogKey` + `dynamicList`).
3. Delega render a `FormFieldControl` por cada campo visible.

#### Limitaciones

| Limitación | Impacto |
|------------|---------|
| Lista plana de `fields[]`; ignora `sections[]` y `settings.layoutMode` | Pestañas/acordeón configurados en Studio no se reflejan en preview |
| `repeat_group` sin UI de agregar/quitar filas | Tablas repetitivas no son probables fielmente |
| `matrix` sin renderer dedicado | Tipo en catálogo pero no usable en preview |
| Catálogos solo desde `DYNAMIC_CATALOGS` local | No consume `GET /capture/catalogs` ni ERP real |
| Sin evaluación de `calculated` en cliente preview | Depende de server render o valor vacío |
| Prop `useServerRender` declarada pero no usada | Código muerto / confusión |

---

### 3.3 FormStudioPreview

**Ubicación:** `frontend/src/form-studio/FormStudioPreview.tsx`

#### Dispositivos

| Device ID | Etiqueta | Comportamiento |
|-----------|----------|----------------|
| `desktop` | Escritorio | Marco CSS ancho |
| `tablet` | Tablet | Marco intermedio |
| `phone-portrait` | Teléfono | Marco estrecho |
| `phone-landscape` | Teléfono horizontal | Marco apaisado |

#### Diferencias escritorio vs móvil

- **Solo CSS** (`device-${device}` en `.form-studio-device-frame`): no cambia componentes ni interacciones.
- Mismo `FormStudioRenderer` y mismos controles HTML nativos (`<input type="file">`, `<select>`, etc.).
- **No** emula comportamiento Android (cámara nativa, firma canvas, compresión, offline).
- **No** muestra barra de estado, GPS obligatorio ni indicadores de sync.

**Conclusión:** útil para responsive básico; **no** es un emulador fiel del cliente Capture.

---

### 3.4 FormSimulator

**Ubicación:** `frontend/src/form-studio/FormSimulator.tsx`

#### Validaciones actuales

- Campos **visibles** con `effectiveRequired === true`.
- Vacío: `undefined`, `null`, `''`, array vacío.
- **No valida:** pattern, min/max, GPS accuracy, tipos media, calculated, reglas de negocio backend.
- **No ejecuta:** `FormValidationEngine` del servidor.
- Al enviar: muestra JSON local; **no persiste** ni llama submit API.

#### Capacidades

- Limpiar datos / reiniciar tras envío simulado.
- Selector de dispositivo (hereda `FormStudioPreview`).
- Botones de acción en campos `button` (`reset`, `submit`).

#### Limitaciones

- Sin borrador (`allowDraft`).
- Sin simulación de offline/sync.
- Sin feedback de errores por campo (solo lista global).
- Sin integración con Capture Package preview.

---

### 3.5 ConditionalRuleEditor

**Ubicación:** `frontend/src/components/forms/ConditionalRuleEditor.tsx`

#### Reglas soportadas en UI

| Operador | UI | Backend (`shared`) |
|----------|-----|-------------------|
| eq, neq | ✅ | ✅ |
| not_empty, empty | ✅ | ✅ |
| gt, gte, lt, lte | ✅ | ✅ |
| in, not_in | ❌ | ✅ |

#### Capacidades

- Una sola regla por `visibleWhen` / `requiredWhen` (no lista AND/OR visual).
- Selector de campo referencia (excluye heading, separator, hidden).
- Valor libre con coerción básica (true/false/número).

#### Limitaciones

| Limitación | Impacto |
|------------|---------|
| No edita `readOnlyWhen` | Regla en schema sin soporte Studio |
| No reglas a nivel `sections[].visibleWhen` | Secciones condicionales solo vía JSON |
| No operadores `in` / `not_in` | Menor expresividad que backend |
| No preview inline de la regla | Usuario debe ir a Preview/Simulador |
| Una regla; schema permite array (AND implícito) | Arrays solo editables en pestaña JSON |

---

### 3.6 FieldOptionsEditor

**Ubicación:** `frontend/src/components/forms/FieldOptionsEditor.tsx`

#### Configuración disponible

- Filas valor/etiqueta editables.
- Agregar / quitar opciones.
- Tipos que lo usan: `select`, `multi_select`, `radio`, `checkbox` (con opciones).

#### Limitaciones

| Limitación | Impacto |
|------------|---------|
| No edita `metadata.rows` (matrix) | Matriz incompleta |
| No `apiSource` para autocomplete ERP | Solo opciones estáticas |
| No importar CSV / catálogo | Listas largas manuales |
| No ordenar opciones (drag) | UX tediosa |
| Catálogo dinámico en inspector separado | Confusión manual vs dinámico |

---

### 3.7 FormDesignerPage — capacidades adicionales

| Función | Estado |
|---------|--------|
| Guardar borrador (`CreateFormDto` / `UpdateFormDto`) | ✅ |
| Publicar / enviar a revisión / versiones | ✅ |
| Plantillas (`form-templates-library.ts`) | ✅ ~10 plantillas sectoriales |
| Layout mode: flat / tabs / accordion | ⚠️ guardado en schema, no renderizado |
| Secciones (`sections[]`) | ⚠️ asignación por campo, sin editor visual de tabs |
| Lista dinámica (dropdown catálogos demo) | ✅ 10 catálogos locales |
| Inspector: clave, etiqueta, sección, required, description | ✅ |
| Inspector: calculated, validation, metadata JSON | ❌ solo vía JSON/plantilla |
| `processingType` ERP | ❌ no en UI |
| `requireGps` / geofence / offline | ❌ hardcoded `offlineCapable: true, allowDraft: true` |
| Pestaña JSON / Reglas | ✅ export schema completo |

---

## 4. Estado actual — Backend y persistencia

### 4.1 Cómo se guarda un formulario

```
FormDefinition
├── formKey, name, description, version, status
├── schema (JSON) ─────────────────────────────────────┐
│   ├── version: number                                │
│   ├── fields: FormFieldDefinition[]                  │
│   ├── sections?: FormSectionDefinition[]             │
│   └── settings?: FormSettings                        │
├── metadata (JSON) ← processingType, integración ERP  │
├── sectorCode, commodityCode, tags, workflowKey       │
└── aiReadiness (JSON)                                 │
```

**DTO:** `CreateFormDto` / `UpdateFormDto` — `schema` es `FormDefinitionSchema` tipado desde `@agroerp/shared`. **No** hay campos dedicados en DTO para `processingType`; va en `FormDefinition.metadata` (columna separada del schema).

### 4.2 Campos (`FormFieldDefinition`)

| Aspecto | Dónde se guarda |
|---------|-----------------|
| Identidad | `key`, `type`, `label`, `description` |
| Layout | `sectionKey` |
| Obligatoriedad | `required`, `requiredWhen` |
| Visibilidad | `visibleWhen` |
| Solo lectura | `readOnly`, `readOnlyWhen` |
| Opciones estáticas | `options[]` |
| Listas dinámicas | `metadata.catalogKey`, `metadata.dynamicList` |
| Validación | `validation.{min,max,pattern,...}` |
| Cálculos | `calculate.{expression,dependsOn}` |
| Anidados | `fields[]` (repeat_group/subform) |
| Matriz | `matrix` o `metadata.rows` + `options` |
| Relaciones ERP | `relationTo`, `apiSource` |
| Multimedia | `type` + `metadata.accept`, `maxFiles` |
| Defaults | `defaultValue`, `inheritFrom` |

### 4.3 Render JSON (Capture)

`CaptureQueryService.getFormDefinition` + paquete móvil devuelven:

```typescript
render: {
  schemaVersion: number;
  settings?: FormSettings;
  fields: RenderedField[];  // visible, effectiveRequired, computedValue
  resolvedData: Record<string, unknown>;
}
```

El Studio **no consume** este contrato en preview; solo llama `renderForm` parcialmente en pestaña Preview.

### 4.4 Settings offline

| Setting | Schema (`FormSettings`) | Studio UI | Capture Package |
|---------|-------------------------|-----------|-----------------|
| `offlineCapable` | ✅ | Siempre `true` al guardar | ✅ en `offline` por form |
| `allowDraft` | ✅ | Siempre `true` | ✅ |
| `requireGps` | ✅ | ❌ no editable | ✅ por form |
| `geofence` | ✅ | ❌ no editable | ✅ opcional |
| `layoutMode` | ⚠️ extensión frontend | ✅ selector | ❌ no en shared FormSettings |

### 4.5 Catálogos

| Fuente | Alcance | Dependencias |
|--------|---------|--------------|
| `options[]` en campo | Estático | Ninguna |
| `DYNAMIC_CATALOGS` (frontend) | Demo 10 catálogos | `dependsOn` por key padre |
| `CAPTURE_CATALOG_REGISTRY` (backend) | Mismo dataset demo | `GET /capture/catalogs` |
| ERP / Metadata Engine | **No conectado** | Futuro |

**Desalineación:** keys de dependencia en cadena geográfica usan `pais`/`departamento` en `buildGeoCascadeFields`, pero catálogo `departamentos` depende de `pais` mientras el campo cascade_geo crea `depto_*` — requiere disciplina de keys al diseñar.

### 4.6 Procesamiento ERP (`processingType`)

| Ubicación | Valores | Studio UI |
|-----------|---------|-----------|
| `FormDefinition.metadata.processingType` | `PRODUCER_CREATE`, `FARM_CREATE`, `PRODUCTION_CREATE` | ❌ No expuesto |
| Capture Processing Engine | Lee metadata post-submit | N/A diseño |
| Capture Analytics | Eventos `PRODUCER_CREATED`, etc. | N/A diseño |

### 4.7 Multimedia

| Tipo | Web Studio | Android | Sync |
|------|------------|---------|------|
| photo | UUID simulado | Cámara + compresión | `files/register` + refs en submission |
| signature | file input | Canvas PNG | Igual |
| gallery | multi UUID | ⚠️ como photo simple | Parcial |
| file/pdf/video/audio | file input | limitado | Backend valida ref UUID |

---

## 5. Limitaciones consolidadas

### 5.1 Brecha diseño → runtime

1. **Tipos en catálogo ≠ render real** (matrix, repeat_group multi-fila, map interactivo).
2. **Layout tabs/accordion** guardado pero no renderizado en Studio ni Android.
3. **Catálogos demo** duplicados frontend/backend; sin ERP vivo.
4. **`processingType`** crítico para Capture Processing; invisible para el diseñador.
5. **Settings GPS/offline** no configurables visualmente.
6. **Simulador** no usa validación servidor ni refleja móvil.

### 5.2 Brecha web → Android

| Capacidad | Web | Android |
|-----------|-----|---------|
| repeat_group multi-fila | ❌ | ❌ |
| matrix | ❌ | ❌ |
| html/markdown rico | parcial | mínimo |
| barcode/QR scan | ❌ | ❌ (texto) |
| Catálogos offline Capture | N/A | paquete (no diseñador) |
| Wizard por secciones | ❌ | ❌ |

### 5.3 Brecha Studio → Capture Engine

- Studio guarda schema UDFE; Capture enriquece con `render` + `offline` + `requiredCatalogKeys` al publicar.
- Diseñador no previsualiza paquete móvil ni check de versión.
- No hay asistente de mapeo campo → entidad ERP (processingType + field mapping).

### 5.4 UX / Producto

- Inspector fragmentado (opciones, catálogo, reglas en paneles distintos).
- Sin validación de schema en tiempo real (claves duplicadas, dependsOn rotas).
- Sin diff entre versiones de formulario.
- JSON tab como escape hatch para power users — riesgo de errores.

---

## 6. Smart Form Studio 2.0 — Arquitectura propuesta

### 6.1 Principios

1. **Single source of truth:** `FormDefinitionSchema` en shared; Studio edita vista, no duplica tipos.
2. **Render parity:** Preview usa mismo pipeline que Capture (`/forms/:id/render` o `/capture/forms/:id`).
3. **Progressive disclosure:** Modo simple (80% casos) + modo avanzado (JSON, expresiones).
4. **Capture-native:** Paquete offline, catálogos y `processingType` son ciudadanos de primera clase en UI.
5. **No nuevo BI:** Analytics siguen vía eventos existentes hacia EBIAP.

### 6.2 Modelo de datos extendido (sin romper DB)

Todo sigue en `schema` + `metadata` JSON existentes:

```json
{
  "metadata": {
    "processingType": "PRODUCER_CREATE",
    "erpMapping": {
      "legalName": "nombre_completo",
      "documentNumber": "cedula"
    },
    "capture": {
      "packageHints": ["requiresCatalogs"],
      "analyticsProfile": "producer_onboarding"
    }
  },
  "schema": {
    "settings": {
      "offlineCapable": true,
      "allowDraft": true,
      "requireGps": true,
      "layoutMode": "tabs"
    },
    "fields": [ "..."]
  }
}
```

### 6.3 Módulos funcionales propuestos

```
Smart Form Studio 2.0
├── Component Library Pro
│   ├── Catálogo alineado a FORM_FIELD_TYPES (shared)
│   └── Badges de soporte: Web | Android | Capture
├── Visual Canvas
│   ├── Drag & drop + secciones/tabs reales
│   └── Repeat groups y matrix editables
├── Field Inspector Pro
│   ├── Validación visual
│   ├── Calculated expression builder
│   ├── Catalog picker (estático / Capture API / ERP)
│   └── Conditional rules (multi-regla, in/not_in)
├── Capture Panel (nuevo)
│   ├── processingType selector
│   ├── ERP field mapping preview
│   ├── Offline/GPS/geofence toggles
│   └── Catalog dependency graph
├── Runtime Preview
│   ├── Server render obligatorio
│   ├── Device frames + Android behavior notes
│   └── Package preview (check-version)
└── Simulator Pro
    ├── Server-side validation
    ├── Draft vs submit
    └── Mock sync (sin persistir producción)
```

### 6.4 Soporte objetivo por tipo de campo

| Tipo | Studio 2.0 | Web runtime | Android | Capture |
|------|------------|-------------|---------|---------|
| Texto / número / fecha | Editor completo | ✅ | ✅ | ✅ |
| Selección estática | Options + import | ✅ | ✅ | ✅ |
| Listas dinámicas | Picker catálogo Capture | ✅ | ✅ | ✅ offline |
| Listas dependientes | Graph editor | ✅ | ✅ | ✅ |
| GPS | Settings + campo | ✅ | ✅ | ✅ |
| Fotografía / firma | Preview real | Mejorar | ✅ | ✅ |
| Documentos | accept/MIME UI | Mejorar | Mejorar | ✅ |
| Tablas (matrix) | Grid editor | **Nuevo renderer** | **Nuevo** | Validar |
| Repetidores | Multi-row UI | **Nuevo** | **Nuevo** | Array sync |
| calculatedFields | Expression builder | Server+client | ✅ | ✅ |

### 6.5 Reglas condicionales 2.0

- Editor visual para `visibleWhen`, `requiredWhen`, `readOnlyWhen`.
- Soporte array de reglas (AND) + modo OR futuro.
- Operadores completos: `in`, `not_in`.
- Preview en vivo en inspector.
- Reglas a nivel sección.

### 6.6 Catálogos 2.0

| Tipo | Fuente | Studio |
|------|--------|--------|
| Estáticos | `options[]` | FieldOptionsEditor mejorado |
| Dinámicos Capture | `GET /capture/catalogs` | Picker con keys del registry |
| Dependientes | `dependsOn` + parent field | Visual chain builder |
| ERP vivo | Metadata / PRM / FTIP | Fase 3 — apiSource |

### 6.7 Integración ERP (`processingType`)

Panel dedicado en Studio:

| processingType | Entidad | Campos mínimos sugeridos |
|----------------|---------|--------------------------|
| `PRODUCER_CREATE` | Productor | legalName, documentNumber, documentTypeCode |
| `FARM_CREATE` | Finca | farmName, municipalityCode, producerId |
| `PRODUCTION_CREATE` | Lote productivo | lotName, ftipLotUnitId, primaryCropCode |
| (ninguno) | Solo captura | FORM_COMPLETED analytics |

Incluir validación pre-publicación: metadata + campos requeridos presentes en schema.

---

## 7. Cambios necesarios (por capa)

### 7.1 Frontend (`form-studio/` + `FormDesignerPage`)

| Cambio | Descripción |
|--------|-------------|
| F1 | Renderer matrix + repeat_group multi-fila en `FormFieldControl` |
| F2 | Respetar `sections` + `layoutMode` en `FormStudioRenderer` |
| F3 | Inspector: validation, calculate, metadata JSON guiado |
| F4 | Panel Capture: processingType, GPS, offline, geofence |
| F5 | Catálogos desde API Capture (fallback demo) |
| F6 | ConditionalRuleEditor: in/not_in, multi-regla, readOnlyWhen |
| F7 | Simulator: llamar validación servidor |
| F8 | Preview: siempre `renderForm` + indicador parity Android |
| F9 | Validación schema en tiempo real (keys, dependsOn) |

### 7.2 Shared

| Cambio | Descripción |
|--------|-------------|
| S1 | Formalizar `layoutMode` en `FormSettings` |
| S2 | Documentar contrato `metadata.processingType` + `erpMapping` |
| S3 | Matriz/repeat_group: schema auxiliar unificado |

### 7.3 Backend (forms + capture)

| Cambio | Descripción |
|--------|-------------|
| B1 | Endpoint validación diseño pre-publish (`validate-schema`) |
| B2 | Exponer catálogos diseñador (reuse CaptureCatalogService) |
| B3 | Render incluir hints de soporte móvil por tipo |
| B4 | No cambiar contratos Capture existentes |

### 7.4 Android (futuro — fuera de este sprint)

| Cambio | Descripción |
|--------|-------------|
| A1 | repeat_group UI multi-fila |
| A2 | matrix renderer |
| A3 | Catálogos desde `CatalogEntity` local |

**Nota:** Usuario solicitó no modificar Android en tareas previas; se lista solo para paridad 2.0.

---

## 8. Prioridad de implementación

### Fase 1 — Fundamentos Capture en Studio (2–3 sprints)

**Objetivo:** El diseñador configura lo que Capture ya ejecuta.

| # | Entrega | Impacto |
|---|---------|---------|
| P1.1 | Panel `processingType` + validación pre-publish | ERP automático |
| P1.2 | Settings offline/GPS/geofence en UI | Paridad paquete móvil |
| P1.3 | Catálogo picker → API Capture | Fin catálogos demo duplicados |
| P1.4 | Preview siempre server-render | Reglas/calculated confiables |
| P1.5 | Simulator con validación backend | Menos sorpresas en campo |

### Fase 2 — Paridad de componentes críticos (3–4 sprints)

| # | Entrega | Impacto |
|---|---------|---------|
| P2.1 | repeat_group multi-fila (web) | Formularios operativos |
| P2.2 | matrix renderer (web) | Evaluaciones/checklists |
| P2.3 | Layout tabs/accordion real | UX enterprise |
| P2.4 | Inspector validación + calculated builder | Menos JSON manual |
| P2.5 | ConditionalRuleEditor completo | Reglas avanzadas |

### Fase 3 — Studio Pro y ERP vivo (4+ sprints)

| # | Entrega | Impacto |
|---|---------|---------|
| P3.1 | ERP mapping visual (`erpMapping`) | Menos errores integración |
| P3.2 | Catálogos ERP/apiSource | Listas vivas |
| P3.3 | Package preview + version check | Ciclo offline cerrado |
| P3.4 | Android repeat_group + matrix | Paridad total |
| P3.5 | Version diff + schema linter | Gobierno formularios |

---

## 9. Matriz de cobertura — Requisitos Smart Form Studio 2.0

| Requisito | Estado actual | 2.0 objetivo |
|-----------|---------------|--------------|
| Texto | ✅ | ✅ |
| Número | ✅ | ✅ |
| Fecha | ✅ | ✅ |
| Selección | ✅ | ✅ |
| Listas dinámicas | ⚠️ demo local | ✅ Capture API |
| GPS | ⚠️ sin settings UI | ✅ completo |
| Fotografía | ⚠️ simulado web | ✅ |
| Firma | ⚠️ simulado web | ✅ |
| Documentos | ⚠️ básico | ✅ MIME/accept |
| Tablas (matrix) | ❌ catálogo only | ✅ Fase 2 |
| Repetidores | ❌ single row | ✅ Fase 2 |
| visibleWhen | ⚠️ regla simple | ✅ multi + sección |
| requiredWhen | ⚠️ regla simple | ✅ |
| calculatedFields | ⚠️ plantilla/JSON | ✅ builder |
| Catálogos estáticos | ✅ | ✅ |
| Catálogos dinámicos | ⚠️ demo | ✅ Capture |
| Catálogos dependientes | ⚠️ frágil keys | ✅ graph UI |
| processingType ERP | ❌ solo metadata manual | ✅ Panel Capture |

---

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Publicar formularios con tipos no soportados en Android | Badge soporte + lint pre-publish |
| Catálogos demo en producción | Fase 1: API Capture obligatoria en Studio |
| processingType mal configurado | Validador + plantillas sectoriales con metadata |
| Regresión en formularios existentes | No cambiar schema DB; features opt-in |
| Scope creep hacia nuevo BI | Mantener analytics en Capture Analytics → EBIAP |

---

## 11. Conclusión

El Smart Form Studio actual es una **base sólida** para diseño JSON-first con biblioteca amplia y ciclo de vida de formularios maduro. Para convertirse en el **front-end oficial del Capture Engine**, debe cerrar tres brechas: **(1)** configuración Capture/ERP visible, **(2)** paridad de render con runtime servidor y móvil, **(3)** componentes avanzados (tablas, repetidores, layout) que hoy existen solo en el catálogo.

La ruta propuesta es incremental, no reescribe UDFE ni EBIAP, y alinea diseño → captura → procesamiento → analytics en un flujo coherente para formularios empresariales offline-first.

---

## Referencias

- `docs/CAPTURE-ENGINE.md` — API móvil y paquete offline
- `docs/UDFE-BOUNDARY.md` — frontera Forms domain
- `shared/src/index.ts` — `FormDefinitionSchema`, `CAPTURE_PROCESSING_TYPES`
- `frontend/src/form-studio/` — implementación Studio actual
