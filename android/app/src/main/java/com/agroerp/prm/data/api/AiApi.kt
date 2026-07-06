package com.agroerp.prm.data.api

import com.google.gson.annotations.SerializedName
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST

data class AiChatRequest(
    val prompt: String,
    @SerializedName("copilotKey") val copilotKey: String? = null,
    @SerializedName("conversationId") val conversationId: String? = null,
    @SerializedName("useRag") val useRag: Boolean = true,
)

data class AiExplainabilityDto(
    val confidence: Double,
    @SerializedName("modelUsed") val modelUsed: String,
    @SerializedName("providerType") val providerType: String,
    @SerializedName("latencyMs") val latencyMs: Int,
    @SerializedName("ragUsed") val ragUsed: Boolean = false,
)

data class AiChatResponseDto(
    val content: String,
    val explainability: AiExplainabilityDto,
    @SerializedName("conversationId") val conversationId: String? = null,
)

data class AiCopilotDto(
    @SerializedName("copilotKey") val copilotKey: String,
    val name: String,
    val category: String,
)

interface AiApi {
    @POST("eaidsp/chat")
    suspend fun chat(
        @Header("Authorization") token: String,
        @Body body: AiChatRequest,
    ): AiChatResponseDto

    @GET("eaidsp/copilots")
    suspend fun listCopilots(@Header("Authorization") token: String): List<AiCopilotDto>

    @POST("eaidsp/invoke")
    suspend fun quickQuery(
        @Header("Authorization") token: String,
        @Body body: Map<String, String>,
    ): AiChatResponseDto
}
