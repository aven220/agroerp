package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.EatrApi
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.UUID

class EatrRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_eatr", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: EatrApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(AuthHttpClient.create(appContext))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(EatrApi::class.java)
    }

    fun getCachedSync(): Map<String, Any>? {
        val json = prefs.getString("sync", null) ?: return null
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedHistory(): List<Map<String, Any>> {
        val json = prefs.getString("history", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    suspend fun syncAll(): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return getCachedSync()
        return try {
            val sync = api.mobileSync("Bearer $token")
            prefs.edit()
                .putString("sync", gson.toJson(sync))
                .putLong("synced_at", System.currentTimeMillis())
                .apply()
            sync
        } catch (_: Exception) {
            getCachedSync()
        }
    }

    suspend fun queryTrace(qrCode: String?, lotKey: String?): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return null
        return try {
            val result = api.traceQuery("Bearer $token", lotKey, qrCode, null)
            val history = getCachedHistory().toMutableList()
            history.add(0, mapOf("qrCode" to (qrCode ?: ""), "lotKey" to (lotKey ?: ""), "queriedAt" to System.currentTimeMillis()))
            prefs.edit().putString("history", gson.toJson(history.take(20))).apply()
            result
        } catch (_: Exception) {
            null
        }
    }

    suspend fun recordHarvest(productionLotKey: String, grossKg: Double, photoRefs: List<String>): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return queueOffline("harvest", mapOf(
            "productionLotKey" to productionLotKey, "grossKg" to grossKg, "photoRefs" to photoRefs,
        ))
        return try {
            api.recordHarvest("Bearer $token", mapOf(
                "productionLotKey" to productionLotKey,
                "grossKg" to grossKg,
                "netKg" to grossKg,
                "photoRefs" to photoRefs,
            ))
        } catch (_: Exception) {
            queueOffline("harvest", mapOf("productionLotKey" to productionLotKey, "grossKg" to grossKg))
        }
    }

    suspend fun recordWeighing(lotKey: String, weightKg: Double): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return queueOffline("weighing", mapOf(
            "lotKey" to lotKey, "weightKg" to weightKg,
        ))
        return try {
            api.recordWeighing("Bearer $token", mapOf("lotKey" to lotKey, "weightKg" to weightKg))
        } catch (_: Exception) {
            queueOffline("weighing", mapOf("lotKey" to lotKey, "weightKg" to weightKg))
        }
    }

    suspend fun recordInspection(lotKey: String, moisturePct: Double?, defectsPct: Double?, photoRefs: List<String>): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return queueOffline("inspection", mapOf(
            "lotKey" to lotKey, "moisturePct" to (moisturePct ?: 0.0), "defectsPct" to (defectsPct ?: 0.0),
        ))
        return try {
            api.recordInspection("Bearer $token", mapOf(
                "lotKey" to lotKey,
                "moisturePct" to (moisturePct ?: 0.0),
                "defectsPct" to (defectsPct ?: 0.0),
                "photoRefs" to photoRefs,
            ))
        } catch (_: Exception) {
            queueOffline("inspection", mapOf("lotKey" to lotKey, "moisturePct" to (moisturePct ?: 0.0)))
        }
    }

    private suspend fun queueOffline(type: String, payload: Map<String, Any>): Map<String, Any>? {
        val batchKey = "eatr-${UUID.randomUUID()}"
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
