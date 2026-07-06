# AGROERP — Plantilla Oficial de Especificación Funcional

**Documento:** FUNCTIONAL SPECIFICATION TEMPLATE  
**Versión plantilla:** 1.0  
**Estado:** Oficial — Contrato Product Owner ↔ Desarrollo  
**Fecha:** 2026-07-02  
**Uso:** Copiar este archivo por cada módulo como `docs/functional/{CODIGO}_FUNCTIONAL_SPEC.md`

---

## Instrucciones de uso

1. Duplicar esta plantilla: `cp FUNCTIONAL_SPECIFICATION_TEMPLATE.md functional/{CODIGO}_FUNCTIONAL_SPEC.md`
2. Reemplazar todos los campos entre corchetes `[...]`
3. Eliminar bloques de ayuda *(texto en cursiva entre paréntesis)* antes de marcar como **Aprobado**
4. Toda historia debe ser **INVEST** (Independiente, Negociable, Valiosa, Estimable, Pequeña, Comprobable)
5. Toda regla de negocio lleva ID único: `RN-{CODIGO}-{NNN}`
6. Estados del documento: `Borrador` → `En revisión` → `Aprobado` → `Obsoleto`
7. No incluir código ni decisiones arquitectónicas — solo comportamiento funcional acordado

### Registro de módulos (códigos oficiales)

| Código | Módulo |
|--------|--------|
| CORE | Platform Core |
| IDN | Identity Engine |
| EVT | Event Engine |
| RES | Resource Engine |
| META | Metadata Engine |
| FORM | Dynamic Form Engine |
| WF | Workflow Engine |
| AUD | Audit Engine |
| SYNC | Sync Foundation |
| GIS | GIS Engine |
| WEB | Web ERP Portal |
| MDE | Master Data Engine |
| DGMP | Data Governance Platform |
| PRM | Producer Relationship Management |
| FTIP | Farm & Territory Intelligence |
| CSAE | Coffee Supply Agreement Engine |
| CPE | Coffee Procurement Engine |
| CQIE | Coffee Quality Intelligence |
| CITE | Coffee Inventory & Traceability |
| CSFE | Coffee Settlement & Financial |
| CLSE | Coffee Logistics & Supply Chain |
| AITAP | Agronomic Intelligence & Technical Assistance |
| EDMKP | Enterprise Document Media & Knowledge |
| OCC | Operations Command Center |
| EPF | Extension & Plugin Framework |
| GECL | Governance & Enterprise Control |
| IEL | Integration & Ecosystem Layer |
| DPAL | Data Platform & Analytics |
| AIADP | Agro Intelligence Automation & Decision |
| AND | Android Field Application |

---

# Especificación Funcional — [NOMBRE DEL MÓDULO]

| Campo | Valor |
|-------|-------|
| **Código módulo** | [CODIGO] |
| **Versión documento** | [1.0] |
| **Estado** | [Borrador / En revisión / Aprobado] |
| **Product Owner** | [Nombre] |
| **Analista funcional** | [Nombre] |
| **Última actualización** | [YYYY-MM-DD] |
| **Release objetivo** | [R0 / R1 / R2 / …] |
| **Documentos referencia** | [COFFEE_DOMAIN.md, {ENGINE}.md, MASTER_SPEC] |

---

## 1. Información General

### 1.1 Nombre del módulo

[Nombre completo en español]

### 1.2 Código

[CODIGO] — ej. `PRM`, `CPE`, `CITE`

### 1.3 Objetivo

*(Un párrafo. Qué problema de negocio resuelve y para quién.)*

[Describir el objetivo del módulo en términos de negocio, no técnicos.]

### 1.4 Descripción

*(2–4 párrafos. Qué hace el módulo en el día a día operativo.)*

[Descripción funcional del módulo dentro del ecosistema AGROERP.]

### 1.5 Alcance

| # | Funcionalidad incluida | Notas |
|---|----------------------|-------|
| A-01 | [Funcionalidad] | [Notas] |
| A-02 | [Funcionalidad] | [Notas] |
| A-03 | [Funcionalidad] | [Notas] |

### 1.6 Exclusiones

| # | Exclusión | Motivo / Módulo responsable |
|---|-----------|----------------------------|
| E-01 | [Qué NO hace este módulo] | [Ej. Liquidación → CSFE] |
| E-02 | [Qué NO hace este módulo] | [Motivo] |

