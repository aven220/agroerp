package com.agroerp.data.repository

import com.agroerp.core.util.JsonHelper
import com.agroerp.data.local.dao.MediaFileDao
import com.agroerp.data.local.entities.MediaFileEntity
import com.agroerp.data.local.entities.SyncQueueStatus
import com.agroerp.data.mapper.FormMappers.toDomain
import com.agroerp.domain.model.GpsPoint
import com.agroerp.domain.model.MediaFile
import com.agroerp.media.MediaCaptureManager
import com.agroerp.media.MediaCompressor
import com.agroerp.sync.LocalEventService
import com.agroerp.sync.OutboxManager
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.io.File
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MediaRepository @Inject constructor(
    private val mediaFileDao: MediaFileDao,
    private val mediaCaptureManager: MediaCaptureManager,
    private val mediaCompressor: MediaCompressor,
    private val localEventService: LocalEventService,
    private val outboxManager: OutboxManager,
) {

    suspend fun registerCapturedFile(
        file: File,
        mimeType: String,
        mediaType: String,
        fieldKey: String?,
        submissionExternalId: String?,
        gps: GpsPoint? = null,
    ): MediaFile {
        val compressed = when (mediaType) {
            "photo", "signature" -> mediaCompressor.compressImage(file)
            else -> file
        }
        val id = UUID.randomUUID().toString()
        val entity = MediaFileEntity(
            id = id,
            localPath = compressed.absolutePath,
            mimeType = mimeType,
            filename = compressed.name,
            sizeBytes = compressed.length(),
            mediaType = mediaType,
            fieldKey = fieldKey,
            submissionExternalId = submissionExternalId,
            serverResourceId = null,
            gpsLocationJson = gps?.let { JsonHelper.toJson(it) },
            syncStatus = SyncQueueStatus.PENDING,
            createdAt = System.currentTimeMillis(),
        )
        mediaFileDao.insert(entity)
        localEventService.recordMediaCaptured(id, mediaType, fieldKey)
        outboxManager.enqueueMedia(id)
        return entity.toDomain()
    }

    fun createPhotoFile(): File = mediaCaptureManager.createPhotoFile()
    fun createVideoFile(): File = mediaCaptureManager.createVideoFile()
    fun createAudioFile(): File = mediaCaptureManager.createAudioFile()
    fun createSignatureFile(): File = mediaCaptureManager.createSignatureFile()

    suspend fun getPending(): List<MediaFileEntity> = mediaFileDao.getPending()

    suspend fun updateEntity(entity: MediaFileEntity) = mediaFileDao.update(entity)

    suspend fun getById(id: String): MediaFileEntity? = mediaFileDao.getById(id)
}
