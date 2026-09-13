package com.salaria.app.data.model

import android.util.Log
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.salaria.app.data.api.SalariaApi

object ChatManager {
    private const val TAG = "ChatManager"
    val messages = mutableStateListOf<ChatMessage>()
    var isHistoryLoaded by mutableStateOf(false)
    var isLoadingHistory by mutableStateOf(false)

    init {
        messages.add(
            ChatMessage(
                id = "welcome",
                text = "Xin chào! Bạn có thể ghi chép thu chi siêu tốc bằng ngôn ngữ tự nhiên tại đây.\n\nVí dụ:\n• 35k cafe highland\n• -120k shopee đồ gia dụng\n• +15tr lương công ty\n• 🧠 Dạy bot: coffee = ăn uống\n• 💡 Chạm thẻ hóa đơn để sửa / xóa\n• 💬 Nhấn giữ tin nhắn để trích dẫn\n• ↩ Hoàn tác: /undo hoặc /xoa",
                isFromUser = false,
                timestamp = 0L
            )
        )
    }

    private fun parseTimestamp(createdAt: String?): Long {
        if (createdAt.isNullOrBlank()) return System.currentTimeMillis()
        return try {
            val cleaned = createdAt.replace("T", " ").substringBefore(".")
            val sdf = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.getDefault())
            sdf.timeZone = java.util.TimeZone.getTimeZone("Asia/Ho_Chi_Minh")
            sdf.parse(cleaned)?.time ?: System.currentTimeMillis()
        } catch (e: Exception) {
            System.currentTimeMillis()
        }
    }

    private fun mapChatHistoryItems(history: List<ChatHistoryItem>): List<ChatMessage> {
        val items = mutableListOf<ChatMessage>()
        for (item in history) {
            val ts = parseTimestamp(item.createdAt)
            if (item.source == "daily_summary" || item.dailySummary != null) {
                val summary = item.dailySummary
                val summaryText = item.rawText ?: "🌙 Tổng kết chi tiêu ngày ${summary?.date ?: ""}"
                items.add(
                    ChatMessage(
                        id = item.id,
                        text = summaryText,
                        isFromUser = false,
                        timestamp = ts,
                        source = "daily_summary",
                        dailySummary = summary
                    )
                )
            } else {
                val raw = item.rawText ?: item.result?.note ?: ""
                val targetId = item.result?.id ?: item.id
                // Bong bóng thông báo ngân hàng / tin nhắn người dùng
                items.add(
                    ChatMessage(
                        id = "${item.id}_raw",
                        text = raw,
                        isFromUser = true,
                        timestamp = ts,
                        source = item.source,
                        targetTxId = targetId
                    )
                )
                // Thẻ giao dịch AI (cộng 1s để luôn hiển thị ngay sau tin nhắn nguồn)
                if (item.result != null) {
                    items.add(
                        ChatMessage(
                            id = "${item.id}_res",
                            text = item.result.note ?: raw,
                            isFromUser = false,
                            timestamp = ts + 1000L,
                            transaction = item.result,
                            source = item.source,
                            targetTxId = targetId
                        )
                    )
                }
            }
        }
        return items
    }

    private fun sortMessages(list: List<ChatMessage>): List<ChatMessage> {
        return list.sortedWith { a, b ->
            // BẤT BIẾN TUYỆT ĐỐI: Với 2 tin nhắn thuộc cùng 1 giao dịch (cùng targetTxId),
            // tin nhắn nguồn (isFromUser = true) LUÔN LUÔN đứng trước thẻ phản hồi (isFromUser = false)
            if (!a.targetTxId.isNullOrBlank() && a.targetTxId == b.targetTxId && a.isFromUser != b.isFromUser) {
                if (a.isFromUser) -1 else 1
            } else {
                a.timestamp.compareTo(b.timestamp)
            }
        }
    }

    suspend fun silentSync(api: SalariaApi) {
        try {
            val response = api.getChatHistory(limit = 15)
            if (response.isSuccessful && response.body()?.data != null) {
                val history = response.body()!!.data!!
                if (history.isNotEmpty()) {
                    val incomingItems = mapChatHistoryItems(history)
                    val hasRealMessages = messages.any { it.id != "welcome" }

                    if (!hasRealMessages) {
                        messages.clear()
                        messages.addAll(incomingItems)
                    } else {
                        // Silent Merge: Chỉ append các tin chưa có trong RAM, không xóa trắng màn hình
                        for (incoming in incomingItems) {
                            val exists = messages.any {
                                it.id == incoming.id ||
                                (it.targetTxId != null && it.targetTxId == incoming.targetTxId && it.isFromUser == incoming.isFromUser)
                            }
                            if (!exists) {
                                messages.add(incoming)
                            } else if (incoming.transaction != null) {
                                val idx = messages.indexOfFirst { it.targetTxId == incoming.targetTxId && !it.isFromUser }
                                if (idx != -1) {
                                    messages[idx] = incoming
                                }
                                // Đồng bộ luôn timestamp cho tin nhắn nguồn tương ứng để tránh lệch giờ server/client
                                val userIdx = messages.indexOfFirst { it.targetTxId == incoming.targetTxId && it.isFromUser }
                                if (userIdx != -1 && messages[userIdx].timestamp >= incoming.timestamp) {
                                    messages[userIdx] = messages[userIdx].copy(timestamp = incoming.timestamp - 1000L)
                                }
                            }
                        }
                    }
                    // Đảm bảo toàn bộ tin nhắn luôn hiển thị theo thứ tự thời gian tăng dần và đúng cặp tin nhắn
                    val sorted = sortMessages(messages)
                    if (messages.toList() != sorted) {
                        messages.clear()
                        messages.addAll(sorted)
                    }
                    isHistoryLoaded = true
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Lỗi silentSync: ${e.message}")
        }
    }

    suspend fun loadHistory(api: SalariaApi, forceRefresh: Boolean = false) {
        if (!isHistoryLoaded || forceRefresh) {
            isLoadingHistory = true
            try {
                val response = api.getChatHistory(limit = 15)
                if (response.isSuccessful && response.body()?.data != null) {
                    val history = response.body()!!.data!!
                    if (history.isNotEmpty()) {
                        val newItems = mapChatHistoryItems(history)
                        messages.clear()
                        messages.addAll(newItems)
                        val sorted = sortMessages(messages)
                        if (messages.toList() != sorted) {
                            messages.clear()
                            messages.addAll(sorted)
                        }
                        isHistoryLoaded = true
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Lỗi tải lịch sử chat: ${e.message}")
            } finally {
                isLoadingHistory = false
            }
        } else {
            silentSync(api)
        }
    }

    fun addBankTransaction(rawText: String, result: IngestResult) {
        val txId = result.id ?: "tx_${System.currentTimeMillis()}"
        val userMsgId = "${txId}_raw"
        val botMsgId = "${txId}_res"

        if (messages.any { it.id == userMsgId || it.id == botMsgId || it.targetTxId == txId }) {
            return
        }

        val now = System.currentTimeMillis()
        messages.add(
            ChatMessage(
                id = userMsgId,
                text = rawText,
                isFromUser = true,
                timestamp = now,
                source = "bank_notification",
                targetTxId = txId
            )
        )

        messages.add(
            ChatMessage(
                id = botMsgId,
                text = result.note ?: rawText,
                isFromUser = false,
                timestamp = now + 1000L,
                transaction = result,
                source = "bank_notification",
                targetTxId = txId
            )
        )
    }

    fun updateTransaction(updatedTx: Transaction) {
        val index = messages.indexOfFirst {
            it.targetTxId == updatedTx.id || it.transaction?.id == updatedTx.id
        }
        if (index != -1) {
            val oldMsg = messages[index]
            val newResult = IngestResult(
                id = updatedTx.id,
                amount = updatedTx.amount,
                type = updatedTx.type,
                categoryId = updatedTx.categoryId,
                categoryName = updatedTx.categoryName,
                destinationAccountId = updatedTx.destinationAccountId,
                note = updatedTx.note,
                categorizedBy = "Chỉnh sửa thủ công",
                financialHealth = oldMsg.transaction?.financialHealth
            )
            messages[index] = oldMsg.copy(
                text = updatedTx.note ?: oldMsg.text,
                transaction = newResult
            )
        }
    }

    fun removeTransaction(txId: String) {
        messages.removeAll { it.targetTxId == txId || it.transaction?.id == txId }
    }

    fun addOrUpdateDailySummary(summary: DailySummaryDto) {
        val msgId = summary.id ?: "sum_${summary.date.replace("-", "")}"
        val ts = parseTimestamp(summary.createdAt ?: "${summary.date} 22:30:00")
        val summaryMsg = ChatMessage(
            id = msgId,
            text = "🌙 Tổng kết chi tiêu ngày ${summary.date}",
            isFromUser = false,
            timestamp = ts,
            source = "daily_summary",
            dailySummary = summary
        )
        val existingIndex = messages.indexOfFirst { it.id == msgId || it.dailySummary?.date == summary.date }
        if (existingIndex != -1) {
            messages[existingIndex] = summaryMsg
        } else {
            messages.add(summaryMsg)
        }
    }
}