### 1.7 Dependencias

| Dependencia | Tipo | Descripción |
|-------------|------|-------------|
| [Módulo / sistema] | Obligatoria / Opcional | [Qué capacidad requiere] |
| [Módulo / sistema] | Obligatoria / Opcional | [Qué capacidad requiere] |

---

## 2. Actores

*(Documentar todos los actores que interactúan con este módulo.)*

### Actor 2.1 — [Nombre del actor]

| Campo | Descripción |
|-------|-------------|
| **Nombre** | [Ej. Comprador / Agente de compra] |
| **Rol** | [Slug rol sistema: `buyer`] |
| **Responsabilidades** | • [Responsabilidad 1]<br>• [Responsabilidad 2]<br>• [Responsabilidad 3] |
| **Permisos** | `[recurso:acción]`, `[recurso:acción]`, … |

### Actor 2.2 — [Nombre del actor]

| Campo | Descripción |
|-------|-------------|
| **Nombre** | [ ] |
| **Rol** | [ ] |
| **Responsabilidades** | • [ ] |
| **Permisos** | [ ] |

*(Duplicar subsección Actor 2.N por cada actor adicional.)*

---

## 3. Historias de Usuario

*(Prioridad: **Crítica** | **Alta** | **Media** | **Baja**)*

### US-[CODIGO]-001 — [Título corto]

| Campo | Contenido |
|-------|-----------|
| **Como** | [rol / actor] |
| **Quiero** | [acción concreta] |
| **Para** | [beneficio de negocio] |
| **Prioridad** | [Crítica / Alta / Media / Baja] |

**Criterios de aceptación:**

- [ ] [Criterio 1 — observable y verificable]
- [ ] [Criterio 2]
- [ ] [Criterio 3]
- [ ] [Criterio N]

---

### US-[CODIGO]-002 — [Título corto]

| Campo | Contenido |
|-------|-----------|
| **Como** | [ ] |
| **Quiero** | [ ] |
| **Para** | [ ] |
| **Prioridad** | [ ] |

**Criterios de aceptación:**

- [ ] [ ]
- [ ] [ ]

*(Duplicar bloque US-[CODIGO]-NNN por cada historia.)*

---

## 4. Reglas de Negocio

*(Documentar **todas** las reglas. Formato obligatorio por regla.)*

| ID | Regla | Descripción | Disparador | Acción si incumple |
|----|-------|-------------|------------|-------------------|
| RN-[CODIGO]-001 | [Nombre corto] | [Descripción completa en lenguaje de negocio] | [Cuándo aplica] | [Rechazo / advertencia / workflow / …] |
| RN-[CODIGO]-002 | [ ] | [ ] | [ ] | [ ] |
| RN-[CODIGO]-003 | [ ] | [ ] | [ ] | [ ] |

### 4.1 Reglas por categoría *(opcional, si el módulo es grande)*

#### 4.1.1 Reglas de estado / ciclo de vida

| ID | Regla | Descripción |
|----|-------|-------------|
| RN-[CODIGO]-0XX | [ ] | [ ] |

#### 4.1.2 Reglas de cálculo / montos / cantidades

| ID | Regla | Descripción |
|----|-------|-------------|
| RN-[CODIGO]-0XX | [ ] | [ ] |

#### 4.1.3 Reglas de autorización / aprobación

| ID | Regla | Descripción |
|----|-------|-------------|
| RN-[CODIGO]-0XX | [ ] | [ ] |

#### 4.1.4 Reglas de integración con otros módulos

| ID | Regla | Descripción |
|----|-------|-------------|
| RN-[CODIGO]-0XX | [ ] | [ ] |

---

## 5. Flujo Principal

**Nombre del flujo:** [Ej. Registrar compra de café en campo]  
**Actor iniciador:** [ ]  
**Precondiciones:** [Estado requerido del sistema antes de iniciar]

| Paso | Actor | Acción | Resultado esperado |
|------|-------|--------|-------------------|
| 1 | [ ] | [ ] | [ ] |
| 2 | [ ] | [ ] | [ ] |
| 3 | [ ] | [ ] | [ ] |
| 4 | [ ] | [ ] | [ ] |
| 5 | [ ] | [ ] | [ ] |
| … | [ ] | [ ] | [ ] |
| N | Sistema | [Acción automática final] | [Estado final del proceso] |

**Postcondiciones:** [Qué queda registrado / qué eventos de negocio ocurren]

