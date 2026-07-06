package com.agroerp.sync

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject

@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val syncEngine: SyncEngine,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val syncResult = syncEngine.syncAll()
        return if (syncResult.isSuccess) {
            Result.success()
        } else {
            if (runAttemptCount < 5) Result.retry() else Result.failure()
        }
    }
}
