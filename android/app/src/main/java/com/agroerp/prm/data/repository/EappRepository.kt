package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.EappApi
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class EappRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_eapp", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: EappApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(AuthHttpClient.create(appContext))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(EappApi::class.java)
    }

    fun getCachedSync(): Map<String, Any>? {
        val json = prefs.getString("sync", null) ?: return null
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedLots(): List<Map<String, Any>> {
        val json = prefs.getString("lots", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return (gson.fromJson(json, List::class.java) as List<Map<String, Any>>)
    }

    fun getCachedMap(): Map<String, Any>? {
        val json = prefs.getString("map", null) ?: return null
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    suspend fun syncAll(): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return getCachedSync()
        return try {
            val sync = api.mobileSync("Bearer $token")
            val map = api.mapContext("Bearer $token")
            val lots = (sync["lots"] as? List<*>) ?: emptyList<Any>()
            prefs.edit()
                .putString("sync", gson.toJson(sync))
                .putString("map", gson.toJson(map))
                .putString("lots", gson.toJson(lots))
                .putLong("synced_at", System.currentTimeMillis())
                .apply()
            sync
        } catch (_: Exception) {
            getCachedSync()
        }
    }

    suspend fun registerGpsPoint(name: String, latitude: Double, longitude: Double, fieldLotId: String?): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return null
        return try {
            api.createPoi(
                "Bearer $token",
                mapOf(
                    "name" to name,
                    "poiType" to "marker",
                    "latitude" to latitude,
                    "longitude" to longitude,
                    "fieldLotId" to (fieldLotId ?: ""),
                ),
            )
        } catch (_: Exception) {
            null
        }
    }

    suspend fun recordInspection(
        fieldLotId: String?,
        latitude: Double?,
        longitude: Double?,
        notes: String?,
        photoRefs: List<String>,
    ): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return null
        return try {
            api.recordInspection(
                "Bearer $token",
                mapOf(
                    "fieldLotId" to (fieldLotId ?: ""),
                    "latitude" to (latitude ?: 0.0),
                    "longitude" to (longitude ?: 0.0),
                    "notes" to (notes ?: ""),
                    "photoRefs" to photoRefs,
                ),
            )
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
