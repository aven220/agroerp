package com.agroerp.data.repository

import com.agroerp.BuildConfig
import com.agroerp.core.util.JsonHelper
import com.agroerp.data.local.dao.FormSubmissionDao
import com.agroerp.data.local.entities.FormSubmissionEntity
import com.agroerp.data.local.entities.SyncQueueStatus
import com.agroerp.data.mapper.FormMappers.toDomain
import com.agroerp.data.mapper.FormMappers.toEntityStatus
import com.agroerp.domain.engine.FormValidationEngine
import com.agroerp.domain.model.FormDefinition
import com.agroerp.domain.model.FormSubmission
import com.agroerp.domain.model.GpsPoint
import com.agroerp.domain.model.SyncState
import com.agroerp.sync.LocalEventService
import com.agroerp.sync.OutboxManager
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SubmissionRepository @Inject constructor(
    private val submissionDao: FormSubmissionDao,
    private val validationEngine: FormValidationEngine,
    private val localEventService: LocalEventService,
    private val outboxManager: OutboxManager,
) {

    val submissionsFlow: Flow<List<FormSubmission>> =
        submissionDao.observeAll().map { list -> list.map { it.toDomain() } }

    val pendingCountFlow: Flow<Int> = submissionDao.observePendingCount()

    suspend fun submit(
        form: FormDefinition,
        data: Map<String, Any?>,
        gpsLocation: GpsPoint?,
        gpsTrack: List<GpsPoint> = emptyList(),
        draft: Boolean = false,
    ): Result<FormSubmission> {
        return try {
            val validated = if (!draft) {
                validationEngine.validate(form.schema, data, gpsLocation)
            } else {
                data
            }

            val externalId = UUID.randomUUID().toString()
            val now = System.currentTimeMillis()
            val entity = FormSubmissionEntity(
                id = UUID.randomUUID().toString(),
                externalId = externalId,
                formId = form.id,
                formKey = form.formKey,
                formVersion = form.version,
                dataJson = JsonHelper.toJson(validated),
                gpsLocationJson = gpsLocation?.let { JsonHelper.toJson(it) },
                gpsTrackJson = if (gpsTrack.isNotEmpty()) JsonHelper.toJson(gpsTrack) else null,
                deviceInfoJson = JsonHelper.toJson(deviceInfo()),
                serverSubmissionId = null,
                serverResourceId = null,
                syncStatus = SyncQueueStatus.PENDING,
                createdAt = now,
                updatedAt = now,
            )
            submissionDao.insert(entity)

            localEventService.recordFormSubmitted(form.id, externalId, validated.size)

            outboxManager.enqueueSubmission(entity.id, externalId)

            Result.success(entity.toDomain())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateSyncStatus(
        id: String,
        status: SyncState,
        serverSubmissionId: String? = null,
        serverResourceId: String? = null,
        error: String? = null,
        retryCount: Int = 0,
    ) {
        val entity = submissionDao.getById(id) ?: return
        submissionDao.update(
            entity.copy(
                syncStatus = status.toEntityStatus(),
                serverSubmissionId = serverSubmissionId ?: entity.serverSubmissionId,
                serverResourceId = serverResourceId ?: entity.serverResourceId,
                lastError = error,
                retryCount = retryCount,
                updatedAt = System.currentTimeMillis(),
            ),
        )
    }

    suspend fun getPendingSubmissions(): List<FormSubmissionEntity> =
        submissionDao.getPending()

    private fun deviceInfo(): Map<String, Any?> = mapOf(
        "platform" to "android",
        "appVersion" to BuildConfig.APP_VERSION,
    )
}
