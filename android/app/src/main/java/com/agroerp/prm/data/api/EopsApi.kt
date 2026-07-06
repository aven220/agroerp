package com.agroerp.prm.data.api

import retrofit2.http.GET
import retrofit2.http.Header

interface EopsApi {
    @GET("eops/mobile/sync")
    suspend fun mobileSync(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("eops/monitoring/dashboard")
    suspend fun monitoring(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("eops/security/alerts")
    suspend fun securityAlerts(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("eops/health/probes")
    suspend fun healthProbes(@Header("Authorization") authorization: String): List<Map<String, Any>>
}
