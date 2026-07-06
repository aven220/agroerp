package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.EintApi
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class EintRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_eint", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: EintApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(AuthHttpClient.create(appContext))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(EintApi::class.java)
    }

    fun getCachedSync(): Map<String, Any>? {
        val json = prefs.getString("sync", null) ?: return null
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedDashboards(): List<Map<String, Any>> {
        val json = prefs.getString("dashboards", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return (gson.fromJson(json, List::class.java) as List<Map<String, Any>>)
    }

    fun getCachedKpis(): List<Map<String, Any>> {
        val json = prefs.getString("kpis", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return (gson.fromJson(json, List::class.java) as List<Map<String, Any>>)
    }

    fun getCachedAlerts(): List<Map<String, Any>> {
        val json = prefs.getString("alerts", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return (gson.fromJson(json, List::class.java) as List<Map<String, Any>>)
    }

    suspend fun syncAll(): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return getCachedSync()
        return try {
            val sync = api.mobileSync("Bearer $token")
            val dashboards = api.dashboardCatalog("Bearer $token")
            val kpis = api.kpis("Bearer $token")
            val alerts = api.inbox("Bearer $token")
            prefs.edit()
                .putString("sync", gson.toJson(sync))
                .putString("dashboards", gson.toJson(dashboards))
                .putString("kpis", gson.toJson(kpis))
                .putString("alerts", gson.toJson(alerts))
                .putLong("synced_at", System.currentTimeMillis())
                .apply()
            sync
        } catch (_: Exception) {
            getCachedSync()
        }
    }

    suspend fun loadDashboard(dashboardKey: String): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return null
        return try {
            api.getDashboard("Bearer $token", dashboardKey)
        } catch (_: Exception) {
            null
        }
    }

    suspend fun chatAssistant(assistantKey: String, message: String): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return null
        return try {
            api.assistantChat("Bearer $token", assistantKey, mapOf("message" to message))
        } catch (_: Exception) {
            null
        }
    }
}
