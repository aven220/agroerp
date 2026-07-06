# Especificación Funcional — Universal Smart Forms Platform

| Campo | Valor |
|-------|-------|
| **Código módulo** | USFP |
| **Alias arquitectónico** | Form Engine (FORM) — `FORM_ENGINE.md` |
| **Nombre comercial** | Formularios Inteligentes Universales |
| **Nombre arquitectónico** | Universal Smart Forms Platform |
| **Versión documento** | 1.0 |
| **Estado** | Aprobado para implementación |
| **Product Owner** | AGROERP Product |
| **Release objetivo** | R2 — Platform Forms / R4 — Field Operations GA |
| **Documentos referencia** | `FORM_ENGINE.md`, `SYNC.md`, `ANDROID_FIELD_APP.md`, `AGROERP_MASTER_SPECIFICATION.md`, `PRM_FUNCTIONAL_SPEC.md`, `FTIP_FUNCTIONAL_SPEC.md`, `FMDT_FUNCTIONAL_SPEC.md` |

---

## 1. Objetivo del módulo

Diseñar y operar la **plataforma universal oficial de captura de información** de AGROERP: crear, administrar, versionar, aprobar, ejecutar y sincronizar formularios inteligentes desde **Web, Android y Tablets**, con operación **completamente offline** y sincronización determinista al reconectar.

USFP debe ser **funcionalmente superior a KoboToolbox, ODK Collect, Survey123 y Fulcrum** en integración empresarial nativa, reglas dinámicas avanzadas, multimedia, GIS, workflow, auditoría y automatizaciones cross-módulo. Debe ser **reutilizable para cualquier sector productivo** (agro, ganadería, minería, servicios) sin cambiar el núcleo de la plataforma.

Toda submission válida se materializa como **Resource** (`form_submission`) y alimenta motores de dominio (PRM, FTIP, FMDT, AITAP, CPE, etc.) mediante enlaces configurables y eventos.

---

## 2. Alcance

| # | Funcionalidad incluida |
|---|------------------------|
| A-01 | Constructor visual de formularios (drag & drop) con preview en tiempo real |
| A-02 | Motor de ejecución multi-cliente: Web, Android, Tablet |
| A-03 | Catálogo completo de tipos de campo (texto, numérico, geo, multimedia, matriz, repeticiones, etc.) |
| A-04 | Reglas dinámicas: visibilidad, saltos, cálculos, validaciones, dependencias, fórmulas |
| A-05 | Captura multimedia: foto, video, audio, firma, PDF, croquis, anotaciones |
| A-06 | Captura GIS: punto, línea, polígono, track, precisión, altitud, área/distancia calculada |
| A-07 | Operación 100% offline: diseño cacheado, ejecución, edición borrador, cola sync |
| A-08 | Sincronización inteligente: idempotencia, reintentos, resolución conflictos, priorización media |
| A-09 | Versionamiento inmutable de definiciones con compatibilidad hacia atrás |
| A-10 | Flujo aprobación definiciones: borrador → revisión → aprobado → publicado |
| A-11 | Asignación de formularios a roles, territorios, campañas y contextos ERP |
| A-12 | Vinculación contextual: productor, finca, lote, compra, contrato, visita |
| A-13 | Import/export XLSForm / JSON schema (interoperabilidad Kobo/ODK) |
| A-14 | Automatizaciones post-submit: tareas, alertas, workflows, visitas, indicadores |
| A-15 | Integración IA: OCR, validación inteligente, asistente diligenciamiento, resumen |
| A-16 | Reportes y KPIs de ejecución, calidad dato, sync y productividad |
| A-17 | Plantillas sectoriales reutilizables (multi-commodity, multi-país) |
| A-18 | Auditoría completa definiciones y submissions |

---

## 3. Exclusiones

| # | Exclusión | Módulo responsable |
|---|-----------|-------------------|
| E-01 | Lógica de negocio dominio (compra, contrato, catastro) | CPE, CSAE, FTIP, etc. |
| E-02 | Almacenamiento binario multimedia | EDMKP |
| E-03 | Render mapas base y operaciones espaciales | GIS Engine |
| E-04 | Definición workflows transaccionales complejos | Workflow Engine |
| E-05 | Motor visitas y planes manejo | AITAP |
| E-06 | Diseño UI/UX gráfico de constructor o renderer | Fuera de esta especificación |
| E-07 | Procesamiento batch analytics | DPAL |
| E-08 | Envío SMS/email push (transporte) | Notification Engine |
| E-09 | Catálogos maestros autoritativos | MDE |
| E-10 | Código de aplicación móvil/web | Implementación |

---

## 4. Actores

### 4.1 Diseñador de formularios

| Campo | Valor |
|-------|-------|
| **Rol** | `form_designer` |
| **Responsabilidades** | Crear, editar, versionar formularios; definir reglas y plantillas |
| **Permisos** | `form:create`, `form:update`, `form:design` |

### 4.2 Administrador de formularios

| Campo | Valor |
|-------|-------|
| **Rol** | `admin`, `form_admin` |
| **Responsabilidades** | Aprobar publicación, políticas org, plantillas globales, import Kobo |
| **Permisos** | `form:publish`, `form:approve`, `form:admin` |

### 4.3 Revisor / Aprobador

| Campo | Valor |
|-------|-------|
| **Rol** | `supervisor` |
| **Responsabilidades** | Revisar definiciones antes de publicación |
| **Permisos** | `form:approve` |

### 4.4 Capturador de campo

| Campo | Valor |
|-------|-------|
| **Rol** | `field_agent` |
| **Responsabilidades** | Ejecutar formularios offline, capturar evidencias, sincronizar |
| **Permisos** | `form:read`, `form:submit`, `sync:push` |

### 4.5 Supervisor de calidad de dato

| Campo | Valor |
|-------|-------|
| **Rol** | `data_quality_analyst` |
| **Responsabilidades** | Monitorear submissions, conflictos sync, validaciones fallidas |
| **Permisos** | `form:read`, `form:export`, `sync:admin` |

### 4.6 Analista / Reportería

| Campo | Valor |
|-------|-------|
| **Rol** | `analyst`, `manager` |
| **Responsabilidades** | Reportes ejecución, KPIs cobertura |
| **Permisos** | `form:read`, `form:export`, `report:read` |

### 4.7 Integrador / Desarrollador extensión

| Campo | Valor |
|-------|-------|
| **Rol** | `integration_developer` |
| **Responsabilidades** | Webhooks, mappings ERP, plantillas sectoriales |
| **Permisos** | `form:admin`, `integration:configure` |

### 4.8 Auditor

