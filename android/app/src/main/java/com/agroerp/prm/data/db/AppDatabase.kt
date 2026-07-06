package com.agroerp.prm.data.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [ProducerEntity::class, SyncQueueEntity::class, FarmEntity::class, FieldLotEntity::class],
    version = 3,
    exportSchema = false,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun producerDao(): ProducerDao
    abstract fun syncQueueDao(): SyncQueueDao
    abstract fun farmDao(): FarmDao
    abstract fun fieldLotDao(): FieldLotDao

    companion object {
        @Volatile private var instance: AppDatabase? = null

        private val MIGRATION_1_2 = object : androidx.room.migration.Migration(1, 2) {
            override fun migrate(db: androidx.sqlite.db.SupportSQLiteDatabase) {
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS farms (
                        id TEXT NOT NULL PRIMARY KEY,
                        externalId TEXT,
                        farmCode TEXT NOT NULL,
                        farmName TEXT NOT NULL,
                        farmTypeCode TEXT NOT NULL,
                        municipalityCode TEXT,
                        veredaCode TEXT,
                        latitude REAL,
                        longitude REAL,
                        totalAreaHa REAL,
                        status TEXT NOT NULL,
                        photoPath TEXT,
                        videoPath TEXT,
                        signaturePath TEXT,
                        boundaryGeoJson TEXT,
                        observations TEXT,
                        version INTEGER NOT NULL,
                        syncStatus TEXT NOT NULL,
                        updatedAt INTEGER NOT NULL,
                        payloadJson TEXT NOT NULL
                    )
                    """.trimIndent(),
                )
                db.execSQL("ALTER TABLE sync_queue ADD COLUMN entityType TEXT NOT NULL DEFAULT 'producer'")
            }
        }

        private val MIGRATION_2_3 = object : androidx.room.migration.Migration(2, 3) {
            override fun migrate(db: androidx.sqlite.db.SupportSQLiteDatabase) {
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS field_lots (
                        id TEXT NOT NULL PRIMARY KEY,
                        externalId TEXT,
                        ftipLotUnitId TEXT NOT NULL,
                        farmUnitId TEXT NOT NULL,
                        lotCode TEXT NOT NULL,
                        lotName TEXT NOT NULL,
                        lotTypeCode TEXT NOT NULL,
                        primaryCropCode TEXT,
                        latitude REAL,
                        longitude REAL,
                        totalAreaHa REAL,
                        plantedAreaHa REAL,
                        status TEXT NOT NULL,
                        photoPath TEXT,
                        videoPath TEXT,
                        signaturePath TEXT,
                        boundaryGeoJson TEXT,
                        observations TEXT,
                        version INTEGER NOT NULL,
                        syncStatus TEXT NOT NULL,
                        updatedAt INTEGER NOT NULL,
                        payloadJson TEXT NOT NULL
                    )
                    """.trimIndent(),
                )
            }
        }

        fun getInstance(context: Context): AppDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "agroerp_prm.db",
                )
                    .addMigrations(MIGRATION_1_2, MIGRATION_2_3)
                    .build().also { instance = it }
            }
    }
}
