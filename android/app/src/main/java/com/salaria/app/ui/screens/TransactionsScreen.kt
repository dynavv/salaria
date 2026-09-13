package com.salaria.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.salaria.app.data.api.ApiClient
import com.salaria.app.data.model.Category
import com.salaria.app.data.model.PaycheckCycleHelper
import com.salaria.app.data.model.PaycheckCycleInfo
import com.salaria.app.data.model.Transaction
import com.salaria.app.data.model.UpdateTransactionRequest
import com.salaria.app.data.model.AppSyncBus
import com.salaria.app.ui.components.EditTransactionBottomSheet
import com.salaria.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

enum class TransactionsTimeFilter {
    PAYCHECK_CYCLE, // Mặc định: Kỳ lương (22/08 - 21/09)
    CALENDAR_MONTH, // Tháng hiện tại
    ALL             // Toàn bộ lịch sử
}

object TransactionsCache {
    var transactions by mutableStateOf<List<Transaction>>(emptyList())
    var categories by mutableStateOf<List<Category>>(emptyList())
    var availableMonths by mutableStateOf<List<String>>(emptyList())
    var isLoaded by mutableStateOf(false)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransactionsScreen(
    autoOpenTxId: String? = null,
    onAutoOpenConsumed: () -> Unit = {}
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val cycleInfo = remember { PaycheckCycleHelper.calculateCycle() }
    var timeFilter by remember { mutableStateOf(TransactionsTimeFilter.PAYCHECK_CYCLE) }

    val defaultMonth = remember { SimpleDateFormat("yyyy-MM", Locale.getDefault()).format(Date()) }
    var selectedMonthStr by remember { mutableStateOf(defaultMonth) }
    var showMonthDropdown by remember { mutableStateOf(false) }
    var availableMonths by remember { mutableStateOf(TransactionsCache.availableMonths.ifEmpty { listOf(defaultMonth) }) }

    val transactions = TransactionsCache.transactions
    val categories = TransactionsCache.categories
    var isLoading by remember { mutableStateOf(!TransactionsCache.isLoaded) }
    var selectedFilter by remember { mutableStateOf("all") } // "all", "expense", "income"

    var editingTransaction by remember { mutableStateOf<Transaction?>(null) }
    var isSaving by remember { mutableStateOf(false) }

    fun loadData(currentFilter: TransactionsTimeFilter = timeFilter, silent: Boolean = false) {
        scope.launch {
            if (!silent && !TransactionsCache.isLoaded) {
                isLoading = true
            }
            try {
                val api = ApiClient.getApi(context)
                val res = withContext(Dispatchers.IO) {
                    when (currentFilter) {
                        TransactionsTimeFilter.PAYCHECK_CYCLE -> {
                            api.getTransactions(
                                limit = 100,
                                startDate = cycleInfo.startDate,
                                endDate = cycleInfo.endDate
                            )
                        }
                        TransactionsTimeFilter.CALENDAR_MONTH -> {
                            api.getTransactions(limit = 100, month = selectedMonthStr)
                        }
                        TransactionsTimeFilter.ALL -> {
                            api.getTransactions(limit = 100)
                        }
                    }
                }
                if (res.isSuccessful && res.body()?.data != null) {
                    TransactionsCache.transactions = res.body()!!.data!!
                }
                val catsRes = withContext(Dispatchers.IO) { api.getCategories() }
                if (catsRes.isSuccessful && catsRes.body()?.data != null) {
                    TransactionsCache.categories = catsRes.body()!!.data!!
                }
                val monthsRes = withContext(Dispatchers.IO) { api.getAvailableMonths() }
                if (monthsRes.isSuccessful && monthsRes.body()?.data != null) {
                    val list = monthsRes.body()!!.data!!
                    if (list.isNotEmpty()) {
                        TransactionsCache.availableMonths = list
                        availableMonths = list
                    }
                }
                TransactionsCache.isLoaded = true
            } catch (e: Exception) {
                // Keep existing
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(timeFilter) {
        loadData(timeFilter, silent = TransactionsCache.isLoaded)
    }

    // Lắng nghe sự kiện toàn cục để tự động đồng bộ ngầm khi có giao dịch mới
    LaunchedEffect(Unit) {
        AppSyncBus.dataChangedFlow.collect {
            loadData(timeFilter, silent = true)
        }
    }

    LaunchedEffect(transactions, autoOpenTxId) {
        if (autoOpenTxId != null && transactions.isNotEmpty()) {
            val found = transactions.find { it.id == autoOpenTxId }
            if (found != null) {
                editingTransaction = found
                onAutoOpenConsumed()
            }
        }
    }

    val filteredList = when (selectedFilter) {
        "expense" -> transactions.filter { it.type == "expense" }
        "income" -> transactions.filter { it.type == "income" }
        else -> transactions
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BgDark)
    ) {
        // Top Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(CardDark)
                .padding(horizontal = 16.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Sổ thu chi", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                Text("Chạm vào giao dịch để chỉnh sửa hoặc xóa", color = TextSecondary, fontSize = 12.sp)
            }

            IconButton(
                onClick = { loadData(timeFilter) },
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(CardDarkSecondary)
                    .border(1.dp, CardBorderSubtle, CircleShape)
            ) {
                Icon(Icons.Default.Refresh, contentDescription = "Tải lại", tint = CyanAccent, modifier = Modifier.size(18.dp))
            }
        }

        // Dual View Selector (Kỳ lương vs Tháng 09 vs Tất cả - Mặc định là Kỳ lương)
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
            val isCycle = timeFilter == TransactionsTimeFilter.PAYCHECK_CYCLE
            val isMonth = timeFilter == TransactionsTimeFilter.CALENDAR_MONTH
            val isAll = timeFilter == TransactionsTimeFilter.ALL

            // Mode 1: Kỳ lương (Mặc định)
            Box(
                modifier = Modifier
                    .weight(1.2f)
                    .clip(RoundedCornerShape(11.dp))
                    .background(if (isCycle) EmeraldPrimary.copy(alpha = 0.18f) else Color.Transparent)
                    .border(1.dp, if (isCycle) EmeraldPrimary.copy(alpha = 0.7f) else Color.Transparent, RoundedCornerShape(11.dp))
                    .clickable { timeFilter = TransactionsTimeFilter.PAYCHECK_CYCLE }
                    .padding(vertical = 5.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.AccountBalanceWallet,
                            contentDescription = null,
                            tint = if (isCycle) EmeraldPrimary else TextSecondary,
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Kỳ lương",
                            color = if (isCycle) EmeraldPrimary else TextSecondary,
                            fontWeight = if (isCycle) FontWeight.Bold else FontWeight.Medium,
                            fontSize = 11.sp
                        )
                    }
                    Text(
                        text = cycleInfo.shortDisplay,
                        color = if (isCycle) EmeraldPrimary else TextMuted,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Normal
                    )
                }
            }

            // Mode 2: Theo Tháng (Có Dropdown)
            Box(
                modifier = Modifier
                    .weight(1.1f)
                    .clip(RoundedCornerShape(11.dp))
                    .background(if (isMonth) CyanAccent.copy(alpha = 0.18f) else Color.Transparent)
                    .border(1.dp, if (isMonth) CyanAccent.copy(alpha = 0.7f) else Color.Transparent, RoundedCornerShape(11.dp))
                    .clickable {
                        if (timeFilter != TransactionsTimeFilter.CALENDAR_MONTH) {
                            timeFilter = TransactionsTimeFilter.CALENDAR_MONTH
                        } else {
                            showMonthDropdown = true
                        }
                    }
                    .padding(vertical = 5.dp),
                contentAlignment = Alignment.Center
            ) {
                val displayMonth = if (selectedMonthStr.length >= 7) {
                    "Tháng " + selectedMonthStr.substring(5)
                } else "Tháng"

                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.CalendarMonth,
                            contentDescription = null,
                            tint = if (isMonth) CyanAccent else TextSecondary,
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(modifier = Modifier.width(3.dp))
                        Text(
                            text = displayMonth,
                            color = if (isMonth) CyanAccent else TextSecondary,
                            fontWeight = if (isMonth) FontWeight.Bold else FontWeight.Medium,
                            fontSize = 11.sp
                        )
                        Icon(
                            Icons.Default.ArrowDropDown,
                            contentDescription = "Chọn tháng",
                            tint = if (isMonth) CyanAccent else TextSecondary,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                    Text(
                        text = selectedMonthStr,
                        color = if (isMonth) CyanAccent else TextMuted,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Normal
                    )
                }

                DropdownMenu(
                    expanded = showMonthDropdown,
                    onDismissRequest = { showMonthDropdown = false },
                    modifier = Modifier.background(CardDark)
                ) {
                    availableMonths.forEach { m ->
                        val isSel = m == selectedMonthStr
                        DropdownMenuItem(
                            text = {
                                Text(
                                    text = if (m.length >= 7) "Tháng " + m.substring(5) + " (" + m.substring(0, 4) + ")" else m,
                                    color = if (isSel) CyanAccent else TextPrimary,
                                    fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal
                                )
                            },
                            onClick = {
                                selectedMonthStr = m
                                showMonthDropdown = false
                                timeFilter = TransactionsTimeFilter.CALENDAR_MONTH
                                loadData(TransactionsTimeFilter.CALENDAR_MONTH)
                            }
                        )
                    }
                }
            }

            // Mode 3: Tất cả
            Box(
                modifier = Modifier
                    .weight(0.75f)
                    .clip(RoundedCornerShape(11.dp))
                    .background(if (isAll) VioletAI.copy(alpha = 0.2f) else Color.Transparent)
                    .border(1.dp, if (isAll) VioletAI.copy(alpha = 0.7f) else Color.Transparent, RoundedCornerShape(11.dp))
                    .clickable { timeFilter = TransactionsTimeFilter.ALL }
                    .padding(vertical = 10.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Tất cả",
                    color = if (isAll) VioletAI else TextSecondary,
                    fontWeight = if (isAll) FontWeight.Bold else FontWeight.Medium,
                    fontSize = 11.sp,
                    maxLines = 1
                )
            }
        }