| Campo | Valor |
|-------|-------|
| **Rol** | `auditor` |
| **Responsabilidades** | Trazabilidad definiciones y submissions |
| **Permisos** | `form:read`, `audit:read` |

---

## 5. Roles involucrados (sistema)

| Rol slug | Uso USFP |
|----------|----------|
| `form_admin` | Gobierno formularios org |
| `form_designer` | Diseño y versiones |
| `supervisor` | Aprobación definiciones |
| `field_agent` | Captura campo |
| `data_quality_analyst` | Calidad y sync |
| `manager` | Reportes y KPIs |
| `viewer` | Consulta submissions |
| `auditor` | Auditoría |

---

## 6. Historias de Usuario

### US-USFP-001 — Crear formulario con constructor visual

| Campo | Contenido |
|-------|-----------|
| **Como** | diseñador de formularios |
| **Quiero** | arrastrar campos y configurar reglas sin escribir código |
| **Para** | publicar instrumentos de captura en minutos |
| **Prioridad** | Crítica |

**Criterios de aceptación:**
- [ ] Constructor drag & drop con preview
- [ ] Guardado en estado `draft`
- [ ] Validación schema antes de enviar a revisión

---

### US-USFP-002 — Publicar formulario con aprobación

| Campo | Contenido |
|-------|-----------|
| **Como** | administrador |
| **Quiero** | someter formulario a revisión y publicarlo tras aprobación |
| **Para** | controlar calidad de instrumentos de captura |
| **Prioridad** | Crítica |

**Criterios de aceptación:**
- [ ] Flujo draft → in_review → approved → published
- [ ] Solo una versión `published` activa por `formKey`
- [ ] Evento `FormPublished`

---

### US-USFP-003 — Ejecutar formulario offline en Android

| Campo | Contenido |
|-------|-----------|
| **Como** | técnico de campo |
| **Quiero** | diligenciar formulario sin internet con fotos y GPS |
| **Para** | capturar en zonas rurales |
| **Prioridad** | Crítica |

**Criterios de aceptación:**
- [ ] Bootstrap cache formularios publicados
- [ ] Submission local con `externalId`
- [ ] Sync batch al reconectar sin duplicados

---

### US-USFP-004 — Reglas condicionales y cálculos

| Campo | Contenido |
|-------|-----------|
| **Como** | diseñador |
| **Quiero** | ocultar preguntas y calcular totales automáticamente |
| **Para** | formularios adaptativos como XLSForm avanzado |
| **Prioridad** | Crítica |

**Criterios de aceptación:**
- [ ] visibleWhen, requiredWhen, skipTo
- [ ] Expresiones calculate con dependsOn
- [ ] Evaluación idéntica web y Android

---

### US-USFP-005 — Captura polígono y track GPS

| Campo | Contenido |
|-------|-----------|
| **Como** | técnico |
| **Quiero** | capturar polígono caminando el perímetro |
| **Para** | georreferenciar respuestas |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] Tipos geo_point, geo_line, geo_polygon, geo_track
- [ ] Precisión, altitud, área/distancia vía GIS Engine al sync

---

### US-USFP-006 — Repeticiones y subformularios

| Campo | Contenido |
|-------|-----------|
| **Como** | diseñador |
| **Quiero** | grupo repetible de miembros familia o lotes visitados |
| **Para** | encuestas complejas tipo Kobo groups |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] repeat_group con min/max ocurrencias
- [ ] subform con schema anidado

---

### US-USFP-007 — Vincular submission a productor y finca

| Campo | Contenido |
|-------|-----------|
| **Como** | diseñador |
| **Quiero** | campo relación que seleccione productor PRM y finca FTIP |
| **Para** | integración nativa ERP |
| **Prioridad** | Crítica |

**Criterios de aceptación:**
- [ ] Tipo `relation` con entityType configurable
- [ ] Context binding en submit payload

---

### US-USFP-008 — Automatización post-submit

| Campo | Contenido |
|-------|-----------|
| **Como** | administrador |
| **Quiero** | que cierto formulario cree visita AITAP o alerta OCC |
| **Para** | cerrar ciclo operativo automáticamente |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] FormAutomationRule configurable
- [ ] Dispara workflow/tarea/notificación

---

### US-USFP-009 — Importar desde Kobo/ODK

| Campo | Contenido |
|-------|-----------|
| **Como** | integrador |
| **Quiero** | importar XLSForm y convertir a schema USFP |
| **Para** | migrar instrumentos existentes |
| **Prioridad** | Media |

**Criterios de aceptación:**
- [ ] Import XLSX/JSON con mapeo tipos
- [ ] Reporte campos no soportados

---

### US-USFP-010 — IA validación inconsistencias

| Campo | Contenido |
|-------|-----------|
| **Como** | técnico |
| **Quiero** | alerta si peso declarado es anómalo vs histórico |
| **Para** | mejorar calidad de dato en campo |
| **Prioridad** | Media |

**Criterios de aceptación:**
- [ ] Validación IA opcional por formulario
- [ ] Humano confirma o corrige antes de submit final

---

### US-USFP-011 — Resolver conflicto sync

| Campo | Contenido |
|-------|-----------|
| **Como** | supervisor calidad |
| **Quiero** | comparar versión servidor vs dispositivo y resolver |
| **Para** | integridad de datos offline |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] UI resolución (especificación funcional pantalla)
- [ ] Audit de decisión

---

### US-USFP-012 — Reporte ejecución formularios

| Campo | Contenido |
|-------|-----------|
| **Como** | gerente |
| **Quiero** | ver formularios ejecutados por técnico y zona |
| **Para** | medir cobertura operativa |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] USFP-RPT-03 con filtros periodo, formulario, municipio

---

## 7. Casos de Uso

| ID | Caso de uso | Actor | Resultado |
|----|-------------|-------|-----------|
| CU-USFP-01 | Crear formulario draft | Diseñador | FormDefinition draft |
| CU-USFP-02 | Enviar a revisión | Diseñador | in_review |
| CU-USFP-03 | Aprobar y publicar | Aprobador | published |
| CU-USFP-04 | Bootstrap Android | Técnico | Cache local |
| CU-USFP-05 | Ejecutar formulario web | Capturador | Submission draft |
| CU-USFP-06 | Submit offline Android | Técnico | Cola sync |
| CU-USFP-07 | Sync batch | Sistema | Submissions synced |
| CU-USFP-08 | Import XLSForm | Integrador | FormDefinition |
| CU-USFP-09 | Export respuestas Excel | Analista | Dataset |
| CU-USFP-10 | Clonar formulario | Diseñador | Nueva formKey/version |
| CU-USFP-11 | Archivar formulario | Admin | archived |
| CU-USFP-12 | Asignar formulario a campaña | Admin | FormAssignment |
| CU-USFP-13 | OCR captura documento | Técnico | Campo pre-llenado |
| CU-USFP-14 | Geocerca validación | Sistema | Rechazo si fuera radio |
| CU-USFP-15 | Automatización post-submit | Sistema | Tarea/alerta creada |

