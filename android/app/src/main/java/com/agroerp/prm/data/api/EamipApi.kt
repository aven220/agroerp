package com.agroerp.prm.data.api

import com.google.gson.annotations.SerializedName
import retrofit2.http.GET
import retrofit2.http.Header

data class ApiCenterDto(
    @SerializedName("apiCount") val apiCount: Int,
    @SerializedName("publishedCount") val publishedCount: Int,
    @SerializedName("connectorCount") val connectorCount: Int,
)

data class ApiCatalogItemDto(
    @SerializedName("apiKey") val apiKey: String,
    val name: String,
    val domain: String,
    val status: String,
)

interface EamipApi {
    @GET("eamip/center")
    suspend fun center(@Header("Authorization") token: String): ApiCenterDto

    @GET("eamip/catalog")
    suspend fun catalog(@Header("Authorization") token: String): List<ApiCatalogItemDto>
}
