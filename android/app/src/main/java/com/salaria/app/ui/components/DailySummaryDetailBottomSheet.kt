package com.salaria.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.salaria.app.data.api.ApiClient
import com.salaria.app.data.model.DailySummaryDto
import com.salaria.app.data.model.Transaction
import com.salaria.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DailySummaryDetailBottomSheet(
    summary: DailySummaryDto,
    onDismiss: () -> Unit,
    onEditTransaction: (Transaction) -> Unit
) {
    val context = LocalContext.current
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    var transactions by remember { mutableStateOf<List<Transaction>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    fun formatVnd(amount: Double): String {
        val formatter = NumberFormat.getNumberInstance(Locale("vi", "VN")).apply {
            maximumFractionDigits = 0
        }
        val rounded = kotlin.math.round(amount).toLong()
        return "${formatter.format(rounded)} ₫"
    }

    LaunchedEffect(summary.date) {
        if (summary.date.isNotBlank()) {
            isLoading = true
            try {
                val api = ApiClient.getApi(context)
                val res = withContext(Dispatchers.IO) {
                    api.getTransactions(
                        limit = 100,
                        startDate = summary.date,
                        endDate = summary.date
                    )
                }
                if (res.isSuccessful && res.body()?.data != null) {
                    transactions = res.body()!!.data!!
                }
            } catch (e: Exception) {
                // Safe fallback
            } finally {
                isLoading = false
            }
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = CardDark,
        dragHandle = {
            Surface(
                modifier = Modifier.padding(vertical = 12.dp),
                color = CardBorder,
                shape = CircleShape
            ) {
                Box(modifier = Modifier.size(width = 36.dp, height = 4.dp))
            }
        }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp)
        ) {
            // Header: Tiêu đề ngày & nút đóng
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "🌙 Chi tiết chi tiêu ngày ${summary.date}",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = "Báo cáo tổng kết lúc 22:30",
                        fontSize = 12.sp,
                        color = TextMuted
                    )
                }
                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .background(CardBorder)
                ) {
                    Icon(Icons.Default.Close, contentDescription = "Đóng", tint = TextSecondary, modifier = Modifier.size(16.dp))
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Thẻ tóm tắt số liệu & Lời khuyên AI
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(BgDark)
                    .border(1.dp, VioletAI.copy(alpha = 0.3f), RoundedCornerShape(16.dp))
                    .padding(14.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("💸 Đã chi trong ngày:", fontSize = 13.sp, color = TextSecondary)
                        Text(
                            text = "-${formatVnd(summary.todayExpense)}",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = ExpenseRed
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("🛡️ Hạn mức an toàn ngày mai:", fontSize = 13.sp, color = TextSecondary)
                        Text(
                            text = "${formatVnd(summary.safeToSpend)}/ngày",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = EmeraldPrimary
                        )
                    }

                    if (!summary.statusNote.isNullOrBlank()) {
                        HorizontalDivider(color = CardBorder.copy(alpha = 0.5f), thickness = 0.8.dp)
                        Row(verticalAlignment = Alignment.Top) {
                            Text("💡", fontSize = 13.sp)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = summary.statusNote,
                                fontSize = 12.sp,
                                color = VioletAILight,
                                lineHeight = 16.sp
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(18.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "CÁC KHOẢN CHI TIÊU (${transactions.size})",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextMuted,
                    letterSpacing = 0.5.sp
                )
                Text(
                    text = "Chạm để chỉnh sửa",
                    fontSize = 10.sp,
                    color = TextMuted
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            if (isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(140.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = EmeraldPrimary, modifier = Modifier.size(28.dp), strokeWidth = 2.5.dp)
                }
            } else if (transactions.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(120.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Không có khoản chi nào được ghi nhận trong ngày này 🎉",
                        fontSize = 12.sp,
                        color = TextMuted
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 320.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(transactions, key = { it.id }) { tx ->
                        val isExpense = tx.type == "expense"
                        val isTransfer = tx.type == "transfer"
                        val amountColor = if (isExpense) ExpenseRed else if (isTransfer) VioletAI else EmeraldPrimary
                        val sign = if (isExpense) "- " else if (isTransfer) "⇄ " else "+ "

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(BgDark.copy(alpha = 0.7f))
                                .border(0.8.dp, CardBorder, RoundedCornerShape(12.dp))
                                .clickable { onEditTransaction(tx) }
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(amountColor.copy(alpha = 0.12f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = when (tx.categoryId) {
                                        "cat_food" -> "🍜"
                                        "cat_transport" -> "⛽"
                                        "cat_housing" -> "🏠"
                                        "cat_utilities" -> "⚡"
                                        "cat_shopping" -> "🛒"
                                        "cat_health" -> "💊"
                                        "cat_entertainment" -> "🎬"
                                        "cat_salary" -> "💰"
                                        else -> if (isTransfer) "⇄" else "🏷️"
                                    },
                                    fontSize = 15.sp
                                )
                            }

                            Spacer(modifier = Modifier.width(12.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = tx.note?.ifBlank { tx.categoryName ?: "Chi tiêu" } ?: (tx.categoryName ?: "Chi tiêu"),
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = TextPrimary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    text = "${tx.categoryName ?: "Chưa phân loại"} • ${tx.createdAt?.takeLast(8) ?: ""}",
                                    fontSize = 10.sp,
                                    color = TextMuted
                                )
                            }

                            Text(
                                text = "$sign${formatVnd(tx.amount)}",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = amountColor
                            )
                        }
                    }
                }
            }
        }
    }
}
