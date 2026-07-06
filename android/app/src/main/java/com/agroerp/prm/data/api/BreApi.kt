package com.agroerp.prm.data.api

import com.google.gson.annotations.SerializedName
import retrofit2.http.GET
import retrofit2.http.Header

data class BreRuleMobileDto(
    @SerializedName("ruleKey") val ruleKey: String,
    val name: String,
    @SerializedName("eventTypes") val eventTypes: List<String>,
    @SerializedName("eventCategory") val eventCategory: String,
    val priority: Int,
    val version: Int,
)

data class BreMobileConfigResponse(
    val rules: List<BreRuleMobileDto>,
    @SerializedName("syncedAt") val syncedAt: String,
)

data class BreExecutionDto(
    val id: String,
    @SerializedName("ruleKey") val ruleKey: String,
    @SerializedName("eventType") val eventType: String?,
    val status: String,
    val matched: Boolean,
    @SerializedName("durationMs") val durationMs: Int,
    @SerializedName("executedAt") val executedAt: String,
)

interface BreApi {
    @GET("ebre/mobile/config")
    suspend fun mobileConfig(@Header("Authorization") authorization: String): BreMobileConfigResponse

    @GET("ebre/mobile/executions")
    suspend fun mobileExecutions(@Header("Authorization") authorization: String): List<BreExecutionDto>
}
