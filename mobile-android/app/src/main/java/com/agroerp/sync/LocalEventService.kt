package com.agroerp.sync

import com.agroerp.core.util.JsonHelper
import com.agroerp.data.local.dao.LocalEventDao
import com.agroerp.data.local.entities.LocalEventEntity
import com.agroerp.data.local.entities.SyncQueueStatus
import com.agroerp.domain.model.LocalEventType
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LocalEventService @Inject constructor(
    private val localEventDao: LocalEventDao,
) {

    suspend fun record(
        type: LocalEventType,
        aggregateType: String,
        aggregateId: String,
        payload: Map<String, Any?> = emptyMap(),
    ) {
        localEventDao.insert(
            LocalEventEntity(
                id = UUID.randomUUID().toString(),
                eventType = type.name,
                aggregateType = aggregateType,
                aggregateId = aggregateId,
                payloadJson = JsonHelper.toJson(payload),
                syncStatus = SyncQueueStatus.PENDING,
                createdAt = System.currentTimeMillis(),
            ),
        )
    }

    suspend fun recordFormOpened(formId: String) =
        record(LocalEventType.FORM_OPENED, "Form", formId)

    suspend fun recordFormSubmitted(formId: String, externalId: String, fieldCount: Int) =
        record(
            LocalEventType.FORM_SUBMITTED,
            "FormSubmission",
            externalId,
            mapOf("formId" to formId, "fieldCount" to fieldCount),
        )

    suspend fun recordMediaCaptured(mediaId: String, mediaType: String, fieldKey: String?) =
        record(
            LocalEventType.MEDIA_CAPTURED,
            "Media",
            mediaId,
            mapOf("mediaType" to mediaType, "fieldKey" to (fieldKey ?: "")),
        )

    suspend fun recordSyncStarted() =
        record(LocalEventType.SYNC_STARTED, "Sync", UUID.randomUUID().toString())

    suspend fun recordSyncCompleted(stats: Map<String, Any?>) =
        record(LocalEventType.SYNC_COMPLETED, "Sync", UUID.randomUUID().toString(), stats)

    suspend fun markSynced(eventId: String) {
        val events = localEventDao.getPending()
        val event = events.find { it.id == eventId } ?: return
        localEventDao.update(event.copy(syncStatus = SyncQueueStatus.SYNCED))
    }

    suspend fun markAllPendingAsSynced() {
        val pending = localEventDao.getPending()
        for (event in pending) {
            localEventDao.update(event.copy(syncStatus = SyncQueueStatus.SYNCED))
        }
    }
}
