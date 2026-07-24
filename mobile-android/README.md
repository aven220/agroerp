# AGROERP Android Field App

Aplicación Android offline-first para captura de datos en campo. Integrada con Form Engine, Resource Engine y Sync del backend AGROERP.

## Stack

- **Kotlin** + Jetpack Compose
- **Clean Architecture** + MVVM + Repository Pattern
- **Room** (SQLite local)
- **Hilt** (DI)
- **Retrofit** (API)
- **WorkManager** (sync en background)
- **EncryptedSharedPreferences** (JWT tokens)
- **Google Play Services Location** (GPS)

## Estructura

```
app/src/main/java/com/agroerp/
├── AgroErpApplication.kt
├── MainActivity.kt
├── core/
│   ├── database/          # Room AppDatabase
│   ├── di/                # Hilt modules
│   ├── network/           # OkHttp, interceptors, NetworkMonitor
│   ├── security/          # TokenManager, DeviceIdProvider
│   └── util/              # JsonHelper
├── data/
│   ├── api/               # AgroErpApi (Retrofit)
│   ├── local/             # Entities + DAOs
│   ├── mapper/            # Entity ↔ Domain
│   └── repository/        # Auth, Form, Submission, Media
├── domain/
│   ├── model/             # Domain models
│   └── engine/            # Validation, conditional logic, renderer
├── sync/
│   ├── SyncEngine.kt      # Orquestador push/pull
│   ├── SyncWorker.kt      # WorkManager
│   ├── OutboxManager.kt   # Cola offline
│   ├── LocalEventService.kt
│   └── ConflictResolver.kt
├── gis/
│   └── LocationService.kt
├── media/
│   └── MediaCaptureManager.kt + MediaCompressor
└── presentation/
    ├── login/             # Login + sesión offline
    ├── home/              # Lista de formularios + sync
    ├── formfill/          # Captura dinámica
    └── components/        # DynamicFormFields, SignaturePad
```

## Flujo offline-first

1. **Login** (requiere red la primera vez) → JWT encriptado + sesión en Room
2. **Paquete offline** → `GET /capture/mobile/package` → formularios publicados en SQLite
3. **Captura** → validación local → submission en Room (`PENDING`)
4. **Media** → archivos en `files/media/` → registro local → sync después
5. **Sync** → sube media → `POST /capture/sync` → pull eventos → refresca paquete

Los envíos sincronizados aparecen en web → **Formularios → Recolección** (misma org y mismo servidor).

## Estados de sincronización

`PENDING` → `SYNCING` → `SYNCED` | `FAILED` (con retry y backoff)

Si la app se cierra a mitad del sync, los registros en `SYNCING` se recuperan automáticamente al siguiente sync.

## Configuración API

La URL del backend se configura por variable (sin IPs hardcodeadas en código):

| Archivo | Variable | Uso |
|---------|----------|-----|
| `gradle.properties` | `AGROERP_API_BASE_URL` | Default del proyecto (emulador) |
| `local.properties` | `AGROERP_API_BASE_URL` | Override local (dispositivo físico) |
| env / CI | `AGROERP_API_BASE_URL` | Builds automatizados |

Copie `local.properties.example` → `local.properties` y ajuste:

```properties
AGROERP_API_BASE_URL=http://10.0.2.2:3080/api/v1/
```

Emulador Android → `10.0.2.2` = localhost del host.

Dispositivo físico → IP LAN de su máquina:

```properties
AGROERP_API_BASE_URL=http://192.168.x.x:3080/api/v1/
```

Release: `AGROERP_API_RELEASE_URL` en `gradle.properties`.

## Permisos runtime

- `ACCESS_FINE_LOCATION` — GPS
- `CAMERA` — fotos y firma
- `RECORD_AUDIO` — audio (preparado)

## Eventos locales

| Evento | Cuándo |
|--------|--------|
| `FORM_OPENED` | Abrir formulario |
| `FORM_SUBMITTED` | Guardar envío |
| `MEDIA_CAPTURED` | Foto/firma/audio |
| `SYNC_STARTED` | Inicio de sync |
| `SYNC_COMPLETED` | Fin de sync |

## Build

Abrir `mobile-android/` en Android Studio (Ladybug o superior) o:

```bash
cd mobile-android
./gradlew assembleDebug
```

## Credenciales demo

- Email: `admin@demo.agroerp.com`
- Password: `Admin123!`

## Documentación

Ver también: [`docs/ANDROID_FIELD_APP.md`](../docs/ANDROID_FIELD_APP.md)
