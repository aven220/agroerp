package com.agroerp.data.local.entities

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(tableName = "capture_packages")
data class CapturePackageEntity(
    @PrimaryKey val id: Int = 1,
    val packageId: String,
    val packageVersion: String,
    val generatedAt: String,
    val organizationId: String,
    val userId: String,
    val catalogKeysJson: String,
    val offlinePolicyJson: String,
    val assignmentsJson: String,
    val downloadedAt: Long,
)

@Entity(
    tableName = "dynamic_forms",
    indices = [Index("formKey")],
)
data class DynamicFormEntity(
    @PrimaryKey val formId: String,
    val formKey: String,
    val renderJson: String,
    val assignmentJson: String?,
    val offlineSettingsJson: String,
    val requiredCatalogKeysJson: String,
    val updatedAt: Long,
)

@Entity(
    tableName = "capture_catalogs",
    indices = [Index("catalogKey", unique = true)],
)
data class CatalogEntity(
    @PrimaryKey val id: String,
    val catalogKey: String,
    val label: String,
    val dependsOn: String?,
    val optionsJson: String,
    val syncedAt: Long,
)

@Entity(
    tableName = "submission_queue",
    indices = [Index("externalId", unique = true), Index("status")],
)
data class SubmissionQueueEntity(
    @PrimaryKey val id: String,
    val submissionId: String,
    val externalId: String,
    val formId: String,
    val status: SyncQueueStatus,
    val retryCount: Int = 0,
    val lastError: String? = null,
    val enqueuedAt: Long,
    val updatedAt: Long,
)

@Entity(
    tableName = "media_pending",
    indices = [Index("syncStatus"), Index("localPath")],
)
data class MediaPendingEntity(
    @PrimaryKey val id: String,
    val mediaFileId: String,
    val localPath: String,
    val mimeType: String,
    val filename: String,
    val sizeBytes: Long,
    val mediaType: String,
    val fieldKey: String?,
    val submissionExternalId: String?,
    val serverResourceId: String?,
    val syncStatus: SyncQueueStatus,
    val retryCount: Int = 0,
    val lastError: String? = null,
    val createdAt: Long,
)
