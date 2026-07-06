package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.data.api.BiApi
import com.agroerp.prm.data.api.BiCenterDto
import com.agroerp.prm.data.api.BiDashboardDto
import com.agroerp.prm.data.api.BiKpiRealtimeDto
import com.agroerp.prm.data.api.BiRealtimeDto
import com.agroerp.prm.network.EamipHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class BiRepository(private val context: Context) {
    private val authPrefs = context.getSharedPreferences("agroerp_auth", Context.MODE_PRIVATE)

    private val api: BiApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(EamipHttpClient.create(context))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(BiApi::class.java)
    }

    private fun token(): String {
        val t = authPrefs.getString("token", null) ?: error("No autenticado")
        return "Bearer $t"
    }

    suspend fun fetchCenter(): BiCenterDto = api.getCenter(token())

    suspend fun fetchRealtime(): BiRealtimeDto = api.getRealtime(token())

    suspend fun fetchDashboards(): List<BiDashboardDto> = api.listDashboards(token())

    suspend fun fetchCategoryData(category: String): Map<String, Any> =
        api.getCategoryData(token(), category)

    suspend fun fetchKpiRealtime(): List<BiKpiRealtimeDto> = api.getKpiRealtime(token())

    suspend fun captureKpi(id: String) = api.captureKpi(token(), id)
}
