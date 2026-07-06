# Especificación Funcional — GIS & Territory Intelligence Platform

| Campo | Valor |
|-------|-------|
| **Código módulo** | GTIP |
| **Alias arquitectónico** | GIS Engine (GIS) — `AGROERP_MASTER_SPECIFICATION.md` §15 |
| **Nombre comercial** | Mapa e Inteligencia Territorial |
| **Nombre arquitectónico** | GIS & Territory Intelligence Platform |
| **Versión documento** | 1.0 |
| **Estado** | Aprobado para implementación |
| **Product Owner** | AGROERP Product |
| **Release objetivo** | R1 — GIS Core / R4 — Territory Intelligence GA |
| **Documentos referencia** | `FARM_TERRITORY_INTELLIGENCE_PLATFORM.md`, `FTIP_FUNCTIONAL_SPEC.md`, `AGROERP_MASTER_SPECIFICATION.md` §15, `MASTER_PRODUCT_BACKLOG.md` EPIC-24, `OPERATIONS_COMMAND_CENTER.md`, `COFFEE_LOGISTICS_SUPPLY_CHAIN_ENGINE.md` |

---

## 1. Objetivo del módulo

Operar la **plataforma GIS empresarial oficial** de AGROERP: administrar, visualizar, analizar y explotar toda la información geográfica del ecosistema ERP, convirtiendo el **mapa en el centro de inteligencia territorial** del sistema.

GTIP **ejecuta operaciones espaciales**, **agrega y renderiza capas temáticas** de todos los motores de dominio, **planifica rutas**, **realiza análisis espacial** y **proyecta inteligencia territorial** (producción, riesgos, cobertura, compras). No duplica geometrías autoritativas de catastro agrícola — esas permanecen en **FTIP**; GTIP las consume, valida, analiza y presenta.

Comparable en capacidades a **ArcGIS Enterprise, QGIS Server, Mapbox GL, Google Maps Platform** en contexto ERP integrado nativo.

---

## 2. Alcance

| # | Funcionalidad incluida |
|---|------------------------|
| A-01 | Visualización mapa multi-capa: productores, fincas, lotes, bodegas, rutas, compras, etc. |
| A-02 | Operaciones espaciales: área, perímetro, distancia, centroide, buffer, intersect, union, split |
| A-03 | Edición geométrica delegada: herramientas que invocan FTIP para polígonos autoritativos |
| A-04 | Capas temáticas configurables con simbología, filtros y zoom levels |
| A-05 | Análisis espacial: heatmaps, densidad, proximidad, superposición, clustering, estadísticas |
| A-06 | Planificación y optimización de rutas: técnicos, compradores, visitas, logística |
| A-07 | Geocercas operativas y alertas territoriales (OCC) |
| A-08 | Integración formularios USFP: GPS, media georreferenciada en mapa |
| A-09 | Integración compras CPE, inventario CITE, visitas AITAP, contratos CSAE |
| A-10 | Tiles/vector tiles y servicios WMS/WFS internos |
| A-11 | Import/export GeoJSON, KML, Shapefile, GPX |
| A-12 | Android/Tablet: navegación, captura GPS, medición, track offline |
| A-13 | Inteligencia territorial: satélite, NDVI, DEM, IoT (futuro vía IEL) |
| A-14 | IA: zonas prioritarias, anomalías, rutas, cobertura, expansión |
| A-15 | Reportes y KPIs geográficos oficiales |
| A-16 | Multi-tenant, multi-país, multi-commodity |

---

## 3. Exclusiones

| # | Exclusión | Módulo responsable |
|---|-----------|-------------------|
| E-01 | Modelo catastral autoritativo finca/lote/polígono historial | FTIP |
| E-02 | Golden record productor y lifecycle | PRM |
| E-03 | Transacción compra/recepción | CPE |
| E-04 | Stock inventario transaccional | CITE |
| E-05 | Ejecución visitas y diagnósticos | AITAP |
| E-06 | Definición formularios | USFP |
| E-07 | Pipeline raster satélite procesamiento | IEL + AIADP |
| E-08 | Diseño UI mapas (MapLibre skins) | Fuera de esta especificación |
| E-09 | Transporte y despacho transaccional | CLSE |
| E-10 | Almacenamiento binario ortofotos | EDMKP |

---

## 4. Actores

### 4.1 Administrador GIS

| Campo | Valor |
|-------|-------|
| **Rol** | `admin`, `gis_admin` |
| **Responsabilidades** | Capas base, políticas espaciales, proveedores tiles, permisos territoriales |
| **Permisos** | `gis:admin`, `gis:layer:admin` |

### 4.2 Gerente operativo

| Campo | Valor |
|-------|-------|
| **Rol** | `manager` |
| **Responsabilidades** | Dashboards territoriales, KPIs cobertura, decisiones logísticas |
| **Permisos** | `gis:read`, `gis:analyze`, `gis:route`, `report:read` |

### 4.3 Supervisor

| Campo | Valor |
|-------|-------|
| **Rol** | `supervisor` |
| **Responsabilidades** | Validar análisis, aprobar rutas, revisar cobertura técnicos/compradores |
| **Permisos** | `gis:read`, `gis:analyze`, `gis:route:approve` |

### 4.4 Técnico de campo

| Campo | Valor |
|-------|-------|
| **Rol** | `field_agent` |
| **Responsabilidades** | Navegación mapa, captura GPS, medición polígonos, track recorridos |
| **Permisos** | `gis:read`, `gis:measure`, `gis:capture` |

### 4.5 Comprador

| Campo | Valor |
|-------|-------|
| **Rol** | `buyer` |
| **Responsabilidades** | Mapa cartera productores, compras por zona, rutas compra |
| **Permisos** | `gis:read`, `gis:route` (limitado cartera) |

### 4.6 Auditor

| Campo | Valor |
|-------|-------|
| **Rol** | `auditor` |
| **Responsabilidades** | Trazabilidad geometrías, export auditoría EUDR, historial capas |
| **Permisos** | `gis:read`, `gis:export`, `audit:read` |

### 4.7 Consultor externo

| Campo | Valor |
|-------|-------|
| **Rol** | `consultant` (futuro) |
| **Responsabilidades** | Análisis territorial temporal, reportes certificación |
| **Permisos** | `gis:read`, `gis:export` (scope limitado proyecto) |

### 4.8 Visualizador

| Campo | Valor |
|-------|-------|
| **Rol** | `viewer` |
| **Responsabilidades** | Consulta mapas y capas autorizadas |
| **Permisos** | `gis:read` |

