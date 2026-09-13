package com.salaria.app.data.api

import com.salaria.app.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface SalariaApi {

    @GET("api/status")
    suspend fun getStatus(): Response<StatusResponse>

    @GET("health")
    suspend fun getHealth(): Response<StatusResponse>

    @GET("api/accounts")
    suspend fun getAccounts(): Response<ApiResponse<List<Account>>>

    @GET("api/categories")
    suspend fun getCategories(): Response<ApiResponse<List<Category>>>

    @GET("api/transactions")
    suspend fun getTransactions(
        @Query("limit") limit: Int = 20,
        @Query("month") month: String? = null,
        @Query("start_date") startDate: String? = null,
        @Query("end_date") endDate: String? = null
    ): Response<ApiResponse<List<Transaction>>>

    @POST("api/ingest")
    suspend fun postTransaction(
        @Body request: IngestRequest
    ): Response<ApiResponse<IngestResult>>

    @DELETE("api/transactions/{id}")
    suspend fun deleteTransaction(
        @Path("id") id: String
    ): Response<ApiResponse<Unit>>

    @PUT("api/transactions/{id}")
    suspend fun updateTransaction(
        @Path("id") id: String,
        @Body request: UpdateTransactionRequest
    ): Response<ApiResponse<Transaction>>

    @GET("api/analytics/available-months")
    suspend fun getAvailableMonths(): Response<AvailableMonthsResponse>

    @GET("api/analytics/monthly")
    suspend fun getMonthlyAnalytics(
        @Query("month") month: String? = null,
        @Query("start_date") startDate: String? = null,
        @Query("end_date") endDate: String? = null
    ): Response<MonthlyAnalyticsResponse>

    @GET("api/analytics/advisor")
    suspend fun getAdvisor(
        @Query("month") month: String? = null,
        @Query("start_date") startDate: String? = null,
        @Query("end_date") endDate: String? = null
    ): Response<AdvisorResponse>

    @POST("api/logs")
    suspend fun postLogs(
        @Body logs: List<RemoteLogDto>
    ): Response<ApiResponse<Unit>>

    @GET("api/logs")
    suspend fun getLogs(
        @Query("limit") limit: Int = 50,
        @Query("level") level: String? = null
    ): Response<ApiResponse<List<RemoteLogDto>>>

    @GET("api/chat/history")
    suspend fun getChatHistory(
        @Query("limit") limit: Int = 10
    ): Response<ApiResponse<List<ChatHistoryItem>>>

    @POST("api/daily-summary")
    suspend fun postDailySummary(
        @Body summary: DailySummaryDto
    ): Response<ApiResponse<DailySummaryDto>>

    @GET("api/settings")
    suspend fun getSettings(): Response<ApiResponse<BudgetSettingsDto>>

    @POST("api/settings")
    suspend fun updateSettings(
        @Body settings: BudgetSettingsDto
    ): Response<ApiResponse<BudgetSettingsDto>>
}

