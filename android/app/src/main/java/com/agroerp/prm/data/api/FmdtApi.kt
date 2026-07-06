package com.agroerp.prm.data.api

import com.google.gson.annotations.SerializedName
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

data class FieldLotDto(
    val id: String,
    @SerializedName("lotCode") val lotCode: String,
    @SerializedName("lotName") val lotName: String,
    @SerializedName("lotTypeCode") val lotTypeCode: String,
    @SerializedName("ftipLotUnitId") val ftipLotUnitId: String,
    @SerializedName("farmUnitId") val farmUnitId: String,
    @SerializedName("totalAreaHa") val totalAreaHa: Double?,
    @SerializedName("plantedAreaHa") val plantedAreaHa: Double?,
    @SerializedName("centroidLatitude") val centroidLatitude: Double?,
    @SerializedName("centroidLongitude") val centroidLongitude: Double?,
    val status: String,
    val version: Int,
    @SerializedName("boundaryGeoRef") val boundaryGeoRef: Map<String, Any>?,
    val observations: String?,
    @SerializedName("agronomicStates") val agronomicStates: List<LotAgronomicStateDto>?,
)

data class LotAgronomicStateDto(
    @SerializedName("primaryCropCode") val primaryCropCode: String,
)

data class CreateFieldLotRequest(
    @SerializedName("ftipLotUnitId") val ftipLotUnitId: String,
    @SerializedName("lotName") val lotName: String,
    @SerializedName("lotTypeCode") val lotTypeCode: String = "productive",
    @SerializedName("primaryCropCode") val primaryCropCode: String? = "coffee",
    @SerializedName("centroidLatitude") val centroidLatitude: Double? = null,
    @SerializedName("centroidLongitude") val centroidLongitude: Double? = null,
    @SerializedName("totalAreaHa") val totalAreaHa: Double? = null,
    @SerializedName("plantedAreaHa") val plantedAreaHa: Double? = null,
    @SerializedName("boundaryGeoRef") val boundaryGeoRef: Map<String, Any>? = null,
    val observations: String? = null,
    @SerializedName("externalId") val externalId: String? = null,
)

data class FieldLotSyncItem(
    @SerializedName("externalId") val externalId: String,
    val data: CreateFieldLotRequest,
)

data class FieldOperationSyncItem(
    @SerializedName("externalId") val externalId: String,
    @SerializedName("fieldLotId") val fieldLotId: String,
    val data: CreateFieldOperationRequest,
)

data class CreateFieldOperationRequest(
    @SerializedName("operationTypeCode") val operationTypeCode: String,
    @SerializedName("operationDate") val operationDate: String,
    @SerializedName("performedByType") val performedByType: String = "technician",
    @SerializedName("areaTreatedHa") val areaTreatedHa: Double,
    @SerializedName("externalId") val externalId: String? = null,
    val notes: String? = null,
)

data class FieldLotSyncRequest(
    val lots: List<FieldLotSyncItem> = emptyList(),
    val operations: List<FieldOperationSyncItem> = emptyList(),
)

data class FieldLotSyncResultItem(
    @SerializedName("externalId") val externalId: String,
    val status: String,
    @SerializedName("fieldLotId") val fieldLotId: String?,
    val error: String?,
)

data class FieldLotSyncResponse(val results: List<FieldLotSyncResultItem>)

data class FieldLotBootstrapResponse(
    val lots: List<FieldLotDto>,
    @SerializedName("syncedAt") val syncedAt: String,
)

data class EligibleFtipLotDto(
    val id: String,
    @SerializedName("lotCode") val lotCode: String,
    @SerializedName("lotName") val lotName: String?,
    @SerializedName("farmUnitId") val farmUnitId: String,
    @SerializedName("areaHa") val areaHa: Double?,
)

data class SetLotGeometryRequest(
    @SerializedName("applicationGeo") val applicationGeo: Map<String, Any>,
    val source: String = "android",
)

interface FmdtApi {
    @GET("fmdt/lots")
    suspend fun listLots(
        @Header("Authorization") token: String,
        @Query("limit") limit: Int = 500,
    ): FieldLotListResponse

    @GET("fmdt/lots/bootstrap")
    suspend fun bootstrap(@Header("Authorization") token: String): FieldLotBootstrapResponse

    @GET("fmdt/lots/eligible-ftip")
    suspend fun eligibleFtipLots(
        @Header("Authorization") token: String,
        @Query("farmUnitId") farmUnitId: String? = null,
    ): EligibleFtipLotListResponse

    @POST("fmdt/lots/sync")
    suspend fun syncBatch(
        @Header("Authorization") token: String,
        @Body body: FieldLotSyncRequest,
    ): FieldLotSyncResponse

    @POST("fmdt/lots/{id}/geometry")
    suspend fun setGeometry(
        @Header("Authorization") token: String,
        @Path("id") id: String,
        @Body body: SetLotGeometryRequest,
    ): FieldLotDto

    @POST("fmdt/lots/{id}/operations")
    suspend fun addOperation(
        @Header("Authorization") token: String,
        @Path("id") id: String,
        @Body body: CreateFieldOperationRequest,
    ): Map<String, Any>
}

data class FieldLotListResponse(val items: List<FieldLotDto>)
data class EligibleFtipLotListResponse(val items: List<EligibleFtipLotDto>)
