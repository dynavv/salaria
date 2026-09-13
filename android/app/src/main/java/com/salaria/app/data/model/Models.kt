package com.salaria.app.data.model

import com.google.gson.annotations.SerializedName

data class ApiResponse<T>(
    val success: Boolean = false,
    val data: T? = null,
    val error: String? = null,
    val message: String? = null
)

data class Transaction(
    val id: String = "",
    val date: String = "",
    val amount: Double = 0.0,
    val type: String = "expense",
    @SerializedName("category_id") val categoryId: String? = null,
    @SerializedName("category_name") val categoryName: String? = null,
    @SerializedName("account_id") val accountId: String? = null,
    @SerializedName("account_name") val accountName: String? = null,
    @SerializedName("destination_account_id") val destinationAccountId: String? = null,
    @SerializedName("destination_account_name") val destinationAccountName: String? = null,
    val note: String? = null,
    val source: String? = null,
    @SerializedName("created_at") val createdAt: String? = null
)

data class Account(
    val id: String = "",
    val name: String = "",
    val type: String = "cash",
    val balance: Double = 0.0,
    @SerializedName("current_balance") val currentBalance: Double? = null,
    val color: String? = "#3B82F6",
    val icon: String? = "Wallet"
) {
    val displayBalance: Double
        get() = currentBalance ?: balance
}

data class Category(
    val id: String = "",
    val name: String = "",
    val type: String = "expense",
    @SerializedName("group_type") val groupType: String? = "needs",
    val color: String? = "#64748B",
    val icon: String? = "Tag"
)

data class UpdateTransactionRequest(
    val amount: Double? = null,
    val note: String? = null,
    val type: String? = null,
    val category_id: String? = null,
    val account_id: String? = null,
    val destination_account_id: String? = null,
    val date: String? = null
)

data class IngestRequest(
    val text: String,
    val title: String? = null,
    @SerializedName("is_notification") val isNotification: Boolean = true,
    val source: String = "android_app",
    @SerializedName("quote_tx_id") val quoteTxId: String? = null
)

data class IngestResult(
    val id: String? = null,
    val amount: Double? = null,
    val type: String? = null,
    @SerializedName("category_id") val categoryId: String? = null,
    @SerializedName("category_name") val categoryName: String? = null,
    val note: String? = null,
    @SerializedName("categorized_by") val categorizedBy: String? = null,
    @SerializedName("destination_account_id") val destinationAccountId: String? = null,
    @SerializedName("financial_health") val financialHealth: FinancialHealth? = null,
    val source: String? = null
)


data class FinancialHealth(
    @SerializedName("cycleDisplay") val cycleDisplay: String? = null,
    @SerializedName("cycleExpense") val cycleExpense: Double? = null,
    @SerializedName("cycleIncome") val cycleIncome: Double? = null,
    @SerializedName("safeToSpendPerDay") val safeToSpendPerDay: Double? = null,
    @SerializedName("daysRemaining") val daysRemaining: Int? = null,
    @SerializedName("usedPercentage") val usedPercentage: Int? = null
)

data class StatusResponse(
    val success: Boolean = false,
    val service: String? = null,
    val database: String? = null,
    @SerializedName("ai_engine") val aiEngine: String? = null,
    val stats: StatusStats? = null
)

data class StatusStats(
    @SerializedName("total_transactions") val totalTransactions: Int = 0
)

data class DailySummaryDto(
    val id: String? = null,
    val date: String = "",
    @SerializedName("todayExpense") val todayExpense: Double = 0.0,
    @SerializedName("safeToSpend") val safeToSpend: Double = 0.0,
    @SerializedName("daysRemaining") val daysRemaining: Int = 0,
    @SerializedName("statusNote") val statusNote: String? = null,
    @SerializedName("createdAt") val createdAt: String? = null,
    @SerializedName("generate_ai") val generateAi: Boolean? = true
)

data class ChatMessage(
    val id: String,
    val text: String,
    val isFromUser: Boolean,
    val timestamp: Long = System.currentTimeMillis(),
    val transaction: IngestResult? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val source: String? = null,
    val targetTxId: String? = null,
    val dailySummary: DailySummaryDto? = null
)

data class ChatHistoryItem(
    val id: String = "",
    val rawText: String? = null,
    val source: String? = null,
    @SerializedName(value = "createdAt", alternate = ["created_at"]) val createdAt: String? = null,
    val result: IngestResult? = null,
    val dailySummary: DailySummaryDto? = null
)

// ==========================================
// ANALYTICS & ADVISOR MODELS
// ==========================================

data class AvailableMonthsResponse(
    val success: Boolean,
    val data: List<String>? = null
)

data class GroupBreakdown(
    val needs: Double = 0.0,
    val wants: Double = 0.0,
    val savings: Double = 0.0,
    val needsPercentage: Int = 0,
    val wantsPercentage: Int = 0,
    val savingsPercentage: Int = 0
)

data class CategoryStat(
    val categoryId: String? = null,
    val categoryName: String? = null,
    val categoryColor: String? = null,
    val groupType: String? = null,
    val amount: Double = 0.0,
    val percentage: Int = 0,
    val count: Int = 0
)

data class MonthlyAnalyticsData(
    val month: String,
    val totalIncome: Double = 0.0,
    val totalExpense: Double = 0.0,
    val netSavings: Double = 0.0,
    val savingsRate: Int = 0,
    val transactionCount: Int = 0,
    val dailyAverageExpense: Double = 0.0,
    val daysInMonth: Int = 30,
    val groupBreakdown: GroupBreakdown? = null,
    val categories: List<CategoryStat> = emptyList()
)

data class MonthlyAnalyticsResponse(
    val success: Boolean,
    val data: MonthlyAnalyticsData? = null
)

data class RuleItem(
    val actual: Double = 0.0,
    val target: Double = 0.0,
    val actualPercent: Int = 0,
    val targetPercent: Int = 50,
    val status: String = "good"
)

data class Rule503020(
    val needs: RuleItem? = null,
    val wants: RuleItem? = null,
    val savings: RuleItem? = null
)

data class KeyInsight(
    val type: String? = null,
    val title: String? = null,
    val description: String? = null,
    val icon: String? = null
)

data class AdvisorData(
    val healthScore: Int = 70,
    val scoreLevel: String = "Tốt",
    val scoreColor: String = "#3b82f6",
    val month: String = "",
    val rule503020: Rule503020? = null,
    val keyInsights: List<KeyInsight> = emptyList()
)

data class AdvisorResponse(
    val success: Boolean,
    val data: AdvisorData? = null
)

data class RemoteLogDto(
    val id: String? = null,
    val timestamp: Long = System.currentTimeMillis(),
    val level: String,
    val tag: String,
    val source: String = "android_app",
    val message: String,
    val metadata: String? = null,
    @SerializedName("created_at") val createdAt: String? = null
)

data class BudgetSettingsDto(
    @SerializedName("savings_goal") val savingsGoal: Double = 0.0,
    @SerializedName("housing_budget") val housingBudget: Double = 4_000_000.0,
    @SerializedName("custom_budget") val customBudget: Double = 0.0
)

