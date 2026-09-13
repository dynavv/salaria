package com.salaria.app.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class RetryScanReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "RetryScanReceiver"
        const val ACTION_RETRY_SCAN = "com.salaria.app.ACTION_RETRY_SCAN"
    }

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action == ACTION_RETRY_SCAN) {
            val targetPackage = intent.getStringExtra("target_package")
            Log.i(TAG, "Nhận tín hiệu quét lại thông báo từ người dùng. Target: $targetPackage")
            com.salaria.app.util.AppLogger.i("NOTI", "Người dùng nhấn 'Quét lại ngay'. Đang kiểm tra thanh thông báo...")
            BankNotificationListener.instance?.triggerManualScan(targetPackage)
        }
    }
}
