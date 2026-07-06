# Especificación Funcional — Productores (PRM)

| Campo | Valor |
|-------|-------|
| **Código módulo** | PRM |
| **Nombre** | Producer Relationship Management — Gestión de Relación con Productores |
| **Versión documento** | 1.0 |
| **Estado** | Aprobado para implementación |
| **Product Owner** | AGROERP Product |
| **Release objetivo** | R1 — Master & Territory |
| **Documentos referencia** | `PRODUCER_RELATIONSHIP_MANAGEMENT_PLATFORM.md`, `COFFEE_DOMAIN.md` §1–4, `MASTER_DATA_ENGINE.md` (`producer.*`, `party.*`), `AGROERP_MASTER_SPECIFICATION.md` |

---

## 1. Objetivo del módulo

Administrar **toda la vida del productor agrícola** dentro de AGROERP como **golden record** único por organización: identidad, ciclo de vida, relación comercial, territorio productivo (referencia), certificaciones, visitas (referencia), documentación, segmentación, indicadores y vista consolidada 360°.

El módulo PRM es la **entidad central del ERP**. Ningún motor transaccional (compras, contratos, pagos, logística) opera con un productor que no cumpla las reglas de estado y validación definidas en PRM.

---

## 2. Alcance

| # | Funcionalidad incluida |
|---|------------------------|
| A-01 | Registro y mantenimiento del expediente productor (persona natural, jurídica o asociación) |
| A-02 | Ciclo de vida completo con transiciones auditadas y workflow |
| A-03 | Gestión de contactos, direcciones, familia y perfil social |
| A-04 | Vinculación productor ↔ fincas/lotes (referencia FTIP; registro relación en PRM) |
| A-05 | Certificaciones productor/finca/lote con alertas de vencimiento |
| A-06 | Asignación de cartera (comprador, técnico, supervisor) |
| A-07 | Segmentación dinámica por reglas de negocio |
| A-08 | Indicadores y scores del productor (proyección desde motores + IA) |
| A-09 | Vista 360° consolidada (timeline, comercial, financiero, técnico) |
| A-10 | Expediente documental (referencia EDMKP) |
| A-11 | Comunicaciones e interacciones registradas |
| A-12 | Notas, observaciones y etiquetas |
| A-13 | Pre-registro y alta offline desde Android |
| A-14 | Validación KYC, duplicados (con DGMP) y elegibilidad operativa |
| A-15 | Historial de cosecha por lote/campaña |
| A-16 | Membresías en cooperativas y asociaciones |
| A-17 | Reportes y KPIs de cartera productores |
| A-18 | Integración bidireccional con eventos de dominio |

---

## 3. Exclusiones

| # | Exclusión | Módulo responsable |
|---|-----------|-------------------|
| E-01 | Geometría territorial autoritativa (polígonos, catastro) | FTIP |
| E-02 | Ejecución y registro de visitas técnicas (diagnósticos, planes) | AITAP |
| E-03 | Negociación, firma y cupos de contratos | CSAE |
| E-04 | Registro transaccional de compras y recepciones | CPE |
| E-05 | Dictámenes de calidad y catación | CQIE |
| E-06 | Cuenta corriente, liquidación y ejecución de pagos | CSFE |
| E-07 | Inventario físico en bodega | CITE |
| E-08 | Transporte, rutas y despachos | CLSE |
| E-09 | Almacenamiento binario de archivos | EDMKP |
| E-10 | Definición JSON de formularios | Form Engine |
| E-11 | Campañas de marketing masivo | Futuro |
| E-12 | Portal self-service productor completo | Futuro |
| E-13 | Diseño de interfaces gráficas | Fuera de esta especificación |

---

## 4. Actores

### 4.1 Administrador del sistema

| Campo | Descripción |
|-------|-------------|
| **Rol** | `admin` |
| **Responsabilidades** | Parametrizar catálogos productor, reglas lifecycle, segmentos globales, resolver fusiones, acceso auditoría completa |
| **Permisos** | `producer:*`, `producer:admin`, `audit:read` |

### 4.2 Gerencia / Dirección comercial

| Campo | Descripción |
|-------|-------------|
| **Rol** | `manager` |
| **Responsabilidades** | Aprobar altas de alto impacto, suspensiones, retiros, reasignaciones masivas de cartera, consultar KPIs ejecutivos |
| **Permisos** | `producer:read`, `producer:approve`, `producer:lifecycle`, `report:read` |

### 4.3 Supervisor de campo / comercial

| Campo | Descripción |
|-------|-------------|
| **Rol** | `supervisor` |
| **Responsabilidades** | Validar registros, aprobar fincas, revisar visitas iniciales, suspender/reactivar con motivo, supervisar cartera del equipo |
| **Permisos** | `producer:read`, `producer:update`, `producer:approve`, `producer:lifecycle` (limitado), `farm:read` |

### 4.4 Técnico de campo

| Campo | Descripción |
|-------|-------------|
| **Rol** | `field_agent` |
| **Responsabilidades** | Pre-registro productor, captura datos y documentos en campo, registro finca inicial, agenda visitas (AITAP), actualización productiva |
| **Permisos** | `producer:create`, `producer:read`, `producer:update` (scope territorial), `farm:create`, `farm:update` |

### 4.5 Comprador / Agente de compra

| Campo | Descripción |
|-------|-------------|
| **Rol** | `buyer` |
| **Responsabilidades** | Registrar prospectos, completar datos comerciales, gestionar cartera asignada, iniciar vinculación comercial |
| **Permisos** | `producer:create`, `producer:read`, `producer:update` (cartera propia), `producer:read` (comercial) |

### 4.6 Analista financiero / Tesorería

| Campo | Descripción |
|-------|-------------|
| **Rol** | `finance` |
| **Responsabilidades** | Validar datos bancarios y tributarios, aprobar cambios cuenta pago, consultar vista financiera 360° |
| **Permisos** | `producer:read`, `producer:update` (datos bancarios), `settlement:read` |

### 4.7 Auditor interno / externo

| Campo | Descripción |
|-------|-------------|
| **Rol** | `auditor` |
| **Responsabilidades** | Consulta expediente, lifecycle, documentos; sin mutación |
| **Permisos** | `producer:read`, `audit:read`, `document:read` |

### 4.8 Productor (externo)

| Campo | Descripción |
|-------|-------------|
| **Rol** | `producer` (futuro portal) |
| **Responsabilidades** | Consultar su expediente, firmar documentos, actualizar contacto (futuro) |
| **Permisos** | `producer:read` (propio), `document:sign` (futuro) |

### 4.9 Data Steward (gobierno del dato)

| Campo | Descripción |
|-------|-------------|
| **Rol** | `data_steward` |
| **Responsabilidades** | Resolver duplicados, fusionar golden records, validar calidad dato |
| **Permisos** | `producer:admin`, DGMP permisos |

---

## 5. Roles involucrados (sistema)

| Rol slug | Participación PRM |
|----------|-------------------|
| `admin` | Configuración total |
| `manager` | Aprobaciones alto nivel |
| `supervisor` | Validación operativa |
| `field_agent` | Campo, pre-registro, fincas |
| `buyer` | Captación y cartera comercial |
| `finance` | Validación datos pago |
| `auditor` | Solo lectura |
| `viewer` | Consulta listados |
| `data_steward` | Deduplicación / fusión |

---

## 6. Historias de Usuario

### US-PRM-001 — Pre-registro en campo

| Campo | Contenido |
|-------|-----------|
| **Como** | técnico de campo |
| **Quiero** | registrar un productor con datos mínimos sin conexión |
| **Para** | no perder oportunidades de vinculación en zona rural |
| **Prioridad** | Crítica |

