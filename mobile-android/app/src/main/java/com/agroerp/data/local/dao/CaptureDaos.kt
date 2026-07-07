package com.agroerp.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.agroerp.data.local.entities.CapturePackageEntity
import com.agroerp.data.local.entities.CatalogEntity
import com.agroerp.data.local.entities.DynamicFormEntity
import com.agroerp.data.local.entities.MediaPendingEntity
import com.agroerp.data.local.entities.SubmissionQueueEntity
import com.agroerp.data.local.entities.SyncQueueStatus
import kotlinx.coroutines.flow.Flow

@Dao
interface CapturePackageDao {
    @Query("SELECT * FROM capture_packages WHERE id = 1 LIMIT 1")
    suspend fun get(): CapturePackageEntity?

    @Query("SELECT * FROM capture_packages WHERE id = 1 LIMIT 1")
    fun observe(): Flow<CapturePackageEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: CapturePackageEntity)
}

@Dao
interface DynamicFormDao {
    @Query("SELECT * FROM dynamic_forms ORDER BY formKey ASC")
    fun observeAll(): Flow<List<DynamicFormEntity>>

    @Query("SELECT * FROM dynamic_forms ORDER BY formKey ASC")
    suspend fun getAll(): List<DynamicFormEntity>

    @Query("SELECT * FROM dynamic_forms WHERE formId = :formId LIMIT 1")
    suspend fun getByFormId(formId: String): DynamicFormEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(forms: List<DynamicFormEntity>)

    @Query("DELETE FROM dynamic_forms WHERE formId NOT IN (:ids)")
    suspend fun deleteNotIn(ids: List<String>)

    @Query("DELETE FROM dynamic_forms")
    suspend fun deleteAll()
}

@Dao
interface CatalogDao {
    @Query("SELECT * FROM capture_catalogs ORDER BY label ASC")
    suspend fun getAll(): List<CatalogEntity>

    @Query("SELECT * FROM capture_catalogs WHERE catalogKey = :key LIMIT 1")
    suspend fun getByKey(key: String): CatalogEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(catalogs: List<CatalogEntity>)

    @Query("DELETE FROM capture_catalogs WHERE catalogKey NOT IN (:keys)")
    suspend fun deleteNotIn(keys: List<String>)
}

@Dao
interface SubmissionQueueDao {
    @Query("SELECT * FROM submission_queue WHERE status IN ('PENDING', 'FAILED') ORDER BY enqueuedAt ASC")
    suspend fun getPending(): List<SubmissionQueueEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(items: List<SubmissionQueueEntity>)

    @Update
    suspend fun update(item: SubmissionQueueEntity)

    @Query("DELETE FROM submission_queue WHERE status = 'SYNCED'")
    suspend fun deleteSynced()
}

@Dao
interface MediaPendingDao {
    @Query("SELECT * FROM media_pending WHERE syncStatus IN ('PENDING', 'FAILED') ORDER BY createdAt ASC")
    suspend fun getPending(): List<MediaPendingEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(items: List<MediaPendingEntity>)

    @Update
    suspend fun update(item: MediaPendingEntity)

    @Query("DELETE FROM media_pending WHERE syncStatus = 'SYNCED'")
    suspend fun deleteSynced()
}
