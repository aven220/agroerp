package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.EmfgApi
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class EmfgRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_emfg", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: EmfgApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(AuthHttpClient.create())
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(EmfgApi::class.java)
    }

    fun getCachedCenter(): Map<String, Any> = readMap("center")
    fun getCachedOrders(): List<Map<String, Any>> = readList("orders")
    fun getCachedSchedule(): List<Map<String, Any>> = readList("schedule")
    fun getCachedConflicts(): List<Map<String, Any>> = readList("conflicts")

    suspend fun syncOffline(): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return offlineFallback()
        return try {
            val auth = "Bearer $token"
            val sync = api.sync(auth)
            prefs.edit()
                .putString("center", gson.toJson(sync["center"]))
                .putString("orders", gson.toJson(sync["orders"]))
                .putString("schedule", gson.toJson(sync["schedule"]))
                .putString("conflicts", gson.toJson(sync["conflicts"]))
                .putString("syncedAt", sync["syncedAt"]?.toString())
                .apply()
            sync
        } catch (_: Exception) {
            offlineFallback()
        }
    }

    suspend fun updateOrderStatus(orderKey: String, status: String): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: throw IllegalStateException("No auth")
        val result = api.updateOrderStatus("Bearer $token", orderKey, mapOf("status" to status))
        syncOffline()
        return result
    }

    suspend fun recordProgress(orderKey: String, qtyProduced: Double, orderOpKey: String? = null): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: throw IllegalStateException("No auth")
        val body = mutableMapOf<String, Any?>("qtyProduced" to qtyProduced)
        if (orderOpKey != null) body["orderOpKey"] = orderOpKey
        val result = api.recordProgress("Bearer $token", orderKey, body)
        syncOffline()
        return result
    }

    suspend fun updateOperationStatus(orderOpKey: String, status: String): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: throw IllegalStateException("No auth")
        val result = api.updateOperationStatus("Bearer $token", orderOpKey, mapOf("status" to status))
        syncOffline()
        return result
    }

    suspend fun mesExecute(orderKey: String, action: String, operatorKey: String? = null): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return queueOffline("execute", orderKey, mapOf("action" to action, "operatorKey" to operatorKey))
        return try {
            val result = api.mesExecute("Bearer $token", orderKey, mapOf("action" to action, "operatorKey" to operatorKey))
            syncOffline()
            result
        } catch (_: Exception) {
            queueOffline("execute", orderKey, mapOf("action" to action, "operatorKey" to operatorKey))
        }
    }

    suspend fun mesProduce(orderKey: String, outputType: String, quantity: Double): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return queueOffline("produce", orderKey, mapOf("outputType" to outputType, "quantity" to quantity))
        return try {
            val result = api.mesProduce("Bearer $token", orderKey, mapOf("outputType" to outputType, "quantity" to quantity, "isPartial" to true))
            syncOffline()
            result
        } catch (_: Exception) {
            queueOffline("produce", orderKey, mapOf("outputType" to outputType, "quantity" to quantity))
        }
    }

    suspend fun mesConsume(orderKey: String, componentKey: String, quantity: Double): Map<String, Any> {
        val body = mapOf<String, Any?>(
            "componentKey" to componentKey,
            "consumptionType" to "manual",
            "quantity" to quantity,
            "authorizedBy" to "mobile",
        )
        val token = AuthTokenStore.getAccessToken(appContext) ?: return queueOffline("consume", orderKey, body)
        return try {
            val result = api.mesConsume("Bearer $token", orderKey, body)
            syncOffline()
            result
        } catch (_: Exception) {
            queueOffline("consume", orderKey, body)
        }
    }

    suspend fun mesCaptureBarcode(orderKey: String, value: String): Map<String, Any> {
        val body = mapOf("captureType" to "barcode", "value" to value)
        val token = AuthTokenStore.getAccessToken(appContext) ?: return queueOffline("capture", orderKey, body)
        return try {
            api.mesCapture("Bearer $token", orderKey, body)
        } catch (_: Exception) {
            queueOffline("capture", orderKey, body)
        }
    }

    suspend fun flushOfflineQueue(): Map<String, Any> {
        val pending = readList("offlineQueue")
        if (pending.isEmpty()) return mapOf("synced" to 0)
        val token = AuthTokenStore.getAccessToken(appContext) ?: return mapOf("offline" to true, "pending" to pending.size)
        val result = api.mesOfflineSync("Bearer $token", mapOf("deviceId" to android.os.Build.MODEL, "actions" to pending))
        prefs.edit().remove("offlineQueue").apply()
        syncOffline()
        return result
    }

    fun getOfflineQueueSize(): Int = readList("offlineQueue").size
    fun getQmsOfflineQueueSize(): Int = readList("qmsOfflineQueue").size
    fun getResOfflineQueueSize(): Int = readList("resOfflineQueue").size

    suspend fun getCostDashboard(): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readMap("costDashboard")
        return try {
            val dash = api.costDashboard("Bearer $token")
            prefs.edit().putString("costDashboard", gson.toJson(dash)).apply()
            dash
        } catch (_: Exception) {
            readMap("costDashboard")
        }
    }

    suspend fun getCostWip(orderKey: String): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.costWipOrder("Bearer $token", orderKey)
        } catch (_: Exception) {
            emptyMap()
        }
    }

    suspend fun runCostCalculation(orderKey: String): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return mapOf("offline" to true)
        return try {
            api.costRun("Bearer $token", orderKey, mapOf("salesPrice" to 0))
        } catch (_: Exception) {
            mapOf("offline" to true)
        }
    }

    suspend fun getIntelligenceDashboard(): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readMap("intelligenceDashboard")
        return try {
            val dash = api.intelligenceDashboard("Bearer $token")
            prefs.edit().putString("intelligenceDashboard", gson.toJson(dash)).apply()
            dash
        } catch (_: Exception) {
            readMap("intelligenceDashboard")
        }
    }

    suspend fun getIntelligenceKpis(): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readMap("intelligenceKpis")
        return try {
            val kpis = api.intelligenceKpis("Bearer $token")
            prefs.edit().putString("intelligenceKpis", gson.toJson(kpis)).apply()
            kpis
        } catch (_: Exception) {
            readMap("intelligenceKpis")
        }
    }

    suspend fun getIntelligenceOee(): List<Map<String, Any>> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readList("intelligenceOee")
        return try {
            val list = api.intelligenceOee("Bearer $token")
            prefs.edit().putString("intelligenceOee", gson.toJson(list)).apply()
            list
        } catch (_: Exception) {
            readList("intelligenceOee")
        }
    }

    suspend fun getIntelligenceAlerts(): List<Map<String, Any>> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readList("intelligenceAlerts")
        return try {
            val list = api.intelligenceAlerts("Bearer $token")
            prefs.edit().putString("intelligenceAlerts", gson.toJson(list)).apply()
            list
        } catch (_: Exception) {
            readList("intelligenceAlerts")
        }
    }

    suspend fun getAuthorizedSimulations(): List<Map<String, Any>> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readList("intelligenceSims")
        return try {
            val list = api.intelligenceAuthorizedSims("Bearer $token")
            prefs.edit().putString("intelligenceSims", gson.toJson(list)).apply()
            list
        } catch (_: Exception) {
            readList("intelligenceSims")
        }
    }

    suspend fun listResourceEquipment(): List<Map<String, Any>> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readList("resEquipment")
        return try {
            val list = api.resourcesEquipment("Bearer $token")
            prefs.edit().putString("resEquipment", gson.toJson(list)).apply()
            list
        } catch (_: Exception) {
            readList("resEquipment")
        }
    }

    suspend fun resSetAvailability(equipmentKey: String, status: String, reason: String? = null): Map<String, Any> {
        val body = mapOf("status" to status, "reason" to reason)
        val token = AuthTokenStore.getAccessToken(appContext) ?: return queueResOffline("availability", equipmentKey, body)
        return try {
            api.resourcesSetAvailability("Bearer $token", equipmentKey, body)
        } catch (_: Exception) {
            queueResOffline("availability", equipmentKey, body)
        }
    }

    suspend fun resRecordMaintenance(equipmentKey: String, notes: String): Map<String, Any> {
        val body = mapOf<String, Any?>("equipmentKey" to equipmentKey, "maintenanceType" to "corrective", "technicalNotes" to notes)
        val token = AuthTokenStore.getAccessToken(appContext) ?: return queueResOffline("maintenance", equipmentKey, body)
        return try {
            api.resourcesMaintenance("Bearer $token", body)
        } catch (_: Exception) {
            queueResOffline("maintenance", equipmentKey, body)
        }
    }

    suspend fun resScanEquipment(equipmentKey: String, code: String): Map<String, Any> {
        val body = mapOf("equipmentKey" to equipmentKey, "captureType" to "barcode", "value" to code)
        val token = AuthTokenStore.getAccessToken(appContext) ?: return queueResOffline("capture", equipmentKey, body)
        return try {
            api.resourcesCapture("Bearer $token", body)
        } catch (_: Exception) {
            queueResOffline("capture", equipmentKey, body)
        }
    }

    suspend fun flushResOfflineQueue(): Map<String, Any> {
        val pending = readList("resOfflineQueue")
        if (pending.isEmpty()) return mapOf("synced" to 0)
        val token = AuthTokenStore.getAccessToken(appContext) ?: return mapOf("offline" to true, "pending" to pending.size)
        val result = api.resourcesOfflineSync("Bearer $token", mapOf("deviceId" to android.os.Build.MODEL, "actions" to pending))
        prefs.edit().remove("resOfflineQueue").apply()
        return result
    }

    private fun queueResOffline(type: String, equipmentKey: String?, payload: Map<String, Any?>): Map<String, Any> {
        val queue = readList("resOfflineQueue").toMutableList()
        queue.add(mapOf("type" to type, "equipmentKey" to equipmentKey, "payload" to payload))
        prefs.edit().putString("resOfflineQueue", gson.toJson(queue)).apply()
        return mapOf("queued" to true, "offline" to true, "queueSize" to queue.size)
    }

    suspend fun qmsCreateInspection(body: Map<String, Any?>): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return queueQmsOffline("inspection", null, body)
        return try {
            api.qmsCreateInspection("Bearer $token", body)
        } catch (_: Exception) {
            queueQmsOffline("inspection", null, body)
        }
    }

    suspend fun qmsAddMeasurement(inspectionKey: String, name: String, value: Double): Map<String, Any> {
        val body = mapOf<String, Any?>("name" to name, "value" to value)
        val token = AuthTokenStore.getAccessToken(appContext) ?: return queueQmsOffline("measurement", inspectionKey, body)
        return try {
            api.qmsAddMeasurement("Bearer $token", inspectionKey, body)
        } catch (_: Exception) {
            queueQmsOffline("measurement", inspectionKey, body)
        }
    }

    suspend fun qmsScanLot(inspectionKey: String, lotCode: String): Map<String, Any> {
        val body = mapOf("evidenceType" to "barcode", "value" to lotCode)
        val token = AuthTokenStore.getAccessToken(appContext) ?: return queueQmsOffline("evidence", inspectionKey, body)
        return try {
            api.qmsAddEvidence("Bearer $token", inspectionKey, body)
        } catch (_: Exception) {
            queueQmsOffline("evidence", inspectionKey, body)
        }
    }

    suspend fun qmsCapturePhoto(inspectionKey: String, storageUrl: String): Map<String, Any> {
        val body = mapOf("evidenceType" to "photo", "value" to "capture", "storageUrl" to storageUrl)
        val token = AuthTokenStore.getAccessToken(appContext) ?: return queueQmsOffline("evidence", inspectionKey, body)
        return try {
            api.qmsAddEvidence("Bearer $token", inspectionKey, body)
        } catch (_: Exception) {
            queueQmsOffline("evidence", inspectionKey, body)
        }
    }

    suspend fun flushQmsOfflineQueue(): Map<String, Any> {
        val pending = readList("qmsOfflineQueue")
        if (pending.isEmpty()) return mapOf("synced" to 0)
        val token = AuthTokenStore.getAccessToken(appContext) ?: return mapOf("offline" to true, "pending" to pending.size)
        val result = api.qmsOfflineSync("Bearer $token", mapOf("deviceId" to android.os.Build.MODEL, "actions" to pending))
        prefs.edit().remove("qmsOfflineQueue").apply()
        return result
    }

    private fun queueQmsOffline(type: String, inspectionKey: String?, payload: Map<String, Any?>): Map<String, Any> {
        val queue = readList("qmsOfflineQueue").toMutableList()
        queue.add(mapOf("type" to type, "inspectionKey" to inspectionKey, "payload" to payload))
        prefs.edit().putString("qmsOfflineQueue", gson.toJson(queue)).apply()
        return mapOf("queued" to true, "offline" to true, "queueSize" to queue.size)
    }

    private fun queueOffline(type: String, orderKey: String, payload: Map<String, Any?>): Map<String, Any> {
        val queue = readList("offlineQueue").toMutableList()
        queue.add(mapOf("type" to type, "orderKey" to orderKey, "payload" to payload))
        prefs.edit().putString("offlineQueue", gson.toJson(queue)).apply()
        return mapOf("queued" to true, "offline" to true, "queueSize" to queue.size)
    }

    private fun readMap(key: String): Map<String, Any> {
        val json = prefs.getString(key, null) ?: return emptyMap()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    private fun readList(key: String): List<Map<String, Any>> {
        val json = prefs.getString(key, null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    private fun offlineFallback(): Map<String, Any> = mapOf(
        "center" to getCachedCenter(),
        "orders" to getCachedOrders(),
        "schedule" to getCachedSchedule(),
        "conflicts" to getCachedConflicts(),
        "offline" to true,
    )
}