---

## 6. Flujos Alternativos

### FA-[CODIGO]-01 — [Nombre del flujo alternativo]

**Disparador:** [En qué paso del flujo principal se desvía y por qué]

| Paso | Actor | Acción | Resultado esperado |
|------|-------|--------|-------------------|
| FA1.1 | [ ] | [ ] | [ ] |
| FA1.2 | [ ] | [ ] | [ ] |
| FA1.3 | [ ] | [ ] | [ ] |

**Retorno al flujo principal:** [Sí — paso N / No — proceso termina en estado X]

---

### FA-[CODIGO]-02 — [Nombre del flujo alternativo]

**Disparador:** [ ]

| Paso | Actor | Acción | Resultado esperado |
|------|-------|--------|-------------------|
| FA2.1 | [ ] | [ ] | [ ] |
| FA2.2 | [ ] | [ ] | [ ] |

*(Duplicar por cada flujo alternativo relevante.)*

---

## 7. Casos de Error

### CE-[CODIGO]-01 — [Nombre del caso de error]

| Campo | Descripción |
|-------|-------------|
| **Condición** | [Qué falla o qué entrada inválida] |
| **Paso afectado** | [Flujo principal paso N / FA-XX] |
| **Mensaje al usuario** | [Texto claro en español] |
| **Comportamiento sistema** | [No guardar / rollback / mantener borrador / …] |
| **Registro auditoría** | [Sí / No — qué se registra] |
| **Recuperación** | [Qué debe hacer el usuario para continuar] |

| Paso | Sistema / Usuario | Acción |
|------|-------------------|--------|
| 1 | Sistema | Detecta [condición] |
| 2 | Sistema | Muestra mensaje [ ] |
| 3 | Usuario | [Acción correctiva] |
| 4 | Sistema | [Permite reintentar / cancela operación] |

---

### CE-[CODIGO]-02 — [Nombre del caso de error]

| Campo | Descripción |
|-------|-------------|
| **Condición** | [ ] |
| **Paso afectado** | [ ] |
| **Mensaje al usuario** | [ ] |
| **Comportamiento sistema** | [ ] |
| **Registro auditoría** | [ ] |
| **Recuperación** | [ ] |

*(Duplicar por cada caso de error.)*

---

## 8. Validaciones

### 8.1 Validaciones de campo (formularios)

| Campo | Obligatorio | Tipo | Validación | Mensaje error |
|-------|-------------|------|------------|---------------|
| [nombre_campo] | Sí / No | [texto / número / fecha / lista / …] | [min, max, formato, catálogo] | [ ] |
| [ ] | [ ] | [ ] | [ ] | [ ] |

### 8.2 Validaciones de negocio (al guardar / aprobar)

| ID | Validación | Momento | Referencia RN |
|----|------------|---------|---------------|
| VAL-[CODIGO]-001 | [ ] | [Crear / Editar / Aprobar / …] | RN-[CODIGO]-NNN |
| VAL-[CODIGO]-002 | [ ] | [ ] | [ ] |

### 8.3 Validaciones de permisos y contexto

| ID | Validación | Momento |
|----|------------|---------|
| VAL-[CODIGO]-0XX | Usuario tiene permiso `[recurso:acción]` | Antes de ejecutar |
| VAL-[CODIGO]-0XX | Recurso dentro de scope territorial del usuario | Antes de ejecutar |
| VAL-[CODIGO]-0XX | Entidad en estado permitido para la operación | Antes de ejecutar |

---

## 9. Modelo de Datos

*(Descripción funcional de entidades — no DDL. Nombres en español para negocio, identificador técnico entre paréntesis.)*

### 9.1 Entidades

#### Entidad: [NombreEntidad] (`[nombre_tecnico]`)

| Campo | Tipo funcional | Obligatorio | Descripción | Restricciones |
|-------|----------------|-------------|-------------|---------------|
| [Campo] | [Texto / Número / Fecha / UUID / Lista / JSON / …] | Sí / No | [ ] | [Único, rango, catálogo MDE, …] |
| [ ] | [ ] | [ ] | [ ] | [ ] |

**Estados posibles:** `[estado1]`, `[estado2]`, `[estado3]`

---

#### Entidad: [NombreEntidad2] (`[nombre_tecnico]`)

