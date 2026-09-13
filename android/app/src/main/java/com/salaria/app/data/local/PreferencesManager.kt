package com.salaria.app.data.local

import com.salaria.app.BuildConfig
import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.doublePreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "salaria_prefs")

class PreferencesManager(private val context: Context) {

    companion object {
        val KEY_WORKER_URL = stringPreferencesKey("worker_url")
        val KEY_API_KEY = stringPreferencesKey("api_key")
        val KEY_MASTER_PIN = stringPreferencesKey("master_pin")
        val KEY_SERVICE_ENABLED = booleanPreferencesKey("service_enabled")
        val KEY_ALLOWED_PACKAGES = stringSetPreferencesKey("allowed_packages")
        val KEY_THEME_MODE = stringPreferencesKey("theme_mode") // "dark", "light", "system"
        val KEY_SAVINGS_GOAL = doublePreferencesKey("savings_goal")
        val KEY_HOUSING_BUDGET = doublePreferencesKey("housing_budget")

        val DEFAULT_WORKER_URL = BuildConfig.DEFAULT_WORKER_URL
        val DEFAULT_API_KEY = BuildConfig.DEFAULT_API_KEY
        val DEFAULT_PIN = BuildConfig.DEFAULT_PIN
        const val DEFAULT_SAVINGS_GOAL = 0.0
        const val DEFAULT_HOUSING_BUDGET = 4_000_000.0

        val DEFAULT_BANK_PACKAGES = setOf(
            // MSB (Maritime Bank) - Đầy đủ các biến thể
            "com.msb.digibank.retail",          // MSB Digital Bank (Bản mới nhất)
            "com.msb.digital",                  // MSB DigiBank
            "com.msb.mbank",                    // MSB mBank
            "vn.com.msb.smartBanking",          // MSB Smart Banking
            "vn.com.msb.mobile",                // MSB Mobile
            "com.vnpay.msb",                    // VNPAY MSB
            "com.maritimebank.mobile",          // Maritime Bank Mobile
            "com.msb.mconnect",                 // MSB MConnect
            "com.msb.plus",                     // MSB Plus

            // Ngân hàng lớn tại Việt Nam
            "com.vcb.digibank",                 // Vietcombank
            "vn.com.techcombank.bb.app",        // Techcombank
            "com.mbmobile",                     // MBBank
            "com.tpb.mb.gphone",                // TPBank
            "com.vietinbank.ipay",              // VietinBank iPay
            "mobile.acb.com.vn",                // ACB ONE
            "com.vnpay.vpbankonline",           // VPBank NEO
            "com.ocb.omni",                     // OCB OMNI
            "com.ocb.omni.retail",              // OCB OMNI Retail
            "com.vnpay.bidv",                   // BIDV SmartBanking
            "com.bidv.smartbanking",            // BIDV SmartBanking alt
            "com.mservice.vib",                 // VIB MyVIB
            "com.vib.myvib2",                   // MyVIB 2.0
            "com.vnpay.sacombank",              // Sacombank mBanking
            "com.sacombank.mplus",              // Sacombank mPlus
            "com.vnpay.agribank",               // Agribank E-Mobile
            "xyz.be.cake",                      // Cake by VPBank
            "com.timo.vn",                      // Timo Digital Bank

            // Ví điện tử, Fintech & SMS
            "com.mservice.momopay",             // Ví MoMo
            "com.vng.zingpay",                  // ZaloPay
            "vn.com.vng.zalopay",               // ZaloPay alt
            "com.bplus.vtpay",                  // Viettel Money
            "com.google.android.apps.walletnfcrel", // Google Wallet
            "xyz.be.customer",                  // Be App
            "com.grabtaxi.passenger",           // Grab
            "com.google.android.apps.messaging", // Tin nhắn SMS Google (Biến động số dư)
            "com.samsung.android.messaging"      // Tin nhắn SMS Samsung (Biến động số dư)
        )
    }

    val workerUrlFlow: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[KEY_WORKER_URL] ?: DEFAULT_WORKER_URL
    }

    val apiKeyFlow: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[KEY_API_KEY] ?: DEFAULT_API_KEY
    }

    val masterPinFlow: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[KEY_MASTER_PIN] ?: DEFAULT_PIN
    }

    val serviceEnabledFlow: Flow<Boolean> = context.dataStore.data.map { prefs ->
        prefs[KEY_SERVICE_ENABLED] ?: true
    }

    val allowedPackagesFlow: Flow<Set<String>> = context.dataStore.data.map { prefs ->
        prefs[KEY_ALLOWED_PACKAGES] ?: DEFAULT_BANK_PACKAGES
    }

    val themeModeFlow: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[KEY_THEME_MODE] ?: "dark"
    }

    val savingsGoalFlow: Flow<Double> = context.dataStore.data.map { prefs ->
        prefs[KEY_SAVINGS_GOAL] ?: DEFAULT_SAVINGS_GOAL
    }

    val housingBudgetFlow: Flow<Double> = context.dataStore.data.map { prefs ->
        prefs[KEY_HOUSING_BUDGET] ?: DEFAULT_HOUSING_BUDGET
    }

    suspend fun updateWorkerUrl(url: String) {
        context.dataStore.edit { it[KEY_WORKER_URL] = url.trim().removeSuffix("/") }
    }

    suspend fun updateApiKey(key: String) {
        context.dataStore.edit { it[KEY_API_KEY] = key.trim() }
    }

    suspend fun updateMasterPin(pin: String) {
        context.dataStore.edit { it[KEY_MASTER_PIN] = pin.trim() }
    }

    suspend fun updateServiceEnabled(enabled: Boolean) {
        context.dataStore.edit { it[KEY_SERVICE_ENABLED] = enabled }
    }

    suspend fun updateAllowedPackages(packages: Set<String>) {
        context.dataStore.edit { it[KEY_ALLOWED_PACKAGES] = packages }
    }

    suspend fun updateThemeMode(mode: String) {
        context.dataStore.edit { it[KEY_THEME_MODE] = mode }
    }

    suspend fun updateSavingsGoal(goal: Double) {
        context.dataStore.edit { it[KEY_SAVINGS_GOAL] = goal }
    }

    suspend fun updateHousingBudget(budget: Double) {
        context.dataStore.edit { it[KEY_HOUSING_BUDGET] = budget }
    }

    fun getWorkerUrlBlocking(): String = runBlocking {
        context.dataStore.data.first()[KEY_WORKER_URL] ?: DEFAULT_WORKER_URL
    }

    fun getApiKeyBlocking(): String = runBlocking {
        context.dataStore.data.first()[KEY_API_KEY] ?: DEFAULT_API_KEY
    }

    fun getMasterPinBlocking(): String = runBlocking {
        context.dataStore.data.first()[KEY_MASTER_PIN] ?: DEFAULT_PIN
    }

    fun getAllowedPackagesBlocking(): Set<String> = runBlocking {
        context.dataStore.data.first()[KEY_ALLOWED_PACKAGES] ?: DEFAULT_BANK_PACKAGES
    }

    fun isServiceEnabledBlocking(): Boolean = runBlocking {
        context.dataStore.data.first()[KEY_SERVICE_ENABLED] ?: true
    }

    fun getSavingsGoalBlocking(): Double = runBlocking {
        context.dataStore.data.first()[KEY_SAVINGS_GOAL] ?: DEFAULT_SAVINGS_GOAL
    }

    fun getHousingBudgetBlocking(): Double = runBlocking {
        context.dataStore.data.first()[KEY_HOUSING_BUDGET] ?: DEFAULT_HOUSING_BUDGET
    }
}
