package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.EaccApi
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.UUID

class EaccRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_eacc", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: EaccApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(AuthHttpClient.create(appContext))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(EaccApi::class.java)
    }

    fun getCachedSync(): Map<String, Any>? {
        val json = prefs.getString("sync", null) ?: return null
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedChecklists(): List<Map<String, Any>> {
        val json = prefs.getString("checklists", null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    suspend fun syncAll(): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return getCachedSync()
        return try {
            val sync = api.mobileSync("Bearer $token")
            val checklists = api.checklists("Bearer $token")
            prefs.edit()
                .putString("sync", gson.toJson(sync))
                .putString("checklists", gson.toJson(checklists))
                .putLong("synced_at", System.currentTimeMillis())
                .apply()
            sync
        } catch (_: Exception) {
            getCachedSync()
        }
    }

    suspend fun completeChecklistItem(itemKey: String, signatureRef: String?, photoRefs: List<String>): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return queueOffline("checklist", mapOf(
            "itemKey" to itemKey, "signatureRef" to (signatureRef ?: ""), "photoRefs" to photoRefs,
        ))
        return try {
            api.completeChecklistItem("Bearer $token", itemKey, mapOf(
                "signatureRef" to (signatureRef ?: ""),
                "photoRefs" to photoRefs,
            ))
        } catch (_: Exception) {
            queueOffline("checklist", mapOf("itemKey" to itemKey))
        }
    }

    suspend fun uploadEvidence(title: String, photoRef: String?, signatureRef: String?): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return queueOffline("evidence", mapOf(
            "title" to title, "photoRef" to (photoRef ?: ""),
        ))
        return try {
            api.uploadEvidence("Bearer $token", mapOf(
                "title" to title, "photoRef" to (photoRef ?: ""), "signatureRef" to (signatureRef ?: ""),
            ))
        } catch (_: Exception) {
            queueOffline("evidence", mapOf("title" to title))
        }
    }

    suspend fun recordAudit(auditType: String): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return queueOffline("audit", mapOf("auditType" to auditType))
        return try {
            api.recordAudit("Bearer $token", mapOf("auditType" to auditType))
        } catch (_: Exception) {
            queueOffline("audit", mapOf("auditType" to auditType))
        }
    }

    suspend fun recordFinding(auditId: String, description: String): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return null
        return try {
            api.recordFinding("Bearer $token", mapOf(
                "auditId" to auditId, "findingType" to "observation", "description" to description,
            ))
        } catch (_: Exception) {
            null
        }
    }

    suspend fun recordSafetyInspection(signatureRef: String?, photoRefs: List<String>): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return null
        return try {
            api.recordSafetyInspection("Bearer $token", mapOf(
                "signatureRef" to (signatureRef ?: ""), "photoRefs" to photoRefs, "score" to 85.0,
            ))
        } catch (_: Exception) {
            null
        }
    }

    private suspend fun queueOffline(type: String, payload: Map<String, Any>): Map<String, Any>? {
        val batchKey = "eacc-${UUID.randomUUID()}"
        val token = AuthTokenStore.getAccessToken(appContext) ?: return null
        return try {
            api.queueBatch("Bearer $token", mapOf("batchKey" to batchKey, "payload" to mapOf("type" to type) + payload))
        } catch (_: Exception) {
            null
        }
    }

    suspend fun syncOfflineBatch(batchKey: String): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return null
        return try {
            api.syncBatch("Bearer $token", batchKey)
        } catch (_: Exception) {
            null
        }
    }
}
