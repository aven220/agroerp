package com.agroerp.data.mapper

import com.agroerp.core.util.JsonHelper
import com.agroerp.data.local.entities.DynamicFormEntity
import com.agroerp.data.local.entities.FormEntity
import com.agroerp.domain.model.FormDefinition
import com.agroerp.domain.model.FormSchema

/**
 * Maps Capture Engine persistence ([DynamicFormEntity]) to the UI domain model.
 * Legacy [FormEntity] metadata is merged when available for progressive migration.
 */
object CaptureFormMapper {

    fun DynamicFormEntity.toFormDefinition(legacy: FormEntity? = null): FormDefinition {
        val render = JsonHelper.fromJson<Map<String, Any?>>(renderJson)
        val offline = JsonHelper.fromJson<Map<String, Any?>>(offlineSettingsJson)
        val schema = buildSchema(render, offline)

        return FormDefinition(
            id = formId,
            formKey = formKey,
            name = legacy?.name ?: formKey,
            description = legacy?.description,
            version = legacy?.version
                ?: (render["schemaVersion"] as? Number)?.toInt()
                ?: schema.version,
            schema = schema,
            status = legacy?.status ?: "published",
            publishedAt = legacy?.publishedAt,
            syncedAt = legacy?.downloadedAt ?: updatedAt,
        )
    }

    private fun buildSchema(
        render: Map<String, Any?>,
        offline: Map<String, Any?>,
    ): FormSchema {
        val settings = mergeSettings(render["settings"], offline)
        val schemaMap = mapOf(
            "version" to (render["schemaVersion"] ?: 1),
            "fields" to (render["fields"] ?: emptyList<Any>()),
            "settings" to settings,
        )
        return FormMappers.parseSchemaMap(schemaMap)
    }

    private fun mergeSettings(
        renderSettings: Any?,
        offline: Map<String, Any?>,
    ): Map<String, Any?> {
        val base = (renderSettings as? Map<*, *>)?.mapKeys { it.key.toString() }
            ?.mapValues { it.value }
            ?.toMutableMap()
            ?: mutableMapOf()

        offline["requireGps"]?.let { base["requireGps"] = it }
        offline["offlineCapable"]?.let { base["offlineCapable"] = it }
        offline["allowDraft"]?.let { base["allowDraft"] = it }
        offline["geofence"]?.let { base["geofence"] = it }

        return base
    }
}
