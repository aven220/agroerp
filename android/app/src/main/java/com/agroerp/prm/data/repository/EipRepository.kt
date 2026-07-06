package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.EipApi
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class EipRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_eip", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: EipApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(AuthHttpClient.create(appContext))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(EipApi::class.java)
    }

    fun getCachedStatus(): Map<String, Any>? {
        val json = prefs.getString("status", null) ?: return null
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedErrors(): List<Map<String, Any>> {
        val json = prefs.getString("errors", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return (gson.fromJson(json, List::class.java) as List<Map<String, Any>>)
    }

    suspend fun syncStatus(): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return getCachedStatus()
        return try {
            val status = api.mobileStatus("Bearer $token")
            val errors = api.errors("Bearer $token")
            prefs.edit()
                .putString("status", gson.toJson(status))
                .putString("errors", gson.toJson(errors))
                .putLong("synced_at", System.currentTimeMillis())
                .apply()
            status
        } catch (_: Exception) {
            getCachedStatus()
        }
    }

    suspend fun criticalAlerts(): Int {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return 0
        return try {
            val dlq = api.dlq("Bearer $token")
            dlq.size
        } catch (_: Exception) {
            0
        }
    }
}
