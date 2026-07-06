package com.agroerp.prm.data.api

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

interface EamApi {
    @GET("eam/mobile/sync")
    suspend fun mobileSync(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("eam/assets")
    suspend fun listAssets(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("eam/assets/{assetKey}")
    suspend fun getAsset(
        @Header("Authorization") authorization: String,
        @Path("assetKey") assetKey: String,
    ): Map<String, Any>

    @POST("eam/scan")
    suspend fun scan(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, String>,
    ): Map<String, Any>

    @POST("eam/assets/{assetKey}/transfer")
    suspend fun transfer(
        @Header("Authorization") authorization: String,
        @Path("assetKey") assetKey: String,
        @Body body: Map<String, String>,
    ): Map<String, Any>

    @POST("eam/assets/{assetKey}/documents")
    suspend fun uploadDocument(
        @Header("Authorization") authorization: String,
        @Path("assetKey") assetKey: String,
        @Body body: Map<String, String>,
    ): Map<String, Any>

    @POST("eam/offline/batches")
    suspend fun queueOffline(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("eam/offline/batches/{batchKey}/sync")
    suspend fun syncOffline(
        @Header("Authorization") authorization: String,
        @Path("batchKey") batchKey: String,
        @Body body: Map<String, String> = emptyMap(),
    ): Map<String, Any>

    @GET("eam/dashboard")
    suspend fun dashboard(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("eam/cmms/mobile/sync")
    suspend fun cmmsMobileSync(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("eam/cmms/work-orders")
    suspend fun cmmsWorkOrders(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @POST("eam/cmms/work-orders/{workOrderKey}/execution")
    suspend fun cmmsExecution(
        @Header("Authorization") authorization: String,
        @Path("workOrderKey") workOrderKey: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("eam/cmms/work-orders/{workOrderKey}/attachments")
    suspend fun cmmsAttach(
        @Header("Authorization") authorization: String,
        @Path("workOrderKey") workOrderKey: String,
        @Body body: Map<String, String>,
    ): Map<String, Any>

    @POST("eam/cmms/work-orders/{workOrderKey}/sign")
    suspend fun cmmsSign(
        @Header("Authorization") authorization: String,
        @Path("workOrderKey") workOrderKey: String,
        @Body body: Map<String, String>,
    ): Map<String, Any>

    @POST("eam/cmms/work-orders/{workOrderKey}/spare-parts")
    suspend fun cmmsSparePart(
        @Header("Authorization") authorization: String,
        @Path("workOrderKey") workOrderKey: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("eam/cmms/offline/batches")
    suspend fun cmmsQueueOffline(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("eam/cmms/offline/batches/{batchKey}/sync")
    suspend fun cmmsSyncOffline(
        @Header("Authorization") authorization: String,
        @Path("batchKey") batchKey: String,
        @Body body: Map<String, String> = emptyMap(),
    ): Map<String, Any>

    @GET("eam/reliability/mobile/sync")
    suspend fun reliabilityMobileSync(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("eam/reliability/dashboard/executive")
    suspend fun reliabilityExecutive(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("eam/reliability/condition/readings")
    suspend fun reliabilityReadings(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @POST("eam/reliability/condition/readings")
    suspend fun recordConditionReading(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @GET("eam/reliability/alerts")
    suspend fun reliabilityAlerts(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @POST("eam/reliability/offline/batches")
    suspend fun reliabilityQueueOffline(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("eam/reliability/offline/batches/{batchKey}/sync")
    suspend fun reliabilitySyncOffline(
        @Header("Authorization") authorization: String,
        @Path("batchKey") batchKey: String,
        @Body body: Map<String, String> = emptyMap(),
    ): Map<String, Any>
}
