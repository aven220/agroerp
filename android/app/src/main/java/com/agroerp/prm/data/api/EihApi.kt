package com.agroerp.prm.data.api

import com.google.gson.annotations.SerializedName
import retrofit2.http.GET
import retrofit2.http.Header

data class EihConnectorMobileDto(
    @SerializedName("connectorKey") val connectorKey: String,
    val name: String,
    val protocol: String,
    val category: String,
    @SerializedName("lastSyncAt") val lastSyncAt: String?,
)

data class EihMobileConnectorsResponse(
    val connectors: List<EihConnectorMobileDto>,
    @SerializedName("syncedAt") val syncedAt: String,
)

data class EihSyncRunMobileDto(
    @SerializedName("runKey") val runKey: String,
    val status: String,
    @SerializedName("syncMode") val syncMode: String,
    @SerializedName("recordsIn") val recordsIn: Int,
    @SerializedName("recordsOut") val recordsOut: Int,
    @SerializedName("createdAt") val createdAt: String,
)

interface EihApi {
    @GET("eih/mobile/connectors")
    suspend fun mobileConnectors(@Header("Authorization") authorization: String): EihMobileConnectorsResponse

    @GET("eih/mobile/sync")
    suspend fun mobileSync(@Header("Authorization") authorization: String): List<EihSyncRunMobileDto>
}