| Campo | Tipo funcional | Obligatorio | Descripción | Restricciones |
|-------|----------------|-------------|-------------|---------------|
| [ ] | [ ] | [ ] | [ ] | [ ] |

*(Duplicar por cada entidad del módulo.)*

### 9.2 Relaciones

| Entidad origen | Relación | Entidad destino | Cardinalidad | Regla |
|----------------|----------|-----------------|--------------|-------|
| [ ] | [tiene / pertenece a / referencia] | [ ] | 1:1 / 1:N / N:N | [ ] |
| [ ] | [ ] | [ ] | [ ] | [ ] |

### 9.3 Restricciones globales

| ID | Restricción |
|----|-------------|
| RC-[CODIGO]-001 | [Ej. Una [entidad] activa por [criterio] por organización] |
| RC-[CODIGO]-002 | [ ] |

---

## 10. API

*(Contrato funcional REST — comportamiento esperado, no implementación.)*

**Base path:** `/api/v1/[ruta-modulo]`  
**Autenticación:** Bearer JWT obligatorio (salvo indicación contraria)

### Endpoint 10.1 — [Nombre operación]

| Campo | Valor |
|-------|-------|
| **Método** | GET / POST / PATCH / PUT / DELETE |
| **Ruta** | `/api/v1/[ruta]` |
| **Permiso** | `[recurso:acción]` |
| **Descripción** | [Qué hace desde perspectiva de negocio] |

**Entradas (request):**

| Parámetro | Ubicación | Tipo | Obligatorio | Descripción |
|-----------|-----------|------|-------------|-------------|
| [ ] | path / query / body | [ ] | Sí / No | [ ] |

**Salidas (response) — éxito:**

| Código HTTP | Descripción | Campos principales |
|-------------|-------------|-------------------|
| [200 / 201 / …] | [ ] | [ ] |

**Errores:**

| Código HTTP | Código negocio | Cuándo | Mensaje |
|-------------|----------------|--------|---------|
| 400 | [ ] | [Validación fallida] | [ ] |
| 403 | [ ] | [Sin permiso] | [ ] |
| 404 | [ ] | [No existe] | [ ] |
| 409 | [ ] | [Conflicto versión / estado] | [ ] |
| 422 | [ ] | [Regla negocio] | [ ] |

---

### Endpoint 10.2 — [Nombre operación]

| Campo | Valor |
|-------|-------|
| **Método** | [ ] |
| **Ruta** | [ ] |
| **Permiso** | [ ] |
| **Descripción** | [ ] |

**Entradas / Salidas / Errores:** *(misma estructura que 10.1)*

*(Duplicar por cada endpoint del módulo.)*

---

## 11. Interfaz

**Cliente:** Web ERP Portal  
**Ruta base UI:** `/[ruta-modulo]`

### 11.1 Pantallas

| ID | Pantalla | Descripción | Acceso (permiso) |
|----|----------|-------------|------------------|
| UI-[CODIGO]-01 | [Listado / Detalle / Dashboard / …] | [ ] | `[recurso:read]` |
| UI-[CODIGO]-02 | [ ] | [ ] | [ ] |

### 11.2 Pantalla: [Nombre] (UI-[CODIGO]-XX)

**Elementos de navegación:**
- Breadcrumb: [Inicio > Módulo > Pantalla]
- Título página: [ ]
- Acciones header: [botones principales]

**Botones:**

| Botón | Etiqueta | Acción | Visible cuando | Permiso |
|-------|----------|--------|----------------|---------|
| [ ] | [+ Nuevo / Guardar / …] | [ ] | [ ] | [ ] |
| [ ] | [ ] | [ ] | [ ] | [ ] |

**Filtros:**

| Filtro | Tipo | Opciones / Comportamiento |
|--------|------|---------------------------|
| [ ] | texto / fecha / lista / búsqueda | [ ] |
| [ ] | [ ] | [ ] |

**Tablas / listados:**

| Columna | Ordenable | Formato | Notas |
|---------|-----------|---------|-------|
| [ ] | Sí / No | [texto / número / fecha / badge estado] | [ ] |
| [ ] | [ ] | [ ] | [ ] |

**Acciones por fila:** [Editar | Eliminar | Ver | …]

**Formularios (crear / editar):**

| Campo UI | Tipo control | Obligatorio | Ayuda / placeholder |
|----------|--------------|-------------|---------------------|
| [ ] | input / select / date / textarea / … | Sí / No | [ ] |
| [ ] | [ ] | [ ] | [ ] |

