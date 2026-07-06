# Especificación Funcional — Lotes (Field Management & Digital Twin Platform)

| Campo | Valor |
|-------|-------|
| **Código módulo** | FMDT |
| **Nombre comercial** | Lotes — Gemelo Digital de Campo |
| **Nombre arquitectónico** | Field Management & Digital Twin Platform |
| **Versión documento** | 1.0 |
| **Estado** | Aprobado para implementación |
| **Product Owner** | AGROERP Product |
| **Release objetivo** | R4 — Field Operations |
| **Documentos referencia** | `FARM_TERRITORY_INTELLIGENCE_PLATFORM.md`, `AGRONOMIC_INTELLIGENCE_TECHNICAL_ASSISTANCE_PLATFORM.md`, `FTIP_FUNCTIONAL_SPEC.md`, `COFFEE_DOMAIN.md`, `MASTER_DATA_ENGINE.md` (`farm.*`, `field.*`, `agronomic.*`), `AGROERP_MASTER_SPECIFICATION.md` |

---

## 1. Objetivo del módulo

Administrar **cada lote agrícola como unidad independiente de producción**, convirtiéndolo en un **Gemelo Digital (Digital Twin)** que consolida estado agronómico actual, historial operativo completo, costos, producción, calidad y proyecciones futuras.

FMDT es la **fuente autoritativa de gestión operativa a nivel lote**: perfil productivo extendido, labores agrícolas, costos, zonas de manejo operativas, telemetría de agricultura de precisión e indicadores materializados por lote. Toda actividad agrícola, costo y evento productivo debe **anclarse a un lote FMDT**, referenciando la geometría catastral de FTIP sin duplicarla.

---

## 2. Alcance

| # | Funcionalidad incluida |
|---|------------------------|
| A-01 | Perfil operativo completo del lote (información general, agronómica, clasificación) |
| A-02 | Gemelo Digital por lote: estado + timeline + KPIs materializados |
| A-03 | Registro de labores agrícolas (siembra, fertilización, poda, cosecha, etc.) con evidencias |
| A-04 | Sistema de costos por lote: mano de obra, insumos, maquinaria, indirectos |
| A-05 | Cálculo automático costo/ha, costo/kg, rentabilidad, margen y tendencias |
| A-06 | Historial de producción: esperada, real, por campaña, mensual y anual |
| A-07 | Zonas de manejo operativas y subpolígonos (referencia GIS; geometría en FTIP) |
| A-08 | Integración agricultura de precisión: sensores IoT, estaciones, NDVI/EVI (futuro R5) |
| A-09 | Expediente documental del lote (índice EDMKP) |
| A-10 | Proyección compras CPE, calidad CQIE, visitas AITAP en timeline del lote |
| A-11 | Alertas operativas del lote (labores vencidas, costos, riesgos, producción) |
| A-12 | Reportes y KPIs de productividad, rentabilidad, costos, calidad, sostenibilidad |
| A-13 | Captura offline Android: labores, GPS, fotos, video, firma, formularios |
| A-14 | Recomendaciones IA: fertilización, poda, renovación, fitosanitario, producción |
| A-15 | Vinculación obligatoria con `ftipLotUnitId` (FTIP) y finca padre |

---

## 3. Exclusiones

| # | Exclusión | Módulo responsable |
|---|-----------|-------------------|
| E-01 | Polígonos catastrales y subdivisión territorial | FTIP |
| E-02 | Planificación visitas, planes de manejo, diagnósticos fitosanitarios | AITAP |
| E-03 | Lifecycle y golden record del productor | PRM |
| E-04 | Operaciones espaciales (buffer, intersect, tiles) | GIS Engine |
| E-05 | Compra transaccional y recepción | CPE |
| E-06 | Contratos y cupos comerciales | CSAE |
| E-07 | Dictámenes calidad laboratorio | CQIE |
| E-08 | Lote inventario bodega (stock kg) | CITE |
| E-09 | Liquidación y pagos | CSFE |
| E-10 | Almacenamiento binario documentos | EDMKP |
| E-11 | Pipeline procesamiento satélite raster | IEL + AIADP |
| E-12 | Diseño interfaces gráficas | Fuera de esta especificación |

---

## 4. Actores

### 4.1 Agrónomo / Técnico de extensión

| Campo | Valor |
|-------|-------|
| **Rol** | `field_agent`, `agronomist` |
| **Responsabilidades** | Registrar labores, actualizar estado agronómico, capturar evidencias, recomendar manejo |
| **Permisos** | `lot:read`, `lot:update`, `field_operation:create` |

### 4.2 Supervisor técnico

| Campo | Valor |
|-------|-------|
| **Rol** | `supervisor` |
| **Responsabilidades** | Validar labores, aprobar costos, revisar gemelo digital, autorizar renovaciones |
| **Permisos** | `lot:approve`, `field_operation:verify`, `lot_cost:approve` |

### 4.3 Productor / Operador de finca

| Campo | Valor |
|-------|-------|
| **Rol** | `producer` (futuro portal) |
| **Responsabilidades** | Ejecutar labores, reportar cosechas parciales, firmar actas |
| **Permisos** | `lot:read` (propios), `field_operation:create` (limitado) |

### 4.4 Comprador / Agente comercial

| Campo | Valor |
|-------|-------|
| **Rol** | `buyer` |
| **Responsabilidades** | Consultar productividad lote, potencial compra, historial calidad |
| **Permisos** | `lot:read` |

### 4.5 Analista de costos / Finanzas agrícola

| Campo | Valor |
|-------|-------|
| **Rol** | `finance_analyst` |
| **Responsabilidades** | Revisar costos lote, rentabilidad, tendencias |
| **Permisos** | `lot_cost:read`, `lot:read` |

### 4.6 Especialista agricultura de precisión

| Campo | Valor |
|-------|-------|
| **Rol** | `precision_ag_specialist` |
| **Responsabilidades** | Configurar sensores, interpretar índices NDVI, zonas manejo variable |
| **Permisos** | `lot:precision`, `lot:read` |

### 4.7 Gerencia operativa

| Campo | Valor |
|-------|-------|
| **Rol** | `manager` |
| **Responsabilidades** | KPIs lotes, aprobaciones alto impacto, rentabilidad cartera |
| **Permisos** | `lot:read`, `report:read`, `lot:approve` |

### 4.8 Auditor

| Campo | Valor |
|-------|-------|
| **Rol** | `auditor` |
| **Responsabilidades** | Trazabilidad labores, costos, producción, certificación |
| **Permisos** | `lot:read`, `audit:read` |

---

## 5. Roles involucrados (sistema)

| Rol slug | Uso FMDT |
|----------|----------|
| `admin` | Configuración catálogos labores, políticas costos |
| `agronomist` / `field_agent` | Operación campo |
| `supervisor` | Validación y aprobación |
| `buyer` | Consulta comercial |
| `finance_analyst` | Costos y rentabilidad |
| `precision_ag_specialist` | Telemetría y mapas precisión |
| `manager` | Dashboards y aprobaciones |
| `auditor` | Solo lectura + auditoría |
| `viewer` | Consulta listados |

---

## 6. Historias de Usuario

### US-FMDT-001 — Activar lote productivo desde catastro FTIP

| Campo | Contenido |
|-------|-----------|
| **Como** | agrónomo |
| **Quiero** | activar un lote territorial FTIP como unidad de gestión FMDT |
| **Para** | iniciar registro de labores, costos y gemelo digital |
| **Prioridad** | Crítica |

**Criterios de aceptación:**
- [ ] Requiere `ftipLotUnitId` en estado `productive` o equivalente FTIP
- [ ] Crea `FieldLotProfile` + `LotDigitalTwin` en estado `active`
- [ ] Hereda área, variedad y geometría por referencia FTIP
- [ ] Evento `FieldLotActivated`

---

