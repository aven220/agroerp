package com.agroerp.prm.network

import android.content.Context
import com.agroerp.prm.auth.AuthTokenStore
import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor(
    private val context: Context,
    private val tokenRefresher: TokenRefresher?,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        val token = AuthTokenStore.getAccessToken(context)
        val deviceId = AuthTokenStore.getOrCreateDeviceId(context)

        val requestBuilder = original.newBuilder()
            .header("X-Device-Id", deviceId)
            .header("X-AgroERP-Client", "android-prm")

        if (token != null && !original.url.encodedPath.contains("/auth/login")) {
            requestBuilder.header("Authorization", "Bearer $token")
        }

        val response = chain.proceed(requestBuilder.build())
        if (response.code == 401 && token != null && tokenRefresher != null) {
            response.close()
            val refreshed = tokenRefresher.refreshSync()
            if (refreshed) {
                val newToken = AuthTokenStore.getAccessToken(context) ?: return response
                return chain.proceed(
                    original.newBuilder()
                        .header("Authorization", "Bearer $newToken")
                        .header("X-Device-Id", deviceId)
                        .header("X-AgroERP-Client", "android-prm")
                        .build(),
                )
            }
        }
        return response
    }
}

interface TokenRefresher {
    fun refreshSync(): Boolean
}
