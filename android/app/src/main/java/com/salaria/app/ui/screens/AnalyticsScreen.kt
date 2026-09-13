package com.salaria.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
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
import com.salaria.app.data.api.ApiClient
import com.salaria.app.data.model.*
import com.salaria.app.ui.components.EditTransactionBottomSheet
import com.salaria.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*

object AnalyticsCache {
    var analyticsData by mutableStateOf<MonthlyAnalyticsData?>(null)
    var advisorData by mutableStateOf<AdvisorData?>(null)
    var monthTransactions by mutableStateOf<List<Transaction>>(emptyList())
    var categories by mutableStateOf<List<Category>>(emptyList())
    var availableMonths by mutableStateOf<List<String>>(emptyList())
    var isLoaded by mutableStateOf(false)
}

@Composable
fun AnalyticsScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val currentMonthStr = remember {
        SimpleDateFormat("yyyy-MM", Locale.getDefault()).format(Date())
    }

    var selectedMonth by remember { mutableStateOf(currentMonthStr) }
    var availableMonths by remember { mutableStateOf(AnalyticsCache.availableMonths.ifEmpty { listOf(currentMonthStr) }) }

    val analyticsData = AnalyticsCache.analyticsData
    val advisorData = AnalyticsCache.advisorData
    val monthTransactions = AnalyticsCache.monthTransactions
    val categories = AnalyticsCache.categories
    var isLoading by remember { mutableStateOf(!AnalyticsCache.isLoaded) }

    val cycleInfo = remember { PaycheckCycleHelper.calculateCycle() }
    var isCycleMode by remember { mutableStateOf(true) } // Mặc định theo kỳ lương

    // Tab nhóm chi tiêu 50/30/20 được chọn để xem chi tiết: "needs", "wants", "savings"
    var selectedGroupTab by remember { mutableStateOf("needs") }
    var isGroupExpanded by remember { mutableStateOf(false) }
    var editingTransaction by remember { mutableStateOf<Transaction?>(null) }

    LaunchedEffect(selectedGroupTab) {
        isGroupExpanded = false
    }

    fun loadData(month: String, isCycle: Boolean = isCycleMode, silent: Boolean = false) {
        scope.launch {
            if (!silent && !AnalyticsCache.isLoaded) {
                isLoading = true
            }
            try {
                val api = ApiClient.getApi(context)
                val monthsRes = withContext(Dispatchers.IO) { api.getAvailableMonths() }
                if (monthsRes.isSuccessful && !monthsRes.body()?.data.isNullOrEmpty()) {
                    val list = monthsRes.body()!!.data!!
                    AnalyticsCache.availableMonths = list
                    availableMonths = list
                }

                val analyticsRes = withContext(Dispatchers.IO) {
                    if (isCycle) {
                        api.getMonthlyAnalytics(startDate = cycleInfo.startDate, endDate = cycleInfo.endDate)
                    } else {
                        api.getMonthlyAnalytics(month = month)
                    }
                }
                if (analyticsRes.isSuccessful && analyticsRes.body()?.data != null) {
                    AnalyticsCache.analyticsData = analyticsRes.body()!!.data
                }

                val advisorRes = withContext(Dispatchers.IO) {
                    if (isCycle) {
                        api.getAdvisor(startDate = cycleInfo.startDate, endDate = cycleInfo.endDate)
                    } else {
                        api.getAdvisor(month = month)
                    }
                }
                if (advisorRes.isSuccessful && advisorRes.body()?.data != null) {
                    AnalyticsCache.advisorData = advisorRes.body()!!.data
                }

                val txRes = withContext(Dispatchers.IO) {
                    if (isCycle) {
                        api.getTransactions(limit = 100, startDate = cycleInfo.startDate, endDate = cycleInfo.endDate)
                    } else {
                        api.getTransactions(limit = 100, month = month)
                    }
                }
                if (txRes.isSuccessful && txRes.body()?.data != null) {
                    AnalyticsCache.monthTransactions = txRes.body()!!.data!!
                }

                val catsRes = withContext(Dispatchers.IO) { api.getCategories() }
                if (catsRes.isSuccessful && catsRes.body()?.data != null) {
                    AnalyticsCache.categories = catsRes.body()!!.data!!
                }
                AnalyticsCache.isLoaded = true
            } catch (e: Exception) {
                // Keep current state
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(selectedMonth, isCycleMode) {
        loadData(selectedMonth, isCycleMode, silent = AnalyticsCache.isLoaded)
    }

    // Lắng nghe sự kiện toàn cục để tự động đồng bộ ngầm khi có giao dịch mới
    LaunchedEffect(Unit) {
        AppSyncBus.dataChangedFlow.collect {
            loadData(selectedMonth, isCycleMode, silent = true)
        }
    }

    fun formatDisplayMonth(m: String): String {
        val parts = m.split("-")
        return if (parts.size == 2) "Tháng ${parts[1]}/${parts[0]}" else m
    }

    fun prevMonth() {
        val idx = availableMonths.indexOf(selectedMonth)
        if (idx != -1 && idx < availableMonths.size - 1) {
            selectedMonth = availableMonths[idx + 1]
        }
    }

    fun nextMonth() {
        val idx = availableMonths.indexOf(selectedMonth)
        if (idx > 0) {
            selectedMonth = availableMonths[idx - 1]
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BgDark)
    ) {
        // Top Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(CardDark)
                .padding(horizontal = 16.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Phân tích tài chính", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                Text("Quy tắc 50/30/20 & Hiệu ứng Chi tiêu", color = TextSecondary, fontSize = 12.sp)
            }

            IconButton(
                onClick = { loadData(selectedMonth) },
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(CardDarkSecondary)
                    .border(1.dp, CardBorderSubtle, CircleShape)
            ) {
                Icon(Icons.Default.Refresh, contentDescription = "Tải lại", tint = CyanAccent, modifier = Modifier.size(18.dp))
            }
        }

        // Dual View Selector trong Analytics (Kỳ lương vs Theo tháng)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 6.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(CardDark)
                .border(1.dp, CardBorderSubtle, RoundedCornerShape(14.dp))
                .padding(3.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            // Mode 1: Kỳ lương (Mặc định)
            Box(
                modifier = Modifier
                    .weight(1.2f)
                    .clip(RoundedCornerShape(11.dp))
                    .background(if (isCycleMode) EmeraldPrimary.copy(alpha = 0.18f) else Color.Transparent)
                    .border(1.dp, if (isCycleMode) EmeraldPrimary.copy(alpha = 0.7f) else Color.Transparent, RoundedCornerShape(11.dp))
                    .clickable { isCycleMode = true }
                    .padding(vertical = 9.dp),
                contentAlignment = Alignment.Center
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.AccountBalanceWallet,
                        contentDescription = null,
                        tint = if (isCycleMode) EmeraldPrimary else TextSecondary,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Kỳ lương (${cycleInfo.shortDisplay})",
                        color = if (isCycleMode) EmeraldPrimary else TextSecondary,
                        fontWeight = if (isCycleMode) FontWeight.Bold else FontWeight.Medium,
                        fontSize = 12.sp
                    )
                }
            }

            // Mode 2: Theo tháng
            Box(
                modifier = Modifier
                    .weight(0.8f)
                    .clip(RoundedCornerShape(11.dp))
                    .background(if (!isCycleMode) CyanAccent.copy(alpha = 0.18f) else Color.Transparent)
                    .border(1.dp, if (!isCycleMode) CyanAccent.copy(alpha = 0.7f) else Color.Transparent, RoundedCornerShape(11.dp))
                    .clickable { isCycleMode = false }
                    .padding(vertical = 9.dp),
                contentAlignment = Alignment.Center
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.CalendarMonth,
                        contentDescription = null,
                        tint = if (!isCycleMode) CyanAccent else TextSecondary,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Theo tháng",
                        color = if (!isCycleMode) CyanAccent else TextSecondary,
                        fontWeight = if (!isCycleMode) FontWeight.Bold else FontWeight.Medium,
                        fontSize = 12.sp
                    )
                }
            }
        }

        if (isCycleMode) {
            // Thanh trạng thái chu kỳ lương
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(EmeraldPrimary.copy(alpha = 0.1f))
                    .border(1.dp, EmeraldPrimary.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Schedule, contentDescription = null, tint = EmeraldPrimary, modifier = Modifier.size(15.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = cycleInfo.displayTitle,
                        color = TextPrimary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                Text(
                    text = "Đã qua ${cycleInfo.currentDayInCycle}/${cycleInfo.totalDaysInCycle} ngày",
                    color = EmeraldPrimary,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        } else {
            // Month Selector Bar (Theo tháng dương lịch)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(CardDark)
                    .border(1.dp, CardBorderSubtle, RoundedCornerShape(14.dp))
                    .padding(horizontal = 8.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                val currIdx = availableMonths.indexOf(selectedMonth)
                val canGoPrev = currIdx != -1 && currIdx < availableMonths.size - 1
                val canGoNext = currIdx > 0

                IconButton(
                    onClick = { prevMonth() },
                    enabled = canGoPrev,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Tháng trước",
                        tint = if (canGoPrev) TextPrimary else TextMuted,
                        modifier = Modifier.size(18.dp)
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CalendarMonth, contentDescription = null, tint = EmeraldPrimary, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = formatDisplayMonth(selectedMonth),
                        color = TextPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }

                IconButton(
                    onClick = { nextMonth() },
                    enabled = canGoNext,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowForward,
                        contentDescription = "Tháng sau",
                        tint = if (canGoNext) TextPrimary else TextMuted,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = EmeraldPrimary, modifier = Modifier.size(36.dp))
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
                contentPadding = PaddingValues(top = 4.dp, bottom = 28.dp)
            ) {
                // 1. Monthly Overview Banner (Thu - Chi - Tỷ lệ tích lũy)
                item {
                    val inc = analyticsData?.totalIncome ?: 0.0
                    val exp = analyticsData?.totalExpense ?: 0.0
                    val rate = analyticsData?.savingsRate ?: 0

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(18.dp))
                            .background(CardDark)
                            .border(1.dp, CardBorderSubtle, RoundedCornerShape(18.dp))
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceAround
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Tổng thu", color = TextMuted, fontSize = 11.sp)
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                "+${formatVnd(inc)}",
                                color = IncomeGreen,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Box(
                            modifier = Modifier
                                .width(1.dp)
                                .height(36.dp)
                                .background(CardBorderSubtle)
                        )

                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Tổng chi", color = TextMuted, fontSize = 11.sp)
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                "-${formatVnd(exp)}",
                                color = ExpenseRed,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Box(
                            modifier = Modifier
                                .width(1.dp)
                                .height(36.dp)
                                .background(CardBorderSubtle)
                        )

                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Tỷ lệ tiết kiệm", color = TextMuted, fontSize = 11.sp)
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                if (inc > 0) "$rate%" else "0%",
                                color = if (inc > 0) CyanAccent else TextMuted,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }

                // 2. Financial Health Score Card
                item {
                    val score = advisorData?.healthScore ?: 75
                    val level = advisorData?.scoreLevel ?: "Tốt"
                    val scoreColor = when {
                        score >= 85 -> IncomeGreen
                        score >= 70 -> CyanAccent
                        score >= 50 -> AmberWarning
                        else -> ExpenseRed
                    }

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(20.dp))
                            .background(CardDark)
                            .border(1.dp, CardBorderSubtle, RoundedCornerShape(20.dp))
                            .padding(16.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(48.dp)
                                        .clip(CircleShape)
                                        .background(scoreColor.copy(alpha = 0.15f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        "$score",
                                        color = scoreColor,
                                        fontSize = 20.sp,
                                        fontWeight = FontWeight.ExtraBold
                                    )
                                }
                                Spacer(modifier = Modifier.width(14.dp))
                                Column {
                                    Text("Sức khỏe tài chính", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                    Text("Xếp loại: $level", color = scoreColor, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                }
                            }

                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(scoreColor.copy(alpha = 0.2f))
                                    .padding(horizontal = 10.dp, vertical = 5.dp)
                            ) {
                                Text(
                                    if (score >= 70) "Rất ổn định" else "Cần cân đối",
                                    color = scoreColor,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }

                // 3. Quy tắc 50/30/20 với TABS CHI TIẾT TỪNG KHOẢN ĐÃ CHI
                item {
                    val rule = advisorData?.rule503020
                    val gb = analyticsData?.groupBreakdown
                    val hasIncome = (analyticsData?.totalIncome ?: 0.0) > 0

                    val needsAmt = rule?.needs?.actual ?: gb?.needs ?: 0.0
                    val wantsAmt = rule?.wants?.actual ?: gb?.wants ?: 0.0
                    val savingsAmt = if (hasIncome) (rule?.savings?.actual ?: gb?.savings ?: 0.0) else 0.0

                    val needsPct = rule?.needs?.actualPercent ?: gb?.needsPercentage ?: 0
                    val wantsPct = rule?.wants?.actualPercent ?: gb?.wantsPercentage ?: 0
                    val savingsPct = if (hasIncome) (rule?.savings?.actualPercent ?: gb?.savingsPercentage ?: 0) else 0

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
                                Text("Quy tắc quản lý 50 / 30 / 20", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(CardDarkSecondary)
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Text("Chuẩn quốc tế", color = TextSecondary, fontSize = 11.sp)
                                }
                            }

                            Spacer(modifier = Modifier.height(14.dp))

                            // 50% Needs Bar
                            RuleProgressBar(
                                title = "Thiết yếu (Needs)",
                                targetStr = "Tối đa 50%",
                                actualAmt = needsAmt,
                                actualPercent = needsPct,
                                targetPercent = 50,
                                barColor = EmeraldPrimary,
                                hasIncome = hasIncome
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            // 30% Wants Bar
                            RuleProgressBar(
                                title = "Sở thích (Wants)",
                                targetStr = "Tối đa 30%",
                                actualAmt = wantsAmt,
                                actualPercent = wantsPct,
                                targetPercent = 30,
                                barColor = VioletAI,
                                hasIncome = hasIncome
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            // 20% Savings Bar
                            RuleProgressBar(
                                title = "Tích lũy & Tiết kiệm",
                                targetStr = "Tối thiểu 20%",
                                actualAmt = savingsAmt,
                                actualPercent = savingsPct,
                                targetPercent = 20,
                                barColor = AmberWarning,
                                hasIncome = hasIncome
                            )

                            Spacer(modifier = Modifier.height(18.dp))
                            HorizontalDivider(color = CardBorderSubtle)
                            Spacer(modifier = Modifier.height(14.dp))

                            // TABS XEM CHI TIẾT TỪNG KHOẢN ĐÃ CHI
                            Text("Xem chi tiết các khoản đã chi theo nhóm:", color = TextSecondary, fontSize = 12.sp)
                            Spacer(modifier = Modifier.height(8.dp))

                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(CardDarkSecondary)
                                    .padding(3.dp),
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                val groupTabs = listOf(
                                    Triple("needs", "🟢 Thiết yếu", EmeraldPrimary),
                                    Triple("wants", "🟣 Sở thích", VioletAI),
                                    Triple("savings", "🟡 Tích lũy", AmberWarning)
                                )

                                groupTabs.forEach { (key, title, color) ->
                                    val isSelected = selectedGroupTab == key
                                    Box(
                                        modifier = Modifier
                                            .weight(1f)
                                            .clip(RoundedCornerShape(10.dp))
                                            .background(if (isSelected) color.copy(alpha = 0.2f) else Color.Transparent)
                                            .border(1.dp, if (isSelected) color else Color.Transparent, RoundedCornerShape(10.dp))
                                            .clickable { selectedGroupTab = key }
                                            .padding(vertical = 7.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = title,
                                            color = if (isSelected) color else TextSecondary,
                                            fontSize = 11.sp,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                            maxLines = 1
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            // Danh sách các giao dịch thuộc nhóm được chọn
                            val catMap = categories.associateBy { it.id }
                            val filteredGroupTxs = monthTransactions.filter { tx ->
                                when (selectedGroupTab) {
                                    "needs" -> {
                                        val catGroup = catMap[tx.categoryId]?.groupType ?: "needs"
                                        tx.type == "expense" && catGroup == "needs"
                                    }
                                    "wants" -> {
                                        val catGroup = catMap[tx.categoryId]?.groupType ?: "needs"
                                        tx.type == "expense" && catGroup == "wants"
                                    }
                                    "savings" -> {
                                        tx.type == "income"
                                    }
                                    else -> false
                                }
                            }

                            if (filteredGroupTxs.isEmpty()) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 12.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        when (selectedGroupTab) {
                                            "savings" -> "Chưa có khoản thu nhập/tích lũy nào trong kỳ này."
                                            "wants" -> "Chưa có khoản chi sở thích nào."
                                            else -> "Chưa có khoản chi thiết yếu nào."
                                        },
                                        color = TextMuted,
                                        fontSize = 12.sp
                                    )
                                }
                            } else {
                                val displayList = if (isGroupExpanded) filteredGroupTxs else filteredGroupTxs.take(5)
                                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    displayList.forEach { tx ->
                                        val isIncome = tx.type == "income"
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .clip(RoundedCornerShape(10.dp))
                                                .background(CardDarkSecondary)
                                                .clickable { editingTransaction = tx }
                                                .padding(horizontal = 12.dp, vertical = 9.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Row(verticalAlignment = Alignment.CenterVertically) {
                                                    Text(
                                                        tx.note ?: "Giao dịch",
                                                        color = TextPrimary,
                                                        fontSize = 13.sp,
                                                        fontWeight = FontWeight.Medium,
                                                        maxLines = 1,
                                                        modifier = Modifier.weight(1f, fill = false)
                                                    )
                                                    Spacer(modifier = Modifier.width(6.dp))
                                                    Icon(
                                                        Icons.Default.Edit,
                                                        contentDescription = "Chỉnh sửa",
                                                        tint = TextMuted.copy(alpha = 0.5f),
                                                        modifier = Modifier.size(12.dp)
                                                    )
                                                }
                                                Text(
                                                    "${tx.date} • ${tx.categoryName ?: "Chưa phân loại"}",
                                                    color = TextMuted,
                                                    fontSize = 11.sp
                                                )
                                            }

                                            Text(
                                                text = "${if (isIncome) "+" else "-"}${formatVnd(tx.amount)}",
                                                color = if (isIncome) IncomeGreen else ExpenseRed,
                                                fontSize = 13.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }

                                    if (filteredGroupTxs.size > 5) {
                                        Box(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .clip(RoundedCornerShape(10.dp))
                                                .background(CardBorderSubtle.copy(alpha = 0.35f))
                                                .border(1.dp, CardBorderSubtle, RoundedCornerShape(10.dp))
                                                .clickable { isGroupExpanded = !isGroupExpanded }
                                                .padding(vertical = 9.dp),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                text = if (isGroupExpanded) "Thu gọn ▴" else "Xem thêm ${filteredGroupTxs.size - 5} khoản khác ▾",
                                                color = CyanAccent,
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.SemiBold
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // 4. Hiệu ứng Chi tiêu Nhỏ lẻ (The Latte / Vanilla Factor Card)
                item {
                    val latteInsight = advisorData?.keyInsights?.find { it.title?.contains("Latte", ignoreCase = true) == true }

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(20.dp))
                            .background(CardDark)
                            .border(1.dp, AmberWarning.copy(alpha = 0.35f), RoundedCornerShape(20.dp))
                            .padding(16.dp)
                    ) {
                        Column {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(34.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(AmberWarning.copy(alpha = 0.15f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.Coffee, contentDescription = null, tint = AmberWarning, modifier = Modifier.size(20.dp))
                                }
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text("Hiệu ứng Chi tiêu Nhỏ lẻ (Latte Factor)", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                    Text("Theo dõi các khoản chi vụn vặt ≤ 60.000 ₫", color = AmberWarning, fontSize = 11.sp)
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            Text(
                                text = latteInsight?.description ?: "Chưa phát hiện khoản chi nhỏ lẻ đáng chú ý trong tháng này.",
                                color = TextPrimary,
                                fontSize = 13.sp,
                                lineHeight = 19.sp
                            )

                            Spacer(modifier = Modifier.height(10.dp))

                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(CardDarkSecondary)
                                    .padding(10.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Lightbulb, contentDescription = null, tint = AmberWarning, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        "Các khoản cà phê, trà sữa, snack nếu cắt giảm 50% có thể giúp bạn tiết kiệm thêm từ 500k - 1tr mỗi tháng!",
                                        color = TextSecondary,
                                        fontSize = 11.sp,
                                        lineHeight = 16.sp
                                    )
                                }
                            }
                        }
                    }
                }

                // 5. GỢI Ý TỪ SALARIA COPILOT (LUÔN HIỂN THỊ TRANG TRỌNG)
                item {
                    val allInsights = advisorData?.keyInsights?.filter { it.title?.contains("Latte", ignoreCase = true) != true } ?: emptyList()

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(20.dp))
                            .background(CardDark)
                            .border(1.dp, VioletAI.copy(alpha = 0.45f), RoundedCornerShape(20.dp))
                            .padding(16.dp)
                    ) {
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(34.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(Brush.linearGradient(listOf(VioletAI, EmeraldPrimary))),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                                }
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text("Lời khuyên từ Salaria Copilot", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                    Text("Workers AI Financial Advisor", color = VioletAILight, fontSize = 11.sp)
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            if (allInsights.isEmpty()) {
                                Text(
                                    "💡 Tháng này bạn đang cân đối chi tiêu khá ổn định. Hãy ghi nhận thêm thu nhập (lương, thưởng) để kích hoạt chuẩn xác tỷ lệ 50/30/20 nhé!",
                                    color = TextSecondary,
                                    fontSize = 13.sp,
                                    lineHeight = 18.sp
                                )
                            } else {
                                allInsights.forEach { ins ->
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 4.dp),
                                        verticalAlignment = Alignment.Top
                                    ) {
                                        Text("•", color = VioletAILight, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Column {
                                            if (!ins.title.isNullOrBlank()) {
                                                Text(ins.title, color = TextPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                            }
                                            Text(ins.description ?: "", color = TextSecondary, fontSize = 12.sp, lineHeight = 17.sp)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // 6. Cơ cấu Danh mục Chi tiêu lớn nhất (Top Categories)
                item {
                    val cats = analyticsData?.categories ?: emptyList()
                    if (cats.isNotEmpty()) {
                        Column {
                            Text("Phân bổ chi tiêu theo danh mục", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            Spacer(modifier = Modifier.height(10.dp))

                            cats.forEach { cat ->
                                CategoryBreakdownRow(cat = cat)
                                Spacer(modifier = Modifier.height(8.dp))
                            }
                        }
                    }
                }
            }
        }

        if (editingTransaction != null) {
            EditTransactionBottomSheet(
                transaction = editingTransaction!!,
                categories = categories,
                onDismiss = { editingTransaction = null },
                onSuccess = {
                    loadData(selectedMonth, isCycleMode, silent = true)
                    AppSyncBus.notifyDataChanged()
                }
            )
        }
    }
}

@Composable
fun RuleProgressBar(
    title: String,
    targetStr: String,
    actualAmt: Double,
    actualPercent: Int,
    targetPercent: Int,
    barColor: Color,
    hasIncome: Boolean = true
) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(title, color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Medium)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(formatVnd(actualAmt), color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    if (hasIncome) "($actualPercent%)" else if (actualPercent > 0) "($actualPercent% chi)" else "(0%)",
                    color = barColor,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        Spacer(modifier = Modifier.height(6.dp))

        // Progress track
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(CardDarkSecondary)
        ) {
            val fillFraction = (actualPercent.toFloat() / 100f).coerceIn(0f, 1f)
            Box(
                modifier = Modifier
                    .fillMaxWidth(fillFraction)
                    .fillMaxHeight()
                    .clip(RoundedCornerShape(4.dp))
                    .background(barColor)
            )
        }

        Spacer(modifier = Modifier.height(4.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("Mục tiêu: $targetStr", color = TextMuted, fontSize = 11.sp)
            val statusText = when {
                !hasIncome && title.contains("Tích lũy") -> "Chưa có thu nhập trong kỳ này"
                !hasIncome -> "Tỷ lệ trên tổng chi"
                actualPercent <= targetPercent && !title.contains("Tích lũy") -> "Đạt mục tiêu ✓"
                actualPercent >= targetPercent && title.contains("Tích lũy") -> "Đạt mục tiêu ✓"
                else -> "Cần cân đối ⚠️"
            }
            val statusColor = when {
                !hasIncome -> TextMuted
                statusText.contains("✓") -> IncomeGreen
                else -> AmberWarning
            }
            Text(
                statusText,
                color = statusColor,
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

@Composable
fun CategoryBreakdownRow(cat: CategoryStat) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(CardDark)
            .border(1.dp, CardBorderSubtle, RoundedCornerShape(14.dp))
            .padding(12.dp)
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(CyanLight.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Category, contentDescription = null, tint = CyanAccent, modifier = Modifier.size(16.dp))
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(cat.categoryName ?: "Khác", color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("-${formatVnd(cat.amount)}", color = ExpenseRed, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.width(8.dp))
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(CardDarkSecondary)
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text("${cat.percentage}%", color = TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Mini bar
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(4.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(CardDarkSecondary)
            ) {
                val fraction = (cat.percentage.toFloat() / 100f).coerceIn(0f, 1f)
                Box(
                    modifier = Modifier
                        .fillMaxWidth(fraction)
                        .fillMaxHeight()
                        .clip(RoundedCornerShape(2.dp))
                        .background(CyanAccent)
                )
            }
        }
    }
}

