package com.salaria.app.ui.components

import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.Apps
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.salaria.app.data.local.PreferencesManager
import com.salaria.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

data class AppInfoItem(
    val appName: String,
    val packageName: String,
    val iconBitmap: Bitmap?,
    val isBankOrFintech: Boolean
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppPickerBottomSheet(
    currentAllowedPackages: Set<String>,
    onDismiss: () -> Unit,
    onSave: (Set<String>) -> Unit
) {
    val context = LocalContext.current
    var installedApps by remember { mutableStateOf<List<AppInfoItem>>(emptyList()) }
    var isLoadingApps by remember { mutableStateOf(true) }
    var searchQuery by remember { mutableStateOf("") }
    val selectedPackages = remember { mutableStateListOf<String>().apply { addAll(currentAllowedPackages) } }

    LaunchedEffect(Unit) {
        withContext(Dispatchers.IO) {
            val pm = context.packageManager
            val launchIntent = Intent(Intent.ACTION_MAIN, null).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }
            val launchablePackages = pm.queryIntentActivities(launchIntent, 0)
                .mapNotNull { it.activityInfo?.packageName }
                .toSet()

            val apps = pm.getInstalledApplications(PackageManager.GET_META_DATA)
                .filter { appInfo ->
                    val pkg = appInfo.packageName
                    val isSystem = (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0

                    // Loại trừ triệt để các tiến trình ảo hóa / payload hệ thống
                    if (pkg.contains("payload", ignoreCase = true) ||
                        pkg.contains("microdroid", ignoreCase = true) ||
                        pkg.contains("compos", ignoreCase = true) ||
                        pkg.startsWith("com.android.internal")
                    ) {
                        return@filter false
                    }

                    launchablePackages.contains(pkg) ||
                            !isSystem ||
                            PreferencesManager.DEFAULT_BANK_PACKAGES.contains(pkg) ||
                            pkg.contains("bank", ignoreCase = true) ||
                            pkg.contains("msb", ignoreCase = true)
                }
                .map { appInfo ->
                    val name = try { pm.getApplicationLabel(appInfo).toString() } catch (e: Exception) { appInfo.packageName }
                    val pkg = appInfo.packageName
                    val isBank = PreferencesManager.DEFAULT_BANK_PACKAGES.contains(pkg) ||
                            pkg.contains("bank", ignoreCase = true) ||
                            pkg.contains("msb", ignoreCase = true) ||
                            pkg.contains("momo", ignoreCase = true) ||
                            pkg.contains("zalopay", ignoreCase = true) ||
                            pkg.contains("vnpay", ignoreCase = true) ||
                            pkg.contains("viettelmoney", ignoreCase = true) ||
                            pkg.contains("shopeepay", ignoreCase = true) ||
                            pkg.contains("wallet", ignoreCase = true) ||
                            pkg.contains("messaging", ignoreCase = true) ||
                            (pkg.contains("pay", ignoreCase = true) && !pkg.contains("payload", ignoreCase = true))

                    val bmp = try {
                        val drawable = pm.getApplicationIcon(appInfo)
                        drawableToBitmap(drawable)
                    } catch (e: Exception) {
                        null
                    }

                    AppInfoItem(
                        appName = name,
                        packageName = pkg,
                        iconBitmap = bmp,
                        isBankOrFintech = isBank
                    )
                }
                .distinctBy { it.packageName }
                .sortedWith(
                    compareByDescending<AppInfoItem> { currentAllowedPackages.contains(it.packageName) }
                        .thenByDescending { it.isBankOrFintech }
                        .thenBy { it.appName.lowercase() }
                )

            withContext(Dispatchers.Main) {
                installedApps = apps
                isLoadingApps = false
            }
        }
    }

    val filteredApps = remember(installedApps, searchQuery) {
        if (searchQuery.isBlank()) installedApps
        else {
            val q = searchQuery.trim().lowercase()
            installedApps.filter {
                it.appName.lowercase().contains(q) || it.packageName.lowercase().contains(q)
            }
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
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
                .fillMaxHeight(0.88f)
                .padding(horizontal = 20.dp, vertical = 6.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Ứng dụng đọc thông báo", color = TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    Text("Đã chọn ${selectedPackages.size} ứng dụng", color = EmeraldPrimary, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                }
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Đóng", tint = TextMuted)
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Tìm tên app hoặc package...", color = TextMuted, fontSize = 13.sp) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = TextMuted) },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = EmeraldPrimary,
                    unfocusedBorderColor = CardBorderSubtle,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary
                ),
                shape = RoundedCornerShape(12.dp),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Phím tắt chọn nhanh
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = {
                        val bankPkgs = installedApps.filter { it.isBankOrFintech }.map { it.packageName }
                        bankPkgs.forEach { if (!selectedPackages.contains(it)) selectedPackages.add(it) }
                    },
                    modifier = Modifier.weight(1.3f).height(38.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = CyanAccent),
                    border = androidx.compose.foundation.BorderStroke(1.dp, CyanAccent.copy(alpha = 0.5f)),
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Icon(Icons.Default.AccountBalance, contentDescription = null, modifier = Modifier.size(14.dp), tint = CyanAccent)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Chọn hết Ngân hàng", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                }

                OutlinedButton(
                    onClick = { selectedPackages.clear() },
                    modifier = Modifier.weight(0.9f).height(38.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = TextMuted),
                    border = androidx.compose.foundation.BorderStroke(1.dp, CardBorderSubtle),
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text("Bỏ chọn hết", fontSize = 11.sp)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Danh sách ứng dụng
            if (isLoadingApps) {
                Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = EmeraldPrimary, modifier = Modifier.size(32.dp))
                }
            } else if (filteredApps.isEmpty()) {
                Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                    Text("Không tìm thấy ứng dụng phù hợp", color = TextMuted, fontSize = 13.sp)
                }
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(bottom = 12.dp)
                ) {
                    items(filteredApps, key = { it.packageName }) { app ->
                        val isChecked = selectedPackages.contains(app.packageName)
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(if (isChecked) CardDarkSecondary else CardDarkSecondary.copy(alpha = 0.4f))
                                .border(
                                    1.dp,
                                    if (isChecked) EmeraldPrimary.copy(alpha = 0.4f) else CardBorderSubtle,
                                    RoundedCornerShape(12.dp)
                                )
                                .clickable {
                                    if (isChecked) selectedPackages.remove(app.packageName)
                                    else selectedPackages.add(app.packageName)
                                }
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            if (app.iconBitmap != null) {
                                Image(
                                    bitmap = app.iconBitmap.asImageBitmap(),
                                    contentDescription = null,
                                    modifier = Modifier
                                        .size(38.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                )
                            } else {
                                Box(
                                    modifier = Modifier
                                        .size(38.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(CardBorderSubtle),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.Apps, contentDescription = null, tint = TextMuted)
                                }
                            }

                            Spacer(modifier = Modifier.width(12.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = app.appName,
                                        color = TextPrimary,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        maxLines = 1
                                    )
                                    if (app.isBankOrFintech) {
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(4.dp))
                                                .background(EmeraldPrimary.copy(alpha = 0.2f))
                                                .padding(horizontal = 4.dp, vertical = 1.dp)
                                        ) {
                                            Text("Bank/Ví", color = EmeraldPrimary, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                                Text(
                                    text = app.packageName,
                                    color = TextMuted,
                                    fontSize = 10.sp,
                                    maxLines = 1
                                )
                            }

                            Switch(
                                checked = isChecked,
                                onCheckedChange = { checked ->
                                    if (checked) selectedPackages.add(app.packageName)
                                    else selectedPackages.remove(app.packageName)
                                },
                                colors = SwitchDefaults.colors(
                                    checkedThumbColor = BgDark,
                                    checkedTrackColor = EmeraldPrimary,
                                    uncheckedThumbColor = TextMuted,
                                    uncheckedTrackColor = CardBorderSubtle
                                )
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Nút Lưu thay đổi
            Button(
                onClick = {
                    onSave(selectedPackages.toSet())
                    onDismiss()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Áp dụng (${selectedPackages.size} ứng dụng)", color = TextOnBrand, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            }

            Spacer(modifier = Modifier.height(14.dp))
        }
    }
}

private fun drawableToBitmap(drawable: Drawable): Bitmap {
    if (drawable is BitmapDrawable && drawable.bitmap != null) {
        return drawable.bitmap
    }
    val width = if (drawable.intrinsicWidth > 0) drawable.intrinsicWidth else 72
    val height = if (drawable.intrinsicHeight > 0) drawable.intrinsicHeight else 72
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    drawable.setBounds(0, 0, canvas.width, canvas.height)
    drawable.draw(canvas)
    return bitmap
}