**Criterios de aceptación:**
- [ ] Permite capturar tipo documento, número, nombres, teléfono, municipio y foto
- [ ] Genera código pre-registro y `externalId` para sync
- [ ] Estado resultante: `pre_registered`
- [ ] Al sincronizar no duplica si ya existe documento igual en org

---

### US-PRM-002 — Completar expediente productor

| Campo | Contenido |
|-------|-----------|
| **Como** | comprador |
| **Quiero** | completar todos los datos del expediente de un pre-registro |
| **Para** | enviarlo a validación y activación |
| **Prioridad** | Crítica |

**Criterios de aceptación:**
- [ ] Valida campos obligatorios según tipo productor (natural/jurídica)
- [ ] Permite adjuntar documentos de identidad y legal
- [ ] Cambia estado a `registered` o `under_validation` según completitud
- [ ] Bloquea envío si hay duplicado pendiente DGMP

---

### US-PRM-003 — Activar productor

| Campo | Contenido |
|-------|-----------|
| **Como** | supervisor |
| **Quiero** | aprobar el alta formal de un productor tras visita inicial favorable |
| **Para** | habilitar compras y contratos |
| **Prioridad** | Crítica |

**Criterios de aceptación:**
- [ ] Requiere visita inicial completada (AITAP) y documentos verificados
- [ ] Transición a `active` genera `ProducerActivated`
- [ ] CPE y CSAE aceptan operaciones sobre el productor
- [ ] CSFE crea cuenta corriente productor (evento consumido)

---

### US-PRM-004 — Suspender productor

| Campo | Contenido |
|-------|-----------|
| **Como** | supervisor |
| **Quiero** | suspender temporalmente un productor con motivo documentado |
| **Para** | bloquear nuevas operaciones comerciales por incumplimiento |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] Motivo obligatorio desde catálogo `producer.suspension_reason`
- [ ] Estado `suspended` bloquea compras y contratos nuevos (RN-PRM-020)
- [ ] Pagos de deuda existente según política org (configurable)
- [ ] Workflow si monto deuda > umbral

---

### US-PRM-005 — Vista 360° productor

| Campo | Contenido |
|-------|-----------|
| **Como** | gerente comercial |
| **Quiero** | ver en una sola pantalla perfil, fincas, compras, pagos, calidad y visitas |
| **Para** | tomar decisiones de relación sin navegar múltiples módulos |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] Muestra `Producer360Projection` actualizada ≤ 15 min desde eventos
- [ ] Timeline unificada ordenada cronológicamente
- [ ] Datos financieros marcados como proyección CSFE (no editable en PRM)
- [ ] Enlaces a registros origen en CPE, CSAE, CSFE, AITAP

---

### US-PRM-006 — Asignar cartera

| Campo | Contenido |
|-------|-----------|
| **Como** | coordinador comercial |
| **Quiero** | asignar comprador y técnico responsables de un productor |
| **Para** | definir responsabilidad comercial y de extensión |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] Soporta asignación primaria y secundaria con vigencia
- [ ] Historial de asignaciones conservado
- [ ] Usuario asignado ve productor en su cartera filtrada
- [ ] Evento `ProducerAssignmentChanged`

---

### US-PRM-007 — Gestionar certificaciones

| Campo | Contenido |
|-------|-----------|
| **Como** | técnico de campo |
| **Quiero** | registrar certificaciones del productor o finca con vigencia |
| **Para** | aplicar primas comerciales y cumplir auditorías |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] Esquema desde catálogo `cert.scheme`
- [ ] Alerta 90/60/30 días antes de vencimiento
- [ ] Documento certificado vinculado vía EDMKP
- [ ] Certificación vencida puede bloquear prima (política CSAE)

---

### US-PRM-008 — Segmentación dinámica

| Campo | Contenido |
|-------|-----------|
| **Como** | gerente |
| **Quiero** | definir segmentos por reglas (zona, volumen, calidad, certificación) |
| **Para** | priorizar visitas y políticas comerciales |
| **Prioridad** | Media |

**Criterios de aceptación:**
- [ ] Segmento recalculado batch nocturno o on-demand
- [ ] Productor puede pertenecer a múltiples segmentos
- [ ] Exportar listado segmento a reporte

---

### US-PRM-009 — Fusionar duplicados

| Campo | Contenido |
|-------|-----------|
| **Como** | data steward |
| **Quiero** | fusionar dos registros productor duplicados |
| **Para** | mantener un golden record único |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] Workflow aprobación fusión
- [ ] Lineage DGMP de registro absorbido
- [ ] Referencias CPE/CSAE migradas al productor sobreviviente
- [ ] Registro fusionado pasa a `archived`

---

### US-PRM-010 — Consultar KPIs cartera

| Campo | Contenido |
|-------|-----------|
| **Como** | gerencia |
| **Quiero** | dashboard de KPIs de productores por zona y campaña |
| **Para** | monitorear cobertura y desempeño de cartera |
| **Prioridad** | Media |

**Criterios de aceptación:**
- [ ] KPIs oficiales desde DPAL Metrics Engine
- [ ] Filtros: campaña, municipio, comprador, segmento, estado lifecycle

---

## 7. Casos de Uso

| ID | Caso de uso | Actor principal | Precondición | Postcondición |
|----|-------------|-----------------|--------------|---------------|
| CU-PRM-01 | Registrar productor | Técnico / Comprador | Permiso create; sin duplicado | Productor en `pre_registered` o `registered` |
| CU-PRM-02 | Validar documentación KYC | Supervisor | Estado `under_validation` | Docs verificados o devueltos |
| CU-PRM-03 | Ejecutar ciclo alta completo | Varios + Workflow | Prospecto identificado | Productor `active` |
| CU-PRM-04 | Vincular finca a productor | Técnico | Productor ≥ `registered`; FTIP unidad creada | Relación PRM + ref FTIP |
| CU-PRM-05 | Actualizar datos críticos | Comprador / Finanzas | Productor existente | Workflow si banco/doc; audit trail |
| CU-PRM-06 | Suspender productor | Supervisor | Productor `active` | `suspended`; bloqueo downstream |
| CU-PRM-07 | Reactivar productor | Supervisor / Gerencia | `suspended` o `inactive` | `active` si cumple reglas |
| CU-PRM-08 | Retirar productor de cartera | Gerencia | Sin operaciones abiertas críticas | `withdrawn` → `archived` |
| CU-PRM-09 | Consultar expediente 360° | Cualquier rol autorizado | Productor existe | Vista lectura consolidada |
| CU-PRM-10 | Asignar cartera comercial/técnica | Coordinador | Productor activo | Assignment activo |
| CU-PRM-11 | Gestionar certificación | Técnico | Productor/finca existe | Certificación registrada |
| CU-PRM-12 | Registrar comunicación | Comprador / Técnico | Productor existe | Communication log |
| CU-PRM-13 | Calcular segmentos | Sistema / Admin | Reglas definidas | Memberships actualizadas |
| CU-PRM-14 | Fusionar duplicados | Data steward | Match DGMP confirmado | Un golden record |
| CU-PRM-15 | Pre-registro offline Android | Técnico | App sincronizable | Outbox + `pre_registered` |

---

## 8. Reglas de Negocio

### 8.1 Identidad y unicidad

| ID | Regla |
|----|-------|
| RN-PRM-001 | Un `ProducerProfile` activo por combinación `documentTypeCode` + `documentNumber` por `organizationId` |
| RN-PRM-002 | `producerNumber` es único legible por organización (autogenerado o manual según config) |
| RN-PRM-003 | Persona jurídica requiere `legalName`, `taxId` y representante legal en contactos |
| RN-PRM-004 | Persona natural requiere nombres, apellidos, tipo y número documento |
| RN-PRM-005 | Asociación/grupo requiere al menos un miembro productor vinculado |

