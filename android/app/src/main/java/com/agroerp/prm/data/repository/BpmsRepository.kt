package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.BpmsApi
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class BpmsRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_bpms", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: BpmsApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(AuthHttpClient.create())
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(BpmsApi::class.java)
    }

    suspend fun syncMobile(): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readMap("mobileSync")
        return try {
            val data = api.mobileSync("Bearer $token")
            prefs.edit().putString("mobileSync", gson.toJson(data)).apply()
            data
        } catch (_: Exception) {
            readMap("mobileSync")
        }
    }

    suspend fun fetchInbox(): List<Map<String, Any>> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return readList("inbox")
        return try {
            val list = api.inbox("Bearer $token")
            prefs.edit().putString("inbox", gson.toJson(list)).apply()
            list
        } catch (_: Exception) {
            readList("inbox")
        }
    }

    suspend fun approveTask(taskKey: String, signatureUrl: String? = null): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        val body = mutableMapOf<String, Any>("approved" to true)
        if (signatureUrl != null) body["signatureUrl"] = signatureUrl
        return try {
            api.completeTask("Bearer $token", taskKey, body)
        } catch (_: Exception) {
            queueOffline("mobile", listOf(mapOf("type" to "task_complete", "payload" to mapOf("taskKey" to taskKey, "approved" to true))))
            emptyMap()
        }
    }

    suspend fun rejectTask(taskKey: String): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.completeTask("Bearer $token", taskKey, mapOf("approved" to false))
        } catch (_: Exception) {
            emptyMap()
        }
    }

    suspend fun delegateTask(taskKey: String, toUserId: String): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.delegateTask("Bearer $token", taskKey, mapOf("toUserId" to toUserId))
        } catch (_: Exception) {
            queueOffline("mobile", listOf(mapOf("type" to "task_delegate", "payload" to mapOf("taskKey" to taskKey, "toUserId" to toUserId))))
            emptyMap()
        }
    }

    suspend fun attachEvidence(taskKey: String, title: String, storageUrl: String): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.attachEvidence("Bearer $token", taskKey, mapOf("title" to title, "storageUrl" to storageUrl))
        } catch (_: Exception) {
            queueOffline("mobile", listOf(mapOf("type" to "task_attach", "payload" to mapOf("taskKey" to taskKey, "title" to title, "storageUrl" to storageUrl))))
            emptyMap()
        }
    }

    suspend fun queueOffline(deviceId: String, operations: List<Map<String, Any>>): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.queueOffline("Bearer $token", mapOf("deviceId" to deviceId, "operations" to operations))
        } catch (_: Exception) {
            readMap("offlinePending")
        }
    }

    suspend fun syncOffline(batchKey: String): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return emptyMap()
        return try {
            api.syncOffline("Bearer $token", batchKey)
        } catch (_: Exception) {
            emptyMap()
        }
    }

    fun getCachedInbox(): List<Map<String, Any>> = readList("inbox")

    private fun readMap(key: String): Map<String, Any> {
        val json = prefs.getString(key, null) ?: return emptyMap()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    private fun readList(key: String): List<Map<String, Any>> {
        val json = prefs.getString(key, null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }
}
