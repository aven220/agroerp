package com.agroerp.prm.network

import android.content.Context
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import java.security.MessageDigest

class SecureCacheInterceptor(context: Context) : Interceptor {
    private val prefs = context.getSharedPreferences("agroerp_api_cache", Context.MODE_PRIVATE)

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        if (request.method != "GET") {
            return chain.proceed(request)
        }

        val cacheKey = hash(request.url.toString())
        val cachedBody = prefs.getString(cacheKey, null)
        val cachedAt = prefs.getLong("${cacheKey}_at", 0L)
        val maxAgeMs = 5 * 60 * 1000L

        if (cachedBody != null && System.currentTimeMillis() - cachedAt < maxAgeMs) {
            return Response.Builder()
                .request(request)
                .protocol(okhttp3.Protocol.HTTP_1_1)
                .code(200)
                .message("OK")
                .body(cachedBody.toResponseBody("application/json".toMediaType()))
                .build()
        }

        val response = chain.proceed(request)
        if (response.isSuccessful) {
            val body = response.peekBody(512 * 1024).string()
            prefs.edit()
                .putString(cacheKey, body)
                .putLong("${cacheKey}_at", System.currentTimeMillis())
                .apply()
        }
        return response
    }

    private fun hash(value: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        return digest.digest(value.toByteArray()).joinToString("") { "%02x".format(it) }
    }
}
