package com.agroerp.data.repository

import com.agroerp.core.network.NetworkMonitor
import com.agroerp.core.util.JsonHelper
import com.agroerp.data.api.CaptureApi
import com.agroerp.data.api.CaptureSyncFileItem
import com.agroerp.data.api.CaptureSyncRequest
import com.agroerp.data.api.CaptureSyncResponse
import com.agroerp.data.api.CaptureSyncSubmissionItem
import com.agroerp.data.local.dao.CapturePackageDao
import com.agroerp.data.local.dao.CatalogDao
import com.agroerp.data.local.dao.DynamicFormDao
import com.agroerp.data.local.dao.FormDao
import com.agroerp.data.local.dao.FormSubmissionDao
import com.agroerp.data.local.dao.MediaFileDao
import com.agroerp.data.local.dao.MediaPendingDao
import com.agroerp.data.local.dao.SubmissionQueueDao
import com.agroerp.data.local.entities.FormSubmissionEntity
import com.agroerp.data.local.entities.MediaFileEntity
import com.agroerp.data.local.entities.SyncQueueStatus
import com.agroerp.data.mapper.CaptureMappers.toDynamicFormEntity
import com.agroerp.data.mapper.CaptureMappers.toEntity
import com.agroerp.data.mapper.CaptureMappers.toFormEntity
import com.agroerp.data.mapper.CaptureMappers.toPackageEntity
import com.agroerp.data.mapper.CaptureMappers.toPendingEntity
import com.agroerp.data.mapper.CaptureMappers.toQueueEntity
import javax.inject.Inject
import javax.inject.Singleton

sealed class CaptureError(message: String, cause: Throwable? = null) : Exception(message, cause) {
    class Offline(message: String) : CaptureError(message)
    class Http(code: Int, body: String?) : CaptureError("HTTP $code: ${body?.take(200) ?: "sin detalle"}")
    class Network(cause: Throwable) : CaptureError("Error de red", cause)
    class EmptyCache : CaptureError("Sin conexión y sin paquete en caché")
    class Validation(message: String) : CaptureError(message)
}

