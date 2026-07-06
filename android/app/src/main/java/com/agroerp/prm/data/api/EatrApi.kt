package com.agroerp.prm.data.api

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface EatrApi {
    @GET("eatr/mobile/sync")
    suspend fun mobileSync(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("eatr/trace/query")
    suspend fun traceQuery(
        @Header("Authorization") authorization: String,
        @Query("lotKey") lotKey: String?,
        @Query("qrCode") qrCode: String?,
        @Query("commercialLotKey") commercialLotKey: String?,
    ): Map<String, Any>

    @POST("eatr/harvest/records")
    suspend fun recordHarvest(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("eatr/harvest/weighings")
    suspend fun recordWeighing(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("eatr/quality")
    suspend fun recordInspection(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("eatr/mobile/batches")
    suspend fun queueBatch(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("eatr/mobile/batches/{batchKey}/sync")
    suspend fun syncBatch(
        @Header("Authorization") authorization: String,
        @Path("batchKey") batchKey: String,
    ): Map<String, Any>
}