---

## 5. Roles involucrados (sistema)

| Rol slug | Uso GTIP |
|----------|----------|
| `gis_admin` | Administración plataforma GIS |
| `admin` | Configuración org |
| `manager` | Inteligencia territorial |
| `supervisor` | Aprobación rutas/análisis |
| `field_agent` | Campo y captura |
| `buyer` | Comercial territorial |
| `auditor` | Auditoría geo |
| `consultant` | Análisis externo |
| `viewer` | Solo lectura |

---

## 6. Historias de Usuario

### US-GTIP-001 — Visualizar fincas y lotes en mapa

| Campo | Contenido |
|-------|-----------|
| **Como** | gerente |
| **Quiero** | ver todas las fincas activas coloreadas por municipio |
| **Para** | entender distribución territorial de la operación |
| **Prioridad** | Crítica |

**Criterios de aceptación:**
- [ ] Capa FTIP fincas desde geometría autoritativa
- [ ] Filtros municipio, estado, certificación
- [ ] Clustering si > umbral zoom out

---

### US-GTIP-002 — Medir área y distancia

| Campo | Contenido |
|-------|-----------|
| **Como** | técnico de campo |
| **Quiero** | medir área de un polígono dibujado en Android offline |
| **Para** | estimar superficie antes de registrar en FTIP |
| **Prioridad** | Crítica |

**Criterios de aceptación:**
- [ ] Herramienta measure area/distance
- [ ] Resultado ha y m con precisión configurable
- [ ] Geometría scratch no autoritativa hasta FTIP

---

### US-GTIP-003 — Optimizar ruta visitas técnicas

| Campo | Contenido |
|-------|-----------|
| **Como** | supervisor |
| **Quiero** | secuencia óptima de visitas para un técnico en un día |
| **Para** | minimizar desplazamiento y maximizar cobertura |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] Input: lista fincas/productores + ventana horaria
- [ ] Output: orden, distancia, tiempo estimado, costo
- [ ] Integración AITAP agenda |

---

### US-GTIP-004 — Mapa calor compras por región

| Campo | Contenido |
|-------|-----------|
| **Como** | comprador |
| **Quiero** | heatmap kg comprados por vereda |
| **Para** | identificar zonas de mayor volumen |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] Capa CPE agregada geográficamente
- [ ] Filtro campaña, período

---

### US-GTIP-005 — Geocerca validación compra

| Campo | Contenido |
|-------|-----------|
| **Como** | sistema CPE |
| **Quiero** | validar GPS compra dentro polígono finca |
| **Para** | prevenir fraude ubicación |
| **Prioridad** | Crítica |

**Criterios de aceptación:**
- [ ] API `geofence/contains` point-in-polygon FTIP
- [ ] Latencia p95 < 100ms

---

### US-GTIP-006 — Superposición certificación vs cultivo

| Campo | Contenido |
|-------|-----------|
| **Como** | auditor |
| **Quiero** | analizar solape capas certificación y lote productivo |
| **Para** | cumplimiento espacial certificadora |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] Análisis intersect con reporte áreas solapadas
- [ ] Export PDF/GeoJSON

---

### US-GTIP-007 — Formularios georreferenciados en mapa

| Campo | Contenido |
|-------|-----------|
| **Como** | supervisor |
| **Quiero** | ver submissions USFP como puntos con fotos en mapa |
| **Para** | revisar evidencia campo espacialmente |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] Capa USFP submissions con popup metadata
- [ ] Enlace finca/lote context

---

### US-GTIP-008 — Captura polígono GPS walk Android

| Campo | Contenido |
|-------|-----------|
| **Como** | técnico |
| **Quiero** | caminar perímetro y guardar polígono offline |
| **Para** | enviar a FTIP al sincronizar |
| **Prioridad** | Crítica |

**Criterios de aceptación:**
- [ ] Track → polygon cerrado
- [ ] Cola sync → FTIP TerritoryGeometryCaptured

---

### US-GTIP-009 — Capa inventario bodegas

| Campo | Contenido |
|-------|-----------|
| **Como** | gerente |
| **Quiero** | ver bodegas con nivel stock en mapa |
| **Para** | planificar logística |
| **Prioridad** | Media |

**Criterios de aceptación:**
- [ ] Capa CITE proyección por warehouseId
- [ ] Símbolo proporcional a kg

---

### US-GTIP-010 — IA zonas baja cobertura técnica

| Campo | Contenido |
|-------|-----------|
| **Como** | gerente extensión |
| **Quiero** | mapa zonas sin visita > 12 meses |
| **Para** | priorizar AITAP |
| **Prioridad** | Media |

**Criterios de aceptación:**
- [ ] Análisis IA + capa prioridad
- [ ] Humano valida recomendación

---

### US-GTIP-011 — Import Shapefile capa externa

| Campo | Contenido |
|-------|-----------|
| **Como** | administrador GIS |
| **Quiero** | importar límites veredales oficiales |
| **Para** | contexto cartográfico |
| **Prioridad** | Media |

**Criterios de aceptación:**
- [ ] Import con validación SRID
- [ ] Capa referencia no autoritativa ERP

---

### US-GTIP-012 — NDVI overlay finca (futuro)

| Campo | Contenido |
|-------|-----------|
| **Como** | agrónomo |
| **Quiero** | superponer NDVI Sentinel sobre lotes |
| **Para** | detectar estrés vegetativo |
| **Prioridad** | Baja (R5) |

**Criterios de aceptación:**
- [ ] Raster tile layer vía IEL
- [ ] Leyenda y fecha imagen

---

## 7. Casos de Uso

| ID | Caso de uso | Actor | Resultado |
|----|-------------|-------|-----------|
| CU-GTIP-01 | Consultar mapa multi-capa | Visualizador | Mapa renderizado |
| CU-GTIP-02 | Medir área polígono | Técnico | ha, m² |
| CU-GTIP-03 | Medir distancia | Técnico | metros, km |
| CU-GTIP-04 | Crear buffer zona | Supervisor | Polígono buffer |
| CU-GTIP-05 | Intersect dos capas | Analista | Geometría resultado |
| CU-GTIP-06 | Dividir polígono | GIS Admin | Geometrías hijas → FTIP |
| CU-GTIP-07 | Unir polígonos | GIS Admin | Unión → FTIP |
| CU-GTIP-08 | Optimizar ruta visitas | Supervisor | RoutePlan |
| CU-GTIP-09 | Asignar técnico por proximidad | Manager | Sugerencia asignación |
| CU-GTIP-10 | Validar geocerca compra | Sistema | contains true/false |
| CU-GTIP-11 | Heatmap producción | Gerente | Capa densidad |
| CU-GTIP-12 | Export GeoJSON capa | Auditor | Archivo export |
| CU-GTIP-13 | Configurar capa temática | GIS Admin | LayerDefinition |
| CU-GTIP-14 | Track GPS tiempo real técnico | OCC | Posición actual |
| CU-GTIP-15 | Análisis cobertura visitas | Supervisor | % municipio visitado |