### 8.2 Ciclo de vida

| ID | Regla |
|----|-------|
| RN-PRM-010 | Todo cambio de `lifecycleStatus` genera exactamente un `ProducerLifecycleEvent` inmutable |
| RN-PRM-011 | Solo transiciones definidas en catálogo de transiciones están permitidas |
| RN-PRM-012 | Visita inicial obligatoria antes de pasar a `pending_approval` (configurable por org) |
| RN-PRM-013 | Productor `active` debe tener ≥ 1 finca vinculada activa (configurable) |
| RN-PRM-014 | Retiro (`withdrawn`) requiere cero compras abiertas y workflow gerencia |
| RN-PRM-015 | `archived` es terminal — solo lectura auditoría |

### 8.3 Habilitación operativa downstream

| ID | Regla |
|----|-------|
| RN-PRM-020 | CPE solo permite compra si `lifecycleStatus = active` |
| RN-PRM-021 | CSAE solo permite nuevo contrato si `lifecycleStatus = active` |
| RN-PRM-022 | CSFE bloquea nuevos anticipos si `suspended` (salvo excepción workflow) |
| RN-PRM-023 | CLSE no programa recolección si productor no `active` |
| RN-PRM-024 | Estados `pre_registered`, `registered`, `under_validation` solo permiten completar expediente y visitas |

### 8.4 Datos y validación

| ID | Regla |
|----|-------|
| RN-PRM-030 | Cambio de cuenta bancaria requiere aprobación finanzas |
| RN-PRM-031 | Cambio de titular documento identidad requiere workflow compliance |
| RN-PRM-032 | Teléfono principal debe formato E.164 |
| RN-PRM-033 | Email, si informado, debe ser único por productor |
| RN-PRM-034 | Dirección primaria obligatoria antes de `under_validation` |
| RN-PRM-035 | Foto productor recomendada; obligatoria si política certificación lo exige |

### 8.5 Territorio y fincas

| ID | Regla |
|----|-------|
| RN-PRM-040 | Toda finca vinculada debe tener `ftipFarmUnitId` válido en FTIP |
| RN-PRM-041 | PRM no almacena polígono autoritativo — solo proyección desde FTIP |
| RN-PRM-042 | Desvincular finca requiere cero contratos activos sobre esa finca (CSAE) |
| RN-PRM-043 | Área café ≤ área total finca |

### 8.6 Certificaciones

| ID | Regla |
|----|-------|
| RN-PRM-050 | Certificación vencida cambia estado a `expired` automáticamente |
| RN-PRM-051 | Alerta automática 90, 60 y 30 días antes de `expiresAt` |
| RN-PRM-052 | Certificación a nivel finca hereda elegibilidad a lotes hijos (configurable) |
| RN-PRM-053 | Revocación certificación genera alerta OCC y notificación comprador |

### 8.7 Cartera y segmentación

| ID | Regla |
|----|-------|
| RN-PRM-060 | Un productor tiene máximo un comprador primario activo |
| RN-PRM-061 | Un productor tiene máximo un técnico primario activo |
| RN-PRM-062 | Segmentos dinámicos se recalculan sin eliminar historial membership |
| RN-PRM-063 | Segmento `draft` no afecta políticas comerciales |

### 8.8 Inactividad automática

| ID | Regla |
|----|-------|
| RN-PRM-070 | Sin compra ni visita en N meses (default 24, configurable) → sugerencia `inactive` |
| RN-PRM-071 | Transición a `inactive` automática solo con política org + notificación previa |

### 8.9 Proyección 360°

| ID | Regla |
|----|-------|
| RN-PRM-080 | PRM no duplica transacciones — solo proyecta desde motores fuente |
| RN-PRM-081 | Datos financieros en 360° son lectura; mutación solo en CSFE |
| RN-PRM-082 | `Producer360Projection` se refresca ante eventos CPE, CSFE, CQIE, AITAP, PLM |

---

## 9. Flujo principal — Alta de productor hasta activación

| Paso | Actor | Acción | Resultado |
|------|-------|--------|-----------|
| 1 | Comprador/Técnico | Identifica prospecto en territorio | Lead registrado |
| 2 | Sistema | Verifica duplicados por documento y similitud nombre (DGMP) | Sin conflicto o tarea fusión |
| 3 | Técnico | Captura datos mínimos (+ offline si aplica) | Estado `pre_registered` |
| 4 | Comprador | Completa expediente: identidad, contactos, dirección, tributario | Estado `registered` |
| 5 | Comprador/Técnico | Carga documentos identidad y legal (EDMKP) | Expediente documental |
| 6 | Comprador | Registra datos bancarios referencia pago | Pendiente validación finanzas |
| 7 | Técnico | Vincula finca(s) — crea en FTIP y asocia en PRM | ≥1 finca vinculada |
| 8 | Comprador | Envía a validación | Estado `under_validation` |
| 9 | Supervisor | Revisa documentos y datos | Aprueba o devuelve corrección |
| 10 | Supervisor | Agenda visita inicial (AITAP) | Estado `initial_visit_pending` |
| 11 | Técnico | Ejecuta visita inicial offline/online con formulario y evidencias | Visita `completed` |
| 12 | Supervisor | Revisa acta visita | Estado `pending_approval` |
| 13 | Gerencia | Aprueba alta (workflow si umbral volumen/zona) | Estado `linking` |
| 14 | Sistema | Activa productor | Estado `active`, evento `ProducerActivated` |
| 15 | Sistema | Dispara creación cuenta CSFE, habilita CSAE/CPE | Operación plena |

**Postcondiciones:** Productor activo, finca vinculada, cartera asignada, cuenta financiera creada, timeline inicia.

---

## 10. Flujos alternativos

### FA-PRM-01 — Devolución por documentación incompleta

| Paso | Actor | Acción |
|------|-------|--------|
| FA1.1 | Supervisor | Rechaza validación con motivo y lista de faltantes |
| FA1.2 | Sistema | Estado vuelve a `registered`; notifica comprador/técnico |
| FA1.3 | Comprador | Corrige y reenvía → retoma paso 8 flujo principal |

### FA-PRM-02 — Visita inicial desfavorable

| Paso | Actor | Acción |
|------|-------|--------|
| FA2.1 | Técnico | Registra visita con hallazgos críticos |
| FA2.2 | Supervisor | Decide: plan de mejora o rechazo alta |
| FA2.3a | Si mejora | Productor permanece `registered`; seguimiento AITAP |
| FA2.3b | Si rechazo | Estado `withdrawn` con motivo; fin del flujo |

### FA-PRM-03 — Alta express (política org)

| Paso | Actor | Acción |
|------|-------|--------|
| FA3.1 | Gerencia | Habilita política "alta express" para micro-productor |
| FA3.2 | Sistema | Omite visita inicial si documentación 100% y finca GPS OK |
| FA3.3 | Sistema | Transición directa `under_validation` → `pending_approval` |

### FA-PRM-04 — Reactivación desde inactivo

| Paso | Actor | Acción |
|------|-------|--------|
| FA4.1 | Comprador | Solicita reactivación con justificación |
| FA4.2 | Supervisor | Verifica deuda y certificaciones |
| FA4.3 | Finanzas | Aprueba si saldo pendiente regularizado o plan de pago |
| FA4.4 | Sistema | Estado `active`; evento `ProducerReactivated` |

### FA-PRM-05 — Registro productor jurídico (empresa rural)

| Paso | Actor | Acción |
|------|-------|--------|
| FA5.1 | Comprador | Selecciona tipo jurídica |
| FA5.2 | Comprador | Registra razón social, NIT, representante legal |
| FA5.3 | Comprador | Vincula miembros/asociados del grupo |
| FA5.4 | Sistema | Continúa flujo principal desde paso 5 |

