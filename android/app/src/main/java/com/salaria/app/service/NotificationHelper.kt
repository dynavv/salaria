package com.salaria.app.service

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import com.salaria.app.MainActivity
import com.salaria.app.R
import com.salaria.app.data.model.IngestResult
import java.text.NumberFormat
import java.util.Locale

object NotificationHelper {

    const val CHANNEL_TRANSACTIONS = "salaria_transactions_channel"
    const val CHANNEL_DAILY_SUMMARY = "salaria_daily_summary_channel"
    const val CHANNEL_SECURITY_ALERTS = "salaria_security_alerts_channel"
    const val ID_SECURITY_WARNING = 9110

    fun showSecurityRedactedWarning(context: Context, packageName: String) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val channel = android.app.NotificationChannel(
                CHANNEL_SECURITY_ALERTS,
                "Cảnh báo bảo mật thông báo",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Cảnh báo khi Android OS ẩn nội dung thông báo ngân hàng do có mã OTP"
            }
            notificationManager.createNotificationChannel(channel)
        }

        val appDisplayName = when {
            packageName.contains("msb", ignoreCase = true) -> "MSB DigiBank"
            packageName.contains("wallet", ignoreCase = true) -> "Google Wallet"
            packageName.contains("zalopay", ignoreCase = true) -> "ZaloPay"
            else -> packageName
        }

        // Action: Quét lại ngay
        val retryIntent = Intent(context, RetryScanReceiver::class.java).apply {
            action = RetryScanReceiver.ACTION_RETRY_SCAN
            putExtra("target_package", packageName)
        }
        val retryPendingIntent = PendingIntent.getBroadcast(
            context,
            101,
            retryIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Intent mở app
        val openAppIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("navigate_to", "settings")
        }
        val openAppPendingIntent = PendingIntent.getActivity(
            context,
            102,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val title = "⚠️ Giao dịch đang bị ẩn (Android 15)"
        val content = "Nội dung $appDisplayName đang bị che giấu chống lộ OTP."
        val bigText = "Nội dung từ $appDisplayName đang bị hệ điều hành Android che giấu nhằm chống đánh cắp mã OTP.\n\n👉 Sau khi nhập mã xong, hãy quẹt xóa SMS OTP rồi bấm 'Quét lại ngay' bên dưới (hoặc để Salaria tự quét lại sau 30 giây)."

        val notification = NotificationCompat.Builder(context, CHANNEL_SECURITY_ALERTS)
            .setSmallIcon(R.drawable.ic_stat_salaria)
            .setContentTitle(title)
            .setContentText(content)
            .setStyle(NotificationCompat.BigTextStyle().bigText(bigText))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(openAppPendingIntent)
            .addAction(R.drawable.ic_stat_salaria, "🔄 Quét lại ngay", retryPendingIntent)
            .build()

        notificationManager.notify(ID_SECURITY_WARNING, notification)
    }

    fun cancelSecurityWarning(context: Context) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(ID_SECURITY_WARNING)
    }

    fun showTransactionSuccess(context: Context, result: IngestResult, rawSourceText: String? = null) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("navigate_to", "chat")
            if (result.id != null) {
                putExtra("highlight_tx_id", result.id)
                putExtra("edit_transaction_id", result.id)
            }
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val amount = result.amount ?: 0.0
        val isIncome = result.type == "income"
        val isTransfer = result.type == "transfer"
        val sign = if (isIncome) "+ " else if (isTransfer) "⇄ " else "- "
        val formattedAmount = formatVnd(amount)

        val category = result.categoryName ?: (if (isTransfer) "Chuyển tiền nội bộ (Rút ATM)" else "Chưa phân loại")
        val note = result.note ?: rawSourceText ?: "Giao dịch mới"
        val method = result.categorizedBy ?: "Cloudflare AI"

        val title = if (isIncome) {
            "🟢 Thu tiền: $sign$formattedAmount"
        } else if (isTransfer) {
            "⇄ Chuyển tiền: $formattedAmount"
        } else {
            "🔴 Chi tiêu: $sign$formattedAmount"
        }

        val content = "$category • $note"

        val notification = NotificationCompat.Builder(context, CHANNEL_TRANSACTIONS)
            .setSmallIcon(R.drawable.ic_stat_salaria)
            .setContentTitle(title)
            .setContentText(content)
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("$title\n🏷️ Danh mục: $category\n📝 Ghi chú: $note\n🧠 Xử lý bởi: $method")
            )
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val notificationId = (System.currentTimeMillis() % 100000).toInt()
        notificationManager.notify(notificationId, notification)
    }

    fun showDailySummary(
        context: Context,
        todayExpense: Double,
        safeToSpendPerDay: Double,
        daysRemaining: Int,
        statusNote: String? = null,
        dateDisplay: String? = null
    ) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val channel = android.app.NotificationChannel(
                CHANNEL_DAILY_SUMMARY,
                "Tổng kết chi tiêu hàng ngày",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Thông báo tổng kết chi tiêu mỗi tối lúc 22:30 và hạn mức an toàn"
            }
            notificationManager.createNotificationChannel(channel)
        }

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("navigate_to", "chat")
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            1,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val formattedToday = formatVnd(todayExpense)
        val formattedSafe = formatVnd(safeToSpendPerDay)

        val title = if (!dateDisplay.isNullOrBlank()) "🌙 Báo cáo chi tiêu ngày $dateDisplay" else "🌙 Tổng kết chi tiêu hôm nay"
        val content = "💸 Đã chi: $formattedToday • 🛡️ Hạn mức mai: $formattedSafe/ngày"

        val noteText = statusNote ?: if (todayExpense <= safeToSpendPerDay) {
            "Chi tiêu an toàn, bạn đang kiểm soát ngân sách rất tốt! ✨"
        } else {
            "Chi tiêu hôm nay hơi cao so với hạn mức, ngày mai cân đối nhé! ⚠️"
        }

        val bigBody = buildString {
            append("💸 Hôm nay đã chi: $formattedToday\n")
            append("🛡️ Hạn mức an toàn ngày mai: $formattedSafe/ngày\n")
            append("⏳ Còn $daysRemaining ngày tới kỳ lương kế tiếp\n")
            append("💡 Trạng thái: $noteText")
        }

        val notification = NotificationCompat.Builder(context, CHANNEL_DAILY_SUMMARY)
            .setSmallIcon(R.drawable.ic_stat_salaria)
            .setContentTitle(title)
            .setContentText(content)
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText(bigBody)
            )
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        notificationManager.notify(2230, notification)
    }

    private fun formatVnd(amount: Double): String {
        val formatter = NumberFormat.getNumberInstance(Locale("vi", "VN")).apply {
            maximumFractionDigits = 0
        }
        val rounded = kotlin.math.round(amount).toLong()
        return "${formatter.format(rounded)} ₫"
    }
}
