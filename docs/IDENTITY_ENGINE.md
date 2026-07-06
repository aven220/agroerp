# Identity Engine

Motor empresarial de identidad y acceso para AGROERP. **No es un CRUD de usuarios** — es la capa central que gobierna quién puede hacer qué, dónde, cuándo y desde qué dispositivo, en entornos multi-empresa con miles de usuarios.

## Concepto

| Capa | Descripción |
|------|-------------|
| **RBAC** | Roles → Permisos (`resource:action`) asignados directamente o vía grupos |
| **PBAC** | Políticas configurables con condiciones (horario, ubicación, dispositivo, scope) |
| **Scopes** | Restricción contextual por finca, municipio, sucursal, módulo, formulario |
| **Sesiones** | JWT + refresh token con registro, revocación y bloqueo remoto |
| **Delegaciones** | Permisos temporales otorgados por un usuario a otro |
| **Sustituciones** | Asumir roles de un usuario ausente por periodo definido |
| **Service Accounts** | Identidades no humanas con API keys para integraciones |

## Arquitectura

```
identity/
├── application/
│   ├── auth.service.ts              # Login, register, refresh, logout
│   ├── access-control.service.ts    # RBAC efectivo + authorize() RBAC+PBAC
│   ├── policy-engine.service.ts     # Evaluación PBAC (condiciones)
│   ├── sessions.service.ts          # Sesiones activas/históricas, revocación
│   ├── policies.service.ts          # CRUD políticas
│   ├── roles.service.ts             # CRUD roles, assign/revoke
│   ├── groups.service.ts            # Grupos de seguridad + roles heredados
│   ├── org-units.service.ts         # Jerarquía org (empresa, sucursal, región…)
│   ├── teams.service.ts             # Equipos operativos
│   ├── delegations.service.ts       # Delegaciones temporales
│   ├── substitutions.service.ts     # Sustituciones de roles
│   ├── service-accounts.service.ts  # Cuentas de servicio + API keys
│   ├── permissions.service.ts       # Catálogo de permisos del sistema
│   └── users.service.ts             # Perfil, lock/unlock, actividad
├── infrastructure/
│   └── jwt.strategy.ts              # Valida JWT + sesión activa + permisos
└── presentation/
    ├── auth.controller.ts
    ├── users.controller.ts
    └── identity.controller.ts       # Policies, Roles, Groups, OrgUnits…
```

Integración con **Core Engine**:
- Cada login/logout, cambio de permiso, revocación de sesión y política → **Event Store** + **Audit**
- `PermissionsGuard` global invoca `AuthorizationService.authorize()` (RBAC + PBAC)

## Modelo de datos

### Usuario (`User`)

Soporta múltiples tipos de identidad:

| `userType` | Uso |
|------------|-----|
| `internal` | Empleado interno |
| `external` | Usuario externo (aliado, proveedor portal) |
| `contractor` | Contratista de campo |
| `visitor` | Acceso temporal limitado |
| `service_account` | Cuenta de servicio vinculada a integración |
| `api_user` | Usuario API / machine-to-machine |

Estados: `active`, `inactive`, `locked`, `pending`, `expired`.

Campos de perfil empresarial:
- `phone`, `locale`, `timezone`
- `avatarFileId`, `signatureFileId` (referencias al Resource Engine)
- `preferences`, `profile`, `metadata` (JSON extensible)
- `lockedAt`, `lockedReason`, `expiresAt` (usuarios temporales)
- `version` (optimistic locking / historial)

Relaciones: `userRoles`, `userGroups`, `userScopes`, `teamMembers`, `sessions`, `devices`, `delegations`, `substitutions`.

### RBAC

```
Permission (resource + action + scope)
    ↑
RolePermission
    ↑
Role ←→ UserRole ← User
    ↑
RoleGroup
    ↑
Group ←→ UserGroup ← User
```

### PBAC (`Policy`)

