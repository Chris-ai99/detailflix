package com.autobiz.crmdialer.telecom

import com.autobiz.crmdialer.crm.LookupUiState

data class CallUiModel(
  val id: String,
  val numberRaw: String?,
  val normalizedNumber: String?,
  val displayNumber: String,
  val state: Int,
  val canHold: Boolean,
  val isIncoming: Boolean,
  val lookupUiState: LookupUiState
)

data class CallAudioUiState(
  val isMuted: Boolean = false,
  val isSpeakerOn: Boolean = false
)
