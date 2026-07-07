package com.agroerp.data.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface AgroErpApi {
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @POST("auth/refresh")
    suspend fun refresh(@Body request: RefreshRequest): Response<AuthResponse>

    @GET("auth/me")
    suspend fun getProfile(): Response<UserProfileResponse>

    @POST("files/register")
    suspend fun registerFile(@Body request: RegisterFileRequest): Response<FileResourceResponse>

    @GET("sync/pull")
    suspend fun pullEvents(
        @Query("cursor") cursor: String,
        @Query("limit") limit: Int = 500,
    ): Response<SyncPullResponse>

    @GET("sync/status")
    suspend fun syncStatus(): Response<SyncStatusResponse>
}

data class LoginRequest(val email: String, val password: String)
data class RefreshRequest(val refreshToken: String)

data class AuthResponse(
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: String,
    val user: UserDto,
)

data class UserDto(
    val id: String,
    val email: String,
    val firstName: String,
    val lastName: String,
    val organizationId: String,
    val roles: List<String>,
)

data class UserProfileResponse(
    val id: String,
    val email: String,
    val firstName: String,
    val lastName: String,
    val organization: OrganizationDto,
    val roles: List<RoleDto>,
)

data class OrganizationDto(val id: String, val name: String, val slug: String)
data class RoleDto(val id: String, val name: String, val slug: String)

data class FormDto(
    val id: String,
    val formKey: String,
    val name: String,
    val description: String?,
    val version: Int,
    val status: String? = "published",
    val schema: Map<String, Any?>,
    val publishedAt: String?,
)

data class RegisterFileRequest(
    val filename: String,
    val mimeType: String,
    val sizeBytes: Long,
    val storageKey: String? = null,
    val metadata: Map<String, Any?>? = null,
)

data class FileResourceResponse(val id: String)

data class SyncPullResponse(
    val events: List<SyncEventDto>,
    val nextCursor: String,
    val hasMore: Boolean,
)

data class SyncEventDto(
    val id: String,
    val eventType: String,
    val aggregateType: String,
    val aggregateId: String,
    val payload: Map<String, Any?>,
    val globalSequence: String,
)

data class SyncStatusResponse(
    val pending: Int,
    val processed: Int,
    val failed: Int,
    val lastGlobalSequence: String,
)