        // Modern Segmented Filter Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(CardDark)
                .border(1.dp, CardBorderSubtle, RoundedCornerShape(14.dp))
                .padding(4.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            val filterOptions = listOf(
                Triple("all", "Tất cả", EmeraldPrimary),
                Triple("expense", "Khoản chi (-)", ExpenseRed),
                Triple("income", "Khoản thu (+)", IncomeGreen)
            )

            filterOptions.forEach { (key, label, activeColor) ->
                val selected = selectedFilter == key
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(10.dp))
                        .background(if (selected) activeColor.copy(alpha = 0.2f) else Color.Transparent)
                        .border(
                            1.dp,
                            if (selected) activeColor.copy(alpha = 0.6f) else Color.Transparent,
                            RoundedCornerShape(10.dp)
                        )
                        .clickable { selectedFilter = key }
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = label,
                        color = if (selected) activeColor else TextSecondary,
                        fontSize = 12.sp,
                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                        maxLines = 1
                    )
                }
            }
        }

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = EmeraldPrimary, modifier = Modifier.size(32.dp))
            }
        } else if (filteredList.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.FilterList, contentDescription = null, tint = TextMuted, modifier = Modifier.size(48.dp))
                    Spacer(modifier = Modifier.height(12.dp))
                    Text("Không có giao dịch nào phù hợp.", color = TextSecondary, fontSize = 14.sp)
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                contentPadding = PaddingValues(top = 4.dp, bottom = 24.dp)
            ) {
                items(filteredList, key = { it.id }) { tx ->
                    TransactionRow(
                        transaction = tx,
                        onClick = { editingTransaction = tx }
                    )
                }
            }
        }
    }

    // Modal Bottom Sheet Chỉnh sửa & Xóa giao dịch
    if (editingTransaction != null) {
        EditTransactionBottomSheet(
            transaction = editingTransaction!!,
            categories = categories,
            onDismiss = { editingTransaction = null },
            onSuccess = {
                loadData(timeFilter, silent = true)
                AppSyncBus.notifyDataChanged()
            },
            onDeleted = {
                TransactionsCache.transactions = TransactionsCache.transactions.filter { it.id != editingTransaction!!.id }
                loadData(timeFilter, silent = true)
                AppSyncBus.notifyDataChanged()
            }
        )
    }
}
