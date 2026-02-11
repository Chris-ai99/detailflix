package com.autobiz.crmdialer.crm

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class PhoneNumberNormalizerTest {
  @Test
  fun normalize_keeps_valid_e164() {
    val normalized = PhoneNumberNormalizer.normalize("+491701234567", "+49")
    assertEquals("+491701234567", normalized)
  }

  @Test
  fun normalize_converts_local_number_with_default_country() {
    val normalized = PhoneNumberNormalizer.normalize("0170 1234567", "+49")
    assertEquals("+491701234567", normalized)
  }

  @Test
  fun normalize_converts_00_prefix() {
    val normalized = PhoneNumberNormalizer.normalize("0049 170 1234567", "+49")
    assertEquals("+491701234567", normalized)
  }

  @Test
  fun normalize_adds_default_country_when_missing_prefix() {
    val normalized = PhoneNumberNormalizer.normalize("1701234567", "+49")
    assertEquals("+491701234567", normalized)
  }

  @Test
  fun normalize_returns_null_for_empty_or_short_values() {
    assertNull(PhoneNumberNormalizer.normalize("", "+49"))
    assertNull(PhoneNumberNormalizer.normalize("abc", "+49"))
    assertNull(PhoneNumberNormalizer.normalize("12", "+49"))
  }
}
