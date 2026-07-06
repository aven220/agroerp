package com.agroerp.prm.data.repository

import android.app.ActivityManager
import android.content.Context
import android.os.BatteryManager
import android.os.SystemClock
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.EpopApi
import com.agroerp.prm.data.api.EpopMobilePerfRequest
import com.agroerp.prm.data.api.EpopMobileSummary
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class EpopRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_epop", Context.MODE_PRIVATE)
    private val gson = Gson()
    private val appStartElapsed = SystemClock.elapsedRealtime()

    private val api: EpopApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(AuthHttpClient.create(appContext))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(EpopApi::class.java)
    }

    fun measureStartupMs(): Long = SystemClock.elapsedRealtime() - appStartElapsed

    fun currentMemoryMb(): Double {
        val am = appContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val info = ActivityManager.MemoryInfo()
        am.getMemoryInfo(info)
        return (info.totalMem - info.availMem).toDouble() / (1024.0 * 1024.0)
    }

    fun currentBatteryPct(): Double {
        val bm = appContext.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        return bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY).toDouble()
    }

    fun queueSample(sample: EpopMobilePerfRequest) {
        val pending = getPending().toMutableList()
        pending.add(sample)
        prefs.edit().putString("pending", gson.toJson(pending)).apply()
    }

    fun getPending(): List<EpopMobilePerfRequest> {
        val json = prefs.getString("pending", null) ?: return emptyList()
        return gson.fromJson(json, Array<EpopMobilePerfRequest>::class.java).toList()
    }

    fun getCachedSummary(): EpopMobileSummary? {
        val json = prefs.getString("summary", null) ?: return null
        return gson.fromJson(json, EpopMobileSummary::class.java)
    }

    fun captureLocalSample(deviceId: String, listRenderMs: Long = 12, fps: Double = 58.0, offlineOps: Int = 0) {
        queueSample(
            EpopMobilePerfRequest(
                deviceId = deviceId,
                startupMs = measureStartupMs(),
                memoryMb = currentMemoryMb(),
                batteryPct = currentBatteryPct(),
                fps = fps,
                syncMs = 40L + (0..40).random(),
                listRenderMs = listRenderMs,
                offlineOps = offlineOps,
            ),
        )
    }

    suspend fun syncOffline(): EpopMobileSummary? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return getCachedSummary()
        return try {
            for (sample in getPending()) {
                api.ingest("Bearer $token", sample)
            }
            prefs.edit().remove("pending").apply()
            val summary = api.summary("Bearer $token")
            prefs.edit().putString("summary", gson.toJson(summary)).apply()
            summary
        } catch (_: Exception) {
            getCachedSummary()
        }
    }
}
