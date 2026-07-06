package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.data.api.WorkflowApi
import com.agroerp.prm.data.api.WorkflowAssignmentDto
import com.agroerp.prm.data.api.WorkflowSyncRequest
import com.agroerp.prm.data.api.WorkflowSyncResponse
import com.agroerp.prm.data.api.WorkflowTransitionRequest
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class WorkflowRepository(context: Context) {
    private val prefs = context.getSharedPreferences("agroerp_workflow", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: WorkflowApi by lazy {
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
            .create(WorkflowApi::class.java)
    }

    private fun authToken(): String {
        val token = context.getSharedPreferences("agroerp_auth", Context.MODE_PRIVATE)
            .getString("token", null) ?: error("No autenticado")
        return "Bearer $token"
    }

    private val context: Context = context.applicationContext

    suspend fun fetchInbox(): List<WorkflowAssignmentDto> {
        val inbox = api.getInbox(authToken())
        prefs.edit()
            .putString("inbox_cache", gson.toJson(inbox))
            .putLong("inbox_cached_at", System.currentTimeMillis())
            .apply()
        return inbox
    }

    fun getCachedInbox(): List<WorkflowAssignmentDto> {
        val json = prefs.getString("inbox_cache", null) ?: return emptyList()
        val type = object : TypeToken<List<WorkflowAssignmentDto>>() {}.type
        return gson.fromJson(json, type)
    }

    fun queueOfflineTransition(
        instanceId: String,
        transitionKey: String,
        comment: String? = null,
        gpsLocation: Map<String, Any>? = null,
        externalId: String? = null,
    ) {
        val pending = getPendingTransitions().toMutableList()
        pending.add(
            WorkflowTransitionRequest(
                transitionKey = transitionKey,
                comment = comment,
                gpsLocation = gpsLocation,
                instanceId = instanceId,
                externalId = externalId ?: "offline-${System.currentTimeMillis()}",
            ),
        )
        savePendingTransitions(pending)
    }

    suspend fun pushPendingTransitions(): WorkflowSyncResponse {
        val pending = getPendingTransitions()
        if (pending.isEmpty()) {
            return WorkflowSyncResponse(results = emptyList())
        }

        val response = api.syncTransitions(authToken(), WorkflowSyncRequest(transitions = pending))

        val failed = response.results.filter { !it.success }
        if (failed.isEmpty()) {
            savePendingTransitions(emptyList())
        } else {
            val retryKeys = failed.mapNotNull { it.instanceId }.toSet()
            val remaining = pending.filter { it.instanceId in retryKeys || it.externalId != null }
            savePendingTransitions(remaining)
        }

        prefs.edit().putLong("last_sync", System.currentTimeMillis()).apply()
        return response
    }

    suspend fun executeTransitionOnline(
        instanceId: String,
        transitionKey: String,
        comment: String? = null,
        gpsLocation: Map<String, Any>? = null,
    ) {
        api.executeTransition(
            authToken(),
            instanceId,
            WorkflowTransitionRequest(
                transitionKey = transitionKey,
                comment = comment,
                gpsLocation = gpsLocation,
            ),
        )
    }

    fun getPendingCount(): Int = getPendingTransitions().size

    private fun getPendingTransitions(): List<WorkflowTransitionRequest> {
        val json = prefs.getString("pending_transitions", null) ?: return emptyList()
        val type = object : TypeToken<List<WorkflowTransitionRequest>>() {}.type
        return gson.fromJson(json, type)
    }

    private fun savePendingTransitions(items: List<WorkflowTransitionRequest>) {
        prefs.edit().putString("pending_transitions", gson.toJson(items)).apply()
    }
}