---

## 8. Reglas de Negocio

### 8.1 Definición de formulario

| ID | Regla |
|----|-------|
| RN-USFP-001 | Todo formulario tiene `formKey` único por org (familia) |
| RN-USFP-002 | Schema 100% metadata — sin campos hardcodeados en código |
| RN-USFP-003 | Solo versiones `published` ejecutables en producción |
| RN-USFP-004 | Máximo una versión `published` activa por `formKey` |
| RN-USFP-005 | Edición post-publicación requiere nueva versión draft |
| RN-USFP-006 | Rechazo en revisión vuelve a `draft` con comentarios |

### 8.2 Ejecución y submission

| ID | Regla |
|----|-------|
| RN-USFP-010 | Submission valida solo campos visibles según reglas dinámicas |
| RN-USFP-011 | `formVersion` en submission preserva integridad histórica |
| RN-USFP-012 | Submit exitoso crea Resource `form_submission` automáticamente |
| RN-USFP-013 | `externalId` cliente garantiza idempotencia sync |
| RN-USFP-014 | Borrador submission editable hasta `submitted` |
| RN-USFP-015 | GPS obligatorio si `settings.requireGps=true` |
| RN-USFP-016 | Geocerca rechaza submit si punto fuera radio configurado |

### 8.3 Multimedia

| ID | Regla |
|----|-------|
| RN-USFP-020 | Archivos multimedia referencian EDMKP `contentId` post-sync |
| RN-USFP-021 | Offline: media en cola local hasta upload exitoso |
| RN-USFP-022 | Límites tamaño/duración configurables por org y tipo campo |
| RN-USFP-023 | Múltiples archivos por pregunta según `maxFiles` |

### 8.4 Versionamiento

| ID | Regla |
|----|-------|
| RN-USFP-030 | Historial versiones inmutable |
| RN-USFP-031 | Submissions antiguas nunca migran automáticamente a nuevo schema |
| RN-USFP-032 | Compatibilidad: campos eliminados permanecen en datos históricos |
| RN-USFP-033 | `schemaVersion` semver opcional para plugins |

### 8.5 Sync offline

| ID | Regla |
|----|-------|
| RN-USFP-040 | Orden sync: definiciones → media upload → submissions → automatizaciones |
| RN-USFP-041 | Reintentos exponenciales con máximo configurable |
| RN-USFP-042 | Conflicto: submission editada en servidor y cliente → `conflict` |
| RN-USFP-043 | Definiciones publicadas descargables offline para diseñador si política org |

### 8.6 Integración ERP

| ID | Regla |
|----|-------|
| RN-USFP-050 | Context binding: producerId, farmUnitId, fieldLotId, purchaseId, etc. |
| RN-USFP-051 | Automatizaciones post-submit no bloquean confirmación submission |
| RN-USFP-052 | Fallo automatización genera alerta OCC, no rollback submission |

### 8.7 Seguridad y permisos

| ID | Regla |
|----|-------|
| RN-USFP-060 | PBAC: capturador solo formularios asignados o catálogo rol |
| RN-USFP-061 | Submissions cross-tenant prohibidas |
| RN-USFP-062 | PII en submissions sujeta a políticas GECL enmascaramiento export |

### 8.8 IA

| ID | Regla |
|----|-------|
| RN-USFP-070 | IA sugiere; no sobrescribe valores sin confirmación capturador |
| RN-USFP-071 | OCR resultado editable antes de submit |

---

## 9. Flujo principal — Diseño, aprobación y primera captura

| Paso | Actor | Acción | Resultado |
|------|-------|--------|-----------|
| 1 | Diseñador | Crea formulario en constructor visual | `draft` v1 |
| 2 | Diseñador | Define campos, reglas, settings offline/GPS | Schema válido |
| 3 | Diseñador | Envía a revisión | `in_review` |
| 4 | Aprobador | Revisa instrumento, comentarios o aprueba | `approved` |
| 5 | Admin | Publica versión | `published`; depreca anterior |
| 6 | Sistema | Evento `FormPublished`; disponible bootstrap | Android/Web |
| 7 | Técnico | Descarga bootstrap offline | Cache local |
| 8 | Técnico | Ejecuta formulario en campo con GPS y fotos | Submission draft |
| 9 | Técnico | Finaliza submit (online u offline) | `submitted` local |
| 10 | Sistema | Sync: valida, crea Resource, EDMKP media | `synced` |
| 11 | Sistema | Ejecuta automatizaciones configuradas | Eventos dominio |
| 12 | Sistema | Audit + KPIs actualizados | Trazabilidad completa |

---

## 10. Flujos alternativos

### FA-USFP-01 — Importación Kobo/XLSForm

| Paso | Acción |
|------|--------|
| FA1.1 | Integrador sube XLSX |
| FA1.2 | Motor conversión genera schema USFP |
| FA1.3 | Diseñador revisa y ajusta en constructor |
| FA1.4 | Continúa flujo aprobación estándar |

### FA-USFP-02 — Submission borrador editado offline

| Paso | Acción |
|------|--------|
| FA2.1 | Técnico guarda borrador sin submit |
| FA2.2 | Edita múltiples veces offline |
| FA2.3 | Submit final dispara sync una vez |

### FA-USFP-03 — Conflicto sync

| Paso | Acción |
|------|--------|
| FA3.1 | Servidor tiene submission misma externalId con diff |
| FA3.2 | syncStatus=conflict |
| FA3.3 | Supervisor resuelve: cliente gana / servidor gana / merge manual |

### FA-USFP-04 — Nueva versión con formularios en campo

| Paso | Acción |
|------|--------|
| FA4.1 | Admin publica v2 |
| FA4.2 | Android mantiene v1 para submissions iniciadas |
| FA4.3 | Nuevas ejecuciones usan v2 tras bootstrap |

### FA-USFP-05 — Submit con automatización fallida

| Paso | Acción |
|------|--------|
| FA5.1 | Submission OK; workflow downstream falla |
| FA5.2 | Submission permanece válida |
| FA5.3 | OCC alerta + reintento automatización |

---

## 11. Casos de error

