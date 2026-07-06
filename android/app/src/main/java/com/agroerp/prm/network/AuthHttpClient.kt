package com.agroerp.prm.network

import android.content.Context
import com.agroerp.prm.BuildConfig
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import java.util.concurrent.TimeUnit

object AuthHttpClient {
    fun create(context: Context, tokenRefresher: TokenRefresher? = null): OkHttpClient {
        return OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(AuthInterceptor(context, tokenRefresher))
            .addInterceptor(RetryInterceptor(maxRetries = 3))
            .addInterceptor { chain ->
                val request = chain.request().newBuilder()
                    .header("X-AgroERP-Version", BuildConfig.VERSION_NAME)
                    .build()
                chain.proceed(request)
            }
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BASIC else HttpLoggingInterceptor.Level.NONE
            })
            .build()
    }
}
