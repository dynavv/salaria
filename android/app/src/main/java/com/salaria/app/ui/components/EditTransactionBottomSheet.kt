package com.salaria.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.SwapHoriz
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
import com.salaria.app.data.model.Transaction
import com.salaria.app.data.model.UpdateTransactionRequest
import com.salaria.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditTransactionBottomSheet(
    transaction: Transaction,
    categories: List<Category>,
    onDismiss: () -> Unit,
    onSuccess: () -> Unit,
    onDeleted: () -> Unit = onSuccess
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var isSaving by remember { mutableStateOf(false) }

    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var showDeleteConfirm by remember { mutableStateOf(false) }

    var editAmountText by remember(transaction.id) { mutableStateOf(transaction.amount.toLong().toString()) }
    var editNoteText by remember(transaction.id) { mutableStateOf(transaction.note ?: "") }
    var editType by remember(transaction.id) { mutableStateOf(transaction.type) }
    var editCategoryId by remember(transaction.id) { mutableStateOf(transaction.categoryId ?: "") }

    ModalBottomSheet(
        onDismissRequest = { if (!isSaving) onDismiss() },
        sheetState = sheetState,
        containerColor = CardDark,
        dragHandle = {
            Box(
                modifier = Modifier
                    .padding(vertical = 10.dp)
                    .width(40.dp)
                    .height(4.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(CardBorder)
            )
        }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp)
                .imePadding()
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Chỉnh sửa giao dịch", color = TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(
                        onClick = { showDeleteConfirm = true },
                        enabled = !isSaving
                    ) {
                        Icon(Icons.Default.Delete, contentDescription = "Xóa", tint = ExpenseRed)
                    }
                    IconButton(
                        onClick = { onDismiss() },
                        enabled = !isSaving
                    ) {
                        Icon(Icons.Default.Close, contentDescription = "Đóng", tint = TextMuted)
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Loại: Khoản chi (-) hoặc Khoản thu (+) hoặc Chuyển tiền (⇄)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(CardDarkSecondary)
                    .padding(4.dp)
            ) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(10.dp))
                        .background(if (editType == "expense") ExpenseRed.copy(alpha = 0.25f) else Color.Transparent)
                        .clickable { editType = "expense" }
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text("Khoản chi (-)", color = if (editType == "expense") ExpenseRed else TextSecondary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(10.dp))
                        .background(if (editType == "income") IncomeGreen.copy(alpha = 0.25f) else Color.Transparent)
                        .clickable { editType = "income" }
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text("Khoản thu (+)", color = if (editType == "income") IncomeGreen else TextSecondary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(10.dp))
                        .background(if (editType == "transfer") CyanAccent.copy(alpha = 0.25f) else Color.Transparent)
                        .clickable { editType = "transfer" }
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text("Chuyển tiền (⇄)", color = if (editType == "transfer") CyanAccent else TextSecondary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Ô sửa Số tiền
            OutlinedTextField(
                value = editAmountText,
                onValueChange = { editAmountText = it.filter { ch -> ch.isDigit() } },
                label = { Text("Số tiền (₫)", fontSize = 12.sp) },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = EmeraldPrimary,
                    unfocusedBorderColor = CardBorderSubtle,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary
                ),
                shape = RoundedCornerShape(12.dp)
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Ô sửa Nội dung
            OutlinedTextField(
                value = editNoteText,
                onValueChange = { editNoteText = it },
                label = { Text("Nội dung ghi chú", fontSize = 12.sp) },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = EmeraldPrimary,
                    unfocusedBorderColor = CardBorderSubtle,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary
                ),
                shape = RoundedCornerShape(12.dp)
            )

            Spacer(modifier = Modifier.height(14.dp))

            if (editType == "transfer") {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = CardDarkSecondary.copy(alpha = 0.6f)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.SwapHoriz, contentDescription = null, tint = CyanAccent, modifier = Modifier.size(24.dp))
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            "Chuyển tiền nội bộ không tính vào chi tiêu tháng. Số dư các ví liên quan sẽ được tự động đồng bộ.",
                            color = TextSecondary,
                            fontSize = 12.sp,
                            lineHeight = 16.sp
                        )
                    }
                }
            } else {
                // Chọn Danh mục
                Text("Chọn danh mục:", color = TextSecondary, fontSize = 12.sp)
                Spacer(modifier = Modifier.height(6.dp))

                val expensePriority = listOf(
                    "cat_food",          // 🍜 Ăn uống (Luôn đưa lên đầu tiên)
                    "cat_shopping",      // 🛍️ Mua sắm & Đồ dùng
                    "cat_transport",     // 🚗 Di chuyển & Xăng xe
                    "cat_entertainment", // 🎮 Giải trí & Dịch vụ
                    "cat_housing",       // 🏠 Nhà cửa & Hóa đơn
                    "cat_personal_care", // 💆 Cá nhân & Thể thao
                    "cat_health",        // 💊 Sức khỏe & Y tế
                    "cat_education",     // 🎓 Học tập & Phát triển
                    "cat_other_expense"  // 📦 Chi tiêu khác
                )

                val incomePriority = listOf(
                    "cat_salary",            // 💼 Lương chính
                    "cat_bonus",             // 🎁 Thưởng & Tip
                    "cat_side_income",       // 🪙 Thu nhập phụ / Freelance
                    "cat_investment_income", // 📈 Lãi & Đầu tư
                    "cat_other_income"       // ➕ Thu nhập khác
                )

                val priorityList = if (editType == "expense") expensePriority else incomePriority
                val sortedCats = categories
                    .filter { it.type == editType }
                    .sortedBy { cat ->
                        val idx = priorityList.indexOf(cat.id)
                        if (idx != -1) idx else 999
                    }

                if (sortedCats.isEmpty()) {
                    Text("Không có danh mục nào phù hợp.", color = TextMuted, fontSize = 11.sp)
                } else {
                    LazyRow(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 2.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(sortedCats, key = { it.id }) { cat ->
                            val isSelected = editCategoryId == cat.id
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(if (isSelected) CyanLight.copy(alpha = 0.25f) else CardDarkSecondary)
                                    .border(1.dp, if (isSelected) CyanAccent else CardBorderSubtle, RoundedCornerShape(10.dp))
                                    .clickable { editCategoryId = cat.id }
                                    .padding(horizontal = 12.dp, vertical = 7.dp)
                            ) {
                                Text(
                                    text = cat.name,
                                    color = if (isSelected) CyanAccent else TextSecondary,
                                    fontSize = 12.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                    maxLines = 1
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Nút Lưu thay đổi lớn duy nhất dưới đáy
            Button(
                onClick = {
                    val newAmount = editAmountText.toDoubleOrNull() ?: transaction.amount
                    val newNote = editNoteText.trim().ifBlank { transaction.note ?: "Giao dịch" }
                    val finalCatId = if (editType == "transfer") null else editCategoryId.ifBlank { null }
                    scope.launch {
                        isSaving = true
                        try {
                            val api = ApiClient.getApi(context)
                            val updateReq = UpdateTransactionRequest(
                                amount = newAmount,
                                note = newNote,
                                type = editType,
                                category_id = finalCatId
                            )
                            val res = withContext(Dispatchers.IO) {
                                api.updateTransaction(transaction.id, updateReq)
                            }
                            if (res.isSuccessful) {
                                onSuccess()
                                onDismiss()
                            }
                        } catch (e: Exception) {
                            // Log error
                        } finally {
                            isSaving = false
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                enabled = !isSaving,
                colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary),
                shape = RoundedCornerShape(12.dp)
            ) {
                if (isSaving) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = TextOnBrand)
                } else {
                    Text("Lưu thay đổi", color = TextOnBrand, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }

    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { if (!isSaving) showDeleteConfirm = false },
            title = { Text("Xác nhận xóa", color = TextPrimary, fontWeight = FontWeight.Bold) },
            text = { Text("Bạn có chắc chắn muốn xóa giao dịch này? Số dư các tài khoản liên quan sẽ được tự động hoàn tác chính xác.", color = TextSecondary) },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteConfirm = false
                        scope.launch {
                            isSaving = true
                            try {
                                val api = ApiClient.getApi(context)
                                val res = withContext(Dispatchers.IO) { api.deleteTransaction(transaction.id) }
                                if (res.isSuccessful) {
                                    onDeleted()
                                    onDismiss()
                                }
                            } catch (e: Exception) {
                                // Log error
                            } finally {
                                isSaving = false
                            }
                        }
                    }
                ) {
                    Text("Xóa vĩnh viễn", color = ExpenseRed, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) {
                    Text("Hủy", color = TextMuted)
                }
            },
            containerColor = CardDark,
            tonalElevation = 6.dp
        )
    }
}
