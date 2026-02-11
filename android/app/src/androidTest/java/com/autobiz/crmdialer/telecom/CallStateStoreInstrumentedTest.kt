package com.autobiz.crmdialer.telecom

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.autobiz.crmdialer.crm.LookupUiState
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CallStateStoreInstrumentedTest {
  @Test
  fun sorts_ringing_before_active_calls() {
    val store = CallStateStore()
    store.upsert(
      CallUiModel(
        id = "active",
        numberRaw = "0201",
        normalizedNumber = "+49201",
        displayNumber = "0201",
        state = android.telecom.Call.STATE_ACTIVE,
        canHold = true,
        isIncoming = false,
        lookupUiState = LookupUiState.Idle
      )
    )
    store.upsert(
      CallUiModel(
        id = "ringing",
        numberRaw = "030",
        normalizedNumber = "+4930",
        displayNumber = "030",
        state = android.telecom.Call.STATE_RINGING,
        canHold = false,
        isIncoming = true,
        lookupUiState = LookupUiState.Idle
      )
    )

    val calls = store.calls.value
    assertEquals(2, calls.size)
    assertEquals("ringing", calls.first().id)
  }
}
