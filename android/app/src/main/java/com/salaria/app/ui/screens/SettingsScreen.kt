package com.salaria.app.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import com.salaria.app.data.api.ApiClient
import com.salaria.app.data.local.PreferencesManager
import com.salaria.app.data.model.BudgetSettingsDto
import com.salaria.app.data.model.ChatManager
import com.salaria.app.ui.components.AppPickerBottomSheet
import com.salaria.app.ui.theme.*
import com.salaria.app.util.AppLogger
import com.salaria.app.util.LogLevel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun SettingsScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val prefs = remember { PreferencesManager(context) }

    val currentUrl by prefs.workerUrlFlow.collectAsState(initial = PreferencesManager.DEFAULT_WORKER_URL)
    val currentApiKey by prefs.apiKeyFlow.collectAsState(initial = PreferencesManager.DEFAULT_API_KEY)
    val isServiceEnabled by prefs.serviceEnabledFlow.collectAsState(initial = true)
    val allowedPackages by prefs.allowedPackagesFlow.collectAsState(initial = PreferencesManager.DEFAULT_BANK_PACKAGES)
    val currentThemeMode by prefs.themeModeFlow.collectAsState(initial = "dark")
    val logs by AppLogger.logsFlow.collectAsState()

    var urlInput by remember(currentUrl) { mutableStateOf(currentUrl) }
    var keyInput by remember(currentApiKey) { mutableStateOf(currentApiKey) }

    val currentSavingsGoal by prefs.savingsGoalFlow.collectAsState(initial = PreferencesManager.DEFAULT_SAVINGS_GOAL)
    val currentHousingBudget by prefs.housingBudgetFlow.collectAsState(initial = PreferencesManager.DEFAULT_HOUSING_BUDGET)

    var savingsGoalInput by remember(currentSavingsGoal) {
        mutableStateOf(if (currentSavingsGoal > 0) currentSavingsGoal.toLong().toString() else "")
    }
    var housingBudgetInput by remember(currentHousingBudget) {
        mutableStateOf(if (currentHousingBudget > 0) currentHousingBudget.toLong().toString() else "4000000")
    }
    var isSavingBudget by remember { mutableStateOf(false) }
    var budgetSaveSuccess by remember { mutableStateOf<Boolean?>(null) }

    LaunchedEffect(Unit) {
        try {
            val api = ApiClient.getApi(context)
            val res = api.getSettings()
            if (res.isSuccessful && res.body()?.data != null) {
                val data = res.body()!!.data!!
                prefs.updateSavingsGoal(data.savingsGoal)
                prefs.updateHousingBudget(data.housingBudget)
            }
        } catch (e: Exception) {
            android.util.Log.w("SettingsScreen", "Fetch settings: ${e.message}")
        }
    }

    var isTesting by remember { mutableStateOf(false) }
    var testResult by remember { mutableStateOf<String?>(null) }
    var testSuccess by remember { mutableStateOf<Boolean?>(null) }
    var showAppPicker by remember { mutableStateOf(false) }

    val hasPermission = remember(context) { checkNotificationListenerPermission(context) }

    fun runTestConnection() {
        scope.launch {
            isTesting = true
            testResult = null
            testSuccess = null
            try {
                AppLogger.i("CONFIG", "Kiểm tra kết nối tới: $urlInput")
                ApiClient.updateConfig(urlInput, keyInput)
                val res = ApiClient.getApi(context).getHealth()
                if (res.isSuccessful && res.body() != null) {
                    val body = res.body()!!
                    testResult = "Kết nối thành công! Database: ${body.database ?: "OK"} | AI: ${body.aiEngine ?: "OK"}"
                    testSuccess = true
                    AppLogger.s("CONFIG", "Kết nối thành công! DB: ${body.database} | AI: ${body.aiEngine}")
                } else {
                    testResult = "Server phản hồi mã lỗi: ${res.code()}"
                    testSuccess = false
                    AppLogger.e("CONFIG", "Server phản hồi mã lỗi: ${res.code()}")
                }
            } catch (e: Exception) {
                testResult = "Lỗi kết nối: ${e.message}"
                testSuccess = false
                AppLogger.e("CONFIG", "Kết nối thất bại: ${e.message}")
            } finally {
                isTesting = false
            }
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(BgDark)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(top = 20.dp, bottom = 24.dp)
    ) {
        item {
            Text("Cài đặt hệ thống", color = TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Text("Quản lý kết nối Cloudflare, giao diện và dịch vụ bắt thông báo", color = TextSecondary, fontSize = 12.sp)
        }

        // Theme Selection Card (Dark / GitHub Light / System)
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = CardDark),
                shape = RoundedCornerShape(20.dp),
                border = CardDefaults.outlinedCardBorder().copy(
                    brush = androidx.compose.ui.graphics.SolidColor(CardBorderSubtle)
                )
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(EmeraldPrimary.copy(alpha = 0.15f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = if (currentThemeMode == "light") Icons.Default.LightMode else Icons.Default.DarkMode,
                                    contentDescription = null,
                                    tint = EmeraldPrimary,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text("Giao diện (Theme)", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Text("Chọn tông màu tối Obsidian hoặc GitHub Light", color = TextSecondary, fontSize = 11.sp)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(CardDarkSecondary)
                            .border(1.dp, CardBorderSubtle, RoundedCornerShape(12.dp))
                            .padding(4.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        val themes = listOf(
                            Triple("dark", "🌙 Tối", "Obsidian"),
                            Triple("light", "☀️ Sáng", "GitHub Light"),
                            Triple("system", "⚙️ Tự động", "Hệ thống")
                        )

                        themes.forEach { (mode, label, _) ->
                            val isSelected = currentThemeMode == mode
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (isSelected) CardDark else Color.Transparent)
                                    .border(
                                        width = if (isSelected) 1.dp else 0.dp,
                                        color = if (isSelected) EmeraldPrimary.copy(alpha = 0.5f) else Color.Transparent,
                                        shape = RoundedCornerShape(8.dp)
                                    )
                                    .clickable {
                                        scope.launch {
                                            prefs.updateThemeMode(mode)
                                            AppLogger.i("CONFIG", "Đã đổi giao diện sang: $label")
                                        }
                                    }
                                    .padding(vertical = 8.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = label,
                                    color = if (isSelected) EmeraldPrimary else TextSecondary,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                    fontSize = 12.sp
                                )
                            }
                        }
                    }
                }
            }
        }

        // Notification Permission Section
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = CardDark),
                shape = RoundedCornerShape(20.dp),
                border = CardDefaults.outlinedCardBorder().copy(
                    brush = androidx.compose.ui.graphics.SolidColor(if (hasPermission) CardBorderSubtle else AmberWarning.copy(alpha = 0.5f))
                )
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Quyền Đọc thông báo Android", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text(
                                if (hasPermission) "Đang kích hoạt đồng bộ" else "Chưa cấp quyền trong Cài đặt",
                                color = if (hasPermission) EmeraldLight else AmberWarning,
                                fontSize = 12.sp
                            )
                        }

                        Button(
                            onClick = {
                                val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
                                context.startActivity(intent)
                            },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (hasPermission) CardDarkSecondary else AmberWarning
                            ),
                            shape = RoundedCornerShape(10.dp),
                            border = if (hasPermission) BorderStroke(1.dp, CardBorderSubtle) else null
                        ) {
                            Text(if (hasPermission) "Kiểm tra" else "Cấp quyền", color = if (hasPermission) TextSecondary else TextOnBrand, fontSize = 12.sp)
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    HorizontalDivider(color = CardBorderSubtle)
                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Tự động ghi chép khi có thông báo", color = TextPrimary, fontSize = 13.sp)
                        Switch(
                            checked = isServiceEnabled,
                            onCheckedChange = { scope.launch { prefs.updateServiceEnabled(it) } },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = EmeraldPrimary,
                                checkedTrackColor = EmeraldPrimary.copy(alpha = 0.3f),
                                uncheckedThumbColor = TextMuted,
                                uncheckedTrackColor = CardBorderSubtle
                            )
                        )
                    }
                }
            }
        }

        // App Picker Section
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = CardDark),
                shape = RoundedCornerShape(20.dp),
                border = CardDefaults.outlinedCardBorder().copy(
                    brush = androidx.compose.ui.graphics.SolidColor(CardBorderSubtle)
                )
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            modifier = Modifier.weight(1f),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(38.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(EmeraldPrimary.copy(alpha = 0.15f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    Icons.Default.AppRegistration,
                                    contentDescription = null,
                                    tint = EmeraldPrimary,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text("Ứng dụng đọc thông báo", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Text(
                                    "Đang theo dõi ${allowedPackages.size} ứng dụng",
                                    color = EmeraldLight,
                                    fontSize = 12.sp
                                )
                            }
                        }

                        Button(
                            onClick = { showAppPicker = true },
                            colors = ButtonDefaults.buttonColors(containerColor = CardDarkSecondary),
                            shape = RoundedCornerShape(10.dp),
                            border = BorderStroke(1.dp, CardBorderSubtle),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text("Tùy chọn", color = TextPrimary, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        "Chỉ đọc và bóc tách biến động số dư từ các ứng dụng được chọn (MSB, Momo, ZaloPay...). Đảm bảo an toàn tuyệt đối cho tin nhắn riêng tư.",
                        color = TextSecondary,
                        fontSize = 12.sp,
                        lineHeight = 16.sp
                    )
                }
            }
        }

        // 🎯 Thiết lập Ngân sách & Hạn mức (3-Bucket Budgeting)
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = CardDark),
                shape = RoundedCornerShape(20.dp),
                border = CardDefaults.outlinedCardBorder().copy(
                    brush = androidx.compose.ui.graphics.SolidColor(CardBorderSubtle)
                )
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(38.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(AmberWarning.copy(alpha = 0.15f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    Icons.Default.AccountBalanceWallet,
                                    contentDescription = null,
                                    tint = AmberWarning,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text("Ngân sách & Hạn mức", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Text("Mô hình 3 ngăn: Tiết kiệm + Tiền nhà + Sinh hoạt", color = TextSecondary, fontSize = 12.sp)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    OutlinedTextField(
                        value = savingsGoalInput,
                        onValueChange = { savingsGoalInput = it.filter { c -> c.isDigit() } },
                        label = { Text("Mục tiêu Tiết kiệm kỳ này (₫)", fontSize = 12.sp) },
                        placeholder = { Text("Mặc định 0 ₫ (chưa trích tiết kiệm)", color = TextMuted, fontSize = 12.sp) },
                        modifier = Modifier.fillMaxWidth(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = EmeraldPrimary,
                            unfocusedBorderColor = CardBorderSubtle,
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            cursorColor = EmeraldPrimary
                        ),
                        shape = RoundedCornerShape(14.dp)
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = housingBudgetInput,
                        onValueChange = { housingBudgetInput = it.filter { c -> c.isDigit() } },
                        label = { Text("Tiền nhà định kỳ hàng tháng (₫)", fontSize = 12.sp) },
                        placeholder = { Text("Mặc định 4.000.000 ₫", color = TextMuted, fontSize = 12.sp) },
                        modifier = Modifier.fillMaxWidth(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = EmeraldPrimary,
                            unfocusedBorderColor = CardBorderSubtle,
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            cursorColor = EmeraldPrimary
                        ),
                        shape = RoundedCornerShape(14.dp)
                    )

                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "• Tiết kiệm sẽ được trích trước để bảo toàn quỹ tích lũy.\n• Tiền nhà được tạm giữ tự động khi chưa đóng và giải phóng ngay khi thanh toán.",
                        color = TextMuted,
                        fontSize = 11.sp,
                        lineHeight = 15.sp
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    Button(
                        onClick = {
                            scope.launch {
                                isSavingBudget = true
                                budgetSaveSuccess = null
                                val sVal = savingsGoalInput.toDoubleOrNull() ?: 0.0
                                val hVal = housingBudgetInput.toDoubleOrNull() ?: 4_000_000.0
                                prefs.updateSavingsGoal(sVal)
                                prefs.updateHousingBudget(hVal)
                                try {
                                    val api = ApiClient.getApi(context)
                                    val res = api.updateSettings(BudgetSettingsDto(savingsGoal = sVal, housingBudget = hVal))
                                    if (res.isSuccessful) {
                                        budgetSaveSuccess = true
                                        AppLogger.s("CONFIG", "Đã lưu và đồng bộ thiết lập ngân sách lên Cloudflare D1")
                                        ChatManager.loadHistory(api, forceRefresh = true)
                                    } else {
                                        budgetSaveSuccess = false
                                        AppLogger.w("CONFIG", "Lưu cục bộ OK, đồng bộ D1 trả về: ${res.code()}")
                                    }
                                } catch (e: Exception) {
                                    budgetSaveSuccess = false
                                    AppLogger.w("CONFIG", "Lỗi đồng bộ D1: ${e.message}")
                                } finally {
                                    isSavingBudget = false
                                }
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(44.dp),
                        enabled = !isSavingBudget,
                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(if (isSavingBudget) "Đang lưu..." else "Lưu thiết lập ngân sách", color = TextOnBrand, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }

                    if (budgetSaveSuccess == true) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("✨ Đã lưu và đồng bộ thiết lập ngân sách thành công!", color = EmeraldLight, fontSize = 12.sp)
                    } else if (budgetSaveSuccess == false) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("⚠️ Đã lưu trên máy (chưa đồng bộ được với Cloudflare)", color = AmberWarning, fontSize = 12.sp)
                    }
                }
            }
        }

        // Cloudflare Worker Config
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = CardDark),
                shape = RoundedCornerShape(20.dp),
                border = CardDefaults.outlinedCardBorder().copy(
                    brush = androidx.compose.ui.graphics.SolidColor(CardBorderSubtle)
                )
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Cấu hình Cloudflare Worker", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = urlInput,
                        onValueChange = { urlInput = it },
                        label = { Text("Worker URL", fontSize = 12.sp) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = EmeraldPrimary,
                            unfocusedBorderColor = CardBorderSubtle,
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            cursorColor = EmeraldPrimary
                        ),
                        shape = RoundedCornerShape(14.dp)
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = keyInput,
                        onValueChange = { keyInput = it },
                        label = { Text("x-api-key / Master PIN", fontSize = 12.sp) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = EmeraldPrimary,
                            unfocusedBorderColor = CardBorderSubtle,
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            cursorColor = EmeraldPrimary
                        ),
                        shape = RoundedCornerShape(14.dp)
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = { runTestConnection() },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(46.dp),
                        enabled = !isTesting,
                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        if (isTesting) {
                            CircularProgressIndicator(modifier = Modifier.size(18.dp), color = TextOnBrand)
                        } else {
                            Icon(Icons.Default.CloudSync, contentDescription = null, tint = TextOnBrand, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Lưu & Kiểm tra kết nối", color = TextOnBrand, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        }
                    }

                    if (testResult != null) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(CardDarkSecondary)
                                .border(1.dp, CardBorderSubtle, RoundedCornerShape(12.dp))
                                .padding(12.dp)
                        ) {
                            Text(testResult!!, color = TextPrimary, fontSize = 12.sp, lineHeight = 18.sp)
                        }
                    }
                }
            }
        }

        // System Logs Section
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = CardDark),
                shape = RoundedCornerShape(20.dp),
                border = CardDefaults.outlinedCardBorder().copy(
                    brush = androidx.compose.ui.graphics.SolidColor(CardBorderSubtle)
                )
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(CyanLight.copy(alpha = 0.2f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Terminal, contentDescription = null, tint = CyanAccent, modifier = Modifier.size(18.dp))
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text("Nhật ký hoạt động (Logs)", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Text("${logs.size} bản ghi gần nhất", color = TextMuted, fontSize = 11.sp)
                            }
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            // Copy Logs Button (34x34dp)
                            Box(
                                modifier = Modifier
                                    .size(34.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(CardDarkSecondary)
                                    .border(1.dp, CardBorderSubtle, RoundedCornerShape(8.dp))
                                    .clickable {
                                        if (logs.isEmpty()) {
                                            Toast.makeText(context, "Chưa có nhật ký để chép", Toast.LENGTH_SHORT).show()
                                            return@clickable
                                        }
                                        val textToCopy = logs.joinToString("\n") { "[${it.timestamp}] [${it.level}] [${it.tag}] ${it.message}" }
                                        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                        val clip = ClipData.newPlainText("Salaria Logs", textToCopy)
                                        clipboard.setPrimaryClip(clip)
                                        Toast.makeText(context, "Đã sao chép ${logs.size} dòng log", Toast.LENGTH_SHORT).show()
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.ContentCopy, contentDescription = "Sao chép log", tint = CyanAccent, modifier = Modifier.size(16.dp))
                            }

                            // Sync to Cloud Button (34x34dp)
                            Box(
                                modifier = Modifier
                                    .size(34.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(CardDarkSecondary)
                                    .border(1.dp, EmeraldPrimary.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
                                    .clickable {
                                        scope.launch {
                                            val ok = AppLogger.syncToCloud(context)
                                            if (ok) {
                                                Toast.makeText(context, "Đã gửi log lên Cloudflare D1", Toast.LENGTH_SHORT).show()
                                            } else {
                                                Toast.makeText(context, "Lỗi gửi log lên cloud", Toast.LENGTH_SHORT).show()
                                            }
                                        }
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.CloudUpload, contentDescription = "Đồng bộ lên Cloud", tint = EmeraldLight, modifier = Modifier.size(16.dp))
                            }

                            // Clear Logs Button (34x34dp)
                            Box(
                                modifier = Modifier
                                    .size(34.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(CardDarkSecondary)
                                    .border(1.dp, CardBorderSubtle, RoundedCornerShape(8.dp))
                                    .clickable {
                                        AppLogger.clear()
                                        Toast.makeText(context, "Đã xóa nhật ký", Toast.LENGTH_SHORT).show()
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.DeleteSweep, contentDescription = "Xóa nhật ký", tint = TextMuted, modifier = Modifier.size(16.dp))
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Logs Container
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 100.dp, max = 220.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(CardDarkSecondary)
                            .border(1.dp, CardBorderSubtle, RoundedCornerShape(12.dp))
                            .padding(8.dp)
                    ) {
                        if (logs.isEmpty()) {
                            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Text("Chưa có nhật ký hoạt động nào.", color = TextMuted, fontSize = 12.sp)
                            }
                        } else {
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                items(logs, key = { it.id }) { log ->
                                    val levelColor = when (log.level) {
                                        LogLevel.SUCCESS -> IncomeGreen
                                        LogLevel.ERROR -> ExpenseRed
                                        LogLevel.WARN -> AmberWarning
                                        LogLevel.INFO -> CyanAccent
                                    }

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        verticalAlignment = Alignment.Top
                                    ) {
                                        Text(
                                            text = log.timestamp,
                                            color = TextMuted,
                                            fontSize = 10.sp,
                                            fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(4.dp))
                                                .background(levelColor.copy(alpha = 0.2f))
                                                .padding(horizontal = 4.dp, vertical = 1.dp)
                                        ) {
                                            Text(
                                                text = log.tag,
                                                color = levelColor,
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Bold,
                                                fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                                            )
                                        }
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = log.message,
                                            color = if (log.level == LogLevel.ERROR) ExpenseRed else TextPrimary,
                                            fontSize = 11.sp,
                                            lineHeight = 15.sp,
                                            modifier = Modifier.weight(1f)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Info & Instructions
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = CardDark),
                shape = RoundedCornerShape(20.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("💡 Mẹo tối ưu hóa pin", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        "Để dịch vụ bắt thông báo ngân hàng không bị Android tắt ngầm:\n" +
                                "1. Vào Thông tin ứng dụng > Pin > Chọn 'Không hạn chế' (Unrestricted).\n" +
                                "2. Khóa ứng dụng trong màn hình đa nhiệm (Recent Apps).\n" +
                                "3. Bật 'Tự khởi chạy' (Autostart) nếu dùng điện thoại Xiaomi/Oppo/Vivo.",
                        color = TextSecondary,
                        fontSize = 12.sp,
                        lineHeight = 18.sp
                    )
                }
            }
        }
    }

    if (showAppPicker) {
        AppPickerBottomSheet(
            currentAllowedPackages = allowedPackages,
            onDismiss = { showAppPicker = false },
            onSave = { newSet ->
                scope.launch {
                    prefs.updateAllowedPackages(newSet)
                    AppLogger.i("CONFIG", "Đã cập nhật danh sách: ${newSet.size} ứng dụng")
                    Toast.makeText(context, "Đã lưu danh sách ${newSet.size} ứng dụng", Toast.LENGTH_SHORT).show()
                }
            }
        )
    }
}
