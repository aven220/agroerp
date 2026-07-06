package com.agroerp.prm.data.api

import com.google.gson.annotations.SerializedName
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST

data class EpopMobilePerfRequest(
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("startupMs") val startupMs: Long? = null,
    @SerializedName("memoryMb") val memoryMb: Double? = null,
    @SerializedName("batteryPct") val batteryPct: Double? = null,
    val fps: Double? = null,
    @SerializedName("syncMs") val syncMs: Long? = null,
    @SerializedName("listRenderMs") val listRenderMs: Long? = null,
    @SerializedName("offlineOps") val offlineOps: Int = 0,
)

data class EpopMobileSummary(
    val samples: Int,
    @SerializedName("avgStartupMs") val avgStartupMs: Double,
    @SerializedName("avgMemoryMb") val avgMemoryMb: Double,
    @SerializedName("avgFps") val avgFps: Double,
    @SerializedName("avgSyncMs") val avgSyncMs: Double,
    @SerializedName("avgListRenderMs") val avgListRenderMs: Double,
    @SerializedName("offlineOps") val offlineOps: Int,
    @SerializedName("offlineFirst") val offlineFirst: Boolean,
)

interface EpopApi {
    @POST("epop/mobile")
    suspend fun ingest(
        @Header("Authorization") authorization: String,
        @Body body: EpopMobilePerfRequest,
    ): Map<String, Any>

    @GET("epop/mobile")
    suspend fun summary(@Header("Authorization") authorization: String): EpopMobileSummary
}