---

## 8. Reglas de Negocio

### 8.1 Autoridad geométrica

| ID | Regla |
|----|-------|
| RN-GTIP-001 | Polígonos autoritativos finca/lote/recurso natural solo en FTIP |
| RN-GTIP-002 | GTIP ejecuta operaciones; FTIP persiste resultados catastrales |
| RN-GTIP-003 | Geometrías scratch/análisis en GTIP son temporales o de referencia |
| RN-GTIP-004 | SRID default EPSG:4326 (WGS84); conversión display local vía GIS |
| RN-GTIP-005 | Índices GIST obligatorios en capas vectoriales persistentes |

### 8.2 Capas y visualización

| ID | Regla |
|----|-------|
| RN-GTIP-010 | Toda capa temática tiene `layerCode` único por org |
| RN-GTIP-011 | Capas dominio consumen proyección/eventos — no OLTP en render |
| RN-GTIP-012 | PBAC filtra features por UserScope municipio/territorio |
| RN-GTIP-013 | Zoom min/max por capa configurable |
| RN-GTIP-014 | Clustering automático > N features en viewport |

### 8.3 Operaciones espaciales

| ID | Regla |
|----|-------|
| RN-GTIP-020 | Polígono inválido (auto-intersección) rechazado |
| RN-GTIP-021 | Área mínima/máxima configurable por tipo entidad |
| RN-GTIP-022 | Buffer distancia ≥ 0; unidades metros |
| RN-GTIP-023 | Split/union catastral requiere workflow FTIP |
| RN-GTIP-024 | Círculo = buffer desde punto centro + radio |

### 8.4 Rutas

| ID | Regla |
|----|-------|
| RN-GTIP-030 | Optimización ruta usa red vial externa (IEL) o euclidiana fallback |
| RN-GTIP-031 | RoutePlan no modifica agenda AITAP sin confirmación supervisor |
| RN-GTIP-032 | Costo desplazamiento = distancia × tarifa org + tiempo × costo hora |
| RN-GTIP-033 | Máximo paradas por ruta configurable |

### 8.5 Offline Android

| ID | Regla |
|----|-------|
| RN-GTIP-040 | Tiles cache región asignada técnico |
| RN-GTIP-041 | Medición y track offline; sync geometría al reconectar |
| RN-GTIP-042 | Capas vectoriales simplificadas en cache mobile |

### 8.6 Integración

| ID | Regla |
|----|-------|
| RN-GTIP-050 | USFP submissions aparecen como capa puntos con context binding |
| RN-GTIP-051 | CPE compras agregables por finca/lote/municipio |
| RN-GTIP-052 | Posición vehículo/técnico tiempo real TTL configurable |
| RN-GTIP-053 | IA sugiere rutas/zonas; humano aprueba |

---

## 9. Flujo principal — Consulta territorial y análisis

| Paso | Actor | Acción | Resultado |
|------|-------|--------|-----------|
| 1 | Usuario | Abre mapa territorial org | Viewport inicial |
| 2 | Sistema | Carga capas base + autorizadas por rol | Tiles + vectors |
| 3 | Usuario | Activa capas: fincas, lotes, compras | Features render |
| 4 | Usuario | Aplica filtros municipio, campaña | Subset features |
| 5 | Usuario | Selecciona finca en mapa | Popup + enlace FTIP twin |
| 6 | Usuario | Ejecuta medición área lote adyacente | ha calculadas |
| 7 | Usuario | Superpone capa certificación | Visual overlap |
| 8 | Usuario | Lanza análisis intersect | Reporte solape |
| 9 | Supervisor | Exporta GeoJSON auditoría | Archivo EDMKP |
| 10 | Sistema | Registra auditoría consulta/análisis | Audit log |

---

## 10. Flujos alternativos

### FA-GTIP-01 — Edición polígono catastral

| Paso | Acción |
|------|--------|
| FA1.1 | Técnico dibuja/edita polígono en GTIP |
| FA1.2 | GTIP valida topología |
| FA1.3 | Envía propuesta a FTIP `GeometryRevision` |
| FA1.4 | Supervisor FTIP aprueba → capa actualizada |

### FA-GTIP-02 — Planificación ruta comprador

| Paso | Acción |
|------|--------|
| FA2.1 | Comprador selecciona productores pendientes visita |
| FA2.2 | GTIP optimiza secuencia |
| FA2.3 | Comprador ajusta manualmente orden |
| FA2.4 | Export agenda / sync CLSE |

### FA-GTIP-03 — Offline Android medición

| Paso | Acción |
|------|--------|
| FA3.1 | Técnico mide polígono sin red |
| FA3.2 | Guarda en cola local |
| FA3.3 | Sync envía a FTIP como captura propuesta |

### FA-GTIP-04 — Import capa referencia

| Paso | Acción |
|------|--------|
| FA4.1 | GIS Admin importa Shapefile hidrografía |
| FA4.2 | Valida SRID y topología |
| FA4.3 | Publica capa referencia `hydro_ref` |

---

## 11. Casos de error

| ID | Condición | Mensaje | Comportamiento |
|----|-----------|---------|----------------|
| CE-GTIP-01 | Polígono inválido | "Geometría no válida" | Rechaza operación |
| CE-GTIP-02 | SRID no soportado | "Sistema coordenadas no compatible" | Rechaza import |
| CE-GTIP-03 | Fuera extent org | "Fuera del territorio autorizado" | Recorta o rechaza |
| CE-GTIP-04 | Sin permiso capa | "Capa no autorizada" | Oculta capa |
| CE-GTIP-05 | Geocerca fallida | "Punto fuera de {entityName}" | CPE rechaza |
| CE-GTIP-06 | Ruta sin solución | "No se pudo optimizar ruta" | Sugiere manual |
| CE-GTIP-07 | Tiles offline expirados | "Actualice mapa offline" | Advertencia |
| CE-GTIP-08 | Análisis timeout | "Análisis demasiado grande; refine área" | Async job |
| CE-GTIP-09 | Feature sin geometría | "Entidad sin georreferenciación" | Excluye de mapa |
| CE-GTIP-10 | Cross-tenant layer | 403/404 | Bloquea |

