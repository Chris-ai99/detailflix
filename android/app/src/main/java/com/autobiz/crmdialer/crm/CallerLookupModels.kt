package com.autobiz.crmdialer.crm

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = false)
data class CallerLookupResponse(
  @Json(name = "customer_id") val customerId: String,
  @Json(name = "display_name") val displayName: String?,
  val company: String?,
  val tags: List<String> = emptyList(),
  @Json(name = "last_note") val lastNote: String?,
  @Json(name = "deep_links") val deepLinks: DeepLinks?
)

@JsonClass(generateAdapter = false)
data class DeepLinks(
  val customer: String?,
  @Json(name = "new_order") val newOrder: String?
)

sealed interface LookupResult {
  data class Success(val payload: CallerLookupResponse) : LookupResult
  data object NotFound : LookupResult
  data class ConfigError(val message: String) : LookupResult
  data class NetworkError(val message: String) : LookupResult
}

sealed interface LookupUiState {
  data object Idle : LookupUiState
  data object Loading : LookupUiState
  data class Loaded(val payload: CallerLookupResponse) : LookupUiState
  data object NotFound : LookupUiState
  data class Error(val message: String) : LookupUiState
}
