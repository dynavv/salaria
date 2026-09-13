package com.salaria.app.ui.screens

import android.content.Context
import android.content.Intent
import android.provider.Settings
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.app.NotificationManagerCompat
import com.salaria.app.data.api.ApiClient
import com.salaria.app.data.model.Account
import com.salaria.app.data.model.MonthlyAnalyticsData
import com.salaria.app.data.model.Transaction
import com.salaria.app.ui.theme.*
import kotlinx.coroutines.async
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import com.salaria.app.data.model.PaycheckCycleHelper
import com.salaria.app.data.model.PaycheckCycleInfo
import com.salaria.app.data.model.AppSyncBus

enum class DashboardViewMode {
    PAYCHECK_CYCLE, // Mặc định khi mở app theo yêu cầu người dùng
    CALENDAR_MONTH
}

object DashboardCache {
    var accounts by mutableStateOf<List<Account>>(emptyList())
    var recentTransactions by mutableStateOf<List<Transaction>>(emptyList())
    var monthlyAnalytics by mutableStateOf<MonthlyAnalyticsData?>(null)
    var cycleAnalytics by mutableStateOf<MonthlyAnalyticsData?>(null)
    var isLoaded by mutableStateOf(false)
}

@Composable
fun DashboardScreen(
    onNavigateToChat: () -> Unit,
    onNavigateToTransactions: () -> Unit,
    onNavigateToSettings: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val accounts = DashboardCache.accounts
    val recentTransactions = DashboardCache.recentTransactions
    val monthlyAnalytics = DashboardCache.monthlyAnalytics
    val cycleAnalytics = DashboardCache.cycleAnalytics
    var viewMode by remember { mutableStateOf(DashboardViewMode.PAYCHECK_CYCLE) }
    val cycleInfo = remember { PaycheckCycleHelper.calculateCycle() }

    var isLoading by remember { mutableStateOf(!DashboardCache.isLoaded) }
    var errorMsg by remember { mutableStateOf<String?>(null) }
    var hasNotiPermission by remember { mutableStateOf(checkNotificationListenerPermission(context)) }

    val totalBalance = accounts.sumOf { it.displayBalance }
    val recentExpenses = recentTransactions.filter { it.type == "expense" }.sumOf { it.amount }
    val recentIncome = recentTransactions.filter { it.type == "income" }.sumOf { it.amount }

    fun loadData(silent: Boolean = false) {
        scope.launch {
            if (!silent && !DashboardCache.isLoaded) {
                isLoading = true
            }
            errorMsg = null
            try {
                val api = ApiClient.getApi(context)
                val currentMonthStr = SimpleDateFormat("yyyy-MM", Locale.getDefault()).format(Date())

                withContext(Dispatchers.IO) {
                    val accountsDeferred = async { try { api.getAccounts() } catch (e: Exception) { null } }
                    val txDeferred = async { try { api.getTransactions(limit = 10) } catch (e: Exception) { null } }
                    val monthlyDeferred = async { try { api.getMonthlyAnalytics(month = currentMonthStr) } catch (e: Exception) { null } }
                    val cycleDeferred = async { try { api.getMonthlyAnalytics(startDate = cycleInfo.startDate, endDate = cycleInfo.endDate) } catch (e: Exception) { null } }

                    val accRes = accountsDeferred.await()
                    val txRes = txDeferred.await()
                    val monthlyRes = monthlyDeferred.await()
                    val cycleRes = cycleDeferred.await()

                    withContext(Dispatchers.Main) {
                        if (accRes?.isSuccessful == true && accRes.body()?.data != null) {
                            DashboardCache.accounts = accRes.body()!!.data!!
                        }
                        if (txRes?.isSuccessful == true && txRes.body()?.data != null) {
                            DashboardCache.recentTransactions = txRes.body()!!.data!!
                        }
                        if (monthlyRes?.isSuccessful == true && monthlyRes.body()?.data != null) {
                            DashboardCache.monthlyAnalytics = monthlyRes.body()!!.data
                        }
                        if (cycleRes?.isSuccessful == true && cycleRes.body()?.data != null) {
                            DashboardCache.cycleAnalytics = cycleRes.body()!!.data
                        }
                        DashboardCache.isLoaded = true
                    }
                }
            } catch (e: Exception) {
                if (!DashboardCache.isLoaded) {
                    errorMsg = e.message ?: "Lỗi kết nối Cloudflare Worker"
                }
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) {
        hasNotiPermission = checkNotificationListenerPermission(context)
        loadData(silent = DashboardCache.isLoaded)
    }

    // Lắng nghe sự kiện đồng bộ toàn cục từ AppSyncBus (Silent Sync)
    LaunchedEffect(Unit) {
        AppSyncBus.dataChangedFlow.collect {
            loadData(silent = true)
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(BgDark)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 24.dp)
    ) {
        // App Header with Logo and Sync status
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Brush.linearGradient(listOf(EmeraldPrimary, VioletAI))),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "S",
                            color = Color.White,
                            fontWeight = FontWeight.Black,
                            fontSize = 20.sp
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "Salaria",
                            color = TextPrimary,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = (-0.5).sp
                        )
                        Text(
                            text = "Personal Wealth OS",
                            color = TextSecondary,
                            fontSize = 12.sp
                        )
                    }
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Sync Status Pill
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(CardDark)
                            .border(1.dp, CardBorderSubtle, RoundedCornerShape(20.dp))
                            .padding(horizontal = 10.dp, vertical = 6.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(7.dp)
                                    .clip(CircleShape)
                                    .background(if (hasNotiPermission) EmeraldPrimary else AmberWarning)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = if (hasNotiPermission) "Auto-sync" else "Noti off",
                                color = if (hasNotiPermission) EmeraldLight else AmberWarning,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }

                    // Refresh Button
                    IconButton(
                        onClick = { loadData() },
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(CardDark)
                            .border(1.dp, CardBorderSubtle, CircleShape)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Sync,
                            contentDescription = "Refresh",
                            tint = CyanAccent,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
        }

        // Notification Permission Alert Banner (if needed)
        if (!hasNotiPermission) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(CardDark)
                        .border(1.dp, AmberWarning.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
                        .clickable {
                            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
                            context.startActivity(intent)
                        }
                        .padding(14.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(AmberWarning.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.NotificationsActive,
                                contentDescription = null,
                                tint = AmberWarning,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                "Chưa bật quyền Đọc thông báo",
                                color = TextPrimary,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                            Text(
                                "Nhấn vào đây để cấp quyền tự động bắt giao dịch ngân hàng.",
                                color = TextSecondary,
                                fontSize = 11.sp
                            )
                        }
                        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = AmberWarning, modifier = Modifier.size(18.dp))
                    }
                }
            }
        }

        // Dual View Switcher (Kỳ lương vs Tháng dương lịch - Mặc định là Kỳ lương)
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(CardDark)
                    .border(1.dp, CardBorderSubtle, RoundedCornerShape(14.dp))
                    .padding(3.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                val isCycle = viewMode == DashboardViewMode.PAYCHECK_CYCLE
                val isMonth = viewMode == DashboardViewMode.CALENDAR_MONTH

                // Mode 1: Theo Kỳ Lương (23/08 - 22/09) - Mặc định
                Box(
                    modifier = Modifier
                        .weight(1.2f)
                        .clip(RoundedCornerShape(11.dp))
                        .background(if (isCycle) EmeraldPrimary.copy(alpha = 0.18f) else Color.Transparent)
                        .border(1.dp, if (isCycle) EmeraldPrimary.copy(alpha = 0.7f) else Color.Transparent, RoundedCornerShape(11.dp))
                        .clickable { viewMode = DashboardViewMode.PAYCHECK_CYCLE }
                        .padding(vertical = 9.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.AccountBalanceWallet,
                            contentDescription = null,
                            tint = if (isCycle) EmeraldPrimary else TextSecondary,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Kỳ lương (${cycleInfo.shortDisplay})",
                            color = if (isCycle) EmeraldPrimary else TextSecondary,
                            fontWeight = if (isCycle) FontWeight.Bold else FontWeight.Medium,
                            fontSize = 12.sp
                        )
                    }
                }

                // Mode 2: Tháng dương lịch (1 - 30)
                Box(
                    modifier = Modifier
                        .weight(0.8f)
                        .clip(RoundedCornerShape(11.dp))
                        .background(if (isMonth) CyanAccent.copy(alpha = 0.18f) else Color.Transparent)
                        .border(1.dp, if (isMonth) CyanAccent.copy(alpha = 0.7f) else Color.Transparent, RoundedCornerShape(11.dp))
                        .clickable { viewMode = DashboardViewMode.CALENDAR_MONTH }
                        .padding(vertical = 9.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.CalendarMonth,
                            contentDescription = null,
                            tint = if (isMonth) CyanAccent else TextSecondary,
                            modifier = Modifier.size(14.dp)
                        )
                        val currentMonthShort = remember { SimpleDateFormat("'Tháng' MM", Locale.getDefault()).format(Date()) }
                        Text(
                            text = currentMonthShort,
                            color = if (isMonth) CyanAccent else TextSecondary,
                            fontWeight = if (isMonth) FontWeight.Bold else FontWeight.Medium,
                            fontSize = 12.sp
                        )
                    }
                }
            }
        }

        // Titanium Hero Spending & Projected Expense Card
        item {
            val isCycle = viewMode == DashboardViewMode.PAYCHECK_CYCLE
            val calendar = remember { Calendar.getInstance() }
            val currentDayOfMonth = remember { calendar.get(Calendar.DAY_OF_MONTH) }
            val daysInMonth = remember { calendar.getActualMaximum(Calendar.DAY_OF_MONTH) }
            val currentMonthDisplay = remember {
                SimpleDateFormat("'Tháng' MM/yyyy", Locale.getDefault()).format(Date())
            }

            val cardTitle = if (isCycle) "CHI TIÊU ${cycleInfo.displayTitle}".uppercase() else "CHI TIÊU $currentMonthDisplay".uppercase()
            val badgeText = if (isCycle) "Ngày ${cycleInfo.currentDayInCycle} / ${cycleInfo.totalDaysInCycle}" else "Ngày $currentDayOfMonth / $daysInMonth"

            val activeAnalytics = if (isCycle) cycleAnalytics else monthlyAnalytics
            val totalExpense = activeAnalytics?.totalExpense
            val daysPassed = if (isCycle) cycleInfo.currentDayInCycle else currentDayOfMonth
            val totalDays = if (isCycle) cycleInfo.totalDaysInCycle else daysInMonth

            // Bóc tách chi phí cố định / 1 lần (tiền nhà, học phí, trả nợ) ra khỏi tốc độ chi sinh hoạt hàng ngày
            val fixedCategoryIds = setOf("cat_housing", "cat_education", "cat_debt")
            val fixedExpenses = activeAnalytics?.categories?.filter {
                it.categoryId in fixedCategoryIds || (it.amount >= 3_000_000.0 && it.count <= 2)
            }?.sumOf { it.amount } ?: 0.0

            val variableExpenses = maxOf(0.0, (totalExpense ?: 0.0) - fixedExpenses)
            val dailyAvg = if (daysPassed > 0) variableExpenses / daysPassed else 0.0

            val projectedExpense = if (totalExpense != null && totalExpense > 0) {
                fixedExpenses + (dailyAvg * totalDays)
            } else {
                totalExpense ?: 0.0
            }
            val currentExpenseLabel = if (isCycle) "Chi tiêu kỳ này" else "Tổng chi tháng"
            val forecastLabel = if (isCycle) "Dự báo cả kỳ" else "Dự báo cả tháng"

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(24.dp))
                    .background(HeroCardGradient)
                    .border(1.dp, CardBorderHighlight, RoundedCornerShape(24.dp))
                    .padding(20.dp)
            ) {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = cardTitle,
                            color = TextSecondary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            letterSpacing = 1.2.sp
                        )
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(CyanAccent.copy(alpha = 0.15f))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = badgeText,
                                color = CyanAccent,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // 2 Blocks: Tổng chi & Dự báo chi
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        // Cột 1: Tổng chi
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(16.dp))
                                .background(CardDarkSecondary)
                                .border(1.dp, CardBorderSubtle, RoundedCornerShape(16.dp))
                                .padding(12.dp)
                        ) {
                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Default.CreditCard,
                                        contentDescription = null,
                                        tint = ExpenseRed,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Spacer(modifier = Modifier.width(5.dp))
                                    Text(currentExpenseLabel, color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Medium, maxLines = 1)
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = if (totalExpense != null) formatVnd(totalExpense) else "--- ₫",
                                    color = TextPrimary,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                                )
                                Spacer(modifier = Modifier.height(3.dp))
                                Text(
                                    "Đã chi thực tế",
                                    color = ExpenseRed,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }

                        // Cột 2: Dự báo chi
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(16.dp))
                                .background(CardDarkSecondary)
                                .border(1.dp, AmberWarning.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
                                .padding(12.dp)
                        ) {
                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Default.AutoAwesome,
                                        contentDescription = null,
                                        tint = AmberWarning,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Spacer(modifier = Modifier.width(5.dp))
                                    Text(forecastLabel, color = AmberWarning, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = if (totalExpense != null) "~${formatVnd(projectedExpense)}" else "--- ₫",
                                    color = AmberWarning,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                                )
                                Spacer(modifier = Modifier.height(3.dp))
                                Text(
                                    if (totalExpense != null) "~${formatVnd(dailyAvg)}/ngày" else "---",
                                    color = TextSecondary,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Medium,
                                    maxLines = 1
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Action Buttons Row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Button(
                            onClick = onNavigateToChat,
                            modifier = Modifier
                                .weight(1f)
                                .height(46.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 10.dp)
                        ) {
                            Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(16.dp), tint = TextOnBrand)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Nhập AI", color = TextOnBrand, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        }

                        OutlinedButton(
                            onClick = onNavigateToTransactions,
                            modifier = Modifier
                                .weight(1f)
                                .height(46.dp),
                            shape = RoundedCornerShape(14.dp),
                            border = BorderStroke(1.dp, CardBorderSubtle),
                            colors = ButtonDefaults.outlinedButtonColors(containerColor = CardDarkSecondary),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 10.dp)
                        ) {
                            Icon(Icons.AutoMirrored.Filled.ReceiptLong, contentDescription = null, modifier = Modifier.size(16.dp), tint = TextPrimary)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Sổ thu chi", color = TextPrimary, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                        }
                    }
                }
            }
        }

        // Cashflow Milestone Tracker (Chỉ hiện khi ở chế độ Kỳ Lương)
        if (viewMode == DashboardViewMode.PAYCHECK_CYCLE) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(20.dp))
                        .background(CardDark)
                        .border(1.dp, CardBorderSubtle, RoundedCornerShape(20.dp))
                        .padding(16.dp)
                ) {
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                modifier = Modifier.weight(1f, fill = false),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(28.dp)
                                        .clip(CircleShape)
                                        .background(CyanAccent.copy(alpha = 0.15f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.Timeline, contentDescription = null, tint = CyanAccent, modifier = Modifier.size(16.dp))
                                }
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text("Cột mốc dòng tiền", color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                                    Text("Chu kỳ ${cycleInfo.totalDaysInCycle} ngày (${cycleInfo.shortDisplay})", color = TextMuted, fontSize = 11.sp)
                                }
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(EmeraldPrimary.copy(alpha = 0.15f))
                                    .padding(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    text = "${cycleInfo.currentDayInCycle}/${cycleInfo.totalDaysInCycle} ngày",
                                    color = EmeraldPrimary,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Progress Bar
                        val progress = (cycleInfo.currentDayInCycle.toFloat() / cycleInfo.totalDaysInCycle.toFloat()).coerceIn(0f, 1f)
                        LinearProgressIndicator(
                            progress = { progress },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(6.dp)
                                .clip(RoundedCornerShape(3.dp)),
                            color = EmeraldPrimary,
                            trackColor = CardBorderSubtle
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        // 2 Milestone Cards
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            // Milestone 1: Tiền nhà (20/09)
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(CardDarkSecondary)
                                    .border(1.dp, AmberWarning.copy(alpha = 0.25f), RoundedCornerShape(12.dp))
                                    .padding(10.dp)
                            ) {
                                Column {
                                    Text("🏠 Tiền nhà (${cycleInfo.rentDateDisplay})", color = TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        if (cycleInfo.daysUntilRent == 0) "Hôm nay!" else "Còn ${cycleInfo.daysUntilRent} ngày",
                                        color = AmberWarning,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }

                            // Milestone 2: Lương mới (23/09)
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(CardDarkSecondary)
                                    .border(1.dp, IncomeGreen.copy(alpha = 0.25f), RoundedCornerShape(12.dp))
                                    .padding(10.dp)
                            ) {
                                Column {
                                    Text("💰 Lương mới (${cycleInfo.nextPaycheckDateDisplay})", color = TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        if (cycleInfo.daysUntilNextPaycheck == 0) "Hôm nay!" else "Còn ${cycleInfo.daysUntilNextPaycheck} ngày",
                                        color = IncomeGreen,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Accounts List Section
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Tài khoản & Ví",
                    color = TextPrimary,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "${accounts.size} ví",
                    color = TextMuted,
                    fontSize = 12.sp
                )
            }
        }

        item {
            LazyRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(accounts) { acc ->
                    AccountChip(account = acc, modifier = Modifier.width(150.dp))
                }
            }
        }

        // Recent Transactions Section Header
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Giao dịch gần đây",
                    color = TextPrimary,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Xem tất cả",
                    color = CyanAccent,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.clickable { onNavigateToTransactions() }
                )
            }
        }

        if (recentTransactions.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(18.dp))
                        .background(CardDark)
                        .border(1.dp, CardBorderSubtle, RoundedCornerShape(18.dp))
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = if (isLoading) "Đang tải dữ liệu..." else "Chưa có giao dịch nào.",
                        color = TextSecondary,
                        fontSize = 14.sp
                    )
                }
            }
        } else {
            items(recentTransactions) { tx ->
                TransactionRow(transaction = tx)
            }
        }
    }
}

