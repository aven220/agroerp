# Especificación Funcional — Commercial Agreement Engine

| Campo | Valor |
|-------|-------|
| **Código módulo** | CAE |
| **Alias arquitectónico (dominio café)** | CSAE — `COFFEE_SUPPLY_AGREEMENT_ENGINE.md` |
| **Nombre comercial** | Acuerdos Comerciales y Cupos |
| **Nombre arquitectónico** | Commercial Agreement Engine |
| **Versión documento** | 1.0 |
| **Estado** | Aprobado para implementación |
| **Product Owner** | AGROERP Product |
| **Release objetivo** | R2 — Commercial Chain |
| **Documentos referencia** | `COFFEE_SUPPLY_AGREEMENT_ENGINE.md`, `COFFEE_DOMAIN.md`, `PRM_FUNCTIONAL_SPEC.md`, `FTIP_FUNCTIONAL_SPEC.md`, `CPE` (pendiente spec), `AGROERP_MASTER_SPECIFICATION.md` |

---

## 1. Objetivo del módulo

Administrar **todos los acuerdos comerciales** entre la empresa y los productores (y terceros abastecedores): contratos, cupos, compromisos de entrega, entregas parciales, saldos, vencimientos, modificaciones y trazabilidad completa.

CAE es el **motor comercial oficial de abastecimiento** de AGROERP. Ninguna compra (CPE) puede consumir volumen sin validación de cupo CAE, salvo excepción documentada vía Workflow. Un acuerdo es un **contrato vivo** con ledger de cupo auditable que gobierna cada kilo comprometido y entregado.

---

## 2. Alcance

| # | Funcionalidad incluida |
|---|------------------------|
| A-01 | Tipos de acuerdo configurables: compra, cupo, abierto, cosecha, calidad, volumen, especial, institucional |
| A-02 | Ciclo de vida completo: borrador → aprobación → firma → activo → cierre |
| A-03 | Motor de cupos (ledger): comprometido, entregado, pendiente, disponible, reservado, bloqueado |
| A-04 | Entregas parciales ilimitadas vinculadas a compras CPE |
| A-05 | Jerarquía cupos: productor → finca → lote → cosecha → período |
| A-06 | Adendas, prórrogas, renovaciones con historial inmutable |
| A-07 | Precios fijos/variables, primas, descuentos contractuales |
| A-08 | Condiciones de calidad y certificación en alcance |
| A-09 | Alertas configurables: umbrales cupo, vencimiento, incumplimiento |
| A-10 | Workflow aprobaciones multinivel |
| A-11 | Integración PRM, FTIP, FMDT, CPE, CITE, CQIE, CSFE, USFP, EDMKP |
| A-12 | Android offline: consulta cupo, registro entrega, firmas |
| A-13 | IA: predicción cumplimiento, riesgo, renovación, abastecimiento |
| A-14 | Reportes y KPIs comerciales |
| A-15 | Multi-tenant, multi-país, multi-commodity |

---

## 3. Exclusiones

| # | Exclusión | Módulo responsable |
|---|-----------|-------------------|
| E-01 | Ejecución compra en campo (pesaje, recepción) | CPE |
| E-02 | Liquidación y pago | CSFE |
| E-03 | Stock físico bodega | CITE |
| E-04 | Dictamen calidad laboratorio | CQIE |
| E-05 | Lifecycle productor | PRM |
| E-06 | Geometría territorial | FTIP |
| E-07 | Contratos venta a clientes exportación | Futuro módulo ventas |
| E-08 | Generación PDF legal (plantilla) | EDMKP + templates |
| E-09 | Diseño UI | Fuera de esta especificación |

---

## 4. Actores

### 4.1 Comprador / Negociador comercial

| Campo | Valor |
|-------|-------|
| **Rol** | `buyer` |
| **Responsabilidades** | Crear borradores, negociar, registrar entregas, consultar cupos |
| **Permisos** | `agreement:create`, `agreement:read`, `quota:read` |

### 4.2 Supervisor comercial

| Campo | Valor |
|-------|-------|
| **Rol** | `supervisor` |
| **Responsabilidades** | Aprobar acuerdos, adendas, excepciones sobrecupo |
| **Permisos** | `agreement:approve`, `agreement:update` |

### 4.3 Gerente comercial / Abastecimiento

| Campo | Valor |
|-------|-------|
| **Rol** | `manager` |
| **Responsabilidades** | Aprobaciones alto umbral, KPIs, políticas cupo |
| **Permisos** | `agreement:approve`, `report:read`, `agreement:admin` |

### 4.4 Legal / Cumplimiento

| Campo | Valor |
|-------|-------|
| **Rol** | `legal` |
| **Responsabilidades** | Revisar acuerdos especiales, cancelaciones |
| **Permisos** | `agreement:read`, `agreement:approve` |

### 4.5 Administrador comercial

| Campo | Valor |
|-------|-------|
| **Rol** | `admin`, `commercial_admin` |
| **Responsabilidades** | Tipos acuerdo, umbrales alertas, plantillas |
| **Permisos** | `agreement:admin` |

### 4.6 Auditor

| Campo | Valor |
|-------|-------|
| **Rol** | `auditor` |
| **Responsabilidades** | Trazabilidad cupo, movimientos, modificaciones |
| **Permisos** | `agreement:read`, `audit:read` |

### 4.7 Productor (futuro portal)

| Campo | Valor |
|-------|-------|
| **Rol** | `producer` |
| **Responsabilidades** | Consultar acuerdos propios, firmar |
| **Permisos** | `agreement:read` (propios) |

### 4.8 Visualizador

