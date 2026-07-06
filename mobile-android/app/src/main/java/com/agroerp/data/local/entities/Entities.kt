package com.agroerp.data.local.entities

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

enum class SyncQueueStatus {
    PENDING,
    SYNCING,
    SYNCED,
    FAILED,
}

@Entity(tableName = "forms")
data class FormEntity(
    @PrimaryKey val id: String,
    val formKey: String,
    val name: String,
    val description: String?,
    val version: Int,
    val schemaJson: String,
    val status: String = "published",
    val publishedAt: String?,
    val downloadedAt: Long,
)

@Entity(
    tableName = "form_submissions",
    indices = [
        Index("formId"),
        Index("externalId", unique = true),
        Index("syncStatus"),
    ],
)
data class FormSubmissionEntity(
    @PrimaryKey val id: String,
    val externalId: String,
    val formId: String,
    val formKey: String,
    val formVersion: Int,
    val dataJson: String,
    val gpsLocationJson: String?,
    val gpsTrackJson: String?,
    val deviceInfoJson: String?,
    val serverSubmissionId: String?,
    val serverResourceId: String?,
    val syncStatus: SyncQueueStatus,
    val retryCount: Int = 0,
    val lastError: String? = null,
    val createdAt: Long,
    val updatedAt: Long,
)

@Entity(
    tableName = "sync_queue",
    indices = [Index("status"), Index("createdAt")],
)
data class SyncQueueEntity(
    @PrimaryKey val id: String,
    val entityType: String,
    val entityId: String,
    val operation: String,
    val payloadJson: String,
    val status: SyncQueueStatus,
    val retryCount: Int = 0,
    val lastError: String? = null,
    val nextRetryAt: Long? = null,
    val createdAt: Long,
)

@Entity(tableName = "sync_state")
data class SyncStateEntity(
    @PrimaryKey val id: Int = 1,
    val lastPullCursor: String = "0",
    val lastPullAt: Long? = null,
    val lastPushAt: Long? = null,
    val lastFullSyncAt: Long? = null,
)

@Entity(
    tableName = "local_events",
    indices = [Index("syncStatus"), Index("createdAt")],
)
data class LocalEventEntity(
    @PrimaryKey val id: String,
    val eventType: String,
    val aggregateType: String,
    val aggregateId: String,
    val payloadJson: String,
    val syncStatus: SyncQueueStatus,
    val createdAt: Long,
)

@Entity(
    tableName = "media_files",
    indices = [Index("syncStatus"), Index("localPath")],
)
data class MediaFileEntity(
    @PrimaryKey val id: String,
    val localPath: String,
    val mimeType: String,
    val filename: String,
    val sizeBytes: Long,
    val mediaType: String,
    val fieldKey: String?,
    val submissionExternalId: String?,
    val serverResourceId: String?,
    val gpsLocationJson: String?,
    val syncStatus: SyncQueueStatus,
    val retryCount: Int = 0,
    val lastError: String? = null,
    val createdAt: Long,
)

@Entity(
    tableName = "resources_cache",
    indices = [Index("resourceType"), Index("syncStatus")],
)
data class ResourceCacheEntity(
    @PrimaryKey val id: String,
    val externalId: String?,
    val organizationId: String,
    val resourceType: String,
    val dataJson: String,
    val metadataJson: String,
    val status: String,
    val version: Int,
    val syncStatus: SyncQueueStatus,
    val updatedAt: Long,
)

@Entity(tableName = "session")
data class SessionEntity(
    @PrimaryKey val id: Int = 1,
    val userId: String,
    val email: String,
    val firstName: String,
    val lastName: String,
    val organizationId: String,
    val organizationName: String,
    val rolesJson: String,
    val loggedInAt: Long,
)
