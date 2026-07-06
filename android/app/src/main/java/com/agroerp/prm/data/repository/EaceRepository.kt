package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.EaceApi
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.UUID

class EaceRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_eace", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: EaceApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(AuthHttpClient.create(appContext))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(EaceApi::class.java)
    }

    fun getCachedSync(): Map<String, Any>? {
        val json = prefs.getString("sync", null) ?: return null
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedContracts(): List<Map<String, Any>> {
        val json = prefs.getString("contracts", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun getCachedVisits(): List<Map<String, Any>> {
        val json = prefs.getString("visits", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun getCachedNotifications(): List<Map<String, Any>> {
        val json = prefs.getString("notifications", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun getProfileRole(): String = prefs.getString("profile_role", "producer") ?: "producer"

    fun setProfileRole(role: String) {
        prefs.edit().putString("profile_role", role).apply()
    }

    suspend fun syncAll(profileRole: String? = null): Map<String, Any>? {
        val role = profileRole ?: getProfileRole()
        val token = AuthTokenStore.getAccessToken(appContext) ?: return getCachedSync()
        return try {
            val sync = api.mobileSync("Bearer $token", role)
            val contracts = api.contracts("Bearer $token")
            val visits = api.visits("Bearer $token")
            val notifications = api.notifications("Bearer $token")
            prefs.edit()
                .putString("sync", gson.toJson(sync))
                .putString("contracts", gson.toJson(contracts))
                .putString("visits", gson.toJson(visits))
                .putString("notifications", gson.toJson(notifications))
                .putString("profile_role", role)
                .putLong("synced_at", System.currentTimeMillis())
                .apply()
            sync
        } catch (_: Exception) {
            getCachedSync()
        }
    }

    suspend fun uploadVisitEvidence(visitKey: String, observations: List<String>, photos: List<String>): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return queueOffline("visit_evidence", mapOf(
            "visitKey" to visitKey, "observations" to observations, "photos" to photos,
        ))
        return try {
            api.completeVisit("Bearer $token", visitKey, mapOf(
                "observations" to observations,
                "photos" to photos,
            ))
        } catch (_: Exception) {
            queueOffline("visit_evidence", mapOf("visitKey" to visitKey, "observations" to observations, "photos" to photos))
        }
    }

    private suspend fun queueOffline(type: String, payload: Map<String, Any>): Map<String, Any>? {
        val batchKey = "eace-${UUID.randomUUID()}"
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
