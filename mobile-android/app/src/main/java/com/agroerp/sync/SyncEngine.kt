package com.agroerp.sync

import com.agroerp.BuildConfig
import com.agroerp.core.network.NetworkMonitor
import com.agroerp.core.util.JsonHelper
import com.agroerp.data.api.AgroErpApi
import com.agroerp.data.api.CaptureSyncFileItem
import com.agroerp.data.api.CaptureSyncSubmissionItem
import com.agroerp.data.api.RegisterFileRequest
import com.agroerp.data.local.dao.FormSubmissionDao
import com.agroerp.data.local.dao.MediaFileDao
import com.agroerp.data.local.dao.SyncQueueDao
import com.agroerp.data.local.dao.SyncStateDao
import com.agroerp.data.local.entities.FormSubmissionEntity
import com.agroerp.data.local.entities.MediaFileEntity
import com.agroerp.data.local.entities.SyncQueueEntity
import com.agroerp.data.local.entities.SyncQueueStatus
import com.agroerp.data.local.entities.SyncStateEntity
import com.agroerp.data.repository.AuthRepository
import com.agroerp.data.repository.CaptureRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.min
import kotlin.math.pow

data class SyncProgress(
    val isRunning: Boolean = false,
    val phase: String = "",
    val message: String = "",
    val lastError: String? = null,
    val lastSyncAt: Long? = null,
)

