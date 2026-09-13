package com.salaria.app.data.model

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

object AppSyncBus {
    private val _dataChangedFlow = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val dataChangedFlow: SharedFlow<Unit> = _dataChangedFlow.asSharedFlow()

    fun notifyDataChanged() {
        _dataChangedFlow.tryEmit(Unit)
    }
}
