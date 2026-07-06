package com.agroerp.prm.data.api

import com.google.gson.annotations.SerializedName
import retrofit2.http.GET
import retrofit2.http.Header

data class EppmPluginMobileDto(
    @SerializedName("pluginKey") val pluginKey: String,
    val name: String,
    val version: String,
    @SerializedName("pluginType") val pluginType: String,
    val config: Map<String, Any>?,
)

data class EppmMobileInstalledResponse(
    val plugins: List<EppmPluginMobileDto>,
    @SerializedName("syncedAt") val syncedAt: String,
)

data class EppmMobileResourceDto(
    @SerializedName("pluginKey") val pluginKey: String,
    val screens: List<Map<String, Any>>,
    val version: String,
)

interface PluginsApi {
    @GET("eppm/mobile/installed")
    suspend fun mobileInstalled(@Header("Authorization") authorization: String): EppmMobileInstalledResponse

    @GET("eppm/mobile/resources")
    suspend fun mobileResources(@Header("Authorization") authorization: String): List<EppmMobileResourceDto>
}
