package com.agroerp.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.agroerp.data.local.entities.FormEntity
import com.agroerp.data.local.entities.FormSubmissionEntity
import com.agroerp.data.local.entities.LocalEventEntity
import com.agroerp.data.local.entities.MediaFileEntity
import com.agroerp.data.local.entities.ResourceCacheEntity
import com.agroerp.data.local.entities.SessionEntity
import com.agroerp.data.local.entities.SyncQueueEntity
import com.agroerp.data.local.entities.SyncQueueStatus
import com.agroerp.data.local.entities.SyncStateEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface FormDao {
    @Query("SELECT * FROM forms ORDER BY name ASC")
    fun observeAll(): Flow<List<FormEntity>>

    @Query("SELECT * FROM forms WHERE status = 'published' ORDER BY name ASC")
    fun observeActive(): Flow<List<FormEntity>>

    @Query("SELECT * FROM forms ORDER BY name ASC")
    suspend fun getAll(): List<FormEntity>

    @Query("SELECT * FROM forms WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): FormEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(forms: List<FormEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(form: FormEntity)

    @Query("DELETE FROM forms WHERE id NOT IN (:ids)")
    suspend fun deleteNotIn(ids: List<String>)

    @Query("DELETE FROM forms")
    suspend fun deleteAll()
}

@Dao
interface FormSubmissionDao {
    @Query("SELECT * FROM form_submissions WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): FormSubmissionEntity?

    @Query("SELECT * FROM form_submissions ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<FormSubmissionEntity>>

    @Query("SELECT * FROM form_submissions WHERE syncStatus IN ('PENDING', 'FAILED') ORDER BY createdAt ASC")
    suspend fun getPending(): List<FormSubmissionEntity>

    @Query("SELECT COUNT(*) FROM form_submissions WHERE syncStatus IN ('PENDING', 'FAILED', 'SYNCING')")
    fun observePendingCount(): Flow<Int>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: FormSubmissionEntity)

    @Update
    suspend fun update(entity: FormSubmissionEntity)
}

@Dao
interface SyncQueueDao {
    @Query("SELECT * FROM sync_queue WHERE status IN ('PENDING', 'FAILED') AND (nextRetryAt IS NULL OR nextRetryAt <= :now) ORDER BY createdAt ASC")
    suspend fun getReady(now: Long): List<SyncQueueEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: SyncQueueEntity)

    @Update
    suspend fun update(entity: SyncQueueEntity)
}

@Dao
interface SyncStateDao {
    @Query("SELECT * FROM sync_state WHERE id = 1")
    suspend fun get(): SyncStateEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(state: SyncStateEntity)
}

@Dao
interface LocalEventDao {
    @Query("SELECT * FROM local_events ORDER BY createdAt DESC LIMIT :limit")
    fun observeRecent(limit: Int = 50): Flow<List<LocalEventEntity>>

    @Query("SELECT * FROM local_events WHERE syncStatus IN ('PENDING', 'FAILED') ORDER BY createdAt ASC")
    suspend fun getPending(): List<LocalEventEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: LocalEventEntity)

    @Update
    suspend fun update(entity: LocalEventEntity)
}

@Dao
interface MediaFileDao {
    @Query("SELECT * FROM media_files WHERE syncStatus IN ('PENDING', 'FAILED') ORDER BY createdAt ASC")
    suspend fun getPending(): List<MediaFileEntity>

    @Query("SELECT * FROM media_files WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): MediaFileEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: MediaFileEntity)

    @Update
    suspend fun update(entity: MediaFileEntity)
}

@Dao
interface ResourceCacheDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(resources: List<ResourceCacheEntity>)

    @Query("SELECT * FROM resources_cache ORDER BY updatedAt DESC")
    fun observeAll(): Flow<List<ResourceCacheEntity>>
}

@Dao
interface SessionDao {
    @Query("SELECT * FROM session WHERE id = 1")
    suspend fun get(): SessionEntity?

    @Query("SELECT * FROM session WHERE id = 1")
    fun observe(): Flow<SessionEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(session: SessionEntity)

    @Query("DELETE FROM session")
    suspend fun clear()
}
