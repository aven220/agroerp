package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.HpaApi
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class HpaRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_hpa", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: HpaApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(AuthHttpClient.create())
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(HpaApi::class.java)
    }

    fun getCachedPersonal(): Map<String, Any> {
        val json = prefs.getString("personal", null) ?: return emptyMap()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedNotifications(): List<Map<String, Any>> {
        val json = prefs.getString("notifications", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    fun getCachedKpis(): Map<String, Any> {
        val json = prefs.getString("kpis", null) ?: return emptyMap()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    suspend fun syncOffline(employeeKey: String? = null): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return offlineFallback()
        return try {
            val auth = "Bearer $token"
            val sync = api.sync(auth, employeeKey)
            prefs.edit()
                .putString("personal", gson.toJson(sync["personal"]))
                .putString("notifications", gson.toJson(sync["notifications"]))
                .putString("objectives", gson.toJson(sync["objectives"]))
                .putString("performance", gson.toJson(sync["performance"]))
                .putString("courses", gson.toJson(sync["courses"]))
                .putString("vacations", gson.toJson(sync["vacationsAvailable"]))
                .putString("syncedAt", sync["syncedAt"]?.toString())
                .apply()
            try {
                val kpis = api.kpis(auth)
                prefs.edit().putString("kpis", gson.toJson(kpis)).apply()
            } catch (_: Exception) {
            }
            sync
        } catch (_: Exception) {
            offlineFallback()
        }
    }

    private fun offlineFallback(): Map<String, Any> = mapOf(
        "personal" to getCachedPersonal(),
        "notifications" to getCachedNotifications(),
        "kpis" to getCachedKpis(),
        "offline" to true,
    )
}
