package com.agroerp.prm.data.api

import com.google.gson.annotations.SerializedName
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST

data class EopMobileTelemetryRequest(
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("eventType") val eventType: String,
    val message: String? = null,
    @SerializedName("stackTrace") val stackTrace: String? = null,
    @SerializedName("durationMs") val durationMs: Long? = null,
    @SerializedName("isOffline") val isOffline: Boolean = false,
    @SerializedName("appVersion") val appVersion: String? = null,
)

data class EopMobileTelemetryBatchRequest(
    val events: List<EopMobileTelemetryRequest>,
)

data class EopMobileTelemetryDto(
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("eventType") val eventType: String,
    val message: String?,
    @SerializedName("isOffline") val isOffline: Boolean,
    @SerializedName("recordedAt") val recordedAt: String,
)

interface EopApi {
    @POST("eop/mobile/telemetry")
    suspend fun ingest(
        @Header("Authorization") authorization: String,
        @Body body: EopMobileTelemetryRequest,
    ): Map<String, Any>

    @POST("eop/mobile/telemetry/batch")
    suspend fun ingestBatch(
        @Header("Authorization") authorization: String,
        @Body body: EopMobileTelemetryBatchRequest,
    ): List<Map<String, Any>>

    @GET("eop/mobile/telemetry")
    suspend fun list(@Header("Authorization") authorization: String): List<EopMobileTelemetryDto>
}