### US-FMDT-002 — Registrar labor agrícola con evidencias

| Campo | Contenido |
|-------|-----------|
| **Como** | técnico de campo |
| **Quiero** | registrar una fertilización en el lote con fotos, GPS y costos |
| **Para** | documentar manejo y alimentar el gemelo digital |
| **Prioridad** | Crítica |

**Criterios de aceptación:**
- [ ] Tipo labor catálogo `field.operation_type`
- [ ] Fecha, responsable, insumos, costos, evidencias obligatorias según tipo
- [ ] GPS punto o polígono aplicación
- [ ] Evento `FieldOperationRecorded`; actualiza twin y costos

---

### US-FMDT-003 — Consultar Gemelo Digital del lote

| Campo | Contenido |
|-------|-----------|
| **Como** | comprador |
| **Quiero** | ver historial producción, labores, costos y calidad de un lote |
| **Para** | evaluar potencial de compra y trazabilidad |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] Timeline unificada: labores, compras, calidad, visitas, alertas
- [ ] KPIs materializados en `LotDigitalTwin`
- [ ] Enlaces a registros origen sin duplicar datos

---

### US-FMDT-004 — Registrar cosecha y producción real

| Campo | Contenido |
|-------|-----------|
| **Como** | agrónomo |
| **Quiero** | registrar cosecha del lote con kg estimados y área cosechada |
| **Para** | actualizar producción histórica y rendimiento |
| **Prioridad** | Crítica |

**Criterios de aceptación:**
- [ ] Crea `HarvestRecord` por campaña
- [ ] Concilia con compras CPE (`PurchaseConfirmed`)
- [ ] Actualiza `productionActualKg`, yield kg/ha en twin

---

### US-FMDT-005 — Gestionar costos del lote

| Campo | Contenido |
|-------|-----------|
| **Como** | analista de costos |
| **Quiero** | ver desglose de costos por categoría y calcular rentabilidad |
| **Para** | evaluar viabilidad económica del lote |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] Costos desde labores + cargos manuales autorizados
- [ ] Auto-cálculo costo/ha, costo/kg, margen vs ingresos CPE
- [ ] Tendencias por campaña en twin

---

### US-FMDT-006 — Definir zona de manejo operativa

| Campo | Contenido |
|-------|-----------|
| **Como** | especialista precisión |
| **Quiero** | crear zonas de manejo dentro del lote con distintas recomendaciones |
| **Para** | aplicar agricultura de precisión diferenciada |
| **Prioridad** | Media |

**Criterios de aceptación:**
- [ ] Referencia `ftipManagementZoneId` o subpolígono validado FTIP
- [ ] Labores y costos asignables por zona
- [ ] Mapa temático por zona (GIS Engine)

---

### US-FMDT-007 — Recibir recomendación IA de fertilización

| Campo | Contenido |
|-------|-----------|
| **Como** | agrónomo |
| **Quiero** | recibir sugerencia de fertilización según suelo, clima y estado fenológico |
| **Para** | optimizar nutrición del lote |
| **Prioridad** | Media |

**Criterios de aceptación:**
- [ ] Recomendación con confianza y fuentes
- [ ] Agrónomo acepta, modifica o rechaza
- [ ] Si acepta, genera labor planificada o plan AITAP vinculado

---

### US-FMDT-008 — Captura offline de labor en Android

| Campo | Contenido |
|-------|-----------|
| **Como** | técnico de campo |
| **Quiero** | registrar poda offline con fotos y firma productor |
| **Para** | no perder datos sin conectividad |
| **Prioridad** | Crítica |

**Criterios de aceptación:**
- [ ] `externalId` idempotencia sync
- [ ] Cola media → EDMKP al sincronizar
- [ ] Sin duplicados en servidor

---

### US-FMDT-009 — Alertas de labores vencidas

| Campo | Contenido |
|-------|-----------|
| **Como** | supervisor |
| **Quiero** | recibir alerta cuando labores planificadas no se ejecutan |
| **Para** | cumplir plan de manejo y certificaciones |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] Alerta OCC FMDT-ALT-07
- [ ] Configurable días tolerancia por tipo labor

---

### US-FMDT-010 — Integrar telemetría IoT (futuro)

| Campo | Contenido |
|-------|-----------|
| **Como** | especialista precisión |
| **Quiero** | vincular estación meteorológica y sensores humedad al lote |
| **Para** | monitorear condiciones y disparar alertas |
| **Prioridad** | Baja (R5) |

**Criterios de aceptación:**
- [ ] `LotSensorBinding` con fuente IEL
- [ ] Lecturas en twin; umbrales configurables

---

### US-FMDT-011 — Reporte productividad por lote

| Campo | Contenido |
|-------|-----------|
| **Como** | gerente |
| **Quiero** | exportar ranking productividad kg/ha por zona y variedad |
| **Para** | priorizar extensión y compras |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] Reporte FMDT-RPT-07
- [ ] Filtros campaña, municipio, variedad

---

### US-FMDT-012 — Renovar lote cafetal

| Campo | Contenido |
|-------|-----------|
| **Como** | agrónomo |
| **Quiero** | registrar renovación con erradicación, siembra y nuevo CropStand |
| **Para** | mantener historial completo del ciclo productivo |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] Cierra cultivo anterior; abre nuevo con fechas
- [ ] Sincroniza con FTIP `CropStandRenovated`
- [ ] Labores erradicación + siembra en timeline

---

## 7. Casos de Uso

| ID | Caso de uso | Actor principal | Resultado |
|----|-------------|-----------------|-----------|
| CU-FMDT-01 | Activar lote productivo | Agrónomo | FieldLotProfile active |
| CU-FMDT-02 | Registrar labor agrícola | Técnico | FieldOperation + costos |
| CU-FMDT-03 | Ver Gemelo Digital lote | Comprador | LotDigitalTwin |
| CU-FMDT-04 | Registrar cosecha | Agrónomo | HarvestRecord |
| CU-FMDT-05 | Cargar costo manual | Finanzas | LotCostEntry |
| CU-FMDT-06 | Calcular rentabilidad campaña | Gerente | KPIs margen |
| CU-FMDT-07 | Crear zona manejo operativa | Precisión | ManagementZoneOp |
| CU-FMDT-08 | Vincular sensor IoT | Especialista | LotSensorBinding |
| CU-FMDT-09 | Consultar NDVI lote | Agrónomo | Índice satélite |
| CU-FMDT-10 | Validar labor supervisor | Supervisor | status verified |
| CU-FMDT-11 | Planificar labor desde IA | Agrónomo | Recomendación → labor |
| CU-FMDT-12 | Exportar expediente lote | Auditor | PDF trazabilidad |
| CU-FMDT-13 | Inactivar lote | Supervisor | status inactive |
| CU-FMDT-14 | Conciliar producción CPE | Sistema | deliveredKg actualizado |
| CU-FMDT-15 | Sync offline Android | Técnico | Labores sin duplicar |

---

## 8. Reglas de Negocio

### 8.1 Identidad y vinculación

| ID | Regla |
|----|-------|
| RN-FMDT-001 | Todo `FieldLotProfile` debe referenciar `ftipLotUnitId` activo en FTIP |
| RN-FMDT-002 | FMDT **no almacena polígono autoritativo** — consume geometría vía FTIP/GIS |
| RN-FMDT-003 | Lote FMDT ≠ lote inventario CITE — códigos y entidades distintas |
| RN-FMDT-004 | Un `ftipLotUnitId` tiene máximo un `FieldLotProfile` activo por org |
| RN-FMDT-005 | Alta FMDT requiere finca FTIP `active` y productor PRM vinculado |

### 8.2 Estado del lote

