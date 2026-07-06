package com.agroerp.prm.data.api

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface EaipApi {
    @GET("eaip/mobile/sync")
    suspend fun mobileSync(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("eaip/recommendations")
    suspend fun recommendations(
        @Header("Authorization") authorization: String,
        @Query("category") category: String? = null,
    ): List<Map<String, Any>>

    @GET("eaip/simulations")
    suspend fun simulations(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("eaip/predictions")
    suspend fun predictions(
        @Header("Authorization") authorization: String,
        @Query("serviceType") serviceType: String? = null,
    ): List<Map<String, Any>>

    @GET("eaip/assistant/sessions")
    suspend fun assistantSessions(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @POST("eaip/assistant/sessions")
    suspend fun createSession(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("eaip/assistant/sessions/{sessionKey}/messages")
    suspend fun sendMessage(
        @Header("Authorization") authorization: String,
        @Path("sessionKey") sessionKey: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @GET("eaip/assistant/sessions/{sessionKey}/messages")
    suspend fun getMessages(
        @Header("Authorization") authorization: String,
        @Path("sessionKey") sessionKey: String,
    ): List<Map<String, Any>>

    @POST("eaip/mobile/batches")
    suspend fun queueBatch(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("eaip/mobile/batches/{batchKey}/sync")
    suspend fun syncBatch(
        @Header("Authorization") authorization: String,
        @Path("batchKey") batchKey: String,
    ): Map<String, Any>
}