**Estados vacíos / carga / error:**
- Sin registros: [mensaje y CTA]
- Cargando: [indicador]
- Error: [mensaje y acción reintentar]

*(Duplicar subsección 11.2 por cada pantalla.)*

---

## 12. Android

**Aplica a este módulo:** Sí / No / Parcial  
**Fase release Android:** [R0 / R1 / …]

### 12.1 Pantallas móvil

| ID | Pantalla | Descripción | Offline |
|----|----------|-------------|---------|
| AND-[CODIGO]-01 | [ ] | [ ] | Sí / No |
| AND-[CODIGO]-02 | [ ] | [ ] | [ ] |

### 12.2 Comportamiento offline

| Operación | Disponible offline | Cola / estrategia |
|-----------|-------------------|-------------------|
| [Consultar catálogo / listar] | Sí / No | [Cache TTL / bootstrap MDE] |
| [Crear registro] | Sí / No | [Outbox + externalId] |
| [Editar registro] | Sí / No | [ ] |
| [Adjuntar evidencia] | Sí / No | [Cola media local] |

### 12.3 Sincronización

| Evento | Dirección | Disparador |
|--------|-----------|------------|
| [ ] | Push (cliente → servidor) | [Al recuperar red / botón sync / WorkManager 15 min] |
| [ ] | Pull (servidor → cliente) | [Post-push / cursor eventos] |

**Conflictos esperados:** [Descripción y resolución funcional esperada para el usuario]

### 12.4 GPS

| Uso | Obligatorio | Validación |
|-----|-------------|------------|
| [Captura ubicación visita / compra / …] | Sí / No | [Precisión mínima m / dentro geocerca finca] |

### 12.5 Cámara

| Uso | Obligatorio | Formatos |
|-----|-------------|----------|
| [Evidencia báscula / finca / …] | Sí / No | [JPEG / …] |

### 12.6 Firma

| Uso | Obligatorio | Almacenamiento |
|-----|-------------|----------------|
| [Conformidad productor / recepción] | Sí / No | [Local → EDMKP al sync] |

---

## 13. IA

**Aplica IA en este módulo:** Sí / No / Futuro (release [ ])

### 13.1 Funciones

| ID | Función | Descripción | Entrada | Salida |
|----|---------|-------------|---------|--------|
| IA-[CODIGO]-01 | [ ] | [ ] | [ ] | [ ] |

### 13.2 Recomendaciones

| ID | Recomendación | Cuándo se muestra | Accionable |
|----|---------------|-------------------|------------|
| REC-[CODIGO]-01 | [ ] | [ ] | Sí — usuario confirma / No — solo informativo |

### 13.3 Automatizaciones

| ID | Automatización | Disparador | Acción automática | Requiere aprobación humana |
|----|----------------|------------|-------------------|---------------------------|
| AUT-[CODIGO]-01 | [ ] | [Evento / regla / umbral] | [ ] | Sí / No |

---

## 14. Reportes

| ID | Reporte | Descripción | Filtros | Formato export | Permiso |
|----|---------|-------------|---------|----------------|---------|
| REP-[CODIGO]-01 | [ ] | [ ] | [fecha, zona, productor, …] | PDF / Excel / CSV | `[report:read]` |
| REP-[CODIGO]-02 | [ ] | [ ] | [ ] | [ ] | [ ] |

---

## 15. KPIs

| ID | KPI | Definición | Fórmula / Fuente | Frecuencia | Meta (opcional) |
|----|-----|------------|------------------|------------|-----------------|
| KPI-[CODIGO]-01 | [ ] | [Qué mide en negocio] | [Campos / eventos origen] | Diaria / Semanal / Campaña | [ ] |
| KPI-[CODIGO]-02 | [ ] | [ ] | [ ] | [ ] | [ ] |

---

## 16. Auditoría

| Evento auditado | Datos registrados | Retención | Consulta por rol |
|-----------------|-------------------|-----------|------------------|
| [Crear / Editar / Eliminar / Aprobar …] | usuario, fecha, IP, dispositivo, antes/después | [Según política GECL] | `admin`, `auditor` |
| [ ] | [ ] | [ ] | [ ] |

**Eventos de dominio registrados (negocio):**

| Evento | Cuándo | Visible en timeline / OCC |
|--------|--------|---------------------------|
| [NombreEvento] | [ ] | Sí / No |