---

## 11. Casos de error

### CE-PRM-01 — Documento duplicado

| Campo | Valor |
|-------|-------|
| **Condición** | Mismo tipo + número documento ya existe en org |
| **Mensaje** | "Ya existe un productor con este documento. Código: {producerNumber}" |
| **Comportamiento** | Bloquea creación; ofrece abrir registro existente o iniciar fusión |
| **Auditoría** | Intento registro duplicado registrado |

### CE-PRM-02 — Transición lifecycle inválida

| Campo | Valor |
|-------|-------|
| **Condición** | Estado destino no permitido desde estado actual |
| **Mensaje** | "No es posible cambiar de {estadoActual} a {estadoDestino}" |
| **Comportamiento** | Operación rechazada |

### CE-PRM-03 — Activación sin finca

| Campo | Valor |
|-------|-------|
| **Condición** | RN-PRM-013 activa y cero fincas vinculadas |
| **Mensaje** | "Debe registrar al menos una finca antes de activar el productor" |
| **Comportamiento** | Bloquea activación |

### CE-PRM-04 — Suspensión con compras abiertas

| Campo | Valor |
|-------|-------|
| **Condición** | Compras en estado pendiente recepción (CPE) |
| **Mensaje** | "Existen compras abiertas. Resuélvalas o anule antes de suspender" |
| **Comportamiento** | Bloquea suspensión o requiere workflow excepción |

### CE-PRM-05 — Sync conflicto versión

| Campo | Valor |
|-------|-------|
| **Condición** | Edición offline con versión inferior a servidor |
| **Mensaje** | "Conflicto de sincronización. Revise cambios en web o contacte supervisor" |
| **Comportamiento** | Marca `syncStatus=conflict`; visible en OCC |

### CE-PRM-06 — Scope territorial denegado

| Campo | Valor |
|-------|-------|
| **Condición** | Técnico intenta editar productor fuera de municipios asignados |
| **Mensaje** | "No tiene permiso para operar en este territorio" |
| **Comportamiento** | HTTP 403 funcional |

### CE-PRM-07 — Certificación sin documento

| Campo | Valor |
|-------|-------|
| **Condición** | Registrar certificación sin PDF adjunto cuando es obligatorio |
| **Mensaje** | "Debe adjuntar certificado escaneado" |
| **Comportamiento** | Bloquea guardado |

---

## 12. Validaciones

### 12.1 Identificación y persona

| Campo | Obligatorio | Validación |
|-------|-------------|------------|
| `producerTypeCode` | Sí | Catálogo `party.legal_person_type` |
| `documentTypeCode` | Sí | Catálogo `party.document_type` |
| `documentNumber` | Sí | Formato según tipo país; único org |
| `legalName` / nombres | Sí | Min 2 caracteres; jurídica: razón social |
| `birthDate` | Natural: según política | Edad ≥ 18 años para titular (configurable) |
| `genderCode` | No | `party.gender` |
| `maritalStatusCode` | No | `party.marital_status` |
| `nationalityCode` | No | `geo.country` |
| `taxId` | Jurídica: Sí | Formato NIT/RUT país |
| `photoRef` | Política org | contentId EDMKP imagen |
| `signatureRef` | No | contentId EDMKP |
| `biometricRef` | Futuro | Consentimiento legal adjunto |

### 12.2 Información tributaria y bancaria

| Campo | Obligatorio | Validación |
|-------|-------------|------------|
| `taxRegimeCode` | Según país | Catálogo `finance.tax_regime` |
| `taxIdVerified` | Alta activa | Verificación manual o integración DIAN (IEL) |
| `bankAccountTypeCode` | Antes de pago | `producer.bank_account_type` |
| `bankCode` | Antes de pago | Catálogo bancos país |
| `accountNumber` | Antes de pago | Validación dígito verificación |
| `accountHolderName` | Sí | Debe coincidir titular o razón social |
| `paymentPreferenceCode` | No | `producer.payment_preference` |

### 12.3 Contacto y comunicación

| Campo | Obligatorio | Validación |
|-------|-------------|------------|
| `primaryPhone` | Sí | E.164 |
| `secondaryPhone` | No | E.164 |
| `email` | No | RFC 5322 |
| `whatsapp` | No | E.164 |
| `emergencyContact` | Recomendado | Nombre + teléfono |
| `socialNetworkHandles` | No | JSON validado: red + handle |

### 12.4 Dirección

| Campo | Obligatorio | Validación |
|-------|-------------|------------|
| `countryCode` | Sí | `geo.country` |
| `departmentCode` | Sí | Jerarquía geo MDE |
| `municipalityCode` | Sí | Pertenece a departamento |
| `veredaCode` | Recomendado | `geo.vereda` |
| `streetAddress` | Sí | Max 500 chars |
| `geoPoint` | Recomendado | Coordenadas WGS84 válidas |
| `altitudeM` | No | -500 a 6000 msnm |

### 12.5 Información familiar y social

| Campo | Obligatorio | Validación |
|-------|-------------|------------|
| `householdSize` | No | Entero ≥ 1 |
| `familyMembers[]` | No | Relación desde `party.relationship_type` |
| `associationMemberships[]` | No | Nombre org + rol `producer.association_role` |

### 12.6 Información agrícola y experiencia

| Campo | Obligatorio | Validación |
|-------|-------------|------------|
| `yearsExperience` | No | 0–80 |
| `producerCategoryCode` | Alta comercial | `producer.category` |
| `leadSourceCode` | No | `producer.lead_source` |
| `educationLevelCode` | No | `party.education_level` |
| `ethnicGroupCode` | No | `party.ethnic_group` |
| `primaryLanguageCode` | No | `party.language` |

### 12.7 Clasificación y estado

| Campo | Obligatorio | Validación |
|-------|-------------|------------|
| `lifecycleStatus` | Sistema | Catálogo estados PRM |
| `categoryCode` | No | `producer.category` |
| `segmentCodes[]` | Sistema | Calculado |
| `tags[]` | No | Max 20 etiquetas; slug único por productor |
| `riskLevel` | Sistema | low / medium / high |

### 12.8 Capacitaciones (registro histórico)

| Campo | Obligatorio | Validación |
|-------|-------------|------------|
| `trainingName` | Sí (si registro) | Texto |
| `trainingDate` | Sí | ≤ hoy |
| `provider` | No | Texto |
| `certificateRef` | No | EDMKP |

---

## 13. Dependencias con otros módulos

| Módulo | Tipo | Descripción funcional |
|--------|------|----------------------|
| **Identity (IDN)** | Obligatoria | Usuarios, roles, scopes territoriales, permisos `producer:*` |
| **MDE** | Obligatoria | Catálogos `producer.*`, `party.*`, `geo.*`, `cert.*` |
| **DGMP** | Obligatoria | Golden record, deduplicación, calidad dato, lineage fusión |
| **FTIP** | Obligatoria | Catastro finca/lote; PRM solo relación y proyección |
| **EDMKP** | Obligatoria | Documentos, fotos, videos, firmas del expediente |
| **Form Engine** | Obligatoria | Formularios visita inicial y actualización datos |
| **Workflow** | Obligatoria | Aprobaciones alta, suspensión, fusión, cambios críticos |
| **Event Engine** | Obligatoria | Publicación y consumo eventos lifecycle y proyección |
| **Sync** | Obligatoria | Pre-registro offline Android |
| **AITAP** | Fuerte | Visitas técnicas; PRM timeline referencia |
| **CSAE** | Consumidor | Valida estado productor; PRM proyecta contratos |
| **CPE** | Consumidor | Valida `active`; PRM proyecta historial compras |
| **CSFE** | Bidireccional | Crea cuenta al activar; PRM proyecta saldos |
| **CQIE** | Consumidor | Alimenta score calidad en indicadores |
| **CITE** | Referencia | Trazabilidad origen productor en lotes |
| **CLSE** | Consumidor | Puntualidad entregas en indicadores |
| **OCC** | Consumidor | Alertas cartera, conflictos sync |
| **AIADP** | Opcional R5 | Scores churn, riesgo, segmentación IA |
| **DPAL** | Opcional | KPIs oficiales reportes ejecutivos |
| **IEL** | Opcional | Validación tributaria externa, DIAN |

