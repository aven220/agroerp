# Especificación Funcional — Fincas (Farm & Digital Twin Platform)

| Campo | Valor |
|-------|-------|
| **Código módulo** | FTIP |
| **Nombre comercial** | Fincas — Gemelo Digital Territorial |
| **Nombre arquitectónico** | Farm & Territory Intelligence Platform |
| **Versión documento** | 1.0 |
| **Estado** | Aprobado para implementación |
| **Product Owner** | AGROERP Product |
| **Release objetivo** | R1 — Master & Territory |
| **Documentos referencia** | `FARM_TERRITORY_INTELLIGENCE_PLATFORM.md`, `COFFEE_DOMAIN.md` §2–4, `MASTER_DATA_ENGINE.md` (`geo.*`, `farm.*`), `PRM_FUNCTIONAL_SPEC.md`, `AGROERP_MASTER_SPECIFICATION.md` |

---

## 1. Objetivo del módulo

Administrar **absolutamente toda la información territorial y agronómica de cada finca** en AGROERP, convirtiendo cada unidad en un **Gemelo Digital (Digital Twin)** que consolida estado actual, historial completo y proyecciones futuras.

FTIP es la **única fuente autoritativa** de geometrías, catastro agrícola (predio → finca → parcela → lote), cultivos, recursos naturales, infraestructura, certificaciones espaciales e historial geográfico. Todo evento operativo del ERP (compras, visitas, calidad, contratos) se **ancla territorialmente** a una finca o lote FTIP.

---

## 2. Alcance

| # | Funcionalidad incluida |
|---|------------------------|
| A-01 | Registro catastral completo: predio, finca, parcela, lote, sub-lote, zona de manejo |
| A-02 | Gemelo Digital por finca: estado + timeline + indicadores materializados |
| A-03 | Captura y versionamiento de polígonos, puntos y líneas (historial inmutable) |
| A-04 | Información general, jurídica, administrativa y de tenencia |
| A-05 | Características agronómicas: cultivos, variedades, densidad, producción, calendario |
| A-06 | Información ambiental: bosques, reservas, agua, biodiversidad, corredores |
| A-07 | Infraestructura georreferenciada (beneficio, secadero, bodega, vías) |
| A-08 | Certificaciones con alcance espacial auditable |
| A-09 | Vinculación productor ↔ finca (puente PRM; geometría solo en FTIP) |
| A-10 | Expediente documental territorial (índice EDMKP) |
| A-11 | Enlaces visitas técnicas, formularios y evidencias geo (AITAP) |
| A-12 | Capas temáticas y mapas de negocio (definición; render GIS Engine) |
| A-13 | Validación topológica y políticas territoriales org |
| A-14 | Proyección compras, calidad, contratos e inventario por finca/lote |
| A-15 | Alertas territoriales configurables |
| A-16 | Reportes y KPIs territoriales |
| A-17 | Captura offline Android: GPS walk, fotos, video, medición |
| A-18 | Recomendaciones y predicciones IA (sin mutación geo automática) |

---

## 3. Exclusiones

| # | Exclusión | Módulo responsable |
|---|-----------|-------------------|
| E-01 | Lifecycle y golden record del productor | PRM |
| E-02 | Ejecución visitas, diagnósticos, planes manejo | AITAP |
| E-03 | Operaciones espaciales (buffer, intersect, tiles) | GIS Engine |
| E-04 | Compra transaccional y recepción | CPE |
| E-05 | Contratos y cupos comerciales | CSAE |
| E-06 | Dictámenes calidad laboratorio | CQIE |
| E-07 | Lote inventario bodega (distinto de lote territorial) | CITE |
| E-08 | Liquidación y pagos | CSFE |
| E-09 | Transporte y rutas externas | CLSE |
| E-10 | Almacenamiento binario documentos | EDMKP |
| E-11 | Procesamiento raster satélite (pipeline) | IEL + AIADP |
| E-12 | Diseño interfaces gráficas / mapas UI | Fuera de esta especificación |

---

## 4. Actores

### 4.1 Administrador SIG / Catastro

| Campo | Valor |
|-------|-------|
| **Rol** | `admin`, `gis_admin` |
| **Responsabilidades** | Políticas territoriales, capas, validación geometrías, fusiones catastrales |
| **Permisos** | `territory:*`, `territory:admin` |

### 4.2 Técnico de campo / Agrónomo

| Campo | Valor |
|-------|-------|
| **Rol** | `field_agent` |
| **Responsabilidades** | Registro finca, polígonos GPS, lotes, cultivos, recursos naturales, evidencias |
| **Permisos** | `farm:create`, `farm:update`, `territory:geometry` |

### 4.3 Supervisor técnico

| Campo | Valor |
|-------|-------|
| **Rol** | `supervisor` |
| **Responsabilidades** | Validar altas finca, aprobar correcciones geométricas, subdivisiones |
| **Permisos** | `farm:approve`, `territory:geometry:approve` |

### 4.4 Comprador / Agente comercial

| Campo | Valor |
|-------|-------|
| **Rol** | `buyer` |
| **Responsabilidades** | Consultar fincas productor, validar ubicación compra, solicitar alta finca |
| **Permisos** | `farm:read` |

### 4.5 Analista de calidad / Certificación

| Campo | Valor |
|-------|-------|
| **Rol** | `quality_analyst` |
| **Responsabilidades** | Validar alcance espacial certificaciones, reportes cumplimiento |
| **Permisos** | `farm:read`, `certification:read` |

### 4.6 Legal / Catastro legal

| Campo | Valor |
|-------|-------|
| **Rol** | `legal` (futuro) |
| **Responsabilidades** | Predios, escrituras, tenencia, disputas |
| **Permisos** | `farm:read`, `predio:update` |

### 4.7 Gerencia operativa

| Campo | Valor |
|-------|-------|
| **Rol** | `manager` |
| **Responsabilidades** | KPIs territoriales, aprobaciones fusión/subdivisión mayor |
| **Permisos** | `farm:read`, `farm:approve`, `report:read` |

### 4.8 Auditor

| Campo | Valor |
|-------|-------|
| **Rol** | `auditor` |
| **Responsabilidades** | Historial geométrico, expediente, trazabilidad EUDR |
| **Permisos** | `farm:read`, `audit:read` |

---

## 5. Roles involucrados (sistema)

| Rol slug | Uso FTIP |
|----------|----------|
| `admin` / `gis_admin` | Configuración y aprobaciones críticas |
| `field_agent` | Captura campo y mantenimiento agronómico |
| `supervisor` | Validación y aprobación |
| `buyer` | Consulta y solicitud alta |
| `quality_analyst` | Certificación espacial |
| `manager` | Aprobaciones alto impacto |
| `auditor` | Solo lectura + auditoría geo |
| `viewer` | Consulta mapas y listados |

---

## 6. Historias de Usuario

### US-FTIP-001 — Registrar finca con polígono GPS

| Campo | Contenido |
|-------|-----------|
| **Como** | técnico de campo |
| **Quiero** | registrar una finca caminando el perímetro con GPS offline |
| **Para** | georreferenciar oficialmente el territorio del productor |
| **Prioridad** | Crítica |

**Criterios de aceptación:**
- [ ] Captura polígono WGS84 con precisión registrada
- [ ] Calcula área vía GIS Engine al sincronizar
- [ ] Estado inicial `draft` o `under_validation`
- [ ] Genera `TerritoryGeometryCaptured` y vincula a PRM

---

### US-FTIP-002 — Subdividir finca en lotes productivos

| Campo | Contenido |
|-------|-----------|
| **Como** | agrónomo |
| **Quiero** | crear lotes territoriales dentro de una finca con polígonos independientes |
| **Para** | trazabilidad por variedad y edad del cafetal |
| **Prioridad** | Crítica |

**Criterios de aceptación:**
- [ ] Suma áreas lotes ≤ área finca (tolerancia configurable)
- [ ] Sin superposición entre lotes activos
- [ ] `GeometryRevision` en finca y cada lote nuevo
- [ ] Distinto de lote inventario CITE

---

### US-FTIP-003 — Consultar Gemelo Digital de finca

| Campo | Contenido |
|-------|-----------|
| **Como** | comprador |
| **Quiero** | ver historial completo de producción, compras, visitas y cambios en una finca |
| **Para** | evaluar potencial comercial antes de contrato |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] Timeline territorial unificada
- [ ] KPIs materializados en `FarmDigitalTwin`
- [ ] Enlaces a registros CPE, AITAP, CSAE sin duplicar datos

