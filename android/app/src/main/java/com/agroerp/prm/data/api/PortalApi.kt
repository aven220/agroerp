package com.agroerp.prm.data.api

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Query

interface PortalApi {
    @GET("portal/mobile/sync")
    suspend fun sync(
        @Header("Authorization") authorization: String,
        @Query("employeeKey") employeeKey: String? = null,
    ): Map<String, Any>

    @GET("portal/dashboard")
    suspend fun dashboard(
        @Header("Authorization") authorization: String,
        @Query("employeeKey") employeeKey: String? = null,
    ): Map<String, Any>

    @GET("portal/profile")
    suspend fun profile(
        @Header("Authorization") authorization: String,
        @Query("employeeKey") employeeKey: String? = null,
    ): Map<String, Any>

    @PUT("portal/profile")
    suspend fun updateProfile(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @POST("portal/login")
    suspend fun login(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @GET("portal/news")
    suspend fun news(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("portal/notices")
    suspend fun notices(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("portal/quick-links")
    suspend fun quickLinks(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("portal/birthdays")
    suspend fun birthdays(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("portal/requests")
    suspend fun requests(
        @Header("Authorization") authorization: String,
        @Query("status") status: String? = null,
    ): List<Map<String, Any>>

    @GET("portal/requests/history")
    suspend fun requestHistory(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("portal/requests/vacations")
    suspend fun vacationSummary(@Header("Authorization") authorization: String): Map<String, Any>

    @POST("portal/requests")
    suspend fun createRequest(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @POST("portal/requests/{requestKey}/submit")
    suspend fun submitRequest(
        @Header("Authorization") authorization: String,
        @retrofit2.http.Path("requestKey") requestKey: String,
    ): Map<String, Any>

    @POST("portal/requests/attachments")
    suspend fun addAttachment(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @POST("portal/certificates")
    suspend fun createCertificate(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @GET("portal/certificates")
    suspend fun certificates(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("portal/payroll/payslips")
    suspend fun payslips(
        @Header("Authorization") authorization: String,
        @Query("periodCode") periodCode: String? = null,
        @Query("periodFrom") periodFrom: String? = null,
        @Query("periodTo") periodTo: String? = null,
    ): List<Map<String, Any>>

    @GET("portal/payroll/payslips/{payslipKey}/download")
    suspend fun downloadPayslip(
        @Header("Authorization") authorization: String,
        @retrofit2.http.Path("payslipKey") payslipKey: String,
    ): Map<String, Any>

    @GET("portal/payroll/salary-history")
    suspend fun salaryHistory(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("portal/payroll/contributions")
    suspend fun contributions(
        @Header("Authorization") authorization: String,
        @Query("periodCode") periodCode: String? = null,
    ): Map<String, Any>

    @GET("portal/documents/personal")
    suspend fun personalDocuments(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("portal/documents/personal/{documentKey}/download")
    suspend fun downloadPersonalDocument(
        @Header("Authorization") authorization: String,
        @retrofit2.http.Path("documentKey") documentKey: String,
    ): Map<String, Any>

    @GET("portal/documents/certificates")
    suspend fun allCertificates(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("portal/documents/offline")
    suspend fun offlineDocuments(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @POST("portal/documents/offline")
    suspend fun saveOfflineDocument(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>
}