| Campo | Valor |
|-------|-------|
| **Rol** | `viewer` |
| **Responsabilidades** | Consulta reportes |
| **Permisos** | `agreement:read` |

---

## 5. Roles involucrados (sistema)

| Rol slug | Uso CAE |
|----------|---------|
| `buyer` | Negociación y operación |
| `supervisor` | Aprobación operativa |
| `manager` | Aprobación estratégica |
| `legal` | Acuerdos especiales |
| `commercial_admin` | Configuración |
| `auditor` | Auditoría |
| `viewer` | Consulta |

---

## 6. Historias de Usuario

### US-CAE-001 — Crear acuerdo de compra con cupo

| Campo | Contenido |
|-------|-----------|
| **Como** | comprador |
| **Quiero** | crear acuerdo cerrado 20.000 kg con productor activo |
| **Para** | formalizar compromiso de abastecimiento campaña |
| **Prioridad** | Crítica |

**Criterios de aceptación:**
- [ ] Requiere productor PRM `active`
- [ ] Estado inicial `borrador`
- [ ] QuotaNode raíz con `initialQuota`

---

### US-CAE-002 — Aprobar y activar acuerdo

| Campo | Contenido |
|-------|-----------|
| **Como** | supervisor |
| **Quiero** | aprobar acuerdo y activarlo tras firmas |
| **Para** | habilitar compras CPE contra cupo |
| **Prioridad** | Crítica |

**Criterios de aceptación:**
- [ ] Workflow `agreement.create`
- [ ] Estado `activo` tras firmas
- [ ] Evento `AgreementActivated`

---

### US-CAE-003 — Registrar entrega parcial (compra)

| Campo | Contenido |
|-------|-----------|
| **Como** | sistema CPE |
| **Quiero** | descontar 1.500 kg del cupo al confirmar compra |
| **Para** | mantener saldo actualizado |
| **Prioridad** | Crítica |

**Criterios de aceptación:**
- [ ] QuotaMovement `consumption`
- [ ] Actualiza % ejecutado
- [ ] Vincula `purchaseId`

---

### US-CAE-004 — Alerta cupo 80% consumido

| Campo | Contenido |
|-------|-----------|
| **Como** | gerente |
| **Quiero** | alerta cuando quede 20% del cupo |
| **Para** | planificar renovación o cierre |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] Umbral configurable `quota.alert.thresholds`
- [ ] Notificación OCC + comprador

---

### US-CAE-005 — Adenda ampliación cupo

| Campo | Contenido |
|-------|-----------|
| **Como** | comprador |
| **Quiero** | adenda +5.000 kg con aprobación gerencia |
| **Para** | atender mayor producción del productor |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] AgreementAmendment tipo `quota_change`
- [ ] Historial before/after inmutable

---

### US-CAE-006 — Bloquear sobrecupo sin autorización

| Campo | Contenido |
|-------|-----------|
| **Como** | sistema |
| **Quiero** | rechazar compra que excede saldo |
| **Para** | control comercial |
| **Prioridad** | Crítica |

**Criterios de aceptación:**
- [ ] RN-CAE-001 bloqueo default
- [ ] Workflow excepción `agreement.exception.overdraw`

---

### US-CAE-007 — Consultar cupo offline Android

| Campo | Contenido |
|-------|-----------|
| **Como** | comprador campo |
| **Quiero** | ver saldo disponible sin internet |
| **Para** | negociar entrega en finca |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] Cache cupos cartera sync
- [ ] Indicador última actualización

---

### US-CAE-008 — Acuerdo por finca y lote

| Campo | Contenido |
|-------|-----------|
| **Como** | comprador |
| **Quiero** | sub-cupos por finca FTIP y lote FMDT |
| **Para** | trazabilidad L2 |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] Jerarquía QuotaNode
- [ ] Σ sub-cupos ≤ padre

---

### US-CAE-009 — Suspender acuerdo por incumplimiento

| Campo | Contenido |
|-------|-----------|
| **Como** | supervisor |
| **Quiero** | suspender acuerdo activo |
| **Para** | bloquear nuevas compras |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] Estado `suspendido`
- [ ] CPE rechaza nuevas compras

---

### US-CAE-010 — Renovar acuerdo vencido

| Campo | Contenido |
|-------|-----------|
| **Como** | comprador |
| **Quiero** | crear renovación vinculada al anterior |
| **Para** | continuidad comercial |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] `parentAgreementId`
- [ ] Workflow `agreement.renew`

---

### US-CAE-011 — IA riesgo incumplimiento

| Campo | Contenido |
|-------|-----------|
| **Como** | gerente |
| **Quiero** | score riesgo por productor/acuerdo |
| **Para** | priorizar seguimiento |
| **Prioridad** | Media |

**Criterios de aceptación:**
- [ ] AIADP score en expediente acuerdo
- [ ] Alerta si riesgo alto

---

### US-CAE-012 — Reporte cumplimiento por comprador

| Campo | Contenido |
|-------|-----------|
| **Como** | gerente |
| **Quiero** | % cupo ejecutado por comprador y región |
| **Para** | evaluar desempeño comercial |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] CAE-RPT-09

---

## 7. Casos de Uso

