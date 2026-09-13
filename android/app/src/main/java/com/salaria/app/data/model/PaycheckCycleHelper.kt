package com.salaria.app.data.model

import java.text.SimpleDateFormat
import java.util.*

data class PaycheckCycleInfo(
    val startDate: String,               // "2026-08-23"
    val endDate: String,                 // "2026-09-22"
    val displayTitle: String,            // "Kỳ lương 23/08 - 22/09"
    val shortDisplay: String,            // "23/08 - 22/09"
    val currentDayInCycle: Int,          // e.g. 12
    val totalDaysInCycle: Int,           // e.g. 31
    val daysUntilRent: Int,              // e.g. 17 (Tiền nhà ngày 20)
    val daysUntilNextPaycheck: Int,      // e.g. 20 (Lương ngày 23)
    val rentDateDisplay: String,         // "20/09"
    val nextPaycheckDateDisplay: String  // "23/09"
)

object PaycheckCycleHelper {
    const val DEFAULT_PAYDAY = 22
    const val DEFAULT_RENT_DAY = 20

    fun calculateCycle(
        date: Date = Date(),
        payday: Int = DEFAULT_PAYDAY,
        rentDay: Int = DEFAULT_RENT_DAY
    ): PaycheckCycleInfo {
        val cal = Calendar.getInstance().apply { time = date }
        val year = cal.get(Calendar.YEAR)
        val month = cal.get(Calendar.MONTH) // 0-based
        val day = cal.get(Calendar.DAY_OF_MONTH)

        val startCal = Calendar.getInstance()
        val endCal = Calendar.getInstance()

        if (day >= payday) {
            // Chu kỳ bắt đầu từ ngày payday tháng này đến trước payday tháng sau
            startCal.set(year, month, payday, 0, 0, 0)
            endCal.set(year, month + 1, payday - 1, 23, 59, 59)
        } else {
            // Chu kỳ bắt đầu từ ngày payday tháng trước đến trước payday tháng này
            startCal.set(year, month - 1, payday, 0, 0, 0)
            endCal.set(year, month, payday - 1, 23, 59, 59)
        }

        val totalDays = (((endCal.timeInMillis - startCal.timeInMillis) / (1000 * 60 * 60 * 24)).toInt() + 1).coerceAtLeast(28)
        val daysPassed = (((cal.timeInMillis - startCal.timeInMillis) / (1000 * 60 * 60 * 24)).toInt() + 1).coerceIn(1, totalDays)

        val nextPayCal = Calendar.getInstance().apply {
            timeInMillis = endCal.timeInMillis + (1000 * 60 * 60 * 24)
        }
        val daysUntilPay = (((nextPayCal.timeInMillis - cal.timeInMillis) / (1000 * 60 * 60 * 24)).toInt()).coerceAtLeast(0)

        // Tính ngày trả tiền nhà tiếp theo
        val rentCal = Calendar.getInstance().apply {
            if (day <= rentDay) {
                set(year, month, rentDay, 0, 0, 0)
            } else {
                set(year, month + 1, rentDay, 0, 0, 0)
            }
        }
        val daysUntilRent = (((rentCal.timeInMillis - cal.timeInMillis) / (1000 * 60 * 60 * 24)).toInt()).coerceAtLeast(0)

        val sdfIso = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val sdfShort = SimpleDateFormat("dd/MM", Locale.getDefault())

        return PaycheckCycleInfo(
            startDate = sdfIso.format(startCal.time),
            endDate = sdfIso.format(endCal.time),
            displayTitle = "Kỳ lương ${sdfShort.format(startCal.time)} - ${sdfShort.format(endCal.time)}",
            shortDisplay = "${sdfShort.format(startCal.time)} - ${sdfShort.format(endCal.time)}",
            currentDayInCycle = daysPassed,
            totalDaysInCycle = totalDays,
            daysUntilRent = daysUntilRent,
            daysUntilNextPaycheck = daysUntilPay,
            rentDateDisplay = sdfShort.format(rentCal.time),
            nextPaycheckDateDisplay = sdfShort.format(nextPayCal.time)
        )
    }

    fun calculateThreeBucketSafeToSpend(
        baseBudget: Double,
        savingsGoal: Double = 0.0,
        housingBudget: Double = 4_000_000.0,
        paidHousing: Double = 0.0,
        totalExpense: Double,
        daysRemaining: Int
    ): Double {
        val reservedHousing = if (housingBudget > 0.0) kotlin.math.max(0.0, housingBudget - paidHousing) else 0.0
        val remainingDiscretionary = kotlin.math.max(0.0, baseBudget - savingsGoal - reservedHousing - totalExpense)
        return remainingDiscretionary / kotlin.math.max(1, daysRemaining)
    }
}
