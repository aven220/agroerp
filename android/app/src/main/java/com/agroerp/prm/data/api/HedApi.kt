package com.agroerp.prm.data.api

import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Query

interface HedApi {
    @GET("hcm/executive-dashboard/mobile/sync")
    suspend fun sync(
        @Header("Authorization") authorization: String,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
    ): Map<String, Any>

    @GET("hcm/executive-dashboard")
    suspend fun dashboard(
        @Header("Authorization") authorization: String,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
        @Query("departmentKey") departmentKey: String? = null,
        @Query("branchKey") branchKey: String? = null,
    ): Map<String, Any>

    @GET("hcm/executive-dashboard/kpis")
    suspend fun kpis(
        @Header("Authorization") authorization: String,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
    ): Map<String, Any>

    @GET("hcm/executive-dashboard/charts")
    suspend fun charts(
        @Header("Authorization") authorization: String,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
    ): Map<String, Any>
}