---

### US-FTIP-004 — Mapear recursos naturales

| Campo | Contenido |
|-------|-----------|
| **Como** | técnico de campo |
| **Quiero** | registrar quebradas, nacimientos y bosques en el mapa de la finca |
| **Para** | cumplir certificaciones y buffers ambientales |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] Tipos: río, quebrada, nacimiento, bosque, reserva, humedal
- [ ] Geometría Point/Line/Polygon según tipo
- [ ] Evento `NaturalResourceMapped`

---

### US-FTIP-005 — Corregir geometría con historial

| Campo | Contenido |
|-------|-----------|
| **Como** | supervisor SIG |
| **Quiero** | aprobar corrección de polígono con evidencia y motivo |
| **Para** | mantener catastro preciso sin perder historial legal |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] Revisión inmutable antes/después
- [ ] Workflow si delta área > umbral
- [ ] Geometría anterior pasa a `superseded`

---

### US-FTIP-006 — Certificación espacial finca

| Campo | Contenido |
|-------|-----------|
| **Como** | analista certificación |
| **Quiero** | definir polígono certificado orgánico dentro de la finca |
| **Para** | auditar cumplimiento Rainforest/orgánico |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] Polígono cert contenido en finca/lote
- [ ] Validación buffer y no-solape (RN-FTIP-060)
- [ ] Alerta vencimiento certificación

---

### US-FTIP-007 — Registrar cultivo en lote

| Campo | Contenido |
|-------|-----------|
| **Como** | técnico |
| **Quiero** | registrar variedad, edad, densidad y sistema sombrío por lote |
| **Para** | estimar producción y planificar compras |
| **Prioridad** | Crítica |

**Criterios de aceptación:**
- [ ] Catálogos MDE `farm.coffee_variety`, `farm.shade_system`
- [ ] Historial `CropStandHistory` por campaña
- [ ] Evento `CropStandPlanted` o `CropStandRenovated`

---

### US-FTIP-008 — Medir área en campo (Android)

| Campo | Contenido |
|-------|-----------|
| **Como** | técnico |
| **Quiero** | medir distancia y área aproximada en mapa offline |
| **Para** | validar área declarada antes de enviar |
| **Prioridad** | Media |

**Criterios de aceptación:**
- [ ] Herramienta medición vía GIS Engine local/cache
- [ ] No persiste hasta confirmar captura formal

---

### US-FTIP-009 — Alerta superposición fincas

| Campo | Contenido |
|-------|-----------|
| **Como** | administrador SIG |
| **Quiero** | recibir alerta si dos fincas activas se superponen |
| **Para** | resolver conflictos catastrales |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] Validación FTIP-V04 al activar geometría
- [ ] Evento `TerritoryOverlapViolation`
- [ ] Visible en OCC

---

### US-FTIP-010 — Reporte cumplimiento espacial certificación

| Campo | Contenido |
|-------|-----------|
| **Como** | gerencia |
| **Quiero** | reporte de fincas con incumplimiento buffer orgánico |
| **Para** | mitigar riesgo auditoría externa |
| **Prioridad** | Media |

**Criterios de aceptación:**
- [ ] REP-FTIP-011 generado con filtros esquema cert
- [ ] Export PDF/Excel

---

## 7. Casos de Uso

| ID | Caso de uso | Actor | Postcondición |
|----|-------------|-------|---------------|
| CU-FTIP-01 | Registrar finca nueva | Técnico | FarmUnit `draft` + geometría |
| CU-FTIP-02 | Activar finca validada | Supervisor | `active`; habilita CPE/CSAE por finca |
| CU-FTIP-03 | Vincular productor a finca | Comprador/PRM | ProducerTerritoryLink activo |
| CU-FTIP-04 | Subdividir parcela en lotes | Agrónomo | LotUnits + revisiones |
| CU-FTIP-05 | Registrar predio legal | Legal | Predio + escritura EDMKP |
| CU-FTIP-06 | Mapear infraestructura | Técnico | InfrastructureFeature |
| CU-FTIP-07 | Actualizar cultivo / renovación | Técnico | CropStand + historial |
| CU-FTIP-08 | Corregir polígono | SIG + Workflow | GeometryRevision aprobada |
| CU-FTIP-09 | Fusionar lotes | Supervisor | Merge + historial |
| CU-FTIP-10 | Consultar Digital Twin | Cualquier autorizado | Vista lectura |
| CU-FTIP-11 | Captura offline polígono | Android | Sync + validación |
| CU-FTIP-12 | Certificar alcance espacial | Certificación | TerritoryCertification |
| CU-FTIP-13 | Detectar duplicado finca | Sistema/DGMP | Alerta fusión |
| CU-FTIP-14 | Registrar análisis suelo | Técnico | GeographicAttributes |
| CU-FTIP-15 | Inactivar/abandonar finca | Supervisor | `inactive`/`abandoned`; bloqueo operaciones |

---

## 8. Reglas de Negocio

### 8.1 Identidad y unicidad territorial

| ID | Regla |
|----|-------|
| RN-FTIP-001 | `farmCode` único por `organizationId` |
| RN-FTIP-002 | Un polígono activo (`status=active`) por unidad territorial vigente |
| RN-FTIP-003 | Toda modificación geométrica genera `GeometryRevision` inmutable |
| RN-FTIP-004 | FTIP es autoritativo en geometría; PRM solo referencia `ftipFarmUnitId` |
| RN-FTIP-005 | Lote territorial (`LotUnit`) ≠ lote inventario CITE — códigos distintos |

### 8.2 Jerarquía y áreas

| ID | Regla |
|----|-------|
| RN-FTIP-010 | Σ área parcelas ≤ área finca + tolerancia GIS (default 2%) |
| RN-FTIP-011 | Σ área lotes ≤ área parcela padre + tolerancia |
| RN-FTIP-012 | `agriculturalAreaHa` + `forestAreaHa` + `protectedAreaHa` + `infrastructureAreaHa` ≤ `totalAreaHa` |
| RN-FTIP-013 | Subdivisión no puede dejar huecos sin clasificar en finca activa (alerta) |
| RN-FTIP-014 | Fusión unidades requiere workflow y conserva historial hijos |

### 8.3 Estados finca

| ID | Regla |
|----|-------|
| RN-FTIP-020 | Estados: `draft`, `under_validation`, `active`, `inactive`, `abandoned` |
| RN-FTIP-021 | Solo `active` permite compras CPE ancladas a finca/lote |
| RN-FTIP-022 | `abandoned` conserva historial; no nuevas operaciones |
| RN-FTIP-023 | Activación requiere polígono válido + productor PRM vinculado |

### 8.4 Tenencia y legal

| ID | Regla |
|----|-------|
| RN-FTIP-030 | Tipo tenencia obligatorio desde catálogo `farm.tenure_type` |
| RN-FTIP-031 | Arrendamiento requiere `TerritoryDocument` contrato vigente |
| RN-FTIP-032 | Predio disputado (`disputed`) bloquea activación hasta resolución |

### 8.5 Cultivos y producción

| ID | Regla |
|----|-------|
| RN-FTIP-040 | Lote `productive` debe tener ≥1 CropStand activo (configurable) |
| RN-FTIP-041 | Renovación registra cierre CropStand anterior + nuevo con historial |
| RN-FTIP-042 | Producción real en `CropStandHistory` alimentada por CPE y declaraciones |
| RN-FTIP-043 | Estimación producción campaña editable; real sobrescribe al cierre campaña |

### 8.6 Ambiental y certificación

| ID | Regla |
|----|-------|
| RN-FTIP-050 | Área protegida legal no puede incluirse en lote productivo sin excepción workflow |
| RN-FTIP-051 | Buffer área protegida configurable por esquema cert (default según orgánico) |
| RN-FTIP-060 | Polígono certificación ⊆ polígono finca/lote padre |
| RN-FTIP-061 | Certificación vencida invalida prima espacial CSAE (flag proyección) |

### 8.7 Digital Twin

| ID | Regla |
|----|-------|
| RN-FTIP-070 | `FarmDigitalTwin` es proyección materializada — no fuente transaccional |
| RN-FTIP-071 | Timeline incluye: geometría, cultivos, visitas, compras, calidad, docs, alertas |
| RN-FTIP-072 | Refresh twin ante eventos territorio, CPE, AITAP, CQIE, CSAE |
| RN-FTIP-073 | IA no escribe geometría activa sin `GeometryRevision` aprobada |