| ID | Condición | Mensaje | Comportamiento |
|----|-----------|---------|----------------|
| CE-USFP-01 | Schema inválido | "El formulario tiene errores de definición" | Bloquea revisión |
| CE-USFP-02 | Campo obligatorio vacío | "Complete el campo {label}" | Bloquea submit |
| CE-USFP-03 | Validación expresión falla | Mensaje custom campo | Bloquea submit |
| CE-USFP-04 | GPS requerido ausente | "Ubicación GPS obligatoria" | Bloquea submit |
| CE-USFP-05 | Fuera geocerca | "Fuera del área permitida ({n} m)" | Bloquea submit |
| CE-USFP-06 | Media excede tamaño | "Archivo supera límite {max}MB" | Rechaza adjunto |
| CE-USFP-07 | Formulario no publicado | "Formulario no disponible" | 404 ejecución |
| CE-USFP-08 | Sin permiso submit | "No autorizado para este formulario" | 403 |
| CE-USFP-09 | Versión obsoleta submit | "Versión de formulario no vigente" | Rechaza o redirige |
| CE-USFP-10 | Sync duplicado | Idempotente retorna existente | 200 sin duplicar |
| CE-USFP-11 | Repeat min no alcanzado | "Mínimo {n} repeticiones requeridas" | Bloquea submit |
| CE-USFP-12 | Relación entidad inválida | "Productor no existe o sin acceso" | Bloquea campo |

---

## 12. Validaciones

### 12.1 Tipos de campo soportados

| Tipo | Código | Descripción |
|------|--------|-------------|
| Texto corto | `text` | String línea única, maxLength |
| Texto largo | `textarea` | Multilínea |
| Entero | `integer` | Número sin decimales |
| Decimal | `decimal` | Número con precisión |
| Moneda | `currency` | Decimal + currencyCode |
| Fecha | `date` | ISO date |
| Hora | `time` | HH:mm |
| Fecha y hora | `datetime` | ISO datetime |
| Teléfono | `phone` | E.164 validación |
| Email | `email` | RFC formato |
| URL | `url` | URI válida |
| Código | `code` | Patrón alfanumérico |
| QR | `qr_scan` | Lectura cámara |
| Código barras | `barcode` | EAN/UPC/Code128 |
| Lista desplegable | `select` | Opción única |
| Lista múltiple | `multi_select` | Opciones múltiples |
| Radio | `radio` | Opción única visual |
| CheckBox | `checkbox` | Boolean o multi |
| Matriz | `matrix` | Grid preguntas × opciones |
| Tabla | `table` | Filas dinámicas columnas tipadas |
| Repetición | `repeat_group` | Grupo 0..n |
| Subformulario | `subform` | Schema anidado |
| Firma | `signature` | PNG vectorial |
| Fotografía | `photo` | Imagen JPEG/PNG |
| Video | `video` | MP4 límite duración |
| Audio | `audio` | M4A/MP3 |
| GPS punto | `geo_point` | Lat/lng/accuracy/altitude |
| GPS línea | `geo_line` | LineString |
| GPS polígono | `geo_polygon` | Polygon cerrado |
| GPS track | `geo_track` | LineString tiempo + distancia |
| Archivo | `file` | PDF u otro MIME |
| Croquis | `sketch` | Dibujo sobre canvas |
| Anotación imagen | `image_annotation` | Foto + markup |
| Relación ERP | `relation` | FK entidad dominio |
| Calculado | `calculated` | Solo lectura expresión |
| NFC | `nfc` | Futuro R5 |
| RFID | `rfid` | Futuro R5 |
| Sensor externo | `sensor` | Futuro IEL binding |

### 12.2 Reglas dinámicas

| Capacidad | Sintaxis funcional |
|-----------|-------------------|
| Mostrar/ocultar | `visibleWhen`: field, operator, value |
| Obligatorio condicional | `requiredWhen` |
| Saltos | `skipTo`: fieldKey destino |
| Cálculo | `calculate.expression`, `dependsOn[]` |
| Validación custom | `validate.expression`, `message` |
| Valor por defecto | `defaultValue` o `defaultExpression` |
| Solo lectura condicional | `readOnlyWhen` |
| Filtro opciones | `optionsFilter` en relation/select |

**Operadores:** eq, neq, gt, gte, lt, lte, in, not_in, empty, not_empty, contains, matches, and, or, not.

**Variables:** `{fieldKey}`, `$context.producerId`, `$user.municipality`, `$now`, `$device.accuracy`.

### 12.3 Validaciones por tipo (muestra)

| Tipo | Validaciones |
|------|--------------|
| text | minLength, maxLength, pattern |
| integer/decimal | min, max, step |
| currency | min, max, currencyCode |
| phone | countryCode, format |
| photo | minFiles, maxFiles, maxSizeMb, requireGpsExif |
| geo_polygon | minAreaHa, maxAreaHa, requireClosed |
| geo_track | minPoints, maxDurationMin |
| repeat_group | minOccurs, maxOccurs |
| relation | entityType, filter, requiredScope |

### 12.4 Settings formulario (`FormSettings`)

| Setting | Descripción |
|---------|-------------|
| requireGps | GPS submission obligatorio |
| offlineCapable | Permitir ejecución offline |
| allowDraft | Guardar borrador |
| geofence | center + radiusMeters |
| defaultLanguage | Locale |
| submitButtonLabel | Texto custom |
| successMessage | Post-submit |
| autoSaveIntervalSec | Autoguardado |
| themeCode | Tema org (sin diseño aquí) |
| automationRules[] | Post-submit |
| aiAssistEnabled | Asistente IA |
| retentionDays | Política retención |

---

## 13. Dependencias con otros módulos

| Módulo | Relación |
|--------|----------|
| **Resource Engine** | Submission → Resource `form_submission` |
| **Event Engine** | Publica Form*, Submission*, Sync* |
| **Audit Engine** | Diff definiciones y submissions |
| **Sync Foundation** | Cola offline, conflictos, device |
| **EDMKP** | Almacenamiento multimedia |
| **GIS Engine** | Área, distancia, validación geo |
| **Workflow Engine** | Aprobación definiciones, automatizaciones |
| **Notification Engine** | Alertas post-submit |
| **MDE** | Catálogos select, relation lookups |
| **Identity** | Permisos, PBAC, UserScope |
| **PRM** | Relation producer, context |
| **FTIP** | Relation farm, geo context |
| **FMDT** | Relation field lot |
| **AITAP** | Visitas, vinculación submission |
| **CPE** | Formularios compra campo |
| **CQIE** | Muestreo calidad |
| **CSAE** | Formularios contrato |
| **CITE** | Inspección inventario |
| **AIADP** | OCR, validación IA, resumen |
| **OCC** | Alertas sync y calidad |
| **DPAL** | Export analytics |
| **GECL** | PII, retención |

---

## 14. Permisos