@Composable
fun AccountChip(account: Account, modifier: Modifier = Modifier) {
    val (typeIcon, tintColor) = when (account.type) {
        "bank" -> Pair(Icons.Default.AccountBalance, BlueAccent)
        "credit" -> Pair(Icons.Default.CreditCard, VioletAI)
        "e-wallet" -> Pair(Icons.Default.Smartphone, CyanAccent)
        else -> Pair(Icons.Default.Payments, EmeraldPrimary)
    }

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(18.dp))
            .background(CardDark)
            .border(1.dp, CardBorderSubtle, RoundedCornerShape(18.dp))
            .padding(14.dp)
    ) {
        Column {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(tintColor.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = typeIcon,
                        contentDescription = null,
                        tint = tintColor,
                        modifier = Modifier.size(16.dp)
                    )
                }
                Text(
                    text = account.name,
                    color = TextSecondary,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                )
            }
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = formatVnd(account.displayBalance),
                color = TextPrimary,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
fun TransactionRow(transaction: Transaction, onClick: (() -> Unit)? = null) {
    val isIncome = transaction.type == "income"
    val sign = if (isIncome) "+" else "-"
    val amtColor = if (isIncome) IncomeGreen else ExpenseRed

    val (categoryIcon, catTint) = when {
        transaction.categoryName?.contains("Ăn", ignoreCase = true) == true -> Pair(Icons.Default.Restaurant, AmberWarning)
        transaction.categoryName?.contains("Cà phê", ignoreCase = true) == true || transaction.note?.contains("cafe", ignoreCase = true) == true -> Pair(Icons.Default.LocalCafe, AmberWarning)
        transaction.categoryName?.contains("Nhà", ignoreCase = true) == true || transaction.note?.contains("Internet", ignoreCase = true) == true -> Pair(Icons.Default.Home, BlueAccent)
        transaction.categoryName?.contains("Mua", ignoreCase = true) == true || transaction.note?.contains("shopee", ignoreCase = true) == true -> Pair(Icons.Default.ShoppingBag, VioletAI)
        isIncome -> Pair(Icons.Default.TrendingUp, IncomeGreen)
        else -> Pair(Icons.Default.Receipt, CyanAccent)
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(CardDark)
            .border(1.dp, CardBorderSubtle, RoundedCornerShape(18.dp))
            .then(
                if (onClick != null) Modifier.clickable { onClick() } else Modifier
            )
            .padding(14.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Category Icon in soft squircle
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(catTint.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = categoryIcon,
                    contentDescription = null,
                    tint = catTint,
                    modifier = Modifier.size(22.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                // Top Row: Note (left) & Amount (right)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (!transaction.note.isNullOrBlank()) transaction.note else (transaction.categoryName ?: "Giao dịch"),
                        color = TextPrimary,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                        modifier = Modifier
                            .weight(1f, fill = false)
                            .padding(end = 8.dp)
                    )

                    Text(
                        text = "$sign${formatVnd(transaction.amount)}",
                        color = amtColor,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                // Bottom Row: Category badge (left) & Formatted Date (right)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(CardDarkSecondary)
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = transaction.categoryName ?: "Chưa phân loại",
                            color = catTint,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            maxLines = 1,
                            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                        )
                    }

                    Text(
                        text = formatDate(transaction.date),
                        color = TextMuted,
                        fontSize = 11.sp
                    )
                }
            }
        }
    }
}

fun formatDate(dateStr: String?): String {
    if (dateStr.isNullOrBlank()) return ""
    val parts = dateStr.split("-")
    if (parts.size == 3) {
        return "${parts[2]}/${parts[1]}/${parts[0]}"
    }
    return dateStr
}

fun checkNotificationListenerPermission(context: Context): Boolean {
    val enabledListeners = NotificationManagerCompat.getEnabledListenerPackages(context)
    return enabledListeners.contains(context.packageName)
}

fun formatVnd(amount: Double): String {
    val formatter = NumberFormat.getNumberInstance(Locale("vi", "VN")).apply {
        maximumFractionDigits = 0
    }
    return "${formatter.format(Math.round(amount))} ₫"
}
