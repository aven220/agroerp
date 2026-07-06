package com.agroerp.prm.data.api

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path

interface EmfgApi {
    @GET("emfg/mobile/sync")
    suspend fun sync(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("emfg/orders")
    suspend fun orders(
        @Header("Authorization") authorization: String,
    ): List<Map<String, Any>>

    @GET("emfg/orders/{orderKey}")
    suspend fun order(
        @Header("Authorization") authorization: String,
        @Path("orderKey") orderKey: String,
    ): Map<String, Any>

    @PATCH("emfg/orders/{orderKey}/status")
    suspend fun updateOrderStatus(
        @Header("Authorization") authorization: String,
        @Path("orderKey") orderKey: String,
        @Body body: Map<String, String>,
    ): Map<String, Any>

    @POST("emfg/orders/{orderKey}/progress")
    suspend fun recordProgress(
        @Header("Authorization") authorization: String,
        @Path("orderKey") orderKey: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @PATCH("emfg/operations/{orderOpKey}/status")
    suspend fun updateOperationStatus(
        @Header("Authorization") authorization: String,
        @Path("orderOpKey") orderOpKey: String,
        @Body body: Map<String, String>,
    ): Map<String, Any>

    @GET("emfg/schedule")
    suspend fun schedule(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("emfg/mes/monitor")
    suspend fun mesMonitor(@Header("Authorization") authorization: String): Map<String, Any>

    @POST("emfg/mes/orders/{orderKey}/execute")
    suspend fun mesExecute(
        @Header("Authorization") authorization: String,
        @Path("orderKey") orderKey: String,
        @Body body: Map<String, String?>,
    ): Map<String, Any>

    @POST("emfg/mes/orders/{orderKey}/outputs")
    suspend fun mesProduce(
        @Header("Authorization") authorization: String,
        @Path("orderKey") orderKey: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @POST("emfg/mes/orders/{orderKey}/consumptions")
    suspend fun mesConsume(
        @Header("Authorization") authorization: String,
        @Path("orderKey") orderKey: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @POST("emfg/mes/orders/{orderKey}/captures")
    suspend fun mesCapture(
        @Header("Authorization") authorization: String,
        @Path("orderKey") orderKey: String,
        @Body body: Map<String, String?>,
    ): Map<String, Any>

    @POST("emfg/mes/offline/sync")
    suspend fun mesOfflineSync(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @GET("emfg/qms/dashboard")
    suspend fun qmsDashboard(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("emfg/qms/inspections")
    suspend fun qmsInspections(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @POST("emfg/qms/inspections")
    suspend fun qmsCreateInspection(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @POST("emfg/qms/inspections/{inspectionKey}/measurements")
    suspend fun qmsAddMeasurement(
        @Header("Authorization") authorization: String,
        @Path("inspectionKey") inspectionKey: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @POST("emfg/qms/inspections/{inspectionKey}/evidences")
    suspend fun qmsAddEvidence(
        @Header("Authorization") authorization: String,
        @Path("inspectionKey") inspectionKey: String,
        @Body body: Map<String, String?>,
    ): Map<String, Any>

    @POST("emfg/qms/inspections/{inspectionKey}/complete")
    suspend fun qmsCompleteInspection(
        @Header("Authorization") authorization: String,
        @Path("inspectionKey") inspectionKey: String,
    ): Map<String, Any>

    @POST("emfg/qms/offline/sync")
    suspend fun qmsOfflineSync(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @GET("emfg/resources/center")
    suspend fun resourcesCenter(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("emfg/resources/equipment")
    suspend fun resourcesEquipment(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @POST("emfg/resources/equipment/{equipmentKey}/availability")
    suspend fun resourcesSetAvailability(
        @Header("Authorization") authorization: String,
        @Path("equipmentKey") equipmentKey: String,
        @Body body: Map<String, String?>,
    ): Map<String, Any>

    @POST("emfg/resources/maintenance/logs")
    suspend fun resourcesMaintenance(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @POST("emfg/resources/captures")
    suspend fun resourcesCapture(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, String?>,
    ): Map<String, Any>

    @POST("emfg/resources/offline/sync")
    suspend fun resourcesOfflineSync(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @GET("emfg/cost/dashboard")
    suspend fun costDashboard(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("emfg/cost/wip")
    suspend fun costWip(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("emfg/cost/wip/{orderKey}")
    suspend fun costWipOrder(
        @Header("Authorization") authorization: String,
        @Path("orderKey") orderKey: String,
    ): Map<String, Any>

    @POST("emfg/cost/orders/{orderKey}/run")
    suspend fun costRun(
        @Header("Authorization") authorization: String,
        @Path("orderKey") orderKey: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @GET("emfg/intelligence/dashboard")
    suspend fun intelligenceDashboard(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("emfg/intelligence/executive")
    suspend fun intelligenceExecutive(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("emfg/intelligence/oee")
    suspend fun intelligenceOee(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("emfg/intelligence/kpis")
    suspend fun intelligenceKpis(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("emfg/intelligence/alerts")
    suspend fun intelligenceAlerts(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("emfg/intelligence/simulations/authorized")
    suspend fun intelligenceAuthorizedSims(@Header("Authorization") authorization: String): List<Map<String, Any>>
}