### 8.8 Integración PRM

| ID | Regla |
|----|-------|
| RN-FTIP-080 | Alta finca requiere `ProducerTerritoryLink` con productor PRM ≥ `registered` |
| RN-FTIP-081 | Desvincular finca bloqueada si CSAE tiene contrato activo sobre ella |
| RN-FTIP-082 | Productor primario (`isPrimary=true`) por finca para compras default |

---

---

## 9. Flujo principal — Registro y activación de finca (Gemelo Digital)

| Paso | Actor | Acción | Resultado |
|------|-------|--------|-----------|
| 1 | Comprador/Técnico | Solicita finca desde productor PRM activo | Solicitud registrada |
| 2 | Sistema | Valida productor PRM y duplicados geo (DGMP) | Sin conflicto |
| 3 | Técnico | Crea `FarmUnit` datos generales + tenencia | Estado `draft` |
| 4 | Técnico | Captura punto GPS referencia o polígono perímetro | `TerritoryGeometryCaptured` |
| 5 | Sistema | GIS calcula área, perímetro, altitud | Atributos derivados |
| 6 | Técnico | Registra parcelas y lotes con cultivos | LotUnits + CropStands |
| 7 | Técnico | Mapea recursos naturales e infraestructura | Features geo |
| 8 | Técnico | Adjunta escritura/planos (EDMKP) | TerritoryDocument |
| 9 | Técnico | Envía a validación | `under_validation` |
| 10 | Supervisor | Revisa topología, áreas, documentos | Aprueba o devuelve |
| 11 | Sistema | Crea `ProducerTerritoryLink` si no existe | Vinculación PRM |
| 12 | Supervisor | Activa finca | Estado `active` |
| 13 | Sistema | Inicializa `FarmDigitalTwin` + KPIs baseline | `FarmUnitActivated` |
| 14 | Sistema | Habilita operaciones CPE/CSAE por finca/lote | Downstream listo |

**Postcondiciones:** Finca activa georreferenciada, gemelo digital inicializado, visible en mapas y expediente PRM.

---

## 10. Flujos alternativos

### FA-FTIP-01 — Registro rápido punto + área declarada

| Paso | Acción |
|------|--------|
| FA1.1 | Técnico captura solo Point GPS + `totalAreaHa` declarada |
| FA1.2 | Sistema marca `geometryConfidence=low`; obliga polígono antes de `active` |
| FA1.3 | Continúa validación documental en paralelo |

### FA-FTIP-02 — Importación catastro CAD/GeoJSON

| Paso | Acción |
|------|--------|
| FA2.1 | SIG importa archivo con polígono predio/finca |
| FA2.2 | VAL ejecuta topología FTIP-V01 a V07 |
| FA2.3 | Workflow supervisor SIG si área > umbral vs declarada |

### FA-FTIP-03 — Corrección geométrica post-auditoría

| Paso | Acción |
|------|--------|
| FA3.1 | Auditor/certificadora exige ajuste buffer |
| FA3.2 | SIG propone nuevo polígono con `changeReason=correct` |
| FA3.3 | `GeometryRevisionApproved`; anterior `superseded` |

### FA-FTIP-04 — Finca multi-predio

| Paso | Acción |
|------|--------|
| FA4.1 | Legal registra 2+ Predios con escrituras |
| FA4.2 | Una FarmUnit operativa agrupa predios |
| FA4.3 | Polígono finca = unión validada GIS |

### FA-FTIP-05 — Abandono finca

| Paso | Acción |
|------|--------|
| FA5.1 | Supervisor marca `abandoned` con motivo |
| FA5.2 | Cierra CropStands activos; conserva historial |
| FA5.3 | Bloquea compras futuras; mantiene trazabilidad histórica |

---

## 11. Casos de error

| ID | Condición | Mensaje | Comportamiento |
|----|-----------|---------|----------------|
| CE-FTIP-01 | Polígono auto-intersectado | "El polígono no es válido. Corrija el perímetro." | Rechaza guardado |
| CE-FTIP-02 | Superposición finca activa | "Superposición con finca {farmCode}" | Bloquea activación; alerta OCC |
| CE-FTIP-03 | Área lotes excede finca | "La suma de lotes supera el área de la finca" | Rechaza subdivisión |
| CE-FTIP-04 | Sin productor vinculado | "Debe vincular un productor antes de activar" | Bloquea activación |
| CE-FTIP-05 | GPS precisión insuficiente | "Precisión GPS {n}m supera máximo {max}m" | Advertencia o rechazo según política |
| CE-FTIP-06 | Certificación fuera de finca | "El alcance certificado excede el límite de la finca" | Rechaza cert espacial |
| CE-FTIP-07 | Sync conflicto geometría | "Conflicto de versión. Resuelva en web." | `syncStatus=conflict` |
| CE-FTIP-08 | Desvincular con contrato activo | "Finca con contrato activo no puede desvincularse" | Bloquea operación |

---

## 12. Validaciones

### 12.1 Información general finca (`FarmUnit`)

| Campo | Obligatorio | Validación |
|-------|-------------|------------|
| farmCode | Sí | Único org; patrón configurable |
| farmName | Sí | 3–200 caracteres |
| status | Sí | Enum estados FTIP |
| farmTypeCode | Sí | `farm.type` MDE |
| productionSystemCode | Recomendado | `farm.production_system` |
| countryCode / departmentCode / municipalityCode | Sí | Jerarquía geo MDE |
| veredaCode | Recomendado | `geo.vereda` |
| streetAddress / accessNotes | No | Texto |
| centroidGeo | Sí si no polígono | Point válido |
| boundaryGeo / activeGeometryId | Sí para `active` | Polígono válido VAL |
| totalAreaHa | Sí | > 0; coherente con GIS ±tolerancia |
| agriculturalAreaHa | Sí | ≤ totalAreaHa |
| forestAreaHa | No | ≤ totalAreaHa |
| protectedAreaHa | No | ≤ totalAreaHa |
| infrastructureAreaHa | No | ≤ totalAreaHa |
| availableAreaHa | Calculado | total − (agr+forest+protected+infra) |
| altitudeMinM / altitudeMaxM | No | Derivado DEM o captura |
| tenureTypeCode | Sí | `farm.tenure_type` |
| legalStatusCode | No | `farm.legal_status` |
| landUseCode | No | `territory.land_use` |
| landCoverCode | No | `territory.land_cover` |
| registeredAt | Sistema | Auto |
| observations | No | Texto largo |
| tags[] | No | Max 20 |
| classifications[] | No | Catálogo org |

### 12.2 Productor y administración

| Campo | Validación |
|-------|------------|
| producerId (link) | PRM existente; relación `owner`/`operator`/`tenant` |
| farmAdministratorId | User interno opcional |
| producerPrimary | Un `isPrimary=true` por finca |

### 12.3 Predio legal (`Predio`)

| Campo | Validación |
|-------|------------|
| cadastralNumber | Único org si informado |
| ownerPartyIds | ≥1 propietario |
| registrationDocumentId | EDMKP si tenencia propiedad |

### 12.4 Lote territorial (`LotUnit`)

| Campo | Validación |
|-------|------------|
| lotCode | Único dentro finca |
| areaHa | ≥ mínimo productivo (config org, ej. 0.1 ha) |
| boundaryGeo | Polígono válido; dentro parcela/finca |
| status | Enum lot status |

### 12.5 Cultivo (`CropStand`)

| Campo | Validación |
|-------|------------|
| speciesCode / varietyCodes | MDE café |
| plantingDate | ≤ hoy |
| densityPlantsHa | Rango catálogo variedad |
| estimatedYieldKgHa | ≥ 0 |

### 12.6 Ambiental (`NaturalResourceFeature`)

| Campo | Validación |
|-------|------------|
| resourceType | Enum tipos |
| geometryGeo | Tipo acorde (río=Line, bosque=Polygon) |
| protectionLevel | Si reserva legal, documento obligatorio |

### 12.7 Validaciones topológicas (VAL)

