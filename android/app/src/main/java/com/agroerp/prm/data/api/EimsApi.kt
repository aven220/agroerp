package com.agroerp.prm.data.api

import com.google.gson.annotations.SerializedName
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

data class EimsItemDto(
    @SerializedName("itemKey") val itemKey: String,
    val name: String,
    @SerializedName("itemTypeKey") val itemTypeKey: String?,
    @SerializedName("qrCode") val qrCode: String?,
    val barcode: String?,
    @SerializedName("uomKey") val uomKey: String?,
    @SerializedName("trackLot") val trackLot: Boolean?,
)

data class EimsMovementRequest(
    @SerializedName("movementType") val movementType: String,
    @SerializedName("itemKey") val itemKey: String,
    val quantity: Double,
    @SerializedName("fromWarehouseKey") val fromWarehouseKey: String? = null,
    @SerializedName("toWarehouseKey") val toWarehouseKey: String? = null,
    @SerializedName("lotKey") val lotKey: String? = null,
    @SerializedName("unitCost") val unitCost: Double? = null,
    val reason: String? = null,
    val source: String = "mobile",
)

interface EimsApi {
    @GET("eims/mobile/items")
    suspend fun items(@Header("Authorization") authorization: String): List<EimsItemDto>

    @GET("eims/mobile/items/code/{code}")
    suspend fun itemByCode(
        @Header("Authorization") authorization: String,
        @Path("code") code: String,
    ): Map<String, Any>

    @GET("eims/mobile/catalogs")
    suspend fun catalogs(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @POST("eims/mobile/movements")
    suspend fun postMovement(
        @Header("Authorization") authorization: String,
        @Body body: EimsMovementRequest,
    ): Map<String, Any>

    @GET("eims/stock")
    suspend fun stock(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("eims/mobile/kardex")
    suspend fun kardex(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("eims/mobile/costs")
    suspend fun costs(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("eims/mobile/lots")
    suspend fun lots(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("eims/mobile/lots/code/{code}")
    suspend fun lotByCode(
        @Header("Authorization") authorization: String,
        @Path("code") code: String,
    ): Map<String, Any>

    @GET("eims/mobile/lots/{lotKey}/timeline")
    suspend fun lotTimeline(
        @Header("Authorization") authorization: String,
        @Path("lotKey") lotKey: String,
    ): List<Map<String, Any>>

    @POST("eims/mobile/lots/incidents")
    suspend fun registerIncident(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, @JvmSuppressWildcards Any>,
    ): Map<String, Any>

    @GET("eims/mobile/counts")
    suspend fun counts(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("eims/mobile/counts/{countKey}")
    suspend fun count(
        @Header("Authorization") authorization: String,
        @Path("countKey") countKey: String,
    ): Map<String, Any>

    @POST("eims/mobile/counts/{countKey}/capture")
    suspend fun captureCount(
        @Header("Authorization") authorization: String,
        @Path("countKey") countKey: String,
        @Body body: Map<String, @JvmSuppressWildcards Any>,
    ): Map<String, Any>

    @POST("eims/mobile/counts/{countKey}/capture/batch")
    suspend fun captureCountBatch(
        @Header("Authorization") authorization: String,
        @Path("countKey") countKey: String,
        @Body body: Map<String, @JvmSuppressWildcards Any>,
    ): Map<String, Any>

    @POST("eims/mobile/counts/{countKey}/photos")
    suspend fun countPhoto(
        @Header("Authorization") authorization: String,
        @Path("countKey") countKey: String,
        @Body body: Map<String, @JvmSuppressWildcards Any>,
    ): Map<String, Any>

    @GET("eims/mobile/reservations")
    suspend fun reservations(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("eims/mobile/supply/alerts")
    suspend fun supplyAlerts(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("eims/mobile/supply/suggestions")
    suspend fun supplySuggestions(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("eims/mobile/ops/kpis")
    suspend fun opsKpis(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("eims/mobile/ops/alerts")
    suspend fun opsAlerts(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("eims/mobile/ops/reports/runs")
    suspend fun opsReportRuns(@Header("Authorization") authorization: String): List<Map<String, Any>>
}
