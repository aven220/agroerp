package com.agroerp.data.mapper

import com.agroerp.core.util.JsonHelper
import com.agroerp.data.api.FormDto
import com.agroerp.data.local.entities.FormEntity
import com.agroerp.data.local.entities.FormSubmissionEntity
import com.agroerp.data.local.entities.LocalEventEntity
import com.agroerp.data.local.entities.MediaFileEntity
import com.agroerp.data.local.entities.SyncQueueStatus
import com.agroerp.domain.model.ConditionalRule
import com.agroerp.domain.model.FormDefinition
import com.agroerp.domain.model.FormField
import com.agroerp.domain.model.FormFieldOption
import com.agroerp.domain.model.FormSchema
import com.agroerp.domain.model.FormSettings
import com.agroerp.domain.model.FormSubmission
import com.agroerp.domain.model.GpsPoint
import com.agroerp.domain.model.LocalEvent
import com.agroerp.domain.model.LocalEventType
import com.agroerp.domain.model.MediaFile
import com.agroerp.domain.model.SyncState
import com.agroerp.domain.model.CalculatedConfig

object FormMappers {

    fun FormEntity.toDomain(): FormDefinition = FormDefinition(
        id = id,
        formKey = formKey,
        name = name,
        description = description,
        version = version,
        schema = parseSchema(schemaJson),
        status = status,
        publishedAt = publishedAt,
        syncedAt = downloadedAt,
    )

    fun FormDto.toEntity(downloadedAt: Long): FormEntity = FormEntity(
        id = id,
        formKey = formKey,
        name = name,
        description = description,
        version = version,
        schemaJson = JsonHelper.toJson(schema),
        status = status ?: "published",
        publishedAt = publishedAt,
        downloadedAt = downloadedAt,
    )

    fun FormSubmissionEntity.toDomain(): FormSubmission {
        val data = JsonHelper.fromJson<Map<String, Any?>>(dataJson)
        val gps = gpsLocationJson?.let { JsonHelper.fromJson<GpsPoint>(it) }
        val track = gpsTrackJson?.let {
            JsonHelper.fromJson<List<GpsPoint>>(it)
        } ?: emptyList()
        return FormSubmission(
            id = id,
            formId = formId,
            formKey = formKey,
            formVersion = formVersion,
            externalId = externalId,
            data = data,
            gpsLocation = gps,
            gpsTrack = track,
            syncState = syncStatus.toSyncState(),
            serverSubmissionId = serverSubmissionId,
            serverResourceId = serverResourceId,
            createdAt = createdAt,
            errorMessage = lastError,
        )
    }

    fun MediaFileEntity.toDomain(): MediaFile = MediaFile(
        id = id,
        localPath = localPath,
        mimeType = mimeType,
        fieldKey = fieldKey,
        submissionExternalId = submissionExternalId,
        serverResourceId = serverResourceId,
        syncState = syncStatus.toSyncState(),
        sizeBytes = sizeBytes,
        createdAt = createdAt,
    )

    fun LocalEventEntity.toDomain(): LocalEvent = LocalEvent(
        id = id,
        eventType = LocalEventType.valueOf(eventType),
        aggregateType = aggregateType,
        aggregateId = aggregateId,
        payload = JsonHelper.fromJson(payloadJson),
        syncState = syncStatus.toSyncState(),
        createdAt = createdAt,
    )

    fun parseSchema(schemaJson: String): FormSchema = parseSchemaMap(
        JsonHelper.fromJson<Map<String, Any?>>(schemaJson),
    )

    fun parseSchemaMap(schema: Map<String, Any?>): FormSchema {
        val fieldsRaw = schema["fields"] as? List<*> ?: emptyList<Any>()
        val settingsMap = schema["settings"] as? Map<*, *>
        return FormSchema(
            version = (schema["version"] as? Number)?.toInt() ?: 1,
            fields = fieldsRaw.mapNotNull { parseField(it as? Map<*, *>) },
            settings = FormSettings(
                requireGps = settingsMap?.get("requireGps") as? Boolean ?: false,
                offlineCapable = settingsMap?.get("offlineCapable") as? Boolean ?: true,
                allowDraft = settingsMap?.get("allowDraft") as? Boolean ?: true,
                geofence = settingsMap?.get("geofence") as? Map<String, Any>,
            ),
        )
    }

    private fun parseField(map: Map<*, *>?): FormField? {
        if (map == null) return null
        val key = map["key"]?.toString() ?: return null
        val options = (map["options"] as? List<*>)?.mapNotNull { opt ->
            val o = opt as? Map<*, *> ?: return@mapNotNull null
            FormFieldOption(
                value = o["value"]?.toString() ?: return@mapNotNull null,
                label = o["label"]?.toString() ?: o["value"].toString(),
            )
        } ?: emptyList()

        val calcMap = map["calculate"] as? Map<*, *>
        val calculate = calcMap?.let {
            CalculatedConfig(
                expression = it["expression"]?.toString() ?: "",
                dependsOn = (it["dependsOn"] as? List<*>)?.map { d -> d.toString() } ?: emptyList(),
            )
        }

        return FormField(
            key = key,
            type = map["type"]?.toString() ?: "text",
            label = map["label"]?.toString() ?: key,
            description = map["description"]?.toString(),
            required = map["required"] as? Boolean ?: false,
            options = options,
            visibleWhen = parseRules(map["visibleWhen"]),
            requiredWhen = parseRules(map["requiredWhen"]),
            calculate = calculate,
            validation = map["validation"] as? Map<String, Any>,
            relationTo = map["relationTo"]?.toString(),
            metadata = map["metadata"] as? Map<String, Any>,
        )
    }

    private fun parseRules(raw: Any?): List<ConditionalRule> = when (raw) {
        is Map<*, *> -> listOf(parseRule(raw)).filterNotNull()
        is List<*> -> raw.mapNotNull { parseRule(it as? Map<*, *>) }
        else -> emptyList()
    }

    private fun parseRule(map: Map<*, *>?): ConditionalRule? {
        if (map == null) return null
        return ConditionalRule(
            field = map["field"]?.toString() ?: return null,
            operator = map["operator"]?.toString() ?: "eq",
            value = map["value"],
        )
    }

    fun SyncQueueStatus.toSyncState(): SyncState = when (this) {
        SyncQueueStatus.PENDING -> SyncState.PENDING
        SyncQueueStatus.SYNCING -> SyncState.SYNCING
        SyncQueueStatus.SYNCED -> SyncState.SYNCED
        SyncQueueStatus.FAILED -> SyncState.FAILED
    }

    fun SyncState.toEntityStatus(): SyncQueueStatus = when (this) {
        SyncState.PENDING -> SyncQueueStatus.PENDING
        SyncState.SYNCING -> SyncQueueStatus.SYNCING
        SyncState.SYNCED -> SyncQueueStatus.SYNCED
        SyncState.FAILED -> SyncQueueStatus.FAILED
    }
}