| ID | Caso de uso | Actor | Resultado |
|----|-------------|-------|-----------|
| CU-CAE-01 | Crear acuerdo borrador | Comprador | SupplyAgreement draft |
| CU-CAE-02 | Enviar a aprobación | Comprador | Workflow iniciado |
| CU-CAE-03 | Aprobar acuerdo | Supervisor | pendiente_firma |
| CU-CAE-04 | Registrar firmas | Legal/Productor | activo |
| CU-CAE-05 | Validar cupo pre-compra | CPE | OK / QUOTA_EXCEEDED |
| CU-CAE-06 | Consumir cupo recepción | Sistema | QuotaMovement |
| CU-CAE-07 | Crear adenda precio | Comprador | Amendment |
| CU-CAE-08 | Prorrogar vigencia | Supervisor | effectiveTo extendido |
| CU-CAE-09 | Suspender acuerdo | Supervisor | suspendido |
| CU-CAE-10 | Cancelar acuerdo | Gerente | cancelado |
| CU-CAE-11 | Renovar acuerdo | Comprador | Nuevo agreement |
| CU-CAE-12 | Transferir cupo entre fincas | Admin | transfer movements |
| CU-CAE-13 | Reservar cupo orden compra | CPE | reservation |
| CU-CAE-14 | Liberar reserva expirada | Sistema | TTL job |
| CU-CAE-15 | Finalizar por cupo agotado | Sistema | finalizado |

---

## 8. Reglas de Negocio

### 8.1 Cupo y entregas

| ID | Regla |
|----|-------|
| RN-CAE-001 | No permitir entrega/compra > saldo disponible sin workflow excepción (configurable) |
| RN-CAE-002 | Sobrecupo solo con aprobación `agreement.exception.overdraw` |
| RN-CAE-003 | `available = initial + ampliaciones − consumos − reservas − bloqueos` |
| RN-CAE-004 | Entrega parcial crea QuotaMovement `consumption` vinculado a `purchaseId` |
| RN-CAE-005 | Entregas parciales ilimitadas si `partialDeliveriesAllowed=true` |
| RN-CAE-006 | Σ sub-cupos ≤ cupo padre (salvo acuerdo abierto raíz) |
| RN-CAE-007 | Reserva expira en `reservationTtlHours` (default 72h) |
| RN-CAE-008 | 100% consumo → `finalizado` automático si política org |

### 8.2 Vigencia y estados

| ID | Regla |
|----|-------|
| RN-CAE-010 | Solo `activo` permite compras (salvo política `en_modificacion`) |
| RN-CAE-011 | Vencimiento `effectiveTo` → `vencido`; bloqueo según `expired.purchase.policy` |
| RN-CAE-012 | Suspensión manual bloquea consumo inmediato |
| RN-CAE-013 | Cancelación requiere workflow; no delete físico |
| RN-CAE-014 | Renovación crea nuevo acuerdo; anterior → `archivado` o `renovado` |
| RN-CAE-015 | Prórroga solo vía adenda `extension` aprobada |

### 8.3 Modificaciones

| ID | Regla |
|----|-------|
| RN-CAE-020 | Modificar cupo solo vía adenda aprobada |
| RN-CAE-021 | Historial modificaciones inmutable |
| RN-CAE-022 | Ampliación > `maxExpansionPercent` requiere gerencia |
| RN-CAE-023 | Reducción no deja `consumed > newInitial` sin proceso especial |

### 8.4 Validaciones pre-compra

| ID | Regla |
|----|-------|
| RN-CAE-030 | Productor PRM debe estar `active` |
| RN-CAE-031 | Finca/lote en scope debe estar activo FTIP/FMDT |
| RN-CAE-032 | Certificación requerida vigente en scope |
| RN-CAE-033 | Calidad CPE dentro tolerancia contractual o workflow disputa |
| RN-CAE-034 | Precio dentro banda PEM o alerta |

### 8.5 Alertas

| ID | Regla |
|----|-------|
| RN-CAE-040 | Umbrales cupo % restante configurables (default 20, 10, 5) |
| RN-CAE-041 | Alerta vencimiento N días antes (default 30, 15, 7) |
| RN-CAE-042 | Alerta incumplimiento entregas programadas |
| RN-CAE-043 | Alerta sobrecupo intentado |

---

## 9. Flujo principal — Crear, aprobar y primera entrega

| Paso | Actor | Acción | Resultado |
|------|-------|--------|-----------|
| 1 | Comprador | Crea SupplyAgreement borrador con tipo y cupo | `borrador` |
| 2 | Comprador | Define partes, vigencia, precio, alcance finca/lote | Schema válido |
| 3 | Comprador | Adjunta documentos EDMKP | AgreementDocument |
| 4 | Comprador | Envía a aprobación | `pendiente_aprobacion` |
| 5 | Supervisor | Aprueba workflow | `pendiente_firma` |
| 6 | Productor/Empresa | Firma contrato | signatures OK |
| 7 | Sistema | Activa acuerdo; asigna cupo inicial | `activo`, QuotaMovement initial |
| 8 | CPE | Valida cupo pre-compra | reservation |
| 9 | CPE | Confirma recepción compra | consumption |
| 10 | Sistema | Actualiza saldo, % ejecutado, alertas | QuotaMovement audit |
| 11 | Sistema | Si umbral → OCC alerta | Notificación |

---

## 10. Flujos alternativos

### FA-CAE-01 — Acuerdo abierto sin tope

| Paso | Acción |
|------|--------|
| FA1.1 | Tipo `open` sin `committedQuantity` |
| FA1.2 | Solo control precio y condiciones |
| FA1.3 | Consumos registrados sin límite volumen |

### FA-CAE-02 — Excepción sobrecupo

| Paso | Acción |
|------|--------|
| FA2.1 | CPE intenta compra > available |
| FA2.2 | Workflow `agreement.exception.overdraw` |
| FA2.3 | Gerencia aprueba → consumption con flag overdraw |

### FA-CAE-03 — Adenda en acuerdo activo

