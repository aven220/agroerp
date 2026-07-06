package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.EsdjeJobMobileDto
import com.agroerp.prm.data.api.EsdjeMobileJobsResponse
import com.agroerp.prm.data.api.EsdjeRunMobileDto
import com.agroerp.prm.data.api.SchedulerApi
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class SchedulerRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_esdje", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: SchedulerApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(AuthHttpClient.create(appContext))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(SchedulerApi::class.java)
    }

    fun getCachedJobs(): EsdjeMobileJobsResponse? {
        val json = prefs.getString("jobs", null) ?: return null
        return gson.fromJson(json, EsdjeMobileJobsResponse::class.java)
    }

    fun getCachedRuns(): List<EsdjeRunMobileDto> {
        val json = prefs.getString("runs", null) ?: return emptyList()
        return gson.fromJson(json, Array<EsdjeRunMobileDto>::class.java).toList()
    }

    suspend fun syncOffline(): EsdjeMobileJobsResponse? {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return getCachedJobs()
        return try {
            val jobs = api.mobileJobs("Bearer $token")
            val runs = api.mobileRuns("Bearer $token")
            prefs.edit()
                .putString("jobs", gson.toJson(jobs))
                .putString("runs", gson.toJson(runs))
                .putLong("synced_at", System.currentTimeMillis())
                .apply()
            jobs
        } catch (_: Exception) {
            getCachedJobs()
        }
    }

    fun getActiveJobs(): List<EsdjeJobMobileDto> {
        return getCachedJobs()?.jobs?.filter {
            it.status in listOf("pending", "queued", "running")
        } ?: emptyList()
    }
}
