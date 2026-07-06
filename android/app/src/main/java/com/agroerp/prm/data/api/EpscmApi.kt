package com.agroerp.prm.data.api

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

interface EpscmApi {
    @GET("epscm/mobile/sync")
    suspend fun mobileSync(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("epscm/dashboard")
    suspend fun dashboard(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("epscm/demand/panel")
    suspend fun demandPanel(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("epscm/alerts")
    suspend fun alerts(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("epscm/replenishment/proposals")
    suspend fun proposals(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("epscm/inventory/indicators")
    suspend fun inventoryIndicators(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("epscm/wms/mobile/sync")
    suspend fun wmsMobileSync(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("epscm/wms/dashboard")
    suspend fun wmsDashboard(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("epscm/wms/picking/tasks")
    suspend fun wmsPickTasks(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @POST("epscm/wms/picking/barcode")
    suspend fun wmsBarcodePick(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("epscm/wms/receipts/barcode")
    suspend fun wmsBarcodeReceive(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("epscm/wms/packing/{packKey}/complete")
    suspend fun wmsCompletePacking(
        @Header("Authorization") authorization: String,
        @Path("packKey") packKey: String,
        @Body body: Map<String, String> = emptyMap(),
    ): Map<String, Any>

    @POST("epscm/wms/dispatches/{dispatchKey}/confirm")
    suspend fun wmsConfirmDispatch(
        @Header("Authorization") authorization: String,
        @Path("dispatchKey") dispatchKey: String,
        @Body body: Map<String, String> = emptyMap(),
    ): Map<String, Any>

    @POST("epscm/wms/transfers/{transferKey}/complete")
    suspend fun wmsCompleteTransfer(
        @Header("Authorization") authorization: String,
        @Path("transferKey") transferKey: String,
        @Body body: Map<String, String> = emptyMap(),
    ): Map<String, Any>

    @POST("epscm/wms/offline/batches")
    suspend fun wmsQueueOffline(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("epscm/wms/offline/batches/{batchKey}/sync")
    suspend fun wmsSyncOffline(
        @Header("Authorization") authorization: String,
        @Path("batchKey") batchKey: String,
        @Body body: Map<String, String> = emptyMap(),
    ): Map<String, Any>

    @POST("epscm/wms/captures")
    suspend fun wmsCapture(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @GET("epscm/tms/mobile/sync")
    suspend fun tmsMobileSync(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("epscm/tms/dashboard/logistics")
    suspend fun tmsLogisticsDashboard(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("epscm/tms/trips")
    suspend fun tmsTrips(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @POST("epscm/tms/trips/{tripKey}/accept")
    suspend fun tmsAcceptTrip(
        @Header("Authorization") authorization: String,
        @Path("tripKey") tripKey: String,
        @Body body: Map<String, String>,
    ): Map<String, Any>

    @POST("epscm/tms/trips/{tripKey}/start")
    suspend fun tmsStartTrip(
        @Header("Authorization") authorization: String,
        @Path("tripKey") tripKey: String,
        @Body body: Map<String, String>,
    ): Map<String, Any>

    @POST("epscm/tms/trips/{tripKey}/incidents")
    suspend fun tmsRecordIncident(
        @Header("Authorization") authorization: String,
        @Path("tripKey") tripKey: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("epscm/tms/deliveries/barcode")
    suspend fun tmsBarcodeDelivery(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("epscm/tms/deliveries/{deliveryKey}/pod")
    suspend fun tmsCapturePod(
        @Header("Authorization") authorization: String,
        @Path("deliveryKey") deliveryKey: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("epscm/tms/offline/batches")
    suspend fun tmsQueueOffline(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("epscm/tms/offline/batches/{batchKey}/sync")
    suspend fun tmsSyncOffline(
        @Header("Authorization") authorization: String,
        @Path("batchKey") batchKey: String,
        @Body body: Map<String, String>,
    ): Map<String, Any>

    @GET("epscm/collab/mobile/sync")
    suspend fun collabMobileSync(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("epscm/collab/tasks")
    suspend fun collabTasks(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @POST("epscm/collab/tasks/{taskKey}/complete")
    suspend fun collabCompleteTask(
        @Header("Authorization") authorization: String,
        @Path("taskKey") taskKey: String,
        @Body body: Map<String, String> = emptyMap(),
    ): Map<String, Any>

    @POST("epscm/collab/comments")
    suspend fun collabAddComment(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, String>,
    ): Map<String, Any>

    @GET("epscm/collab/comments")
    suspend fun collabListComments(
        @Header("Authorization") authorization: String,
        @retrofit2.http.Query("refType") refType: String,
        @retrofit2.http.Query("refKey") refKey: String,
    ): List<Map<String, Any>>

    @POST("epscm/collab/operators/assignments/{assignmentKey}/evidence")
    suspend fun collabAttachEvidence(
        @Header("Authorization") authorization: String,
        @Path("assignmentKey") assignmentKey: String,
        @Body body: Map<String, String>,
    ): Map<String, Any>

    @POST("epscm/collab/operators/assignments/{assignmentKey}/status")
    suspend fun collabUpdateStatus(
        @Header("Authorization") authorization: String,
        @Path("assignmentKey") assignmentKey: String,
        @Body body: Map<String, String>,
    ): Map<String, Any>

    @POST("epscm/collab/suppliers/{partnerKey}/documents")
    suspend fun collabUploadDocument(
        @Header("Authorization") authorization: String,
        @Path("partnerKey") partnerKey: String,
        @Body body: Map<String, String>,
    ): Map<String, Any>

    @POST("epscm/collab/offline/batches")
    suspend fun collabQueueOffline(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("epscm/collab/offline/batches/{batchKey}/sync")
    suspend fun collabSyncOffline(
        @Header("Authorization") authorization: String,
        @Path("batchKey") batchKey: String,
        @Body body: Map<String, String> = emptyMap(),
    ): Map<String, Any>
}