| ID | Regla |
|----|-------|
| RN-FMDT-010 | Estados: `draft`, `active`, `fallow`, `renovation`, `inactive`, `abandoned` |
| RN-FMDT-011 | Solo `active` y `renovation` permiten labores productivas |
| RN-FMDT-012 | `abandoned` conserva historial; bloquea nuevas labores y compras futuras |
| RN-FMDT-013 | Transición a `inactive` requiere supervisor + sin labores pendientes críticas |

### 8.3 Labores agrícolas

| ID | Regla |
|----|-------|
| RN-FMDT-020 | Toda labor registra: tipo, fecha, lote, responsable, área tratada |
| RN-FMDT-021 | Labores con agroinsumos requieren catálogo producto y dosis |
| RN-FMDT-022 | Aplicación fitosanitaria requiere evidencia y ventana re-ingreso si aplica |
| RN-FMDT-023 | Labor en visita AITAP debe vincular `visitId` y opcional `aitapActivityId` |
| RN-FMDT-024 | Labor standalone FMDT publica evento consumible por AITAP timeline |
| RN-FMDT-025 | Supervisor puede marcar labor `verified` o `disputed` |
| RN-FMDT-026 | No eliminar labor verificada — solo anular con motivo auditado |
| RN-FMDT-027 | Cosecha labor cierra parcial o total campaña según configuración |

### 8.4 Costos

| ID | Regla |
|----|-------|
| RN-FMDT-030 | Todo costo asociado a `fieldLotId` y campaña |
| RN-FMDT-031 | Costos de labor se generan automáticamente desde `FieldOperation` |
| RN-FMDT-032 | Costos manuales requieren categoría catálogo y aprobación si > umbral |
| RN-FMDT-033 | Costo/ha = costo total / área tratada o área lote según tipo |
| RN-FMDT-034 | Costo/kg = costo total campaña / kg producidos reales |
| RN-FMDT-035 | Margen = ingresos CPE − costos FMDT − costos asignados indirectos |
| RN-FMDT-036 | Costos indirectos distribuidos por política org (área, producción) |

### 8.5 Producción

| ID | Regla |
|----|-------|
| RN-FMDT-040 | Producción real autoritativa desde CPE; declaraciones campo como estimación |
| RN-FMDT-041 | `HarvestRecord` no puede exceder producción estimada × factor tolerancia sin aprobación |
| RN-FMDT-042 | Rendimiento kg/ha usa área productiva FTIP al momento de cosecha |
| RN-FMDT-043 | Historial producción inmutable por campaña cerrada |

### 8.6 Gemelo Digital

| ID | Regla |
|----|-------|
| RN-FMDT-050 | `LotDigitalTwin` es proyección materializada — no fuente transaccional |
| RN-FMDT-051 | Timeline: labores, costos, producción, compras, calidad, visitas, alertas, cambios |
| RN-FMDT-052 | Refresh ante: FieldOperation, Harvest, Purchase, Visit, Quality, Cost |
| RN-FMDT-053 | IA no registra labores automáticamente sin aprobación humana |

### 8.7 Agricultura de precisión

| ID | Regla |
|----|-------|
| RN-FMDT-060 | Telemetría IoT referencia externa IEL — FMDT almacena índice y umbrales |
| RN-FMDT-061 | NDVI/EVI son lecturas, no modifican estado agronómico sin validación |
| RN-FMDT-062 | Zona manejo operativa ⊆ polígono lote FTIP |

### 8.8 Integraciones

| ID | Regla |
|----|-------|
| RN-FMDT-070 | FTIP es fuente de área, altitud, pendiente, orientación, suelo base |
| RN-FMDT-071 | AITAP es fuente de visitas y planes; FMDT consume para twin |
| RN-FMDT-072 | CQIE scores agregados por lote en twin |
| RN-FMDT-073 | Documentos binarios solo en EDMKP |

---

## 9. Flujo principal — Activación de lote y primera labor

| Paso | Actor | Acción | Resultado |
|------|-------|--------|-----------|
| 1 | Agrónomo | Selecciona `LotUnit` FTIP `productive` sin perfil FMDT | Lista elegibles |
| 2 | Sistema | Valida finca active, productor PRM, geometría FTIP | OK |
| 3 | Agrónomo | Completa perfil operativo (responsable, clasificación) | `FieldLotProfile` draft |
| 4 | Agrónomo | Confirma datos agronómicos (variedad, edad, densidad) | Sincroniza CropStand FTIP |
| 5 | Supervisor | Activa lote FMDT | Estado `active` |
| 6 | Sistema | Inicializa `LotDigitalTwin` + KPIs baseline | `FieldLotActivated` |
| 7 | Agrónomo | Registra primera labor (ej. fertilización) con evidencias | `FieldOperationRecorded` |
| 8 | Sistema | Calcula costos, actualiza twin | Costos y timeline |
| 9 | Sistema | Si plan AITAP existe, marca línea plan `executed` | Sync AITAP |
| 10 | Supervisor | Valida labor si política org | status `verified` |

**Postcondiciones:** Lote operativo con gemelo digital activo, primera labor auditada, costos calculados.

---

## 10. Flujos alternativos

### FA-FMDT-01 — Activación desde visita inicial AITAP

| Paso | Acción |
|------|--------|
| FA1.1 | Visita `initial_linking` identifica lote FTIP sin FMDT |
| FA1.2 | Técnico crea perfil FMDT durante visita |
| FA1.3 | Labores de visita se registran como FieldOperation vinculadas |

### FA-FMDT-02 — Renovación completa del lote

| Paso | Acción |
|------|--------|
| FA2.1 | Agrónomo cambia estado lote a `renovation` |
| FA2.2 | Registra labores erradicación + siembra |
| FA2.3 | FTIP cierra CropStand anterior; nuevo CropStand |
| FA2.4 | Twin conserva historial campañas anteriores |

### FA-FMDT-03 — Cosecha parcial multi-evento

| Paso | Acción |
|------|--------|
| FA3.1 | Varias labores `harvest` en misma campaña |
| FA3.2 | Sistema acumula kg hasta cierre campaña |
| FA3.3 | Conciliación final con compras CPE |

### FA-FMDT-04 — Costo manual sin labor

| Paso | Acción |
|------|--------|
| FA4.1 | Finanzas registra `LotCostEntry` indirecto |
| FA4.2 | Workflow si monto > umbral |
| FA4.3 | Distribuye a KPIs rentabilidad |

### FA-FMDT-05 — Labor offline con conflicto

| Paso | Acción |
|------|--------|
| FA5.1 | Android sincroniza labor con versión antigua del lote |
| FA5.2 | Sistema marca `syncStatus=conflict` |
| FA5.3 | Supervisor resuelve en web |

---

## 11. Casos de error

| ID | Condición | Mensaje | Comportamiento |
|----|-----------|---------|----------------|
| CE-FMDT-01 | Sin ftipLotUnitId | "Debe vincular lote territorial FTIP" | Rechaza alta |
| CE-FMDT-02 | Lote FTIP inactivo | "El lote catastral no está activo" | Rechaza activación |
| CE-FMDT-03 | Labor sin tipo | "Seleccione tipo de labor" | Rechaza guardado |
| CE-FMDT-04 | Fitosanitario sin producto | "Registre producto y dosis" | Rechaza |
| CE-FMDT-05 | Área tratada > área lote | "Área tratada excede área del lote" | Rechaza |
| CE-FMDT-06 | Cosecha > tolerancia estimada | "Producción excede estimación. Requiere aprobación" | Workflow |
| CE-FMDT-07 | Costo manual sin categoría | "Categoría de costo obligatoria" | Rechaza |
| CE-FMDT-08 | Lote abandoned | "Lote abandonado no admite labores" | Bloquea |
| CE-FMDT-09 | Sync duplicado externalId | "Registro ya sincronizado" | Idempotente OK |
| CE-FMDT-10 | Zona manejo fuera de lote | "Zona excede límite del lote" | Rechaza GIS |

