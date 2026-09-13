package com.salaria.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.ime
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Leaderboard
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.sp
import com.salaria.app.ui.theme.*

sealed class Screen(val route: String, val title: String, val icon: ImageVector) {
    object Dashboard : Screen("dashboard", "Tổng quan", Icons.Default.Dashboard)
    object Chat : Screen("chat", "Nhập AI", Icons.Default.AutoAwesome)
    object Analytics : Screen("analytics", "Phân tích", Icons.Default.Leaderboard)
    object Transactions : Screen("transactions", "Sổ thu chi", Icons.AutoMirrored.Filled.ReceiptLong)
    object Settings : Screen("settings", "Cài đặt", Icons.Default.Settings)
}

@Composable
fun MainScreen(
    initialNavigateTo: String? = null,
    initialEditTxId: String? = null,
    initialHighlightTxId: String? = null,
    onIntentConsumed: () -> Unit = {}
) {
    var currentScreen by remember { mutableStateOf<Screen>(Screen.Dashboard) }
    var autoOpenTxId by remember { mutableStateOf<String?>(null) }
    var autoHighlightTxId by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(initialNavigateTo, initialEditTxId, initialHighlightTxId) {
        if (initialNavigateTo == "transactions" || (initialEditTxId != null && initialNavigateTo != "chat")) {
            currentScreen = Screen.Transactions
            autoOpenTxId = initialEditTxId
            onIntentConsumed()
        } else if (initialNavigateTo == "chat" || initialHighlightTxId != null) {
            currentScreen = Screen.Chat
            autoHighlightTxId = initialHighlightTxId
            onIntentConsumed()
        }
    }

    val items = listOf(
        Screen.Dashboard,
        Screen.Chat,
        Screen.Analytics,
        Screen.Transactions,
        Screen.Settings
    )

    val density = LocalDensity.current
    val isKeyboardOpen = WindowInsets.ime.getBottom(density) > 0

    Scaffold(
        bottomBar = {
            if (!isKeyboardOpen || currentScreen != Screen.Chat) {
                NavigationBar(
                    containerColor = CardDark,
                    contentColor = TextPrimary,
                    windowInsets = WindowInsets.navigationBars
                ) {
                    items.forEach { screen ->
                        val selected = currentScreen == screen
                        NavigationBarItem(
                            selected = selected,
                            onClick = { currentScreen = screen },
                            icon = { Icon(screen.icon, contentDescription = screen.title) },
                            label = { Text(screen.title, fontSize = 11.sp, maxLines = 1) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = EmeraldPrimary,
                                selectedTextColor = EmeraldPrimary,
                                unselectedIconColor = TextSecondary,
                                unselectedTextColor = TextSecondary,
                                indicatorColor = CardBorder
                            )
                        )
                    }
                }
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .consumeWindowInsets(paddingValues)
                .background(BgDark)
        ) {
            when (currentScreen) {
                is Screen.Dashboard -> DashboardScreen(
                    onNavigateToChat = { currentScreen = Screen.Chat },
                    onNavigateToTransactions = { currentScreen = Screen.Transactions },
                    onNavigateToSettings = { currentScreen = Screen.Settings }
                )
                is Screen.Chat -> ChatScreen(
                    highlightTxId = autoHighlightTxId,
                    onHighlightConsumed = { autoHighlightTxId = null }
                )
                is Screen.Analytics -> AnalyticsScreen()
                is Screen.Transactions -> TransactionsScreen(
                    autoOpenTxId = autoOpenTxId,
                    onAutoOpenConsumed = { autoOpenTxId = null }
                )
                is Screen.Settings -> SettingsScreen()
            }
        }
    }
}
