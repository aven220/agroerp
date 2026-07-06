package com.agroerp.prm.data.api

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface EaceApi {
    @GET("eace/mobile/sync")
    suspend fun mobileSync(
        @Header("Authorization") authorization: String,
        @Query("profileRole") profileRole: String? = null,
    ): Map<String, Any>

    @GET("eace/contracts")
    suspend fun contracts(
        @Header("Authorization") authorization: String,
        @Query("status") status: String? = null,
    ): List<Map<String, Any>>

    @GET("eace/visits")
    suspend fun visits(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @POST("eace/visits/{visitKey}/complete")
    suspend fun completeVisit(
        @Header("Authorization") authorization: String,
        @Path("visitKey") visitKey: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @GET("eace/notifications")
    suspend fun notifications(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("eace/executive")
    suspend fun executive(@Header("Authorization") authorization: String): Map<String, Any>

    @POST("eace/mobile/batches")
    suspend fun queueBatch(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("eace/mobile/batches/{batchKey}/sync")
    suspend fun syncBatch(
        @Header("Authorization") authorization: String,
        @Path("batchKey") batchKey: String,
    ): Map<String, Any>
}
