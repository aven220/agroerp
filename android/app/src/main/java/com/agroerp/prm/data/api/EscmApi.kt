package com.agroerp.prm.data.api

import com.google.gson.annotations.SerializedName
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

data class EscmCustomerDto(
    @SerializedName("customerKey") val customerKey: String,
    @SerializedName("legalName") val legalName: String,
    @SerializedName("customerType") val customerType: String?,
    val status: String?,
    @SerializedName("commercialName") val commercialName: String?,
    @SerializedName("priceListKey") val priceListKey: String?,
)

data class EscmResolvePriceRequest(
    @SerializedName("itemKey") val itemKey: String,
    @SerializedName("customerKey") val customerKey: String? = null,
    @SerializedName("regionKey") val regionKey: String? = null,
    val quantity: Double? = null,
)

data class EscmVisitSyncRequest(
    val visits: List<Map<String, @JvmSuppressWildcards Any>>,
)

data class EscmOpportunityDto(
    @SerializedName("opportunityKey") val opportunityKey: String,
    val title: String,
    @SerializedName("stageKey") val stageKey: String?,
    val status: String?,
    @SerializedName("estimatedValue") val estimatedValue: Double?,
    val probability: Double?,
)

data class EscmQuotationMobileDto(
    @SerializedName("quotationKey") val quotationKey: String,
    @SerializedName("customerKey") val customerKey: String,
    val status: String?,
    val version: Int?,
    @SerializedName("totalAmount") val totalAmount: Double?,
)

data class EscmOpportunitySyncRequest(
    val updates: List<Map<String, @JvmSuppressWildcards Any>>,
)

data class EscmQuotationApproveRequest(
    @SerializedName("signatureUrl") val signatureUrl: String? = null,
)

data class EscmOrderMobileDto(
    @SerializedName("orderKey") val orderKey: String,
    @SerializedName("customerKey") val customerKey: String,
    val status: String?,
    @SerializedName("orderType") val orderType: String?,
    @SerializedName("totalAmount") val totalAmount: Double?,
)

data class EscmOrderCreateRequest(
    @SerializedName("customerKey") val customerKey: String,
    val lines: List<Map<String, @JvmSuppressWildcards Any>>,
    val notes: String? = null,
    val submit: Boolean = true,
)

data class EscmOrderSyncRequest(
    val orders: List<Map<String, @JvmSuppressWildcards Any>>,
)

data class EscmOrderApprovalRequest(
    val comments: String? = null,
)

data class EscmDeliveryMobileRequest(
    val lines: List<Map<String, @JvmSuppressWildcards Any>>,
    val signatureUrl: String? = null,
    val photoUrls: List<String>? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val notes: String? = null,
)

data class EscmDeliverySyncRequest(
    val deliveries: List<Map<String, @JvmSuppressWildcards Any>>,
)

data class EscmWarrantyMobileRequest(
    @SerializedName("claimType") val claimType: String,
    @SerializedName("customerKey") val customerKey: String,
    val description: String,
    @SerializedName("invoiceKey") val invoiceKey: String? = null,
    @SerializedName("orderKey") val orderKey: String? = null,
    @SerializedName("itemKey") val itemKey: String? = null,
    @SerializedName("evidenceUrls") val evidenceUrls: List<String>? = null,
)

data class EscmWarrantySyncRequest(
    val claims: List<Map<String, @JvmSuppressWildcards Any>>,
)

data class EscmPaymentMobileRequest(
    @SerializedName("customerKey") val customerKey: String,
    @SerializedName("paymentMethod") val paymentMethod: String,
    val amount: Double,
    @SerializedName("referenceNumber") val referenceNumber: String? = null,
    val notes: String? = null,
    @SerializedName("supportUrls") val supportUrls: List<String>? = null,
    @SerializedName("autoApply") val autoApply: Boolean = true,
)

data class EscmPaymentSyncRequest(
    val payments: List<Map<String, @JvmSuppressWildcards Any>>,
)

data class EscmPaymentPromiseMobileRequest(
    @SerializedName("customerKey") val customerKey: String,
    @SerializedName("promisedAmount") val promisedAmount: Double,
    @SerializedName("promisedDate") val promisedDate: String,
    @SerializedName("receivableKey") val receivableKey: String? = null,
    val notes: String? = null,
    @SerializedName("supportUrls") val supportUrls: List<String>? = null,
)

data class EscmPaymentPromiseSyncRequest(
    val promises: List<Map<String, @JvmSuppressWildcards Any>>,
)

interface EscmApi {
    @GET("escm/mobile/customers")
    suspend fun customers(@Header("Authorization") authorization: String): List<EscmCustomerDto>

    @GET("escm/mobile/customers/{customerKey}")
    suspend fun customer(
        @Header("Authorization") authorization: String,
        @Path("customerKey") customerKey: String,
    ): Map<String, Any>

    @POST("escm/mobile/pricing/resolve")
    suspend fun resolvePrice(
        @Header("Authorization") authorization: String,
        @Body body: EscmResolvePriceRequest,
    ): Map<String, Any>

    @POST("escm/mobile/visits/sync")
    suspend fun syncVisits(
        @Header("Authorization") authorization: String,
        @Body body: EscmVisitSyncRequest,
    ): Map<String, Any>

    @GET("escm/mobile/opportunities")
    suspend fun opportunities(@Header("Authorization") authorization: String): List<EscmOpportunityDto>

    @GET("escm/mobile/quotations")
    suspend fun quotations(@Header("Authorization") authorization: String): List<EscmQuotationMobileDto>

