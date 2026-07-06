package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.EimsApi
import com.agroerp.prm.data.api.EimsItemDto
import com.agroerp.prm.data.api.EimsMovementRequest
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class EimsRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_eims", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: EimsApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(AuthHttpClient.create(appContext))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(EimsApi::class.java)
    }

    fun cacheScan(kind: String, payload: String) {
        prefs.edit().putString("last_$kind", payload).apply()
    }

    fun getLastScan(kind: String): String? = prefs.getString("last_$kind", null)

    fun getCachedItems(): List<EimsItemDto> {
        val json = prefs.getString("items", null) ?: return emptyList()
        return gson.fromJson(json, Array<EimsItemDto>::class.java).toList()
    }

    fun getCachedItem(code: String): Map<String, Any>? {
        val json = prefs.getString("item_$code", null) ?: return null
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun catalogCountOffline(): Int {
        val json = prefs.getString("catalogs", null) ?: return 0
        return gson.fromJson(json, Array<Any>::class.java).size
    }

    fun queueOfflineMovement(request: EimsMovementRequest) {
        val pending = getPendingMovements().toMutableList()
        pending.add(request)
        prefs.edit().putString("pending_movements", gson.toJson(pending)).apply()
    }

    fun getPendingMovements(): List<EimsMovementRequest> {
        val json = prefs.getString("pending_movements", null) ?: return emptyList()
        return gson.fromJson(json, Array<EimsMovementRequest>::class.java).toList()
    }

    fun pendingMovementCount(): Int = getPendingMovements().size

    fun getCachedStock(): List<Map<String, Any>> {
        val json = prefs.getString("stock", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun getCachedKardex(): List<Map<String, Any>> {
        val json = prefs.getString("kardex", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun getCachedCosts(): Map<String, Any>? {
        val json = prefs.getString("costs", null) ?: return null
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedLots(): List<Map<String, Any>> {
        val json = prefs.getString("lots", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun getCachedLot(code: String): Map<String, Any>? {
        val json = prefs.getString("lot_$code", null) ?: return null
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedLotTimeline(lotKey: String): List<Map<String, Any>> {
        val json = prefs.getString("lot_timeline_$lotKey", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun queueIncident(lotKey: String, title: String, description: String = "") {
        val pending = getPendingIncidents().toMutableList()
        pending.add(mapOf("lotKey" to lotKey, "title" to title, "description" to description, "severity" to "warning"))
        prefs.edit().putString("pending_incidents", gson.toJson(pending)).apply()
    }

    fun getPendingIncidents(): List<Map<String, Any>> {
        val json = prefs.getString("pending_incidents", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun pendingIncidentCount(): Int = getPendingIncidents().size

    fun getCachedCounts(): List<Map<String, Any>> {
        val json = prefs.getString("counts", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun getCachedCount(countKey: String): Map<String, Any>? {
        val json = prefs.getString("count_$countKey", null) ?: return null
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun queueCountCapture(countKey: String, payload: Map<String, Any>) {
        val pending = getPendingCountCaptures().toMutableList()
        pending.add(payload + mapOf("countKey" to countKey, "offline" to true))
        prefs.edit().putString("pending_count_captures", gson.toJson(pending)).apply()
    }

    fun getPendingCountCaptures(): List<Map<String, Any>> {
        val json = prefs.getString("pending_count_captures", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun pendingCountCaptureCount(): Int = getPendingCountCaptures().size

    fun queueCountPhoto(countKey: String, caption: String, storageUrl: String = "offline://photo") {
        val pending = getPendingCountPhotos().toMutableList()
        pending.add(
            mapOf(
                "countKey" to countKey,
                "caption" to caption,
                "storageUrl" to storageUrl,
                "offline" to true,
            ),
        )
        prefs.edit().putString("pending_count_photos", gson.toJson(pending)).apply()
    }

    fun getPendingCountPhotos(): List<Map<String, Any>> {
        val json = prefs.getString("pending_count_photos", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun pendingCountPhotoCount(): Int = getPendingCountPhotos().size

    fun getCachedReservations(): List<Map<String, Any>> {
        val json = prefs.getString("reservations", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun getCachedSupplyAlerts(): List<Map<String, Any>> {
        val json = prefs.getString("supply_alerts", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun getCachedSupplySuggestions(): List<Map<String, Any>> {
        val json = prefs.getString("supply_suggestions", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun getCachedOpsKpis(): Map<String, Any>? {
        val json = prefs.getString("ops_kpis", null) ?: return null
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedOpsAlerts(): List<Map<String, Any>> {
        val json = prefs.getString("ops_alerts", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun getCachedOpsReportRuns(): List<Map<String, Any>> {
        val json = prefs.getString("ops_report_runs", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    suspend fun syncOffline(): List<EimsItemDto> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return getCachedItems()
        return try {
            for (movement in getPendingMovements()) {
                api.postMovement("Bearer $token", movement)
            }
            prefs.edit().remove("pending_movements").apply()
            for (incident in getPendingIncidents()) {
                api.registerIncident("Bearer $token", incident)
            }
            prefs.edit().remove("pending_incidents").apply()
            for (capture in getPendingCountCaptures()) {
                val countKey = capture["countKey"]?.toString() ?: continue
                api.captureCount("Bearer $token", countKey, capture)
            }
            prefs.edit().remove("pending_count_captures").apply()
            for (photo in getPendingCountPhotos()) {
                val countKey = photo["countKey"]?.toString() ?: continue
                api.countPhoto("Bearer $token", countKey, photo)
            }
            prefs.edit().remove("pending_count_photos").apply()
            val items = api.items("Bearer $token")
            prefs.edit().putString("items", gson.toJson(items)).apply()
            val catalogs = api.catalogs("Bearer $token")
            prefs.edit().putString("catalogs", gson.toJson(catalogs)).apply()
            val stock = api.stock("Bearer $token")
            prefs.edit().putString("stock", gson.toJson(stock)).apply()
            val kardex = api.kardex("Bearer $token")
            prefs.edit().putString("kardex", gson.toJson(kardex)).apply()
            val costs = api.costs("Bearer $token")
            prefs.edit().putString("costs", gson.toJson(costs)).apply()
            val lots = api.lots("Bearer $token")
            prefs.edit().putString("lots", gson.toJson(lots)).apply()
            val counts = api.counts("Bearer $token")
            prefs.edit().putString("counts", gson.toJson(counts)).apply()
            val reservations = api.reservations("Bearer $token")
            prefs.edit().putString("reservations", gson.toJson(reservations)).apply()
            val supplyAlerts = api.supplyAlerts("Bearer $token")
            prefs.edit().putString("supply_alerts", gson.toJson(supplyAlerts)).apply()
            val supplySuggestions = api.supplySuggestions("Bearer $token")
            prefs.edit().putString("supply_suggestions", gson.toJson(supplySuggestions)).apply()
            val opsKpis = api.opsKpis("Bearer $token")
            prefs.edit().putString("ops_kpis", gson.toJson(opsKpis)).apply()
            val opsAlerts = api.opsAlerts("Bearer $token")
            prefs.edit().putString("ops_alerts", gson.toJson(opsAlerts)).apply()
            val opsReportRuns = api.opsReportRuns("Bearer $token")
            prefs.edit().putString("ops_report_runs", gson.toJson(opsReportRuns)).apply()
            for (count in counts.take(10)) {
                val countKey = count["countKey"]?.toString() ?: continue
                try {
                    val detail = api.count("Bearer $token", countKey)
                    prefs.edit().putString("count_$countKey", gson.toJson(detail)).apply()
                } catch (_: Exception) {
                    // keep offline count cache
                }
            }
            val lastCode = getLastScan("qr") ?: getLastScan("barcode")
            if (lastCode != null) {
                try {
                    val item = api.itemByCode("Bearer $token", lastCode)
                    prefs.edit().putString("item_$lastCode", gson.toJson(item)).apply()
                } catch (_: Exception) {
                    // keep offline
                }
                try {
                    val lot = api.lotByCode("Bearer $token", lastCode)
                    prefs.edit().putString("lot_$lastCode", gson.toJson(lot)).apply()
                    val lotKey = lot["lotKey"]?.toString()
                    if (lotKey != null) {
                        val timeline = api.lotTimeline("Bearer $token", lotKey)
                        prefs.edit().putString("lot_timeline_$lotKey", gson.toJson(timeline)).apply()
                    }
                } catch (_: Exception) {
                    // keep offline lot cache
                }
            }
            items
        } catch (_: Exception) {
            getCachedItems()
        }
    }
}
