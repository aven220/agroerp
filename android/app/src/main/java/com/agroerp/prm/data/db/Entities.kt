package com.agroerp.prm.data.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "producers")
data class ProducerEntity(
    @PrimaryKey val id: String,
    val externalId: String?,
    val producerNumber: String,
    val producerTypeCode: String,
    val legalName: String,
    val documentTypeCode: String,
    val documentNumber: String,
    val municipalityCode: String?,
    val veredaCode: String?,
    val latitude: Double?,
    val longitude: Double?,
    val lifecycleStatus: String,
    val categoryCode: String?,
    val qualityScore: Int,
    val photoPath: String?,
    val signaturePath: String?,
    val notes: String?,
    val version: Int,
    val syncStatus: String,
    val updatedAt: Long,
    val payloadJson: String,
)

@Entity(tableName = "sync_queue")
data class SyncQueueEntity(
    @PrimaryKey(autoGenerate = true) val queueId: Long = 0,
    val externalId: String,
    val entityType: String = "producer",
    val operation: String,
    val payloadJson: String,
    val status: String,
    val retryCount: Int = 0,
    val createdAt: Long,
    val lastError: String? = null,
)

@Entity(tableName = "farms")
data class FarmEntity(
    @PrimaryKey val id: String,
    val externalId: String?,
    val farmCode: String,
    val farmName: String,
    val farmTypeCode: String,
    val municipalityCode: String?,
    val veredaCode: String?,
    val latitude: Double?,
    val longitude: Double?,
    val totalAreaHa: Double?,
    val status: String,
    val photoPath: String?,
    val videoPath: String?,
    val signaturePath: String?,
    val boundaryGeoJson: String?,
    val observations: String?,
    val version: Int,
    val syncStatus: String,
    val updatedAt: Long,
    val payloadJson: String,
)

@Entity(tableName = "field_lots")
data class FieldLotEntity(
    @PrimaryKey val id: String,
    val externalId: String?,
    val ftipLotUnitId: String,
    val farmUnitId: String,
    val lotCode: String,
    val lotName: String,
    val lotTypeCode: String,
    val primaryCropCode: String?,
    val latitude: Double?,
    val longitude: Double?,
    val totalAreaHa: Double?,
    val plantedAreaHa: Double?,
    val status: String,
    val photoPath: String?,
    val videoPath: String?,
    val signaturePath: String?,
    val boundaryGeoJson: String?,
    val observations: String?,
    val version: Int,
    val syncStatus: String,
    val updatedAt: Long,
    val payloadJson: String,
)
