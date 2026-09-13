package com.salaria.app.service

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.salaria.app.data.api.ApiClient
import com.salaria.app.data.local.AppDatabase
import com.salaria.app.data.local.OfflineTransactionEntity
import com.salaria.app.data.local.PreferencesManager
import com.salaria.app.data.model.IngestRequest
import com.salaria.app.worker.SyncOfflineTransactionsWorker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class BankNotificationListener : NotificationListenerService() {

    private val TAG = "BankNotiListener"
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var prefsManager: PreferencesManager
    private lateinit var appDatabase: AppDatabase

    companion object {
        private const val DEDUP_WINDOW_MS = 60_000L // 60 giây chống trùng lặp từ Android OS
        private val recentNotificationMap = java.util.concurrent.ConcurrentHashMap<String, Long>()
        var instance: BankNotificationListener? = null
    }

    override fun onCreate() {
        super.onCreate()
        prefsManager = PreferencesManager(this)
        appDatabase = AppDatabase.getDatabase(this)
        scope.launch {
            try {
                appDatabase.offlineDao().deleteAll()
            } catch (e: Exception) {
                Log.w(TAG, "Không thể dọn dẹp hàng đợi offline cũ: ${e.message}")
            }
        }
        SyncOfflineTransactionsWorker.enqueue(this)
        Log.i(TAG, "Salaria BankNotificationListener service started")
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        instance = this
        Log.i(TAG, "BankNotificationListener connected and ready")
    }

    override fun onDestroy() {
        super.onDestroy()
        if (instance == this) {
            instance = null
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return

        // Bỏ qua các thông báo tóm tắt nhóm ảo (Group Summary Header) của hệ điều hành
        if ((sbn.notification?.flags ?: 0) and Notification.FLAG_GROUP_SUMMARY != 0) {
            return
        }

        val packageName = sbn.packageName ?: return
        if (!prefsManager.isServiceEnabledBlocking()) {
            com.salaria.app.util.AppLogger.w("NOTI", "Bỏ qua ($packageName): Dịch vụ đang tạm tắt trong Cài đặt")
            return
        }

        val allowedPackages = prefsManager.getAllowedPackagesBlocking()
        val isAllowed = allowedPackages.contains(packageName) || packageName.contains("msb", ignoreCase = true)
        if (!isAllowed) {
            return
        }

        val extras = sbn.notification?.extras ?: return
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
        val normalText = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val text = (if (!bigText.isNullOrBlank()) bigText else normalText).trim()

        if (text.isBlank() && title.isBlank()) return

        // CHỐNG TRÙNG LẶP CỤC BỘ (Deduplication): Ngăn Android OS gọi onNotificationPosted nhiều lần cho cùng 1 thông báo
        val notiKey = "$packageName|${title.trim()}|${text.trim()}"
        val now = System.currentTimeMillis()
        if (recentNotificationMap.size > 100) {
            recentNotificationMap.entries.removeIf { (now - it.value) > DEDUP_WINDOW_MS }
        }
        val lastSeen = recentNotificationMap[notiKey]
        if (lastSeen != null && (now - lastSeen) <= DEDUP_WINDOW_MS) {
            Log.d(TAG, "Duplicate notification dropped at listener: $notiKey")
            com.salaria.app.util.AppLogger.w("NOTI", "Bỏ qua thông báo lặp từ Android OS ($packageName)")
            return
        }
        recentNotificationMap[notiKey] = now

        val fullText = if (title.isNotBlank()) "$title: $text" else text

        // Kiểm tra nếu nội dung thông báo bị hệ điều hành Android che giấu do bảo mật OTP hoặc khóa màn hình
        if (isContentHidden(fullText)) {
            com.salaria.app.util.AppLogger.w("NOTI", "Bỏ qua tạm thời ($packageName): Nội dung bị ẩn do bảo mật OTP/màn hình khóa.")
            NotificationHelper.showSecurityRedactedWarning(applicationContext, packageName)
            scheduleAutoRetry(packageName)
            return
        }

        if (isNoiseMessage(fullText)) {
            Log.d(TAG, "Ignoring noise notification from $packageName: $fullText")
            com.salaria.app.util.AppLogger.w("NOTI", "Bỏ qua ($packageName): Phát hiện từ khóa quảng cáo/tin rác")
            return
        }

        // Bóc tách và đẩy giao dịch lên hệ thống
        dispatchTransactionIngest(packageName, title, text, fullText)
    }

    fun triggerManualScan(targetPackage: String? = null) {
        scope.launch {
            val success = scanAndProcessActiveNotifications(targetPackage, isManual = true)
            if (!success) {
                com.salaria.app.util.AppLogger.w("NOTI", "Quét lại: Chưa tìm thấy thông báo đã gỡ bảo mật trên thanh trạng thái.")
            }
        }
    }

    private fun scheduleAutoRetry(targetPackage: String) {
        scope.launch {
            Log.i(TAG, "Bắt đầu hẹn giờ tự động quét lại cho $targetPackage...")
            // Thử ở mốc 30s và 60s
            for (attempt in 1..2) {
                kotlinx.coroutines.delay(30_000L)
                com.salaria.app.util.AppLogger.i("NOTI", "Đang tự động quét lại thông báo sau ${attempt * 30}s cho $targetPackage...")
                val success = scanAndProcessActiveNotifications(targetPackage, isManual = false)
                if (success) {
                    Log.i(TAG, "Tự động quét lại thành công ở lần thử $attempt")
                    break
                }
            }
        }
    }

    private suspend fun scanAndProcessActiveNotifications(
        targetPackage: String? = null,
        isManual: Boolean = false
    ): Boolean {
        val activeList = try {
            activeNotifications
        } catch (e: Exception) {
            Log.w(TAG, "Không thể lấy active notifications: ${e.message}")
            null
        }

        if (activeList.isNullOrEmpty()) {
            return false
        }

        val allowedPackages = prefsManager.getAllowedPackagesBlocking()
        var processedCount = 0

        for (sbn in activeList) {
            // Bỏ qua các thông báo tóm tắt nhóm ảo của hệ điều hành
            if ((sbn.notification?.flags ?: 0) and Notification.FLAG_GROUP_SUMMARY != 0) {
                continue
            }

            val pkg = sbn.packageName ?: continue
            val isAllowed = allowedPackages.contains(pkg) || pkg.contains("msb", ignoreCase = true)
            if (!isAllowed) continue
            if (targetPackage != null && pkg != targetPackage) continue

            val extras = sbn.notification?.extras ?: continue
            val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
            val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
            val normalText = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty()
            val text = (if (!bigText.isNullOrBlank()) bigText else normalText).trim()

            if (text.isBlank() && title.isBlank()) continue

            val fullText = if (title.isNotBlank()) "$title: $text" else text

            // Nếu vẫn còn bị ẩn, bỏ qua
            if (isContentHidden(fullText)) {
                continue
            }

            // Nếu là quảng cáo rác, bỏ qua
            if (isNoiseMessage(fullText)) {
                continue
            }

            // Chống trùng lặp
            val notiKey = "$pkg|${title.trim()}|${text.trim()}"
            val now = System.currentTimeMillis()
            val lastSeen = recentNotificationMap[notiKey]
            if (lastSeen != null && (now - lastSeen) <= DEDUP_WINDOW_MS) {
                continue
            }
            recentNotificationMap[notiKey] = now

            // Đã gỡ ẩn thành công! Hủy thông báo cảnh báo và xử lý giao dịch
            NotificationHelper.cancelSecurityWarning(applicationContext)
            com.salaria.app.util.AppLogger.s("NOTI", "Đã quét lại thành công thông báo gỡ bảo mật từ $pkg")
            dispatchTransactionIngest(pkg, title, text, fullText)
            processedCount++
        }

        return processedCount > 0
    }

    private fun isContentHidden(fullText: String): Boolean {
        val lowerFull = fullText.lowercase()
        return lowerFull.contains("sensitive notification content hidden") ||
                lowerFull.contains("content hidden") ||
                lowerFull.contains("nội dung ẩn") ||
                lowerFull.contains("nội dung bị ẩn") ||
                lowerFull.contains("nội dung thông báo bị ẩn")
    }

    private fun dispatchTransactionIngest(
        packageName: String,
        title: String,
        text: String,
        fullText: String
    ) {
        // Lọc sạch số tài khoản và số dư để bảo mật riêng tư trước khi xử lý
        val sanitizedText = sanitizeBankNotification(fullText)
        Log.i(TAG, "Processing bank notification from $packageName: $sanitizedText")
        com.salaria.app.util.AppLogger.i("NOTI", "Nhận thông báo từ $packageName: ${title.ifBlank { sanitizedText.take(30) }}")

        scope.launch {
            try {
                com.salaria.app.util.AppLogger.i("API", "Đang gửi lên Cloudflare: $sanitizedText")
                val api = ApiClient.getApi(applicationContext)
                val response = api.postTransaction(
                    IngestRequest(
                        text = sanitizedText,
                        title = title.ifBlank { null },
                        isNotification = true,
                        source = "bank_notification"
                    )
                )

                if (response.isSuccessful) {
                    val body = response.body()
                    if (body?.data != null) {
                        val result = body.data!!
                        Log.i(TAG, "Transaction categorized: ${result.amount} - ${result.categoryName}")
                        com.salaria.app.util.AppLogger.s("API", "Ghi nhận thành công: ${result.amount?.toLong() ?: 0} ₫ • ${result.categoryName ?: "Chưa phân loại"} (${result.note ?: ""})")

                        // 1. Bơm trực tiếp vào bộ nhớ RAM của Chat (0ms Latency)
                        try {
                            kotlinx.coroutines.withContext(Dispatchers.Main) {
                                com.salaria.app.data.model.ChatManager.addBankTransaction(sanitizedText, result)
                            }
                        } catch (chatErr: Exception) {
                            Log.w(TAG, "Không thể thêm vào ChatManager: ${chatErr.message}")
                        }

                        // 2. Phát tín hiệu toàn cục cho Dashboard, Sổ thu chi, Phân tích tự động đồng bộ ngầm
                        com.salaria.app.data.model.AppSyncBus.notifyDataChanged()

                        // 3. Bắn thông báo Android trỏ thẳng về Chat
                        NotificationHelper.showTransactionSuccess(applicationContext, result, sanitizedText)
                    } else {
                        // Server chủ động bỏ qua thông báo (không phải lỗi, do là tin quảng cáo hoặc không chứa biến động số dư)
                        val msg = body?.message ?: "Server bỏ qua thông báo (không phải biến động số dư)"
                        Log.i(TAG, "Server ignored notification: $msg")
                        com.salaria.app.util.AppLogger.i("API", "Server bỏ qua: $msg")
                    }
                } else {
                    val errCode = response.code()
                    val errMsg = response.errorBody()?.string() ?: response.message()
                    Log.w(TAG, "Server error, queuing offline: $errCode")
                    com.salaria.app.util.AppLogger.e("API", "Lỗi server $errCode: $errMsg")
                    enqueueOffline(title.ifBlank { null }, sanitizedText, packageName, "Server returned $errCode")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Network exception, queuing offline: ${e.message}")
                com.salaria.app.util.AppLogger.e("API", "Lỗi mạng/kết nối: ${e.message}")
                enqueueOffline(title.ifBlank { null }, sanitizedText, packageName, e.message)
            }
        }
    }

    private suspend fun enqueueOffline(title: String?, text: String, packageName: String, error: String?) {
        try {
            appDatabase.offlineDao().insert(
                OfflineTransactionEntity(
                    title = title,
                    text = text,
                    packageName = packageName,
                    lastError = error
                )
            )
            // Kích hoạt WorkManager tự động đẩy giao dịch khi máy có mạng trở lại
            SyncOfflineTransactionsWorker.enqueue(applicationContext)
            com.salaria.app.util.AppLogger.w("OFFLINE", "Đã lưu vào hàng đợi offline, sẽ tự đồng bộ khi có kết nối mạng.")
        } catch (dbErr: Exception) {
            Log.e(TAG, "Failed to save offline: ${dbErr.message}")
        }
    }

    private fun sanitizeBankNotification(text: String): String {
        var result = text
        // Xóa thông tin số dư (Available balance)
        result = result.replace(Regex("""(?i)(?:s[ốo]\s*d[ưu]|sd|so\s*du\s*cuoi|số\s*dư\s*cuối|balance)[^0-9]*[\d.,]+\s*(?:vnd|vnđ|d|đ)?"""), "")
        // Ẩn số tài khoản / thẻ (Account / Card number: ví dụ 1903678123456 -> 190***456)
        result = result.replace(Regex("""(?i)(?:tk|stk|tài\s*khoản|tai\s*khoan|thẻ|the)\s*:?\s*([a-z0-9]{3})[a-z0-9]+([a-z0-9]{3})"""), "$1***$2")
        return result.trim()
    }

    private fun isNoiseMessage(text: String): Boolean {
        val norm = text.lowercase()
        val noiseKeywords = listOf(
            "dang nhap thanh cong", "đăng nhập thành công",
            "ma xac thuc", "mã xác thực", "ma otp", "mã otp", "otp",
            "dac quyen", "đặc quyền", "han muc len den", "hạn mức lên đến",
            "chung minh thu nhap", "chứng minh thu nhập",
            "dang ky vay", "đăng ký vay", "khoan vay", "khoản vay",
            "vay tieu dung", "vay tiêu dùng", "mo the tin dung", "mở thẻ tín dụng",
            "uu dai danh rieng", "ưu đãi dành riêng", "qua tang", "quà tặng",
            "trung thuong", "trúng thưởng", "chúc mừng sinh nhật", "khuyen mai",
            "khuyến mãi", "voucher", "giam gia", "giảm giá",
            "tam giu", "tạm giữ", "xac nhan tam giu", "xác nhận tạm giữ",
            "khong thanh cong", "không thành công", "that bai", "thất bại",
            "nap them tien", "nạp thêm tiền", "can nap them", "cần nạp thêm"
        )
        return noiseKeywords.any { norm.contains(it) }
    }
}
