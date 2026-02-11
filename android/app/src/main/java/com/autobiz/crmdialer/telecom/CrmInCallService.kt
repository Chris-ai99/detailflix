package com.autobiz.crmdialer.telecom

import android.content.Intent
import android.telecom.Call
import android.telecom.CallAudioState
import android.telecom.InCallService
import com.autobiz.crmdialer.ui.CallActivity
import timber.log.Timber

class CrmInCallService : InCallService(), InCallAudioControl {
  override fun onCreate() {
    super.onCreate()
    TelecomAudioControl.attach(this)
    Timber.i("CrmInCallService created")
  }

  override fun onDestroy() {
    TelecomAudioControl.detach(this)
    super.onDestroy()
    Timber.i("CrmInCallService destroyed")
  }

  override fun onCallAdded(call: Call) {
    super.onCallAdded(call)
    CallManager.onCallAdded(call)
    openCallUi()
  }

  override fun onCallRemoved(call: Call) {
    super.onCallRemoved(call)
    CallManager.onCallRemoved(call)
    if (CallManager.hasNoCalls()) {
      closeCallUi()
    }
  }

  override fun onCallAudioStateChanged(audioState: CallAudioState?) {
    super.onCallAudioStateChanged(audioState)
    CallManager.onCallAudioStateChanged(audioState)
  }

  override fun applyMuted(muted: Boolean) {
    super.setMuted(muted)
  }

  override fun applySpeaker(enabled: Boolean) {
    super.setAudioRoute(
      if (enabled) {
        CallAudioState.ROUTE_SPEAKER
      } else {
        CallAudioState.ROUTE_EARPIECE
      }
    )
  }

  private fun openCallUi() {
    val intent = Intent(this, CallActivity::class.java).apply {
      addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_SINGLE_TOP or
          Intent.FLAG_ACTIVITY_CLEAR_TOP
      )
    }
    startActivity(intent)
  }

  private fun closeCallUi() {
    sendBroadcast(Intent(CallActivity.ACTION_FINISH))
  }
}
