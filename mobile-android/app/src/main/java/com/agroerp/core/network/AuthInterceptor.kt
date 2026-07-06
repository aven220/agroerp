package com.agroerp.core.network

import com.agroerp.core.security.TokenManager
import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor(
    private val tokenManager: TokenManager,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val token = tokenManager.getAccessToken()
        val builder = request.newBuilder()
        if (!token.isNullOrBlank() && !request.url.encodedPath.contains("/auth/login")) {
            builder.header("Authorization", "Bearer $token")
        }
        return chain.proceed(builder.build())
    }
}

class DeviceHeadersInterceptor(
    private val deviceIdProvider: com.agroerp.core.security.DeviceIdProvider,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request().newBuilder()
            .header("X-Device-Id", deviceIdProvider.deviceId)
            .header("X-App-Version", com.agroerp.BuildConfig.APP_VERSION)
            .header("X-Platform", "android")
            .build()
        return chain.proceed(request)
    }
}