---

## 12. Validaciones

### 12.1 Información general del lote (`FieldLotProfile`)

| Campo | Obligatorio | Validación |
|-------|-------------|------------|
| fieldLotId | Sí | UUID |
| ftipLotUnitId | Sí | FTIP existente, único org |
| farmUnitId | Sí | Ref FTIP finca |
| lotCode | Sí | Heredado FTIP o alias único org |
| lotName | Sí | 3–200 caracteres |
| status | Sí | Enum FMDT |
| lotTypeCode | Sí | `farm.lot_type` |
| totalAreaHa | Sí | Espejo FTIP; readonly |
| cultivableAreaHa | Sí | ≤ totalAreaHa |
| plantedAreaHa | Sí | ≤ cultivableAreaHa |
| unproductiveAreaHa | No | ≤ totalAreaHa |
| centroidGeo | Sistema | Desde FTIP |
| boundaryGeoRef | Sistema | activeGeometryId FTIP |
| altitudeM | No | Desde FTIP/DEM |
| slopePct | No | Desde FTIP/GIS |
| aspectCode | No | Catálogo orientación |
| soilTypeCode | No | `territory.soil_type` |
| landUseCode | No | `territory.land_use` |
| assignedTechnicianId | Recomendado | User interno |
| responsibleProducerId | No | PRM si aplica |
| createdAt | Sistema | Auto |
| observations | No | Texto largo |
| tags[] | No | Max 20 |
| classifications[] | No | Catálogo org |

### 12.2 Información agronómica (`LotAgronomicState`)

| Campo | Obligatorio | Validación |
|-------|-------------|------------|
| primaryCropCode | Sí | Especie |
| varietyCodes | Sí | `farm.coffee_variety` |
| cropAgeYears | Calculado | Desde plantingDate |
| plantingDate | Sí | ≤ hoy |
| plantingPatternCode | No | Marco plantación |
| densityPlantsHa | Sí | Rango catálogo variedad |
| treeCount | Calculado | density × area |
| phenologicalStageCode | Recomendado | `farm.phenological_stage` |
| expectedYieldKgHa | No | ≥ 0 |
| expectedProductionKg | Calculado | yield × area |
| irrigationTypeCode | No | `farm.irrigation_type` |
| productionSystemCode | No | Convencional/orgánico |
| ftipCropStandId | Sí | Ref CropStand FTIP activo |

### 12.3 Labor agrícola (`FieldOperation`)

| Campo | Obligatorio | Validación |
|-------|-------------|------------|
| operationTypeCode | Sí | `field.operation_type` |
| operationDate | Sí | ≤ hoy + tolerancia futuro config |
| fieldLotId | Sí | Lote active/renovation |
| performedByType | Sí | productor, técnico, cuadrilla, contratista |
| performerIds | Sí | ≥1 responsable |
| areaTreatedHa | Sí | > 0; ≤ área lote |
| managementZoneId | No | Subconjunto lote |
| inputs[] | Según tipo | Producto, dosis, unidad |
| laborCost | No | ≥ 0 |
| inputCost | No | ≥ 0 |
| equipmentCost | No | ≥ 0 |
| totalCost | Calculado | Suma componentes |
| gpsGeo | Recomendado | Point o Polygon |
| evidenceDocumentIds | Según tipo | Fotos, video, firma |
| formSubmissionId | No | Form Engine |
| visitId | No | AITAP |
| signatureContentId | Según política | EDMKP |
| status | Sí | recorded, verified, disputed, voided |

### 12.4 Costos (`LotCostEntry`)

| Campo | Validación |
|-------|------------|
| costCategoryCode | `field.cost_category` obligatorio |
| amount | > 0 |
| currencyCode | Moneda org |
| campaignCode | Campaña vigente |
| sourceType | labor, manual, allocated_indirect |
| fieldOperationId | Si source=labor |
| approvalStatus | pending, approved, rejected |

### 12.5 Producción (`HarvestRecord`)

| Campo | Validación |
|-------|------------|
| campaignCode | Obligatorio |
| harvestedAreaHa | ≤ plantedAreaHa |
| estimatedKg | ≥ 0 |
| actualKg | ≥ 0; concilia CPE |
| harvestStartDate / harvestEndDate | end ≥ start |
| qualityGradeCode | Opcional |

### 12.6 Tipos de labor soportados (catálogo mínimo)

| Código | Categoría |
|--------|-----------|
| `planting` | Siembra |
| `replanting` | Resiembra |
| `fertilization` | Fertilización |
| `amendment` | Enmiendas |
| `pruning` | Poda |
| `suckering` | Deschuponado |
| `stumping` | Plateo |
| `weeding` | Deshierbe |
| `herbicide` | Control malezas |
| `agroinput_application` | Agroinsumos |
| `phytosanitary` | Manejo fitosanitario |
| `irrigation` | Riego |
| `harvest` | Cosecha |
| `renovation` | Renovación |
| `eradication` | Erradicación |
| `sampling` | Muestreo |
| `soil_analysis` | Análisis suelo |
| `foliar_analysis` | Análisis foliar |

---

## 13. Dependencias con otros módulos

| Módulo | Relación |
|--------|----------|
| **FTIP** | Consume — geometría, LotUnit, CropStand, ManagementZone catastral |
| **PRM** | Consume — productor, responsable |
| **AITAP** | Bidireccional — visitas, planes, AgronomicActivity |
| **GIS Engine** | Consume — medición, validación subpolígonos, mapas |
| **MDE** | Consume — farm.*, field.*, agronomic.* |
| **Form Engine** | Consume — formularios labor, análisis |
| **EDMKP** | Consume — fotos, videos, PDFs, firmas |
| **CPE** | CPE → FMDT — compras, producción real |
| **CQIE** | CQIE → FMDT — calidad por lote |
| **CSAE** | Referencia — cupo por lote/finca |
| **CITE** | Referencia — trazabilidad (sin confundir lotes) |
| **CSFE** | Referencia — ingresos para margen |
| **IEL** | Consume — IoT, satélite, clima |
| **AIADP** | Consume — recomendaciones, predicciones |
| **Workflow** | Consume — aprobaciones costos, cosechas |
| **Event Engine** | Publica/consume — twin, proyecciones |
| **Sync** | Bidireccional — labores offline |
| **OCC** | Consume — alertas operativas |
| **DPAL** | Alimenta — KPIs oficiales |

---

## 14. Permisos

| Permiso | Descripción | Roles |
|---------|-------------|-------|
| `lot:read` | Consultar lotes y twin | Operativos, viewer |
| `lot:create` | Activar perfil FMDT | agronomist, field_agent |
| `lot:update` | Editar perfil agronómico | agronomist, supervisor |
| `lot:delete` | Inactivar lote | admin, supervisor |
| `lot:approve` | Activar, renovar, abandonar | supervisor, manager |
| `field_operation:create` | Registrar labor | field_agent, agronomist |
| `field_operation:verify` | Validar/disputar labor | supervisor |
| `field_operation:void` | Anular labor | supervisor, admin |
| `lot_cost:read` | Ver costos | finance_analyst, manager |
| `lot_cost:create` | Costo manual | finance_analyst |
| `lot_cost:approve` | Aprobar costos | supervisor, manager |
| `lot:precision` | Sensores, NDVI, zonas | precision_ag_specialist |
| `lot:export` | Reportes | manager, admin |
| `lot:admin` | Catálogos, políticas | admin |

**PBAC:** `field_agent` limitado a lotes en municipios UserScope o cartera asignada.

---

## 15. Auditoría

| Evento auditado | Datos |
|-----------------|-------|
| Alta/activación FieldLotProfile | Diff; usuario |
| Cambio estado agronómico | Antes/después variedad, densidad |
| FieldOperation CRUD | Completo + evidencias refs |
| LotCostEntry manual | Monto, aprobador |
| HarvestRecord | kg, campaña |
| LotDigitalTwin refresh | Timestamp, triggers |
| Anulación labor | Motivo obligatorio |
| Vinculación sensor | deviceId, fuente |
| Recomendación IA aceptada/rechazada | Score, decisión humana |

