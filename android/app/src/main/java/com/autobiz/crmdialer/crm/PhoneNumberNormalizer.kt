package com.autobiz.crmdialer.crm

object PhoneNumberNormalizer {
  /**
   * Best-effort normalisation to E.164-like format.
   * If no international prefix exists, we fallback to defaultCountryCode.
   */
  fun normalize(raw: String?, defaultCountryCode: String = "+49"): String? {
    if (raw.isNullOrBlank()) return null

    val source = raw.trim()
    val hasLeadingPlus = source.startsWith("+")
    val digits = source.filter { it.isDigit() }
    if (digits.isEmpty()) return null

    val normalized = when {
      hasLeadingPlus -> "+$digits"
      source.startsWith("00") -> "+${digits.drop(2)}"
      source.startsWith("0") -> {
        val country = defaultCountryCode.filter { it.isDigit() }
        if (country.isEmpty()) null else "+$country${digits.drop(1)}"
      }
      else -> {
        val country = defaultCountryCode.filter { it.isDigit() }
        if (country.isEmpty()) null else "+$country$digits"
      }
    } ?: return null

    return if (normalized.length < 7) null else normalized
  }
}
