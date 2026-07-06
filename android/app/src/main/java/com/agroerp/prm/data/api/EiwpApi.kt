package com.agroerp.prm.data.api

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface EiwpApi {
    @GET("eiwp/mobile/sync")
    suspend fun mobileSync(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("eiwp/weather/snapshot")
    suspend fun climateSnapshot(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("eiwp/alerts")
    suspend fun alerts(
        @Header("Authorization") authorization: String,
        @Query("active") active: String = "true",
    ): List<Map<String, Any>>

    @POST("eiwp/rainfall")
    suspend fun recordRainfall(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("eiwp/irrigation/schedules/{scheduleKey}/complete")
    suspend fun completeIrrigation(
        @Header("Authorization") authorization: String,
        @Path("scheduleKey") scheduleKey: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("eiwp/incidents")
    suspend fun recordIncident(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("eiwp/mobile/batches")
    suspend fun queueBatch(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("eiwp/mobile/batches/{batchKey}/sync")
    suspend fun syncBatch(
        @Header("Authorization") authorization: String,
        @Path("batchKey") batchKey: String,
    ): Map<String, Any>
}
