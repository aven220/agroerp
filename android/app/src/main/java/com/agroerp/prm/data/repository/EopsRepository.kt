package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.EopsApi
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class EopsRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_eops", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: EopsApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(AuthHttpClient.create(appContext))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(EopsApi::class.java)
    }

    fun getCachedSync(): Map<String, Any>? {
        val json = prefs.getString("sync", null) ?: return null
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedAlerts(): List<Map<String, Any>> {
        val json = prefs.getString("alerts", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return (gson.fromJson(json, List::class.java) as List<Map<String, Any>>)
    }

    fun getCachedProbes(): List<Map<String, Any>> {
        val json = prefs.getString("probes", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return (gson.fromJson(json, List::class.java) as List<Map<String, Any>>)
    }

    suspend fun syncAll(): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return getCachedSync()
        return try {
            val sync = api.mobileSync("Bearer $token")
            val alerts = api.securityAlerts("Bearer $token")
            val probes = api.healthProbes("Bearer $token")
            prefs.edit()
                .putString("sync", gson.toJson(sync))
                .putString("alerts", gson.toJson(alerts))
                .putString("probes", gson.toJson(probes))
                .putLong("synced_at", System.currentTimeMillis())
                .apply()
            sync
        } catch (_: Exception) {
            getCachedSync()
        }
    }
}
