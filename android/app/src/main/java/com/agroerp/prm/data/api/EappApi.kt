package com.agroerp.prm.data.api

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface EappApi {
    @GET("eapp/mobile/sync")
    suspend fun mobileSync(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("eapp/gis/map")
    suspend fun mapContext(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("eapp/geo/pois")
    suspend fun pois(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @POST("eapp/geo/pois")
    suspend fun createPoi(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("eapp/inspections")
    suspend fun recordInspection(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("eapp/mobile/batches")
    suspend fun queueBatch(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("eapp/mobile/batches/{batchKey}/sync")
    suspend fun syncBatch(
        @Header("Authorization") authorization: String,
        @Path("batchKey") batchKey: String,
    ): Map<String, Any>

    @GET("eapp/inspections")
    suspend fun inspections(
        @Header("Authorization") authorization: String,
        @Query("fieldLotId") fieldLotId: String? = null,
    ): List<Map<String, Any>>
}