| Código | Validación |
|--------|------------|
| FTIP-V01 | Polígono cerrado sin auto-intersección |
| FTIP-V02 | SRID EPSG:4326 (o config org) |
| FTIP-V03 | Centroid dentro municipio declarado |
| FTIP-V04 | No superposición finca activa (política org) |
| FTIP-V05 | Área mínima lote |
| FTIP-V06 | Buffer área protegida |
| FTIP-V07 | Certificación orgánica sin solape no certificado |

---

## 13. Dependencias con otros módulos

| Módulo | Relación |
|--------|----------|
| **PRM** | Bidireccional — ProducerTerritoryLink; PRM no almacena polígonos |
| **GIS Engine** | Consume — área, buffer, intersect, geocerca, medición |
| **MDE** | Consume — geo.*, farm.*, cert.*, territory.* |
| **DGMP** | Bidireccional — golden record finca, dedup polígonos, lineage |
| **EDMKP** | Consume — documentos territoriales |
| **Form Engine** | Bidireccional — formularios catastro/visita |
| **AITAP** | Bidireccional — TerritoryVisitLink, GPS track |
| **Workflow** | Consume — aprobaciones geo y alta |
| **Event Engine** | Publica/consume — twin, proyecciones |
| **Sync** | Bidireccional — polígonos offline |
| **CSAE** | CSAE consume — cupo/contrato por finca/lote |
| **CPE** | CPE consume — origen compra, geocerca |
| **CQIE** | CQIE → FTIP — calidad por lote territorial |
| **CITE** | Referencia — bodega finca como infraestructura |
| **CLSE** | CLSE consume — puntos acopio, rutas |
| **OCC** | Consume — mapas operativos, alertas |
| **AIADP** | Consume — predicción, riesgos, satélite |
| **IEL** | Consume — NDVI, DEM, datos externos |
| **DPAL** | Alimenta — KPIs territoriales oficiales |

---

## 14. Auditoría

| Evento auditado | Datos |
|-----------------|-------|
| Alta/edición FarmUnit | Diff campos; usuario; dispositivo |
| Captura/cambio geometría | GeometryRevision completa before/after |
| Subdivisión/fusión | Entidades afectadas; delta área |
| Vinculación/desvinculación productor | producerId; motivo |
| Certificación territorial | Alcance geo; vigencia |
| CropStand cambios | Variedad, renovación |
| Recurso natural/infra | Tipo; geometría |
| Documento territorial | Alta/verificación |
| Activación/inactivación finca | Estado; aprobador |

Retención geometría: **inmutable** — nunca DELETE físico de `GeometryRevision`.

---

## 15. Permisos

| Permiso | Descripción | Roles |
|---------|-------------|-------|
| `farm:create` | Crear finca/predio | field_agent, buyer |
| `farm:read` | Consultar fincas y twin | Operativos, viewer |
| `farm:update` | Editar atributos no críticos | field_agent, supervisor |
| `farm:delete` | Inactivar/archivar | admin, supervisor |
| `farm:approve` | Activar, aprobar cambios | supervisor, manager |
| `territory:geometry` | Capturar/editar polígonos | field_agent |
| `territory:geometry:approve` | Aprobar revisiones geo | supervisor, gis_admin |
| `predio:update` | Datos legales predio | legal, admin |
| `certification:read` | Ver certs espaciales | quality_analyst |
| `territory:admin` | Capas, políticas, fusión | admin, gis_admin |
| `farm:export` | Exportar reportes/mapas | manager, admin |

**PBAC:** `field_agent` limitado a municipios en UserScope.

---

## 16. Eventos generados

| Evento | Cuándo |
|--------|--------|
| `FarmUnitRegistered` | Alta finca |
| `FarmUnitActivated` | Validación OK → active |
| `FarmUnitInactivated` | inactive/abandoned |
| `TerritoryGeometryCaptured` | Nueva geometría |
| `GeometryRevisionApproved` | Cambio formal aprobado |
| `ParcelSubdivided` | Nueva parcela |
| `LotUnitCreated` / `LotUnitUpdated` | Lote territorial |
| `CropStandPlanted` / `CropStandRenovated` | Cultivo |
| `NaturalResourceMapped` | Recurso ambiental |
| `InfrastructureRegistered` | Infraestructura |
| `TerritoryCertificationIssued` / `Expiring` | Cert espacial |
| `TerritoryOverlapViolation` | Validación fallida |
| `TerritoryRiskDetected` | IA o campo |
| `TerritoryVisitRecorded` | Visita AITAP geo |
| `FarmUnitLinkedToProducer` / `Unlinked` | PRM |
| `FarmDigitalTwinRefreshed` | Proyección actualizada |
| `TerritoryKpiCalculated` | Snapshot KPIs |
| `SoilAnalysisRecorded` | Análisis suelo |

Namespace: `territory.*` + `coffee.territory.*`

---

## 17. Automatizaciones

| ID | Disparador | Acción |
|----|------------|--------|
| AUT-FTIP-01 | Cert territorial vence 90/60/30 días | Notificación certificación + comprador |
| AUT-FTIP-02 | Finca `active` sin polígono válido 30 días | Alerta OCC + técnico asignado |
| AUT-FTIP-03 | Superposición detectada en validación | Bloqueo + tarea SIG |
| AUT-FTIP-04 | Δ área finca > umbral campaña | Alerta expansión + workflow |
| AUT-FTIP-05 | Inconsistencia área declarada vs GIS > 10% | Tarea corrección |
| AUT-FTIP-06 | Lote productivo sin CropStand 60 días | Alerta agrónomo |
| AUT-FTIP-07 | Post `PurchaseConfirmed` | Actualizar producción real lote |
| AUT-FTIP-08 | Post `VisitCompleted` AITAP | Actualizar lastVisitAt + twin |
| AUT-FTIP-09 | Cron nocturno | Recalcular KPIs territoriales |
| AUT-FTIP-10 | NDVI cambio > umbral (IEL) | Sugerencia revisión cobertura |

---

## 18. Integración IA

| Función | Entrada | Salida | Humano en loop |
|---------|---------|--------|----------------|
| Predicción producción campaña | CropStand, clima, historial | kg/ha estimado | Opcional ajuste agrónomo |
| Detección riesgo erosión | Pendiente, cobertura, clima | Risk score | Sí — plan manejo |
| Cambio cobertura satélite | NDVI serie | Polígono sugerido bosque/cultivo | Sí — GeometryRevision |
| Detección expansión agrícola | Imágenes temporales | Alerta expansión | Sí — validación SIG |
| Clasificación uso suelo | Ortofoto | landUseCode sugerido | Sí |
| Recomendación zonas manejo | Suelo, rendimiento | ManagementZones | Sí — agrónomo |
| Análisis histórico productividad | CropStandHistory | Tendencia y anomalías | Informativo |
| Duplicado finca | Polígono similar | Match score DGMP | Sí — fusión |
| Huella ambiental / carbono | Cobertura, áreas | Índice (futuro) | Reporte |
| Recomendaciones técnicas | Estado lote + visitas AITAP | Acciones sugeridas | Técnico decide |

**RN-FTIP-073:** IA nunca activa geometría sin revisión aprobada.

---

## 19. Integración GIS

| Capacidad | Uso FTIP |
|-----------|----------|
| Cálculo área/perímetro | Al guardar polígono |
| Buffer área protegida | Validación cert |
| Intersect finca∩vereda | Validación administrativa |
| Union multi-predio | Fincas compuestas |
| Geocerca compra CPE | Técnico dentro finca |
| Distancia finca–bodega | Indicador logístico twin |
| Medición Android | Herramienta campo |
| Capas temáticas | ThematicLayerDefinition → GIS render |
| Puntos interés | Portales, básculas finca, acopios |
| Rutas internas | LineString vías infraestructura |
| Subdivisión espacial | Split polígono padre→hijos |
| Export GeoJSON/KML | Reportes auditoría |

---

## 20. Integración Android

| Operación | Offline | Detalle |
|-----------|---------|---------|
| Crear finca borrador | Sí | externalId |
| GPS walk polígono | Sí | Cola geometry sync |
| Punto + área declarada | Sí | Baja confianza |
| Fotos georreferenciadas | Sí | Media queue → EDMKP |
| Video finca | Sí | Límite duración org |
| Firma productor tenencia | Sí | PNG → EDMKP |
| Medición distancia/área | Sí | GIS local |
| Registrar lotes/cultivos | Sí | Push batch |
| Mapa cache fincas asignadas | Sí | Última sync |
| Aprobar geometría | No | Solo web |
| Importar CAD | No | Solo web |

