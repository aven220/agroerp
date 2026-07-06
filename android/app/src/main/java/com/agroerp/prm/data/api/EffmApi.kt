package com.agroerp.prm.data.api

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

interface EffmApi {
    @GET("effm/mobile/sync")
    suspend fun mobileSync(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("effm/qr/{qrCode}")
    suspend fun resolveQr(
        @Header("Authorization") authorization: String,
        @Path("qrCode") qrCode: String,
    ): Map<String, Any>

    @POST("effm/operations/start")
    suspend fun startOperation(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("effm/operations/{sessionKey}/end")
    suspend fun endOperation(
        @Header("Authorization") authorization: String,
        @Path("sessionKey") sessionKey: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("effm/fuel")
    suspend fun recordFuel(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @GET("effm/operators/assignments")
    suspend fun assignments(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @POST("effm/incidents")
    suspend fun recordIncident(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("effm/mobile/batches")
    suspend fun queueBatch(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("effm/mobile/batches/{batchKey}/sync")
    suspend fun syncBatch(
        @Header("Authorization") authorization: String,
        @Path("batchKey") batchKey: String,
    ): Map<String, Any>
}
