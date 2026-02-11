package com.autobiz.crmdialer.telecom

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class CallStateStore {
  private val itemsById = linkedMapOf<String, CallUiModel>()
  private val _calls = MutableStateFlow<List<CallUiModel>>(emptyList())
  val calls: StateFlow<List<CallUiModel>> = _calls.asStateFlow()

  fun upsert(item: CallUiModel) {
    itemsById[item.id] = item
    publish()
  }

  fun remove(callId: String) {
    itemsById.remove(callId)
    publish()
  }

  fun clear() {
    itemsById.clear()
    publish()
  }

  private fun publish() {
    _calls.value = itemsById.values
      .sortedWith(
        compareBy<CallUiModel>(
          { priority(it.state) },
          { it.displayNumber }
        )
      )
  }

  private fun priority(state: Int): Int {
    return when (state) {
      android.telecom.Call.STATE_RINGING -> 0
      android.telecom.Call.STATE_ACTIVE -> 1
      android.telecom.Call.STATE_DIALING -> 2
      android.telecom.Call.STATE_HOLDING -> 3
      else -> 9
    }
  }
}
