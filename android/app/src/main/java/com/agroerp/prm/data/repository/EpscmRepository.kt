package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.EpscmApi
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class EpscmRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_epscm", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: EpscmApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(AuthHttpClient.create())
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(EpscmApi::class.java)
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

    suspend fun getDemandPanel(): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readMap("demandPanel")
        return try {
            val panel = api.demandPanel("Bearer $token")
            prefs.edit().putString("demandPanel", gson.toJson(panel)).apply()
            panel
        } catch (_: Exception) {
            readMap("demandPanel")
        }
    }

    suspend fun getAlerts(): List<Map<String, Any>> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readList("alerts")
        return try {
            val list = api.alerts("Bearer $token")
            prefs.edit().putString("alerts", gson.toJson(list)).apply()
            list
        } catch (_: Exception) {
            readList("alerts")
        }
    }

    suspend fun getProposals(): List<Map<String, Any>> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readList("proposals")
        return try {
            val list = api.proposals("Bearer $token")
            prefs.edit().putString("proposals", gson.toJson(list)).apply()
            list
        } catch (_: Exception) {
            readList("proposals")
        }
    }

    suspend fun getInventoryIndicators(): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readMap("inventoryIndicators")
        return try {
            val ind = api.inventoryIndicators("Bearer $token")
            prefs.edit().putString("inventoryIndicators", gson.toJson(ind)).apply()
            ind
        } catch (_: Exception) {
            readMap("inventoryIndicators")
        }
    }

    suspend fun syncWmsMobile(): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readMap("wmsMobileSync")
        return try {
            val data = api.wmsMobileSync("Bearer $token")
            prefs.edit().putString("wmsMobileSync", gson.toJson(data)).apply()
            data
        } catch (_: Exception) {
            readMap("wmsMobileSync")
        }
    }

    suspend fun getWmsDashboard(): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readMap("wmsDashboard")
        return try {
            val dash = api.wmsDashboard("Bearer $token")
            prefs.edit().putString("wmsDashboard", gson.toJson(dash)).apply()
            dash
        } catch (_: Exception) {
            readMap("wmsDashboard")
        }
    }

    suspend fun getWmsPickTasks(): List<Map<String, Any>> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readList("wmsPickTasks")
        return try {
            val list = api.wmsPickTasks("Bearer $token")
            prefs.edit().putString("wmsPickTasks", gson.toJson(list)).apply()
            list
        } catch (_: Exception) {
            readList("wmsPickTasks")
        }
    }

    suspend fun barcodePick(barcode: String, pickedQty: Double): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.wmsBarcodePick("Bearer $token", mapOf("barcode" to barcode, "pickedQty" to pickedQty))
        } catch (_: Exception) {
            emptyMap()
        }
    }

    suspend fun barcodeReceive(barcode: String, receivedQty: Double, locationKey: String? = null): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        val body = mutableMapOf<String, Any>("barcode" to barcode, "receivedQty" to receivedQty)
        if (locationKey != null) body["locationKey"] = locationKey
        return try {
            api.wmsBarcodeReceive("Bearer $token", body)
        } catch (_: Exception) {
            emptyMap()
        }
    }

    suspend fun queueWmsOffline(deviceId: String, operations: List<Map<String, Any>>): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            val batch = api.wmsQueueOffline("Bearer $token", mapOf("deviceId" to deviceId, "operations" to operations))
            prefs.edit().putString("wmsOfflinePending", gson.toJson(batch)).apply()
            batch
        } catch (_: Exception) {
            readMap("wmsOfflinePending")
        }
    }

    suspend fun syncWmsOffline(batchKey: String): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.wmsSyncOffline("Bearer $token", batchKey)
        } catch (_: Exception) {
            emptyMap()
        }
    }

    suspend fun captureWmsPhoto(refType: String, refKey: String, storageUrl: String): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.wmsCapture("Bearer $token", mapOf(
                "refType" to refType,
                "refKey" to refKey,
                "storageUrl" to storageUrl,
                "captureType" to "photo",
            ))
        } catch (_: Exception) {
            emptyMap()
        }
    }

    suspend fun syncTmsMobile(): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readMap("tmsMobileSync")
        return try {
            val data = api.tmsMobileSync("Bearer $token")
            prefs.edit().putString("tmsMobileSync", gson.toJson(data)).apply()
            data
        } catch (_: Exception) {
            readMap("tmsMobileSync")
        }
    }

    suspend fun getTmsLogisticsDashboard(): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readMap("tmsLogisticsDashboard")
        return try {
            val dash = api.tmsLogisticsDashboard("Bearer $token")
            prefs.edit().putString("tmsLogisticsDashboard", gson.toJson(dash)).apply()
            dash
        } catch (_: Exception) {
            readMap("tmsLogisticsDashboard")
        }
    }

    suspend fun getTmsTrips(): List<Map<String, Any>> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readList("tmsTrips")
        return try {
            val list = api.tmsTrips("Bearer $token")
            prefs.edit().putString("tmsTrips", gson.toJson(list)).apply()
            list
        } catch (_: Exception) {
            readList("tmsTrips")
        }
    }

    suspend fun acceptTmsTrip(tripKey: String): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.tmsAcceptTrip("Bearer $token", tripKey, emptyMap())
        } catch (_: Exception) {
            emptyMap()
        }
    }

    suspend fun startTmsTrip(tripKey: String): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.tmsStartTrip("Bearer $token", tripKey, emptyMap())
        } catch (_: Exception) {
            emptyMap()
        }
    }

    suspend fun recordTmsIncident(tripKey: String, incidentType: String, description: String): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.tmsRecordIncident("Bearer $token", tripKey, mapOf("incidentType" to incidentType, "description" to description))
        } catch (_: Exception) {
            emptyMap()
        }
    }

    suspend fun barcodeTmsDelivery(barcode: String, deliveredQty: Double): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.tmsBarcodeDelivery("Bearer $token", mapOf("barcode" to barcode, "deliveredQty" to deliveredQty))
        } catch (_: Exception) {
            emptyMap()
        }
    }

    suspend fun captureTmsPod(deliveryKey: String, signatureUrl: String?, photoUrl: String?, lat: Double?, lon: Double?): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        val body = mutableMapOf<String, Any>()
        signatureUrl?.let { body["signatureUrl"] = it }
        photoUrl?.let { body["photoUrl"] = it }
        lat?.let { body["latitude"] = it }
        lon?.let { body["longitude"] = it }
        return try {
            api.tmsCapturePod("Bearer $token", deliveryKey, body)
        } catch (_: Exception) {
            emptyMap()
        }
    }

    suspend fun queueTmsOffline(deviceId: String, operations: List<Map<String, Any>>): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.tmsQueueOffline("Bearer $token", mapOf("deviceId" to deviceId, "operations" to operations))
        } catch (_: Exception) {
            readMap("tmsOfflinePending")
        }
    }

    suspend fun syncTmsOffline(batchKey: String): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.tmsSyncOffline("Bearer $token", batchKey, emptyMap())
        } catch (_: Exception) {
            emptyMap()
        }
    }

    suspend fun syncCollabMobile(): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readMap("collabMobileSync")
        return try {
            val data = api.collabMobileSync("Bearer $token")
            prefs.edit().putString("collabMobileSync", gson.toJson(data)).apply()
            data
        } catch (_: Exception) {
            readMap("collabMobileSync")
        }
    }

    suspend fun getCollabTasks(): List<Map<String, Any>> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readList("collabTasks")
        return try {
            val list = api.collabTasks("Bearer $token")
            prefs.edit().putString("collabTasks", gson.toJson(list)).apply()
            list
        } catch (_: Exception) {
            readList("collabTasks")
        }
    }

    suspend fun completeCollabTask(taskKey: String): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.collabCompleteTask("Bearer $token", taskKey)
        } catch (_: Exception) {
            emptyMap()
        }
    }

    suspend fun addCollabComment(refType: String, refKey: String, body: String): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.collabAddComment("Bearer $token", mapOf("refType" to refType, "refKey" to refKey, "body" to body))
        } catch (_: Exception) {
            emptyMap()
        }
    }

    suspend fun attachCollabEvidence(assignmentKey: String, evidenceType: String, storageUrl: String): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.collabAttachEvidence("Bearer $token", assignmentKey, mapOf("evidenceType" to evidenceType, "storageUrl" to storageUrl))
        } catch (_: Exception) {
            emptyMap()
        }
    }

    suspend fun updateCollabStatus(assignmentKey: String, status: String, notes: String? = null): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        val body = mutableMapOf("status" to status)
        if (notes != null) body["notes"] = notes
        return try {
            api.collabUpdateStatus("Bearer $token", assignmentKey, body)
        } catch (_: Exception) {
            emptyMap()
        }
    }

    suspend fun uploadCollabDocument(partnerKey: String, refType: String, refKey: String, docType: String, storageUrl: String): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.collabUploadDocument("Bearer $token", partnerKey, mapOf(
                "refType" to refType,
                "refKey" to refKey,
                "docType" to docType,
                "storageUrl" to storageUrl,
            ))
        } catch (_: Exception) {
            emptyMap()
        }
    }

    suspend fun queueCollabOffline(deviceId: String, operations: List<Map<String, Any>>): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            val batch = api.collabQueueOffline("Bearer $token", mapOf("deviceId" to deviceId, "operations" to operations))
            prefs.edit().putString("collabOfflinePending", gson.toJson(batch)).apply()
            batch
        } catch (_: Exception) {
            readMap("collabOfflinePending")
        }
    }

    suspend fun syncCollabOffline(batchKey: String): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.collabSyncOffline("Bearer $token", batchKey)
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
