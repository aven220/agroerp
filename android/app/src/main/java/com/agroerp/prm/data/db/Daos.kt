package com.agroerp.prm.data.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface ProducerDao {
    @Query("SELECT * FROM producers ORDER BY legalName ASC")
    fun observeAll(): Flow<List<ProducerEntity>>

    @Query("SELECT * FROM producers WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): ProducerEntity?

    @Query("SELECT * FROM producers WHERE externalId = :externalId LIMIT 1")
    suspend fun getByExternalId(externalId: String): ProducerEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(items: List<ProducerEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(item: ProducerEntity)

    @Query("SELECT * FROM producers WHERE syncStatus = 'pending'")
    suspend fun getPendingSync(): List<ProducerEntity>

    @Query("DELETE FROM producers")
    suspend fun clearAll()
}

@Dao
interface SyncQueueDao {
    @Query("SELECT * FROM sync_queue WHERE status = 'pending' AND entityType = :entityType ORDER BY createdAt ASC")
    suspend fun getPending(entityType: String): List<SyncQueueEntity>

    @Query("SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY createdAt ASC")
    suspend fun getPending(): List<SyncQueueEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun enqueue(item: SyncQueueEntity): Long

    @Update
    suspend fun update(item: SyncQueueEntity)

    @Query("DELETE FROM sync_queue WHERE status = 'processed'")
    suspend fun purgeProcessed()
}

@Dao
interface FarmDao {
    @Query("SELECT * FROM farms ORDER BY farmName ASC")
    fun observeAll(): Flow<List<FarmEntity>>

    @Query("SELECT * FROM farms WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): FarmEntity?

    @Query("SELECT * FROM farms WHERE externalId = :externalId LIMIT 1")
    suspend fun getByExternalId(externalId: String): FarmEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(items: List<FarmEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(item: FarmEntity)

    @Query("SELECT * FROM farms WHERE syncStatus = 'pending'")
    suspend fun getPendingSync(): List<FarmEntity>
}

@Dao
interface FieldLotDao {
    @Query("SELECT * FROM field_lots ORDER BY lotName ASC")
    fun observeAll(): Flow<List<FieldLotEntity>>

    @Query("SELECT * FROM field_lots WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): FieldLotEntity?

    @Query("SELECT * FROM field_lots WHERE externalId = :externalId LIMIT 1")
    suspend fun getByExternalId(externalId: String): FieldLotEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(items: List<FieldLotEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(item: FieldLotEntity)

    @Query("SELECT * FROM field_lots WHERE syncStatus = 'pending'")
    suspend fun getPendingSync(): List<FieldLotEntity>
}
