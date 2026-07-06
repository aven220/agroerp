package com.agroerp.prm.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.agroerp.prm.AgroErpApp

class FarmSyncWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val app = applicationContext as AgroErpApp
        return try {
            app.farmRepository.pullFromServer()
            app.farmRepository.pushPendingSync()
            Result.success()
        } catch (_: Exception) {
            Result.retry()
        }
    }
}