| Paso | Acción |
|------|--------|
| FA3.1 | Estado `en_modificacion` (opcional) |
| FA3.2 | Amendment aprobada |
| FA3.3 | QuotaMovement expansion/reduction |

### FA-CAE-04 — Renovación post-vencimiento

| Paso | Acción |
|------|--------|
| FA4.1 | Acuerdo `vencido` |
| FA4.2 | Nuevo acuerdo con parentAgreementId |
| FA4.3 | Cupo remanente política: transferir o cerrar |

---

## 11. Casos de error

| ID | Condición | Mensaje | Comportamiento |
|----|-----------|---------|----------------|
| CE-CAE-01 | Productor no activo | "Productor no habilitado para acuerdos" | Rechaza |
| CE-CAE-02 | Cupo insuficiente | "Saldo disponible {n} {uom}" | Bloquea CPE |
| CE-CAE-03 | Acuerdo no activo | "Acuerdo no vigente" | Bloquea compra |
| CE-CAE-04 | Acuerdo vencido | "Acuerdo vencido el {date}" | Bloquea según política |
| CE-CAE-05 | Sub-cupo excede padre | "Sub-cupo supera cupo padre" | Rechaza guardado |
| CE-CAE-06 | Entrega < mínimo | "Entrega inferior al mínimo contractual" | Workflow |
| CE-CAE-07 | Certificación faltante | "Certificación {cert} requerida" | Bloquea |
| CE-CAE-08 | Sin firma | "Firmas incompletas" | No activa |
| CE-CAE-09 | Adenda rechazada | Vuelve borrador amendment | |
| CE-CAE-10 | Finca fuera scope | "Finca no incluida en acuerdo" | Bloquea CPE |

---

## 12. Validaciones

### 12.1 Tipos de acuerdo

| Tipo | Código | Cupo | Uso |
|------|--------|------|-----|
| Contrato compra cerrado | `purchase.closed` | Fijo | Firme volumen |
| Cupo entrega | `quota.delivery` | Fijo | Compromiso entregas |
| Acuerdo abierto | `open.framework` | Sin tope | Marco precio |
| Por cosecha | `harvest.window` | Por ventana | Estacional |
| Por calidad | `quality.tiered` | Fijo | Perfil taza |
| Por volumen | `volume.tiered` | Escalonado | Tramos kg |
| Especial | `special` | Configurable | Workflow gerencial |
| Convenio institucional | `institutional` | Convenio | Cooperativa, ONG |

Plantillas café: ver `COFFEE_SUPPLY_AGREEMENT_ENGINE.md` §2.3 (`coffee.supply.*`).

### 12.2 Información del acuerdo (SupplyAgreement)

| Campo | Obligatorio | Validación |
|-------|-------------|------------|
| agreementId | Sistema | UUID |
| agreementNumber | Sí | Consecutivo único org |
| agreementCode | Sí | Código humano único |
| agreementTypeCode | Sí | `trade.contract_type` |
| producerId | Sí | PRM active |
| companyEntityId | Sí | Entidad legal org |
| buyerUserId | Recomendado | User comprador |
| createdAt | Sistema | |
| effectiveFrom / effectiveTo | Sí | to ≥ from |
| status | Sí | Enum §13 |
| campaignCode | Sí | `trade.campaign` |
| committedQuantity | Según tipo | > 0 si cerrado |
| uomCode | Sí | kg, arroba, ton, lb |
| presentationCode | Sí | cereza, pergamino, oro |
| priceTypeCode | Sí | fijo, variable, escalonado |
| currencyCode | Sí | |
| partialDeliveriesAllowed | Sí | default true |
| observations | No | |
| documents[] | Según tipo | EDMKP refs |
| farmUnitId / fieldLotId | Condicional | FTIP/FMDT scope |
| requiredCertifications | No | Array certs |
| expectedQualityProfile | No | CQIE |

### 12.3 Control de cupos (QuotaNode)

| Campo | Descripción |
|-------|-------------|
| initialQuota | Cantidad comprometida |
| consumedQuota | Cantidad entregada (Σ consumptions) |
| reservedQuota | Órdenes pendientes recepción |
| blockedQuota | Bloqueado disputa |
| availableQuota | Calculado |
| pendingQuota | committed − delivered (alias) |
| executedPct | delivered / committed × 100 |
| remainingPct | 100 − executedPct |
| status | active, exhausted, suspended, closed |

### 12.4 Entrega parcial (QuotaMovement consumption)

| Campo | Obligatorio |
|-------|-------------|
| quantity | Sí |
| purchaseId | Sí (CPE) |
| quotaNodeId | Sí |
| occurredAt | Sí |
| balanceAfter | Sistema |
| correlationId | Trazabilidad |

---

## 13. Estados del acuerdo

| Estado | Permite compra | Descripción |
|--------|---------------|-------------|
| `borrador` | No | Elaboración |
| `pendiente_aprobacion` | No | Workflow |
| `pendiente_firma` | No | Firmas |
| `activo` | Sí | Operativo |
| `suspendido` | No | Pausado |
| `en_modificacion` | Configurable | Adenda en curso |
| `finalizado` | No | Cupo cumplido |
| `vencido` | Política | Pasó effectiveTo |
| `cancelado` | No | Anulado |
| `archivado` | No | Histórico |

---

## 14. Dependencias