Retención: historial producción y labores verificadas **inmutable** (solo anulación lógica).

---

## 16. Eventos generados

| Evento | Cuándo |
|--------|--------|
| `FieldLotRegistered` | Alta perfil draft |
| `FieldLotActivated` | Lote operativo active |
| `FieldLotStatusChanged` | Transición estado |
| `FieldOperationRecorded` | Nueva labor |
| `FieldOperationVerified` | Supervisor valida |
| `FieldOperationVoided` | Anulación |
| `LotCostRecorded` | Costo manual o rollup |
| `HarvestRecorded` | Cosecha registrada |
| `HarvestCampaignClosed` | Cierre campaña lote |
| `LotProductionUpdated` | Conciliación CPE |
| `LotDigitalTwinRefreshed` | Proyección actualizada |
| `LotKpiCalculated` | Snapshot KPIs |
| `LotRecommendationIssued` | IA recomendación |
| `LotAlertRaised` | Alerta operativa |
| `LotSensorDataReceived` | Telemetría IoT |
| `ManagementZoneOpCreated` | Zona manejo operativa |
| `LotYieldAnomalyDetected` | IA desviación producción |

Namespace: `field.*` + `coffee.field.*`

---

## 17. Automatizaciones

| ID | Disparador | Acción |
|----|------------|--------|
| AUT-FMDT-01 | Labor fitosanitaria registrada | Calcular ventana re-ingreso; alerta |
| AUT-FMDT-02 | Plan AITAP línea vencida | Alerta OCC + técnico |
| AUT-FMDT-03 | `PurchaseConfirmed` CPE | Actualizar producción real lote |
| AUT-FMDT-04 | CQIE dictamen grave | Flag riesgo en twin |
| AUT-FMDT-05 | Costo campaña > ingresos YTD | Alerta rentabilidad negativa |
| AUT-FMDT-06 | Sin labor en lote productivo 90 días | Alerta manejo |
| AUT-FMDT-07 | NDVI caída > umbral | Sugerir visita AITAP |
| AUT-FMDT-08 | Humedad suelo < umbral | Alerta riego |
| AUT-FMDT-09 | Cierre campaña org | Rollup HarvestRecord |
| AUT-FMDT-10 | Cron nocturno | Recalcular KPIs y costo/kg |

---

## 18. Integración IA

| Función | Entrada | Salida | Humano en loop |
|---------|---------|--------|----------------|
| Recomendación fertilización | Suelo, fenología, clima | Dosis sugerida | Agrónomo aprueba |
| Calendario poda | Edad, variedad, carga | Ventanas poda | Sí |
| Renovación óptima | Rendimiento histórico, edad | Año sugerido | Sí |
| Manejo fitosanitario | Plagas AITAP, clima | Producto/dosis | Sí |
| Predicción producción | Historial, NDVI, clima | kg/ha estimado | Informativo |
| Detección riesgos | Costos, clima, sanidad | Risk score | OCC |
| Alertas tempranas | Sensores, satélite | Alerta | Configurable |
| Optimización costos | Labores, insumos | Alternativas | Finanzas decide |
| Anomalía rendimiento | Actual vs esperado | Investigación | Supervisor |
| Zonas manejo variable | NDVI, suelo | Mapa zonas | Especialista |

**RN-FMDT-053:** IA genera recomendaciones, no ejecuta labores automáticamente.

---

## 19. Integración GIS

| Capacidad | Uso FMDT |
|-----------|----------|
| Medición área labor | Polígono aplicación insumo |
| Medición distancia | Cuadrillas, maquinaria |
| Validación subpolígono | Zona manejo ⊆ lote FTIP |
| Capas temáticas | Productividad, costos/ha, NDVI |
| Curvas nivel | Referencia IEL/DEM overlay |
| Rutas internas | Labores maquinaria (LineString) |
| Puntos GPS | Muestreo, sensores |
| Geocerca labor | Técnico dentro lote al registrar |
| Export GeoJSON | Reportes auditoría |

Geometría autoritativa del lote: **FTIP**. FMDT almacena geometrías de aplicación de labor y zonas operativas.

---

## 20. Integración Android

| Operación | Offline | Detalle |
|-----------|---------|---------|
| Lista lotes asignados | Sí | Cache sync |
| Registrar labor | Sí | externalId |
| GPS punto labor | Sí | captureAccuracyM |
| Fotos/video labor | Sí | Media queue |
| Firma productor | Sí | PNG → EDMKP |
| Formulario labor | Sí | Form Engine cache |
| Cosecha rápida | Sí | HarvestRecord draft |
| Consulta twin resumido | Sí | Lectura cache |
| Costos | No | Solo lectura web |
| Aprobar labor | No | Solo web |

**Sync:** refresh → media → operations push → harvest push → pull twin/events.

---

## 21. Integración Formularios

| Formulario | Uso |
|------------|-----|
| Registro labor genérico | FieldOperation |
| Fertilización detallada | Insumos, dosis, equipo |
| Aplicación fitosanitaria | Producto, REI, evidencia |
| Cosecha | kg, calidad preliminar |
| Análisis suelo/foliar | Vincula LotAgronomicState |
| Inspección lote | Checklist sanidad |
| Acta labor | Firma productor |

Submissions referencian `fieldLotId`, `operationId`, GPS.

---

## 22. Integración Compras (CPE)

| Función | Descripción |
|---------|-------------|
| Origen compra | `fieldLotId` / `ftipLotUnitId` en línea compra |
| Producción real | `PurchaseConfirmed` → `HarvestRecord.actualKg` |
| Ingresos margen | Monto compra alimenta KPI rentabilidad |
| Bloqueo | Lote `abandoned` rechaza compra futura |
| Twin | Compras en timeline con kg y precio |

---

## 23. Integración Calidad (CQIE)

| Función | Descripción |
|---------|-------------|
| Score por lote | Dictámenes agregados en twin |
| Trazabilidad | Origen calidad → lote → labores cosecha |
| Alerta | NC grave → LotAlert + OCC |
| Correlación | Calidad vs labores post-cosecha |

---

## 24. Integración Inventario (CITE)

| Función | Descripción |
|---------|-------------|
| Distinción | InventoryLot (bodega) ≠ FieldLotProfile (campo) |
| Trazabilidad | Desde lote inventario → fieldLotId origen |
| Twin | Solo lectura movimientos relacionados |

---

## 25. Integración Documental (EDMKP)

| Tipo | Entidad | Uso |
|------|---------|-----|
| Fotografías labor | FieldOperation | Evidencia |
| Videos | FieldOperation | Evidencia |
| Informes técnicos | FieldLotProfile | PDF agronómico |
| Análisis laboratorio | LotAgronomicState | Suelo/foliar |
| Certificados | FieldLotProfile | BPA, orgánico lote |
| Planos zona manejo | ManagementZoneOp | Opcional |
| Formularios Kobo | FieldOperation | Submission export |
| Firmas | FieldOperation | Acta labor |
| PDF expediente | FieldLotProfile | Auditoría |

Índice `LotDocument` en FMDT; binarios en EDMKP.

---

## 26. Integración Productores (PRM)

| Función | Dirección |
|---------|-----------|
| Productor responsable | PRM → FMDT `responsibleProducerId` |
| Expediente 360° | PRM consume resumen lotes + twin |
| Cartera técnico | Filtra lotes por assignedTechnicianId |
| Vinculación finca | PRM → FTIP → FMDT cadena |
| Alertas productor | OCC a productor vía PRM contacto |

---

## 27. Integración Fincas (FTIP)

