package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.data.api.EamipApi
import com.agroerp.prm.data.api.ApiCenterDto
import com.agroerp.prm.data.api.ApiCatalogItemDto
import com.agroerp.prm.network.EamipHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class EamipRepository(context: Context) {
    private val authPrefs = context.getSharedPreferences("agroerp_auth", Context.MODE_PRIVATE)

    private val api: EamipApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(EamipHttpClient.create(context))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(EamipApi::class.java)
    }

    private fun token(): String = "Bearer ${authPrefs.getString("token", null) ?: error("No autenticado")}"

    suspend fun fetchCenter(): ApiCenterDto = api.center(token())

    suspend fun fetchCatalog(): List<ApiCatalogItemDto> = api.catalog(token())
}