| Módulo | Relación |
|--------|----------|
| **PRM** | Consume — productor, estado, cartera |
| **FTIP** | Consume — finca, lote territorial, cert geo |
| **FMDT** | Consume — lote operativo, producción |
| **CPE** | Bidireccional — validación y consumo cupo |
| **CITE** | Consume — confirmación volumen recepcionado |
| **CQIE** | Consume — validación calidad contractual |
| **CSFE** | Bidireccional — precio acuerdo, liquidación |
| **USFP** | Formularios negociación/contrato |
| **EDMKP** | Documentos, firmas, PDF contrato |
| **Workflow** | Aprobaciones |
| **Event Engine** | Eventos dominio |
| **Notification/OCC** | Alertas |
| **GTIP** | Mapa alcance contractual |
| **AIADP** | Riesgo, predicción |
| **MDE** | Catálogos trade.* |

---

## 15. Permisos

| Permiso | Descripción | Roles |
|---------|-------------|-------|
| `agreement:read` | Consultar acuerdos | Operativos |
| `agreement:create` | Crear borrador | buyer |
| `agreement:update` | Editar borrador | buyer, supervisor |
| `agreement:approve` | Aprobar/adenda | supervisor, manager |
| `agreement:delete` | Cancelar/archivar | manager, admin |
| `agreement:admin` | Tipos, políticas | commercial_admin |
| `quota:read` | Ver saldos | buyer+ |
| `quota:adjust` | Ajuste manual aprobado | manager |
| `agreement:export` | Reportes | manager, auditor |

Alias master spec: `contract:*`

---

## 16. Auditoría

| Evento | Datos |
|--------|-------|
| CRUD SupplyAgreement | Diff completo |
| Transición estado | before/after |
| QuotaMovement | Todos los campos |
| Amendment aplicada | diff estructurado |
| Excepción sobrecupo | Aprobador, motivo |
| Firma registrada | contentId, timestamp |
| Validación CPE fallida | agreementId, qty, error |

---

## 17. Eventos generados

| Evento | Cuándo |
|--------|--------|
| `AgreementCreated` | Alta borrador |
| `AgreementSubmittedForApproval` | Workflow |
| `AgreementApproved` | Aprobación |
| `AgreementSigned` | Firmas completas |
| `AgreementActivated` | activo |
| `AgreementSuspended` / `Reactivated` | |
| `AgreementAmendmentApplied` | Adenda |
| `AgreementRenewed` | Renovación |
| `AgreementCancelled` | Cancelación |
| `AgreementExpired` | Vencimiento |
| `AgreementFinalized` | Cupo agotado |
| `QuotaAllocated` | Cupo inicial |
| `QuotaReserved` | Reserva CPE |
| `QuotaConsumed` | Entrega/compra |
| `QuotaReleased` | Liberación reserva |
| `QuotaThresholdReached` | Umbral alerta |
| `QuotaExceededAttempt` | Intento sobrecupo |

Namespace: `agreement.*` + `coffee.agreement.*`

---

## 18. Automatizaciones

| ID | Disparador | Acción |
|----|------------|--------|
| AUT-CAE-01 | Consumo ≥ 80/90/95% | Alerta OCC configurable |
| AUT-CAE-02 | effectiveTo − N días | Alerta vencimiento |
| AUT-CAE-03 | Reserva TTL expirada | Liberar cupo |
| AUT-CAE-04 | 100% consumido | Estado finalizado |
| AUT-CAE-05 | Acuerdo vencido | Bloqueo compras + alerta |
| AUT-CAE-06 | Incumplimiento entrega | Flag PRM riesgo |
| AUT-CAE-07 | Certificación vence | Alerta renovación contrato |
| AUT-CAE-08 | Renovación sugerida IA | Tarea comprador |
| AUT-CAE-09 | Cupo agotado finca | Notificar ampliación |
| AUT-CAE-10 | Cierre campaña | Cerrar nodos período |

---

## 19. Integración IA

| Función | Entrada | Salida |
|---------|---------|--------|
| Predicción cumplimiento | Histórico entregas, clima | % prob. cumplir |
| Riesgo incumplimiento | Productor, visitas, calidad | Risk score |
| Recomendación renovación | Vencimiento, desempeño | Sugerir renovar |
| Productores estratégicos | Volumen, calidad, lealtad | Ranking |
| Proyección abastecimiento | Cupos activos, cosecha | kg esperados región |
| Alertas tempranas | Patrón entregas tardías | OCC |

---

## 20. Integración Productores (PRM)

| Función | Descripción |
|---------|-------------|
| Elegibilidad | Solo productor `active` |
| Expediente 360° | Lista acuerdos activos |
| Indicadores | complianceRate, activeContractsCount |
| Suspensión productor | Suspende acuerdos según política |
| Cartera comprador | Filtro assignedBuyerId |

---

## 21. Integración Fincas y Lotes (FTIP / FMDT)

| Función | Descripción |
|---------|-------------|
| Scope contractual | farmUnitId, fieldLotId en acuerdo |
| Sub-cupos | QuotaNode por finca/lote |
| Validación compra | CPE finca/lote en scope |
| Certificación geo | FTIP TerritoryCertification |
| GTIP capa | Visualización alcance |

---

## 22. Integración Compras (CPE)

| Función | Descripción |
|---------|-------------|
| Pre-validación | `validatePurchase(agreementId, qty)` |
| Reserva | Al confirmar orden |
| Consumo | Al `PurchaseConfirmed` / recepción |
| Vinculación | purchaseId en QuotaMovement |
| Bloqueo | Sin acuerdo activo si política org |
| Precio | PEM resuelve precio contractual |

---

## 23. Integración Inventario (CITE)

| Función | Descripción |
|---------|-------------|
| Confirmación volumen | Recepción dispara consumption definitivo |
| Trazabilidad | Lote inventario → acuerdo origen |

---

## 24. Integración Calidad (CQIE)