| Función | Dirección |
|---------|-----------|
| Alta lote FMDT | Requiere `ftipLotUnitId` FTIP |
| Geometría | FTIP → FMDT readonly ref |
| Área, altitud, pendiente | FTIP/GIS → FMDT espejo |
| CropStand | FTIP autoritativo; FMDT `LotAgronomicState` sincronizado |
| Subdivisión catastral | FTIP; FMDT hereda o inactiva perfil si lote fusionado |
| Renovación cultivo | FMDT labores + FTIP CropStandRenovated |
| Certificación espacial | FTIP TerritoryCertification → elegibilidad lote |
| FarmDigitalTwin | FTIP agrega resumen lotes hijos desde FMDT KPIs |
| Eventos | `LotUnitUpdated` FTIP → refresh FMDT perfil |

**RN-FMDT-080:** Si FTIP inactiva LotUnit, FMDT transiciona a `inactive` automáticamente.

---

## 28. Modelo de datos funcional

### 28.1 Entidad principal: FieldLotProfile

| Campo | Tipo funcional | Obligatorio | Descripción |
|-------|----------------|-------------|-------------|
| fieldLotId | UUID | Sí | Identificador FMDT |
| organizationId | UUID | Sí | Tenant |
| ftipLotUnitId | Ref FTIP | Sí | Lote territorial catastro |
| farmUnitId | Ref FTIP | Sí | Finca padre |
| parcelId | Ref FTIP | No | Parcela padre |
| lotCode | Texto | Sí | Código único org |
| lotName | Texto | Sí | Nombre operativo |
| status | Enum | Sí | draft, active, fallow, renovation, inactive, abandoned |
| lotTypeCode | Catálogo | Sí | `farm.lot_type` |
| totalAreaHa | Decimal | Sí | Espejo FTIP |
| cultivableAreaHa | Decimal | Sí | Área cultivable |
| plantedAreaHa | Decimal | Sí | Área sembrada actual |
| unproductiveAreaHa | Decimal | No | Improductiva |
| centroidGeoRef | Ref | Sistema | FTIP centroid |
| activeBoundaryRef | Ref | Sistema | FTIP activeGeometryId |
| altitudeM | Decimal | No | Promedio lote |
| slopePct | Decimal | No | Pendiente media |
| aspectCode | Catálogo | No | Orientación |
| soilTypeCode | Catálogo | No | Tipo suelo |
| landUseCode | Catálogo | No | Uso suelo |
| assignedTechnicianId | Ref User | No | Responsable técnico |
| responsibleProducerId | Ref PRM | No | Productor operador |
| activatedAt | Fecha | Sistema | Activación FMDT |
| lastOperationAt | Fecha | Sistema | Última labor |
| lastHarvestAt | Fecha | Sistema | Última cosecha |
| observations | Texto largo | No | |
| tags | Lista | No | |
| classifications | Lista catálogo | No | |
| metadata | JSON | No | Extensible commodity |
| version | Entero | Sí | Optimistic lock |
| externalId | UUID | No | Offline |
| syncStatus | Enum | Sistema | synced, pending, conflict |

### 28.2 Estado agronómico: LotAgronomicState

| Campo | Descripción |
|-------|-------------|
| agronomicStateId | UUID |
| fieldLotId | FK |
| ftipCropStandId | Ref CropStand FTIP |
| primaryCropCode | Especie |
| varietyCodes | Variedades |
| plantingDate | Siembra |
| cropAgeYears | Calculado |
| plantingPatternCode | Marco |
| densityPlantsHa | Densidad |
| treeCount | Calculado |
| phenologicalStageCode | Estado fenológico |
| expectedYieldKgHa | Producción esperada |
| expectedProductionKg | Total esperado campaña |
| irrigationTypeCode | Riego |
| productionSystemCode | Sistema producción |
| shadeTypeCode | Sombrío |
| lastSoilAnalysisAt | Fecha último análisis |
| lastFoliarAnalysisAt | Fecha foliar |
| effectiveFrom / effectiveUntil | Versionamiento |

### 28.3 Labor agrícola: FieldOperation

| Campo | Descripción |
|-------|-------------|
| operationId | UUID |
| fieldLotId | FK |
| operationTypeCode | `field.operation_type` |
| operationDate | Fecha ejecución |
| performedByType | Tipo ejecutor |
| performerIds | Responsables |
| areaTreatedHa | Área tratada |
| managementZoneOpId | Zona manejo opcional |
| inputsUsed | JSON insumos |
| equipmentUsed | JSON maquinaria |
| weatherConditions | JSON clima campo |
| laborCost, inputCost, equipmentCost, transportCost | Componentes |
| totalCost | Calculado |
| gpsGeo | Point/Polygon aplicación |
| visitId | Ref AITAP |
| aitapActivityId | Ref AgronomicActivity |
| planLineId | Ref plan manejo |
| formSubmissionId | Form Engine |
| evidenceDocumentIds | EDMKP |
| signatureContentId | Firma |
| recordedBy, recordedAt | Auditoría |
| verifiedBy, verifiedAt | Supervisor |
| status | recorded, verified, disputed, voided |
| voidReason | Si anulada |
| externalId | Offline |
| notes | |

### 28.4 Costos: LotCostEntry

| Campo | Descripción |
|-------|-------------|
| costEntryId | UUID |
| fieldLotId | FK |
| campaignCode | Campaña |
| costCategoryCode | mano_obra, insumos, fertilizantes, transporte, maquinaria, herramientas, servicios, indirectos |
| amount | Monto |
| currencyCode | Moneda |
| sourceType | labor, manual, allocated |
| fieldOperationId | Si aplica |
| description | |
| approvalStatus | pending, approved, rejected |
| approvedBy | |
| costDate | |

### 28.5 Producción: HarvestRecord

| Campo | Descripción |
|-------|-------------|
| harvestId | UUID |
| fieldLotId | FK |
| campaignCode | Campaña |
| harvestStartDate / harvestEndDate | Ventana |
| harvestedAreaHa | Área |
| estimatedKg | Estimación campo |
| actualKg | Real (CPE) |
| yieldKgHa | Calculado |
| qualityGradeCode | Preliminar |
| fieldOperationId | Labor cosecha |
| status | open, closed |
| closedAt | Cierre campaña |

### 28.6 Gemelo Digital: LotDigitalTwin

| Campo | Descripción |
|-------|-------------|
| fieldLotId | FK 1:1 |
| lastRefreshedAt | Timestamp |
| statusSummary | Estado operativo |
| varietySummary | Variedades activas |
| productionYtdKg | Producción campaña |
| productionLastCampaignKg | Anterior |
| avgYieldKgHa | Rendimiento |
| expectedYieldKgHa | Esperado |
| totalCostYtd | Costos campaña |
| costPerHa | Costo/hectárea |
| costPerKg | Costo/kg |
| revenueYtd | Ingresos CPE |
| marginPct | Margen |
| marginTrend | up, down, stable |
| qualityAvgScore | CQIE |
| operationsCountYtd | Labores |
| lastOperationType | Última labor |
| pendingOperationsCount | Planificadas vencidas |
| riskFlags | JSON alertas |
| compliancePct | Cumplimiento plan AITAP |
| ndviLatest | Último índice |
| soilMoistureLatest | Sensor |
| timelinePreview | Últimos N eventos |
| monthlyProduction | JSON serie mensual |
| annualProduction | JSON serie anual |

### 28.7 Zona manejo operativa: ManagementZoneOp

| Campo | Descripción |
|-------|-------------|
| zoneOpId | UUID |
| fieldLotId | FK |
| ftipManagementZoneId | Ref FTIP opcional |
| zoneCode, zoneName | |
| zoneType | soil, nutrition, irrigation, pest, yield |
| applicationGeo | Polygon aplicación |
| areaHa | |
| recommendationProfile | JSON dosis variable |
| status | active, inactive |

