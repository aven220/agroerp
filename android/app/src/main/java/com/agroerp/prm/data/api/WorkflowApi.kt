package com.agroerp.prm.data.api

import com.google.gson.annotations.SerializedName
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

data class WorkflowTransitionRequest(
    @SerializedName("transitionKey") val transitionKey: String,
    val comment: String? = null,
    val variables: Map<String, Any>? = null,
    @SerializedName("gpsLocation") val gpsLocation: Map<String, Any>? = null,
    @SerializedName("instanceId") val instanceId: String? = null,
    @SerializedName("externalId") val externalId: String? = null,
)

data class WorkflowSyncRequest(
    val transitions: List<WorkflowTransitionRequest>,
)

data class WorkflowSyncResult(
    @SerializedName("instanceId") val instanceId: String? = null,
    val success: Boolean,
    val error: String? = null,
)

data class WorkflowSyncResponse(
    val results: List<WorkflowSyncResult>,
)

data class WorkflowAssignmentDto(
    val id: String,
    @SerializedName("stateKey") val stateKey: String,
    @SerializedName("transitionKey") val transitionKey: String? = null,
    val status: String,
    @SerializedName("dueAt") val dueAt: String? = null,
    val instance: WorkflowInstanceSummary? = null,
)

data class WorkflowInstanceSummary(
    val id: String,
    @SerializedName("currentState") val currentState: String,
    val status: String,
    @SerializedName("workflowDefinition") val workflowDefinition: WorkflowDefinitionSummary? = null,
)

data class WorkflowDefinitionSummary(
    @SerializedName("workflowKey") val workflowKey: String,
    val name: String,
)

data class WorkflowBootstrapItem(
    val definition: Map<String, Any>,
    val version: Map<String, Any>,
)

interface WorkflowApi {
    @GET("workflows/instances/inbox")
    suspend fun getInbox(@Header("Authorization") token: String): List<WorkflowAssignmentDto>

    @POST("workflows/instances/sync/transitions")
    suspend fun syncTransitions(
        @Header("Authorization") token: String,
        @Body body: WorkflowSyncRequest,
    ): WorkflowSyncResponse

    @POST("workflows/instances/{id}/transitions")
    suspend fun executeTransition(
        @Header("Authorization") token: String,
        @Path("id") instanceId: String,
        @Body body: WorkflowTransitionRequest,
    ): Map<String, Any>

    @GET("workflows/definitions/bootstrap")
    suspend fun bootstrap(@Header("Authorization") token: String): Map<String, Any>
}