```json
{
  "name": "No compras después de 6 PM",
  "effect": "deny",
  "resource": "purchase",
  "action": "create",
  "subject": { "roles": ["field_agent"] },
  "conditions": {
    "all": [{ "type": "time_after", "value": "18:00" }]
  },
  "priority": 100,
  "active": true
}
```

**Efectos**: `allow` | `deny` — las políticas `deny` con mayor prioridad bloquean incluso si RBAC permite.

### Organización jerárquica (`OrgUnit`)

Tipos: `company`, `branch`, `region`, `department`.

Árbol auto-referenciado (`parentId`) para empresas → sucursales → regiones → departamentos.

### Scopes (`UserScope`)

Tipos (`SCOPE_TYPES`): `org`, `org_unit`, `branch`, `region`, `farm`, `municipality`, `module`, `form`, `resource`, `device`, `own`.

Permiten restringir acceso por contexto geográfico u operativo sin crear roles por cada finca.

### Sesiones (`Session`)

- `jti` en JWT vinculado a sesión en BD
- `refreshTokenHash` (SHA-256, nunca plaintext)
- Estados: `active`, `revoked`, `expired`
- Revocación individual o masiva (`revoke-all`)
- Bloqueo remoto vía lock de usuario → revoca todas las sesiones

### Delegaciones y sustituciones

| Entidad | Propósito |
|---------|-----------|
| `Delegation` | Usuario A delega permisos específicos a usuario B por periodo |
| `Substitution` | Usuario sustituto asume `roleSlugs` del titular ausente |

### Service Accounts

- `clientId` + `clientSecretHash`
- Permisos y scopes JSON propios
- `ApiKey` derivadas para autenticación M2M

## Permisos del sistema

Formato: `{resource}:{action}`

### Acciones disponibles

`create`, `read`, `update`, `delete`, `approve`, `reject`, `sign`, `export`, `import`, `audit`, `admin`, `sync`, `publish`, `submit`, `push`

### Recursos (extensible)

`user`, `role`, `group`, `policy`, `session`, `org_unit`, `team`, `organization`, `resource`, `metadata`, `form`, `event`, `audit`, `sync`, `producer`, `farm`, `contract`, `purchase`, `inventory`, `quality`, `gis`, `report`, `finance`, `ai`, `service_account`

Wildcards soportados en evaluación: `*:*`, `resource:*`, `*:action`

### Permisos por contexto

Los permisos en catálogo tienen `scope` (`org` por defecto). La restricción fina se logra combinando:
1. **RBAC** — permiso base
2. **UserScope** — límite geográfico/operativo
3. **PBAC** — reglas dinámicas (horario, dispositivo, antigüedad del recurso)

## Motor de políticas (PBAC)

### Condiciones soportadas

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| `time_before` | Antes de hora (HH:mm) | Solo compras antes de 18:00 |
| `time_after` | Después de hora | Denegar edición nocturna |
| `hours_since_create` | Horas desde creación del recurso | No editar contratos > 48h |
| `device_trusted` | Dispositivo marcado confiable | Header `X-Device-Trusted: true` |
| `device_registered` | Requiere `X-Device-Id` | Bloquear sync anónimo |
| `scope_municipality` | Municipio en scope del usuario | Compras solo en municipio asignado |
| `scope_org_unit` | Unidad org en scope | Acceso limitado a sucursal |
| `action_eq` | Acción específica | Refinar política |
| `ip_in_range` | Rango IP (reservado) | Futuro |

Condiciones compuestas:
```json
{ "all": [ ... ] }   // AND
{ "any": [ ... ] }   // OR
```

### Flujo de autorización

```
Request → JwtAuthGuard (sesión válida)
       → PermissionsGuard
            1. RBAC: ¿tiene permisos requeridos?
            2. PBAC: ¿alguna política deny coincide?
            3. Si deny → 403 Access Denied
```

`AccessContext` enviado al motor:
- `userId`, `organizationId`, `roles`, `permissions`
- `userType`, `sessionId`, `deviceId`, `ipAddress`, `userAgent`
- `resource`, `action` (derivados del permiso requerido)
- `scope` (mapa de UserScopes)
- `metadata` (deviceTrusted, resourceCreatedAt, etc.)

