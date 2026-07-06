package com.agroerp.prm.data.api

import com.google.gson.annotations.SerializedName
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST

data class CpepTicketRequest(
    @SerializedName("producerName") val producerName: String,
    @SerializedName("identityDoc") val identityDoc: String? = null,
    @SerializedName("vehiclePlate") val vehiclePlate: String? = null,
    @SerializedName("farmName") val farmName: String? = null,
    @SerializedName("lotCode") val lotCode: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val notes: String? = null,
)

data class CpepTicketDto(
    @SerializedName("ticketKey") val ticketKey: String,
    val status: String,
    @SerializedName("producerName") val producerName: String?,
    @SerializedName("turnNumber") val turnNumber: Int?,
    @SerializedName("netWeightKg") val netWeightKg: Double?,
    @SerializedName("qrCode") val qrCode: String?,
)

data class CpepPhotoRequest(
    @SerializedName("photoKey") val photoKey: String,
    @SerializedName("photoType") val photoType: String = "reception",
    @SerializedName("storageUrl") val storageUrl: String? = null,
    val caption: String? = null,
)

data class CpepSignatureRequest(
    @SerializedName("signerRole") val signerRole: String,
    @SerializedName("signerName") val signerName: String,
    @SerializedName("signatureData") val signatureData: String,
)

data class CpepMobileConfigDto(
    @SerializedName("syncedAt") val syncedAt: String,
    val catalogs: List<Map<String, Any>>,
    val parameters: List<Map<String, Any>>,
    @SerializedName("receptionRules") val receptionRules: List<Map<String, Any>>,
    @SerializedName("purchaseCenters") val purchaseCenters: List<Map<String, Any>>,
    @SerializedName("priceConfigs") val priceConfigs: List<Map<String, Any>>,
)

data class CpepWeighRequest(
    @SerializedName("grossWeightKg") val grossWeightKg: Double,
    @SerializedName("tareWeightKg") val tareWeightKg: Double,
    val source: String = "manual_contingency",
    val contingency: Boolean = true,
    @SerializedName("contingencyReason") val contingencyReason: String,
    @SerializedName("photoUrl") val photoUrl: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    @SerializedName("scaleKey") val scaleKey: String? = null,
    @SerializedName("iotDeviceKey") val iotDeviceKey: String? = null,
)

data class CpepScaleDto(
    @SerializedName("scaleKey") val scaleKey: String,
    val name: String,
    val status: String,
    @SerializedName("connectionType") val connectionType: String?,
    @SerializedName("lastWeightKg") val lastWeightKg: Double?,
)

data class CpepPendingWeighDto(
    @SerializedName("ticketKey") val ticketKey: String,
    val status: String,
    @SerializedName("producerName") val producerName: String?,
    @SerializedName("turnNumber") val turnNumber: Int?,
)

interface CpepApi {
    @GET("cpep/mobile/queue")
    suspend fun queue(@Header("Authorization") authorization: String): List<CpepTicketDto>

    @GET("cpep/mobile/config")
    suspend fun mobileConfig(@Header("Authorization") authorization: String): CpepMobileConfigDto


    @POST("cpep/mobile/tickets")
    suspend fun createTicket(
        @Header("Authorization") authorization: String,
        @Body body: CpepTicketRequest,
    ): CpepTicketDto

    @POST("cpep/tickets/{ticketKey}/photos")
    suspend fun addPhoto(
        @Header("Authorization") authorization: String,
        @retrofit2.http.Path("ticketKey") ticketKey: String,
        @Body body: CpepPhotoRequest,
    ): Map<String, Any>

    @POST("cpep/tickets/{ticketKey}/signatures")
    suspend fun addSignature(
        @Header("Authorization") authorization: String,
        @retrofit2.http.Path("ticketKey") ticketKey: String,
        @Body body: CpepSignatureRequest,
    ): Map<String, Any>

    @GET("cpep/mobile/weighing/pending")
    suspend fun weighingPending(@Header("Authorization") authorization: String): List<CpepPendingWeighDto>

