package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.IotApi
import com.agroerp.prm.data.api.IotMobileDevicesResponse
import com.agroerp.prm.data.api.IotTelemetryMobileDto
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class IotRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_iot", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: IotApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(AuthHttpClient.create(appContext))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(IotApi::class.java)
    }

    fun getCachedDevices(): IotMobileDevicesResponse? {
        val json = prefs.getString("devices", null) ?: return null
        return gson.fromJson(json, IotMobileDevicesResponse::class.java)
    }

    fun getCachedTelemetry(): List<IotTelemetryMobileDto> {
        val json = prefs.getString("telemetry", null) ?: return emptyList()
        return gson.fromJson(json, Array<IotTelemetryMobileDto>::class.java).toList()
    }

    fun cacheBleDiscovery(devices: List<String>) {
        prefs.edit().putString("ble_discovered", gson.toJson(devices)).apply()
    }

    fun getBleDiscovered(): List<String> {
        val json = prefs.getString("ble_discovered", null) ?: return emptyList()
        return gson.fromJson(json, Array<String>::class.java).toList()
    }

    fun cacheNfcTag(tagId: String) {
        prefs.edit().putString("last_nfc_tag", tagId).apply()
    }

    fun getLastNfcTag(): String? = prefs.getString("last_nfc_tag", null)

    fun cacheQrScan(payload: String) {
        prefs.edit().putString("last_qr_scan", payload).apply()
    }

    fun getLastQrScan(): String? = prefs.getString("last_qr_scan", null)

    suspend fun syncOffline(): IotMobileDevicesResponse? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return getCachedDevices()
        return try {
            val devices = api.mobileDevices("Bearer $token")
            val telemetry = api.mobileTelemetry("Bearer $token")
            prefs.edit()
                .putString("devices", gson.toJson(devices))
                .putString("telemetry", gson.toJson(telemetry))
                .putLong("synced_at", System.currentTimeMillis())
                .apply()
            devices
        } catch (_: Exception) {
            getCachedDevices()
        }
    }
}
