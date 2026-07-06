package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.EphpApi
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class EphpRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_ephp", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: EphpApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(AuthHttpClient.create(appContext))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(EphpApi::class.java)
    }

    fun getCachedSync(): Map<String, Any>? {
        val json = prefs.getString("sync", null) ?: return null
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedAlerts(): List<Map<String, Any>> {
        val json = prefs.getString("alerts", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    suspend fun syncAll(): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return getCachedSync()
        return try {
            val sync = api.mobileSync("Bearer $token")
            val alerts = api.alerts("Bearer $token")
            prefs.edit()
                .putString("sync", gson.toJson(sync))
                .putString("alerts", gson.toJson(alerts))
                .putLong("synced_at", System.currentTimeMillis())
                .apply()
            sync
        } catch (_: Exception) {
            getCachedSync()
        }
    }

    suspend fun recordMonitoring(
        fieldLotId: String?,
        latitude: Double?,
        longitude: Double?,
        observations: String?,
        photoRefs: List<String>,
    ): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return null
        return try {
            api.recordMonitoring(
                "Bearer $token",
                mapOf(
                    "fieldLotId" to (fieldLotId ?: ""),
                    "latitude" to (latitude ?: 0.0),
                    "longitude" to (longitude ?: 0.0),
                    "observations" to (observations ?: ""),
                    "photoRefs" to photoRefs,
                ),
            )
        } catch (_: Exception) {
            null
        }
    }

    suspend fun recordApplication(productName: String, fieldLotId: String?, dose: Double?): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return null
        return try {
            api.recordApplication(
                "Bearer $token",
                mapOf(
                    "productName" to productName,
                    "fieldLotId" to (fieldLotId ?: ""),
                    "dose" to (dose ?: 0.0),
                ),
            )
        } catch (_: Exception) {
            null
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

    suspend fun queueOfflineBatch(batchKey: String, payload: Map<String, Any>): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return null
        return try {
            api.queueBatch("Bearer $token", mapOf("batchKey" to batchKey, "payload" to payload))
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
