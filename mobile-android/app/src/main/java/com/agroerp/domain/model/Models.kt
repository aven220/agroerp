package com.agroerp.domain.model

enum class SyncState {
    PENDING,
    SYNCING,
    SYNCED,
    FAILED,
}

enum class LocalEventType {
    FORM_OPENED,
    FORM_SUBMITTED,
    MEDIA_CAPTURED,
    SYNC_STARTED,
    SYNC_COMPLETED,
}

data class GpsPoint(
    val lat: Double,
    val lng: Double,
    val accuracy: Float? = null,
    val timestamp: Long? = null,
)

data class FormFieldOption(
    val value: String,
    val label: String,
)

data class ConditionalRule(
    val field: String,
    val operator: String,
    val value: Any? = null,
)

data class CalculatedConfig(
    val expression: String,
    val dependsOn: List<String>,
)

data class FormField(
    val key: String,
    val type: String,
    val label: String,
    val description: String? = null,
    val required: Boolean = false,
    val options: List<FormFieldOption> = emptyList(),
    val visibleWhen: List<ConditionalRule> = emptyList(),
    val requiredWhen: List<ConditionalRule> = emptyList(),
    val calculate: CalculatedConfig? = null,
    val validation: Map<String, Any>? = null,
    val relationTo: String? = null,
    val metadata: Map<String, Any>? = null,
)

data class FormSettings(
    val requireGps: Boolean = false,
    val offlineCapable: Boolean = true,
    val allowDraft: Boolean = true,
    val geofence: Map<String, Any>? = null,
)

data class FormSchema(
    val version: Int,
    val fields: List<FormField>,
    val settings: FormSettings = FormSettings(),
)

data class FormDefinition(
    val id: String,
    val formKey: String,
    val name: String,
    val description: String?,
    val version: Int,
    val schema: FormSchema,
    val status: String,
    val publishedAt: String?,
    val syncedAt: Long,
)

data class FormSubmission(
    val id: String,
    val formId: String,
    val formKey: String,
    val formVersion: Int,
    val externalId: String,
    val data: Map<String, Any?>,
    val gpsLocation: GpsPoint?,
    val gpsTrack: List<GpsPoint>,
    val syncState: SyncState,
    val serverSubmissionId: String? = null,
    val serverResourceId: String? = null,
    val createdAt: Long,
    val errorMessage: String? = null,
)

data class MediaFile(
    val id: String,
    val localPath: String,
    val mimeType: String,
    val fieldKey: String?,
    val submissionExternalId: String?,
    val serverResourceId: String? = null,
    val syncState: SyncState,
    val sizeBytes: Long,
    val createdAt: Long,
)

data class LocalEvent(
    val id: String,
    val eventType: LocalEventType,
    val aggregateType: String,
    val aggregateId: String,
    val payload: Map<String, Any?>,
    val syncState: SyncState,
    val createdAt: Long,
)

data class UserSession(
    val userId: String,
    val email: String,
    val firstName: String,
    val lastName: String,
    val organizationId: String,
    val organizationName: String,
    val roles: List<String>,
    val accessToken: String,
    val refreshToken: String,
)

data class RenderedField(
    val field: FormField,
    val visible: Boolean,
    val effectiveRequired: Boolean,
    val computedValue: Any? = null,
)