**Sync:** refresh → media → geometry push → farm/lot push → pull eventos.

---

## 21. Integración Formularios

| Formulario | Uso |
|------------|-----|
| Catastro finca inicial | Alta FarmUnit |
| Levantamiento lote/productivo | LotUnit + CropStand |
| Inventario recursos naturales | NaturalResourceFeature |
| Infraestructura postcosecha | InfrastructureFeature |
| Análisis suelo | GeographicAttributes |
| Autoevaluación ambiental cert | TerritoryCertification prep |
| Visita catastral | Vinculado AITAP + TerritoryVisitLink |

Submissions referencian `farmUnitId`, `lotUnitId`, coordenadas GPS.

---

## 22. Integración Compras (CPE)

| Función | Descripción |
|---------|-------------|
| Origen compra | Toda compra debe referenciar `farmUnitId` y/o `lotUnitId` |
| Geocerca | CPE valida GPS compra dentro polígono finca (GIS) |
| Producción real | `PurchaseConfirmed` actualiza `CropStandHistory.deliveredKg` |
| Bloqueo | Finca no `active` rechaza compra |
| Twin | Compras aparecen en timeline Digital Twin |

---

## 23. Integración Calidad (CQIE)

| Función | Descripción |
|---------|-------------|
| Score por lote | Dictámenes CQIE agregados a `CropStandHistory.qualityAvgScore` |
| Trazabilidad | Origen calidad → lote territorial → finca |
| Alerta | NC grave flag en twin y OCC |
| Certificación | Calidad mínima para mantener alcance cert espacial |

---

## 24. Integración Inventario (CITE)

| Función | Descripción |
|---------|-------------|
| Distinción | Lote CITE (bodega) ≠ LotUnit (territorio) — sin confusión códigos |
| Infraestructura | Bodega finca (`InfrastructureFeature`) opcional link `warehouseId` CITE |
| Trazabilidad inversa | Desde lote inventario consultar finca/lote origen FTIP |
| Twin | Despachos relacionados en proyección (solo lectura) |

---

## 25. Integración Documental (EDMKP)

| Tipo | Entidad | Obligatorio |
|------|---------|-------------|
| Escritura / matrícula | Predio | Propiedad |
| Contrato arrendamiento | FarmUnit | Arrendamiento |
| Plano catastral | FarmUnit/Parcel | Alta formal |
| Licencia ambiental | NaturalResource | Reserva legal |
| Permiso agua | NaturalResource | Captación |
| Certificado certificación | TerritoryCertification | Sí |
| Fotos / videos | FarmUnit, Lot | Evidencia |
| Firmas | Tenencia, actas | Según proceso |
| Análisis suelo PDF | GeographicAttributes | Opcional |

Índice `TerritoryDocument` en FTIP; binarios en EDMKP.

---

## 26. Integración Productores (PRM)

| Función | Dirección |
|---------|-----------|
| Solicitud alta finca | PRM → FTIP |
| ProducerTerritoryLink | FTIP ↔ PRM |
| `ftipFarmUnitId` en PRM | FTIP → PRM referencia |
| Expediente 360° productor | PRM consume lista fincas + twin resumen |
| Activación productor | PRM puede exigir ≥1 finca FTIP `active` |
| Desvinculación | Validación contratos CSAE |
| Roles productor | owner, operator, tenant, associated |

---

## 27. Modelo de datos funcional

### 27.1 Entidad principal: FarmUnit (información general)

| Campo | Tipo funcional | Obligatorio | Descripción |
|-------|----------------|-------------|-------------|
| farmUnitId | UUID | Sí | Identificador único |
| organizationId | UUID | Sí | Tenant |
| farmCode | Texto | Sí | Código único org |
| farmName | Texto | Sí | Nombre operativo |
| predioIds | Lista UUID | No | Predios legales asociados |
| farmTypeCode | Catálogo | Sí | `farm.type` |
| productionSystemCode | Catálogo | No | `farm.production_system` |
| countryCode | Catálogo | Sí | `geo.country` |
| departmentCode | Catálogo | Sí | `geo.department` |
| municipalityCode | Catálogo | Sí | `geo.municipality` |
| veredaCode | Catálogo | Recomendado | `geo.vereda` |
| streetAddress | Texto | No | Dirección acceso |
| accessNotes | Texto | No | Indicaciones llegada |
| centroidGeo | Point | Sí si sin polígono | Centroide WGS84 |
| boundaryGeo | Polygon | Sí para `active` | Perímetro finca |
| activeGeometryId | Ref | Sí para `active` | `TerritoryGeometry` vigente |
| totalAreaHa | Decimal | Sí | Área total |
| agriculturalAreaHa | Decimal | Sí | Área productiva |
| forestAreaHa | Decimal | No | Bosque/sombrío |
| protectedAreaHa | Decimal | No | Reservas legales |
| infrastructureAreaHa | Decimal | No | Infraestructura |
| availableAreaHa | Decimal | Calculado | Área no asignada |
| altitudeMinM / altitudeMaxM | Entero | No | DEM o campo |
| avgSlopePct | Decimal | No | GIS/DEM |
| dominantAspectCode | Catálogo | No | Orientación |
| tenureTypeCode | Catálogo | Sí | `farm.tenure_type` |
| legalStatusCode | Catálogo | No | `farm.legal_status` |
| landUseCode | Catálogo | No | `territory.land_use` |
| landCoverCode | Catálogo | No | `territory.land_cover` |
| climateZoneCode | Catálogo | No | `territory.climate_zone` |
| soilTypeCode | Catálogo | No | `territory.soil_type` |
| farmAdministratorId | Ref User | No | Responsable interno |
| status | Enum | Sí | draft, under_validation, active, inactive, abandoned |
| geometryConfidence | Enum | Sistema | high, medium, low |
| registeredAt | Fecha | Sistema | Alta |
| activatedAt | Fecha | Sistema | Activación |
| lastGeometryChangeAt | Fecha | Sistema | Última revisión geo |
| lastVisitAt | Fecha | Sistema | Última visita AITAP |
| observations | Texto largo | No | Notas permanentes |
| tags | Lista texto | No | Etiquetas |
| classifications | Lista catálogo | No | Clasificación org |
| metadata | JSON | No | Metadata Engine |
| version | Entero | Sí | Optimistic lock |
| externalId | UUID | No | Idempotencia Android |
| syncStatus | Enum | Sistema | synced, pending, conflict |

### 27.2 Jerarquía territorial

| Entidad | Relación | Campos clave |
|---------|----------|--------------|
| Predio | N:M FarmUnit | cadastralNumber, ownerPartyIds, boundaryGeo |
| ParcelUnit | 1:N FarmUnit | parcelCode, boundaryGeo, parentParcelId |
| LotUnit | 1:N Parcel/Farm | lotCode, boundaryGeo, status, areaHa |
| SubLotUnit | 1:N LotUnit | subLotCode, purpose, validFrom/Until |
| ManagementZone | N:M Farm/Lot | zoneType, boundaryGeo, managementPlanRef |
| ProducerTerritoryLink | N:M PRM | producerId, relationshipType, isPrimary |

### 27.3 Características agronómicas

#### CropStand (cultivo activo por lote)

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| cropStandId | UUID | Sí | |
| lotUnitId | Ref | Sí | Lote territorial |
| speciesCode | Catálogo | Sí | Especie (café) |
| varietyCodes | Lista catálogo | Sí | `farm.coffee_variety` |
| plantingDate | Fecha | Sí | Siembra |
| renovationDate | Fecha | No | Renovación |
| densityPlantsHa | Entero | Sí | Plantas/ha |
| shadeTypeCode | Catálogo | No | Tipo sombrío |
| irrigationTypeCode | Catálogo | No | Riego |
| productionSystemDetail | Catálogo | No | Convencional/orgánico lote |
| estimatedYieldKgHa | Decimal | No | Estimación campaña |
| phenologicalStageCode | Catálogo | No | Estado fenológico |
| status | Enum | Sí | active, harvested, renovated, abandoned |
| validFrom / validUntil | Fecha | Sí | Vigencia temporal |

#### CropStandHistory (historial por campaña)

| Campo | Descripción |
|-------|-------------|
| campaignId | Campaña comercial |
| harvestedAreaHa | Área cosechada |
| estimatedKg / deliveredKg | Estimado vs real (CPE) |
| qualityAvgScore | Promedio CQIE |
| incidentsCount | NC registradas |
| notes | Observaciones agrónomo |

