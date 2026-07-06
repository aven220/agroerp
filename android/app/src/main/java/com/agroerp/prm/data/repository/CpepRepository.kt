package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.CpepApi
import com.agroerp.prm.data.api.CpepMobileConfigDto
import com.agroerp.prm.data.api.CpepPendingWeighDto
import com.agroerp.prm.data.api.CpepPhotoRequest
import com.agroerp.prm.data.api.CpepQualityRequest
import com.agroerp.prm.data.api.CpepSettlementRequest
import com.agroerp.prm.data.api.CpepSettlementSignRequest
import com.agroerp.prm.data.api.CpepScaleDto
import com.agroerp.prm.data.api.CpepSignatureRequest
import com.agroerp.prm.data.api.CpepTicketDto
import com.agroerp.prm.data.api.CpepTicketRequest
import com.agroerp.prm.data.api.CpepWeighRequest
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class CpepRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_cpep", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: CpepApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(AuthHttpClient.create(appContext))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(CpepApi::class.java)
    }

    fun queueOfflineTicket(request: CpepTicketRequest) {
        val pending = getPendingTickets().toMutableList()
        pending.add(request)
        prefs.edit().putString("pending_tickets", gson.toJson(pending)).apply()
    }

    fun getPendingTickets(): List<CpepTicketRequest> {
        val json = prefs.getString("pending_tickets", null) ?: return emptyList()
        return gson.fromJson(json, Array<CpepTicketRequest>::class.java).toList()
    }

    fun queueOfflineWeigh(request: CpepWeighRequest, ticketKey: String) {
        val pending = getPendingWeighs().toMutableList()
        pending.add(mapOf("ticketKey" to ticketKey, "payload" to request))
        prefs.edit().putString("pending_weighs", gson.toJson(pending)).apply()
    }

    fun getPendingWeighs(): List<Map<String, Any>> {
        val json = prefs.getString("pending_weighs", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun cacheScan(kind: String, payload: String) {
        prefs.edit().putString("last_$kind", payload).apply()
    }

    fun getLastScan(kind: String): String? = prefs.getString("last_$kind", null)

    fun cacheBleScale(mac: String, weightKg: Double) {
        prefs.edit()
            .putString("ble_scale_mac", mac)
            .putString("ble_scale_weight", weightKg.toString())
            .putString("last_ble", "$mac:$weightKg")
            .apply()
    }

    fun cacheUsbScale(deviceName: String, weightKg: Double) {
        prefs.edit()
            .putString("usb_scale_name", deviceName)
            .putString("usb_scale_weight", weightKg.toString())
            .putString("last_usb", "$deviceName:$weightKg")
            .apply()
    }

    fun getBleWeight(): Double? = prefs.getString("ble_scale_weight", null)?.toDoubleOrNull()

    fun getUsbWeight(): Double? = prefs.getString("usb_scale_weight", null)?.toDoubleOrNull()

    fun getCachedQueue(): List<CpepTicketDto> {
        val json = prefs.getString("queue", null) ?: return emptyList()
        return gson.fromJson(json, Array<CpepTicketDto>::class.java).toList()
    }

    fun getCachedWeighPending(): List<CpepPendingWeighDto> {
        val json = prefs.getString("weigh_pending", null) ?: return emptyList()
        return gson.fromJson(json, Array<CpepPendingWeighDto>::class.java).toList()
    }

    fun getCachedScales(): List<CpepScaleDto> {
        val json = prefs.getString("scales", null) ?: return emptyList()
        return gson.fromJson(json, Array<CpepScaleDto>::class.java).toList()
    }

    fun getCachedConfig(): CpepMobileConfigDto? {
        val json = prefs.getString("config_bundle", null) ?: return null
        return gson.fromJson(json, CpepMobileConfigDto::class.java)
    }

    fun catalogCountOffline(): Int = getCachedConfig()?.catalogs?.size ?: 0

    fun parameterCountOffline(): Int = getCachedConfig()?.parameters?.size ?: 0

    fun pendingWeighCount(): Int = getPendingWeighs().size

    fun queueOfflineQuality(ticketKey: String, request: CpepQualityRequest) {
        val pending = getPendingQualities().toMutableList()
        pending.add(mapOf("ticketKey" to ticketKey, "payload" to request))
        prefs.edit().putString("pending_qualities", gson.toJson(pending)).apply()
    }

    fun getPendingQualities(): List<Map<String, Any>> {
        val json = prefs.getString("pending_qualities", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun pendingQualityCount(): Int = getPendingQualities().size

    fun queueOfflineSettlement(ticketKey: String, request: CpepSettlementRequest, signerName: String) {
        val pending = getPendingSettlements().toMutableList()
        pending.add(
            mapOf(
                "ticketKey" to ticketKey,
                "payload" to request,
                "signerName" to signerName,
                "signatureData" to "signed-offline-${System.currentTimeMillis()}",
            ),
        )
        prefs.edit().putString("pending_settlements", gson.toJson(pending)).apply()
    }

    fun getPendingSettlements(): List<Map<String, Any>> {
        val json = prefs.getString("pending_settlements", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun pendingSettlementCount(): Int = getPendingSettlements().size

    fun getCachedSettlements(): List<Map<String, Any>> {
        val json = prefs.getString("settlements", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun getCachedSettlementPending(): List<CpepPendingWeighDto> {
        val json = prefs.getString("settlement_pending", null) ?: return emptyList()
        return gson.fromJson(json, Array<CpepPendingWeighDto>::class.java).toList()
    }

    fun getCachedQualityPending(): List<CpepPendingWeighDto> {
        val json = prefs.getString("quality_pending", null) ?: return emptyList()
        return gson.fromJson(json, Array<CpepPendingWeighDto>::class.java).toList()
    }

    fun getCachedQualityHistory(): List<Map<String, Any>> {
        val json = prefs.getString("quality_history", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    suspend fun syncOffline(): List<CpepTicketDto>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return getCachedQueue()
        return try {
            for (ticket in getPendingTickets()) {
                val created = api.createTicket("Bearer $token", ticket)
                api.addPhoto(
                    "Bearer $token",
                    created.ticketKey,
                    CpepPhotoRequest(photoKey = "photo-${System.currentTimeMillis()}", caption = "Recepción móvil"),
                )
                api.addSignature(
                    "Bearer $token",
                    created.ticketKey,
                    CpepSignatureRequest("producer", ticket.producerName, "signed-mobile"),
                )
            }
            prefs.edit().remove("pending_tickets").apply()

            for (item in getPendingWeighs()) {
                val ticketKey = item["ticketKey"]?.toString() ?: continue
                val payloadMap = item["payload"] as? Map<*, *> ?: continue
                val request = CpepWeighRequest(
                    grossWeightKg = (payloadMap["grossWeightKg"] as? Number)?.toDouble()
                        ?: payloadMap["grossWeightKg"]?.toString()?.toDoubleOrNull()
                        ?: continue,
                    tareWeightKg = (payloadMap["tareWeightKg"] as? Number)?.toDouble()
                        ?: payloadMap["tareWeightKg"]?.toString()?.toDoubleOrNull()
                        ?: 0.0,
                    source = payloadMap["source"]?.toString() ?: "manual_contingency",
                    contingency = true,
                    contingencyReason = payloadMap["contingencyReason"]?.toString()
                        ?: "Sincronización offline Android",
                    photoUrl = payloadMap["photoUrl"]?.toString(),
                    latitude = (payloadMap["latitude"] as? Number)?.toDouble(),
                    longitude = (payloadMap["longitude"] as? Number)?.toDouble(),
                    scaleKey = payloadMap["scaleKey"]?.toString(),
                    iotDeviceKey = payloadMap["iotDeviceKey"]?.toString(),
                )
                api.mobileWeigh("Bearer $token", ticketKey, request)
            }
            prefs.edit().remove("pending_weighs").apply()

            for (item in getPendingQualities()) {
                val ticketKey = item["ticketKey"]?.toString() ?: continue
                val payloadMap = item["payload"] as? Map<*, *> ?: continue
                val request = CpepQualityRequest(
                    humidityPct = (payloadMap["humidityPct"] as? Number)?.toDouble(),
                    temperatureC = (payloadMap["temperatureC"] as? Number)?.toDouble(),
                    factor = (payloadMap["factor"] as? Number)?.toDouble(),
                    pasillaPct = (payloadMap["pasillaPct"] as? Number)?.toDouble(),
                    brocaPct = (payloadMap["brocaPct"] as? Number)?.toDouble(),
                    blackBeansPct = (payloadMap["blackBeansPct"] as? Number)?.toDouble(),
                    vinegarBeansPct = (payloadMap["vinegarBeansPct"] as? Number)?.toDouble(),
                    brokenBeansPct = (payloadMap["brokenBeansPct"] as? Number)?.toDouble(),
                    foreignMatterPct = (payloadMap["foreignMatterPct"] as? Number)?.toDouble(),
                    impuritiesPct = (payloadMap["impuritiesPct"] as? Number)?.toDouble(),
                    color = payloadMap["color"]?.toString(),
                    odor = payloadMap["odor"]?.toString(),
                    observations = payloadMap["observations"]?.toString(),
                    inspectorComments = payloadMap["inspectorComments"]?.toString(),
                    photoKeys = listOfNotNull(payloadMap["photoKeys"]?.toString()?.takeIf { it.isNotBlank() }),
                )
                api.mobileQuality("Bearer $token", ticketKey, request)
            }
            prefs.edit().remove("pending_qualities").apply()

            for (item in getPendingSettlements()) {
                val ticketKey = item["ticketKey"]?.toString() ?: continue
                val signerName = item["signerName"]?.toString() ?: "Productor móvil"
                val signatureData = item["signatureData"]?.toString() ?: "signed-mobile"
                api.mobileSettlementSign(
                    "Bearer $token",
                    ticketKey,
                    CpepSettlementSignRequest(signerName, signatureData),
                )
            }
            prefs.edit().remove("pending_settlements").apply()

            val config = api.mobileConfig("Bearer $token")
            prefs.edit().putString("config_bundle", gson.toJson(config)).apply()
            val queue = api.queue("Bearer $token")
            prefs.edit().putString("queue", gson.toJson(queue)).apply()
            val pendingWeigh = api.weighingPending("Bearer $token")
            prefs.edit().putString("weigh_pending", gson.toJson(pendingWeigh)).apply()
            val scales = api.scales("Bearer $token")
            prefs.edit().putString("scales", gson.toJson(scales)).apply()
            val qualityPending = api.qualityPending("Bearer $token")
            prefs.edit().putString("quality_pending", gson.toJson(qualityPending)).apply()
            val qualityHistory = api.qualityHistory("Bearer $token")
            prefs.edit().putString("quality_history", gson.toJson(qualityHistory)).apply()
            val settlementPending = api.settlementsPending("Bearer $token")
            prefs.edit().putString("settlement_pending", gson.toJson(settlementPending)).apply()
            val settlements = api.settlements("Bearer $token")
            prefs.edit().putString("settlements", gson.toJson(settlements)).apply()
            val inventoryLots = api.inventoryLots("Bearer $token")
            cacheInventoryLots(inventoryLots)
            try {
                prefs.edit().putString("ops_center", gson.toJson(api.mobileOps("Bearer $token"))).apply()
                prefs.edit().putString("ops_kpis", gson.toJson(api.mobileKpis("Bearer $token"))).apply()
                prefs.edit().putString("ops_alerts", gson.toJson(api.mobileAlerts("Bearer $token"))).apply()
            } catch (_: Exception) {
                // keep previous offline ops cache
            }
            val lastQr = getLastScan("inventory_qr")
            if (lastQr != null) {
                try {
                    cacheTrace(lastQr, api.inventoryByQr("Bearer $token", lastQr))
                } catch (_: Exception) {
                    // keep offline cache
                }
            }
            queue
        } catch (_: Exception) {
            getCachedQueue()
        }
    }

    fun captureWeightOffline(
        ticketKey: String,
        grossWeightKg: Double,
        tareWeightKg: Double,
        reason: String,
        source: String = "manual_contingency",
        scaleKey: String? = null,
        photoUrl: String? = null,
    ) {
        queueOfflineWeigh(
            CpepWeighRequest(
                grossWeightKg = grossWeightKg,
                tareWeightKg = tareWeightKg,
                source = source,
                contingency = true,
                contingencyReason = reason,
                photoUrl = photoUrl ?: getLastScan("photo"),
                latitude = 4.71,
                longitude = -74.07,
                scaleKey = scaleKey,
                iotDeviceKey = scaleKey,
            ),
            ticketKey,
        )
    }

    fun captureQualityOffline(ticketKey: String, photoKey: String? = null) {
        queueOfflineQuality(
            ticketKey,
            CpepQualityRequest(
                humidityPct = 11.2,
                temperatureC = 22.0,
                factor = 92.0,
                pasillaPct = 1.1,
                brocaPct = 0.4,
                blackBeansPct = 0.3,
                vinegarBeansPct = 0.1,
                brokenBeansPct = 0.8,
                foreignMatterPct = 0.1,
                impuritiesPct = 0.2,
                color = "verde oliva",
                odor = "limpio",
                observations = "Evaluación offline Android",
                inspectorComments = "Captura móvil",
                photoKeys = listOfNotNull(photoKey ?: getLastScan("photo")),
            ),
        )
    }

    fun getCachedOps(): Map<String, Any>? {
        val json = prefs.getString("ops_center", null) ?: return null
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedKpis(): Map<String, Any>? {
        val json = prefs.getString("ops_kpis", null) ?: return null
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedAlerts(): List<Map<String, Any>> {
        val json = prefs.getString("ops_alerts", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun cacheInventoryLots(lots: List<Map<String, Any>>) {
        prefs.edit().putString("inventory_lots", gson.toJson(lots)).apply()
    }

    fun getCachedInventoryLots(): List<Map<String, Any>> {
        val json = prefs.getString("inventory_lots", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun cacheTrace(code: String, payload: Map<String, Any>) {
        prefs.edit().putString("trace_$code", gson.toJson(payload)).apply()
        cacheScan("inventory_qr", code)
    }

    fun getCachedTrace(code: String): Map<String, Any>? {
        val json = prefs.getString("trace_$code", null) ?: return null
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun captureSettlementOffline(ticketKey: String, signerName: String = "Productor móvil") {
        queueOfflineSettlement(
            ticketKey,
            CpepSettlementRequest(
                basePricePerKg = 12000.0,
                transportTotal = 50000.0,
                advancesTotal = 0.0,
                discountsTotal = 0.0,
                paidAmount = 0.0,
            ),
            signerName,
        )
        cacheScan("signature", "sig-settlement-$ticketKey")
    }
}
