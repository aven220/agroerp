package com.agroerp.prm.data.api

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

interface EintApi {
    @GET("eint/mobile/sync")
    suspend fun mobileSync(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("eint/dashboards/catalog")
    suspend fun dashboardCatalog(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("eint/dashboards/{dashboardKey}")
    suspend fun getDashboard(
        @Header("Authorization") authorization: String,
        @Path("dashboardKey") dashboardKey: String,
    ): Map<String, Any>

    @GET("eint/bi/kpis")
    suspend fun kpis(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("eint/reports/templates")
    suspend fun reportTemplates(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("eint/assistants/catalog")
    suspend fun assistantCatalog(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @POST("eint/assistants/{assistantKey}/chat")
    suspend fun assistantChat(
        @Header("Authorization") authorization: String,
        @Path("assistantKey") assistantKey: String,
        @Body body: Map<String, String>,
    ): Map<String, Any>

    @GET("eint/notifications/inbox")
    suspend fun inbox(@Header("Authorization") authorization: String): List<Map<String, Any>>
}
