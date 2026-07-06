package com.agroerp.core.di

import android.content.Context
import androidx.room.Room
import com.agroerp.core.database.AppDatabase
import com.agroerp.data.local.dao.FormDao
import com.agroerp.data.local.dao.FormSubmissionDao
import com.agroerp.data.local.dao.LocalEventDao
import com.agroerp.data.local.dao.MediaFileDao
import com.agroerp.data.local.dao.ResourceCacheDao
import com.agroerp.data.local.dao.SessionDao
import com.agroerp.data.local.dao.SyncQueueDao
import com.agroerp.data.local.dao.SyncStateDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "agroerp_field.db")
            .fallbackToDestructiveMigration()
            .build()

    @Provides fun provideFormDao(db: AppDatabase): FormDao = db.formDao()
    @Provides fun provideFormSubmissionDao(db: AppDatabase): FormSubmissionDao = db.formSubmissionDao()
    @Provides fun provideSyncQueueDao(db: AppDatabase): SyncQueueDao = db.syncQueueDao()
    @Provides fun provideSyncStateDao(db: AppDatabase): SyncStateDao = db.syncStateDao()
    @Provides fun provideLocalEventDao(db: AppDatabase): LocalEventDao = db.localEventDao()
    @Provides fun provideMediaFileDao(db: AppDatabase): MediaFileDao = db.mediaFileDao()
    @Provides fun provideResourceCacheDao(db: AppDatabase): ResourceCacheDao = db.resourceCacheDao()
    @Provides fun provideSessionDao(db: AppDatabase): SessionDao = db.sessionDao()
}
