package com.agroerp.prm.data.api

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface EphpApi {
    @GET("ephp/mobile/sync")
    suspend fun mobileSync(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("ephp/alerts")
    suspend fun alerts(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @POST("ephp/monitoring")
    suspend fun recordMonitoring(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("ephp/applications")
    suspend fun recordApplication(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @GET("eatp/qr/{qrCode}")
    suspend fun resolveQr(
        @Header("Authorization") authorization: String,
        @Path("qrCode") qrCode: String,
    ): Map<String, Any>

    @POST("ephp/mobile/batches")
    suspend fun queueBatch(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("ephp/mobile/batches/{batchKey}/sync")
    suspend fun syncBatch(
        @Header("Authorization") authorization: String,
        @Path("batchKey") batchKey: String,
    ): Map<String, Any>
}
