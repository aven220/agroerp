package com.agroerp.prm.data.api

import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Query

interface EfmApi {
    @GET("efm/mobile/sync")
    suspend fun sync(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("efm/mobile/coa")
    suspend fun coa(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("efm/mobile/parameters")
    suspend fun parameters(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("efm/vouchers")
    suspend fun vouchers(
        @Header("Authorization") authorization: String,
        @Query("status") status: String? = null,
        @Query("periodKey") periodKey: String? = null,
    ): List<Map<String, Any>>

    @GET("efm/journal-book")
    suspend fun journalBook(
        @Header("Authorization") authorization: String,
        @Query("periodKey") periodKey: String? = null,
    ): Map<String, Any>

    @GET("efm/ledger")
    suspend fun ledger(
        @Header("Authorization") authorization: String,
        @Query("periodKey") periodKey: String? = null,
    ): Map<String, Any>

    @GET("efm/ap/mobile/sync")
    suspend fun apSync(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("efm/ap/payables")
    suspend fun apPayables(
        @Header("Authorization") authorization: String,
        @Query("status") status: String? = null,
    ): List<Map<String, Any>>

    @GET("efm/ap/approvals/pending")
    suspend fun apPendingApprovals(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @POST("efm/ap/payments/{paymentKey}/approve")
    suspend fun approveApPayment(
        @Header("Authorization") authorization: String,
        @retrofit2.http.Path("paymentKey") paymentKey: String,
        @retrofit2.http.Body body: Map<String, String?>,
    ): Map<String, Any>

    @POST("efm/ap/incidents")
    suspend fun createApIncident(
        @Header("Authorization") authorization: String,
        @retrofit2.http.Body body: Map<String, String?>,
    ): Map<String, Any>

    @GET("efm/tr/mobile/sync")
    suspend fun trSync(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("efm/tr/balances")
    suspend fun trBalances(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("efm/tr/movements")
    suspend fun trMovements(
        @Header("Authorization") authorization: String,
        @Query("status") status: String? = "processed",
    ): List<Map<String, Any>>

    @POST("efm/tr/movements")
    suspend fun createTrMovement(
        @Header("Authorization") authorization: String,
        @retrofit2.http.Body body: Map<String, Any?>,
    ): Map<String, Any>

    @GET("efm/fa/mobile/sync")
    suspend fun faSync(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("efm/fa/assets")
    suspend fun faAssets(
        @Header("Authorization") authorization: String,
        @Query("status") status: String? = "active",
    ): List<Map<String, Any>>

    @GET("efm/fa/assets/scan/{tag}")
    suspend fun faScanAsset(
        @Header("Authorization") authorization: String,
        @retrofit2.http.Path("tag") tag: String,
    ): Map<String, Any>

    @POST("efm/fa/assets/{assetKey}/location")
    suspend fun faUpdateLocation(
        @Header("Authorization") authorization: String,
        @retrofit2.http.Path("assetKey") assetKey: String,
        @retrofit2.http.Body body: Map<String, String?>,
    ): Map<String, Any>

    @POST("efm/fa/assets/{assetKey}/photos")
    suspend fun faAddPhoto(
        @Header("Authorization") authorization: String,
        @retrofit2.http.Path("assetKey") assetKey: String,
        @retrofit2.http.Body body: Map<String, String?>,
    ): Map<String, Any>

    @POST("efm/fa/assets/{assetKey}/incidents")
    suspend fun faReportIncident(
        @Header("Authorization") authorization: String,
        @retrofit2.http.Path("assetKey") assetKey: String,
        @retrofit2.http.Body body: Map<String, String?>,
    ): Map<String, Any>

    @POST("efm/fa/physical-inventories/{inventoryKey}/scan")
    suspend fun faScanInventory(
        @Header("Authorization") authorization: String,
        @retrofit2.http.Path("inventoryKey") inventoryKey: String,
        @retrofit2.http.Body body: Map<String, String?>,
    ): Map<String, Any>

    @GET("efm/bg/mobile/sync")
    suspend fun bgSync(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("efm/bg/mobile/pending-approvals")
    suspend fun bgPendingApprovals(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("efm/fo/mobile/sync")
    suspend fun foSync(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("efm/fo/kpis")
    suspend fun foKpis(
        @Header("Authorization") authorization: String,
        @Query("periodKey") periodKey: String? = null,
    ): List<Map<String, Any>>

    @GET("efm/fo/statements")
    suspend fun foStatements(
        @Header("Authorization") authorization: String,
        @Query("periodKey") periodKey: String? = null,
    ): List<Map<String, Any>>

    @GET("efm/fo/alerts")
    suspend fun foAlerts(
        @Header("Authorization") authorization: String,
        @Query("unread") unread: String? = "true",
    ): List<Map<String, Any>>
}
