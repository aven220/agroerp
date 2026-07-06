package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.EopApi
import com.agroerp.prm.data.api.EopMobileTelemetryBatchRequest
import com.agroerp.prm.data.api.EopMobileTelemetryDto
import com.agroerp.prm.data.api.EopMobileTelemetryRequest
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class EopRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_eop", Context.MODE_PRIVATE)
    private val gson = Gson()
    private val pendingKey = "pending_events"

    private val api: EopApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(AuthHttpClient.create(appContext))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(EopApi::class.java)
    }

    fun queueEvent(event: EopMobileTelemetryRequest) {
        val pending = getPending().toMutableList()
        pending.add(event)
        prefs.edit().putString(pendingKey, gson.toJson(pending)).apply()
    }

    fun getPending(): List<EopMobileTelemetryRequest> {
        val json = prefs.getString(pendingKey, null) ?: return emptyList()
        return gson.fromJson(json, Array<EopMobileTelemetryRequest>::class.java).toList()
    }

    fun getCachedTelemetry(): List<EopMobileTelemetryDto> {
        val json = prefs.getString("telemetry", null) ?: return emptyList()
        return gson.fromJson(json, Array<EopMobileTelemetryDto>::class.java).toList()
    }

    fun reportCrash(deviceId: String, message: String, stack: String?) {
        queueEvent(
            EopMobileTelemetryRequest(
                deviceId = deviceId,
                eventType = "crash",
                message = message,
                stackTrace = stack,
                isOffline = true,
                appVersion = BuildConfig.VERSION_NAME,
            ),
        )
    }

    fun reportPerformance(deviceId: String, durationMs: Long) {
        queueEvent(
            EopMobileTelemetryRequest(
                deviceId = deviceId,
                eventType = "performance",
                durationMs = durationMs,
                appVersion = BuildConfig.VERSION_NAME,
            ),
        )
    }

    fun reportOfflineUsage(deviceId: String) {
        queueEvent(
            EopMobileTelemetryRequest(
                deviceId = deviceId,
                eventType = "offline_usage",
                isOffline = true,
                appVersion = BuildConfig.VERSION_NAME,
            ),
        )
    }

    suspend fun syncOffline(): List<EopMobileTelemetryDto>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return getCachedTelemetry()
        return try {
            val pending = getPending()
            if (pending.isNotEmpty()) {
                api.ingestBatch("Bearer $token", EopMobileTelemetryBatchRequest(pending))
                prefs.edit().remove(pendingKey).apply()
            }
            val list = api.list("Bearer $token")
            prefs.edit().putString("telemetry", gson.toJson(list)).apply()
            list
        } catch (_: Exception) {
            getCachedTelemetry()
        }
    }
}