| Permiso | Descripción | Roles |
|---------|-------------|-------|
| `form:read` | Listar, render, ver submissions | Todos operativos |
| `form:create` | Crear formulario y versiones | designer, admin |
| `form:update` | Editar draft | designer |
| `form:design` | Constructor visual | designer |
| `form:publish` | Publicar aprobado | admin |
| `form:approve` | Aprobar/rechazar revisión | supervisor |
| `form:submit` | Enviar y sync submissions | field_agent |
| `form:delete` | Archivar formulario | admin |
| `form:admin` | Políticas, plantillas globales | admin |
| `form:export` | Export datos | analyst, manager |
| `form:assign` | Asignar formularios | admin, supervisor |
| `sync:push` | Sync submissions | field_agent |
| `sync:admin` | Resolver conflictos | data_quality |

---

## 15. Auditoría

| Evento auditado | Datos |
|-----------------|-------|
| CRUD FormDefinition | Diff schema completo |
| Transición estado definición | draft/review/approved/published |
| Publish / archive | Versión, autor |
| FormSubmission create/update | Campos, device, GPS |
| Sync batch | Device, count, errores |
| Conflicto resuelto | Decisión, antes/después |
| Import XLSForm | Archivo fuente, mapping |
| Automatización ejecutada | Regla, resultado |
| Export masivo datos | Usuario, filtros, formato |

---

## 16. Eventos generados

| Evento | Cuándo |
|--------|--------|
| `FormCreated` | Alta formulario |
| `FormUpdated` | Edición draft |
| `FormSubmittedForReview` | A revisión |
| `FormApproved` / `FormRejected` | Decisión aprobador |
| `FormPublished` | Publicación |
| `FormArchived` | Archivo |
| `FormVersionCreated` | Nueva versión |
| `FormAssigned` | Asignación capturadores |
| `FormRendered` | Render ejecución |
| `FormSubmissionDraftSaved` | Borrador |
| `FormSubmitted` | Submit final |
| `FieldValidated` | Por campo OK |
| `FormSubmissionSynced` | Sync exitoso |
| `FormSyncConflict` | Conflicto detectado |
| `FormSyncConflictResolved` | Resolución |
| `FormMediaUploaded` | Archivo EDMKP |
| `FormAutomationExecuted` | Post-submit |
| `FormImportCompleted` | Import Kobo/ODK |

Namespace: `form.*`

---

## 17. Automatizaciones

| ID | Disparador | Acción |
|----|------------|--------|
| AUT-USFP-01 | Submit formulario tipo visita | Crear TechnicalVisit AITAP draft |
| AUT-USFP-02 | Campo riesgo alto | Alerta OCC |
| AUT-USFP-03 | Submit inspección | Crear tarea Workflow |
| AUT-USFP-04 | Submit con NC | Incidencia CQIE/OCC |
| AUT-USFP-05 | Submit productor nuevo | Notificación supervisor PRM |
| AUT-USFP-06 | Sync fallido 3 veces | Alerta sync:admin |
| AUT-USFP-07 | Formulario vence sin ejecución | Recordatorio capturador |
| AUT-USFP-08 | Submit compra campo | Avanzar estado CPE |
| AUT-USFP-09 | Actualizar indicador | DPAL metric increment |
| AUT-USFP-10 | Certificación checklist OK | Flag PRM/FTIP |

Configuración: `FormAutomationRule` en settings con trigger, conditions, actions.

---

## 18. Integración IA

| Función | Entrada | Salida | Humano en loop |
|---------|---------|--------|----------------|
| Sugerencias diligenciamiento | Historial, contexto | Valores sugeridos | Sí |
| Validación inteligente | Submission parcial | Warnings | Sí |
| Detección inconsistencias | Campos cruzados | Alertas | Sí |
| OCR documento | Foto cédula, factura | Campos extraídos | Editable |
| Reconocimiento imagen | Foto plaga, fruto | Clasificación | Confirmación |
| Asistente conversacional | Schema + progreso | Siguiente pregunta | Opcional |
| Resumen automático | Submission completa | Texto ejecutivo | Informativo |
| Clasificación automática | Texto libre | Categoría | Configurable |

**RN-USFP-070:** IA nunca submit sin confirmación humana final.

---

## 19. Integración GIS

| Capacidad | Uso USFP |
|-----------|----------|
| Validar punto en geocerca | settings.geofence |
| Calcular área polígono | Campo geo_polygon |
| Calcular distancia track | Campo geo_track |
| Altitud DEM | Enriquecer geo_point |
| Reverse geocoding | Sugerir municipio (IEL) |
| WKT/GeoJSON export | Reportes espaciales |
| Snap a finca/lote FTIP | relation + intersect |

Operaciones delegadas a GIS Engine; USFP almacena geometría en submission data.

---

## 20. Integración Android / Tablet

| Capacidad | Celular | Tablet |
|-----------|---------|--------|
| Bootstrap forms | Sí | Sí |
| Ejecución offline | Sí | Sí |
| Constructor simplificado | No | Opcional revisión |
| Cámara foto/video | Sí | Sí |
| Audio nota voz | Sí | Sí |
| Firma stylus/dedo | Sí | Sí optimizado |
| GPS alta precisión | Sí | Sí |
| Walk polygon/track | Sí | Sí pantalla grande |
| Cache SQLite/Room | Sí | Sí |
| Sync background | Sí | Sí |
| Actualización forms auto | WiFi configurable | Igual |

Headers: `X-Device-Id`, `X-Correlation-Id`, `X-App-Version`.

---

## 21. Integración Formularios (interoperabilidad)

| Formato | Dirección | Descripción |
|---------|-----------|-------------|
| XLSForm (Kobo) | Import | Conversión survey + choices |
| ODK XML | Import | Compatibilidad ODK Collect |
| JSON Schema USFP | Export/Import | Nativo |
| CSV respuestas | Export | Flatten repeats |
| GeoJSON submissions | Export | Campos geo |

Superioridad vs Kobo: integración ERP nativa, workflow aprobación, RBAC, automatizaciones, Resource automático.

---

## 22. Integración Productores (PRM)

| Función | Descripción |
|---------|-------------|
| Campo relation `producer` | Lookup PRM |
| Context `producerId` en submit | Timeline PRM |
| Pre-fill desde expediente | Variables $context |
| Formulario alta productor | Automatización PRM |

---

## 23. Integración Fincas (FTIP)

| Función | Descripción |
|---------|-------------|
| relation `farm` | Selección finca |
| Geocerca finca | Intersect polígono FTIP |
| Formulario catastro | Datos → FTIP vía automatización |
| GPS en finca | Validación dentro boundary |

---

## 24. Integración Lotes (FMDT)