---

## 14. Permisos

| Permiso | Descripción | Roles típicos |
|---------|-------------|---------------|
| `producer:create` | Crear productor / pre-registro | field_agent, buyer |
| `producer:read` | Consultar expediente y listados | Todos operativos + viewer |
| `producer:update` | Editar datos no críticos | field_agent, buyer, supervisor |
| `producer:delete` | Soft-delete / archivar | admin |
| `producer:lifecycle` | Cambiar estado lifecycle | supervisor, manager |
| `producer:approve` | Aprobar alta, reactivación | supervisor, manager |
| `producer:assign` | Asignar cartera | supervisor, manager |
| `producer:export` | Exportar listados | manager, admin |
| `producer:admin` | Segmentos, fusión, config | admin, data_steward |
| `farm:read` | Ver fincas vinculadas | Heredado consulta productor |
| `farm:create` | Vincular nueva finca | field_agent, buyer |
| `document:upload` | Subir al expediente | field_agent, buyer |
| `audit:read` | Ver historial cambios | auditor, admin |

**PBAC ejemplo:** `field_agent` solo `producer:update` si `municipalityCode` ∈ UserScope.

---

## 15. Auditoría

| Evento auditado | Datos registrados |
|-----------------|-------------------|
| Creación productor | Usuario, IP, dispositivo, datos iniciales |
| Cambio lifecycle | Estado anterior/nuevo, motivo, aprobador workflow |
| Edición perfil | Diff campo a campo |
| Cambio datos bancarios | Diff enmascarado cuenta |
| Asignación cartera | Anterior/nuevo asignado, vigencia |
| Fusión duplicados | IDs absorbido/sobreviviente, usuario |
| Carga/verificación documento | Tipo, estado verificación |
| Certificación alta/baja | Esquema, vigencia |
| Nota pinned / alerta | Contenido, visibilidad roles |

Retención: según política GECL (mínimo 7 años).

---

## 16. Eventos generados

| Evento | Cuándo | Consumidores clave |
|--------|--------|-------------------|
| `ProducerProspectCreated` | Lead sin datos formales | Comercial, OCC |
| `ProducerPreRegistered` | Sync offline alta mínima | OCC |
| `ProducerRegistered` | Expediente base completo | Workflow |
| `ProducerValidationStarted` | Envío a revisión | Back-office |
| `ProducerInitialVisitScheduled` | Visita agendada | Notification, AITAP |
| `ProducerInitialVisitCompleted` | Visita OK | PLM, PRM |
| `ProducerApproved` | Comité aprueba | PLM |
| `ProducerActivated` | Alta formal | CSAE, CPE, CSFE, OCC |
| `ProducerSuspended` | Suspensión | CPE, CSAE (bloqueo) |
| `ProducerReactivated` | Reactivación | Motores transaccionales |
| `ProducerWithdrawn` | Baja cartera | Todos (cierre operaciones) |
| `ProducerArchived` | Archivo legal | Audit |
| `ProducerFarmLinked` | Finca asociada | FTIP, OCC |
| `ProducerFarmUnlinked` | Finca desvinculada | CSAE validación |
| `ProducerCertificationRegistered` | Nueva cert | CSAE primas |
| `CertificationExpiring` | 90/60/30 días | Notification |
| `CertificationExpired` | Vencimiento | CSAE, CQIE |
| `ProducerAssignmentChanged` | Cambio cartera | Identity, OCC |
| `ProducerSegmentMembershipChanged` | Recálculo segmento | Comercial, DPAL |
| `ProducerRiskScoreUpdated` | IA recalcula | OCC, CSFE |
| `Producer360Refreshed` | Proyección actualizada | Dashboard |
| `ProducerDuplicateDetected` | Match DGMP | Data steward |
| `ProducerMerged` | Fusión completada | DGMP, CPE, CSFE |
| `ProducerCommunicationLogged` | Interacción registrada | Timeline |
| `ProducerNoteAdded` | Nota nueva | Timeline |

---

## 17. Automatizaciones

| ID | Automatización | Disparador | Acción |
|----|----------------|------------|--------|
| AUT-PRM-01 | Alerta certificación por vencer | 90/60/30 días antes expiry | Notificación comprador + técnico |
| AUT-PRM-02 | Sugerencia inactivo | Sin actividad N meses | Tarea supervisor revisar |
| AUT-PRM-03 | Recálculo segmentos | Cron nocturno | Actualizar memberships |
| AUT-PRM-04 | Refresh indicadores | `PurchaseConfirmed`, `VisitCompleted`, etc. | Actualizar `ProducerIndicatorSnapshot` |
| AUT-PRM-05 | Refresh 360° | Eventos dominio relevantes | Actualizar proyección |
| AUT-PRM-06 | Bloqueo prima cert vencida | `CertificationExpired` | Flag en proyección comercial |
| AUT-PRM-07 | Asignación round-robin | Nuevo productor zona sin cartera | Asignar comprador según reglas org |
| AUT-PRM-08 | Tarea visita inicial vencida | SLA días sin visita post-registro | Alerta OCC |

Todas las automatizaciones financieras/legales críticas requieren política GECL publicada.

---

## 18. Integración con IA

| Función | Descripción | Entrada | Salida | Aprobación humana |
|---------|-------------|---------|--------|-------------------|
| Score churn | Probabilidad abandono cartera | Historial compras, visitas, comunicaciones | 0–100 | No — informativo |
| Score riesgo | Riesgo crediticio/compliance | CSFE, certificaciones, NC | low/med/high | No — informativo |
| Valor esperado 12m | Volumen/valor proyectado | Tendencia compras, área cafetal | COP / kg | No |
| Sugerencia segmento | Propone segmentos | Perfil completo | Lista segmentos | Sí — steward confirma |
| Detección duplicado | Entity resolution | Documento, nombre, geo | Match score | Sí — fusión manual |
| Priorización visitas | Ordena visitas pendientes | Segmento, riesgo, cosecha | Ranking | No — sugerencia técnico |
| Anomalía datos | Campos inconsistentes | Perfil vs fincas vs compras | Alertas calidad | Sí — corrección |
| Recomendación reactivación | Productores inactivos recuperables | Patrón histórico | Lista priorizada | No |

Toda inferencia registra `InferenceAuditLog` (GECL/AIADP).

---

## 19. Integración con GIS

| Función | Responsable | PRM |
|---------|-------------|-----|
| Polígono finca | FTIP autoritativo | Muestra proyección; enlace mapa |
| Geocodificación dirección | GIS Engine | Valida municipio/vereda |
| Geocerca visita | GIS + AITAP | Verifica técnico en finca |
| Distancia finca–bodega | GIS | Indicador logístico en 360° |
| Altitud / zona agroclimática | FTIP + MDE | Clasificación productor |
| Captura GPS pre-registro | Android | Point en dirección collection |

PRM **no** edita geometrías — redirige a FTIP.

---

## 20. Integración con Formularios

| Formulario | Uso | Momento |
|------------|-----|---------|
| Registro inicial productor | Captura estructurada alta | `registered` |
| Visita inicial vinculación | Obligatoria lifecycle | `initial_visit_pending` |
| Actualización datos productivos | Cambio área/variedad | Actualización finca |
| Autoevaluación BPA | Certificaciones | Según esquema cert |
| Encuesta satisfacción | Post-visita | Opcional |

