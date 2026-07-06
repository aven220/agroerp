package com.agroerp.prm.data.api

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

interface EipApi {
    @GET("eip/mobile/status")
    suspend fun mobileStatus(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("eip/monitoring/errors")
    suspend fun errors(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("eip/events/dlq")
    suspend fun dlq(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @POST("eip/offline/batches")
    suspend fun queueOffline(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("eip/offline/batches/{batchKey}/sync")
    suspend fun syncOffline(
        @Header("Authorization") authorization: String,
        @Path("batchKey") batchKey: String,
        @Body body: Map<String, String> = emptyMap(),
    ): Map<String, Any>
}
