package com.agroerp.prm.data.api

import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface HpaApi {
    @GET("portal/analytics/mobile/sync")
    suspend fun sync(
        @Header("Authorization") authorization: String,
        @Query("employeeKey") employeeKey: String? = null,
    ): Map<String, Any>

    @GET("portal/analytics/personal-dashboard")
    suspend fun personalDashboard(
        @Header("Authorization") authorization: String,
        @Query("employeeKey") employeeKey: String? = null,
    ): Map<String, Any>

    @GET("portal/analytics/notifications")
    suspend fun notifications(
        @Header("Authorization") authorization: String,
        @Query("employeeKey") employeeKey: String? = null,
    ): List<Map<String, Any>>

    @POST("portal/analytics/notifications/{notificationKey}/read")
    suspend fun markRead(
        @Header("Authorization") authorization: String,
        @Path("notificationKey") notificationKey: String,
    ): Map<String, Any>

    @GET("portal/analytics/kpis")
    suspend fun kpis(
        @Header("Authorization") authorization: String,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
    ): Map<String, Any>
}