Submissions vinculadas a `producerId` y opcionalmente `visitId` (AITAP). PRM muestra en timeline.

---

## 21. Integración con Documentos

| Tipo documento | Momento | Obligatorio |
|----------------|---------|-------------|
| Documento identidad | Validación | Sí |
| RUT / cámara comercio | Jurídica | Sí |
| Certificado bancario | Antes primer pago | Sí |
| Foto productor | Alta | Política org |
| Firma consentimiento datos | Alta | Según ley país |
| Certificados orgánicos/FT | Certificación | Por esquema |
| Contrato marco CSAE | Vinculación | Ref CSAE + PDF EDMKP |
| Acta visita inicial | Visita | Sí |
| Fotos finca | Registro finca | Recomendado |
| Videos entrevista | Opcional | No |

Todos almacenados en EDMKP; PRM mantiene índice `ProducerDocument` con `contentId`.

---

## 22. Integración con Inventario

PRM **no gestiona** stock. Integración de **consulta y trazabilidad**:

| Función | Descripción |
|---------|-------------|
| Origen lote inventario | CITE muestra `producerId` / finca en trazabilidad |
| Vista 360° | Últimas entregas que alimentaron lotes (proyección CPE→CITE) |
| Alerta | Si productor suspendido con lote pendiente clasificación — flag OCC |

---

## 23. Integración con Compras

| Función | Dirección | Descripción |
|---------|-----------|-------------|
| Validación pre-compra | PRM → CPE | CPE consulta `lifecycleStatus` debe ser `active` |
| Historial compras | CPE → PRM | Proyección en 360° y `HarvestRecord.deliveredKg` |
| Última actividad | CPE → PRM | Actualiza `lastActivityAt` |
| Indicadores volumen | CPE → PRM | `volumeKgYtd`, frecuencia compra |
| Bloqueo compra | PRM → CPE | `suspended`/`withdrawn` rechaza nueva compra |

---

## 24. Integración con Calidad

| Función | Dirección | Descripción |
|---------|-----------|-------------|
| Score calidad productor | CQIE → PRM | Promedio dictámenes en `qualityScore` |
| Historial por entrega | CQIE → PRM | Timeline y 360° |
| Alerta hallazgo crítico visita | AITAP/CQIE → PRM | Nota tipo `alert` en expediente |
| Bloqueo prima | CQIE → PRM → CSAE | NC graves afectan segmento comercial |

---

## 25. Integración con Contratos

| Función | Dirección | Descripción |
|---------|-----------|-------------|
| Elegibilidad contrato | PRM → CSAE | Solo `active` |
| Cupos y contratos activos | CSAE → PRM | `activeContractsCount` en 360° |
| Cumplimiento cupo | CSAE + CPE → PRM | `complianceRate` indicador |
| Certificación requerida | PRM → CSAE | Valida cert vigente para esquema contrato |
| Desvinculación finca | PRM → CSAE | Valida sin cupo activo en finca |

---

## 26. Integración con Android Offline

| Operación | Offline | Sync |
|-----------|---------|------|
| Pre-registro productor | Sí | Push outbox; idempotencia `externalId` |
| Completar expediente | Parcial | Campos críticos pueden requerir online |
| Captura foto/firma | Sí | Cola media → EDMKP → register |
| Vincular finca inicial | Sí | Coordenada GPS + datos; FTIP sync |
| Consultar cartera asignada | Sí | Cache última sync |
| Cambio lifecycle | No | Requiere online + workflow |
| Aprobaciones | No | Solo web |

**Orden sync:** refresh token → media → producer push → pull eventos → refresh catálogos MDE.

**Conflictos:** LWW en campos no críticos; servidor gana en documento/banco/estado lifecycle.

---

## 27. Modelo de datos funcional

### 27.1 Entidad principal: ProducerProfile

| Campo | Tipo funcional | Obligatorio | Descripción |
|-------|----------------|-------------|-------------|
| producerId | UUID | Sí | Identificador único |
| organizationId | UUID | Sí | Tenant |
| producerNumber | Texto | Sí | Código humano único org |
| producerTypeCode | Catálogo | Sí | natural / jurídica / asociación |
| legalName | Texto | Sí | Nombre legal o razón social |
| commercialName | Texto | No | Nombre comercial |
| firstName / lastName | Texto | Natural | Nombres desglosados |
| documentTypeCode | Catálogo | Sí | Tipo documento |
| documentNumber | Texto | Sí | Número documento |
| taxId | Texto | Jurídica | NIT/RUT |
| birthDate | Fecha | Política | Fecha nacimiento |
| genderCode | Catálogo | No | Género |
| maritalStatusCode | Catálogo | No | Estado civil |
| nationalityCode | Catálogo | No | Nacionalidad |
| primaryLanguageCode | Catálogo | No | Idioma preferido |
| educationLevelCode | Catálogo | No | Nivel educativo |
| ethnicGroupCode | Catálogo | No | Grupo étnico |
| lifecycleStatus | Enum | Sí | Estado ciclo de vida |
| categoryCode | Catálogo | No | Categoría comercial |
| leadSourceCode | Catálogo | No | Origen captación |
| yearsExperience | Número | No | Años experiencia caficultor |
| photoContentId | Ref EDMKP | Política | Fotografía |
| signatureContentId | Ref EDMKP | No | Firma |
| biometricRef | Ref segura | Futuro | Huella/biometría |
| taxRegimeCode | Catálogo | Política | Régimen tributario |
| defaultBankAccountRef | Ref CSFE | Pago | Cuenta bancaria autoritativa CSFE |
| paymentPreferenceCode | Catálogo | No | Preferencia pago |
| assignedBuyerId | Ref User | No | Comprador cartera |
| assignedTechnicianId | Ref User | No | Técnico extensión |
| riskScore | 0–100 | Sistema | IA/DGMP |
| qualityScore | 0–100 | Sistema | CQIE |
| lifetimeValueScore | Número | Sistema | IA |
| registeredAt | Fecha | Sistema | Primer registro |
| activatedAt | Fecha | Sistema | Activación |
| lastActivityAt | Fecha | Sistema | Última operación |
| lastVisitAt | Fecha | Sistema | Última visita AITAP |
| notes | Texto largo | No | Observaciones permanentes |
| tags | Lista texto | No | Etiquetas libres |
| metadata | JSON extensible | No | Metadata Engine |
| goldenRecordVersion | Entero | Sistema | Versión DGMP |
| version | Entero | Sí | Optimistic lock |
| externalId | UUID | No | Cliente offline |
| syncStatus | Enum | Sistema | synced/pending/conflict |

### 27.2 Entidades relacionadas (resumen)

| Entidad | Relación con ProducerProfile |
|---------|-------------------------------|
| ProducerLifecycleEvent | 1:N transiciones estado |
| ProducerContact | 1:N contactos |
| ProducerAddress | 1:N direcciones |
| ProducerFamily + FamilyMember | 1:1 / 1:N familia |
| ProducerSocialProfile | 1:1 social |
| AssociationMembership | 1:N cooperativas |
| ProducerFarmLink | 1:N ref FTIP fincas |
| ProducerCertification | 1:N certificaciones |
| ProducerDocument | 1:N índice documental |
| ProducerCommunication | 1:N interacciones |
| ProducerAssignment | 1:N historial cartera |
| ProducerNote | 1:N notas |
| ProducerTrainingRecord | 1:N capacitaciones |
| HarvestRecord | 1:N por lote/campaña |
| ProducerSegmentMembership | N:M segmentos |
| ProducerIndicatorSnapshot | 1:N histórico scores |
| Producer360Projection | 1:1 vista consolidada |
| FieldVisitRef | 1:N ref AITAP visitas |

