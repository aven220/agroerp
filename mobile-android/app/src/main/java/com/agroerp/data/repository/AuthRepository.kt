package com.agroerp.data.repository

import com.agroerp.core.network.NetworkMonitor
import com.agroerp.core.security.TokenManager
import com.agroerp.core.util.JsonHelper
import com.agroerp.data.api.AgroErpApi
import com.agroerp.data.local.dao.SessionDao
import com.agroerp.data.local.entities.SessionEntity
import com.agroerp.data.mapper.FormMappers.toDomain
import com.agroerp.domain.model.UserSession
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

sealed class AuthResult {
    data class Success(val session: UserSession) : AuthResult()
    data class Error(val message: String) : AuthResult()
}

@Singleton
class AuthRepository @Inject constructor(
    private val api: AgroErpApi,
    private val tokenManager: TokenManager,
    private val sessionDao: SessionDao,
    private val networkMonitor: NetworkMonitor,
) {

    val sessionFlow: Flow<UserSession?> = sessionDao.observe().map { entity ->
        entity?.let {
            UserSession(
                userId = it.userId,
                email = it.email,
                firstName = it.firstName,
                lastName = it.lastName,
                organizationId = it.organizationId,
                organizationName = it.organizationName,
                roles = JsonHelper.fromJson(it.rolesJson),
                accessToken = tokenManager.getAccessToken() ?: "",
                refreshToken = tokenManager.getRefreshToken() ?: "",
            )
        }
    }

    suspend fun hasLocalSession(): Boolean =
        tokenManager.hasSession() && sessionDao.get() != null

    suspend fun login(email: String, password: String): AuthResult {
        if (!networkMonitor.isOnline) {
            return AuthResult.Error("Se requiere conexión para iniciar sesión")
        }
        return try {
            val response = api.login(
                com.agroerp.data.api.LoginRequest(email, password),
            )
            if (!response.isSuccessful || response.body() == null) {
                return AuthResult.Error("Credenciales inválidas")
            }
            val body = response.body()!!
            saveSession(body)
            AuthResult.Success(buildUserSession(body))
        } catch (e: Exception) {
            AuthResult.Error(e.message ?: "Error de conexión")
        }
    }

    suspend fun refreshTokenIfNeeded(): Boolean {
        if (!networkMonitor.isOnline) return tokenManager.hasSession()
        val refresh = tokenManager.getRefreshToken() ?: return false
        return try {
            val response = api.refresh(com.agroerp.data.api.RefreshRequest(refresh))
            if (!response.isSuccessful || response.body() == null) return false
            saveSession(response.body()!!)
            true
        } catch (_: Exception) {
            false
        }
    }

    suspend fun logout() {
        tokenManager.clear()
        sessionDao.clear()
    }

    private suspend fun saveSession(body: com.agroerp.data.api.AuthResponse) {
        tokenManager.saveTokens(body.accessToken, body.refreshToken)
        val profile = try {
            api.getProfile().body()
        } catch (_: Exception) {
            null
        }
        sessionDao.upsert(
            SessionEntity(
                userId = body.user.id,
                email = body.user.email,
                firstName = body.user.firstName,
                lastName = body.user.lastName,
                organizationId = body.user.organizationId,
                organizationName = profile?.organization?.name ?: "Organization",
                rolesJson = JsonHelper.toJson(body.user.roles),
                loggedInAt = System.currentTimeMillis(),
            ),
        )
    }

    private fun buildUserSession(body: com.agroerp.data.api.AuthResponse): UserSession =
        UserSession(
            userId = body.user.id,
            email = body.user.email,
            firstName = body.user.firstName,
            lastName = body.user.lastName,
            organizationId = body.user.organizationId,
            organizationName = "",
            roles = body.user.roles,
            accessToken = body.accessToken,
            refreshToken = body.refreshToken,
        )
}
