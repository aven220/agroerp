package com.agroerp.prm.data.api

import com.google.gson.annotations.SerializedName
import retrofit2.http.GET
import retrofit2.http.Header

data class EsdjeJobMobileDto(
    val id: String,
    @SerializedName("jobKey") val jobKey: String,
    val name: String,
    val status: String,
    @SerializedName("jobType") val jobType: String,
    @SerializedName("nextRunAt") val nextRunAt: String?,
    @SerializedName("handlerType") val handlerType: String,
)

data class EsdjeMobileJobsResponse(
    val jobs: List<EsdjeJobMobileDto>,
    @SerializedName("syncedAt") val syncedAt: String,
)

data class EsdjeRunMobileDto(
    val id: String,
    @SerializedName("jobKey") val jobKey: String,
    val status: String,
    val attempt: Int,
    @SerializedName("durationMs") val durationMs: Int,
    val error: String?,
    @SerializedName("startedAt") val startedAt: String?,
    @SerializedName("finishedAt") val finishedAt: String?,
)

interface SchedulerApi {
    @GET("esdje/mobile/jobs")
    suspend fun mobileJobs(@Header("Authorization") authorization: String): EsdjeMobileJobsResponse

    @GET("esdje/mobile/runs")
    suspend fun mobileRuns(@Header("Authorization") authorization: String): List<EsdjeRunMobileDto>
}
