package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.BreApi
import com.agroerp.prm.data.api.BreExecutionDto
import com.agroerp.prm.data.api.BreMobileConfigResponse
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class BreRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_bre", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: BreApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(AuthHttpClient.create(appContext))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(BreApi::class.java)
    }

    fun getCachedConfig(): BreMobileConfigResponse? {
        val json = prefs.getString("config", null) ?: return null
        return gson.fromJson(json, BreMobileConfigResponse::class.java)
    }

    fun getCachedExecutions(): List<BreExecutionDto> {
        val json = prefs.getString("executions", null) ?: return emptyList()
        return gson.fromJson(json, Array<BreExecutionDto>::class.java).toList()
    }

    suspend fun syncOffline(): BreMobileConfigResponse? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return getCachedConfig()
        return try {
            val config = api.mobileConfig("Bearer $token")
            val executions = api.mobileExecutions("Bearer $token")
            prefs.edit()
                .putString("config", gson.toJson(config))
                .putString("executions", gson.toJson(executions))
                .putLong("synced_at", System.currentTimeMillis())
                .apply()
            config
        } catch (_: Exception) {
            getCachedConfig()
        }
    }
}