@Singleton
class SyncEngine @Inject constructor(
    private val api: AgroErpApi,
    private val captureRepository: CaptureRepository,
    private val networkMonitor: NetworkMonitor,
    private val authRepository: AuthRepository,
    private val mediaFileDao: MediaFileDao,
    private val submissionDao: FormSubmissionDao,
    private val syncQueueDao: SyncQueueDao,
    private val syncStateDao: SyncStateDao,
    private val localEventService: LocalEventService,
) {
    private val _progress = MutableStateFlow(SyncProgress())
    val progress: StateFlow<SyncProgress> = _progress.asStateFlow()

    companion object {
        private const val MAX_RETRIES = 5
        private const val BASE_BACKOFF_MS = 30_000L
    }

    suspend fun syncAll(): Result<SyncSummary> {
        if (!networkMonitor.isOnline) {
            return Result.failure(Exception("Sin conexión a internet"))
        }

        _progress.value = SyncProgress(isRunning = true, phase = "auth", message = "Autenticando...")
        localEventService.recordSyncStarted()

        if (!authRepository.refreshTokenIfNeeded()) {
            _progress.value = SyncProgress(isRunning = false, lastError = "Sesión expirada")
            return Result.failure(Exception("Sesión expirada — inicie sesión nuevamente"))
        }

        val summary = SyncSummary()

        try {
            // Recuperar envíos/medios atrapados en SYNCING (crash durante sync anterior)
            submissionDao.recoverStuckSyncing(System.currentTimeMillis())
            mediaFileDao.recoverStuckSyncing()

            captureRepository.refreshMediaPendingQueue()
            captureRepository.refreshSubmissionQueue()

            _progress.value = _progress.value.copy(phase = "media", message = "Subiendo archivos...")
            summary.mediaUploaded = pushMediaFiles()

            _progress.value = _progress.value.copy(phase = "submissions", message = "Sincronizando envíos...")
            summary.submissionsSynced = pushSubmissions()

            _progress.value = _progress.value.copy(phase = "pull", message = "Descargando eventos...")
            summary.eventsPulled = pullEvents()

            _progress.value = _progress.value.copy(phase = "forms", message = "Actualizando formularios...")
            captureRepository.downloadOfflinePackage(force = true)
                .onSuccess { summary.formsDownloaded = it }

            processSyncQueue()

            val now = System.currentTimeMillis()
            val state = syncStateDao.get() ?: SyncStateEntity()
            syncStateDao.upsert(
                state.copy(
                    lastPushAt = now,
                    lastFullSyncAt = now,
                ),
            )

            localEventService.recordSyncCompleted(
                mapOf(
                    "mediaUploaded" to summary.mediaUploaded,
                    "submissionsSynced" to summary.submissionsSynced,
                    "eventsPulled" to summary.eventsPulled,
                    "formsDownloaded" to summary.formsDownloaded,
                ),
            )
            localEventService.markAllPendingAsSynced()

            _progress.value = SyncProgress(
                isRunning = false,
                phase = "done",
                message = "Sincronización completada",
                lastSyncAt = now,
            )
            return Result.success(summary)
        } catch (e: Exception) {
            _progress.value = SyncProgress(
                isRunning = false,
                lastError = e.message,
            )
            return Result.failure(e)
        }
    }

    private suspend fun pushMediaFiles(): Int {
        var count = 0
        val pending = mediaFileDao.getPending()
        for (media in pending) {
            if (!shouldRetry(media.retryCount, media.lastError)) continue
            val syncing = media.copy(syncStatus = SyncQueueStatus.SYNCING)
            mediaFileDao.update(syncing)
            captureRepository.updateMediaPending(syncing)
            try {
                val file = File(media.localPath)
                val response = api.registerFile(
                    RegisterFileRequest(
                        filename = media.filename,
                        mimeType = media.mimeType,
                        sizeBytes = file.length(),
                        storageKey = "local://${media.id}",
                        metadata = mapOf(
                            "mediaType" to media.mediaType,
                            "fieldKey" to media.fieldKey,
                            "localPath" to media.localPath,
                            "gps" to media.gpsLocationJson?.let {
                                JsonHelper.fromJson<Map<String, Any?>>(it)
                            },
                        ),
                    ),
                )
                if (response.isSuccessful && response.body() != null) {
                    val synced = media.copy(
                        serverResourceId = response.body()!!.id,
                        syncStatus = SyncQueueStatus.SYNCED,
                        lastError = null,
                    )
                    mediaFileDao.update(synced)
                    captureRepository.updateMediaPending(synced)
                    count++
                } else {
                    markMediaFailed(media, "Register failed: ${response.code()}")
                }
            } catch (e: Exception) {
                markMediaFailed(media, e.message ?: "Upload error")
            }
        }
        return count
    }

    private suspend fun markMediaFailed(media: MediaFileEntity, error: String) {
        val failed = media.copy(
            syncStatus = SyncQueueStatus.FAILED,
            retryCount = media.retryCount + 1,
            lastError = error,
        )
        mediaFileDao.update(failed)
        captureRepository.updateMediaPending(failed)
    }

    private suspend fun pushSubmissions(): Int {
        val pending = submissionDao.getPending()
        if (pending.isEmpty()) return 0

        val resolved = pending.map { resolveMediaRefs(it) }
        val items = resolved.map { entity ->
            CaptureSyncSubmissionItem(
                formId = entity.formId,
                // Solo enviar formKey si existe: backends antiguos rechazan la propiedad.
                formKey = entity.formKey.trim().takeIf { it.isNotEmpty() },
                data = JsonHelper.fromJson(entity.dataJson),
                externalId = entity.externalId,
                gpsLocation = entity.gpsLocationJson?.let {
                    JsonHelper.fromJson(it)
                },
                gpsTrack = entity.gpsTrackJson?.let {
                    JsonHelper.fromJson(it)
                },
                deviceInfo = entity.deviceInfoJson?.let {
                    JsonHelper.fromJson(it)
                },
                clientCreatedAt = java.time.Instant.ofEpochMilli(entity.createdAt).toString(),
            )
        }

        val fileRefs = buildCaptureFileRefs(resolved)

        for (entity in resolved) {
            val syncing = entity.copy(syncStatus = SyncQueueStatus.SYNCING)
            submissionDao.update(syncing)
            captureRepository.updateSubmissionQueue(syncing)
        }

        var syncResult = captureRepository.syncSubmissions(
            submissions = items,
            files = fileRefs,
            deviceInfo = deviceInfo(),
        )

        // Backends sin formKey en el DTO rechazan el body completo (HTTP 400).
        // Reintentar sin formKey para no romper sync contra servidores aún sin redeploy.
        val firstError = syncResult.exceptionOrNull()?.message.orEmpty()
        if (syncResult.isFailure && firstError.contains("HTTP 400") && items.any { it.formKey != null }) {
            syncResult = captureRepository.syncSubmissions(
                submissions = items.map { it.copy(formKey = null) },
                files = fileRefs,
                deviceInfo = deviceInfo(),
            )
        }

        if (syncResult.isFailure) {
            val detail = syncResult.exceptionOrNull()?.message ?: "Error desconocido"
            for (entity in resolved) {
                val failed = entity.copy(
                    syncStatus = SyncQueueStatus.FAILED,
                    retryCount = entity.retryCount + 1,
                    lastError = "Error de sincronización: $detail",
                )
                submissionDao.update(failed)
                captureRepository.updateSubmissionQueue(failed)
            }
            throw Exception("Error al sincronizar envíos: $detail")
        }

        var synced = 0
        val resultsByExternal = syncResult.getOrThrow().results.associateBy { it.externalId }
        for (entity in resolved) {
            val result = resultsByExternal[entity.externalId]
            when (result?.status) {
                "created", "duplicate" -> {
                    val updated = entity.copy(
                        syncStatus = SyncQueueStatus.SYNCED,
                        serverSubmissionId = result.submissionId,
                        lastError = null,
                    )
                    submissionDao.update(updated)
                    captureRepository.updateSubmissionQueue(updated)
                    synced++
                }
                else -> {
                    val failed = entity.copy(
                        syncStatus = SyncQueueStatus.FAILED,
                        retryCount = entity.retryCount + 1,
                        lastError = result?.error ?: "Unknown error",
                    )
                    submissionDao.update(failed)
                    captureRepository.updateSubmissionQueue(failed)
                }
            }
        }
        return synced
    }

    private suspend fun buildCaptureFileRefs(
        submissions: List<FormSubmissionEntity>,
    ): List<CaptureSyncFileItem> {
        val externalIds = submissions.map { it.externalId }.toSet()
        return mediaFileDao.getPending()
            .filter { it.submissionExternalId in externalIds || it.serverResourceId != null }
            .map { media ->
                CaptureSyncFileItem(
                    externalId = media.id,
                    filename = media.filename,
                    mimeType = media.mimeType,
                    resourceId = media.serverResourceId,
                    fieldKey = media.fieldKey,
                    storageKey = media.serverResourceId?.let { "resource://$it" }
                        ?: "local://${media.id}",
                )
            }
    }

    private suspend fun resolveMediaRefs(entity: FormSubmissionEntity): FormSubmissionEntity {
        val data = JsonHelper.fromJson<MutableMap<String, Any?>>(entity.dataJson)
        var changed = false
        for ((key, value) in data.toMap()) {
            when (value) {
                is String -> {
                    val replaced = resolveMediaId(value)
                    if (replaced != value) {
                        data[key] = replaced
                        changed = true
                    }
                }
                is List<*> -> {
                    val newList = value.map { item ->
                        if (item is String) resolveMediaId(item) else item
                    }
                    if (newList != value) {
                        data[key] = newList
                        changed = true
                    }
                }
            }
        }
        return if (changed) entity.copy(dataJson = JsonHelper.toJson(data)) else entity
    }

    private suspend fun resolveMediaId(localId: String): String {
        val media = mediaFileDao.getById(localId) ?: return localId
        return media.serverResourceId ?: localId
    }

    private suspend fun pullEvents(): Int {
        val state = syncStateDao.get() ?: SyncStateEntity()
        val cursor = state.lastPullCursor.toBigInteger()
        val response = api.pullEvents(cursor.toString())
        if (!response.isSuccessful || response.body() == null) return 0

        val body = response.body()!!
        syncStateDao.upsert(
            state.copy(
                lastPullCursor = body.nextCursor,
                lastPullAt = System.currentTimeMillis(),
            ),
        )
        return body.events.size
    }

    private suspend fun processSyncQueue() {
        val now = System.currentTimeMillis()
        val ready = syncQueueDao.getReady(now)
        for (item in ready) {
            syncQueueDao.update(item.copy(status = SyncQueueStatus.SYNCED))
        }
    }

    private fun shouldRetry(retryCount: Int, @Suppress("UNUSED_PARAMETER") lastError: String?): Boolean =
        retryCount < MAX_RETRIES

    fun computeBackoffMs(retryCount: Int): Long =
        (BASE_BACKOFF_MS * 2.0.pow(retryCount.toDouble())).toLong().let {
            min(it, 3600_000L)
        }

    private fun deviceInfo(): Map<String, Any?> = mapOf(
        "platform" to "android",
        "appVersion" to BuildConfig.APP_VERSION,
    )
}

data class SyncSummary(
    var mediaUploaded: Int = 0,
    var submissionsSynced: Int = 0,
    var eventsPulled: Int = 0,
    var formsDownloaded: Int = 0,
)
