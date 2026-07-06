package com.agroerp.prm.data.repository

import android.content.Context
import android.graphics.Bitmap
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.data.api.AiApi
import com.agroerp.prm.data.api.AiChatRequest
import com.agroerp.prm.data.api.AiChatResponseDto
import com.agroerp.prm.data.api.AiCopilotDto
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.agroerp.prm.network.EamipHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.io.ByteArrayOutputStream
import android.util.Base64

class AiRepository(private val context: Context) {
    private val prefs = context.getSharedPreferences("agroerp_ai", Context.MODE_PRIVATE)
    private val authPrefs = context.getSharedPreferences("agroerp_auth", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: AiApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(EamipHttpClient.create(context))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(AiApi::class.java)
    }

    private fun token(): String = "Bearer ${authPrefs.getString("token", null) ?: error("No autenticado")}"

    suspend fun chat(prompt: String, copilotKey: String? = null, conversationId: String? = null): AiChatResponseDto {
        val response = api.chat(token(), AiChatRequest(prompt, copilotKey, conversationId, true))
        cacheOffline(prompt, response.content)
        return response
    }

    suspend fun fetchCopilots(): List<AiCopilotDto> = api.listCopilots(token())

    suspend fun quickQuery(serviceType: String, prompt: String): AiChatResponseDto {
        return api.quickQuery(token(), mapOf("serviceType" to serviceType, "prompt" to prompt))
    }

    suspend fun analyzeImage(bitmap: Bitmap): AiChatResponseDto {
        val stream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 70, stream)
        val b64 = Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP).take(12000)
        val prompt = "Analiza imagen de campo agrícola. Dimensiones: ${bitmap.width}x${bitmap.height}. Datos JPEG base64: $b64"
        val response = quickQuery("image_analysis", prompt)
        cacheOffline("[imagen]", response.content)
        return response
    }

    fun getOfflineCache(): List<Pair<String, String>> {
        val json = prefs.getString("offline_cache", null) ?: return emptyList()
        val type = object : TypeToken<List<Pair<String, String>>>() {}.type
        return gson.fromJson(json, type)
    }

    fun findOfflineMatch(prompt: String): String? {
        val normalized = prompt.lowercase().trim()
        return getOfflineCache().firstOrNull { (q, _) ->
            q.lowercase().contains(normalized) || normalized.contains(q.lowercase().take(20))
        }?.second
    }

    private fun cacheOffline(prompt: String, response: String) {
        val cache = getOfflineCache().toMutableList()
        cache.add(0, prompt to response)
        if (cache.size > 20) cache.removeAt(cache.size - 1)
        prefs.edit().putString("offline_cache", gson.toJson(cache)).apply()
    }
}
