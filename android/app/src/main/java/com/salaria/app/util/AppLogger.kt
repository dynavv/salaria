package com.salaria.app.util

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.ConcurrentLinkedDeque

enum class LogLevel {
    INFO,
    SUCCESS,
    WARN,
    ERROR
}

data class LogEntry(
    val id: Long = System.nanoTime(),
    val timestamp: String = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date()),
    val level: LogLevel,
    val tag: String,
    val message: String
)

object AppLogger {
    private const val MAX_LOGS = 100
    private val buffer = ConcurrentLinkedDeque<LogEntry>()
    private val _logsFlow = MutableStateFlow<List<LogEntry>>(emptyList())
    val logsFlow: StateFlow<List<LogEntry>> = _logsFlow.asStateFlow()

    init {
        i("SYSTEM", "Hệ thống Salaria khởi động. Nhật ký hoạt động sẵn sàng.")
    }

    fun log(level: LogLevel, tag: String, message: String) {
        val entry = LogEntry(level = level, tag = tag, message = message)
        buffer.addFirst(entry)
        while (buffer.size > MAX_LOGS) {
            buffer.removeLast()
        }
        _logsFlow.value = buffer.toList()
        android.util.Log.println(
            when (level) {
                LogLevel.ERROR -> android.util.Log.ERROR
                LogLevel.WARN -> android.util.Log.WARN
                LogLevel.SUCCESS, LogLevel.INFO -> android.util.Log.INFO
            },
            "Salaria-$tag",
            message
        )
    }

    fun i(tag: String, message: String) = log(LogLevel.INFO, tag, message)
    fun s(tag: String, message: String) = log(LogLevel.SUCCESS, tag, message)
    fun w(tag: String, message: String) = log(LogLevel.WARN, tag, message)
    fun e(tag: String, message: String) = log(LogLevel.ERROR, tag, message)

    fun clear() {
        buffer.clear()
        _logsFlow.value = emptyList()
    }

    suspend fun syncToCloud(context: android.content.Context): Boolean {
        return try {
            val list = buffer.toList().map {
                com.salaria.app.data.model.RemoteLogDto(
                    level = it.level.name,
                    tag = it.tag,
                    source = "android_app",
                    message = it.message
                )
            }
            if (list.isEmpty()) return true
            val api = com.salaria.app.data.api.ApiClient.getApi(context)
            val res = api.postLogs(list)
            res.isSuccessful
        } catch (e: Exception) {
            false
        }
    }
}
