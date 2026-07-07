package com.agroerp.data.mapper

import com.agroerp.core.util.JsonHelper
import com.agroerp.data.api.CaptureCatalogDto
import com.agroerp.data.api.CapturePackageFormDto
import com.agroerp.data.api.CapturePackageResponse
import com.agroerp.data.local.entities.CapturePackageEntity
import com.agroerp.data.local.entities.CatalogEntity
import com.agroerp.data.local.entities.DynamicFormEntity
import com.agroerp.data.local.entities.FormEntity
import com.agroerp.data.local.entities.MediaFileEntity
import com.agroerp.data.local.entities.MediaPendingEntity
import com.agroerp.data.local.entities.FormSubmissionEntity
import com.agroerp.data.local.entities.SubmissionQueueEntity
import java.util.UUID

object CaptureMappers {

    fun CapturePackageFormDto.toFormEntity(downloadedAt: Long): FormEntity = FormEntity(
        id = formId,
        formKey = formKey,
        name = name,
        description = description,
        version = version,
        schemaJson = JsonHelper.toJson(schema),
        status = status.ifBlank { "published" },
        publishedAt = publishedAt,
        downloadedAt = downloadedAt,
    )

    fun CapturePackageFormDto.toDynamicFormEntity(updatedAt: Long): DynamicFormEntity = DynamicFormEntity(
        formId = formId,
        formKey = formKey,
        renderJson = JsonHelper.toJson(render ?: emptyMap<String, Any?>()),
        assignmentJson = assignment?.let { JsonHelper.toJson(it) },
        offlineSettingsJson = JsonHelper.toJson(offline),
        requiredCatalogKeysJson = JsonHelper.toJson(requiredCatalogKeys),
        updatedAt = updatedAt,
    )

    fun CapturePackageResponse.toPackageEntity(downloadedAt: Long): CapturePackageEntity = CapturePackageEntity(
        packageId = packageId,
        packageVersion = packageVersion,
        generatedAt = generatedAt,
        organizationId = organizationId,
        userId = userId,
        catalogKeysJson = JsonHelper.toJson(catalogKeys),
        offlinePolicyJson = JsonHelper.toJson(offline),
        assignmentsJson = JsonHelper.toJson(assignments),
        downloadedAt = downloadedAt,
    )

    fun CaptureCatalogDto.toEntity(syncedAt: Long): CatalogEntity = CatalogEntity(
        id = UUID.nameUUIDFromBytes(key.toByteArray()).toString(),
        catalogKey = key,
        label = label,
        dependsOn = dependsOn,
        optionsJson = JsonHelper.toJson(options),
        syncedAt = syncedAt,
    )

    fun FormSubmissionEntity.toQueueEntity(): SubmissionQueueEntity = SubmissionQueueEntity(
        id = externalId,
        submissionId = id,
        externalId = externalId,
        formId = formId,
        status = syncStatus,
        retryCount = retryCount,
        lastError = lastError,
        enqueuedAt = createdAt,
        updatedAt = updatedAt,
    )

    fun MediaFileEntity.toPendingEntity(): MediaPendingEntity = MediaPendingEntity(
        id = id,
        mediaFileId = id,
        localPath = localPath,
        mimeType = mimeType,
        filename = filename,
        sizeBytes = sizeBytes,
        mediaType = mediaType,
        fieldKey = fieldKey,
        submissionExternalId = submissionExternalId,
        serverResourceId = serverResourceId,
        syncStatus = syncStatus,
        retryCount = retryCount,
        lastError = lastError,
        createdAt = createdAt,
    )
}