| Función | Descripción |
|---------|-------------|
| Validación contractual | minCupScore, humedad, defectos |
| Disputa | NC fuera tolerancia → workflow |
| Prima calidad | PEM bonificación |

---

## 25. Integración Liquidaciones y Pagos (CSFE)

| Función | Descripción |
|---------|-------------|
| Precio acuerdo | Base liquidación |
| Anticipos | vs cupo pendiente |
| Estado pago | Proyección acuerdo |

---

## 26. Integración Documental (EDMKP)

| Función | Descripción |
|---------|-------------|
| Contrato PDF | Generado desde plantilla |
| Anexos adenda | AgreementDocument |
| Firmas | signatureContentId |
| Evidencias | Fotos negociación |

---

## 27. Integración Formularios (USFP)

| Función | Descripción |
|---------|-------------|
| Formulario negociación | Pre-llena borrador acuerdo |
| Checklist cumplimiento | Vinculado agreementId |
| Firma productor | USFP signature → CAE |

---

## 28. Integración Workflow

| workflowKey | Uso |
|-------------|-----|
| `agreement.create` | Alta |
| `agreement.modify` | Adenda |
| `agreement.renew` | Renovación |
| `agreement.cancel` | Cancelación |
| `agreement.exception.overdraw` | Sobrecupo |

---

## 29. Integración Notificaciones y Auditoría

- Notification Engine: alertas cupo, vencimiento, incumplimiento
- OCC: proyección AgreementAlertProjection
- Audit Engine: diff automático todos los cambios

---

## 30. Modelo de datos funcional

### 30.1 SupplyAgreement

| Campo | Tipo | Descripción |
|-------|------|-------------|
| agreementId | UUID | PK |
| organizationId | UUID | Tenant |
| agreementNumber | Texto | Consecutivo |
| agreementCode | Texto | Código único |
| agreementTypeCode | Catálogo | Tipo |
| commodityCode | Catálogo | coffee, cacao… |
| producerId | Ref PRM | Titular |
| companyEntityId | Ref | Empresa compradora |
| buyerUserId | Ref User | Responsable |
| campaignCode | Catálogo | Campaña |
| effectiveFrom / effectiveTo | Fecha | Vigencia |
| signedAt | Fecha | Firma |
| status | Enum | §13 |
| committedQuantity | Decimal | Comprometido total |
| deliveredQuantity | Calculado | Entregado |
| pendingQuantity | Calculado | Pendiente |
| uomCode | Catálogo | Unidad |
| presentationCode | Catálogo | Presentación café |
| priceTypeCode | Catálogo | Precio |
| basePrice | Money | |
| currencyCode | Catálogo | |
| priceFormula | Expresión | Si variable |
| paymentTermCode | Catálogo | |
| farmUnitId / fieldLotId | Ref | Alcance |
| partialDeliveriesAllowed | Bool | |
| minDeliverySize / maxDeliverySize | Decimal | |
| requiredCertifications | Array | |
| expectedQualityProfile | Catálogo | |
| parentAgreementId | Ref | Renovación |
| version | Entero | Lock |
| observations | Texto | |
| tags | Array | |
| metadata | JSON | |

### 30.2 QuotaNode

| Campo | Descripción |
|-------|-------------|
| quotaNodeId | UUID |
| agreementId | FK |
| parentQuotaNodeId | Jerarquía |
| scopeType | producer, farm, lot, harvest, period |
| scopeResourceId | ID entidad |
| initialQuota | Comprometido |
| consumedQuota | Entregado |
| reservedQuota | Reservado |
| blockedQuota | Bloqueado |
| availableQuota | Disponible |
| executedPct / remainingPct | Calculados |
| status | active, exhausted, suspended, closed |

### 30.3 QuotaMovement (ledger)

| Campo | Descripción |
|-------|-------------|
| movementId | UUID |
| quotaNodeId | FK |
| movementType | initial_allocation, consumption, reservation, expansion, etc. |
| quantity | Cantidad |
| balanceAfter | Saldo |
| referenceType | purchase, amendment, manual |
| referenceId | purchaseId, amendmentId |
| purchaseId | CPE |
| reason | |
| approvedBy | Si excepción |
| occurredAt | |

### 30.4 AgreementAmendment

| Campo | Descripción |
|-------|-------------|
| amendmentId | UUID |
| agreementId | FK |
| amendmentNumber | Secuencial |
| amendmentType | quota_change, price_change, extension, scope_change |
| effectiveFrom | |
| diff | JSON before/after |
| status | borrador → aplicada |
| documentIds | EDMKP |

### 30.5 DeliverySchedule (opcional planificado)

| Campo | Descripción |
|-------|-------------|
| scheduleId | UUID |
| agreementId | |
| plannedDate | |
| plannedQuantity | |
| actualQuantity | Calculado |
| status | pending, fulfilled, overdue |

### 30.6 AgreementDocument

| Campo | Descripción |
|-------|-------------|
| documentId | Índice CAE |
| agreementId | |
| documentTypeCode | contrato, adenda, firma, anexo |
| contentId | EDMKP |

### 30.7 AgreementAlertProjection

| Campo | Descripción |
|-------|-------------|
| projectionId | |
| agreementId | |
| alertType | threshold, expiry, breach |
| triggeredAt | |
| acknowledgedAt | |

---

## 31. API funcional

