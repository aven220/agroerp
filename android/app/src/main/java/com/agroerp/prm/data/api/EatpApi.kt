package com.agroerp.prm.data.api

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

interface EatpApi {
    @GET("eatp/mobile/sync")
    suspend fun mobileSync(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("eatp/labors/catalog")
    suspend fun laborCatalog(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("eatp/lots")
    suspend fun lots(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("eatp/qr/{qrCode}")
    suspend fun resolveQr(
        @Header("Authorization") authorization: String,
        @Path("qrCode") qrCode: String,
    ): Map<String, Any>

    @POST("eatp/labors/record")
    suspend fun recordLabor(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("eatp/mobile/batches")
    suspend fun queueBatch(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("eatp/mobile/batches/{batchKey}/sync")
    suspend fun syncBatch(
        @Header("Authorization") authorization: String,
        @Path("batchKey") batchKey: String,
    ): Map<String, Any>
}