---

## 12. Validaciones

### 12.1 Tipos de geometría

| Tipo | Uso | Validación |
|------|-----|------------|
| Point | GPS, POI, centroide | Coordenadas WGS84, accuracy opcional |
| LineString | Ruta, río, track | ≥2 vértices |
| Polygon | Finca, lote, zona | Cerrado, sin auto-intersección |
| MultiPolygon | Finca compuesta, multipredio | Cada parte válida |
| Circle | Geocerca circular | center Point + radiusM > 0 |
| Buffer | Zona influencia | geometry + distanceM |
| MultiPoint | Cluster puntos | |
| GeometryCollection | Análisis compuesto | |
| Raster | NDVI, DEM (futuro) | Bounds, CRS, resolución |

### 12.2 Entidades geográficas (proyección mapa)

| Entidad | Fuente autoritativa | Geometría típica |
|---------|---------------------|------------------|
| Productor | PRM + FTIP | Point (dirección/centroide finca) |
| Finca | FTIP FarmUnit | Polygon |
| Lote | FTIP LotUnit | Polygon |
| Centro acopio | CLSE / FTIP infra | Point |
| Bodega | CITE / FTIP infra | Point/Polygon |
| Empresa | Org CORE | Point sede |
| Comprador | Identity + cartera | Point última posición |
| Vehículo | CLSE telemetría | Point tiempo real |
| Técnico | Android heartbeat OCC | Point tiempo real |
| Ruta | CLSE RoutePlan | LineString |
| Cliente | Comercial (futuro) | Point |
| Proveedor | Compras (futuro) | Point |
| Formulario USFP | USFP submission | Point + track opcional |
| Compra CPE | CPE | Point GPS compra |
| Visita AITAP | AITAP | Point check-in + track |

### 12.3 Operaciones espaciales (catálogo)

| Operación | Entrada | Salida |
|-----------|---------|--------|
| calculateArea | Polygon/MultiPolygon | ha, m² |
| calculatePerimeter | Polygon/Line | m, km |
| calculateDistance | Point/Line × 2 | m |
| calculateCentroid | Polygon | Point |
| buffer | Geometry + distanceM | Polygon |
| intersect | Geometry × 2 | Geometry |
| union | Geometry[] | Geometry |
| difference | Geometry × 2 | Geometry |
| split | Polygon + Line | Polygon[] |
| contains | Polygon, Point | boolean |
| within | Geometry × 2 | boolean |
| overlaps | Polygon × 2 | boolean + area |
| simplify | Geometry + tolerance | Geometry |
| validateTopology | Polygon | errors[] |
| pointOnSurface | Polygon | Point |
| length | LineString | m |
| geocode / reverseGeocode | address / Point | Point / address |

### 12.4 Capas temáticas soportadas

| Código capa | Fuente datos |
|-------------|--------------|
| `producers` | PRM |
| `farms` | FTIP |
| `lots` | FTIP |
| `production` | FMDT/CPE agregado |
| `quality` | CQIE por lote |
| `purchases` | CPE |
| `visits` | AITAP |
| `contracts` | CSAE alcance |
| `risks` | FTIP/FMDT/AIADP |
| `certifications` | FTIP TerritoryCertification |
| `inventory` | CITE bodegas |
| `collection_centers` | CLSE |
| `roads` | OSM/IEL referencia |
| `hydrography` | FTIP NaturalResource / ref |
| `relief` | DEM raster IEL |
| `forests` | FTIP NaturalResource |
| `protected_areas` | FTIP reservas |
| `form_submissions` | USFP |
| `vehicles` | CLSE |
| `technicians_live` | OCC/Android |

---

## 13. Dependencias con otros módulos

| Módulo | Relación |
|--------|----------|
| **FTIP** | Consume geometría autoritativa; delega persistencia catastro |
| **PRM** | Capa productores, direcciones |
| **FMDT** | Capa lotes operativos, productividad |
| **USFP** | Submissions georreferenciadas |
| **AITAP** | Visitas, tracks, cobertura |
| **CPE** | Compras GPS, heatmaps volumen |
| **CITE** | Bodegas, movimientos geo |
| **CSAE** | Contratos alcance territorial |
| **CQIE** | Calidad geográfica |
| **CLSE** | Rutas, vehículos, acopios |
| **OCC** | Posición tiempo real, alertas mapa |
| **IEL** | OSM, satélite, DEM, routing externo |
| **AIADP** | OPT rutas, RSK anomalías, análisis IA |
| **EDMKP** | Export mapas PDF, ortofotos |
| **DPAL** | Agregaciones espaciales batch |
| **MDE** | Límites admin geo.* |
| **Identity** | PBAC territorial |
| **Event Engine** | Refresh capas proyección |

---

## 14. Permisos

| Permiso | Descripción | Roles |
|---------|-------------|-------|
| `gis:read` | Ver mapas y capas | Todos autorizados |
| `gis:measure` | Medir área/distancia | field_agent+ |
| `gis:capture` | Captura GPS/track | field_agent |
| `gis:edit` | Geometrías scratch/análisis | gis_admin, supervisor |
| `gis:analyze` | Análisis espacial | manager, supervisor |
| `gis:route` | Planificar rutas | buyer, supervisor, manager |
| `gis:route:approve` | Aprobar rutas | supervisor |
| `gis:layer:read` | Ver definición capas | analyst |
| `gis:layer:admin` | CRUD capas | gis_admin |
| `gis:import` | Import SHP/GeoJSON | gis_admin |
| `gis:export` | Export geo | auditor, manager |
| `gis:admin` | Config tiles, políticas | admin |
| `territory:geometry` | Edición vía FTIP (pareja) | field_agent |

---

## 15. Auditoría

| Evento auditado | Datos |
|-----------------|-------|
| Consulta mapa sensible | Usuario, capas, bbox |
| Operación espacial | Tipo, geometría, resultado |
| Creación/edición capa | LayerDefinition diff |
| Import geodata | Archivo, features count |
| Export geodata | Formato, filtros |
| RoutePlan generado | Paradas, distancia, aprobador |
| Geocerca validación fallida | entityId, point |
| Análisis espacial async | JobId, parámetros |

---

## 16. Eventos generados