**Base path:** `/api/v1/csae` (superficie CAE / CSAE)

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/agreements` | `agreement:read` | Listar con filtros |
| POST | `/agreements` | `agreement:create` | Crear borrador |
| GET | `/agreements/:id` | `agreement:read` | Detalle |
| PATCH | `/agreements/:id` | `agreement:update` | Editar borrador |
| POST | `/agreements/:id/submit` | `agreement:update` | Enviar aprobación |
| POST | `/agreements/:id/activate` | `agreement:approve` | Activar post-firma |
| POST | `/agreements/:id/suspend` | `agreement:approve` | Suspender |
| POST | `/agreements/:id/cancel` | `agreement:delete` | Cancelar |
| POST | `/agreements/:id/renew` | `agreement:create` | Renovación |
| GET | `/agreements/:id/quota` | `quota:read` | Árbol cupos |
| GET | `/agreements/:id/movements` | `quota:read` | Ledger |
| POST | `/agreements/:id/amendments` | `agreement:update` | Crear adenda |
| POST | `/amendments/:id/apply` | `agreement:approve` | Aplicar |
| POST | `/quota/validate` | `quota:read` | Pre-check CPE |
| POST | `/quota/reserve` | `agreement:update` | Reservar |
| POST | `/quota/consume` | Sistema/CPE | Consumir |
| POST | `/quota/release` | `agreement:update` | Liberar reserva |
| POST | `/quota/adjust` | `quota:adjust` | Ajuste manual |
| GET | `/campaigns` | `agreement:read` | Campañas |
| GET | `/price-lists` | `agreement:read` | Referencias precio |
| POST | `/internal/procurement/validate` | Interno CPE | Validación cupo |
| POST | `/agreements/sync` | `agreement:read` | Batch Android |
| GET | `/reports/:reportCode` | `agreement:export` | CAE-RPT-* |

---

## 32. Interfaz (especificación funcional — sin diseño gráfico)

| ID | Pantalla | Descripción |
|----|----------|-------------|
| UI-CAE-01 | Listado acuerdos | Filtros estado, comprador, campaña |
| UI-CAE-02 | Detalle acuerdo | Pestañas cupo, precio, docs, timeline |
| UI-CAE-03 | Wizard crear acuerdo | Tipo, partes, cupo, vigencia |
| UI-CAE-04 | Árbol cupos | Jerarquía productor/finca/lote |
| UI-CAE-05 | Ledger movimientos | Tabla auditable |
| UI-CAE-06 | Adenda | Diff before/after |
| UI-CAE-07 | Aprobación workflow | Cola pendientes |
| UI-CAE-08 | Dashboard comercial | KPIs cupo, vencimientos |
| UI-CAE-09 | Mapa alcance | GTIP overlay scope |
| UI-CAE-10 | Simulador cupo | ¿Qué pasa si compro X kg? |

---

## 33. Android (especificación funcional)

| ID | Flujo | Offline |
|----|-------|---------|
| AND-CAE-01 | Consultar acuerdos cartera | Cache sync |
| AND-CAE-02 | Ver saldo cupo productor | Cache |
| AND-CAE-03 | Registrar intención entrega | Borrador sync |
| AND-CAE-04 | Captura firma productor | Sí → EDMKP |
| AND-CAE-05 | Fotos/documentos negociación | Cola media |
| AND-CAE-06 | Pre-acuerdo borrador campo | Sync activación web |
| AND-CAE-07 | Alertas cupo bajo | Push al sync |

---

## 34. Reportes

| ID | Reporte | Descripción |
|----|---------|-------------|
| CAE-RPT-01 | Acuerdos vigentes | Lista activos |
| CAE-RPT-02 | Acuerdos vencidos | Por período |
| CAE-RPT-03 | Cupos disponibles | Saldo por acuerdo |
| CAE-RPT-04 | Cupos agotados | finalizado/exhausted |
| CAE-RPT-05 | Productores próximos completar | 90%+ ejecutado |
| CAE-RPT-06 | Productores incumplidos | Entregas atrasadas |
| CAE-RPT-07 | Entregas por período | kg por fecha |
| CAE-RPT-08 | Cumplimiento por comprador | % ejecutado |
| CAE-RPT-09 | Cumplimiento por región | Municipio/zona |
| CAE-RPT-10 | Cumplimiento por empresa | Entidad legal |
| CAE-RPT-11 | Movimientos cupo | Ledger export |
| CAE-RPT-12 | Adendas período | Historial cambios |
| CAE-RPT-13 | Acuerdos por vencer | 30/15/7 días |
| CAE-RPT-14 | Sobrecupos excepción | Aprobados |
| CAE-RPT-15 | Precio promedio acuerdo | Por zona |
| CAE-RPT-16 | Contratos sin entrega | 0% ejecutado |
| CAE-RPT-17 | Renovaciones pendientes | Vencidos sin renovar |
| CAE-RPT-18 | Ranking productores volumen | Top N |
| CAE-RPT-19 | Proyección cierre campaña | kg pendiente |
| CAE-RPT-20 | Auditoría trazabilidad | Acuerdo → compras |

---

## 35. KPIs

| ID | KPI | Fórmula conceptual |
|----|-----|-------------------|
| KPI-CAE-01 | Cumplimiento acuerdos % | delivered / committed |
| KPI-CAE-02 | Cupos utilizados | SUM consumed |
| KPI-CAE-03 | Cupos pendientes | SUM available |
| KPI-CAE-04 | Productores con acuerdo activo | COUNT DISTINCT producer |
| KPI-CAE-05 | Tiempo medio cumplimiento | AVG días 0→100% |
| KPI-CAE-06 | Acuerdos vencidos | COUNT status=vencido |
| KPI-CAE-07 | Acuerdos renovados | COUNT renewed / vencidos |
| KPI-CAE-08 | Cumplimiento por comprador | AVG % por buyerUserId |
| KPI-CAE-09 | Tasa sobrecupo | Intentos excepción / compras |
| KPI-CAE-10 | Valor comprometido | SUM committed × price |
| KPI-CAE-11 | Valor entregado YTD | SUM consumed × price |
| KPI-CAE-12 | Acuerdos activos | COUNT activo |
| KPI-CAE-13 | % cupo agotado | exhausted / total nodos |
| KPI-CAE-14 | Entregas parciales promedio | AVG # per agreement |
| KPI-CAE-15 | Incumplimientos | COUNT breach flags |
| KPI-CAE-16 | Días promedio vencimiento | AVG effectiveTo − hoy |
| KPI-CAE-17 | Adendas por acuerdo | AVG amendments |
| KPI-CAE-18 | Cobertura productores activos | con acuerdo / activos PRM |
| KPI-CAE-19 | Riesgo incumplimiento alto | COUNT risk high |
| KPI-CAE-20 | Proyección abastecimiento 90d | IA kg esperados |

### 35.1 Alertas configurables

| ID | Alerta | Default configurable |
|----|--------|---------------------|
| CAE-ALT-01 | Cupo restante 20% | `quota.alert.thresholds` |
| CAE-ALT-02 | Cupo restante 10% | idem |
| CAE-ALT-03 | Cupo restante 5% | idem |
| CAE-ALT-04 | Vence en X días | `agreement.expiry.warning.days` |
| CAE-ALT-05 | Sobrecupo intentado | |
| CAE-ALT-06 | Incumplimiento entrega | |
| CAE-ALT-07 | Reserva por expirar | TTL |
| CAE-ALT-08 | Certificación contrato | |
| CAE-ALT-09 | Riesgo IA alto | |
| CAE-ALT-10 | Sin entregas en período | |

---

## 36. Escalabilidad

### 36.1 Millones de acuerdos

| Aspecto | Requisito |
|---------|-----------|
| Agreements | Particionado org + campaña |
| QuotaMovement | Ledger append-only; archivo histórico |
| Listados | Paginación; índice producerId, status |
| Validación CPE | Cache saldo QuotaNode materializado |
| Reportes | DPAL async |

### 36.2 Multiempresa

- Aislamiento `organizationId`
- Políticas cupo por org
- Numeración consecutiva por org

### 36.3 Multipaís

- Moneda, UOM, TRM por país
- Plantillas acuerdo por jurisdicción
- Catálogos trade.* por geo.country

### 36.4 Multicultivo

- `commodityCode` en SupplyAgreement
- Plantillas extensibles Metadata Engine
- Motor cupo agnóstico UOM

---

## 37. Pruebas

### 37.1 Funcionales

| ID | Escenario |
|----|-----------|
| TF-CAE-01 | Crear → aprobar → activar → consumir happy path |
| TF-CAE-02 | Entrega parcial actualiza saldo |
| TF-CAE-03 | Múltiples entregas hasta agotar |
| TF-CAE-04 | Bloqueo sobrecupo sin excepción |
| TF-CAE-05 | Excepción sobrecupo aprobada |
| TF-CAE-06 | Adenda ampliación cupo |
| TF-CAE-07 | Vencimiento bloquea compra |
| TF-CAE-08 | Suspensión bloquea CPE |
| TF-CAE-09 | Jerarquía sub-cupos consumo rollup |
| TF-CAE-10 | Renovación vincula parent |

### 37.2 Integración

| ID | Escenario |
|----|-----------|
| TI-CAE-01 | CPE validate → reserve → consume |
| TI-CAE-02 | Productor suspended rechaza acuerdo nuevo |
| TI-CAE-03 | PRM 360 muestra acuerdos |
| TI-CAE-04 | Alerta OCC umbral 80% |
| TI-CAE-05 | CSFE precio desde acuerdo |

### 37.3 Carga

| ID | Escenario | Criterio |
|----|-----------|----------|
| TC-CAE-01 | 500k acuerdos list | p95 < 500ms |
| TC-CAE-02 | 100 consumos concurrentes mismo cupo | Sin saldo negativo |
| TC-CAE-03 | Ledger 10M movimientos query | Archivo OK |

---

## 38. Definición de Done

- [ ] US-CAE-001 a 008 críticas/altas aceptadas PO
- [ ] RN-CAE-001 a 043 validadas
- [ ] API `/api/v1/csae/*` Swagger
- [ ] Quota ledger completo con auditoría
- [ ] Integración CPE validate/consume (TI-CAE-01)
- [ ] Workflow aprobaciones acuerdo y adenda
- [ ] Alertas CAE-ALT-01 a 05 configurables
- [ ] Android consulta cupo offline
- [ ] Reportes CAE-RPT-01 a 10
- [ ] KPIs KPI-CAE-01 a 12 dashboard

---

## 39. Futuras Mejoras

| ID | Mejora | Release |
|----|--------|---------|
| FM-CAE-01 | Contratos venta exportación | R5 |
| FM-CAE-02 | Hedging precio commodity | R5 |
| FM-CAE-03 | Marketplace cupos entre orgs | R5+ |
| FM-CAE-04 | Smart contracts blockchain | R5 |
| FM-CAE-05 | Portal productor self-service | R5 |
| FM-CAE-06 | CTRM integración bolsa | R5 IEL |

---

## Control de cambios

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.0 | 2026-07-02 | Emisión inicial especificación funcional CAE |

---

## Aprobaciones

| Rol | Nombre | Fecha |
|-----|--------|-------|
| Product Owner | AGROERP Product | 2026-07-02 |
| Arquitectura | AGROERP Architecture | Pendiente revisión |
| Desarrollo Lead | — | Pendiente |
| QA Lead | — | Pendiente |

---

*Fin del documento — CAE v1.0*
