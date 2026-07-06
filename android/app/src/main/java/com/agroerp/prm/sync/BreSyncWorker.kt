package com.agroerp.prm.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.agroerp.prm.data.repository.BreRepository

class BreSyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        return try {
            BreRepository(applicationContext).syncOffline()
            Result.success()
        } catch (_: Exception) {
            Result.retry()
        }
    }
}