### 28.8 Agricultura de precisión: LotSensorBinding

| Campo | Descripción |
|-------|-------------|
| bindingId | UUID |
| fieldLotId | FK |
| sensorType | weather_station, soil_moisture, rain_gauge, ndvi_feed |
| externalDeviceId | IEL |
| locationGeo | Point |
| activeFrom / activeUntil | |
| alertThresholds | JSON |

### 28.9 Telemetría: LotTelemetryReading (proyección)

| Campo | Descripción |
|-------|-------------|
| readingId | UUID |
| fieldLotId | FK |
| metricCode | ndvi, evi, soil_moisture, temperature, rainfall, solar_radiation, wind_speed |
| value | Decimal |
| unit | |
| capturedAt | |
| source | iot, satellite, weather_api |

### 28.10 Documentos: LotDocument

| Campo | Descripción |
|-------|-------------|
| documentId | UUID índice |
| fieldLotId | FK |
| entityType | lot, operation, harvest |
| entityId | |
| documentTypeCode | foto, video, informe, analisis, certificado, plano, formulario, firma, pdf |
| contentId | EDMKP |
| title, capturedAt, gpsGeo | |
| verifiedAt | |

### 28.11 Entidades relacionadas (resumen)

| Entidad | Relación |
|---------|----------|
| LotAgronomicState | 1:N histórico por lote |
| FieldOperation | 1:N labores |
| LotCostEntry | 1:N costos |
| HarvestRecord | 1:N campañas |
| ManagementZoneOp | 1:N zonas |
| LotSensorBinding | 1:N sensores |
| LotTelemetryReading | 1:N lecturas |
| LotDocument | 1:N documentos |
| LotKpiSnapshot | 1:N histórico KPIs |
| LotRecommendation | 1:N IA |

---

## 29. API funcional