| Evento | Cuándo |
|--------|--------|
| `MapLayerPublished` | Capa activada |
| `SpatialAnalysisCompleted` | Análisis finalizado |
| `RoutePlanCreated` | Ruta optimizada |
| `RoutePlanApproved` | Supervisor aprueba |
| `GeofenceViolation` | Punto fuera zona |
| `GeofenceEntered` / `Exited` | Tracking tiempo real |
| `GeometryImportCompleted` | Import OK |
| `GeometryValidationFailed` | Topología inválida |
| `TerritoryHeatmapCalculated` | Heatmap listo |
| `GpsTrackRecorded` | Track Android |
| `MapExportGenerated` | PDF/GeoJSON export |
| `LayerProjectionRefreshed` | Proyección dominio actualizada |

Namespace: `gis.*` + `territory.gis.*`

---

## 17. Automatizaciones

| ID | Disparador | Acción |
|----|------------|--------|
| AUT-GTIP-01 | GeofenceViolation compra | Alerta OCC + bloqueo CPE |
| AUT-GTIP-02 | Técnico sale de municipio scope | Alerta supervisor |
| AUT-GTIP-03 | Cobertura visita < umbral municipio | Tarea AITAP |
| AUT-GTIP-04 | Superposición cert detectada | Alerta calidad |
| AUT-GTIP-05 | Vehículo desvía ruta planificada | Alerta CLSE |
| AUT-GTIP-06 | NDVI caída zona (R5) | Alerta FMDT |
| AUT-GTIP-07 | Cron nocturno | Refresh proyecciones capas |
| AUT-GTIP-08 | Nuevo purchase CPE | Actualiza capa compras |
| AUT-GTIP-09 | Productor sin geo | Tarea georreferenciar |
| AUT-GTIP-10 | Ruta óptima diaria 6am | Push técnico Android |

---

## 18. Integración IA

| Función | Entrada | Salida |
|---------|---------|--------|
| Zonas prioritarias extensión | Visitas, productores, NDVI | Mapa prioridad |
| Predicción productividad regional | Histórico CPE, clima | kg/ha por zona |
| Anomalías geográficas | Compras GPS, patrones | Puntos sospechosos |
| Recomendación rutas | Paradas, ventanas, tráfico | RoutePlan sugerido |
| Baja cobertura técnica | AITAP + PRM geo | Polígonos underserved |
| Zonas expansión agrícola | FTIP histórico + satélite | Alerta expansión |
| Clustering inteligente | Features densidad | Agrupaciones |
| Detección GPS simulado | Accuracy, velocidad | Flag fraude GECL |

**RN-GTIP-053:** IA recomienda; supervisor aprueba rutas y priorización.

---

## 19. Funciones GIS (catálogo funcional)

| Categoría | Funciones |
|-----------|-----------|
| **Creación** | Dibujar punto, línea, polígono, círculo; GPS walk polygon; import file |
| **Edición** | Mover vértices, añadir/eliminar nodos, snap, split, merge |
| **Medición** | Área, perímetro, distancia, azimut |
| **Análisis** | Buffer, intersect, union, difference, contains, heatmap, density |
| **Georreferenciación** | Geocode, reverse, snap to parcela |
| **Rutas** | TSP/VRP optimización, isócronas, matriz distancias |
| **Export/Import** | GeoJSON, KML, Shapefile, GPX, CSV con coords |
| **Publicación** | Vector tiles, WMS layer, WFS feature service |

Edición catastral persistente → **FTIP** vía API geometry.

---

## 20. Integración Android / Tablet

| Función | Offline | Detalle |
|---------|---------|---------|
| Navegación mapa | Sí | Tiles cache región |
| Captura GPS punto | Sí | accuracy, altitude |
| Walk polygon / track | Sí | Sync FTIP |
| Medición área/distancia | Sí | PostGIS local simplificado |
| Seguimiento recorrido | Sí | LineString timestamped |
| Capas asignadas | Sí | Vector simplificado |
| Rutas planificadas | Sí | Descarga día |
| Fotos geo USFP | Sí | Capa submissions cache |
| Sync posterior | Auto | Tiles + tracks + mediciones |

Tablet: pantalla dividida mapa + panel datos; stylus para vértices.

---

## 21. Integración Formularios (USFP)

| Función | Descripción |
|---------|-------------|
| Capa submissions | Puntos por formulario/tipo |
| Popup | Datos + enlace submission |
| Fotos georreferenciadas | Thumbnail mapa → EDMKP |
| Videos geo | Marker + playback |
| Context finca/lote | Línea a polígono FTIP |
| Geocerca formulario | settings.geofence USFP validada GTIP |
| Heatmap respuestas | Densidad por campo categoría |

---

## 22. Integración Compras (CPE)

| Visualización | Descripción |
|---------------|-------------|
| Compras por región | Choropleth municipio/vereda |
| Por productor | Points sized by kg |
| Por finca/lote | Dentro polígono FTIP |
| Volumen temporal | Animación campaña (futuro) |
| Tendencias geo | Δ kg periodo anterior |
| Validación GPS | geofence contains en compra |
| Centros compra | Puntos acopio activos |

---

## 23. Integración Inventario (CITE)

| Visualización | Descripción |
|---------------|-------------|
| Existencias bodega | Symbol size ∝ kg |
| Inventario por centro | Cluster bodegas |
| Movimientos geo | Flechas origen→destino |
| Capacidad utilización | Color ramp ocupación |
| Trazabilidad mapa | Origen finca → bodega |

---

## 24. Integración Productores (PRM)

| Función | Descripción |
|---------|-------------|
| Capa productores | Point + estado lifecycle color |
| Cartera comprador | Filtro assignedBuyerId |
| Densidad productores | Heatmap/kernel |
| Enlace expediente | Popup → PRM 360 |
| Sin georreferenciar | Flag + lista pendientes |

---

## 25. Integración Fincas y Lotes (FTIP / FMDT)

| Función | Descripción |
|---------|-------------|
| Polígonos finca/lote | Capas autoritativas |
| Edición geometría | GTIP tools → FTIP revision |
| Recursos naturales | Bosque, agua, reservas |
| Certificaciones espaciales | Overlay alcance |
| Productividad lote | FMDT KPIs symbology |
| Historial geometría | Slider temporal |

---

## 26. Integración Visitas (AITAP)

| Función | Descripción |
|---------|-------------|
| Heatmap visitas | Densidad técnica |
| Tracks visita | LineString recorrido |
| Cobertura % | Municipio visitado vs objetivo |
| Check-in points | Validación dentro finca |
| Planificación | Input rutas optimizadas |

