package com.agroerp.prm.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.agroerp.prm.AgroErpApp

class FieldLotSyncWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val app = applicationContext as AgroErpApp
        return try {
            app.fieldLotRepository.pullFromServer()
            app.fieldLotRepository.pushPendingSync()
            Result.success()
        } catch (_: Exception) {
            Result.retry()
        }
    }
}