    @POST("cpep/mobile/weighing/{ticketKey}")
    suspend fun mobileWeigh(
        @Header("Authorization") authorization: String,
        @retrofit2.http.Path("ticketKey") ticketKey: String,
        @Body body: CpepWeighRequest,
    ): Map<String, Any>

    @GET("cpep/scales")
    suspend fun scales(@Header("Authorization") authorization: String): List<CpepScaleDto>

    @POST("cpep/scales/{scaleKey}/heartbeat")
    suspend fun scaleHeartbeat(
        @Header("Authorization") authorization: String,
        @retrofit2.http.Path("scaleKey") scaleKey: String,
        @Body body: Map<String, @JvmSuppressWildcards Any>,
    ): Map<String, Any>

    @GET("cpep/mobile/quality/pending")
    suspend fun qualityPending(@Header("Authorization") authorization: String): List<CpepPendingWeighDto>

    @GET("cpep/quality")
    suspend fun qualityHistory(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @POST("cpep/mobile/quality/{ticketKey}")
    suspend fun mobileQuality(
        @Header("Authorization") authorization: String,
        @retrofit2.http.Path("ticketKey") ticketKey: String,
        @Body body: CpepQualityRequest,
    ): Map<String, Any>

    @GET("cpep/mobile/settlements/pending")
    suspend fun settlementsPending(@Header("Authorization") authorization: String): List<CpepPendingWeighDto>

    @GET("cpep/settlements")
    suspend fun settlements(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @POST("cpep/mobile/settlements/{ticketKey}")
    suspend fun mobileSettle(
        @Header("Authorization") authorization: String,
        @retrofit2.http.Path("ticketKey") ticketKey: String,
        @Body body: CpepSettlementRequest,
    ): Map<String, Any>

    @POST("cpep/mobile/settlements/{ticketKey}/sign")
    suspend fun mobileSettlementSign(
        @Header("Authorization") authorization: String,
        @retrofit2.http.Path("ticketKey") ticketKey: String,
        @Body body: CpepSettlementSignRequest,
    ): Map<String, Any>

    @GET("cpep/mobile/inventory/lots")
    suspend fun inventoryLots(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("cpep/mobile/inventory/qr/{code}")
    suspend fun inventoryByQr(
        @Header("Authorization") authorization: String,
        @retrofit2.http.Path("code") code: String,
    ): Map<String, Any>

    @GET("cpep/mobile/ops")
    suspend fun mobileOps(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("cpep/mobile/kpis")
    suspend fun mobileKpis(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("cpep/mobile/alerts")
    suspend fun mobileAlerts(@Header("Authorization") authorization: String): List<Map<String, Any>>
}

data class CpepSettlementRequest(
    @SerializedName("basePricePerKg") val basePricePerKg: Double,
    @SerializedName("transportTotal") val transportTotal: Double? = null,
    @SerializedName("advancesTotal") val advancesTotal: Double? = null,
    @SerializedName("discountsTotal") val discountsTotal: Double? = null,
    @SerializedName("paidAmount") val paidAmount: Double? = null,
)

data class CpepSettlementSignRequest(
    @SerializedName("signerName") val signerName: String,
    @SerializedName("signatureData") val signatureData: String,
)

data class CpepQualityRequest(
    @SerializedName("humidityPct") val humidityPct: Double? = null,
    @SerializedName("temperatureC") val temperatureC: Double? = null,
    val factor: Double? = null,
    @SerializedName("pasillaPct") val pasillaPct: Double? = null,
    @SerializedName("brocaPct") val brocaPct: Double? = null,
    @SerializedName("blackBeansPct") val blackBeansPct: Double? = null,
    @SerializedName("vinegarBeansPct") val vinegarBeansPct: Double? = null,
    @SerializedName("brokenBeansPct") val brokenBeansPct: Double? = null,
    @SerializedName("foreignMatterPct") val foreignMatterPct: Double? = null,
    @SerializedName("impuritiesPct") val impuritiesPct: Double? = null,
    val color: String? = null,
    val odor: String? = null,
    val observations: String? = null,
    @SerializedName("inspectorComments") val inspectorComments: String? = null,
    @SerializedName("photoKeys") val photoKeys: List<String>? = null,
)
