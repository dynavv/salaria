package com.salaria.app.worker

import android.content.Context
import android.util.Log
import androidx.work.*
import com.salaria.app.data.api.ApiClient
import com.salaria.app.data.local.AppDatabase
import com.salaria.app.data.model.IngestRequest
import com.salaria.app.service.NotificationHelper
import com.salaria.app.util.AppLogger
import java.util.concurrent.TimeUnit

class SyncOfflineTransactionsWorker(
    context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    private val TAG = "SyncOfflineWorker"

    override suspend fun doWork(): Result {
        val database = AppDatabase.getDatabase(applicationContext)
        val dao = database.offlineDao()
        val pendingTransactions = dao.getPendingTransactions()

        if (pendingTransactions.isEmpty()) {
            Log.d(TAG, "No pending offline transactions to sync.")
            return Result.success()
        }

        Log.i(TAG, "Found ${pendingTransactions.size} pending offline transactions. Starting sync...")
        AppLogger.i("SYNC", "Bắt đầu đồng bộ ${pendingTransactions.size} giao dịch lưu offline...")

        var anyFailed = false
        val api = ApiClient.getApi(applicationContext)

        for (tx in pendingTransactions) {
            try {
                val response = api.postTransaction(
                    IngestRequest(
                        text = tx.text,
                        title = tx.title,
                        isNotification = true,
                        source = tx.source
                    )
                )

                if (response.isSuccessful) {
                    val body = response.body()
                    if (body?.data != null) {
                        val result = body.data!!
                        Log.i(TAG, "Synced offline tx ${tx.localId} successfully: ${result.amount}")
                        AppLogger.s("SYNC", "Đồng bộ offline thành công: ${result.amount?.toLong() ?: 0} ₫ • ${result.categoryName ?: ""}")
                        dao.update(tx.copy(status = "synced"))
                        NotificationHelper.showTransactionSuccess(applicationContext, result, tx.text)
                    } else {
                        // Server chủ động bỏ qua (tin quảng cáo hoặc không khớp cú pháp +/- tiền)
                        Log.i(TAG, "Server ignored offline tx ${tx.localId}: ${body?.message}")
                        dao.update(tx.copy(status = "synced"))
                    }
                } else {
                    val code = response.code()
                    Log.w(TAG, "Failed to sync tx ${tx.localId}, server code: $code")
                    if (code in 400..499) {
                        // Lỗi phía client/dữ liệu không hợp lệ -> không retry lặp vô tận
                        dao.update(tx.copy(status = "failed", lastError = "Server code $code"))
                    } else {
                        dao.update(tx.copy(retryCount = tx.retryCount + 1, lastError = "Server code $code"))
                        anyFailed = true
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Network error during sync tx ${tx.localId}: ${e.message}")
                dao.update(tx.copy(retryCount = tx.retryCount + 1, lastError = e.message))
                anyFailed = true
            }
        }

        try {
            dao.clearSynced()
        } catch (e: Exception) {
            Log.w(TAG, "Failed to clear synced items: ${e.message}")
        }

        return if (anyFailed) {
            AppLogger.w("SYNC", "Một số giao dịch offline chưa đồng bộ được, sẽ thử lại sau.")
            Result.retry()
        } else {
            AppLogger.s("SYNC", "Đã đồng bộ toàn bộ giao dịch offline thành công!")
            Result.success()
        }
    }

    companion object {
        const val UNIQUE_WORK_NAME = "SyncOfflineTransactionsWork"

        fun enqueue(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val workRequest = OneTimeWorkRequestBuilder<SyncOfflineTransactionsWorker>()
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build()

            WorkManager.getInstance(context).enqueueUniqueWork(
                UNIQUE_WORK_NAME,
                ExistingWorkPolicy.KEEP,
                workRequest
            )
        }
    }
}