---

## 27. Integración Contratos y Calidad (CSAE / CQIE)

| Función | Descripción |
|---------|-------------|
| Alcance contractual | Polígono cupo CSAE |
| Calidad por zona | Choropleth score CQIE |
| NC geográficas | Points alertas |
| Cumplimiento cert | Intersect cert vs producción |

---

## 28. Integración Logística (CLSE)

| Función | Descripción |
|---------|-------------|
| Rutas transporte | LineString activas |
| Vehículos tiempo real | Points animados |
| Centros acopio | Capa POI |
| Optimización despacho | VRP multi-vehículo |
| Costos logísticos | Por ruta en RoutePlan |

---

## 29. Inteligencia territorial (futuro R5)

| Fuente | Capa | Uso |
|--------|------|-----|
| Sentinel/Planet | NDVI/EVI raster | Vigilancia cultivo |
| Drones | Ortofoto tile | Inspección finca |
| IoT estaciones | Points + isolines | Clima local |
| DEM | Hillshade/contours | Relieve, pendiente |
| Humedad suelo | Raster/Points | Riego |
| Mapas climáticos | Raster | Riesgo helada |
| Alertas ambientales | Polygons | Inundación, sequía |

Ingesta vía **IEL**; GTIP renderiza y cruza con FTIP/FMDT.

---

## 30. Análisis espacial (especificación)

| Análisis | Descripción | Salida |
|----------|-------------|--------|
| Heatmap | Kernel densidad puntos | Raster/vector grid |
| Densidad productores | Por km² | Choropleth admin |
| Cobertura visitas | % área visitada | Polygon + % |
| Producción por región | Agregación espacial join | Tabla + mapa |
| Riesgo por zona | Score AIADP agregado | Zonas clasificadas |
| Distancias | Matriz origen-destino | Tabla N×N |
| Superposición capas | Intersect multi-capa | Reporte áreas |
| Proximidad | Buffer + count features | Ranking cercanía |
| Clustering | K-means espacial | Grupos |
| Estadísticas espaciales | Mean, sum, count por polígono zona | Tabla |

Jobs grandes → async con notificación completado.

---

## 31. Planificación de rutas

### 31.1 RoutePlan (entidad funcional)

| Campo | Descripción |
|-------|-------------|
| routePlanId | UUID |
| organizationId | Tenant |
| planType | visit_technician, purchase_buyer, logistics_dispatch |
| assignedUserId | Técnico/comprador/conductor |
| plannedDate | Fecha |
| stops[] | ordered: entityType, entityId, geometry, window, serviceMin |
| routeGeometry | LineString optimizada |
| totalDistanceKm | |
| totalDurationMin | |
| estimatedCost | Desplazamiento |
| status | draft, proposed, approved, in_progress, completed |
| source | manual, ai_optimized, hybrid |
| approvedBy | Supervisor |

### 31.2 Capacidades

| Capacidad | Descripción |
|-----------|-------------|
| Optimización secuencia | TSP con ventanas tiempo |
| Asignación técnico | Por proximidad y carga |
| Asignación comprador | Por cartera PRM |
| Tiempo/distancia estimado | OSRM/Google/IEL |
| Costo desplazamiento | Tarifas org |
| Re-optimización en ruta | Desvíos tiempo real |
| Export GPX | Navegación Android |

---

## 32. Modelo de datos funcional

### 32.1 LayerDefinition (capa temática)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| layerId | UUID | |
| organizationId | UUID | |
| layerCode | Texto | Único org |
| layerName | Texto | |
| layerType | vector, raster, heatmap, cluster |
| sourceModule | FTIP, PRM, CPE, etc. |
| sourceQuery | JSON filtro proyección |
| geometryType | Point, Line, Polygon, Mixed |
| styleRules | JSON simbología |
| minZoom / maxZoom | Entero | |
| refreshIntervalMin | Entero | Cache proyección |
| status | draft, active, archived |
| isPublic | bool | Todos org vs roles |

### 32.2 MapBasemapConfig

| Campo | Descripción |
|-------|-------------|
| basemapId | UUID |
| provider | maptiler, osm, satellite, custom |
| urlTemplate | Tiles URL |
| attribution | |
| defaultForOrg | bool |

### 32.3 SpatialOperationLog

| Campo | Descripción |
|-------|-------------|
| operationId | UUID |
| operationType | area, buffer, intersect, etc. |
| inputGeometry | GeoJSON |
| outputGeometry | GeoJSON |
| parameters | JSON |
| resultScalar | ha, m, etc. |
| performedBy | User |
| performedAt | |

### 32.4 RoutePlan / RouteStop

Ver §31.1 — RouteStop: sequence, entityType, entityId, location, eta, actualArrival.

### 32.5 GeofenceDefinition

| Campo | Descripción |
|-------|-------------|
| geofenceId | UUID |
| entityType | farm, lot, warehouse, custom |
| entityId | Ref dominio |
| geometry | Polygon o Circle |
| alertOnEnter / alertOnExit | bool |
| linkedPolicies | CPE, OCC, etc. |

### 32.6 ImportedGeoLayer (referencia)

| Campo | Descripción |
|-------|-------------|
| importId | UUID |
| layerCode | |
| sourceFile | EDMKP ref |
| featureCount | |
| srid | |
| importedAt | |

### 32.7 TerritoryAnalysisJob

| Campo | Descripción |
|-------|-------------|
| jobId | UUID |
| analysisType | heatmap, coverage, intersect, etc. |
| parameters | JSON |
| status | pending, running, completed, failed |
| resultRef | GeoJSON/stats |
| requestedBy | |

### 32.8 LayerFeatureProjection (cache)

| Campo | Descripción |
|-------|-------------|
| projectionId | UUID |
| layerId | FK |
| entityType / entityId | Origen dominio |
| geometry | PostGIS |
| properties | JSON atributos mapa |
| refreshedAt | |

---

## 33. API funcional

