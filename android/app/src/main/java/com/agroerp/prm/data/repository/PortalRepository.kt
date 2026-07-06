package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.PortalApi
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class PortalRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_portal", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: PortalApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(AuthHttpClient.create())
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(PortalApi::class.java)
    }

    fun getCachedDashboard(): Map<String, Any> {
        val json = prefs.getString("dashboard", null) ?: return emptyMap()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedProfile(): Map<String, Any> {
        val json = prefs.getString("profile", null) ?: return emptyMap()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedNews(): List<Map<String, Any>> = readList("news")
    fun getCachedNotices(): List<Map<String, Any>> = readList("notices")
    fun getCachedQuickLinks(): List<Map<String, Any>> = readList("quick_links")
    fun getCachedBirthdays(): List<Map<String, Any>> = readList("birthdays")
    fun getCachedRequests(): List<Map<String, Any>> = readList("requests")
    fun getCachedVacations(): Map<String, Any> {
        val json = prefs.getString("vacations", null) ?: return emptyMap()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }
    fun getCachedCertificates(): List<Map<String, Any>> = readList("certificates")
    fun getDraftRequests(): List<Map<String, Any>> = readList("draft_requests")
    fun getCachedPayslips(): List<Map<String, Any>> = readList("payslips")
    fun getCachedPersonalDocs(): Map<String, Any> {
        val json = prefs.getString("personal_docs", null) ?: return emptyMap()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }
    fun getCachedOfflineDocs(): List<Map<String, Any>> = readList("offline_docs")

    private fun readList(key: String): List<Map<String, Any>> {
        val json = prefs.getString(key, null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    suspend fun syncOffline(employeeKey: String? = null): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return offlineFallback()
        return try {
            val auth = "Bearer $token"
            api.login(auth, if (employeeKey != null) mapOf("employeeKey" to employeeKey) else emptyMap())
            val sync = api.sync(auth, employeeKey)
            prefs.edit()
                .putString("dashboard", gson.toJson(sync))
                .putString("profile", gson.toJson(sync["profile"]))
                .putString("news", gson.toJson(sync["news"]))
                .putString("notices", gson.toJson(sync["notices"]))
                .putString("quick_links", gson.toJson(sync["quickLinks"]))
                .putString("birthdays", gson.toJson(sync["birthdays"]))
                .putString("requests", gson.toJson(sync["requests"]))
                .putString("vacations", gson.toJson(sync["vacations"]))
                .putString("certificates", gson.toJson(sync["certificates"]))
                .putString("payslips", gson.toJson(sync["payslips"]))
                .putString("personal_docs", gson.toJson(sync["personalDocs"]))
                .putString("offline_docs", gson.toJson(sync["offline"]))
                .putString("syncedAt", sync["syncedAt"]?.toString())
                .apply()
            flushDrafts(auth)
            sync
        } catch (_: Exception) {
            offlineFallback()
        }
    }

    suspend fun updateProfileOffline(body: Map<String, Any?>): Boolean {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return false
        return try {
            api.updateProfile("Bearer $token", body)
            syncOffline()
            true
        } catch (_: Exception) {
            false
        }
    }

    fun saveDraftRequest(body: Map<String, Any?>) {
        val drafts = getDraftRequests().toMutableList()
        @Suppress("UNCHECKED_CAST")
        drafts.add(body as Map<String, Any>)
        prefs.edit().putString("draft_requests", gson.toJson(drafts)).apply()
    }

    suspend fun createRequestOffline(body: Map<String, Any?>): Boolean {
        val token = AuthTokenStore.getAccessToken(appContext)
        if (token == null) {
            saveDraftRequest(body)
            return true
        }
        return try {
            api.createRequest("Bearer $token", body)
            syncOffline()
            true
        } catch (_: Exception) {
            saveDraftRequest(body)
            true
        }
    }

    suspend fun addAttachmentOffline(body: Map<String, Any?>): Boolean {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return false
        return try {
            api.addAttachment("Bearer $token", body)
            syncOffline()
            true
        } catch (_: Exception) {
            false
        }
    }

    suspend fun downloadPayslipOffline(payslipKey: String): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return getCachedOfflineDocs()
            .firstOrNull { it["sourceType"] == "payslip" && it["sourceKey"] == payslipKey }
        return try {
            val file = api.downloadPayslip("Bearer $token", payslipKey)
            api.saveOfflineDocument(
                "Bearer $token",
                mapOf(
                    "sourceType" to "payslip",
                    "sourceKey" to payslipKey,
                    "title" to "Desprendible $payslipKey",
                    "fileName" to file["fileName"],
                    "pdfBase64" to file["pdfBase64"],
                    "periodCode" to file["periodCode"],
                ),
            )
            prefs.edit().putString("pdf_$payslipKey", gson.toJson(file)).apply()
            syncOffline()
            file
        } catch (_: Exception) {
            val json = prefs.getString("pdf_$payslipKey", null) ?: return null
            @Suppress("UNCHECKED_CAST")
            gson.fromJson(json, Map::class.java) as Map<String, Any>
        }
    }

    suspend fun downloadDocumentOffline(documentKey: String): Map<String, Any>? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return getCachedOfflineDocs()
            .firstOrNull { it["sourceKey"] == documentKey }
        return try {
            val file = api.downloadPersonalDocument("Bearer $token", documentKey)
            api.saveOfflineDocument(
                "Bearer $token",
                mapOf(
                    "sourceType" to "document",
                    "sourceKey" to documentKey,
                    "title" to documentKey,
                    "fileName" to file["fileName"],
                    "pdfBase64" to file["pdfBase64"],
                ),
            )
            prefs.edit().putString("pdf_doc_$documentKey", gson.toJson(file)).apply()
            file
        } catch (_: Exception) {
            val json = prefs.getString("pdf_doc_$documentKey", null) ?: return null
            @Suppress("UNCHECKED_CAST")
            gson.fromJson(json, Map::class.java) as Map<String, Any>
        }
    }

    private suspend fun flushDrafts(auth: String) {
        val drafts = getDraftRequests()
        if (drafts.isEmpty()) return
        val remaining = mutableListOf<Map<String, Any>>()
        for (draft in drafts) {
            try {
                @Suppress("UNCHECKED_CAST")
                api.createRequest(auth, draft as Map<String, Any?>)
            } catch (_: Exception) {
                remaining.add(draft)
            }
        }
        prefs.edit().putString("draft_requests", gson.toJson(remaining)).apply()
    }

    private fun offlineFallback(): Map<String, Any> = mapOf(
        "profile" to getCachedProfile(),
        "news" to getCachedNews(),
        "notices" to getCachedNotices(),
        "quickLinks" to getCachedQuickLinks(),
        "birthdays" to getCachedBirthdays(),
        "requests" to getCachedRequests(),
        "vacations" to getCachedVacations(),
        "certificates" to getCachedCertificates(),
        "drafts" to getDraftRequests(),
        "payslips" to getCachedPayslips(),
        "personalDocs" to getCachedPersonalDocs(),
        "offlineDocs" to getCachedOfflineDocs(),
        "offline" to true,
    )
}
