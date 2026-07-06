package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.EamApi
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class EamRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_eam", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: EamApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(AuthHttpClient.create())
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(EamApi::class.java)
    }

    suspend fun syncMobile(): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readMap("mobileSync")
        return try {
            val data = api.mobileSync("Bearer $token")
            prefs.edit().putString("mobileSync", gson.toJson(data)).apply()
            data
        } catch (_: Exception) {
            readMap("mobileSync")
        }
    }

    suspend fun listAssets(): List<Map<String, Any>> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readList("assets")
        return try {
            val list = api.listAssets("Bearer $token")
            prefs.edit().putString("assets", gson.toJson(list)).apply()
            list
        } catch (_: Exception) {
            readList("assets")
        }
    }

    suspend fun scanAsset(code: String, scanType: String = "qr"): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            val asset = api.scan("Bearer $token", mapOf("code" to code, "scanType" to scanType))
            prefs.edit().putString("lastScan", gson.toJson(asset)).apply()
            asset
        } catch (_: Exception) {
            readMap("lastScan")
        }
    }

    suspend fun updateLocation(assetKey: String, toLocationKey: String): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.transfer("Bearer $token", assetKey, mapOf("toLocationKey" to toLocationKey, "transferType" to "relocation"))
        } catch (_: Exception) {
            emptyMap()
        }
    }

    suspend fun uploadPhoto(assetKey: String, storageUrl: String, title: String = "Foto activo"): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.uploadDocument("Bearer $token", assetKey, mapOf("docType" to "photo", "title" to title, "storageUrl" to storageUrl))
        } catch (_: Exception) {
            emptyMap()
        }
    }

    suspend fun queueOffline(deviceId: String, operations: List<Map<String, Any>>): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            val batch = api.queueOffline("Bearer $token", mapOf("deviceId" to deviceId, "operations" to operations))
            prefs.edit().putString("offlinePending", gson.toJson(batch)).apply()
            batch
        } catch (_: Exception) {
            readMap("offlinePending")
        }
    }

    suspend fun syncOffline(batchKey: String): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.syncOffline("Bearer $token", batchKey)
        } catch (_: Exception) {
            emptyMap()
        }
    }

    suspend fun getDashboard(): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readMap("dashboard")
        return try {
            val dash = api.dashboard("Bearer $token")
            prefs.edit().putString("dashboard", gson.toJson(dash)).apply()
            dash
        } catch (_: Exception) {
            readMap("dashboard")
        }
    }

    suspend fun syncCmmsMobile(): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readMap("cmmsMobileSync")
        return try {
            val data = api.cmmsMobileSync("Bearer $token")
            prefs.edit().putString("cmmsMobileSync", gson.toJson(data)).apply()
            data
        } catch (_: Exception) {
            readMap("cmmsMobileSync")
        }
    }

    suspend fun listCmmsWorkOrders(): List<Map<String, Any>> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readList("cmmsWorkOrders")
        return try {
            val list = api.cmmsWorkOrders("Bearer $token")
            prefs.edit().putString("cmmsWorkOrders", gson.toJson(list)).apply()
            list
        } catch (_: Exception) {
            readList("cmmsWorkOrders")
        }
    }

    suspend fun startCmmsWork(workOrderKey: String, technicianKey: String? = null): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        val body = mutableMapOf<String, Any>("action" to "start")
        if (technicianKey != null) body["technicianKey"] = technicianKey
        return try {
            api.cmmsExecution("Bearer $token", workOrderKey, body)
        } catch (_: Exception) {
            emptyMap()
        }
    }

    suspend fun completeCmmsWork(workOrderKey: String, laborMinutes: Double = 60.0): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.cmmsExecution("Bearer $token", workOrderKey, mapOf("action" to "complete", "laborMinutes" to laborMinutes))
        } catch (_: Exception) {
            emptyMap()
        }
    }

    suspend fun attachCmmsPhoto(workOrderKey: String, storageUrl: String): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.cmmsAttach("Bearer $token", workOrderKey, mapOf("attachmentType" to "photo", "storageUrl" to storageUrl, "title" to "Evidencia"))
        } catch (_: Exception) {
            emptyMap()
        }
    }

    suspend fun signCmmsWork(workOrderKey: String, signatureUrl: String): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.cmmsSign("Bearer $token", workOrderKey, mapOf("signatureUrl" to signatureUrl))
        } catch (_: Exception) {
            emptyMap()
        }
    }

    suspend fun queueCmmsOffline(deviceId: String, operations: List<Map<String, Any>>): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.cmmsQueueOffline("Bearer $token", mapOf("deviceId" to deviceId, "operations" to operations))
        } catch (_: Exception) {
            readMap("cmmsOfflinePending")
        }
    }

    suspend fun syncCmmsOffline(batchKey: String): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.cmmsSyncOffline("Bearer $token", batchKey)
        } catch (_: Exception) {
            emptyMap()
        }
    }

    suspend fun syncReliabilityMobile(): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readMap("relMobileSync")
        return try {
            val data = api.reliabilityMobileSync("Bearer $token")
            prefs.edit().putString("relMobileSync", gson.toJson(data)).apply()
            data
        } catch (_: Exception) {
            readMap("relMobileSync")
        }
    }

    suspend fun getReliabilityExecutive(): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readMap("relExecutive")
        return try {
            val data = api.reliabilityExecutive("Bearer $token")
            prefs.edit().putString("relExecutive", gson.toJson(data)).apply()
            data
        } catch (_: Exception) {
            readMap("relExecutive")
        }
    }

    suspend fun listReliabilityReadings(): List<Map<String, Any>> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readList("relReadings")
        return try {
            val list = api.reliabilityReadings("Bearer $token")
            prefs.edit().putString("relReadings", gson.toJson(list)).apply()
            list
        } catch (_: Exception) {
            readList("relReadings")
        }
    }

    suspend fun recordConditionReading(assetKey: String, metricKind: String, value: Double, unit: String = "°C"): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            val reading = api.recordConditionReading("Bearer $token", mapOf(
                "assetKey" to assetKey,
                "metricKind" to metricKind,
                "value" to value,
                "unit" to unit,
                "source" to "mobile",
            ))
            prefs.edit().putString("lastReading", gson.toJson(reading)).apply()
            reading
        } catch (_: Exception) {
            readMap("lastReading")
        }
    }

    suspend fun listReliabilityAlerts(): List<Map<String, Any>> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readList("relAlerts")
        return try {
            val list = api.reliabilityAlerts("Bearer $token")
            prefs.edit().putString("relAlerts", gson.toJson(list)).apply()
            list
        } catch (_: Exception) {
            readList("relAlerts")
        }
    }

    suspend fun queueReliabilityOffline(deviceId: String, operations: List<Map<String, Any>>): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.reliabilityQueueOffline("Bearer $token", mapOf("deviceId" to deviceId, "operations" to operations))
        } catch (_: Exception) {
            readMap("relOfflinePending")
        }
    }

    suspend fun syncReliabilityOffline(batchKey: String): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.reliabilitySyncOffline("Bearer $token", batchKey)
        } catch (_: Exception) {
            emptyMap()
        }
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
}