| Función | Descripción |
|---------|-------------|
| relation `field_lot` | Selección lote |
| Formulario labor | → FieldOperation FMDT |
| Context fieldLotId | Vinculación submission |

---

## 25. Integración Compras (CPE)

| Función | Descripción |
|---------|-------------|
| Formulario field capture | Integrado CPE compra |
| relation `purchase` | Compra en curso |
| Automatización | Avanzar workflow compra |

---

## 26. Integración Calidad (CQIE)

| Función | Descripción |
|---------|-------------|
| Formulario muestreo | Datos → CQIE |
| Checklist NC | Incidencia automática |
| relation `quality_sample` | Muestra laboratorio |

---

## 27. Integración Inventario (CITE)

| Función | Descripción |
|---------|-------------|
| Inspección bodega | Formulario checklist |
| relation `inventory_lot` | Lote bodega |
| Conteo físico | Submission → ajuste workflow |

---

## 28. Integración Contratos (CSAE)

| Función | Descripción |
|---------|-------------|
| Formulario acuerdo | Datos contractuales |
| relation `agreement` | Contrato activo |
| Checklist cumplimiento | Flag CSAE |

---

## 29. Integración Documental (EDMKP)

| Función | Descripción |
|---------|-------------|
| Upload foto/video/audio | contentId |
| PDF adjunto | file, document |
| Firma PNG | signature |
| Croquis/anotación | sketch, image_annotation |
| Cola offline media | Upload antes submission final o paralelo |

---

## 30. Integración Workflow

| Función | Descripción |
|---------|-------------|
| Aprobación definición | draft → published |
| Aprobación submission | Si policy requireReview |
| Automatización | Iniciar instancia workflow |
| Tareas humanas | Asignación post-submit |

---

## 31. Integración Notificaciones

| Función | Descripción |
|---------|-------------|
| Formulario asignado | Push/email técnico |
| Sync fallido | Admin alerta |
| Aprobación pendiente | Aprobador |
| Plazo ejecución | Recordatorio |

Transporte vía Notification Engine; USFP define triggers.

---

## 32. Modelo de datos funcional

### 32.1 FormDefinition (definición formulario)

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| formId | UUID | Sí | Identificador versión |
| organizationId | UUID | Sí | Tenant |
| formKey | Texto | Sí | Familia única org |
| formName | Texto | Sí | Nombre visible |
| description | Texto | No | |
| version | Entero | Sí | Incremental por formKey |
| status | Enum | Sí | draft, in_review, approved, published, rejected, archived |
| schema | JSON | Sí | fields, settings, rules |
| schemaVersion | Texto | No | Semver extensión |
| sectorCode | Catálogo | No | agro, mining, services — multi-sector |
| commodityCode | Catálogo | No | coffee, cacao, etc. |
| languageCode | Catálogo | No | Idioma default |
| createdBy | Ref User | Sí | Autor |
| createdAt | Fecha | Sí | |
| updatedAt | Fecha | Sí | |
| submittedForReviewAt | Fecha | No | |
| approvedBy / approvedAt | Ref/Fecha | No | |
| publishedBy / publishedAt | Ref/Fecha | No | |
| rejectedReason | Texto | No | |
| parentVersionId | Ref | No | Versión anterior |
| changeLog | Texto | No | Historial cambios |
| compatibilityNotes | Texto | No | Migración |
| tags | Lista | No | |
| metadata | JSON | No | |

### 32.2 FormField (dentro de schema)

| Campo | Descripción |
|-------|-------------|
| key | Identificador único formulario |
| type | Tipo campo §12.1 |
| label, hint, placeholder | UI text |
| required | Boolean |
| visibleWhen, requiredWhen, readOnlyWhen | Reglas |
| skipTo | Salto |
| validate | Expresiones |
| calculate | Campos calculados |
| options | Select/radio |
| relation | entityType, filter, displayField |
| repeat | subSchema, minOccurs, maxOccurs |
| media | maxFiles, maxSizeMb, accept |
| geo | accuracyMaxM, requireAltitude |
| defaultValue / defaultExpression | |
| order | Posición constructor |

### 32.3 FormSubmission

| Campo | Tipo | Descripción |
|-------|------|-------------|
| submissionId | UUID | |
| organizationId | UUID | |
| formId | Ref | Versión exacta |
| formKey | Texto | |
| formVersion | Entero | |
| resourceId | Ref | Resource Engine |
| status | Enum | draft, submitted, synced, conflict, voided |
| data | JSON | Respuestas |
| context | JSON | producerId, farmUnitId, fieldLotId, visitId, etc. |
| gpsLocation | Point | Submission-level GPS |
| gpsTrack | LineString | Recorrido |
| deviceInfo | JSON | platform, appVersion, deviceId |
| submittedBy | Ref User | |
| submittedAt | Fecha | |
| syncedAt | Fecha | |
| externalId | UUID | Idempotencia |
| syncStatus | Enum | pending, synced, conflict, error |
| syncError | Texto | Último error |
| validationResults | JSON | Por campo |
| aiAssistLog | JSON | Sugerencias IA |
| durationSec | Entero | Tiempo diligenciamiento |
| version | Entero | Optimistic lock |

### 32.4 FormSubmissionMedia

| Campo | Descripción |
|-------|-------------|
| mediaId | UUID |
| submissionId | FK |
| fieldKey | Campo origen |
| contentId | EDMKP |
| mediaType | photo, video, audio, signature, file, sketch |
| localPath | Offline temp |
| uploadStatus | pending, uploaded, failed |
| capturedAt, gpsGeo | |
| annotations | JSON markup |

### 32.5 FormAssignment

| Campo | Descripción |
|-------|-------------|
| assignmentId | UUID |
| formKey | Formulario |
| assignedToType | role, user, team, territory |
| assignedToId | |
| campaignCode | Opcional |
| municipalityCodes | PBAC |
| dueDate | Plazo |
| quota | Meta ejecuciones |
| status | active, completed, cancelled |

### 32.6 FormAutomationRule

| Campo | Descripción |
|-------|-------------|
| ruleId | UUID |
| formKey | |
| trigger | on_submit, on_sync, on_field_change |
| conditions | JSON expresión |
| actions | create_visit, create_alert, start_workflow, update_entity |
| priority | |
| enabled | bool |

### 32.7 FormVersionHistory

| Campo | Descripción |
|-------|-------------|
| historyId | UUID |
| formId | |
| diff | JSON patch schema |
| changedBy | |
| changedAt | |
| changeType | create, update, publish, archive |

### 32.8 FormKpiSnapshot

| Campo | Descripción |
|-------|-------------|
| snapshotId | UUID |
| scopeType | org, form, user, municipality |
| scopeId | |
| period | |
| submissionsCount | |
| avgDurationSec | |
| syncSuccessRate | |
| validationErrorRate | |