**Base path:** `/api/v1/gis`

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/layers` | `gis:read` | Listar capas activas |
| POST | `/layers` | `gis:layer:admin` | Crear capa |
| PATCH | `/layers/:id` | `gis:layer:admin` | Editar capa |
| GET | `/layers/:id/features` | `gis:read` | Features en bbox |
| POST | `/layers/:id/refresh` | `gis:layer:admin` | Refresh proyección |
| GET | `/basemaps` | `gis:read` | Mapas base org |
| POST | `/measure/area` | `gis:measure` | Calcular área |
| POST | `/measure/distance` | `gis:measure` | Distancia |
| POST | `/measure/perimeter` | `gis:measure` | Perímetro |
| POST | `/ops/centroid` | `gis:measure` | Centroide |
| POST | `/ops/buffer` | `gis:analyze` | Buffer |
| POST | `/ops/intersect` | `gis:analyze` | Intersección |
| POST | `/ops/union` | `gis:analyze` | Unión |
| POST | `/ops/difference` | `gis:analyze` | Diferencia |
| POST | `/ops/split` | `gis:edit` | Dividir polígono |
| POST | `/ops/validate` | `gis:measure` | Validar topología |
| POST | `/ops/contains` | `gis:read` | Punto en polígono |
| POST | `/geofence/check` | `gis:read` | Validar geocerca |
| GET | `/geofences` | `gis:read` | Listar geocercas |
| POST | `/geofences` | `gis:layer:admin` | Crear geocerca |
| POST | `/routes/optimize` | `gis:route` | Optimizar ruta |
| GET | `/routes` | `gis:route` | Listar RoutePlans |
| POST | `/routes` | `gis:route` | Crear plan |
| POST | `/routes/:id/approve` | `gis:route:approve` | Aprobar |
| GET | `/routes/:id/export/gpx` | `gis:route` | Export GPX |
| POST | `/analyze` | `gis:analyze` | Análisis async |
| GET | `/analyze/:jobId` | `gis:analyze` | Resultado job |
| POST | `/import` | `gis:import` | Import SHP/GeoJSON |
| POST | `/export` | `gis:export` | Export capa |
| GET | `/tiles/:layerCode/{z}/{x}/{y}` | `gis:read` | Vector/raster tiles |
| POST | `/geocode` | `gis:read` | Geocoding |
| POST | `/reverse-geocode` | `gis:read` | Reverse |
| GET | `/reports/:reportCode` | `gis:export` | GTIP-RPT-* |
| POST | `/sync/mobile` | `gis:capture` | Batch tracks Android |

**Delegación FTIP:** `POST /ftip/.../geometry` para persistencia catastral.

---

## 34. Interfaz (especificación funcional — sin diseño gráfico)

| ID | Pantalla | Descripción |
|----|----------|-------------|
| UI-GTIP-01 | Mapa territorial principal | Multi-capa, filtros, leyenda |
| UI-GTIP-02 | Administrador capas | CRUD LayerDefinition |
| UI-GTIP-03 | Herramientas medición | Área, distancia, perímetro |
| UI-GTIP-04 | Editor geometría | Vértices, snap, validación |
| UI-GTIP-05 | Análisis espacial | Wizard heatmap, intersect, etc. |
| UI-GTIP-06 | Planificador rutas | Paradas, optimizar, aprobar |
| UI-GTIP-07 | Detalle RoutePlan | Mapa + tabla paradas |
| UI-GTIP-08 | Geocercas | Lista + mapa |
| UI-GTIP-09 | Import geodata | Wizard archivo |
| UI-GTIP-10 | Popup feature | Atributos + enlaces dominio |
| UI-GTIP-11 | Timeline mapa | Geometría histórica FTIP |
| UI-GTIP-12 | Dashboard KPIs territoriales | Widgets cobertura, producción |
| UI-GTIP-13 | Comparador capas | Split swipe antes/después |
| UI-GTIP-14 | Export mapa | PDF, PNG, GeoJSON |

---

## 35. Android / Tablet (especificación funcional)

| ID | Flujo | Offline |
|----|-------|---------|
| AND-GTIP-01 | Mapa navegación | Tiles cache |
| AND-GTIP-02 | Mi ruta del día | GPX cache |
| AND-GTIP-03 | Medir área/distancia | Sí |
| AND-GTIP-04 | Walk polygon | Sí → sync FTIP |
| AND-GTIP-05 | GPS track visita | Sí → AITAP |
| AND-GTIP-06 | Ver capas asignadas | Vector cache |
| AND-GTIP-07 | Popup finca/lote | Cache atributos |
| AND-GTIP-08 | Navegación turn-by-turn | Offline ruta |
| TAB-GTIP-01 | Mapa + panel split | Sí |
| TAB-GTIP-02 | Edición vértices stylus | Sí borrador |

---

## 36. Reportes

| ID | Reporte | Descripción |
|----|---------|-------------|
| GTIP-RPT-01 | Mapa fincas activas | Export PDF/PNG |
| GTIP-RPT-02 | Mapa lotes por variedad | Temático |
| GTIP-RPT-03 | Densidad productores | Por km² |
| GTIP-RPT-04 | Cobertura visitas municipio | % área |
| GTIP-RPT-05 | Heatmap compras | kg por zona |
| GTIP-RPT-06 | Compras por productor mapa | Points |
| GTIP-RPT-07 | Producción por región | Choropleth |
| GTIP-RPT-08 | Riesgo territorial | Zonas clasificadas |
| GTIP-RPT-09 | Cumplimiento cert espacial | Intersect report |
| GTIP-RPT-10 | Inventario bodegas mapa | Stock geo |
| GTIP-RPT-11 | Movimientos logísticos | Flujos |
| GTIP-RPT-12 | Rutas planificadas vs reales | Comparativo |
| GTIP-RPT-13 | Distancias recorridas | Por técnico/comprador |
| GTIP-RPT-14 | Costos desplazamiento | Por ruta |
| GTIP-RPT-15 | Submissions USFP mapa | Por formulario |
| GTIP-RPT-16 | Productores sin geo | Lista + mapa vacíos |
| GTIP-RPT-17 | Superposiciones fincas | Conflictos |
| GTIP-RPT-18 | Historial geometría | Antes/después |
| GTIP-RPT-19 | Análisis proximidad bodega | Fincas cercanas |
| GTIP-RPT-20 | Export auditoría EUDR | Polígonos + metadata |

---

## 37. KPIs

| ID | KPI | Categoría | Fórmula |
|----|-----|-----------|---------|
| KPI-GTIP-01 | Cobertura georreferenciación fincas | Cobertura | Con polígono / activas |
| KPI-GTIP-02 | % productores con punto | Cobertura | Con geo / activos PRM |
| KPI-GTIP-03 | Municipios 100% catastrados | Cobertura | COUNT |
| KPI-GTIP-04 | Visitas realizadas / planificadas | Visitas | AITAP |
| KPI-GTIP-05 | % área visitada 12m | Visitas | Área buffer visitas / total |
| KPI-GTIP-06 | Producción kg por región | Producción | SUM CPE por municipio |
| KPI-GTIP-07 | Productividad kg/ha mapa | Productividad | FMDT agregado zona |
| KPI-GTIP-08 | Zonas riesgo alto | Riesgos | % área riesgo high |
| KPI-GTIP-09 | Distancia media ruta/día | Distancias | AVG RoutePlan km |
| KPI-GTIP-10 | Km totales recorridos mes | Distancias | SUM tracks |
| KPI-GTIP-11 | Costo logístico / kg | Costos | Costo rutas / kg CPE |
| KPI-GTIP-12 | Costo desplazamiento técnico | Costos | SUM rutas AITAP |
| KPI-GTIP-13 | Cobertura comprador cartera | Comercial | Productores visitados / asignados |
| KPI-GTIP-14 | Compras dentro geocerca % | Calidad | contains OK / total |
| KPI-GTIP-15 | Capas activas org | Operación | COUNT layers |
| KPI-GTIP-16 | Análisis espaciales / mes | Operación | COUNT jobs |
| KPI-GTIP-17 | Tiempo medio análisis | Eficiencia | AVG job duration |
| KPI-GTIP-18 | Tiles cache hit rate mobile | Offline | hits / requests |
| KPI-GTIP-19 | NDVI medio zona (R5) | Inteligencia | AVG raster |
| KPI-GTIP-20 | Expansión área neta campaña | Sostenibilidad | Δ ha FTIP |

### 37.1 Alertas OCC

| ID | Alerta |
|----|--------|
| GTIP-ALT-01 | Geocerca compra violada |
| GTIP-ALT-02 | Superposición fincas detectada |
| GTIP-ALT-03 | Técnico fuera territorio asignado |
| GTIP-ALT-04 | Ruta desviada > umbral |
| GTIP-ALT-05 | Cobertura visita municipio baja |
| GTIP-ALT-06 | Productor crítico sin geo |
| GTIP-ALT-07 | Análisis riesgo zona crítica |
| GTIP-ALT-08 | Import capa fallido |
| GTIP-ALT-09 | Certificación solape inválido |
| GTIP-ALT-10 | Vehículo parado fuera ruta > N min |

---

## 38. Escalabilidad

### 38.1 Millones de elementos geográficos

| Aspecto | Requisito |
|---------|-----------|
| Features vectoriales | PostGIS particionado; índices GIST |
| Tiles | Vector tiles pre-generados; CDN |
| Viewport queries | bbox + simplificación zoom |
| Heatmaps | Pre-agregación DPAL grid |
| Route optimization | Límite paradas; batch nocturno |
| Tracks GPS | Time-series particionado; retención policy |
| Raster NDVI | Pyramid tiles; no OLTP |

### 38.2 Multiempresa

- Capas y basemaps por `organizationId`
- Tiles URLs con token tenant
- KPIs sin cruce org

### 38.3 Multipaís

- Proyecciones display UTM por país
- Basemaps locales
- Routing providers por región

### 38.4 Multicultivo

- Capas estilo por commodityCode
- Filtros sector en LayerDefinition

---

## 39. Pruebas

### 39.1 Funcionales

| ID | Escenario |
|----|-----------|
| TF-GTIP-01 | Render capas fincas+lotes bbox |
| TF-GTIP-02 | Medir área polígono conocido |
| TF-GTIP-03 | Geocerca contains compra OK/fail |
| TF-GTIP-04 | Optimizar ruta 10 paradas |
| TF-GTIP-05 | Heatmap compras municipio |
| TF-GTIP-06 | Intersect cert vs lote |
| TF-GTIP-07 | Import GeoJSON referencia |
| TF-GTIP-08 | Android track offline sync |
| TF-GTIP-09 | PBAC oculta capa otro municipio |
| TF-GTIP-10 | Split polígono delega FTIP |

### 39.2 Integración

| ID | Escenario |
|----|-----------|
| TI-GTIP-01 | Capa FTIP actualiza al GeometryRevision |
| TI-GTIP-02 | CPE compra aparece en heatmap |
| TI-GTIP-03 | USFP submission en mapa |
| TI-GTIP-04 | RoutePlan → AITAP agenda |
| TI-GTIP-05 | CITE bodega stock symbology |

### 39.3 Carga

| ID | Escenario | Criterio |
|----|-----------|----------|
| TC-GTIP-01 | 1M polígonos bbox query | p95 < 300ms |
| TC-GTIP-02 | 10k points heatmap | < 5s |
| TC-GTIP-03 | Vector tiles z14 | < 100ms/tile |

---

## 40. Definición de Done

- [ ] US-GTIP-001 a 008 críticas/altas aceptadas PO
- [ ] RN-GTIP-001 a 053 validadas
- [ ] API `/api/v1/gis/*` Swagger
- [ ] Operaciones §12.3 implementadas
- [ ] Capas §12.4 mínimo fincas, lotes, compras, visitas
- [ ] Integraciones FTIP, USFP, CPE, AITAP, PRM (TI-GTIP-*)
- [ ] Android offline tiles + medición + track
- [ ] RoutePlan optimización básica
- [ ] Reportes GTIP-RPT-01 a 10
- [ ] KPIs KPI-GTIP-01 a 12 dashboard
- [ ] MapLibre web + Android integrado

---

## 41. Futuras Mejoras

| ID | Mejora | Release |
|----|--------|---------|
| FM-GTIP-01 | Raster NDVI/EVI live | R5 IEL |
| FM-GTIP-02 | 3D terrain DEM | R5 |
| FM-GTIP-03 | ArcadeGIS-style scripting capas | R5 |
| FM-GTIP-04 | Realidad aumentada vértices | R5+ |
| FM-GTIP-05 | WMS externo ArcGIS Server | R5 |
| FM-GTIP-06 | VRP flota multi-vehículo CLSE | R4 |
| FM-GTIP-07 | Digital twin mapa 4D tiempo | R5 |
| FM-GTIP-08 | Copilot mapa lenguaje natural | R5 AI |

---

## Control de cambios

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.0 | 2026-07-02 | Emisión inicial especificación funcional GTIP |

---

## Aprobaciones

| Rol | Nombre | Fecha |
|-----|--------|-------|
| Product Owner | AGROERP Product | 2026-07-02 |
| Arquitectura | AGROERP Architecture | Pendiente revisión |
| Desarrollo Lead | — | Pendiente |
| QA Lead | — | Pendiente |

---

*Fin del documento — GTIP v1.0*
