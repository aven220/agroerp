package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.EihApi
import com.agroerp.prm.data.api.EihMobileConnectorsResponse
import com.agroerp.prm.data.api.EihSyncRunMobileDto
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class EihRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_eih", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: EihApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(AuthHttpClient.create(appContext))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(EihApi::class.java)
    }

    fun getCachedConnectors(): EihMobileConnectorsResponse? {
        val json = prefs.getString("connectors", null) ?: return null
        return gson.fromJson(json, EihMobileConnectorsResponse::class.java)
    }

    fun getCachedSyncRuns(): List<EihSyncRunMobileDto> {
        val json = prefs.getString("sync_runs", null) ?: return emptyList()
        return gson.fromJson(json, Array<EihSyncRunMobileDto>::class.java).toList()
    }

    fun cacheExternalPayload(connectorKey: String, payload: String) {
        prefs.edit().putString("external_$connectorKey", payload).apply()
    }

    fun getExternalPayload(connectorKey: String): String? =
        prefs.getString("external_$connectorKey", null)

    suspend fun syncOffline(): EihMobileConnectorsResponse? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return getCachedConnectors()
        return try {
            val connectors = api.mobileConnectors("Bearer $token")
            val syncRuns = api.mobileSync("Bearer $token")
            prefs.edit()
                .putString("connectors", gson.toJson(connectors))
                .putString("sync_runs", gson.toJson(syncRuns))
                .putLong("synced_at", System.currentTimeMillis())
                .apply()
            connectors
        } catch (_: Exception) {
            getCachedConnectors()
        }
    }
}