## Autenticación

### JWT Payload

```json
{
  "sub": "user-uuid",
  "email": "user@org.com",
  "orgId": "org-uuid",
  "roles": ["manager"],
  "permissions": ["purchase:read", "farm:update"],
  "sessionId": "session-uuid",
  "jti": "unique-token-id",
  "userType": "internal"
}
```

### Endpoints de auth

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/register` | Registro org + admin |
| POST | `/auth/login` | Login → JWT + sesión |
| POST | `/auth/refresh` | Renovar access token |
| POST | `/auth/logout` | Revocar sesión actual |

Headers recomendados:
- `Authorization: Bearer <token>`
- `X-Device-Id` — identificador del dispositivo
- `X-Device-Trusted: true` — dispositivo previamente autorizado

## API — Identity

### Políticas (PBAC)

| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/identity/policies` | `policy:read` |
| GET | `/identity/policies/:id` | `policy:read` |
| POST | `/identity/policies` | `policy:create` |
| PATCH | `/identity/policies/:id` | `policy:update` |

### Roles (RBAC)

| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/identity/roles` | `role:read` |
| GET | `/identity/roles/:id` | `role:read` |
| POST | `/identity/roles` | `role:create` |
| PATCH | `/identity/roles/:id` | `role:update` |
| POST | `/identity/roles/:id/assign` | `role:update` |
| DELETE | `/identity/roles/:id/users/:userId` | `role:update` |

### Grupos

| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/identity/groups` | `group:read` |
| POST | `/identity/groups` | `group:create` |
| POST | `/identity/groups/:id/members/:userId` | `group:update` |

### Unidades organizacionales

| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/identity/org-units` | `org_unit:read` |
| GET | `/identity/org-units/tree` | `org_unit:read` |
| POST | `/identity/org-units` | `org_unit:create` |
| PATCH | `/identity/org-units/:id` | `org_unit:update` |

### Equipos

| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/identity/teams` | `team:read` |
| POST | `/identity/teams` | `team:create` |
| POST | `/identity/teams/:id/members/:userId` | `team:update` |

### Sesiones

| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/identity/sessions` | `session:read` |
| GET | `/identity/sessions/me` | `session:read` |
| POST | `/identity/sessions/:id/revoke` | `session:admin` |
| POST | `/identity/sessions/users/:userId/revoke-all` | `session:admin` |

### Delegaciones y sustituciones

| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/identity/delegations` | `user:read` |
| POST | `/identity/delegations` | `user:update` |
| GET | `/identity/substitutions` | `user:read` |
| POST | `/identity/substitutions` | `user:update` |

### Service Accounts

| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/identity/service-accounts` | `service_account:read` |
| POST | `/identity/service-accounts` | `service_account:create` |
| POST | `/identity/service-accounts/:id/api-keys` | `service_account:create` |

### Usuarios (perfil empresarial)

| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/users` | `user:read` |
| GET | `/users/:id` | `user:read` |
| GET | `/users/:id/activity` | `user:read` |
| POST | `/users` | `user:create` |
| PATCH | `/users/:id` | `user:update` |
| PATCH | `/users/:id/profile` | `user:update` |
| POST | `/users/:id/lock` | `user:update` |
| POST | `/users/:id/unlock` | `user:update` |
| DELETE | `/users/:id` | `user:delete` |

### Permisos efectivos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/identity/permissions` | Catálogo global |
| GET | `/identity/permissions/me/effective` | RBAC + scopes + delegaciones del usuario actual |

## Eventos