#### GeographicAttributes (suelo y clima)

| Campo | Descripción |
|-------|-------------|
| soilTypeCode, ph, organicMatterPct | Análisis suelo |
| avgSlopePct, maxSlopePct | Topografía |
| rainfallMmYear, temperatureAvgC | Clima |
| source | field_survey, dem, satellite |
| effectiveAt / supersededAt | Versionamiento |

### 27.4 Información ambiental

| Entidad | Tipos | Geometría |
|---------|-------|-----------|
| NaturalResourceFeature | river, stream, spring, reservoir, wetland, forest, protected_area, reserve, biodiversity_hotspot, shade_tree_stand | Point, Line, Polygon |
| ProtectedArea (subtipo) | legalCategory, bufferDistanceM, noAgroExpansion | Polygon |
| TerritoryRiskAssessment | erosion, drought, flood, expansion_illegal, cert_violation | Polygon zona riesgo |

**Atributos ambientales clave:** protectionLevel, speciesNotes, shadeSpeciesCodes, legalInstrumentRef, documentIds, lastAssessedAt.

**Carbono (futuro):** índice huella en `metadata` + proyección IA — sin bloquear R1.

### 27.5 Infraestructura (`InfrastructureFeature`)

| Tipo | Atributos operativos |
|------|---------------------|
| beneficiadero | capacityKgDay, processType |
| secadero | areaM2, dryingType |
| bodega_finca | capacityKg, warehouseId (CITE) |
| centro_acopio | collectionPointId (CLSE) |
| via_interna | LineString, surfaceType, condition |
| maquinaria_fija | Point, equipmentType |

### 27.6 Geometría y GIS

| Entidad | Propósito |
|---------|-----------|
| TerritoryGeometry | Geometría activa por entidad |
| GeometryRevision | Historial inmutable before/after |
| ThematicLayerDefinition | Definición capa mapa negocio |
| TerritoryKpiSnapshot | KPIs materializados por scope |

**TerritoryGeometry:** captureMethod (gps_walk, gps_point, drone, cad_import, manual_digitize), captureAccuracyM, validationStatus, srid EPSG:4326.

### 27.7 Certificación espacial (`TerritoryCertification`)

| Campo | Descripción |
|-------|-------------|
| certificationSchemeCode | FT, RA, 4C, orgánico |
| boundaryGeo | Alcance espacial |
| certifiedAreaHa | Área certificada |
| issuedAt / expiresAt | Vigencia |
| status | active, expired, suspended |
| documentId | Certificado EDMKP |

### 27.8 Gemelo Digital (`FarmDigitalTwin`)

Proyección materializada 1:1 con `FarmUnit` activa — **no fuente transaccional**.

| Campo | Descripción |
|-------|-------------|
| farmUnitId | FK |
| lastRefreshedAt | Timestamp proyección |
| statusSummary | Estado catastro + cert |
| producerPrimaryId | Productor principal PRM |
| totalAreaHa / agriculturalAreaHa | Espejo áreas |
| lotCount / activeCropStandCount | Conteos |
| productionYtdKg | Suma compras CPE campaña |
| productionLastCampaignKg | Campaña anterior |
| avgYieldKgHa | Rendimiento materializado |
| qualityAvgScore | CQIE agregado |
| activeCertificationCodes | Cert vigentes |
| riskFlags | Alertas territoriales abiertas |
| lastVisitAt / nextVisitDueAt | AITAP |
| documentCompletenessPct | Checklist expediente |
| timelinePreview | Últimos N eventos |
| thematicIndicators | JSON KPIs (forestCoverPct, geoPrecisionAvgM, expansionDeltaHa) |
| purchaseProjection | Resumen CSAE/CPE |
| mapThumbnailRef | Vista mapa cache |

**Timeline unificada (RN-FTIP-071):** geometría, cultivos, visitas, compras, calidad, contratos, documentos, alertas, riesgos IA.

**Refresh triggers:** `FarmUnitActivated`, `GeometryRevisionApproved`, `PurchaseConfirmed`, `VisitCompleted`, `TerritoryCertificationIssued`, cron nocturno.

### 27.9 Documentos (`TerritoryDocument`)

| Campo | Descripción |
|-------|-------------|
| documentId | UUID índice FTIP |
| entityType / entityId | farm, predio, lot, natural_resource, certification |
| documentTypeCode | escritura, plano, licencia, foto, video, firma |
| contentId | Ref EDMKP |
| title, description | Metadatos |
| capturedAt, capturedBy | Trazabilidad |
| gpsGeo | Si evidencia campo |
| verifiedAt, verifiedBy | Verificación supervisor |
| status | pending, verified, rejected |

### 27.10 Entidades relacionadas (resumen)

| Entidad | Relación FarmUnit |
|---------|-------------------|
| ParcelUnit, LotUnit, SubLotUnit | Jerarquía territorial |
| CropStand, CropStandHistory | Agronomía |
| NaturalResourceFeature | Ambiental |
| InfrastructureFeature | Infraestructura |
| TerritoryCertification | Cert espacial |
| TerritoryGeometry, GeometryRevision | GIS |
| ProducerTerritoryLink | PRM |
| TerritoryDocument | EDMKP índice |
| TerritoryVisitLink | AITAP |
| TerritoryRiskAssessment | Riesgos |
| FarmDigitalTwin | Proyección 360° |
| TerritoryKpiSnapshot | Histórico KPIs |

### 27.11 Relaciones con otros dominios

| Relación | Cardinalidad | Tipo |
|----------|--------------|------|
| Finca ↔ Productor (PRM) | N:M | ProducerTerritoryLink |
| Finca ↔ Compras (CPE) | 1:N | farmUnitId / lotUnitId |
| Finca ↔ Contratos (CSAE) | 1:N | Alcance territorial |
| Finca ↔ Calidad (CQIE) | 1:N | Por lote origen |
| Finca ↔ Visitas (AITAP) | 1:N | TerritoryVisitLink |
| Finca ↔ Inventario (CITE) | 0:N | Infraestructura bodega |
| Finca ↔ Documentos (EDMKP) | 1:N | contentId |
| Finca ↔ Alertas (OCC) | 1:N | FTIP-ALT-* |

---

## 28. API funcional