### 27.3 Relaciones con otros dominios (vista 360°)

| Relación | Cardinalidad | Tipo |
|----------|--------------|------|
| Productor ↔ Fincas (FTIP) | 1:N | Vinculación PRM + ref territorial |
| Productor ↔ Contratos (CSAE) | 1:N | Proyección |
| Productor ↔ Compras (CPE) | 1:N | Proyección |
| Productor ↔ Liquidaciones (CSFE) | 1:N | Proyección |
| Productor ↔ Calidad (CQIE) | 1:N | Proyección |
| Productor ↔ Visitas (AITAP) | 1:N | Referencia |
| Productor ↔ Formularios | 1:N | Submissions Form Engine |
| Productor ↔ Documentos (EDMKP) | 1:N | contentId |
| Productor ↔ Pagos (CSFE) | 1:N | Proyección |
| Productor ↔ Auditorías | 1:N | Audit + lifecycle events |
| Productor ↔ Alertas (OCC) | 1:N | Consumidor |
| Productor ↔ Tareas Workflow | 1:N | Instancias workflow |
| Productor ↔ Cronograma visitas | 1:N | AITAP agenda |

---

## 28. API funcional

**Base path:** `/api/v1/prm`

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/producers` | `producer:read` | Listar con filtros y paginación |
| POST | `/producers` | `producer:create` | Crear productor |
| GET | `/producers/:id` | `producer:read` | Detalle perfil |
| PATCH | `/producers/:id` | `producer:update` | Actualizar datos |
| DELETE | `/producers/:id` | `producer:delete` | Archivar (soft) |
| POST | `/producers/:id/lifecycle` | `producer:lifecycle` | Transición estado |
| GET | `/producers/:id/timeline` | `producer:read` | Timeline unificada |
| GET | `/producers/:id/360` | `producer:read` | Vista consolidada |
| GET | `/producers/:id/indicators` | `producer:read` | Scores e indicadores |
| POST | `/producers/:id/contacts` | `producer:update` | Agregar contacto |
| PATCH | `/producers/:id/contacts/:contactId` | `producer:update` | Editar contacto |
| POST | `/producers/:id/addresses` | `producer:update` | Agregar dirección |
| POST | `/producers/:id/farms` | `farm:create` | Vincular finca (FTIP) |
| DELETE | `/producers/:id/farms/:farmLinkId` | `farm:update` | Desvincular finca |
| POST | `/producers/:id/certifications` | `producer:update` | Registrar certificación |
| POST | `/producers/:id/documents` | `document:upload` | Índice documento EDMKP |
| POST | `/producers/:id/communications` | `producer:update` | Registrar comunicación |
| POST | `/producers/:id/notes` | `producer:update` | Agregar nota |
| POST | `/producers/:id/assignments` | `producer:assign` | Asignar cartera |
| GET | `/producers/:id/assignments` | `producer:read` | Historial asignaciones |
| POST | `/producers/merge` | `producer:admin` | Fusionar duplicados |
| GET | `/producers/check-duplicate` | `producer:read` | Verificar documento |
| GET | `/segments` | `producer:read` | Listar segmentos |
| POST | `/segments` | `producer:admin` | Crear segmento |
| POST | `/segments/:id/recalculate` | `producer:admin` | Recalcular membresía |
| GET | `/segments/:id/producers` | `producer:read` | Productores del segmento |
| POST | `/producers/sync` | `producer:create` | Batch sync Android |

**Errores estándar:** 400 validación, 403 permiso/scope, 404 no existe, 409 duplicado/conflicto versión, 422 regla negocio.

---

## 29. Interfaz (especificación funcional — sin diseño gráfico)

### 29.1 Pantallas Web

| ID | Pantalla | Descripción |
|----|----------|-------------|
| UI-PRM-01 | Listado productores | Tabla paginada, filtros, export |
| UI-PRM-02 | Expediente 360° | Pestañas: perfil, fincas, comercial, financiero, calidad, visitas, documentos, timeline |
| UI-PRM-03 | Formulario crear/editar | Wizard o formulario por secciones |
| UI-PRM-04 | Transición lifecycle | Modal motivo + adjuntos |
| UI-PRM-05 | Asignación cartera | Modal comprador/técnico/vigencia |
| UI-PRM-06 | Certificaciones | Listado + alta/edición |
| UI-PRM-07 | Segmentos | Admin reglas segmentación |
| UI-PRM-08 | Fusión duplicados | Comparación lado a lado |
| UI-PRM-09 | Dashboard KPIs cartera | Widgets indicadores |
| UI-PRM-10 | Mapa cartera | Productores georreferenciados (proyección FTIP) |

### 29.2 Elementos comunes listado (UI-PRM-01)

**Filtros:** estado lifecycle, municipio, vereda, comprador asignado, técnico, segmento, categoría, certificación, texto libre (nombre/documento/código).

**Columnas:** código, nombre, documento, municipio, estado, comprador, técnico, última actividad, score calidad.

**Acciones:** ver 360°, editar, cambiar estado (según permiso), exportar selección.

---

## 30. Android (especificación funcional)

| ID | Pantalla | Offline |
|----|----------|---------|
| AND-PRM-01 | Lista mi cartera | Cache sync |
| AND-PRM-02 | Pre-registro rápido | Sí |
| AND-PRM-03 | Expediente resumido | Lectura cache |
| AND-PRM-04 | Editar contacto/dirección | Sí push |
| AND-PRM-05 | Captura foto productor | Sí media queue |
| AND-PRM-06 | Captura firma | Sí PNG local |
| AND-PRM-07 | Vincular finca GPS | Sí + FTIP sync |

**GPS:** obligatorio en dirección collection y vinculación finca; validar precisión ≤ 50 m (configurable).

**Fotografías:** compresión JPEG; metadata EXIF/GPS preservada en EDMKP.

**Video:** opcional entrevista productor; cola upload; límite duración configurable org.

---

## 31. Reportes

| ID | Reporte | Descripción | Filtros |
|----|---------|-------------|---------|
| REP-PRM-01 | Padrón productores | Listado completo campos clave | Estado, zona, campaña |
| REP-PRM-02 | Altas por periodo | Productores activados en rango fechas | Fecha, zona, comprador |
| REP-PRM-03 | Productores por estado lifecycle | Conteo y listado | Estado |
| REP-PRM-04 | Cartera por comprador | Asignación y volumen YTD | Comprador, campaña |
| REP-PRM-05 | Cartera por técnico | Cobertura extensión | Técnico, municipio |
| REP-PRM-06 | Certificaciones por vencer | 90/60/30 días | Esquema, zona |
| REP-PRM-07 | Segmento productores | Miembros segmento | Segmento |
| REP-PRM-08 | Productores sin visita | SLA incumplido | Días, técnico |
| REP-PRM-09 | Productores inactivos | Sin actividad N meses | Umbral, zona |
| REP-PRM-10 | Expediente documental | Checklist docs por productor | Estado KYC |
| REP-PRM-11 | Historial lifecycle | Transiciones periodo | Fecha, motivo |
| REP-PRM-12 | Duplicados detectados | Pendientes fusión | Score match |
| REP-PRM-13 | Productores por categoría | Micro/pequeño/mediano | Categoría, zona |
| REP-PRM-14 | Asociaciones y cooperativas | Membresías activas | Tipo org |
| REP-PRM-15 | Mapa productivo export | Coordenadas + área | Municipio |
| REP-PRM-16 | Comparativo campañas | Altas/bajas YoY | Campaña |
| REP-PRM-17 | Riesgo cartera | Distribución risk score | Segmento |
| REP-PRM-18 | Cumplimiento documental | % expediente completo | Supervisor |

Formatos: PDF, Excel, CSV según permiso `producer:export`.

---

## 32. KPIs

| ID | KPI | Definición | Fórmula conceptual |
|----|-----|------------|-------------------|
| KPI-PRM-01 | Productores activos | Count estado `active` | COUNT lifecycle=active |
| KPI-PRM-02 | Tasa activación | % prospectos que llegan a activo | Activados / Registrados periodo |
| KPI-PRM-03 | Tiempo medio alta | Días prospecto → activo | AVG(activatedAt - registeredAt) |
| KPI-PRM-04 | Cobertura técnica | % activos con visita últimos 12m | Con visita / activos |
| KPI-PRM-05 | Productores por técnico | Carga cartera extensión | COUNT por assignedTechnicianId |
| KPI-PRM-06 | Productores por comprador | Carga cartera comercial | COUNT por assignedBuyerId |
| KPI-PRM-07 | % expediente completo | Documentos KYC completos | Completos / activos |
| KPI-PRM-08 | Certificaciones vigentes | % activos con cert válida | Con cert / activos |
| KPI-PRM-09 | Tasa suspensión | Suspensiones / activos periodo | COUNT suspended / activos |
| KPI-PRM-10 | Tasa churn | Retiros / activos inicio periodo | Withdrawn / base |
| KPI-PRM-11 | Productores nuevos mes | Altas periodo | COUNT nuevos |
| KPI-PRM-12 | Promedio fincas por productor | Territorio | AVG farm count |
| KPI-PRM-13 | Área café total cartera | Suma ha | SUM coffeeAreaHa |
| KPI-PRM-14 | Score calidad promedio | Cartera | AVG qualityScore |
| KPI-PRM-15 | % productores riesgo alto | Riesgo | COUNT risk high / activos |
| KPI-PRM-16 | Pre-registros pendientes sync | Offline | COUNT syncStatus=pending |
| KPI-PRM-17 | Conflictos sync abiertos | Calidad dato campo | COUNT conflict |
| KPI-PRM-18 | Cumplimiento visita inicial | % activos con visita inicial OK | OK / activados |
| KPI-PRM-19 | Densidad productores municipio | Concentración | COUNT por municipio |
| KPI-PRM-20 | Valor cartera esperado 12m | IA | SUM expectedValue12m |

KPIs oficiales registrados en DPAL Metrics Engine.

---

## 33. Escalabilidad

### 33.1 Millones de productores

| Aspecto | Requisito funcional |
|---------|---------------------|
| Listados | Paginación obligatoria; búsqueda indexada por documento, código, nombre |
| 360° | Proyección materializada — no cálculo en tiempo real |
| Segmentos | Recálculo batch incremental por zona |
| Timeline | Últimos N eventos en vista; histórico completo bajo demanda |
| Archivados | Tier almacenamiento; consulta auditoría sin degradar OLTP |

### 33.2 Multiempresa (multi-tenant)

- Aislamiento estricto por `organizationId`
- Catálogos globales plataforma + extensión por org (MDE)
- KPIs y reportes nunca cruzan tenants
- Asignación cartera solo usuarios misma org

### 33.3 Multipaís

| Aspecto | Comportamiento |
|---------|----------------|
| Tipos documento | Catálogo por país (`party.document_type`) |
| Validación NIT/RUT | Reglas por `geo.country` |
| Campos obligatorios | Perfil país en Metadata Engine org.settings |
| Idioma UI | Locale usuario; datos en idioma captura |
| Moneda indicadores | Moneda org en proyección financiera |

### 33.4 Multi-commodity (futuro)

- `ProducerProfile` agnóstico commodity
- Atributos específicos café en `metadata` o extensión EPF `agro.coffee.producer`
- Lifecycle y reglas core permanecen; reglas café en capa dominio

---

## 34. Pruebas

### 34.1 Funcionales

| ID | Escenario |
|----|-----------|
| TF-PRM-01 | Alta completa prospecto → activo happy path |
| TF-PRM-02 | Pre-registro offline → sync → sin duplicado |
| TF-PRM-03 | Rechazo documentación → corrección → reenvío |
| TF-PRM-04 | Suspensión bloquea compra CPE |
| TF-PRM-05 | Reactivación con deuda pendiente → workflow finanzas |
| TF-PRM-06 | Asignación cartera filtra listado comprador |
| TF-PRM-07 | Certificación vencida genera alerta |
| TF-PRM-08 | Vista 360 muestra datos proyectados correctos |
| TF-PRM-09 | Fusión duplicados migra referencias |
| TF-PRM-10 | PBAC bloquea edición fuera de municipio scope |

### 34.2 Integración

| ID | Escenario |
|----|-----------|
| TI-PRM-01 | `ProducerActivated` crea cuenta CSFE |
| TI-PRM-02 | CPE rechaza compra productor `suspended` |
| TI-PRM-03 | CSAE valida cert antes de contrato orgánico |
| TI-PRM-04 | Evento CPE actualiza `lastActivityAt` y volumen |
| TI-PRM-05 | Visita AITAP completada aparece en timeline |
| TI-PRM-06 | Finca FTIP vinculada visible en expediente |
| TI-PRM-07 | Documento EDMKP indexado en ProducerDocument |

### 34.3 Carga

| ID | Escenario | Criterio |
|----|-----------|----------|
| TC-PRM-01 | Listado 100k productores paginado | p95 < 500 ms |
| TC-PRM-02 | 500 sync batch Android | Sin duplicados |
| TC-PRM-03 | Recálculo segmento 50k miembros | < 30 min batch |

### 34.4 Seguridad

| ID | Escenario |
|----|-----------|
| TS-PRM-01 | Cross-tenant acceso productor ajeno → 403/404 |
| TS-PRM-02 | Viewer intenta cambiar lifecycle → 403 |
| TS-PRM-03 | Export sin permiso → 403 |
| TS-PRM-04 | Datos bancarios enmascarados en audit log |

---

## 35. Definición de Done

- [ ] Todas las historias US-PRM-* críticas y altas implementadas y aceptadas por PO
- [ ] Reglas RN-PRM-* validadas en pruebas
- [ ] API `/api/v1/prm/*` documentada en Swagger
- [ ] Integraciones CPE, CSAE, CSFE, FTIP, AITAP, EDMKP verificadas (TI-PRM-*)
- [ ] Offline pre-registro Android operativo
- [ ] Auditoría lifecycle completa
- [ ] Reportes REP-PRM-01 a 05 disponibles
- [ ] KPIs KPI-PRM-01 a 10 en dashboard
- [ ] Sin regresión módulos dependientes
- [ ] Demo script actualizado

---

## 36. Futuras Mejoras

| ID | Mejora | Release tentativo |
|----|--------|-------------------|
| FM-PRM-01 | Portal productor self-service | R5+ |
| FM-PRM-02 | Biometría huella en Android | R5 |
| FM-PRM-03 | Campañas comunicación masiva segmentada | R5 |
| FM-PRM-04 | Chat WhatsApp integrado IEL | R5 |
| FM-PRM-05 | Score productivo satélite NDVI en indicadores | R5 |
| FM-PRM-06 | Grupos productores contrato colectivo | R2 CSAE |
| FM-PRM-07 | QR expediente para auditor certificadora | R4 |
| FM-PRM-08 | Recomendación IA priorización visitas en app | R5 AIADP |

---

## Control de cambios

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.0 | 2026-07-02 | Emisión inicial especificación funcional PRM |

---

## Aprobaciones

| Rol | Nombre | Fecha |
|-----|--------|-------|
| Product Owner | Pendiente | |
| Analista funcional | Pendiente | |
| Tech Lead | Pendiente | |
| QA Lead | Pendiente | |

---

**Fin — Especificación Funcional PRM v1.0**
