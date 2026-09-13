package com.salaria.app.ui.screens

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Edit
import androidx.compose.ui.text.style.TextOverflow
import com.salaria.app.data.model.*
import com.salaria.app.ui.components.EditTransactionBottomSheet
import com.salaria.app.ui.components.DailySummaryDetailBottomSheet
import com.salaria.app.data.model.AppSyncBus
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.salaria.app.data.api.ApiClient
import com.salaria.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.UUID

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ChatScreen(
    highlightTxId: String? = null,
    onHighlightConsumed: () -> Unit = {}
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState(
        initialFirstVisibleItemIndex = if (ChatManager.messages.isNotEmpty()) ChatManager.messages.size - 1 else 0
    )

    var inputText by remember { mutableStateOf("") }
    var isSending by remember { mutableStateOf(false) }

    // Quản lý trạng thái từ ChatManager (cache trong phiên, không tải lại khi chuyển tab)
    val messages = ChatManager.messages
    val isLoadingHistory = ChatManager.isLoadingHistory

    var categories by remember { mutableStateOf<List<Category>>(emptyList()) }
    var editingTransaction by remember { mutableStateOf<Transaction?>(null) }
    var viewingDailySummary by remember { mutableStateOf<DailySummaryDto?>(null) }
    var quotedMessage by remember { mutableStateOf<ChatMessage?>(null) }


    fun loadHistory(forceRefresh: Boolean = false) {
        scope.launch {
            try {
                val api = ApiClient.getApi()
                ChatManager.loadHistory(api, forceRefresh)
            } catch (e: Exception) {
                Log.e("ChatScreen", "Lỗi tải lịch sử chat: ${e.message}")
            }
        }
    }

    LaunchedEffect(Unit) {
        loadHistory(forceRefresh = false)
        try {
            val api = ApiClient.getApi()
            val catRes = withContext(Dispatchers.IO) { api.getCategories() }
            if (catRes.isSuccessful && catRes.body()?.data != null) {
                categories = catRes.body()!!.data!!
            }
        } catch (e: Exception) {
            Log.e("ChatScreen", "Lỗi tải categories: ${e.message}")
        }
    }

    // Lắng nghe sự kiện đồng bộ toàn cục từ AppSyncBus (Silent Sync)
    LaunchedEffect(Unit) {
        AppSyncBus.dataChangedFlow.collect {
            loadHistory(forceRefresh = false)
        }
    }

    // Tự động cuộn đến giao dịch được chỉ định (Deep link từ notification)
    LaunchedEffect(highlightTxId, messages.size) {
        if (highlightTxId != null && messages.isNotEmpty()) {
            val idx = messages.indexOfFirst { it.targetTxId == highlightTxId || it.transaction?.id == highlightTxId }
            if (idx != -1) {
                listState.animateScrollToItem(idx)
                onHighlightConsumed()
            }
        }
    }

    fun sendMessage(customText: String? = null) {
        val rawText = customText ?: inputText
        val text = rawText.trim()
        if (text.isBlank() || isSending) return

        val currentQuote = quotedMessage
        val quoteTxId = currentQuote?.targetTxId ?: currentQuote?.transaction?.id

        val userMsgId = UUID.randomUUID().toString()
        messages.add(
            ChatMessage(
                id = userMsgId,
                text = text,
                isFromUser = true,
                targetTxId = quoteTxId
            )
        )
        if (customText == null) {
            inputText = ""
        }
        quotedMessage = null // Hủy thanh trích dẫn sau khi gửi

        val botMsgId = UUID.randomUUID().toString()
        messages.add(ChatMessage(id = botMsgId, text = "Đang xử lý qua Cloudflare Worker...", isFromUser = false, isLoading = true))

        scope.launch {
            isSending = true
            try {
                val api = ApiClient.getApi()
                val response = withContext(Dispatchers.IO) {
                    api.postTransaction(
                        IngestRequest(
                            text = text,
                            isNotification = false,
                            source = "in_app_chat",
                            quoteTxId = quoteTxId
                        )
                    )
                }

                val botIndex = messages.indexOfFirst { it.id == botMsgId }
                if (response.isSuccessful && response.body()?.data != null) {
                    val result = response.body()!!.data!!
                    val msgText = response.body()?.message ?: result.note ?: text
                    val isUndo = result.categoryName == "Đã hoàn tác" || msgText.contains("hoàn tác")
                    val isTraining = msgText.contains("quy tắc") || msgText.contains("Đã học")
                    val isQuickChange = msgText.contains("Đã chuyển giao dịch")

                    if (botIndex != -1) {
                        messages[botIndex] = ChatMessage(
                            id = UUID.randomUUID().toString(),
                            text = msgText,
                            isFromUser = false,
                            transaction = if (isUndo || isTraining || isQuickChange || (result.amount ?: 0.0) <= 0.0) null else result,
                            isLoading = false
                        )
                    }
                } else if (response.isSuccessful && response.body()?.message != null) {
                    val msgText = response.body()!!.message!!
                    if (botIndex != -1) {
                        messages[botIndex] = ChatMessage(
                            id = UUID.randomUUID().toString(),
                            text = msgText,
                            isFromUser = false,
                            isLoading = false
                        )
                    }
                } else {
                    val err = response.errorBody()?.string() ?: "Không thể bóc tách số tiền từ nội dung."
                    if (botIndex != -1) {
                        messages[botIndex] = ChatMessage(
                            id = UUID.randomUUID().toString(),
                            text = "⚠️ Không nhận diện được giao dịch. Vui lòng ghi rõ số tiền (ví dụ: '45k cafe') hoặc dùng lệnh '/undo'.",
                            isFromUser = false,
                            isLoading = false,
                            error = err
                        )
                    }
                }
            } catch (e: Exception) {
                val botIndex = messages.indexOfFirst { it.id == botMsgId }
                if (botIndex != -1) {
                    messages[botIndex] = ChatMessage(
                        id = UUID.randomUUID().toString(),
                        text = "❌ Lỗi kết nối: ${e.message}",
                        isFromUser = false,
                        isLoading = false,
                        error = e.message
                    )
                }
            } finally {
                isSending = false
            }
        }
    }

    val imeInsets = WindowInsets.ime
    val density = LocalDensity.current
    val isKeyboardOpen by remember {
        derivedStateOf {
            imeInsets.getBottom(density) > 0
        }
    }

    var previousMessageCount by remember { mutableIntStateOf(messages.size) }

    LaunchedEffect(messages.size) {
        if (messages.size > previousMessageCount) {
            // Chỉ cuộn mượt khi có tin nhắn mới thực sự được thêm vào trong lúc đang mở màn hình
            listState.animateScrollToItem(messages.size - 1)
        } else if (previousMessageCount <= 1 && messages.size > 1) {
            // Lần đầu tải lịch sử chat xong, nhảy thẳng xuống cuối không cần animation cuộn tuôn
            listState.scrollToItem(messages.size - 1)
        }
        previousMessageCount = messages.size
    }

    LaunchedEffect(isKeyboardOpen) {
        if (isKeyboardOpen && messages.isNotEmpty()) {
            delay(100)
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BgDark)
            .imePadding()
    ) {
        // Modern Copilot Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(CardDark)
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(Brush.linearGradient(listOf(VioletAI, EmeraldPrimary))),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.AutoAwesome,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(18.dp)
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text("Salaria Copilot", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Text("Workers AI • Gemma 4 & Llama", color = VioletAILight, fontSize = 12.sp)
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                if (isLoadingHistory) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        color = EmeraldPrimary,
                        strokeWidth = 2.dp
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(CardDarkSecondary)
                        .border(1.dp, CardBorderSubtle, RoundedCornerShape(12.dp))
                        .clickable(enabled = !isLoadingHistory) { loadHistory(forceRefresh = true) }
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .clip(CircleShape)
                                .background(if (isLoadingHistory) VioletAI else EmeraldPrimary)
                        )
                        Spacer(modifier = Modifier.width(5.dp))
                        Text(if (isLoadingHistory) "Đang tải..." else "Làm mới", color = if (isLoadingHistory) VioletAILight else EmeraldLight, fontSize = 11.sp)
                    }
                }
            }
        }

        // Messages List
        LazyColumn(
            state = listState,
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            contentPadding = PaddingValues(vertical = 14.dp)
        ) {
            items(messages, key = { it.id }) { msg ->
                ChatBubble(
                    message = msg,
                    onQuote = { quotedMessage = it },
                    onEditTransaction = { tx ->
                        editingTransaction = Transaction(
                            id = tx.id ?: "",
                            amount = tx.amount ?: 0.0,
                            type = tx.type ?: "expense",
                            categoryId = tx.categoryId,
                            categoryName = tx.categoryName,
                            destinationAccountId = tx.destinationAccountId,
                            note = tx.note ?: ""
                        )
                    },
                    onViewDailySummary = { viewingDailySummary = it }
                )
            }
        }


        // Thanh Trích Dẫn (Quote Bar)
        if (quotedMessage != null) {
            val qm = quotedMessage!!
            val quoteDesc = if (qm.transaction != null) {
                val tx = qm.transaction
                val sign = if (tx.type == "income") "+" else if (tx.type == "transfer") "⇄ " else "-"
                "$sign${formatVnd(tx.amount ?: 0.0)} • ${tx.note ?: tx.categoryName ?: "Giao dịch"}"
            } else if (qm.source == "bank_notification") {
                "Thông báo: ${qm.text.take(35)}..."
            } else {
                qm.text.take(35)
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(CardDarkSecondary)
                    .border(1.dp, CardBorderSubtle)
                    .padding(horizontal = 14.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                    Box(
                        modifier = Modifier
                            .size(22.dp)
                            .clip(CircleShape)
                            .background(EmeraldPrimary.copy(alpha = 0.2f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("💬", fontSize = 11.sp)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text("Đang trích dẫn:", color = EmeraldLight, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        Text(
                            quoteDesc,
                            color = TextPrimary,
                            fontSize = 12.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                IconButton(
                    onClick = { quotedMessage = null },
                    modifier = Modifier.size(24.dp)
                ) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "Hủy trích dẫn",
                        tint = TextMuted,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }

        // Input Field Bar (Floating with 26dp pill corners)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(CardDark)
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = inputText,
                onValueChange = { inputText = it },
                modifier = Modifier
                    .weight(1f)
                    .heightIn(min = 48.dp, max = 96.dp),
                placeholder = {
                    Text(
                        if (quotedMessage != null) "Nhập lệnh sửa (vd: 35k, ăn uống, /undo)..." else "Gõ tự nhiên (vd: 35k cafe, +15tr)...",
                        color = TextMuted,
                        fontSize = 13.sp
                    )
                },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = EmeraldPrimary,
                    unfocusedBorderColor = CardBorderSubtle,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                    cursorColor = EmeraldPrimary
                ),
                shape = RoundedCornerShape(26.dp),
                maxLines = 3
            )

            Spacer(modifier = Modifier.width(8.dp))

            IconButton(
                onClick = { sendMessage() },
                enabled = inputText.isNotBlank() && !isSending,
                modifier = Modifier
                    .size(46.dp)
                    .clip(CircleShape)
                    .background(
                        if (inputText.isNotBlank() && !isSending) EmeraldGradient else Brush.linearGradient(listOf(CardBorder, CardBorder))
                    )
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.Send,
                    contentDescription = "Gửi",
                    tint = if (inputText.isNotBlank() && !isSending) TextOnBrand else TextMuted,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }

    // Popup chỉnh sửa giao dịch trực quan
    if (editingTransaction != null) {
        EditTransactionBottomSheet(
            transaction = editingTransaction!!,
            categories = categories,
            onDismiss = { editingTransaction = null },
            onSuccess = {
                loadHistory(forceRefresh = true)
                AppSyncBus.notifyDataChanged()
                editingTransaction = null
            },
            onDeleted = {
                editingTransaction?.id?.let { 
                    ChatManager.removeTransaction(it)
                    AppSyncBus.notifyDataChanged()
                }
                editingTransaction = null
            }
        )
    }

    // Popup xem chi tiết các khoản chi trong ngày từ thẻ tổng kết
    if (viewingDailySummary != null) {
        DailySummaryDetailBottomSheet(
            summary = viewingDailySummary!!,
            onDismiss = { viewingDailySummary = null },
            onEditTransaction = { tx ->
                viewingDailySummary = null
                editingTransaction = tx
            }
        )
    }
}

private fun formatChatTimestamp(timestamp: Long): String {
    if (timestamp <= 0L) return ""
    return try {
        val calendar = java.util.Calendar.getInstance()
        val todayYear = calendar.get(java.util.Calendar.YEAR)
        val todayDayOfYear = calendar.get(java.util.Calendar.DAY_OF_YEAR)

        val msgCal = java.util.Calendar.getInstance().apply { timeInMillis = timestamp }
        val msgYear = msgCal.get(java.util.Calendar.YEAR)
        val msgDayOfYear = msgCal.get(java.util.Calendar.DAY_OF_YEAR)

        val timeFormat = java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault())
        val timeStr = timeFormat.format(java.util.Date(timestamp))

        if (todayYear == msgYear && todayDayOfYear == msgDayOfYear) {
            timeStr
        } else {
            val dateFormat = java.text.SimpleDateFormat("dd/MM", java.util.Locale.getDefault())
            "$timeStr • ${dateFormat.format(java.util.Date(timestamp))}"
        }
    } catch (e: Exception) {
        ""
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ChatBubble(
    message: ChatMessage,
    onQuote: (ChatMessage) -> Unit = {},
    onEditTransaction: (IngestResult) -> Unit = {},
    onViewDailySummary: (DailySummaryDto) -> Unit = {}
) {
    val isUser = message.isFromUser
    val haptic = LocalHapticFeedback.current

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
    ) {
        if (isUser) {
            val isBankNoti = message.source == "bank_notification"
            val bubbleShape = RoundedCornerShape(
                topStart = 18.dp,
                topEnd = 18.dp,
                bottomStart = 18.dp,
                bottomEnd = 4.dp
            )
            // Bong bóng tin nhắn người dùng hoặc Thẻ thông báo ngân hàng (Chạm hoặc Nhấn giữ để trích dẫn)
            Box(
                modifier = Modifier
                    .widthIn(max = 290.dp)
                    .clip(bubbleShape)
                    .then(
                        if (isBankNoti) {
                            Modifier
                                .background(CardDarkSecondary)
                                .border(1.dp, CardBorderSubtle, bubbleShape)
                        } else {
                            Modifier.background(EmeraldGradient)
                        }
                    )
                    .combinedClickable(
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            onQuote(message)
                        },
                        onLongClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            onQuote(message)
                        }
                    )
                    .padding(horizontal = 14.dp, vertical = 10.dp)
            ) {
                Column {
                    if (isBankNoti) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(bottom = 4.dp)
                        ) {
                            Text("📱", fontSize = 11.sp)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                "Thông báo ngân hàng",
                                color = CyanLight,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    Text(
                        text = message.text,
                        color = if (isBankNoti) TextPrimary else TextOnBrand,
                        fontSize = 14.sp,
                        fontWeight = if (isBankNoti) FontWeight.Normal else FontWeight.SemiBold
                    )
                    val timeStr = formatChatTimestamp(message.timestamp)
                    if (timeStr.isNotBlank()) {
                        Spacer(modifier = Modifier.height(3.dp))
                        Text(
                            text = timeStr,
                            color = if (isBankNoti) TextMuted else TextOnBrand.copy(alpha = 0.75f),
                            fontSize = 10.sp,
                            modifier = Modifier.align(Alignment.End)
                        )
                    }
                }
            }
        } else if (message.isLoading) {
            // AI Thinking Spinner
            Box(
                modifier = Modifier
                    .widthIn(max = 280.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(CardDark)
                    .border(1.dp, CardBorderSubtle, RoundedCornerShape(18.dp))
                    .padding(14.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        color = VioletAI,
                        strokeWidth = 2.dp
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = "Workers AI đang bóc tách...",
                        color = TextSecondary,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        } else if (message.transaction != null) {
            // Smart Receipt Card (Chạm để Sửa trực quan • Nhấn giữ để Trích dẫn)
            val tx = message.transaction
            val isIncome = tx.type == "income"
            val isTransfer = tx.type == "transfer"
            val sign = if (isIncome) "+" else if (isTransfer) "" else "-"
            val amtColor = if (isIncome) IncomeGreen else if (isTransfer) BlueAccent else ExpenseRed
            val signIcon = if (isIncome) "🟢 " else if (isTransfer) "⇄ " else "🔴 "
            val headerTitle = if (isTransfer) "⇄ Ghi chép chuyển tiền thành công!" else (if (isIncome) "✨ Ghi chép thu nhập thành công!" else "✨ Ghi chép giao dịch thành công!")
            val headerColor = if (isTransfer) BlueAccent else (if (isIncome) IncomeGreen else EmeraldLight)

            val sourceRaw = tx.source ?: message.source
            val sourceDisplay = when (sourceRaw) {
                "bank_notification" -> "🔔 Thông báo Ngân hàng"
                "in_app_chat" -> "💬 Chat Copilot"
                "telegram_bot" -> "✈️ Telegram Bot"
                else -> "📱 Nhập thủ công"
            }

            Box(
                modifier = Modifier
                    .widthIn(max = 315.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(CardDark)
                    .border(1.dp, if (isTransfer) BlueAccent.copy(alpha = 0.3f) else CardBorderSubtle, RoundedCornerShape(20.dp))
                    .combinedClickable(
                        onClick = { onEditTransaction(tx) },
                        onLongClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            onQuote(message)
                        }
                    )
                    .padding(16.dp)
            ) {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(22.dp)
                                .clip(CircleShape)
                                .background(headerColor.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = headerColor,
                                modifier = Modifier.size(15.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = headerTitle,
                            color = headerColor,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.weight(1f)
                        )
                        Icon(
                            imageVector = Icons.Default.Edit,
                            contentDescription = "Chạm để sửa",
                            tint = TextMuted,
                            modifier = Modifier.size(14.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Dòng: Số tiền
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Số tiền:", color = TextSecondary, fontSize = 13.sp)
                        Text(
                            text = "$signIcon$sign${formatVnd(tx.amount ?: 0.0)}",
                            color = amtColor,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.ExtraBold
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    // Dòng: Nội dung
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top
                    ) {
                        Text("Nội dung:", color = TextSecondary, fontSize = 13.sp, modifier = Modifier.padding(end = 8.dp))
                        Text(
                            text = tx.note ?: message.text,
                            color = TextPrimary,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.weight(1f),
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    // Dòng: Danh mục
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Danh mục:", color = TextSecondary, fontSize = 13.sp)
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(if (isTransfer) BlueAccent.copy(alpha = 0.15f) else CardDarkSecondary)
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                tx.categoryName ?: (if (isTransfer) "Chuyển tiền nội bộ (Rút ATM)" else "Chưa phân loại"),
                                color = if (isTransfer) BlueAccent else CyanLight,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    // Dòng: Phân loại
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Phân loại:", color = TextSecondary, fontSize = 13.sp)
                        Text(
                            tx.categorizedBy ?: "fast_regex",
                            color = VioletAILight,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    // Dòng: Nguồn & Thời gian
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Nguồn:", color = TextSecondary, fontSize = 13.sp)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                sourceDisplay,
                                color = TextPrimary,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium
                            )
                            val timeStr = formatChatTimestamp(message.timestamp)
                            if (timeStr.isNotBlank()) {
                                Text(" • ", color = TextMuted, fontSize = 12.sp)
                                Text(
                                    timeStr,
                                    color = CyanLight,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }

                    // Context-Rich Financial Health Section [P2-02]
                    if (tx.financialHealth != null && tx.type == "expense") {
                        val fh = tx.financialHealth
                        Spacer(modifier = Modifier.height(10.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(1.dp)
                                .background(CardBorderSubtle)
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(CardDarkSecondary)
                                .padding(10.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    "📊 Đã tiêu kỳ này",
                                    color = TextSecondary,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Medium
                                )
                                Text(
                                    "${formatVnd(fh.cycleExpense ?: 0.0)} (${fh.usedPercentage ?: 0}%)",
                                    color = AmberWarning,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    "🛡️ Hạn mức an toàn",
                                    color = TextSecondary,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Medium
                                )
                                val isOverBudget = (fh.safeToSpendPerDay ?: 0.0) <= 0.0
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        if (isOverBudget) "0 ₫/ngày" else "${formatVnd(fh.safeToSpendPerDay ?: 0.0)}/ngày",
                                        color = if (isOverBudget) ExpenseRed else EmeraldLight,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        if (isOverBudget) "Vượt ngân sách kỳ này" else "còn ${fh.daysRemaining ?: 0} ngày",
                                        color = if (isOverBudget) AmberWarning else TextMuted,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        }
                    }
                }
            }

        } else if (message.source == "daily_summary" || message.dailySummary != null) {
            // Daily Digest Card (Tổng kết chi tiêu cuối ngày 22h30)
            val summary = message.dailySummary
            val todayExp = summary?.todayExpense ?: 0.0
            val safeAmt = summary?.safeToSpend ?: 0.0
            val daysLeft = summary?.daysRemaining ?: 0
            val statusNote = summary?.statusNote ?: "Chi tiêu an toàn, bạn đang kiểm soát ngân sách rất tốt! ✨"
            val displayDate = summary?.date ?: ""

            Box(
                modifier = Modifier
                    .widthIn(max = 310.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(CardDark)
                    .border(1.dp, VioletAI.copy(alpha = 0.35f), RoundedCornerShape(20.dp))
                    .combinedClickable(
                        onClick = {
                            if (summary != null) onViewDailySummary(summary)
                        },
                        onLongClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            onQuote(message)
                        }
                    )
                    .padding(16.dp)
            ) {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(24.dp)
                                .clip(CircleShape)
                                .background(VioletAI.copy(alpha = 0.18f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("🌙", fontSize = 13.sp)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = if (displayDate.isNotBlank()) "Báo cáo ngày $displayDate" else "Tổng kết cuối ngày",
                                color = VioletAILight,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Salaria Copilot • 22:30",
                                color = TextMuted,
                                fontSize = 10.sp
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("💸 Đã chi hôm nay", color = TextSecondary, fontSize = 12.sp)
                        Text(
                            text = "-${formatVnd(todayExp)}",
                            color = ExpenseRed,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.ExtraBold
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(CardDarkSecondary)
                            .padding(10.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "🛡️ Hạn mức mai",
                                color = TextSecondary,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium
                            )
                            Text(
                                "${formatVnd(safeAmt)}/ngày",
                                color = EmeraldLight,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "⏳ Chu kỳ lương",
                                color = TextSecondary,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium
                            )
                            Text(
                                "Còn $daysLeft ngày",
                                color = TextPrimary,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(VioletAI.copy(alpha = 0.1f))
                            .border(1.dp, VioletAI.copy(alpha = 0.2f), RoundedCornerShape(8.dp))
                            .padding(horizontal = 10.dp, vertical = 6.dp)
                    ) {
                        Text(
                            text = "💡 $statusNote",
                            color = VioletAILight,
                            fontSize = 11.sp,
                            lineHeight = 15.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "👆 Chạm để xem chi tiết các khoản chi",
                        color = VioletAILight.copy(alpha = 0.8f),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        } else {
            // General bot message / errors (Nhấn giữ để trích dẫn)
            Box(
                modifier = Modifier
                    .widthIn(max = 290.dp)
                    .clip(
                        RoundedCornerShape(
                            topStart = 18.dp,
                            topEnd = 18.dp,
                            bottomStart = 4.dp,
                            bottomEnd = 18.dp
                        )
                    )
                    .background(CardDark)
                    .border(
                        1.dp,
                        if (message.error != null) ExpenseRed.copy(alpha = 0.5f) else CardBorderSubtle,
                        RoundedCornerShape(18.dp)
                    )
                    .combinedClickable(
                        onClick = {},
                        onLongClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            onQuote(message)
                        }
                    )
                    .padding(14.dp)
            ) {
                Column {
                    Text(
                        text = message.text,
                        color = if (message.error != null) ExpenseRed else TextPrimary,
                        fontSize = 14.sp,
                        lineHeight = 20.sp
                    )
                    val timeStr = formatChatTimestamp(message.timestamp)
                    if (timeStr.isNotBlank() && message.id != "welcome") {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = timeStr,
                            color = TextMuted,
                            fontSize = 10.sp,
                            modifier = Modifier.align(Alignment.End)
                        )
                    }
                }
            }
        }
    }
}
