package com.agroerp.core.database

import androidx.room.Database
import androidx.room.RoomDatabase
import com.agroerp.data.local.dao.CapturePackageDao
import com.agroerp.data.local.dao.CatalogDao
import com.agroerp.data.local.dao.DynamicFormDao
import com.agroerp.data.local.dao.FormDao
import com.agroerp.data.local.dao.FormSubmissionDao
import com.agroerp.data.local.dao.LocalEventDao
import com.agroerp.data.local.dao.MediaFileDao
import com.agroerp.data.local.dao.MediaPendingDao
import com.agroerp.data.local.dao.ResourceCacheDao
import com.agroerp.data.local.dao.SessionDao
import com.agroerp.data.local.dao.SubmissionQueueDao
import com.agroerp.data.local.dao.SyncQueueDao
import com.agroerp.data.local.dao.SyncStateDao
import com.agroerp.data.local.entities.CapturePackageEntity
import com.agroerp.data.local.entities.CatalogEntity
import com.agroerp.data.local.entities.DynamicFormEntity
import com.agroerp.data.local.entities.FormEntity
import com.agroerp.data.local.entities.FormSubmissionEntity
import com.agroerp.data.local.entities.LocalEventEntity
import com.agroerp.data.local.entities.MediaFileEntity
import com.agroerp.data.local.entities.MediaPendingEntity
import com.agroerp.data.local.entities.ResourceCacheEntity
import com.agroerp.data.local.entities.SessionEntity
import com.agroerp.data.local.entities.SubmissionQueueEntity
import com.agroerp.data.local.entities.SyncQueueEntity
import com.agroerp.data.local.entities.SyncStateEntity

@Database(
    entities = [
        FormEntity::class,
        FormSubmissionEntity::class,
        SyncQueueEntity::class,
        SyncStateEntity::class,
        LocalEventEntity::class,
        MediaFileEntity::class,
        ResourceCacheEntity::class,
        SessionEntity::class,
        CapturePackageEntity::class,
        DynamicFormEntity::class,
        CatalogEntity::class,
        SubmissionQueueEntity::class,
        MediaPendingEntity::class,
    ],
    version = 3,
    exportSchema = false,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun formDao(): FormDao
    abstract fun formSubmissionDao(): FormSubmissionDao
    abstract fun syncQueueDao(): SyncQueueDao
    abstract fun syncStateDao(): SyncStateDao
    abstract fun localEventDao(): LocalEventDao
    abstract fun mediaFileDao(): MediaFileDao
    abstract fun resourceCacheDao(): ResourceCacheDao
    abstract fun sessionDao(): SessionDao
    abstract fun capturePackageDao(): CapturePackageDao
    abstract fun dynamicFormDao(): DynamicFormDao
    abstract fun catalogDao(): CatalogDao
    abstract fun submissionQueueDao(): SubmissionQueueDao
    abstract fun mediaPendingDao(): MediaPendingDao
}
