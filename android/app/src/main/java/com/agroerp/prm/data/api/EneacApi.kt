package com.agroerp.prm.data.api

import com.google.gson.annotations.SerializedName
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

data class EneacNotificationDto(
    val id: String,
    val title: String,
    val body: String? = null,
    @SerializedName("alertSeverity") val alertSeverity: String,
    val status: String,
    @SerializedName("isImportant") val isImportant: Boolean = false,
    @SerializedName("createdAt") val createdAt: String,
)

data class EneacMobileSyncRequest(
    @SerializedName("readIds") val readIds: List<String>? = null,
    @SerializedName("attendIds") val attendIds: List<String>? = null,
)

data class EneacMobileSyncResponse(
    @SerializedName("syncedAt") val syncedAt: String,
    val inbox: List<EneacNotificationDto>,
    @SerializedName("unreadCount") val unreadCount: Int,
)

data class RegisterPushTokenRequest(
    val token: String,
    val platform: String = "android",
    @SerializedName("deviceId") val deviceId: String? = null,
)

interface EneacApi {
    @GET("eneac/inbox")
    suspend fun getInbox(
        @Header("Authorization") token: String,
        @Query("status") status: String? = null,
    ): List<EneacNotificationDto>

    @POST("eneac/sync/mobile")
    suspend fun mobileSync(
        @Header("Authorization") token: String,
        @Body body: EneacMobileSyncRequest,
    ): EneacMobileSyncResponse

    @PATCH("eneac/inbox/{id}/read")
    suspend fun markRead(
        @Header("Authorization") token: String,
        @Path("id") id: String,
    ): EneacNotificationDto

    @POST("eneac/inbox/{id}/attend")
    suspend fun attend(
        @Header("Authorization") token: String,
        @Path("id") id: String,
    ): EneacNotificationDto

    @POST("eneac/devices/register")
    suspend fun registerToken(
        @Header("Authorization") token: String,
        @Body body: RegisterPushTokenRequest,
    ): Map<String, Any>
}
