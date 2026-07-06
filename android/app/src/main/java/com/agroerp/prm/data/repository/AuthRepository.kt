package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.AuthApi
import com.agroerp.prm.data.api.ChangePasswordRequest
import com.agroerp.prm.data.api.LoginRequest
import com.agroerp.prm.data.api.LoginResponse
import com.agroerp.prm.data.api.MfaCompleteRequest
import com.agroerp.prm.data.api.RefreshRequest
import com.agroerp.prm.network.AuthHttpClient
import com.agroerp.prm.network.TokenRefresher
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock

class AuthRepository(private val context: Context) : TokenRefresher {
    private val lock = ReentrantLock()

    private val api: AuthApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(AuthHttpClient.create(context, this))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(AuthApi::class.java)
    }

    val isLoggedIn: Boolean
        get() = AuthTokenStore.isLoggedIn(context)

    val hasOfflineToken: Boolean
        get() = AuthTokenStore.getAccessToken(context) != null

    suspend fun login(email: String, password: String): LoginResponse {
        val deviceId = AuthTokenStore.getOrCreateDeviceId(context)
        val response = api.login(deviceId, LoginRequest(email.trim(), password))
        if (!response.mfaRequired && response.accessToken != null && response.refreshToken != null) {
            persistTokens(email, response.accessToken, response.refreshToken)
        }
        return response
    }

    suspend fun completeMfa(mfaToken: String, code: String): LoginResponse {
        val deviceId = AuthTokenStore.getOrCreateDeviceId(context)
        val response = api.completeMfa(deviceId, MfaCompleteRequest(mfaToken, code))
        if (response.accessToken != null && response.refreshToken != null) {
            val email = AuthTokenStore.getLastEmail(context) ?: response.user?.email ?: ""
            persistTokens(email, response.accessToken, response.refreshToken)
        }
        return response
    }

    suspend fun refresh(): Boolean = lock.withLock {
        val refreshToken = AuthTokenStore.getRefreshToken(context) ?: return false
        return try {
            val response = api.refresh(RefreshRequest(refreshToken))
            if (response.accessToken != null && response.refreshToken != null) {
                AuthTokenStore.saveTokens(context, response.accessToken, response.refreshToken)
                true
            } else {
                false
            }
        } catch (_: Exception) {
            false
        }
    }

    override fun refreshSync(): Boolean {
        return try {
            kotlinx.coroutines.runBlocking { refresh() }
        } catch (_: Exception) {
            false
        }
    }

    suspend fun changePassword(currentPassword: String, newPassword: String) {
        val token = AuthTokenStore.getAccessToken(context)
            ?: throw IllegalStateException("No auth token")
        api.changePassword("Bearer $token", ChangePasswordRequest(currentPassword, newPassword))
    }

    suspend fun listSessions() = api.listSessions("Bearer ${requireToken()}")

    fun logout() {
        AuthTokenStore.clear(context)
    }

    fun requireToken(): String =
        AuthTokenStore.getAccessToken(context) ?: throw IllegalStateException("No auth token")

    private fun persistTokens(email: String, access: String, refresh: String) {
        AuthTokenStore.saveTokens(context, access, refresh)
        AuthTokenStore.saveEmail(context, email)
    }
}