**Base path:** `/api/v1/ftip`

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/farms` | `farm:read` | Listar fincas con filtros y paginación |
| POST | `/farms` | `farm:create` | Crear finca (draft) |
| GET | `/farms/:id` | `farm:read` | Detalle FarmUnit |
| PATCH | `/farms/:id` | `farm:update` | Actualizar atributos |
| DELETE | `/farms/:id` | `farm:delete` | Inactivar/archivar |
| POST | `/farms/:id/lifecycle` | `farm:approve` | Transición estado |
| GET | `/farms/:id/twin` | `farm:read` | Gemelo Digital completo |
| GET | `/farms/:id/timeline` | `farm:read` | Timeline territorial |
| GET | `/farms/:id/kpis` | `farm:read` | KPIs materializados |
| POST | `/farms/:id/geometry` | `territory:geometry` | Proponer geometría |
| POST | `/farms/:id/geometry/approve` | `territory:geometry:approve` | Aprobar revisión |
| GET | `/farms/:id/geometry/history` | `farm:read` | GeometryRevision list |
| POST | `/farms/:id/producers` | `farm:update` | Vincular productor PRM |
| DELETE | `/farms/:id/producers/:linkId` | `farm:update` | Desvincular |
| GET | `/farms/:id/parcels` | `farm:read` | Parcelas |
| POST | `/farms/:id/parcels` | `farm:update` | Crear parcela |
| GET | `/farms/:id/lots` | `farm:read` | Lotes territoriales |
| POST | `/farms/:id/lots` | `farm:update` | Crear lote |
| PATCH | `/lots/:lotId` | `farm:update` | Editar lote |
| POST | `/lots/:lotId/crop-stands` | `farm:update` | Registrar cultivo |
| PATCH | `/crop-stands/:id` | `farm:update` | Actualizar cultivo |
| GET | `/farms/:id/natural-resources` | `farm:read` | Recursos naturales |
| POST | `/farms/:id/natural-resources` | `farm:update` | Mapear recurso |
| GET | `/farms/:id/infrastructure` | `farm:read` | Infraestructura |
| POST | `/farms/:id/infrastructure` | `farm:update` | Registrar infra |
| GET | `/farms/:id/certifications` | `certification:read` | Certificaciones espaciales |
| POST | `/farms/:id/certifications` | `farm:approve` | Emitir cert espacial |
| GET | `/farms/:id/documents` | `farm:read` | Índice documental |
| POST | `/farms/:id/documents` | `document:upload` | Registrar documento EDMKP |
| GET | `/farms/:id/risks` | `farm:read` | Evaluaciones riesgo |
| POST | `/farms/:id/risks` | `farm:update` | Registrar riesgo campo |
| GET | `/predios` | `farm:read` | Listar predios |
| POST | `/predios` | `predio:update` | Crear predio legal |
| GET | `/layers` | `farm:read` | Capas temáticas |
| POST | `/layers` | `territory:admin` | Definir capa |
| POST | `/validate/topology` | `territory:geometry` | Validar polígono (proxy GIS) |
| POST | `/farms/merge` | `territory:admin` | Fusionar duplicados DGMP |
| GET | `/farms/check-overlap` | `farm:read` | Verificar superposición |
| POST | `/farms/sync` | `farm:create` | Batch sync Android |
| GET | `/reports/:reportCode` | `farm:export` | Reportes FTIP-RPT-* |

**Errores estándar:** 400 validación, 403 permiso/scope, 404 no existe, 409 duplicado/conflicto versión/geo, 422 regla negocio (RN-FTIP-*).

---

## 29. Interfaz (especificación funcional — sin diseño gráfico)

### 29.1 Pantallas Web

| ID | Pantalla | Descripción |
|----|----------|-------------|
| UI-FTIP-01 | Listado fincas | Tabla paginada, filtros, export |
| UI-FTIP-02 | Expediente finca / Twin | Pestañas: general, mapa, lotes, cultivos, ambiental, infra, cert, documentos, timeline, KPIs |
| UI-FTIP-03 | Formulario crear/editar finca | Secciones datos generales y tenencia |
| UI-FTIP-04 | Editor mapa / geometría | Captura, import, historial revisiones |
| UI-FTIP-05 | Subdivisión lotes | Mapa + tabla lotes; validación áreas |
| UI-FTIP-06 | Cultivos por lote | CropStand + historial campañas |
| UI-FTIP-07 | Recursos naturales | Inventario geo ambiental |
| UI-FTIP-08 | Infraestructura | POIs y capacidades |
| UI-FTIP-09 | Certificaciones espaciales | Alcance mapa + vigencia |
| UI-FTIP-10 | Validación / aprobación | Cola under_validation |
| UI-FTIP-11 | Dashboard KPIs territoriales | Widgets org/municipio |
| UI-FTIP-12 | Mapa temático | Capas FTIP-RPT; filtros |
| UI-FTIP-13 | Comparador geometría | Before/after revisiones |
| UI-FTIP-14 | Fusión duplicados | DGMP lado a lado |

### 29.2 Elementos comunes listado (UI-FTIP-01)

**Filtros:** estado, municipio, vereda, productor, comprador cartera, certificación, tipo finca, texto libre (código/nombre), solo con polígono válido, riesgo alto.

**Columnas:** código, nombre, municipio, productor principal, área ha, estado, última visita, cert vigente, precisión GPS.

**Acciones:** ver twin, editar, mapa, cambiar estado, exportar, solicitar visita AITAP.

### 29.3 Mapa (UI-FTIP-04 / UI-FTIP-12)

| Capacidad | Descripción funcional |
|-----------|----------------------|
| Visualización | Capas FTIP sobre mapa base (GIS Engine) |
| Polígonos | Finca, parcela, lote, recursos, cert |
| Medición | Distancia, área, perímetro |
| Superposición | Cert vs cultivo vs bosque |
| Filtros | Municipio, variedad, cert, riesgo, productor |
| Historial | Slider fecha T para geometría histórica |
| Export | GeoJSON/KML según permiso |

---

## 30. Android (especificación funcional)

| ID | Pantalla / flujo | Offline |
|----|------------------|---------|
| AND-FTIP-01 | Lista fincas asignadas | Cache sync |
| AND-FTIP-02 | Alta finca borrador | Sí |
| AND-FTIP-03 | GPS walk perímetro | Sí → geometry queue |
| AND-FTIP-04 | Punto + área declarada | Sí (baja confianza) |
| AND-FTIP-05 | Registro lotes en mapa | Sí |
| AND-FTIP-06 | CropStand rápido | Sí |
| AND-FTIP-07 | Recursos naturales POI | Sí |
| AND-FTIP-08 | Fotos georreferenciadas | Sí media queue |
| AND-FTIP-09 | Video finca | Sí (límite duración) |
| AND-FTIP-10 | Firma tenencia | Sí PNG local |
| AND-FTIP-11 | Medición distancia/área | Sí GIS local |
| AND-FTIP-12 | Mapa offline cache | Última sync tiles |
| AND-FTIP-13 | Twin resumido finca | Lectura cache |
| AND-FTIP-14 | Sync status / conflictos | Resolución web |

**GPS:** precisión máxima configurable (default 50 m punto, 15 m walk); registrar `captureAccuracyM`.

**Sync orden:** refresh token → media upload → geometry push → farm/lot push → pull eventos twin.

---

## 31. Reportes

| ID | Reporte / mapa | Descripción | Filtros |
|----|----------------|-------------|---------|
| FTIP-RPT-01 | Mapa de fincas | Fincas activas por zona | Municipio, estado |
| FTIP-RPT-02 | Mapa de productores | Color por productor PRM | Comprador, zona |
| FTIP-RPT-03 | Mapa de cultivos | Variedad, edad, estado lote | Variedad, campaña |
| FTIP-RPT-04 | Mapa certificaciones | Alcance espacial por esquema | Esquema, vigencia |
| FTIP-RPT-05 | Mapa de riesgos | Erosión, expansión, incumplimiento | Tipo riesgo, nivel |
| FTIP-RPT-06 | Mapa de visitas | Heatmap visitas técnicas | Técnico, periodo |
| FTIP-RPT-07 | Mapa productividad | kg/ha por lote | Campaña, municipio |
| FTIP-RPT-08 | Inventario recursos naturales | Agua, bosque por cuenca | Tipo recurso |
| FTIP-RPT-09 | Infraestructura postcosecha | Beneficios, secaderos | Tipo infra |
| FTIP-RPT-10 | Historial cambios geométricos | Auditoría territorial | Finca, fecha |
| FTIP-RPT-11 | Cumplimiento espacial cert | Solapes y buffers | Esquema |
| FTIP-RPT-12 | Comparativo campañas | Área y producción YoY | Campaña |
| FTIP-RPT-13 | Padrón fincas | Listado campos clave | Zona, estado |
| FTIP-RPT-14 | Fincas sin polígono válido | Calidad catastro | Días pendiente |
| FTIP-RPT-15 | Superposiciones detectadas | Conflictos geo | Estado resolución |
| FTIP-RPT-16 | Expediente documental | Checklist por finca | % completo |
| FTIP-RPT-17 | Área certificada vs productiva | Brecha cumplimiento | Esquema |
| FTIP-RPT-18 | Export EUDR / trazabilidad | Polígono + productor + docs | Auditoría |

Formatos: PDF, Excel, CSV, GeoJSON/KML (mapas) según permiso `farm:export`.

---

## 32. KPIs

| ID | KPI | Definición | Fórmula conceptual |
|----|-----|------------|-------------------|
| KPI-FTIP-01 | Área sembrada | Σ área lotes CropStand activo | SUM areaHa where crop active |
| KPI-FTIP-02 | Área cosechada | Σ área cosecha campaña | SUM harvestedAreaHa |
| KPI-FTIP-03 | Área certificada | Σ bajo cert vigente | SUM certifiedAreaHa |
| KPI-FTIP-04 | Producción por hectárea | kg / área productiva | deliveredKg / agriculturalAreaHa |
| KPI-FTIP-05 | Índice productividad | vs potencial variedad/zona | yield / benchmark |
| KPI-FTIP-06 | Diversidad cultivos | Shannon variedades | H(varieties) |
| KPI-FTIP-07 | Cobertura forestal | % bosque+sombrío / área finca | forestAreaHa / totalAreaHa |
| KPI-FTIP-08 | Tasa georreferenciación | % fincas polígono válido | Con polygon / activas |
| KPI-FTIP-09 | Precisión GPS promedio | m captura campo | AVG captureAccuracyM |
| KPI-FTIP-10 | Expansión neta área | Δ ha entre campañas | areaT - areaT-1 |
| KPI-FTIP-11 | Fincas activas | Count estado active | COUNT status=active |
| KPI-FTIP-12 | Lotes productivos | Lotes status productive | COUNT lot |
| KPI-FTIP-13 | Fincas con visita 12m | Cobertura extensión | Con visita / activas |
| KPI-FTIP-14 | Certificaciones por vencer | Próximos 90 días | COUNT expiring |
| KPI-FTIP-15 | Riesgo alto territorial | % fincas riesgo high+ | COUNT risk / activas |
| KPI-FTIP-16 | Inconsistencia área | % declarada vs GIS > umbral | COUNT mismatch |
| KPI-FTIP-17 | Documentación completa | % expediente territorial OK | Completos / activas |
| KPI-FTIP-18 | Producción YTD org | kg comprados CPE | SUM purchase kg |
| KPI-FTIP-19 | Promedio lotes por finca | Subdivisión catastral | AVG lot count |
| KPI-FTIP-20 | Conflictos sync abiertos | Calidad dato campo | COUNT sync conflict |

KPIs oficiales en DPAL Metrics Engine; snapshots en `TerritoryKpiSnapshot`.

### 32.1 Alertas configurables (OCC)

| ID | Alerta |
|----|--------|
| FTIP-ALT-01 | Certificación territorial vence en N días |
| FTIP-ALT-02 | Finca sin polígono válido |
| FTIP-ALT-03 | Superposición geométrica detectada |
| FTIP-ALT-04 | Expansión área > umbral campaña |
| FTIP-ALT-05 | Riesgo erosión alto |
| FTIP-ALT-06 | Buffer área protegida violado |
| FTIP-ALT-07 | Lote productivo sin cultivo |
| FTIP-ALT-08 | Cambio geometría pendiente aprobación |
| FTIP-ALT-09 | Inconsistencia área declarada vs calculada |
| FTIP-ALT-10 | Teledetección: cambio cobertura sospechoso |

---

## 33. Escalabilidad

### 33.1 Millones de fincas

| Aspecto | Requisito funcional |
|---------|---------------------|
| Listados | Paginación obligatoria; índice por código, municipio, productor |
| Mapas | Clustering y tiles; no cargar millones de polígonos en cliente |
| Twin | Proyección materializada; timeline últimos N en vista |
| Geometría | PostGIS/particionado por org; revisiones en almacenamiento frío |
| Búsqueda espacial | Índices GIST; validación overlap asíncrona batch |
| KPIs | Recálculo incremental por municipio/campaña |

### 33.2 Multiempresa (multi-tenant)

- Aislamiento estricto por `organizationId`
- Políticas territoriales (superposición, buffers) por org
- Capas temáticas y reportes sin cruce tenant
- PBAC por municipio en UserScope

### 33.3 Multipaís

| Aspecto | Comportamiento |
|---------|----------------|
| Jerarquía admin | `geo.*` por país (vereda, corregimiento, etc.) |
| Catastro legal | Predio adaptado a norma local |
| Unidades área | ha estándar; conversión display |
| SRID | EPSG:4326 default; proyección local GIS |
| Certificaciones | Catálogo por país/commodity |

### 33.4 Multi-commodity

| Capa | Café | Otros commodities |
|------|------|-------------------|
| Core FTIP | Farm, parcel, lot, geometry | Igual |
| CropStand | `farm.coffee_variety` | Plugin catálogo commodity |
| Certificaciones | FT, RA, 4C | UTZ, RSPO, etc. |
| KPIs | kg/ha café | Unidad commodity |

---

## 34. Pruebas

### 34.1 Funcionales

| ID | Escenario |
|----|-----------|
| TF-FTIP-01 | Alta finca GPS walk → validación → activación happy path |
| TF-FTIP-02 | Punto + área declarada bloquea active sin polígono |
| TF-FTIP-03 | Subdivisión lotes sin superposición; suma áreas OK |
| TF-FTIP-04 | Superposición finca rechaza activación |
| TF-FTIP-05 | GeometryRevision preserva historial inmutable |
| TF-FTIP-06 | Cert espacial fuera de finca rechazada |
| TF-FTIP-07 | Twin timeline muestra compra CPE y visita AITAP |
| TF-FTIP-08 | Desvincular productor con contrato CSAE bloqueado |
| TF-FTIP-09 | Finca inactive rechaza compra CPE |
| TF-FTIP-10 | PBAC bloquea edición fuera municipio scope |

### 34.2 Integración

| ID | Escenario |
|----|-----------|
| TI-FTIP-01 | `FarmUnitActivated` visible en expediente PRM |
| TI-FTIP-02 | CPE geocerca valida GPS dentro polígono |
| TI-FTIP-03 | `PurchaseConfirmed` actualiza CropStandHistory |
| TI-FTIP-04 | Visita AITAP crea TerritoryVisitLink |
| TI-FTIP-05 | Documento EDMKP indexado TerritoryDocument |
| TI-FTIP-06 | GIS calculateArea coincide con tolerancia org |
| TI-FTIP-07 | DGMP detecta duplicado polígono similar |
| TI-FTIP-08 | CQIE score agregado en twin |

### 34.3 Carga

| ID | Escenario | Criterio |
|----|-----------|----------|
| TC-FTIP-01 | Listado 500k fincas paginado | p95 < 500 ms |
| TC-FTIP-02 | Validación overlap 10k polígonos municipio | < 5 min batch |
| TC-FTIP-03 | 200 sync geometry Android | Sin duplicados |
| TC-FTIP-04 | Refresh twin 50k fincas campaña | < 2 h batch |

### 34.4 Seguridad

| ID | Escenario |
|----|-----------|
| TS-FTIP-01 | Cross-tenant acceso finca ajena → 403/404 |
| TS-FTIP-02 | field_agent aprueba geometría sin permiso → 403 |
| TS-FTIP-03 | Export GeoJSON sin permiso → 403 |
| TS-FTIP-04 | GeometryRevision audit no editable post-approve |

---

## 35. Definición de Done

- [ ] Historias US-FTIP-001 a 010 críticas/altas implementadas y aceptadas PO
- [ ] Reglas RN-FTIP-001 a 082 validadas en pruebas
- [ ] API `/api/v1/ftip/*` documentada Swagger
- [ ] Integraciones PRM, GIS Engine, CPE, AITAP, EDMKP, CQIE, CSAE verificadas (TI-FTIP-*)
- [ ] Captura GPS walk Android offline operativa
- [ ] GeometryRevision auditoría completa
- [ ] FarmDigitalTwin materializado y timeline funcional
- [ ] Reportes FTIP-RPT-01 a 08 disponibles
- [ ] KPIs KPI-FTIP-01 a 10 en dashboard
- [ ] Alertas FTIP-ALT-01 a 05 configurables
- [ ] Sin regresión módulos dependientes
- [ ] Demo script actualizado

---

## 36. Futuras Mejoras

| ID | Mejora | Release tentativo |
|----|--------|-------------------|
| FM-FTIP-01 | Huella carbono y secuestro por finca | R5 |
| FM-FTIP-02 | Integración drone ortofoto automática | R4 |
| FM-FTIP-03 | NDVI satélite en capa temática live | R5 IEL |
| FM-FTIP-04 | Simulador escenarios renovación IA | R5 AIADP |
| FM-FTIP-05 | Portal productor consulta mapa finca | R5 |
| FM-FTIP-06 | Blockchain ancla GeometryRevision EUDR | R5 |
| FM-FTIP-07 | Gemelo Digital 3D terreno DEM | R5 |
| FM-FTIP-08 | Detección automática linderos ML | R5 |
| FM-FTIP-09 | Multi-predio unión automática GIS | R3 |
| FM-FTIP-10 | Comparador campañas satélite antes/después | R5 |

---

## Control de cambios

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.0 | 2026-07-02 | Emisión inicial especificación funcional FTIP |

---

## Aprobaciones

| Rol | Nombre | Fecha |
|-----|--------|-------|
| Product Owner | AGROERP Product | 2026-07-02 |
| Arquitectura | AGROERP Architecture | Pendiente revisión |
| Desarrollo Lead | — | Pendiente |
| QA Lead | — | Pendiente |

---

*Fin del documento — FTIP v1.0*
