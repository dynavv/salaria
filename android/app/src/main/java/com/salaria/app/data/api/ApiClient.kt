package com.salaria.app.data.api

import android.content.Context
import com.salaria.app.data.local.PreferencesManager
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    @Volatile
    private var cachedBaseUrl: String = PreferencesManager.DEFAULT_WORKER_URL.removeSuffix("/") + "/"
    @Volatile
    private var cachedApiKey: String = PreferencesManager.DEFAULT_API_KEY
    @Volatile
    private var cachedApi: SalariaApi? = null

    @Synchronized
    fun updateConfig(baseUrl: String, apiKey: String) {
        val formatted = baseUrl.trim().removeSuffix("/") + "/"
        val key = apiKey.trim()
        if (cachedBaseUrl != formatted || cachedApiKey != key || cachedApi == null) {
            cachedBaseUrl = formatted
            cachedApiKey = key
            cachedApi = createApi(formatted, key)
        }
    }

    fun clearCache() {
        synchronized(this) {
            cachedApi = null
        }
    }

    fun getApi(context: Context? = null): SalariaApi {
        if (cachedApi == null) {
            synchronized(this) {
                if (cachedApi == null) {
                    cachedApi = createApi(cachedBaseUrl, cachedApiKey)
                }
            }
        }
        return cachedApi!!
    }

    private fun createApi(baseUrl: String, apiKey: String): SalariaApi {
        val authInterceptor = Interceptor { chain ->
            val request = chain.request().newBuilder()
                .header("x-api-key", apiKey)
                .header("Content-Type", "application/json")
                .build()
            chain.proceed(request)
        }

        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(loggingInterceptor)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .writeTimeout(15, TimeUnit.SECONDS)
            .build()

        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(SalariaApi::class.java)
    }
}
