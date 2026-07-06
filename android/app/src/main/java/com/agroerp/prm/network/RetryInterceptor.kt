package com.agroerp.prm.network

import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException

class RetryInterceptor(
    private val maxRetries: Int = 3,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        var attempt = 0
        var lastException: IOException? = null
        var request = chain.request()

        while (attempt <= maxRetries) {
            try {
                val response = chain.proceed(request)
                if (response.isSuccessful || response.code < 500) {
                    return response
                }
                response.close()
            } catch (e: IOException) {
                lastException = e
            }
            attempt++
            if (attempt <= maxRetries) {
                Thread.sleep((500L * attempt).coerceAtMost(3000L))
            }
        }

        throw lastException ?: IOException("Request failed after retries")
    }
}