---

## 33. API funcional

**Base path:** `/api/v1/forms` (superficie USFP / Form Engine)

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/forms` | `form:read` | Listar definiciones |
| POST | `/forms` | `form:create` | Crear draft |
| GET | `/forms/:id` | `form:read` | Obtener versión |
| PATCH | `/forms/:id` | `form:update` | Editar draft |
| DELETE | `/forms/:id` | `form:delete` | Archivar |
| POST | `/forms/:id/submit-review` | `form:update` | Enviar revisión |
| POST | `/forms/:id/approve` | `form:approve` | Aprobar |
| POST | `/forms/:id/reject` | `form:approve` | Rechazar |
| POST | `/forms/:id/publish` | `form:publish` | Publicar |
| POST | `/forms/keys/:formKey/versions` | `form:create` | Nueva versión |
| GET | `/forms/published/:formKey` | `form:read` | Última publicada |
| GET | `/forms/bootstrap` | `form:read` | Cache Android — todas publicadas |
| POST | `/forms/:id/render` | `form:read` | Evaluar reglas con data parcial |
| POST | `/forms/:id/submit` | `form:submit` | Enviar submission |
| POST | `/forms/:id/draft` | `form:submit` | Guardar borrador |
| GET | `/forms/:formId/submissions` | `form:read` | Submissions del form |
| GET | `/form-submissions` | `form:read` | Listar todas |
| GET | `/form-submissions/:id` | `form:read` | Detalle |
| PATCH | `/form-submissions/:id` | `form:submit` | Editar draft |
| POST | `/form-submissions/sync` | `form:submit` | Batch offline |
| POST | `/form-submissions/:id/resolve-conflict` | `sync:admin` | Resolver conflicto |
| POST | `/forms/import/xlsform` | `form:create` | Import Kobo |
| POST | `/forms/import/odk` | `form:create` | Import ODK |
| GET | `/forms/:id/export` | `form:export` | Export schema |
| GET | `/form-submissions/export` | `form:export` | Export CSV/Excel |
| GET | `/forms/templates` | `form:read` | Plantillas sector |
| POST | `/forms/templates/:id/clone` | `form:create` | Clonar plantilla |
| GET | `/form-assignments` | `form:read` | Asignaciones |
| POST | `/form-assignments` | `form:assign` | Crear asignación |
| GET | `/reports/:reportCode` | `form:export` | USFP-RPT-* |

---

## 34. Interfaz (especificación funcional — sin diseño gráfico)

| ID | Pantalla | Descripción |
|----|----------|-------------|
| UI-USFP-01 | Listado formularios | Estados, versiones, acciones |
| UI-USFP-02 | Constructor visual | Drag & drop, preview, reglas |
| UI-USFP-03 | Editor campo | Propiedades por tipo |
| UI-USFP-04 | Flujo aprobación | Revisión, comentarios |
| UI-USFP-05 | Ejecutor web | Wizard formulario |
| UI-USFP-06 | Listado submissions | Filtros, export |
| UI-USFP-07 | Detalle submission | Datos, media, mapa, audit |
| UI-USFP-08 | Resolución conflictos | Diff lado a lado |
| UI-USFP-09 | Asignaciones | Quién debe ejecutar |
| UI-USFP-10 | Import XLSForm | Wizard importación |
| UI-USFP-11 | Dashboard KPIs | Ejecución, sync, calidad |
| UI-USFP-12 | Plantillas sector | Galería reutilizable |

---

## 35. Android / Tablet (especificación funcional)

| ID | Flujo | Offline |
|----|-------|---------|
| AND-USFP-01 | Bootstrap formularios | Sí |
| AND-USFP-02 | Lista asignados | Cache |
| AND-USFP-03 | Ejecutar formulario | Sí |
| AND-USFP-04 | Autoguardado borrador | Sí |
| AND-USFP-05 | Captura foto/video/audio | Sí cola media |
| AND-USFP-06 | Firma | Sí |
| AND-USFP-07 | GPS punto/track/polígono | Sí |
| AND-USFP-08 | Escaneo QR/barcode | Sí |
| AND-USFP-09 | Sync manual/automático | Cola inteligente |
| AND-USFP-10 | Ver submissions enviadas | Cache |
| AND-USFP-11 | Resolver conflicto simple | Parcial — complejo en web |
| TAB-USFP-01 | Ejecución pantalla dividida | Sí |
| TAB-USFP-02 | Mapa + formulario simultáneo | Sí |

**Cola sync prioridad:** 1 media crítica 2 submissions draft 3 submissions final 4 metadata.

---

## 36. Reportes

| ID | Reporte | Descripción | Filtros |
|----|---------|-------------|---------|
| USFP-RPT-01 | Catálogo formularios | Definiciones y versiones | Estado, sector |
| USFP-RPT-02 | Formularios publicados | Activos por org | Sector |
| USFP-RPT-03 | Ejecuciones por periodo | Count submissions | Form, fecha, zona |
| USFP-RPT-04 | Ejecuciones por técnico | Productividad captura | Usuario |
| USFP-RPT-05 | Tiempo promedio diligenciamiento | avg durationSec | Form |
| USFP-RPT-06 | Tasa completitud | Iniciados vs enviados | |
| USFP-RPT-07 | Cobertura asignaciones | % quota cumplida | Campaña |
| USFP-RPT-08 | Calidad dato | Errores validación | Form, campo |
| USFP-RPT-09 | Submissions con GPS | % georreferenciados | |
| USFP-RPT-10 | Precisión GPS promedio | accuracy m | |
| USFP-RPT-11 | Sync pendientes | Cola offline | Device |
| USFP-RPT-12 | Conflictos sync | Abiertos/resueltos | |
| USFP-RPT-13 | Errores sync | Por tipo error | |
| USFP-RPT-14 | Export plano respuestas | CSV/Excel wide | Form, fechas |
| USFP-RPT-15 | Export geo | GeoJSON campos | |
| USFP-RPT-16 | Historial versiones | Cambios schema | formKey |
| USFP-RPT-17 | Aprobaciones pendientes | En revisión | |
| USFP-RPT-18 | Automatizaciones ejecutadas | Éxito/fallo | |
| USFP-RPT-19 | Uso multimedia | Fotos/videos por form | Tamaño |
| USFP-RPT-20 | Comparativo Kobo migration | Import vs manual | |

---

## 37. KPIs

| ID | KPI | Categoría | Fórmula |
|----|-----|-----------|---------|
| KPI-USFP-01 | Formularios ejecutados | Ejecución | COUNT submitted |
| KPI-USFP-02 | Ejecuciones / día | Ejecución | COUNT / días |
| KPI-USFP-03 | Tiempo promedio diligenciamiento | Tiempo | AVG durationSec |
| KPI-USFP-04 | Tiempo mediana | Tiempo | MEDIAN durationSec |
| KPI-USFP-05 | Cobertura asignaciones % | Cobertura | cumplidas / asignadas |
| KPI-USFP-06 | Técnicos activos | Cobertura | DISTINCT submittedBy |
| KPI-USFP-07 | Tasa completitud | Calidad | submitted / iniciados |
| KPI-USFP-08 | Errores validación % | Calidad | fails / intentos |
| KPI-USFP-09 | Campos incompletos top | Calidad | RANK field errors |
| KPI-USFP-10 | Sync success rate | Sync | synced / intentos |
| KPI-USFP-11 | Sync latency p95 | Sync | p95 syncedAt−submittedAt |
| KPI-USFP-12 | Conflictos abiertos | Sync | COUNT conflict |
| KPI-USFP-13 | Pending offline queue | Sync | COUNT pending |
| KPI-USFP-14 | Media upload success | Sync | uploaded / total media |
| KPI-USFP-15 | Formularios activos | Productividad | COUNT published |
| KPI-USFP-16 | Submissions / técnico / día | Productividad | COUNT por user |
| KPI-USFP-17 | Reuso plantillas | Productividad | clones / nuevos |
| KPI-USFP-18 | IA asistencia aceptación % | IA | aceptadas / sugeridas |
| KPI-USFP-19 | OCR corrección rate | IA | campos editados post-OCR |
| KPI-USFP-20 | Automatizaciones éxito % | Automatización | OK / total |

### 37.1 Alertas OCC

| ID | Alerta |
|----|--------|
| USFP-ALT-01 | Sync fallido reiterado |
| USFP-ALT-02 | Conflicto sync sin resolver > N días |
| USFP-ALT-03 | Formulario asignado vencido |
| USFP-ALT-04 | Tasa error validación > umbral |
| USFP-ALT-05 | Cola media > umbral dispositivo |
| USFP-ALT-06 | Aprobación definición pendiente |
| USFP-ALT-07 | Automatización fallida post-submit |
| USFP-ALT-08 | Dispositivo sin sync > N días |
| USFP-ALT-09 | Anomalía IA crítica en submission |
| USFP-ALT-10 | Export masivo datos sensibles |

---

## 38. Escalabilidad

### 38.1 Millones de registros

| Aspecto | Requisito |
|---------|-----------|
| Submissions | Particionado org + año; índice formKey, submittedAt |
| Multimedia | EDMKP object storage; USFP solo índice |
| Listados | Paginación obligatoria; cursor-based |
| Export | Async job DPAL; límite filas configurable |
| Bootstrap | Delta sync; solo forms asignados si policy |
| Render reglas | Evaluación cliente; servidor valida final |

### 38.2 Multiempresa

- Aislamiento `organizationId` estricto
- Plantillas globales plataforma + override org
- KPIs sin cruce tenant

### 38.3 Multipaís

- i18n labels schema multi-idioma
- Validación phone/tax por país
- Formatos fecha/hora locale

### 38.4 Multisector / multicultivo

- `sectorCode` + `commodityCode` en FormDefinition
- Plantillas sectoriales en catálogo
- Campos relation extensibles Metadata Engine

---

## 39. Pruebas

### 39.1 Funcionales

| ID | Escenario |
|----|-----------|
| TF-USFP-01 | Crear → aprobar → publicar → ejecutar happy path |
| TF-USFP-02 | Reglas visibleWhen ocultan campos correctamente |
| TF-USFP-03 | Campo calculado actualiza en tiempo real |
| TF-USFP-04 | Submit offline → sync idempotente |
| TF-USFP-05 | Geocerca rechaza punto fuera |
| TF-USFP-06 | Repeat group min/max validado |
| TF-USFP-07 | Import XLSForm básico |
| TF-USFP-08 | Conflicto sync resuelto |
| TF-USFP-09 | Automatización post-submit ejecutada |
| TF-USFP-10 | Resource creado automáticamente |

### 39.2 Integración

| ID | Escenario |
|----|-----------|
| TI-USFP-01 | relation producer PRM válida |
| TI-USFP-02 | Media EDMKP vinculada submission |
| TI-USFP-03 | GIS calcula área polígono campo |
| TI-USFP-04 | Workflow aprobación definición |
| TI-USFP-05 | AITAP visita creada por automatización |

### 39.3 Carga

| ID | Escenario | Criterio |
|----|-----------|----------|
| TC-USFP-01 | 1M submissions list paginado | p95 < 500ms |
| TC-USFP-02 | 500 sync batch Android | Sin duplicados |
| TC-USFP-03 | Bootstrap 200 forms | < 30s mobile |

---

## 40. Definición de Done

- [ ] US-USFP-001 a 008 críticas/altas aceptadas PO
- [ ] RN-USFP-001 a 071 validadas
- [ ] API `/api/v1/forms/*` Swagger completo
- [ ] Tipos campo §12.1 implementados (excepto NFC/RFID R5)
- [ ] Offline Android bootstrap + sync + media queue
- [ ] Constructor visual web operativo
- [ ] Import XLSForm básico
- [ ] Integraciones PRM, FTIP, EDMKP, GIS, Sync (TI-USFP-*)
- [ ] Reportes USFP-RPT-01 a 10
- [ ] KPIs KPI-USFP-01 a 12 en dashboard
- [ ] Superioridad documentada vs Kobo checklist PO

---

## 41. Futuras Mejoras

| ID | Mejora | Release |
|----|--------|---------|
| FM-USFP-01 | NFC / RFID captura | R5 |
| FM-USFP-02 | Constructor offline tablet | R5 |
| FM-USFP-03 | Fulcrum bidirectional sync | R5 IEL |
| FM-USFP-04 | CommCare case management bridge | R5 |
| FM-USFP-05 | Voz-a-texto diligenciamiento | R5 AI |
| FM-USFP-06 | Formularios colaborativos multi-usuario | R5 |
| FM-USFP-07 | A/B testing definiciones | R5 |
| FM-USFP-08 | Real-time web submit WebSocket | R5 |

---

## Control de cambios

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.0 | 2026-07-02 | Emisión inicial especificación funcional USFP |

---

## Aprobaciones

| Rol | Nombre | Fecha |
|-----|--------|-------|
| Product Owner | AGROERP Product | 2026-07-02 |
| Arquitectura | AGROERP Architecture | Pendiente revisión |
| Desarrollo Lead | — | Pendiente |
| QA Lead | — | Pendiente |

---

*Fin del documento — USFP v1.0*