@Singleton
class CaptureRepository @Inject constructor(
    private val captureApi: CaptureApi,
    private val formDao: FormDao,
    private val dynamicFormDao: DynamicFormDao,
    private val catalogDao: CatalogDao,
    private val capturePackageDao: CapturePackageDao,
    private val submissionQueueDao: SubmissionQueueDao,
    private val mediaPendingDao: MediaPendingDao,
    private val submissionDao: FormSubmissionDao,
    private val mediaFileDao: MediaFileDao,
    private val networkMonitor: NetworkMonitor,
) {

    suspend fun downloadOfflinePackage(force: Boolean = false): Result<Int> {
        if (!networkMonitor.isOnline) {
            return cachedFormCount()?.let { Result.success(it) }
                ?: Result.failure(CaptureError.EmptyCache())
        }

        return try {
            val cachedPackage = capturePackageDao.get()
            if (!force && cachedPackage != null) {
                val versionCheck = captureApi.checkVersion(cachedPackage.packageVersion)
                if (versionCheck.isSuccessful && versionCheck.body()?.hasChanges == false) {
                    cachedFormCount()?.let { return Result.success(it) }
                }
            }

            val response = captureApi.getMobilePackage()
            if (!response.isSuccessful || response.body() == null) {
                return fallbackToCache(
                    CaptureError.Http(
                        response.code(),
                        response.errorBody()?.string(),
                    ),
                )
            }

            val body = response.body()!!
            val now = System.currentTimeMillis()
            val activeForms = body.forms.filter { it.status == "published" }

            val formEntities = activeForms.map { it.toFormEntity(now) }
            val dynamicEntities = activeForms.map { it.toDynamicFormEntity(now) }

            formDao.upsertAll(formEntities)
            dynamicFormDao.upsertAll(dynamicEntities)

            val activeIds = activeForms.map { it.formId }
            if (activeIds.isEmpty()) {
                formDao.deleteAll()
                dynamicFormDao.deleteAll()
            } else {
                formDao.deleteNotIn(activeIds)
                dynamicFormDao.deleteNotIn(activeIds)
            }

            capturePackageDao.upsert(body.toPackageEntity(now))

            if (body.catalogKeys.isNotEmpty()) {
                downloadCatalogs(body.catalogKeys.joinToString(","))
            }

            Result.success(formEntities.size)
        } catch (e: Exception) {
            fallbackToCache(CaptureError.Network(e))
        }
    }

    suspend fun downloadCatalogs(keys: String): Result<Int> {
        if (!networkMonitor.isOnline) {
            val cached = catalogDao.getAll()
            return if (cached.isNotEmpty()) Result.success(cached.size)
            else Result.failure(CaptureError.Offline("Sin conexión para descargar catálogos"))
        }

        return try {
            val response = captureApi.getCatalogs(keys)
            if (!response.isSuccessful || response.body() == null) {
                return Result.failure(
                    CaptureError.Http(response.code(), response.errorBody()?.string()),
                )
            }
            val body = response.body()!!
            val now = System.currentTimeMillis()
            val entities = body.catalogs.map { it.toEntity(now) }
            catalogDao.upsertAll(entities)
            val catalogKeys = entities.map { it.catalogKey }
            if (catalogKeys.isNotEmpty()) {
                catalogDao.deleteNotIn(catalogKeys)
            }
            Result.success(entities.size)
        } catch (e: Exception) {
            Result.failure(CaptureError.Network(e))
        }
    }

    suspend fun syncSubmissions(
        submissions: List<CaptureSyncSubmissionItem>,
        files: List<CaptureSyncFileItem>? = null,
        deviceInfo: Map<String, Any?>? = null,
    ): Result<CaptureSyncResponse> {
        if (!networkMonitor.isOnline) {
            return Result.failure(CaptureError.Offline("Sin conexión a internet"))
        }
        if (submissions.isEmpty()) {
            return Result.failure(CaptureError.Validation("No hay envíos para sincronizar"))
        }

        return try {
            val response = captureApi.sync(
                CaptureSyncRequest(
                    submissions = submissions,
                    files = files,
                    deviceInfo = deviceInfo,
                ),
            )
            if (!response.isSuccessful || response.body() == null) {
                return Result.failure(
                    CaptureError.Http(response.code(), response.errorBody()?.string()),
                )
            }
            Result.success(response.body()!!)
        } catch (e: Exception) {
            Result.failure(CaptureError.Network(e))
        }
    }

    suspend fun refreshSubmissionQueue() {
        val pending = submissionDao.getPending()
        submissionQueueDao.upsertAll(pending.map { it.toQueueEntity() })
    }

    suspend fun refreshMediaPendingQueue() {
        val pending = mediaFileDao.getPending()
        mediaPendingDao.upsertAll(pending.map { it.toPendingEntity() })
    }

    suspend fun updateSubmissionQueue(entity: FormSubmissionEntity) {
        submissionQueueDao.upsertAll(listOf(entity.toQueueEntity()))
    }

    suspend fun updateMediaPending(entity: MediaFileEntity) {
        mediaPendingDao.upsertAll(listOf(entity.toPendingEntity()))
    }

    suspend fun getCachedPackageVersion(): String? = capturePackageDao.get()?.packageVersion

    private suspend fun cachedFormCount(): Int? {
        val dynamicCount = dynamicFormDao.getAll().size
        if (dynamicCount > 0) return dynamicCount
        val legacyCount = formDao.getAll().size
        return legacyCount.takeIf { it > 0 }
    }

    private suspend fun fallbackToCache(error: CaptureError): Result<Int> {
        val count = cachedFormCount()
        return if (count != null) Result.success(count)
        else Result.failure(error)
    }
}
