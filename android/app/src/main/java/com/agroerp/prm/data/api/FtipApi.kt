package com.agroerp.prm.data.api

import com.google.gson.annotations.SerializedName
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

data class FarmDto(
    val id: String,
    @SerializedName("farmCode") val farmCode: String,
    @SerializedName("farmName") val farmName: String,
    @SerializedName("farmTypeCode") val farmTypeCode: String,
    @SerializedName("municipalityCode") val municipalityCode: String?,
    @SerializedName("veredaCode") val veredaCode: String?,
    @SerializedName("totalAreaHa") val totalAreaHa: Double?,
    @SerializedName("centroidLatitude") val centroidLatitude: Double?,
    @SerializedName("centroidLongitude") val centroidLongitude: Double?,
    val status: String,
    val version: Int,
    @SerializedName("boundaryGeo") val boundaryGeo: Map<String, Any>?,
    val observations: String?,
)

data class FarmListResponse(
    val items: List<FarmDto>,
)

data class CreateFarmRequest(
    @SerializedName("farmName") val farmName: String,
    @SerializedName("farmTypeCode") val farmTypeCode: String,
    @SerializedName("municipalityCode") val municipalityCode: String? = null,
    @SerializedName("veredaCode") val veredaCode: String? = null,
    @SerializedName("producerId") val producerId: String? = null,
    @SerializedName("centroidLatitude") val centroidLatitude: Double? = null,
    @SerializedName("centroidLongitude") val centroidLongitude: Double? = null,
    @SerializedName("totalAreaHa") val totalAreaHa: Double? = null,
    @SerializedName("boundaryGeo") val boundaryGeo: Map<String, Any>? = null,
    val observations: String? = null,
    @SerializedName("externalId") val externalId: String? = null,
    @SerializedName("photoContentId") val photoContentId: String? = null,
    @SerializedName("signatureContentId") val signatureContentId: String? = null,
)

data class FarmSyncItem(
    @SerializedName("externalId") val externalId: String,
    val data: CreateFarmRequest,
    @SerializedName("boundaryGeo") val boundaryGeo: Map<String, Any>? = null,
)

data class FarmSyncRequest(val items: List<FarmSyncItem>)

data class FarmSyncResultItem(
    @SerializedName("externalId") val externalId: String,
    val status: String,
    @SerializedName("farmId") val farmId: String?,
    val error: String?,
)

data class FarmSyncResponse(val results: List<FarmSyncResultItem>)

data class FarmBootstrapResponse(
    val farms: List<FarmDto>,
    @SerializedName("syncedAt") val syncedAt: String,
)

data class SetGeometryRequest(
    @SerializedName("geometryGeo") val geometryGeo: Map<String, Any>,
    val source: String = "android",
)

interface FtipApi {
    @GET("ftip/farms")
    suspend fun listFarms(
        @Header("Authorization") token: String,
        @Query("limit") limit: Int = 500,
    ): FarmListResponse

    @GET("ftip/farms/{id}")
    suspend fun getFarm(
        @Header("Authorization") token: String,
        @Path("id") id: String,
    ): FarmDto

    @POST("ftip/farms")
    suspend fun createFarm(
        @Header("Authorization") token: String,
        @Body body: CreateFarmRequest,
    ): FarmDto

    @PATCH("ftip/farms/{id}")
    suspend fun updateFarm(
        @Header("Authorization") token: String,
        @Path("id") id: String,
        @Body body: Map<String, @JvmSuppressWildcards Any>,
    ): FarmDto

    @POST("ftip/farms/sync")
    suspend fun syncBatch(
        @Header("Authorization") token: String,
        @Body body: FarmSyncRequest,
    ): FarmSyncResponse

    @GET("ftip/farms/bootstrap")
    suspend fun bootstrap(
        @Header("Authorization") token: String,
    ): FarmBootstrapResponse

    @POST("ftip/farms/{id}/geometry")
    suspend fun setGeometry(
        @Header("Authorization") token: String,
        @Path("id") id: String,
        @Body body: SetGeometryRequest,
    ): Map<String, Any>
}
