package com.agroerp.prm.data.api

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

interface EaccApi {
    @GET("eacc/mobile/sync")
    suspend fun mobileSync(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("eacc/checklists")
    suspend fun checklists(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @POST("eacc/checklists/items/{itemKey}/complete")
    suspend fun completeChecklistItem(
        @Header("Authorization") authorization: String,
        @Path("itemKey") itemKey: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("eacc/evidences")
    suspend fun uploadEvidence(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("eacc/audits")
    suspend fun recordAudit(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("eacc/findings")
    suspend fun recordFinding(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("eacc/safety/inspections")
    suspend fun recordSafetyInspection(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("eacc/mobile/batches")
    suspend fun queueBatch(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any>,
    ): Map<String, Any>

    @POST("eacc/mobile/batches/{batchKey}/sync")
    suspend fun syncBatch(
        @Header("Authorization") authorization: String,
        @Path("batchKey") batchKey: String,
    ): Map<String, Any>
}
