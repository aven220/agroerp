package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.EaipApi
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.UUID

class EaipRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_eaip", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: EaipApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(AuthHttpClient.create(appContext))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(EaipApi::class.java)
    }

    fun getCachedSync(): Map<String, Any>? {
        val json = prefs.getString("sync", null) ?: return null
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedRecommendations(): List<Map<String, Any>> {
        val json = prefs.getString("recommendations", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun getCachedSimulations(): List<Map<String, Any>> {
        val json = prefs.getString("simulations", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun getCachedPredictions(): List<Map<String, Any>> {
        val json = prefs.getString("predictions", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun getCachedAlerts(): List<Map<String, Any>> {
        val sync = getCachedSync() ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return sync["alerts"] as? List<Map<String, Any>> ?: emptyList()
    }

    suspend fun syncAll(): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return getCachedSync()
        return try {
            val sync = api.mobileSync("Bearer $token")
            val recommendations = api.recommendations("Bearer $token")
            val simulations = api.simulations("Bearer $token")
            val predictions = api.predictions("Bearer $token")
            prefs.edit()
                .putString("sync", gson.toJson(sync))
                .putString("recommendations", gson.toJson(recommendations))
                .putString("simulations", gson.toJson(simulations))
                .putString("predictions", gson.toJson(predictions))
                .putLong("synced_at", System.currentTimeMillis())
                .apply()
            sync
        } catch (_: Exception) {
            getCachedSync()
        }
    }

    suspend fun chatWithAssistant(question: String): String? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return null
        return try {
            val session = api.createSession("Bearer $token", mapOf("title" to "Consulta móvil"))
            val sessionKey = session["sessionKey"] as? String ?: return null
            val response = api.sendMessage("Bearer $token", sessionKey, mapOf("content" to question))
            response["content"] as? String ?: response["text"] as? String
        } catch (_: Exception) {
            null
        }
    }

    private suspend fun queueOffline(type: String, payload: Map<String, Any>): Map<String, Any>? {
        val batchKey = "eaip-${UUID.randomUUID()}"
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
