package com.agroerp.prm.data.api

import com.google.gson.annotations.SerializedName
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

data class ProducerDto(
    val id: String,
    @SerializedName("producerNumber") val producerNumber: String,
    @SerializedName("producerTypeCode") val producerTypeCode: String,
    @SerializedName("legalName") val legalName: String,
    @SerializedName("documentTypeCode") val documentTypeCode: String,
    @SerializedName("documentNumber") val documentNumber: String,
    @SerializedName("municipalityCode") val municipalityCode: String?,
    @SerializedName("veredaCode") val veredaCode: String?,
    val latitude: Double?,
    val longitude: Double?,
    @SerializedName("lifecycleStatus") val lifecycleStatus: String,
    @SerializedName("categoryCode") val categoryCode: String?,
    @SerializedName("qualityScore") val qualityScore: Int,
    val version: Int,
    val notes: String?,
)

data class ProducerListResponse(
    val items: List<ProducerDto>,
)

data class CreateProducerRequest(
    @SerializedName("producerTypeCode") val producerTypeCode: String,
    @SerializedName("legalName") val legalName: String,
    @SerializedName("documentTypeCode") val documentTypeCode: String,
    @SerializedName("documentNumber") val documentNumber: String,
    @SerializedName("municipalityCode") val municipalityCode: String? = null,
    @SerializedName("veredaCode") val veredaCode: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    @SerializedName("externalId") val externalId: String? = null,
    val notes: String? = null,
    @SerializedName("photoContentId") val photoContentId: String? = null,
    @SerializedName("signatureContentId") val signatureContentId: String? = null,
)

data class SyncItem(
    @SerializedName("externalId") val externalId: String,
    val data: CreateProducerRequest,
)

data class SyncRequest(val items: List<SyncItem>)

data class SyncResultItem(
    @SerializedName("externalId") val externalId: String,
    val status: String,
    @SerializedName("producerId") val producerId: String?,
    val error: String?,
)

data class SyncResponse(val results: List<SyncResultItem>)

data class BootstrapResponse(
    val producers: List<ProducerDto>,
    @SerializedName("syncedAt") val syncedAt: String,
)

interface PrmApi {
    @GET("prm/producers")
    suspend fun listProducers(
        @Header("Authorization") token: String,
        @Query("limit") limit: Int = 500,
    ): ProducerListResponse

    @GET("prm/producers/{id}")
    suspend fun getProducer(
        @Header("Authorization") token: String,
        @Path("id") id: String,
    ): ProducerDto

    @POST("prm/producers")
    suspend fun createProducer(
        @Header("Authorization") token: String,
        @Body body: CreateProducerRequest,
    ): ProducerDto

    @PATCH("prm/producers/{id}")
    suspend fun updateProducer(
        @Header("Authorization") token: String,
        @Path("id") id: String,
        @Body body: Map<String, @JvmSuppressWildcards Any>,
    ): ProducerDto

    @POST("prm/producers/sync")
    suspend fun syncBatch(
        @Header("Authorization") token: String,
        @Body body: SyncRequest,
    ): SyncResponse

    @GET("prm/producers/bootstrap")
    suspend fun bootstrap(
        @Header("Authorization") token: String,
    ): BootstrapResponse
}
