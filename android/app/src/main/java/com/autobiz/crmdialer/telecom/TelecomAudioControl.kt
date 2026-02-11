package com.autobiz.crmdialer.telecom

import java.lang.ref.WeakReference

interface InCallAudioControl {
  fun applyMuted(muted: Boolean)
  fun applySpeaker(enabled: Boolean)
}

object TelecomAudioControl {
  private var ref: WeakReference<InCallAudioControl>? = null

  fun attach(control: InCallAudioControl) {
    ref = WeakReference(control)
  }

  fun detach(control: InCallAudioControl) {
    if (ref?.get() == control) {
      ref = null
    }
  }

  fun setMuted(muted: Boolean) {
    ref?.get()?.applyMuted(muted)
  }

  fun setSpeaker(enabled: Boolean) {
    ref?.get()?.applySpeaker(enabled)
  }
}
