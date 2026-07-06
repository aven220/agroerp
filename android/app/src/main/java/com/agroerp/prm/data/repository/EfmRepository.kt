package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.EfmApi
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class EfmRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_efm", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: EfmApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(AuthHttpClient.create())
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(EfmApi::class.java)
    }

    fun getCachedAccounts(): List<Map<String, Any>> = readList("accounts")

    fun getCachedParameters(): List<Map<String, Any>> = readList("parameters")

    fun getCachedCenter(): Map<String, Any> {
        val json = prefs.getString("center", null) ?: return emptyMap()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedVouchers(): List<Map<String, Any>> = readList("vouchers")

    fun getCachedJournalBook(): List<Map<String, Any>> = readList("journalBook")

    fun getCachedLedger(): List<Map<String, Any>> = readList("ledger")

    fun getCachedApCenter(): Map<String, Any> {
        val json = prefs.getString("apCenter", null) ?: return emptyMap()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedApPayables(): List<Map<String, Any>> = readList("apPayables")

    fun getCachedApPendingApprovals(): List<Map<String, Any>> = readList("apPendingApprovals")

    fun getCachedApSuppliers(): List<Map<String, Any>> = readList("apSuppliers")

    fun getCachedTrCenter(): Map<String, Any> {
        val json = prefs.getString("trCenter", null) ?: return emptyMap()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedTrBalances(): List<Map<String, Any>> = readList("trBalances")

    fun getCachedTrMovements(): List<Map<String, Any>> = readList("trMovements")

    fun getCachedTrCashflow(): Map<String, Any> {
        val json = prefs.getString("trCashflow", null) ?: return emptyMap()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedFaCenter(): Map<String, Any> {
        val json = prefs.getString("faCenter", null) ?: return emptyMap()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedFaAssets(): List<Map<String, Any>> = readList("faAssets")

    fun getCachedFaInventories(): List<Map<String, Any>> = readList("faInventories")

    fun getCachedBgCenter(): Map<String, Any> {
        val json = prefs.getString("bgCenter", null) ?: return emptyMap()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedBgBudgets(): List<Map<String, Any>> = readList("bgBudgets")

    fun getCachedBgExecutions(): List<Map<String, Any>> = readList("bgExecutions")

    fun getCachedBgPendingApprovals(): List<Map<String, Any>> = readList("bgPendingApprovals")

    fun getCachedFoCenter(): Map<String, Any> {
        val json = prefs.getString("foCenter", null) ?: return emptyMap()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedFoKpis(): List<Map<String, Any>> = readList("foKpis")

    fun getCachedFoStatements(): List<Map<String, Any>> = readList("foStatements")

    fun getCachedFoAlerts(): List<Map<String, Any>> = readList("foAlerts")

    private fun readList(key: String): List<Map<String, Any>> {
        val json = prefs.getString(key, null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    suspend fun syncOffline(): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return offlineFallback()
        return try {
            val auth = "Bearer $token"
            val sync = api.sync(auth)
            val apSync = try { api.apSync(auth) } catch (_: Exception) { emptyMap() }
            val trSync = try { api.trSync(auth) } catch (_: Exception) { emptyMap() }
            val faSync = try { api.faSync(auth) } catch (_: Exception) { emptyMap() }
            val bgSync = try { api.bgSync(auth) } catch (_: Exception) { emptyMap() }
            val bgApprovals = try { api.bgPendingApprovals(auth) } catch (_: Exception) { emptyList() }
            val foSync = try { api.foSync(auth) } catch (_: Exception) { emptyMap() }
            prefs.edit()
                .putString("accounts", gson.toJson(sync["accounts"]))
                .putString("parameters", gson.toJson(sync["parameters"]))
                .putString("center", gson.toJson(sync["center"]))
                .putString("vouchers", gson.toJson(sync["vouchers"]))
                .putString("journalBook", gson.toJson(sync["journalBook"]))
                .putString("ledger", gson.toJson(sync["ledger"]))
                .putString("apCenter", gson.toJson(apSync["center"]))
                .putString("apPayables", gson.toJson(apSync["openPayables"]))
                .putString("apPendingApprovals", gson.toJson(apSync["pendingApprovals"]))
                .putString("apSuppliers", gson.toJson(apSync["suppliers"]))
                .putString("trCenter", gson.toJson(trSync["center"]))
                .putString("trBalances", gson.toJson(trSync["balances"]))
                .putString("trMovements", gson.toJson(trSync["movements"]))
                .putString("trCashflow", gson.toJson(trSync["cashflow"]))
                .putString("faCenter", gson.toJson(faSync["center"]))
                .putString("faAssets", gson.toJson(faSync["assets"]))
                .putString("faInventories", gson.toJson(faSync["physicalInventories"]))
                .putString("bgCenter", gson.toJson(bgSync["center"]))
                .putString("bgBudgets", gson.toJson(bgSync["budgets"]))
                .putString("bgExecutions", gson.toJson(bgSync["executions"]))
                .putString("bgPendingApprovals", gson.toJson(bgApprovals))
                .putString("foCenter", gson.toJson(foSync["center"]))
                .putString("foKpis", gson.toJson(foSync["kpis"]))
                .putString("foStatements", gson.toJson(foSync["statements"]))
                .putString("foAlerts", gson.toJson(foSync["alerts"]))
                .putString("syncedAt", sync["syncedAt"]?.toString())
                .apply()
            sync + mapOf("ap" to apSync, "tr" to trSync, "fa" to faSync, "bg" to bgSync, "fo" to foSync)
        } catch (_: Exception) {
            offlineFallback()
        }
    }

    private fun offlineFallback(): Map<String, Any> = mapOf(
        "accounts" to getCachedAccounts(),
        "parameters" to getCachedParameters(),
        "center" to getCachedCenter(),
        "vouchers" to getCachedVouchers(),
        "journalBook" to getCachedJournalBook(),
        "ledger" to getCachedLedger(),
        "ap" to mapOf(
            "center" to getCachedApCenter(),
            "openPayables" to getCachedApPayables(),
            "pendingApprovals" to getCachedApPendingApprovals(),
            "suppliers" to getCachedApSuppliers(),
        ),
        "tr" to mapOf(
            "center" to getCachedTrCenter(),
            "balances" to getCachedTrBalances(),
            "movements" to getCachedTrMovements(),
            "cashflow" to getCachedTrCashflow(),
        ),
        "fa" to mapOf(
            "center" to getCachedFaCenter(),
            "assets" to getCachedFaAssets(),
            "physicalInventories" to getCachedFaInventories(),
        ),
        "bg" to mapOf(
            "center" to getCachedBgCenter(),
            "budgets" to getCachedBgBudgets(),
            "executions" to getCachedBgExecutions(),
            "pendingApprovals" to getCachedBgPendingApprovals(),
        ),
        "fo" to mapOf(
            "center" to getCachedFoCenter(),
            "kpis" to getCachedFoKpis(),
            "statements" to getCachedFoStatements(),
            "alerts" to getCachedFoAlerts(),
        ),
    )

    suspend fun approveApPaymentOffline(paymentKey: String, comments: String? = null): Boolean {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return false
        return try {
            api.approveApPayment("Bearer $token", paymentKey, mapOf("comments" to comments))
            syncOffline()
            true
        } catch (_: Exception) {
            false
        }
    }

    suspend fun reportApIncident(supplierKey: String, description: String, invoiceKey: String? = null): Boolean {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return false
        return try {
            api.createApIncident("Bearer $token", mapOf(
                "supplierKey" to supplierKey,
                "description" to description,
                "invoiceKey" to invoiceKey,
            ))
            true
        } catch (_: Exception) {
            false
        }
    }
}
