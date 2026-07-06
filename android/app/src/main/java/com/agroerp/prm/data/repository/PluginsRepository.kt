package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.EppmMobileInstalledResponse
import com.agroerp.prm.data.api.EppmMobileResourceDto
import com.agroerp.prm.data.api.PluginsApi
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class PluginsRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_eppm", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: PluginsApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(AuthHttpClient.create(appContext))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(PluginsApi::class.java)
    }

    fun getCachedInstalled(): EppmMobileInstalledResponse? {
        val json = prefs.getString("installed", null) ?: return null
        return gson.fromJson(json, EppmMobileInstalledResponse::class.java)
    }

    fun getCachedResources(): List<EppmMobileResourceDto> {
        val json = prefs.getString("resources", null) ?: return emptyList()
        return gson.fromJson(json, Array<EppmMobileResourceDto>::class.java).toList()
    }

    suspend fun syncOffline(): EppmMobileInstalledResponse? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return getCachedInstalled()
        return try {
            val installed = api.mobileInstalled("Bearer $token")
            val resources = api.mobileResources("Bearer $token")
            prefs.edit()
                .putString("installed", gson.toJson(installed))
                .putString("resources", gson.toJson(resources))
                .putLong("synced_at", System.currentTimeMillis())
                .apply()
            installed
        } catch (_: Exception) {
            getCachedInstalled()
        }
    }
}
