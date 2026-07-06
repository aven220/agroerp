package com.agroerp.sync

import com.agroerp.core.util.JsonHelper
import com.agroerp.data.local.dao.SyncQueueDao
import com.agroerp.data.local.entities.SyncQueueEntity
import com.agroerp.data.local.entities.SyncQueueStatus
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class OutboxManager @Inject constructor(
    private val syncQueueDao: SyncQueueDao,
) {
    suspend fun enqueueSubmission(submissionId: String, externalId: String) {
        enqueue("submission", submissionId, "PUSH_SUBMISSION", mapOf("externalId" to externalId))
    }

    suspend fun enqueueMedia(mediaId: String) {
        enqueue("media", mediaId, "UPLOAD_MEDIA", mapOf("mediaId" to mediaId))
    }

    private suspend fun enqueue(
        entityType: String,
        entityId: String,
        operation: String,
        payload: Map<String, Any?>,
    ) {
        syncQueueDao.insert(
            SyncQueueEntity(
                id = UUID.randomUUID().toString(),
                entityType = entityType,
                entityId = entityId,
                operation = operation,
                payloadJson = JsonHelper.toJson(payload),
                status = SyncQueueStatus.PENDING,
                createdAt = System.currentTimeMillis(),
            ),
        )
    }
}