---

## 17. Permisos

| Permiso | Descripción | Roles típicos |
|---------|-------------|---------------|
| `[recurso]:create` | [ ] | [ ] |
| `[recurso]:read` | [ ] | [ ] |
| `[recurso]:update` | [ ] | [ ] |
| `[recurso]:delete` | [ ] | [ ] |
| `[recurso]:approve` | [ ] | [ ] |
| `[recurso]:export` | [ ] | [ ] |
| `[recurso]:admin` | [ ] | `admin` |

**Políticas PBAC aplicables (si aplica):**

| Política | Efecto | Condición |
|----------|--------|-----------|
| [ ] | allow / deny | [horario, municipio, dispositivo, …] |

---

## 18. Pruebas

### 18.1 Pruebas funcionales

| ID | Escenario | Pasos resumidos | Resultado esperado | Historia |
|----|-----------|-----------------|-------------------|----------|
| TF-[CODIGO]-01 | [Happy path principal] | [ ] | [ ] | US-[CODIGO]-001 |
| TF-[CODIGO]-02 | [Flujo alternativo FA-01] | [ ] | [ ] | [ ] |
| TF-[CODIGO]-03 | [Caso error CE-01] | [ ] | [ ] | [ ] |

### 18.2 Pruebas de integración

| ID | Escenario | Módulos involucrados | Resultado esperado |
|----|-----------|---------------------|-------------------|
| TI-[CODIGO]-01 | [ ] | [PRM + CPE + …] | [ ] |
| TI-[CODIGO]-02 | [ ] | [ ] | [ ] |

### 18.3 Pruebas de carga

| ID | Escenario | Volumen objetivo | Criterio éxito |
|----|-----------|------------------|----------------|
| TC-[CODIGO]-01 | [Listado paginado] | [N registros / usuarios concurrentes] | p95 < [X] ms |
| TC-[CODIGO]-02 | [Operación masiva / sync batch] | [ ] | [ ] |

### 18.4 Pruebas de seguridad

| ID | Escenario | Resultado esperado |
|----|-----------|-------------------|
| TS-[CODIGO]-01 | Usuario sin permiso intenta `[acción]` | HTTP 403, sin filtración datos |
| TS-[CODIGO]-02 | Acceso cross-tenant (otra organización) | HTTP 404 o 403 |
| TS-[CODIGO]-03 | [Manipulación scope territorial] | [Denegado] |

---

## 19. Definición de Done

Un ítem derivado de esta especificación se considera **terminado** cuando:

- [ ] Cumple todos los criterios de aceptación de la historia vinculada
- [ ] Implementa todas las reglas de negocio `RN-[CODIGO]-*` aplicables
- [ ] Pasa validaciones §8 en los momentos definidos
- [ ] API §10 documentada en Swagger con ejemplos
- [ ] UI §11 implementada según permisos §17
- [ ] Android §12 (si aplica) probado offline + sync
- [ ] Auditoría §16 operativa para acciones críticas
- [ ] Pruebas TF y TI §18 ejecutadas y aprobadas por QA
- [ ] PO firma aceptación en entorno de staging/demo
- [ ] Sin regresiones en módulos dependientes §1.7

---

## 20. Futuras Mejoras

| ID | Mejora | Descripción | Release tentativo | Prioridad |
|----|--------|-------------|-------------------|-----------|
| FM-[CODIGO]-01 | [ ] | [ ] | [R5 / backlog] | [Alta / Media / Baja] |
| FM-[CODIGO]-02 | [ ] | [ ] | [ ] | [ ] |

*(No confundir con exclusiones §1.6 — aquí van capacidades aceptadas pero fuera del release actual.)*

---

## Control de cambios

| Versión | Fecha | Autor | Descripción cambio | Aprobado por |
|---------|-------|-------|-------------------|--------------|
| 1.0 | [YYYY-MM-DD] | [ ] | Emisión inicial | [ ] |
| | | | | |

---

## Aprobaciones

| Rol | Nombre | Firma | Fecha |
|-----|--------|-------|-------|
| Product Owner | [ ] | [ ] | [ ] |
| Analista funcional | [ ] | [ ] | [ ] |
| Tech Lead | [ ] | [ ] | [ ] |
| QA Lead | [ ] | [ ] | [ ] |

---

**Fin de la especificación funcional — [CODIGO] [NOMBRE DEL MÓDULO]**
