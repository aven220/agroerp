package com.agroerp.prm.data.api

import com.google.gson.annotations.SerializedName
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

data class BiKpiRealtimeDto(
    val id: String,
    @SerializedName("kpiKey") val kpiKey: String,
    val name: String,
    val color: String? = null,
    val unit: String? = null,
    @SerializedName("currentValue") val currentValue: Double? = null,
    @SerializedName("targetValue") val targetValue: Double? = null,
    @SerializedName("variancePct") val variancePct: Double? = null,
)

data class BiCenterDto(
    @SerializedName("dashboardCount") val dashboardCount: Int,
    @SerializedName("kpiCount") val kpiCount: Int,
    @SerializedName("reportCount") val reportCount: Int,
    val executive: Map<String, Any>? = null,
)

data class BiDashboardDto(
    val id: String,
    @SerializedName("dashboardKey") val dashboardKey: String,
    val name: String,
    val category: String,
    val status: String,
)

data class BiRealtimeDto(
    val timestamp: String,
    val kpis: List<BiKpiRealtimeDto>,
    val indicators: Map<String, Int>? = null,
)

interface BiApi {
    @GET("ebiap/center")
    suspend fun getCenter(@Header("Authorization") token: String): BiCenterDto

    @GET("ebiap/realtime")
    suspend fun getRealtime(@Header("Authorization") token: String): BiRealtimeDto

    @GET("ebiap/dashboards")
    suspend fun listDashboards(@Header("Authorization") token: String): List<BiDashboardDto>

    @GET("ebiap/dashboards/category/{category}")
    suspend fun getCategoryData(
        @Header("Authorization") token: String,
        @Path("category") category: String,
    ): Map<String, Any>

    @GET("ebiap/kpis/realtime")
    suspend fun getKpiRealtime(@Header("Authorization") token: String): List<BiKpiRealtimeDto>

    @POST("ebiap/kpis/{id}/capture")
    suspend fun captureKpi(
        @Header("Authorization") token: String,
        @Path("id") id: String,
    ): Map<String, Any>
}
