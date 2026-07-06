package com.agroerp.prm.data.api

import com.google.gson.annotations.SerializedName
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST

data class GisTrackPoint(
    val lat: Double,
    val lng: Double,
    @SerializedName("capturedAt") val capturedAt: String,
    @SerializedName("accuracyM") val accuracyM: Double? = null,
)

data class GisTrackBatch(
    @SerializedName("deviceId") val deviceId: String? = null,
    val points: List<GisTrackPoint>,
    @SerializedName("expectedLotId") val expectedLotId: String? = null,
)

data class GisCaptureItem(
    @SerializedName("captureType") val captureType: String,
    val geometry: Map<String, Any>,
    @SerializedName("capturedAt") val capturedAt: String,
    @SerializedName("mediaRefs") val mediaRefs: List<String>? = null,
    val metadata: Map<String, Any>? = null,
)

data class GisMobileSyncRequest(
    val tracks: List<GisTrackBatch>? = null,
    val captures: List<GisCaptureItem>? = null,
    @SerializedName("layerRefresh") val layerRefresh: Boolean = true,
)

data class GisLayerDto(
    val id: String,
    @SerializedName("layerCode") val layerCode: String,
    @SerializedName("layerName") val layerName: String,
    @SerializedName("layerType") val layerType: String,
    @SerializedName("geometryType") val geometryType: String,
)

data class GisBasemapDto(
    @SerializedName("basemapCode") val basemapCode: String,
    @SerializedName("basemapName") val basemapName: String,
    @SerializedName("mapType") val mapType: String,
    @SerializedName("urlTemplate") val urlTemplate: String,
    @SerializedName("offlineCapable") val offlineCapable: Boolean,
)

data class GisMobileSyncResponse(
    @SerializedName("syncedAt") val syncedAt: String,
    val layers: List<GisLayerDto>,
    val basemaps: List<GisBasemapDto>,
)

interface GisApi {
    @POST("gis/sync/mobile")
    suspend fun mobileSync(
        @Header("Authorization") token: String,
        @Body body: GisMobileSyncRequest,
    ): GisMobileSyncResponse

    @GET("gis/basemaps")
    suspend fun listBasemaps(@Header("Authorization") token: String): List<GisBasemapDto>

    @GET("gis/layers")
    suspend fun listLayers(@Header("Authorization") token: String): List<GisLayerDto>
}
