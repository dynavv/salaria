package com.salaria.app.worker

import android.content.Context
import android.util.Log
import androidx.work.*
import com.salaria.app.data.api.ApiClient
import com.salaria.app.data.model.DailySummaryDto
import com.salaria.app.data.model.PaycheckCycleHelper
import com.salaria.app.data.local.PreferencesManager
import com.salaria.app.service.NotificationHelper
import com.salaria.app.util.AppLogger
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit
import kotlin.math.max
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class DailySummaryWorker(
    context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    companion object {
        const val WORK_NAME = "SalariaDailySummaryWork"

        fun schedule(context: Context) {
            val now = Calendar.getInstance()
            val target = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, 22)
                set(Calendar.MINUTE, 30)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }

            if (now.after(target)) {
                target.add(Calendar.DAY_OF_MONTH, 1)
            }

            val initialDelayMs = target.timeInMillis - now.timeInMillis

            val dailyWorkRequest = OneTimeWorkRequestBuilder<DailySummaryWorker>()
                .setInitialDelay(initialDelayMs, TimeUnit.MILLISECONDS)
                .addTag(WORK_NAME)
                .build()

            WorkManager.getInstance(context).enqueueUniqueWork(
                WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                dailyWorkRequest
            )
            Log.i("DailySummaryWorker", "Scheduled next daily digest in ${initialDelayMs / 1000 / 60} minutes")
        }
    }

    override suspend fun doWork(): Result {
        Log.i("DailySummaryWorker", "Executing daily spending digest...")
        AppLogger.i("DIGEST", "Bắt đầu tính toán tổng kết chi tiêu 22h30...")

        try {
            val api = ApiClient.getApi(applicationContext)
            val todayIso = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val dateDisplay = SimpleDateFormat("dd/MM", Locale.getDefault()).format(Date())

            // 1. Lấy giao dịch trong ngày hôm nay
            val txRes = api.getTransactions(limit = 100, startDate = todayIso, endDate = todayIso)
            val todayTxs = txRes.body()?.data ?: emptyList()
            val todayExpense = todayTxs.filter { it.type == "expense" }.sumOf { it.amount }

            // 2. Lấy thông tin chu kỳ lương và phân tích tháng để tính hạn mức an toàn (Mô hình 3 ngăn)
            val cycle = PaycheckCycleHelper.calculateCycle()
            val analyticsRes = api.getMonthlyAnalytics(startDate = cycle.startDate, endDate = cycle.endDate)
            val monthlyData = analyticsRes.body()?.data

            val totalExpense = monthlyData?.totalExpense ?: todayExpense
            val totalIncome = monthlyData?.totalIncome ?: 0.0
            val budget = if (totalIncome > 0.0) totalIncome else 15_000_000.0
            val daysRemaining = max(1, cycle.daysUntilNextPaycheck)

            val paidHousing = monthlyData?.categories?.find { it.categoryId == "cat_housing" }?.amount ?: 0.0
            val prefs = PreferencesManager(applicationContext)
            val savingsGoal = prefs.getSavingsGoalBlocking()
            val housingBudget = prefs.getHousingBudgetBlocking()

            val safeToSpend = PaycheckCycleHelper.calculateThreeBucketSafeToSpend(
                baseBudget = budget,
                savingsGoal = savingsGoal,
                housingBudget = housingBudget,
                paidHousing = paidHousing,
                totalExpense = totalExpense,
                daysRemaining = daysRemaining
            )

            var statusNote = if (todayExpense <= safeToSpend) {
                "Chi tiêu an toàn, bạn đang kiểm soát ngân sách rất tốt! ✨"
            } else {
                "Chi tiêu hôm nay hơi cao so với hạn mức, ngày mai cân đối nhé! ⚠️"
            }

            var summaryDto = DailySummaryDto(
                id = "sum_${todayIso.replace("-", "")}",
                date = todayIso,
                todayExpense = todayExpense,
                safeToSpend = safeToSpend,
                daysRemaining = daysRemaining,
                statusNote = null,
                generateAi = true
            )

            // 3. Đồng bộ hóa bản tin tổng kết lên Cloudflare D1 và nhận lời nhắc AI [P2-01]
            try {
                val postRes = api.postDailySummary(summaryDto)
                if (postRes.isSuccessful && postRes.body()?.data != null) {
                    val resData = postRes.body()!!.data!!
                    if (!resData.statusNote.isNullOrBlank()) {
                        statusNote = resData.statusNote
                    }
                    summaryDto = resData
                    AppLogger.s("DIGEST", "Đã đồng bộ tổng kết ngày $todayIso lên Cloudflare D1 thành công (AI: $statusNote)")
                } else {
                    summaryDto = summaryDto.copy(statusNote = statusNote)
                    AppLogger.w("DIGEST", "Đồng bộ D1 trả về HTTP: ${postRes.code()}")
                }
            } catch (cloudErr: Exception) {
                summaryDto = summaryDto.copy(statusNote = statusNote)
                Log.w("DailySummaryWorker", "Không thể đồng bộ tổng kết ngày lên Cloud: ${cloudErr.message}")
                AppLogger.w("DIGEST", "Lỗi mạng đồng bộ D1: ${cloudErr.message}")
            }

            // 4. Cập nhật trực tiếp vào bộ nhớ RAM của ChatManager để sẵn sàng hiển thị (0ms latency)
            try {
                withContext(Dispatchers.Main) {
                    com.salaria.app.data.model.ChatManager.addOrUpdateDailySummary(summaryDto)
                }
            } catch (ramErr: Exception) {
                Log.w("DailySummaryWorker", "Không thể cập nhật ChatManager RAM: ${ramErr.message}")
            }

            // 5. Bắn thông báo tổng kết hệ thống Android với lời nhắc đã được cá nhân hóa
            NotificationHelper.showDailySummary(
                context = applicationContext,
                todayExpense = todayExpense,
                safeToSpendPerDay = safeToSpend,
                daysRemaining = daysRemaining,
                statusNote = statusNote,
                dateDisplay = dateDisplay
            )

            AppLogger.s("DIGEST", "Đã gửi thông báo tổng kết ngày: Chi ${todayExpense.toLong()} ₫ • Hạn mức ${safeToSpend.toLong()} ₫/ngày")
        } catch (e: Exception) {
            Log.e("DailySummaryWorker", "Error executing daily digest", e)
            AppLogger.e("DIGEST", "Lỗi tổng kết ngày: ${e.message}")
        } finally {
            // Tự động lên lịch cho ngày kế tiếp (22h30 ngày mai)
            schedule(applicationContext)
        }

        return Result.success()
    }
}

