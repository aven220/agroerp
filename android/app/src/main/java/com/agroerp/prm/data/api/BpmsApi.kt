package com.agroerp.prm.data.api

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

interface BpmsApi {
    @GET("bpms/mobile/sync")
    suspend fun mobileSync(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("bpms/tasks/inbox")
    suspend fun inbox(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @POST("bpms/tasks/{taskKey}/complete")
    suspend fun completeTask(
        @Header("Authorization") authorization: String,
        @Path("taskKey") taskKey: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("bpms/tasks/{taskKey}/delegate")
    suspend fun delegateTask(
        @Header("Authorization") authorization: String,
        @Path("taskKey") taskKey: String,
        @Body body: Map<String, String>,
    ): Map<String, Any>

    @POST("bpms/tasks/{taskKey}/attachments")
    suspend fun attachEvidence(
        @Header("Authorization") authorization: String,
        @Path("taskKey") taskKey: String,
        @Body body: Map<String, String>,
    ): Map<String, Any>

    @POST("bpms/offline/batches")
    suspend fun queueOffline(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("bpms/offline/batches/{batchKey}/sync")
    suspend fun syncOffline(
        @Header("Authorization") authorization: String,
        @Path("batchKey") batchKey: String,
        @Body body: Map<String, String> = emptyMap(),
    ): Map<String, Any>
}
