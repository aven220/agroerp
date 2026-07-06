package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.EffmApi
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.UUID

class EffmRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_effm", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: EffmApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(AuthHttpClient.create(appContext))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(EffmApi::class.java)
    }

    fun getCachedSync(): Map<String, Any>? {
        val json = prefs.getString("sync", null) ?: return null
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedAssignments(): List<Map<String, Any>> {
        val json = prefs.getString("assignments", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    suspend fun syncAll(): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return getCachedSync()
        return try {
            val sync = api.mobileSync("Bearer $token")
            val assignments = api.assignments("Bearer $token")
            prefs.edit()
                .putString("sync", gson.toJson(sync))
                .putString("assignments", gson.toJson(assignments))
                .putLong("synced_at", System.currentTimeMillis())
                .apply()
            sync
        } catch (_: Exception) {
            getCachedSync()
        }
    }

    suspend fun resolveQr(qrCode: String): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return null
        return try {
            api.resolveQr("Bearer $token", qrCode)
        } catch (_: Exception) {
            null
        }
    }

    suspend fun startOperation(machineId: String, fieldLotId: String?): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return queueOffline("operation_start", mapOf(
            "machineId" to machineId, "fieldLotId" to (fieldLotId ?: ""),
        ))
        return try {
            api.startOperation("Bearer $token", mapOf("machineId" to machineId, "fieldLotId" to (fieldLotId ?: "")))
        } catch (_: Exception) {
            queueOffline("operation_start", mapOf("machineId" to machineId))
        }
    }

    suspend fun recordFuel(machineId: String, liters: Double): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return queueOffline("fuel", mapOf(
            "machineId" to machineId, "liters" to liters,
        ))
        return try {
            api.recordFuel("Bearer $token", mapOf("machineId" to machineId, "liters" to liters))
        } catch (_: Exception) {
            queueOffline("fuel", mapOf("machineId" to machineId, "liters" to liters))
        }
    }

    suspend fun recordIncident(description: String, machineId: String?, photoRefs: List<String>): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return null
        return try {
            api.recordIncident("Bearer $token", mapOf(
                "incidentType" to "operational", "description" to description,
                "machineId" to (machineId ?: ""), "photoRefs" to photoRefs,
            ))
        } catch (_: Exception) {
            null
        }
    }

    private suspend fun queueOffline(type: String, payload: Map<String, Any>): Map<String, Any>? {
        val batchKey = "effm-${UUID.randomUUID()}"
        val token = AuthTokenStore.getAccessToken(appContext) ?: return null
        return try {
            api.queueBatch("Bearer $token", mapOf("batchKey" to batchKey, "payload" to mapOf("type" to type) + payload))
        } catch (_: Exception) {
            null
        }
    }

    suspend fun syncOfflineBatch(batchKey: String): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return null
        return try {
            api.syncBatch("Bearer $token", batchKey)
        } catch (_: Exception) {
            null
        }
    }
}
