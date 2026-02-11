package com.autobiz.crmdialer.telecom

import android.telecom.Call
import android.telecom.CallAudioState
import android.telecom.VideoProfile
import com.autobiz.crmdialer.DialerRuntime
import com.autobiz.crmdialer.crm.LookupResult
import com.autobiz.crmdialer.crm.LookupUiState
import com.autobiz.crmdialer.crm.PhoneNumberNormalizer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import java.util.concurrent.ConcurrentHashMap

object CallManager {
  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
  private val callStateStore = CallStateStore()

  private val callById = ConcurrentHashMap<String, Call>()
  private val callbackById = ConcurrentHashMap<String, Call.Callback>()
  private val lookupByCallId = ConcurrentHashMap<String, LookupUiState>()

  private val _audioState = MutableStateFlow(CallAudioUiState())
  val audioState: StateFlow<CallAudioUiState> = _audioState.asStateFlow()

  val calls: StateFlow<List<CallUiModel>> = callStateStore.calls

  fun onCallAdded(call: Call) {
    val callId = callId(call)
    val callback = object : Call.Callback() {
      override fun onStateChanged(call: Call, state: Int) {
        syncCall(call)
      }

      override fun onDetailsChanged(call: Call, details: Call.Details) {
        syncCall(call)
        triggerLookup(call)
      }
    }

    callById[callId] = call
    callbackById[callId] = callback
    lookupByCallId.putIfAbsent(callId, LookupUiState.Idle)
    call.registerCallback(callback)

    syncCall(call)
    triggerLookup(call)
    Timber.i("Call added: %s", callId)
  }

  fun onCallRemoved(call: Call) {
    val callId = callId(call)
    callbackById.remove(callId)?.let { callback ->
      runCatching { call.unregisterCallback(callback) }
    }
    callById.remove(callId)
    lookupByCallId.remove(callId)
    callStateStore.remove(callId)
    Timber.i("Call removed: %s", callId)
  }

  fun onCallAudioStateChanged(audioState: CallAudioState?) {
    if (audioState == null) return
    _audioState.value = CallAudioUiState(
      isMuted = audioState.isMuted,
      isSpeakerOn = audioState.route and CallAudioState.ROUTE_SPEAKER != 0
    )
  }

  fun hasNoCalls(): Boolean = callById.isEmpty()

  fun answer(callId: String) {
    callById[callId]?.answer(VideoProfile.STATE_AUDIO_ONLY)
  }

  fun reject(callId: String) {
    callById[callId]?.reject(false, null)
  }

  fun disconnect(callId: String) {
    callById[callId]?.disconnect()
  }

  fun toggleHold(callId: String) {
    val call = callById[callId] ?: return
    if (!call.details.canHold()) return

    if (call.state == Call.STATE_HOLDING) {
      call.unhold()
    } else {
      call.hold()
    }
  }

  fun setMuted(enabled: Boolean) {
    TelecomAudioControl.setMuted(enabled)
    _audioState.value = _audioState.value.copy(isMuted = enabled)
  }

  fun setSpeaker(enabled: Boolean) {
    TelecomAudioControl.setSpeaker(enabled)
    _audioState.value = _audioState.value.copy(isSpeakerOn = enabled)
  }

  fun retryLookup(callId: String) {
    callById[callId]?.let { triggerLookup(it, force = true) }
  }

  private fun syncCall(call: Call) {
    val callId = callId(call)
    val details = call.details
    val numberRaw = details.handle?.schemeSpecificPart?.trim()
    val settings = DialerRuntime.settingsStore.read()
    val normalized = PhoneNumberNormalizer.normalize(numberRaw, settings.defaultCountryCode)
    val isIncoming =
      call.state == Call.STATE_RINGING ||
        details.callDirection == Call.Details.DIRECTION_INCOMING

    val uiModel = CallUiModel(
      id = callId,
      numberRaw = numberRaw,
      normalizedNumber = normalized,
      displayNumber = numberRaw?.takeIf { it.isNotBlank() } ?: "Unbekannt",
      state = call.state,
      canHold = details.canHold(),
      isIncoming = isIncoming,
      lookupUiState = lookupByCallId[callId] ?: LookupUiState.Idle
    )
    callStateStore.upsert(uiModel)
  }

  private fun triggerLookup(call: Call, force: Boolean = false) {
    val callId = callId(call)
    val details = call.details
    val rawNumber = details.handle?.schemeSpecificPart?.trim()
    val countryCode = DialerRuntime.settingsStore.read().defaultCountryCode
    val normalized = PhoneNumberNormalizer.normalize(rawNumber, countryCode)
    if (normalized.isNullOrBlank()) return

    if (!force && lookupByCallId[callId] is LookupUiState.Loaded) return

    lookupByCallId[callId] = LookupUiState.Loading
    syncCall(call)

    scope.launch {
      val lookup = DialerRuntime.callerLookupRepository.lookup(normalized)
      val state = when (lookup) {
        is LookupResult.Success -> LookupUiState.Loaded(lookup.payload)
        is LookupResult.NotFound -> LookupUiState.NotFound
        is LookupResult.ConfigError -> LookupUiState.Error(lookup.message)
        is LookupResult.NetworkError -> LookupUiState.Error(lookup.message)
      }
      lookupByCallId[callId] = state
      callById[callId]?.let { latest -> syncCall(latest) }
    }
  }

  private fun callId(call: Call): String {
    return call.details.telecomCallId ?: call.hashCode().toString()
  }
}

private fun Call.Details.canHold(): Boolean {
  return can(Call.Details.CAPABILITY_HOLD) || can(Call.Details.CAPABILITY_SUPPORT_HOLD)
}

private fun Call.Details.can(capability: Int): Boolean {
  return callCapabilities and capability == capability
}
