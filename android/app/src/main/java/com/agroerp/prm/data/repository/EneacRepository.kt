package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.data.api.EneacApi
import com.agroerp.prm.data.api.EneacMobileSyncRequest
import com.agroerp.prm.data.api.EneacMobileSyncResponse
import com.agroerp.prm.data.api.EneacNotificationDto
import com.agroerp.prm.data.api.RegisterPushTokenRequest
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class EneacRepository(context: Context) {
    private val prefs = context.getSharedPreferences("agroerp_eneac", Context.MODE_PRIVATE)
    private val gson = Gson()
    private val authPrefs = context.getSharedPreferences("agroerp_auth", Context.MODE_PRIVATE)

    private val api: EneacApi by lazy {
        val client = OkHttpClient.Builder()
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BASIC
            })
            .build()
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(EneacApi::class.java)
    }

    private fun token(): String {
        val t = authPrefs.getString("token", null) ?: error("No autenticado")
        return "Bearer $t"
    }

    suspend fun fetchInbox(): List<EneacNotificationDto> {
        val inbox = api.getInbox(token())
        prefs.edit()
            .putString("inbox_cache", gson.toJson(inbox))
            .putLong("last_sync", System.currentTimeMillis())
            .apply()
        return inbox
    }

    fun getCachedInbox(): List<EneacNotificationDto> {
        val json = prefs.getString("inbox_cache", null) ?: return emptyList()
        val type = object : TypeToken<List<EneacNotificationDto>>() {}.type
        return gson.fromJson(json, type)
    }

    fun queueOfflineRead(id: String) {
        val pending = getPendingReads().toMutableSet()
        pending.add(id)
        prefs.edit().putStringSet("pending_reads", pending).apply()
    }

    fun queueOfflineAttend(id: String) {
        val pending = getPendingAttends().toMutableSet()
        pending.add(id)
        prefs.edit().putStringSet("pending_attends", pending).apply()
    }

    suspend fun syncMobile(): EneacMobileSyncResponse {
        val readIds = getPendingReads().toList()
        val attendIds = getPendingAttends().toList()
        val response = api.mobileSync(
            token(),
            EneacMobileSyncRequest(
                readIds = readIds.ifEmpty { null },
                attendIds = attendIds.ifEmpty { null },
            ),
        )
        prefs.edit()
            .remove("pending_reads")
            .remove("pending_attends")
            .putString("inbox_cache", gson.toJson(response.inbox))
            .apply()
        return response
    }

    suspend fun markReadOnline(id: String) {
        api.markRead(token(), id)
    }

    suspend fun attendOnline(id: String) {
        api.attend(token(), id)
    }

    suspend fun registerPushToken(pushToken: String, deviceId: String? = null) {
        api.registerToken(token(), RegisterPushTokenRequest(token = pushToken, deviceId = deviceId))
        prefs.edit().putString("push_token", pushToken).apply()
    }

    fun getUnreadCount(): Int =
        getCachedInbox().count { it.status == "unread" }

    private fun getPendingReads(): Set<String> =
        prefs.getStringSet("pending_reads", emptySet()) ?: emptySet()

    private fun getPendingAttends(): Set<String> =
        prefs.getStringSet("pending_attends", emptySet()) ?: emptySet()
}
