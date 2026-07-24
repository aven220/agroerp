package com.agroerp.data.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

interface CaptureApi {
    @GET("capture/mobile/package")
    suspend fun getMobilePackage(): Response<CapturePackageResponse>

    @GET("capture/mobile/check-version")
    suspend fun checkVersion(
        @Query("packageVersion") packageVersion: String? = null,
    ): Response<CaptureVersionCheckResponse>

    @GET("capture/catalogs")
    suspend fun getCatalogs(
        @Query("keys") keys: String? = null,
    ): Response<CaptureCatalogsResponse>

    @POST("capture/sync")
    suspend fun sync(@Body request: CaptureSyncRequest): Response<CaptureSyncResponse>
}

data class CapturePackageResponse(
    val packageId: String,
    val packageVersion: String,
    val generatedAt: String,
    val organizationId: String,
    val userId: String,
    val assignments: List<CaptureAssignmentDto>,
    val forms: List<CapturePackageFormDto>,
    val catalogKeys: List<String>,
    val offline: CaptureOfflinePolicyDto,
)

data class CaptureAssignmentDto(
    val assignmentId: String,
    val formId: String,
    val status: String,
    val dueAt: String?,
    val contextType: String?,
    val contextId: String?,
    val assignedAt: String,
)

data class CapturePackageFormDto(
    val formId: String,
    val formKey: String,
    val name: String,
    val description: String?,
    val version: Int,
    val status: String,
    val publishedAt: String?,
    val schema: Map<String, Any?>,
    val render: Map<String, Any?>?,
    val assignment: CaptureAssignmentDto?,
    val offline: CaptureFormOfflineDto,
    val requiredCatalogKeys: List<String>,
)

data class CaptureFormOfflineDto(
    val offlineCapable: Boolean,
    val allowDraft: Boolean,
    val requireGps: Boolean,
    val geofence: Map<String, Any?>? = null,
)

data class CaptureOfflinePolicyDto(
    val syncRecommendedIntervalMinutes: Int,
    val maxSubmissionsPerSync: Int,
)

data class CaptureVersionCheckResponse(
    val packageVersion: String,
    val serverTime: String,
    val hasChanges: Boolean,
    val pendingAssignments: Int,
    val forms: List<CaptureFormVersionEntryDto>,
    val catalogsChanged: Boolean,
)

data class CaptureFormVersionEntryDto(
    val formId: String,
    val formKey: String,
    val version: Int,
    val status: String,
    val updatedAt: String,
    val publishedAt: String?,
)

data class CaptureCatalogsResponse(
    val version: String,
    val catalogs: List<CaptureCatalogDto>,
)

data class CaptureCatalogDto(
    val key: String,
    val label: String,
    val dependsOn: String?,
    val options: List<CaptureCatalogOptionDto>,
)

data class CaptureCatalogOptionDto(
    val value: String,
    val label: String,
    val parent: String? = null,
)

data class CaptureSyncRequest(
    val submissions: List<CaptureSyncSubmissionItem>,
    val files: List<CaptureSyncFileItem>? = null,
    val deviceInfo: Map<String, Any?>? = null,
)

data class CaptureSyncSubmissionItem(
    val formId: String,
    val formKey: String? = null,
    val data: Map<String, Any?>,
    val externalId: String,
    val gpsLocation: Map<String, Any?>? = null,
    val gpsTrack: List<Map<String, Any?>>? = null,
    val deviceInfo: Map<String, Any?>? = null,
    val clientCreatedAt: String? = null,
)

data class CaptureSyncFileItem(
    val externalId: String? = null,
    val filename: String? = null,
    val mimeType: String? = null,
    val resourceId: String? = null,
    val fieldKey: String? = null,
    val storageKey: String? = null,
)

data class CaptureSyncResponse(
    val results: List<CaptureSyncResultItem>,
    val filesReceived: Int,
    val processedAt: String,
)

data class CaptureSyncResultItem(
    val externalId: String,
    val status: String,
    val submissionId: String? = null,
    val error: String? = null,
)
