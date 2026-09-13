package com.salaria.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.lifecycleScope
import com.salaria.app.data.api.ApiClient
import com.salaria.app.data.local.PreferencesManager
import com.salaria.app.ui.screens.MainScreen
import com.salaria.app.ui.theme.SalariaTheme
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private var navigateToScreen by mutableStateOf<String?>(null)
    private var editTxId by mutableStateOf<String?>(null)
    private var highlightTxId by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleIntent(intent)
        enableEdgeToEdge()

        // Lên lịch thông báo tổng kết chi tiêu 22h30 mỗi tối qua WorkManager [P2-01]
        com.salaria.app.worker.DailySummaryWorker.schedule(applicationContext)

        val prefs = PreferencesManager(applicationContext)
        lifecycleScope.launch {
            val oldUrl = prefs.getWorkerUrlBlocking()
            if (oldUrl.contains("salaria.inkarmattuskur.workers.dev") || oldUrl.isBlank() || prefs.getMasterPinBlocking() == "839162") {
                prefs.updateWorkerUrl(PreferencesManager.DEFAULT_WORKER_URL)
                prefs.updateApiKey(PreferencesManager.DEFAULT_API_KEY)
                prefs.updateMasterPin(PreferencesManager.DEFAULT_PIN)
            }

            combine(prefs.workerUrlFlow, prefs.apiKeyFlow) { url, key ->
                Pair(url, key)
            }.collect { (url, key) ->
                ApiClient.updateConfig(url, key)
            }
        }

        setContent {
            val themeMode by prefs.themeModeFlow.collectAsState(initial = "dark")
            val isSystemDark = androidx.compose.foundation.isSystemInDarkTheme()
            val isDark = when (themeMode) {
                "light" -> false
                "dark" -> true
                else -> isSystemDark
            }

            SalariaTheme(isDark = isDark) {
                MainScreen(
                    initialNavigateTo = navigateToScreen,
                    initialEditTxId = editTxId,
                    initialHighlightTxId = highlightTxId,
                    onIntentConsumed = {
                        navigateToScreen = null
                        editTxId = null
                        highlightTxId = null
                    }
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        val nav = intent?.getStringExtra("navigate_to")
        val txId = intent?.getStringExtra("edit_transaction_id")
        val hId = intent?.getStringExtra("highlight_tx_id")
        if (nav != null || txId != null || hId != null) {
            navigateToScreen = nav
            editTxId = txId
            highlightTxId = hId
        }
    }

    override fun onResume() {
        super.onResume()
        tryRebindNotificationListener()
    }

    private fun tryRebindNotificationListener() {
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
                val cn = android.content.ComponentName(this, com.salaria.app.service.BankNotificationListener::class.java)
                val flat = android.provider.Settings.Secure.getString(contentResolver, "enabled_notification_listeners")
                val isEnabled = flat != null && flat.contains(cn.flattenToString())
                if (isEnabled) {
                    android.service.notification.NotificationListenerService.requestRebind(cn)
                }
            }
        } catch (e: Exception) {
            // Safe fallback
        }
    }
}
