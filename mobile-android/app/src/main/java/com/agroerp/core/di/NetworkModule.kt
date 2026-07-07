package com.agroerp.core.di

import com.agroerp.BuildConfig
import com.agroerp.core.network.AuthInterceptor
import com.agroerp.core.network.DeviceHeadersInterceptor
import com.agroerp.core.security.DeviceIdProvider
import com.agroerp.core.security.TokenManager
import com.agroerp.data.api.AgroErpApi
import com.agroerp.data.api.CaptureApi
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideGson(): Gson = GsonBuilder().serializeNulls().create()

    @Provides
    @Singleton
    fun provideOkHttpClient(
        tokenManager: TokenManager,
        deviceIdProvider: DeviceIdProvider,
    ): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }
        return OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .addInterceptor(DeviceHeadersInterceptor(deviceIdProvider))
            .addInterceptor(AuthInterceptor(tokenManager))
            .addInterceptor(logging)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(client: OkHttpClient, gson: Gson): Retrofit =
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()

    @Provides
    @Singleton
    fun provideApi(retrofit: Retrofit): AgroErpApi =
        retrofit.create(AgroErpApi::class.java)

    @Provides
    @Singleton
    fun provideCaptureApi(retrofit: Retrofit): CaptureApi =
        retrofit.create(CaptureApi::class.java)
}