**Base path:** `/api/v1/fmdt`

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/lots` | `lot:read` | Listar lotes con filtros |
| POST | `/lots` | `lot:create` | Activar perfil desde FTIP |
| GET | `/lots/:id` | `lot:read` | Detalle FieldLotProfile |
| PATCH | `/lots/:id` | `lot:update` | Actualizar perfil |
| DELETE | `/lots/:id` | `lot:delete` | Inactivar |
| POST | `/lots/:id/lifecycle` | `lot:approve` | Transición estado |
| GET | `/lots/:id/twin` | `lot:read` | Gemelo Digital |
| GET | `/lots/:id/timeline` | `lot:read` | Timeline operativa |
| GET | `/lots/:id/kpis` | `lot:read` | KPIs materializados |
| GET | `/lots/:id/agronomic-state` | `lot:read` | Estado agronómico |
| PATCH | `/lots/:id/agronomic-state` | `lot:update` | Actualizar agronomía |
| GET | `/lots/:id/operations` | `lot:read` | Labores |
| POST | `/lots/:id/operations` | `field_operation:create` | Registrar labor |
| PATCH | `/operations/:opId` | `field_operation:create` | Editar labor |
| POST | `/operations/:opId/verify` | `field_operation:verify` | Validar |
| POST | `/operations/:opId/void` | `field_operation:void` | Anular |
| GET | `/lots/:id/costs` | `lot_cost:read` | Costos |
| POST | `/lots/:id/costs` | `lot_cost:create` | Costo manual |
| POST | `/costs/:id/approve` | `lot_cost:approve` | Aprobar costo |
| GET | `/lots/:id/harvests` | `lot:read` | Cosechas |
| POST | `/lots/:id/harvests` | `field_operation:create` | Registrar cosecha |
| POST | `/harvests/:id/close` | `lot:approve` | Cerrar campaña |
| GET | `/lots/:id/zones` | `lot:read` | Zonas manejo |
| POST | `/lots/:id/zones` | `lot:precision` | Crear zona |
| GET | `/lots/:id/sensors` | `lot:precision` | Sensores |
| POST | `/lots/:id/sensors` | `lot:precision` | Vincular sensor |
| GET | `/lots/:id/telemetry` | `lot:precision` | Lecturas |
| GET | `/lots/:id/documents` | `lot:read` | Documentos |
| POST | `/lots/:id/documents` | `document:upload` | Índice EDMKP |
| GET | `/lots/:id/recommendations` | `lot:read` | IA recomendaciones |
| POST | `/lots/:id/recommendations/:recId/accept` | `lot:update` | Aceptar IA |
| GET | `/operation-types` | `lot:read` | Catálogo labores |
| POST | `/lots/sync` | `field_operation:create` | Batch Android |
| GET | `/reports/:reportCode` | `lot:export` | Reportes FMDT-RPT-* |

---

## 30. Interfaz (especificación funcional — sin diseño gráfico)

| ID | Pantalla | Descripción |
|----|----------|-------------|
| UI-FMDT-01 | Listado lotes | Filtros, export, mapa |
| UI-FMDT-02 | Expediente lote / Twin | Pestañas: general, agronomía, labores, costos, producción, calidad, documentos, timeline, KPIs |
| UI-FMDT-03 | Formulario activar lote | Desde FTIP LotUnit |
| UI-FMDT-04 | Registrar labor | Wizard por tipo |
| UI-FMDT-05 | Detalle labor | Evidencias, costos, mapa GPS |
| UI-FMDT-06 | Panel costos | Desglose, gráficos tendencia |
| UI-FMDT-07 | Producción campaña | Harvest + conciliación CPE |
| UI-FMDT-08 | Zonas manejo | Mapa + tabla |
| UI-FMDT-09 | Precisión / sensores | Telemetría, NDVI |
| UI-FMDT-10 | Recomendaciones IA | Aceptar/rechazar |
| UI-FMDT-11 | Dashboard KPIs lotes | Widgets org/zona |
| UI-FMDT-12 | Cola validación labores | Supervisor |
| UI-FMDT-13 | Comparativo rentabilidad | Lotes ranking |

---

## 31. Android (especificación funcional)

| ID | Flujo | Offline |
|----|-------|---------|
| AND-FMDT-01 | Mis lotes | Cache |
| AND-FMDT-02 | Registrar labor rápida | Sí |
| AND-FMDT-03 | Labor con formulario completo | Sí |
| AND-FMDT-04 | Cosecha campo | Sí |
| AND-FMDT-05 | Fotos/video labor | Sí |
| AND-FMDT-06 | Firma acta | Sí |
| AND-FMDT-07 | GPS automático | Sí |
| AND-FMDT-08 | Twin resumido | Lectura cache |
| AND-FMDT-09 | Conflictos sync | Resolución web |

---

## 32. Reportes

| ID | Reporte | Descripción | Filtros |
|----|---------|-------------|---------|
| FMDT-RPT-01 | Padrón lotes | Listado completo | Zona, estado |
| FMDT-RPT-02 | Labores por periodo | Detalle operaciones | Tipo, técnico, fecha |
| FMDT-RPT-03 | Costos por lote | Desglose categorías | Campaña, lote |
| FMDT-RPT-04 | Costo por hectárea | Ranking | Municipio, variedad |
| FMDT-RPT-05 | Costo por kilogramo | Eficiencia económica | Campaña |
| FMDT-RPT-06 | Rentabilidad lote | Margen ingresos−costos | Campaña |
| FMDT-RPT-07 | Productividad kg/ha | Rendimiento | Variedad, zona |
| FMDT-RPT-08 | Producción mensual | Serie temporal | Lote, año |
| FMDT-RPT-09 | Producción anual | Comparativo años | Finca, org |
| FMDT-RPT-10 | Historial cosechas | Por campaña | Lote |
| FMDT-RPT-11 | Calidad por lote | Scores CQIE | Periodo |
| FMDT-RPT-12 | Cumplimiento labores | Plan AITAP vs ejecutado | Técnico |
| FMDT-RPT-13 | Labores vencidas | Pendientes | Días |
| FMDT-RPT-14 | Mapa productividad | Temático GIS | Campaña |
| FMDT-RPT-15 | Mapa costos/ha | Temático GIS | Campaña |
| FMDT-RPT-16 | Expediente lote | PDF trazabilidad | Auditoría |
| FMDT-RPT-17 | Análisis rentabilidad cartera | Por comprador | Zona |
| FMDT-RPT-18 | Sostenibilidad | Labores conservación, insumos | Cert |
| FMDT-RPT-19 | NDVI histórico lote | Serie satélite | Fechas |
| FMDT-RPT-20 | Eficiencia insumos | kg insumo / kg café | Campaña |

---

## 33. KPIs

| ID | KPI | Categoría | Fórmula conceptual |
|----|-----|-----------|-------------------|
| KPI-FMDT-01 | Productividad kg/ha | Producción | actualKg / plantedAreaHa |
| KPI-FMDT-02 | Productividad vs esperado | Producción | actual / expected |
| KPI-FMDT-03 | Producción YTD | Producción | SUM kg campaña |
| KPI-FMDT-04 | Producción mensual promedio | Producción | AVG mensual |
| KPI-FMDT-05 | Costo total/ha | Costos | totalCost / totalAreaHa |
| KPI-FMDT-06 | Costo insumos/kg | Costos | inputCost / actualKg |
| KPI-FMDT-07 | Costo mano obra/ha | Costos | laborCost / area |
| KPI-FMDT-08 | Margen bruto % | Rentabilidad | (revenue−cost)/revenue |
| KPI-FMDT-09 | Rentabilidad/ha | Rentabilidad | margin / area |
| KPI-FMDT-10 | Tendencia margen | Rentabilidad | Δ margen campañas |
| KPI-FMDT-11 | Score calidad promedio | Calidad | AVG CQIE |
| KPI-FMDT-12 | NC calidad / ton | Calidad | COUNT NC / kg |
| KPI-FMDT-13 | Riesgo sanitario | Riesgos | COUNT alertas fito |
| KPI-FMDT-14 | Labores cumplidas % | Cumplimiento | ejecutadas / planificadas |
| KPI-FMDT-15 | Labores vencidas | Cumplimiento | COUNT overdue |
| KPI-FMDT-16 | Eficiencia operativa | Eficiencia | kg / labor hora |
| KPI-FMDT-17 | Cobertura extensión lote | Eficiencia | lotes visitados / activos |
| KPI-FMDT-18 | Uso agroinsumo/ha | Sostenibilidad | qty insumo / ha |
| KPI-FMDT-19 | Labores conservación | Sostenibilidad | COUNT conservación |
| KPI-FMDT-20 | NDVI promedio | Precisión | AVG ndvi periodo |

### 33.1 Alertas (OCC)

| ID | Alerta |
|----|--------|
| FMDT-ALT-01 | Labor fitosanitaria sin evidencia |
| FMDT-ALT-02 | Costo campaña supera presupuesto |
| FMDT-ALT-03 | Margen negativo proyectado |
| FMDT-ALT-04 | Producción bajo umbral variedad |
| FMDT-ALT-05 | Rendimiento anómalo vs histórico |
| FMDT-ALT-06 | Sin labor en periodo configurado |
| FMDT-ALT-07 | Plan AITAP incumplido |
| FMDT-ALT-08 | Sensor fuera de rango |
| FMDT-ALT-09 | NDVI caída abrupta |
| FMDT-ALT-10 | Cosecha sin conciliación CPE |

---

## 34. Escalabilidad

### 34.1 Millones de lotes

| Aspecto | Requisito |
|---------|-----------|
| Listados | Paginación; índice código, finca, municipio, variedad |
| Twin | Materializado; timeline últimos N en vista |
| Labores | Particionado por org + campaña |
| Costos | Agregados pre-calculados en snapshot |
| Telemetría | Time-series externa; FMDT solo índices |

### 34.2 Multiempresa

- Aislamiento `organizationId`
- Políticas costos y catálogos labores por org
- KPIs sin cruce tenant

### 34.3 Multipaís

- Catálogos labores e insumos por país
- Unidades métricas con conversión display
- Regulaciones fitosanitarias por `geo.country`

### 34.4 Multicultivo

- `FieldLotProfile` agnóstico commodity
- Atributos café en `LotAgronomicState` + metadata
- Tipos labor extensibles `field.operation_type`

---

## 35. Pruebas

### 35.1 Funcionales

| ID | Escenario |
|----|-----------|
| TF-FMDT-01 | Activar lote FTIP → FMDT happy path |
| TF-FMDT-02 | Registrar fertilización con costos |
| TF-FMDT-03 | Twin muestra labor y costo |
| TF-FMDT-04 | Cosecha concilia con CPE |
| TF-FMDT-05 | Margen calculado correctamente |
| TF-FMDT-06 | Labor offline sync sin duplicado |
| TF-FMDT-07 | Anular labor verificada rechazada |
| TF-FMDT-08 | Lote abandoned bloquea labor |
| TF-FMDT-09 | Zona manejo fuera lote rechazada |
| TF-FMDT-10 | IA recomendación requiere aceptación |

### 35.2 Integración

| ID | Escenario |
|----|-----------|
| TI-FMDT-01 | FTIP LotUnit inactivo → FMDT inactive |
| TI-FMDT-02 | AITAP visita vincula FieldOperation |
| TI-FMDT-03 | PurchaseConfirmed actualiza HarvestRecord |
| TI-FMDT-04 | CQIE score en twin |
| TI-FMDT-05 | PRM expediente muestra lotes FMDT |
| TI-FMDT-06 | EDMKP documento en LotDocument |

### 35.3 Carga

| ID | Escenario | Criterio |
|----|-----------|----------|
| TC-FMDT-01 | Listado 2M lotes paginado | p95 < 500 ms |
| TC-FMDT-02 | 10k labores sync Android | Sin duplicados |
| TC-FMDT-03 | Rollup costos 100k lotes | < 1 h batch |

---

## 36. Definición de Done

- [ ] US-FMDT-001 a 008 críticas/altas aceptadas PO
- [ ] RN-FMDT-001 a 080 validadas
- [ ] API `/api/v1/fmdt/*` Swagger
- [ ] Integraciones FTIP, AITAP, CPE, CQIE, PRM, EDMKP (TI-FMDT-*)
- [ ] Android labores offline
- [ ] LotDigitalTwin y timeline operativos
- [ ] Reportes FMDT-RPT-01 a 10
- [ ] KPIs KPI-FMDT-01 a 15 en dashboard
- [ ] Demo script actualizado

---

## 37. Futuras Mejoras

| ID | Mejora | Release |
|----|--------|---------|
| FM-FMDT-01 | IoT tiempo real en twin | R5 |
| FM-FMDT-02 | NDVI/EVI live Sentinel | R5 IEL |
| FM-FMDT-03 | Dosis variable por zona VRA | R5 |
| FM-FMDT-04 | Drone ortofoto por lote | R5 |
| FM-FMDT-05 | Portal productor labores | R5 |
| FM-FMDT-06 | ML predicción rendimiento | R5 AIADP |
| FM-FMDT-07 | Huella carbono por lote | R5 |
| FM-FMDT-08 | Integración maquinaria ISOBUS | R5+ |

---

## Control de cambios

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.0 | 2026-07-02 | Emisión inicial especificación funcional FMDT |

---

## Aprobaciones

| Rol | Nombre | Fecha |
|-----|--------|-------|
| Product Owner | AGROERP Product | 2026-07-02 |
| Arquitectura | AGROERP Architecture | Pendiente revisión |
| Desarrollo Lead | — | Pendiente |
| QA Lead | — | Pendiente |

---

*Fin del documento — FMDT v1.0*