| Evento | Cuándo |
|--------|--------|
| `AuthLoggedIn` | Login exitoso |
| `AuthLoggedOut` | Logout |
| `SessionCreated` | Nueva sesión |
| `SessionRevoked` | Revocación manual o por lock |
| `UserCreated` | Alta de usuario |
| `UserUpdated` | Cambio de perfil/datos |
| `UserLocked` | Bloqueo + revocación sesiones |
| `UserUnlocked` | Desbloqueo |
| `RoleAssigned` / `RoleRevoked` | Cambio de rol |
| `PolicyCreated` / `PolicyUpdated` | Cambio de política |
| `DelegationCreated` / `DelegationRevoked` | Delegación |
| `SubstitutionCreated` / `SubstitutionRevoked` | Sustitución |
| `ServiceAccountCreated` | Alta service account |
| `ApiKeyCreated` | Nueva API key |
| `AccessDenied` | Intento denegado (futuro: hook en guard) |

## Casos de uso

### 1. Agente de campo con acceso limitado

1. Usuario `field_agent` con roles estándar
2. `UserScope` tipo `farm` → solo fincas asignadas
3. Política PBAC: denegar `sync:push` sin `device_registered`
4. Android envía `X-Device-Id` en cada request

### 2. Gerente en vacaciones

1. Crear `Substitution` del gerente al subordinado
2. Subordinado hereda `roleSlugs` del gerente durante el periodo
3. Al terminar, `revoke` la sustitución

### 3. Aprobación delegada

1. Director delega `contract:approve` a asistente por 5 días
2. `Delegation` con `permissions: ["contract:approve"]`
3. `AccessControlService` incluye permisos delegados en `resolveUserAccess`

### 4. Bloqueo remoto de dispositivo robado

1. Admin: `POST /users/:id/lock`
2. Sistema revoca todas las sesiones activas
3. JWT existentes fallan en `JwtStrategy` (sesión no activa)

### 5. Compras fuera de horario

Política demo incluida en seed:
```json
{
  "effect": "deny",
  "resource": "purchase",
  "action": "create",
  "conditions": { "all": [{ "type": "time_after", "value": "18:00" }] }
}
```

## Escenarios de escala

| Escenario | Estrategia |
|-----------|------------|
| Miles de usuarios | Índices en `(organizationId, status)`, paginación en listados |
| Multi-tenant | `organizationId` en todas las entidades + RLS via `setTenantContext` |
| Permisos efectivos | Cache en Redis (futuro) — actualmente resolución en cada request JWT |
| Políticas | Evaluación por prioridad descendente; early exit en deny |
| Sesiones | Índice `(userId, status)`; cleanup job para expiradas (futuro) |

## Roadmap (no implementado)

| Feature | Estado |
|---------|--------|
| OAuth 2.0 / OpenID Connect | Diseñado, endpoints pendientes |
| SSO (SAML, Azure AD, Google Workspace) | Futuro |
| MFA (TOTP, SMS, WebAuthn) | Futuro — campos `metadata` preparados |
| ABAC completo (atributos dinámicos) | Extensible vía `PolicyCondition` |
| Cache de permisos en Redis | Recomendado para producción |

## Buenas prácticas

1. **Principio de menor privilegio** — roles base mínimos; ampliar con grupos o delegaciones
2. **Políticas deny explícitas** — usar `deny` para restricciones de negocio; RBAC para capacidades
3. **Sesiones cortas** — `JWT_EXPIRES_IN=15m` + refresh token rotatorio
4. **Nunca almacenar tokens en plaintext** — solo hashes SHA-256
5. **Auditar todo** — login, logout, cambios de rol, revocaciones
6. **Usuarios temporales** — siempre `expiresAt` + job de expiración
7. **Service accounts** — permisos mínimos; rotar API keys periódicamente
8. **Scopes sobre roles** — preferir `UserScope` por finca/municipio en lugar de crear un rol por ubicación

## Demo

Tras `pnpm setup:db`:

- **Admin**: `admin@demo.agroerp.com` / `Admin123!`
- **Org units**: Sede Principal (`HQ`), Regional Antioquia (`REG-ANT`)
- **Política PBAC**: "No compras después de 6 PM" (`purchase:create` deny after 18:00)

Probar en Swagger (`http://localhost:3080/api`):
1. `POST /auth/login`
2. `GET /identity/permissions/me/effective`
3. `GET /identity/sessions/me`
4. `GET /identity/org-units/tree`
5. `GET /identity/policies`
