package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.EscmApi
import com.agroerp.prm.data.api.EscmCustomerDto
import com.agroerp.prm.data.api.EscmOpportunityDto
import com.agroerp.prm.data.api.EscmOpportunitySyncRequest
import com.agroerp.prm.data.api.EscmQuotationApproveRequest
import com.agroerp.prm.data.api.EscmQuotationMobileDto
import com.agroerp.prm.data.api.EscmResolvePriceRequest
import com.agroerp.prm.data.api.EscmOrderCreateRequest
import com.agroerp.prm.data.api.EscmOrderMobileDto
import com.agroerp.prm.data.api.EscmOrderSyncRequest
import com.agroerp.prm.data.api.EscmOrderApprovalRequest
import com.agroerp.prm.data.api.EscmDeliveryMobileRequest
import com.agroerp.prm.data.api.EscmDeliverySyncRequest
import com.agroerp.prm.data.api.EscmPaymentPromiseSyncRequest
import com.agroerp.prm.data.api.EscmPaymentSyncRequest
import com.agroerp.prm.data.api.EscmWarrantySyncRequest
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class EscmRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_escm", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: EscmApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(AuthHttpClient.create(appContext))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(EscmApi::class.java)
    }

    fun getCachedCustomers(): List<EscmCustomerDto> {
        val json = prefs.getString("customers", null) ?: return emptyList()
        return gson.fromJson(json, Array<EscmCustomerDto>::class.java).toList()
    }

    fun getCachedCustomer(customerKey: String): Map<String, Any>? {
        val json = prefs.getString("customer_$customerKey", null) ?: return null
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedPrice(itemKey: String, customerKey: String?): Map<String, Any>? {
        val key = "price_${customerKey ?: "none"}_$itemKey"
        val json = prefs.getString(key, null) ?: return null
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun queueVisit(
        customerKey: String,
        purpose: String,
        outcome: String = "",
        visitKey: String = "VST-$customerKey-${System.currentTimeMillis()}",
    ) {
        val pending = getPendingVisits().toMutableList()
        pending.add(
            mapOf(
                "customerKey" to customerKey,
                "visitKey" to visitKey,
                "visitedAt" to java.time.Instant.now().toString(),
                "purpose" to purpose,
                "outcome" to outcome,
                "offline" to true,
            ),
        )
        prefs.edit().putString("pending_visits", gson.toJson(pending)).apply()
    }

    fun getPendingVisits(): List<Map<String, Any>> {
        val json = prefs.getString("pending_visits", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun pendingVisitCount(): Int = getPendingVisits().size

    fun getCachedOpportunities(): List<EscmOpportunityDto> {
        val json = prefs.getString("opportunities", null) ?: return emptyList()
        return gson.fromJson(json, Array<EscmOpportunityDto>::class.java).toList()
    }

    fun getCachedQuotations(): List<EscmQuotationMobileDto> {
        val json = prefs.getString("quotations", null) ?: return emptyList()
        return gson.fromJson(json, Array<EscmQuotationMobileDto>::class.java).toList()
    }

    fun getCachedQuotation(quotationKey: String): Map<String, Any>? {
        val json = prefs.getString("quotation_$quotationKey", null) ?: return null
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun queueOpportunityUpdate(opportunityKey: String, stageKey: String, probability: Double? = null) {
        val pending = getPendingOpportunityUpdates().toMutableList()
        pending.add(
            mapOf(
                "opportunityKey" to opportunityKey,
                "stageKey" to stageKey,
                "probability" to (probability ?: 0.0),
                "updatedAt" to java.time.Instant.now().toString(),
            ),
        )
        prefs.edit().putString("pending_opportunity_updates", gson.toJson(pending)).apply()
    }

    fun getPendingOpportunityUpdates(): List<Map<String, Any>> {
        val json = prefs.getString("pending_opportunity_updates", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun pendingOpportunityUpdateCount(): Int = getPendingOpportunityUpdates().size

    fun queueQuotationSignature(quotationKey: String, signatureUrl: String = "offline://signature") {
        val pending = getPendingQuotationApprovals().toMutableList()
        pending.add(mapOf("quotationKey" to quotationKey, "signatureUrl" to signatureUrl))
        prefs.edit().putString("pending_quotation_approvals", gson.toJson(pending)).apply()
    }

    fun getPendingQuotationApprovals(): List<Map<String, Any>> {
        val json = prefs.getString("pending_quotation_approvals", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun pendingQuotationApprovalCount(): Int = getPendingQuotationApprovals().size

    fun getCachedOrders(): List<EscmOrderMobileDto> {
        val json = prefs.getString("orders", null) ?: return emptyList()
        return gson.fromJson(json, Array<EscmOrderMobileDto>::class.java).toList()
    }

    fun getCachedOrder(orderKey: String): Map<String, Any>? {
        val json = prefs.getString("order_$orderKey", null) ?: return null
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedReservations(): List<Map<String, Any>> {
        val json = prefs.getString("reservations", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun queueOrder(
        customerKey: String,
        itemKey: String = "CAF-PERG-001",
        quantity: Double = 1.0,
        unitPrice: Double = 5000.0,
        clientRef: String = "ORD-${System.currentTimeMillis()}",
    ) {
        val pending = getPendingOrders().toMutableList()
        pending.add(
            mapOf(
                "clientRef" to clientRef,
                "customerKey" to customerKey,
                "lines" to listOf(
                    mapOf(
                        "itemKey" to itemKey,
                        "quantity" to quantity,
                        "unitPrice" to unitPrice,
                        "taxKey" to "iva_19",
                    ),
                ),
                "notes" to "Pedido móvil offline",
            ),
        )
        prefs.edit().putString("pending_orders", gson.toJson(pending)).apply()
    }

    fun getPendingOrders(): List<Map<String, Any>> {
        val json = prefs.getString("pending_orders", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun pendingOrderCount(): Int = getPendingOrders().size

    fun queueOrderApproval(approvalKey: String, comments: String = "Aprobado móvil") {
        val pending = getPendingOrderApprovals().toMutableList()
        pending.add(mapOf("approvalKey" to approvalKey, "comments" to comments))
        prefs.edit().putString("pending_order_approvals", gson.toJson(pending)).apply()
    }

    fun getPendingOrderApprovals(): List<Map<String, Any>> {
        val json = prefs.getString("pending_order_approvals", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun pendingOrderApprovalCount(): Int = getPendingOrderApprovals().size

    fun getCachedRoutes(): List<Map<String, Any>> {
        val json = prefs.getString("routes", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun getCachedDispatches(): List<Map<String, Any>> {
        val json = prefs.getString("dispatches", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun queueDelivery(
        dispatchKey: String,
        lines: List<Map<String, Any>>,
        signatureUrl: String = "offline://signature",
    ) {
        val pending = getPendingDeliveries().toMutableList()
        pending.add(
            mapOf(
                "clientRef" to "DLV-${System.currentTimeMillis()}",
                "dispatchKey" to dispatchKey,
                "lines" to lines,
                "signatureUrl" to signatureUrl,
                "photoUrls" to emptyList<String>(),
            ),
        )
        prefs.edit().putString("pending_deliveries", gson.toJson(pending)).apply()
    }

    fun getPendingDeliveries(): List<Map<String, Any>> {
        val json = prefs.getString("pending_deliveries", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun pendingDeliveryCount(): Int = getPendingDeliveries().size

    fun getCachedInvoices(): List<Map<String, Any>> {
        val json = prefs.getString("invoices", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun getCachedReturns(): List<Map<String, Any>> {
        val json = prefs.getString("returns", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun getCachedWarranties(): List<Map<String, Any>> {
        val json = prefs.getString("warranties", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun queueWarrantyClaim(
        customerKey: String,
        claimType: String = "product",
        description: String = "Reclamo móvil offline",
        invoiceKey: String? = null,
        itemKey: String? = null,
        evidenceUrls: List<String> = listOf("offline://photo"),
    ) {
        val pending = getPendingWarrantyClaims().toMutableList()
        pending.add(
            mapOf(
                "clientRef" to "WAR-${System.currentTimeMillis()}",
                "claimType" to claimType,
                "customerKey" to customerKey,
                "description" to description,
                "invoiceKey" to invoiceKey,
                "itemKey" to itemKey,
                "evidenceUrls" to evidenceUrls,
            ),
        )
        prefs.edit().putString("pending_warranty_claims", gson.toJson(pending)).apply()
    }

    fun getPendingWarrantyClaims(): List<Map<String, Any>> {
        val json = prefs.getString("pending_warranty_claims", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun pendingWarrantyClaimCount(): Int = getPendingWarrantyClaims().size

    fun getCachedReceivables(): List<Map<String, Any>> {
        val json = prefs.getString("receivables", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun getCachedPayments(): List<Map<String, Any>> {
        val json = prefs.getString("payments", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun getCachedPromises(): List<Map<String, Any>> {
        val json = prefs.getString("promises", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun queuePayment(
        customerKey: String,
        amount: Double = 1000.0,
        paymentMethod: String = "cash",
        supportUrls: List<String> = listOf("offline://receipt"),
    ) {
        val pending = getPendingPayments().toMutableList()
        pending.add(
            mapOf(
                "clientRef" to "PAY-${System.currentTimeMillis()}",
                "customerKey" to customerKey,
                "paymentMethod" to paymentMethod,
                "amount" to amount,
                "supportUrls" to supportUrls,
                "autoApply" to true,
            ),
        )
        prefs.edit().putString("pending_payments", gson.toJson(pending)).apply()
    }

    fun getPendingPayments(): List<Map<String, Any>> {
        val json = prefs.getString("pending_payments", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun pendingPaymentCount(): Int = getPendingPayments().size

    fun queuePromise(
        customerKey: String,
        promisedAmount: Double = 500.0,
        receivableKey: String? = null,
        supportUrls: List<String> = listOf("offline://promise"),
    ) {
        val pending = getPendingPromises().toMutableList()
        val promisedDate = java.time.Instant.now().plus(java.time.Duration.ofDays(7)).toString()
        pending.add(
            mapOf(
                "clientRef" to "PRM-${System.currentTimeMillis()}",
                "customerKey" to customerKey,
                "promisedAmount" to promisedAmount,
                "promisedDate" to promisedDate,
                "receivableKey" to receivableKey,
                "supportUrls" to supportUrls,
            ),
        )
        prefs.edit().putString("pending_promises", gson.toJson(pending)).apply()
    }

    fun getPendingPromises(): List<Map<String, Any>> {
        val json = prefs.getString("pending_promises", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun pendingPromiseCount(): Int = getPendingPromises().size

    fun getCachedOpsCenter(): Map<String, Any> {
        val json = prefs.getString("ops_center", null) ?: return emptyMap()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedOpsKpis(): Map<String, Any> {
        val json = prefs.getString("ops_kpis", null) ?: return emptyMap()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedOpsAlerts(): List<Map<String, Any>> {
        val json = prefs.getString("ops_alerts", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    suspend fun fetchOpsReport(reportType: String): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return null
        return try {
            val result = api.opsReport("Bearer $token", reportType)
            prefs.edit().putString("ops_report_$reportType", gson.toJson(result)).apply()
            result
        } catch (_: Exception) {
            val cached = prefs.getString("ops_report_$reportType", null)
            if (cached != null) {
                @Suppress("UNCHECKED_CAST")
                gson.fromJson(cached, Map::class.java) as Map<String, Any>
            } else null
        }
    }

    suspend fun syncOffline(): List<EscmCustomerDto> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return getCachedCustomers()
        return try {
            val auth = "Bearer $token"
            val customers = api.customers(auth)
            prefs.edit().putString("customers", gson.toJson(customers)).apply()
            for (c in customers.take(20)) {
                try {
                    val detail = api.customer(auth, c.customerKey)
                    prefs.edit().putString("customer_${c.customerKey}", gson.toJson(detail)).apply()
                } catch (_: Exception) {
                }
            }
            val firstItem = "CAF-PERG-001"
            for (c in customers.take(5)) {
                try {
                    val price = api.resolvePrice(
                        auth,
                        EscmResolvePriceRequest(itemKey = firstItem, customerKey = c.customerKey, quantity = 1.0),
                    )
                    prefs.edit().putString("price_${c.customerKey}_$firstItem", gson.toJson(price)).apply()
                } catch (_: Exception) {
                }
            }
            val pending = getPendingVisits()
            if (pending.isNotEmpty()) {
                api.syncVisits(auth, EscmVisitSyncRequest(visits = pending))
                prefs.edit().remove("pending_visits").apply()
            }
            try {
                val opportunities = api.opportunities(auth)
                prefs.edit().putString("opportunities", gson.toJson(opportunities)).apply()
            } catch (_: Exception) {
            }
            try {
                val quotations = api.quotations(auth)
                prefs.edit().putString("quotations", gson.toJson(quotations)).apply()
                for (q in quotations.take(10)) {
                    try {
                        val detail = api.quotation(auth, q.quotationKey)
                        prefs.edit().putString("quotation_${q.quotationKey}", gson.toJson(detail)).apply()
                    } catch (_: Exception) {
                    }
                }
            } catch (_: Exception) {
            }
            val oppPending = getPendingOpportunityUpdates()
            if (oppPending.isNotEmpty()) {
                api.syncOpportunities(auth, EscmOpportunitySyncRequest(updates = oppPending))
                prefs.edit().remove("pending_opportunity_updates").apply()
            }
            val quotePending = getPendingQuotationApprovals()
            if (quotePending.isNotEmpty()) {
                for (item in quotePending) {
                    try {
                        api.approveQuotation(
                            auth,
                            item["quotationKey"].toString(),
                            EscmQuotationApproveRequest(signatureUrl = item["signatureUrl"]?.toString()),
                        )
                    } catch (_: Exception) {
                    }
                }
                prefs.edit().remove("pending_quotation_approvals").apply()
            }
            try {
                val orders = api.orders(auth)
                prefs.edit().putString("orders", gson.toJson(orders)).apply()
                for (o in orders.take(10)) {
                    try {
                        val detail = api.order(auth, o.orderKey)
                        prefs.edit().putString("order_${o.orderKey}", gson.toJson(detail)).apply()
                    } catch (_: Exception) {
                    }
                }
            } catch (_: Exception) {
            }
            try {
                val reservations = api.reservations(auth)
                prefs.edit().putString("reservations", gson.toJson(reservations)).apply()
            } catch (_: Exception) {
            }
            val orderPending = getPendingOrders()
            if (orderPending.isNotEmpty()) {
                api.syncOrders(auth, EscmOrderSyncRequest(orders = orderPending))
                prefs.edit().remove("pending_orders").apply()
            }
            val orderApprovalPending = getPendingOrderApprovals()
            if (orderApprovalPending.isNotEmpty()) {
                for (item in orderApprovalPending) {
                    try {
                        api.approveOrder(
                            auth,
                            item["approvalKey"].toString(),
                            EscmOrderApprovalRequest(comments = item["comments"]?.toString()),
                        )
                    } catch (_: Exception) {
                    }
                }
                prefs.edit().remove("pending_order_approvals").apply()
            }
            try {
                val routes = api.routes(auth)
                prefs.edit().putString("routes", gson.toJson(routes)).apply()
            } catch (_: Exception) {
            }
            try {
                val dispatches = api.dispatches(auth)
                prefs.edit().putString("dispatches", gson.toJson(dispatches)).apply()
            } catch (_: Exception) {
            }
            val deliveryPending = getPendingDeliveries()
            if (deliveryPending.isNotEmpty()) {
                api.syncDeliveries(auth, EscmDeliverySyncRequest(deliveries = deliveryPending))
                prefs.edit().remove("pending_deliveries").apply()
            }
            try {
                val invoices = api.invoices(auth)
                prefs.edit().putString("invoices", gson.toJson(invoices)).apply()
            } catch (_: Exception) {
            }
            try {
                val returns = api.returns(auth)
                prefs.edit().putString("returns", gson.toJson(returns)).apply()
            } catch (_: Exception) {
            }
            try {
                val warranties = api.warranties(auth)
                prefs.edit().putString("warranties", gson.toJson(warranties)).apply()
            } catch (_: Exception) {
            }
            val warrantyPending = getPendingWarrantyClaims()
            if (warrantyPending.isNotEmpty()) {
                api.syncWarranties(auth, EscmWarrantySyncRequest(claims = warrantyPending))
                prefs.edit().remove("pending_warranty_claims").apply()
            }
            try {
                val receivables = api.receivables(auth)
                prefs.edit().putString("receivables", gson.toJson(receivables)).apply()
            } catch (_: Exception) {
            }
            try {
                val paymentsCached = api.payments(auth)
                prefs.edit().putString("payments", gson.toJson(paymentsCached)).apply()
            } catch (_: Exception) {
            }
            try {
                val promisesCached = api.promises(auth)
                prefs.edit().putString("promises", gson.toJson(promisesCached)).apply()
            } catch (_: Exception) {
            }
            val paymentPending = getPendingPayments()
            if (paymentPending.isNotEmpty()) {
                api.syncPayments(auth, EscmPaymentSyncRequest(payments = paymentPending))
                prefs.edit().remove("pending_payments").apply()
            }
            val promisePending = getPendingPromises()
            if (promisePending.isNotEmpty()) {
                api.syncPromises(auth, EscmPaymentPromiseSyncRequest(promises = promisePending))
                prefs.edit().remove("pending_promises").apply()
            }
            try {
                val opsSync = api.opsSync(auth)
                prefs.edit().putString("ops_sync", gson.toJson(opsSync)).apply()
                prefs.edit().putString("ops_center", gson.toJson(opsSync["center"])).apply()
                prefs.edit().putString("ops_kpis", gson.toJson(opsSync["kpis"])).apply()
                prefs.edit().putString("ops_alerts", gson.toJson(opsSync["alerts"])).apply()
            } catch (_: Exception) {
            }
            customers
        } catch (_: Exception) {
            getCachedCustomers()
        }
    }

    suspend fun resolvePriceOnline(itemKey: String, customerKey: String?): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return null
        return try {
            val price = api.resolvePrice(
                "Bearer $token",
                EscmResolvePriceRequest(itemKey = itemKey, customerKey = customerKey, quantity = 1.0),
            )
            prefs.edit().putString("price_${customerKey ?: "none"}_$itemKey", gson.toJson(price)).apply()
            price
        } catch (_: Exception) {
            getCachedPrice(itemKey, customerKey)
        }
    }
}
