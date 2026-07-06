package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.HedApi
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class HedRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_hed", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: HedApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(AuthHttpClient.create())
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(HedApi::class.java)
    }

    fun getCachedDashboard(): Map<String, Any> {
        val json = prefs.getString("dashboard", null) ?: return emptyMap()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedKpis(): Map<String, Any> {
        val json = prefs.getString("kpis", null) ?: return emptyMap()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedCharts(): Map<String, Any> {
        val json = prefs.getString("charts", null) ?: return emptyMap()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    suspend fun syncOffline(from: String? = null, to: String? = null): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return offlineFallback()
        return try {
            val auth = "Bearer $token"
            val sync = api.sync(auth, from, to)
            prefs.edit()
                .putString("dashboard", gson.toJson(sync))
                .putString("kpis", gson.toJson(mapOf(
                    "kpis" to sync["kpis"],
                    "attendance" to sync["attendance"],
                    "training" to sync["training"],
                    "performance" to sync["performance"],
                )))
                .putString("charts", gson.toJson(sync["charts"]))
                .putString("syncedAt", sync["syncedAt"]?.toString())
                .apply()
            sync
        } catch (_: Exception) {
            offlineFallback()
        }
    }

    private fun offlineFallback(): Map<String, Any> = mapOf(
        "kpis" to (getCachedKpis()["kpis"] ?: emptyMap<String, Any>()),
        "attendance" to (getCachedKpis()["attendance"] ?: emptyMap<String, Any>()),
        "training" to (getCachedKpis()["training"] ?: emptyMap<String, Any>()),
        "performance" to (getCachedKpis()["performance"] ?: emptyMap<String, Any>()),
        "charts" to getCachedCharts(),
        "offline" to true,
    )
}