    @GET("escm/mobile/quotations/{quotationKey}")
    suspend fun quotation(
        @Header("Authorization") authorization: String,
        @Path("quotationKey") quotationKey: String,
    ): Map<String, Any>

    @POST("escm/mobile/opportunities/sync")
    suspend fun syncOpportunities(
        @Header("Authorization") authorization: String,
        @Body body: EscmOpportunitySyncRequest,
    ): List<Any>

    @POST("escm/mobile/quotations/{quotationKey}/approve")
    suspend fun approveQuotation(
        @Header("Authorization") authorization: String,
        @Path("quotationKey") quotationKey: String,
        @Body body: EscmQuotationApproveRequest,
    ): Map<String, Any>

    @GET("escm/mobile/orders")
    suspend fun orders(@Header("Authorization") authorization: String): List<EscmOrderMobileDto>

    @GET("escm/mobile/orders/{orderKey}")
    suspend fun order(
        @Header("Authorization") authorization: String,
        @Path("orderKey") orderKey: String,
    ): Map<String, Any>

    @POST("escm/mobile/orders")
    suspend fun createOrder(
        @Header("Authorization") authorization: String,
        @Body body: EscmOrderCreateRequest,
    ): Map<String, Any>

    @POST("escm/mobile/orders/sync")
    suspend fun syncOrders(
        @Header("Authorization") authorization: String,
        @Body body: EscmOrderSyncRequest,
    ): List<Any>

    @POST("escm/mobile/approvals/{approvalKey}/approve")
    suspend fun approveOrder(
        @Header("Authorization") authorization: String,
        @Path("approvalKey") approvalKey: String,
        @Body body: EscmOrderApprovalRequest,
    ): Map<String, Any>

    @GET("escm/mobile/reservations")
    suspend fun reservations(
        @Header("Authorization") authorization: String,
        @retrofit2.http.Query("customerKey") customerKey: String? = null,
    ): List<Map<String, Any>>

    @GET("escm/mobile/routes")
    suspend fun routes(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("escm/mobile/routes/{routeKey}")
    suspend fun route(
        @Header("Authorization") authorization: String,
        @Path("routeKey") routeKey: String,
    ): Map<String, Any>

    @POST("escm/mobile/routes/{routeKey}/depart")
    suspend fun departRoute(
        @Header("Authorization") authorization: String,
        @Path("routeKey") routeKey: String,
    ): Map<String, Any>

    @GET("escm/mobile/dispatches")
    suspend fun dispatches(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @POST("escm/mobile/dispatches/{dispatchKey}/deliver")
    suspend fun deliverDispatch(
        @Header("Authorization") authorization: String,
        @Path("dispatchKey") dispatchKey: String,
        @Body body: EscmDeliveryMobileRequest,
    ): Map<String, Any>

    @POST("escm/mobile/deliveries/sync")
    suspend fun syncDeliveries(
        @Header("Authorization") authorization: String,
        @Body body: EscmDeliverySyncRequest,
    ): List<Any>

    @POST("escm/mobile/routes/{routeKey}/scan")
    suspend fun scanBarcode(
        @Header("Authorization") authorization: String,
        @Path("routeKey") routeKey: String,
        @Body body: Map<String, String>,
    ): Map<String, Any>

    @GET("escm/mobile/invoices")
    suspend fun invoices(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("escm/mobile/invoices/{invoiceKey}")
    suspend fun invoice(
        @Header("Authorization") authorization: String,
        @Path("invoiceKey") invoiceKey: String,
    ): Map<String, Any>

    @GET("escm/mobile/returns")
    suspend fun returns(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("escm/mobile/warranties")
    suspend fun warranties(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @POST("escm/mobile/warranties")
    suspend fun createWarranty(
        @Header("Authorization") authorization: String,
        @Body body: EscmWarrantyMobileRequest,
    ): Map<String, Any>

    @POST("escm/mobile/warranties/sync")
    suspend fun syncWarranties(
        @Header("Authorization") authorization: String,
        @Body body: EscmWarrantySyncRequest,
    ): List<Any>

    @GET("escm/mobile/receivables")
    suspend fun receivables(
        @Header("Authorization") authorization: String,
        @retrofit2.http.Query("customerKey") customerKey: String? = null,
    ): List<Map<String, Any>>

    @GET("escm/mobile/payments")
    suspend fun payments(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @POST("escm/mobile/payments")
    suspend fun createPayment(
        @Header("Authorization") authorization: String,
        @Body body: EscmPaymentMobileRequest,
    ): Map<String, Any>

    @POST("escm/mobile/payments/sync")
    suspend fun syncPayments(
        @Header("Authorization") authorization: String,
        @Body body: EscmPaymentSyncRequest,
    ): List<Any>

    @GET("escm/mobile/promises")
    suspend fun promises(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @POST("escm/mobile/promises")
    suspend fun createPromise(
        @Header("Authorization") authorization: String,
        @Body body: EscmPaymentPromiseMobileRequest,
    ): Map<String, Any>

    @POST("escm/mobile/promises/sync")
    suspend fun syncPromises(
        @Header("Authorization") authorization: String,
        @Body body: EscmPaymentPromiseSyncRequest,
    ): List<Any>

    @GET("escm/mobile/ops/sync")
    suspend fun opsSync(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("escm/mobile/ops/kpis")
    suspend fun opsKpis(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("escm/mobile/ops/alerts")
    suspend fun opsAlerts(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("escm/mobile/ops/reports/{reportType}")
    suspend fun opsReport(
        @Header("Authorization") authorization: String,
        @Path("reportType") reportType: String,
    ): Map<String, Any>
}
