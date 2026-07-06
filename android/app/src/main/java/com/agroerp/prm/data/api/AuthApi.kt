package com.agroerp.prm.data.api

import com.google.gson.annotations.SerializedName
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST

data class LoginRequest(
    val email: String,
    val password: String,
)

data class MfaCompleteRequest(
    @SerializedName("mfaToken") val mfaToken: String,
    val code: String,
)

data class RefreshRequest(
    @SerializedName("refreshToken") val refreshToken: String,
)

data class AuthUserDto(
    val id: String,
    val email: String,
    @SerializedName("firstName") val firstName: String,
    @SerializedName("lastName") val lastName: String,
    @SerializedName("organizationId") val organizationId: String,
    val roles: List<String>,
    val permissions: List<String>? = null,
)

data class LoginResponse(
    @SerializedName("accessToken") val accessToken: String? = null,
    @SerializedName("refreshToken") val refreshToken: String? = null,
    @SerializedName("mfaRequired") val mfaRequired: Boolean = false,
    @SerializedName("mfaToken") val mfaToken: String? = null,
    @SerializedName("mustChangePassword") val mustChangePassword: Boolean = false,
    val user: AuthUserDto? = null,
)

data class ChangePasswordRequest(
    @SerializedName("currentPassword") val currentPassword: String,
    @SerializedName("newPassword") val newPassword: String,
)

data class SessionDto(
    val id: String,
    val status: String,
    @SerializedName("ipAddress") val ipAddress: String?,
    @SerializedName("userAgent") val userAgent: String?,
    @SerializedName("createdAt") val createdAt: String,
)

interface AuthApi {
    @POST("auth/login")
    suspend fun login(
        @Header("X-Device-Id") deviceId: String,
        @Body body: LoginRequest,
    ): LoginResponse

    @POST("auth/login/mfa")
    suspend fun completeMfa(
        @Header("X-Device-Id") deviceId: String,
        @Body body: MfaCompleteRequest,
    ): LoginResponse

    @POST("auth/refresh")
    suspend fun refresh(@Body body: RefreshRequest): LoginResponse

    @GET("auth/me")
    suspend fun me(@Header("Authorization") authorization: String): AuthUserDto

    @POST("eiamp/change-password")
    suspend fun changePassword(
        @Header("Authorization") authorization: String,
        @Body body: ChangePasswordRequest,
    ): Map<String, Any>

    @GET("eiamp/sessions")
    suspend fun listSessions(@Header("Authorization") authorization: String): List<SessionDto>
}
