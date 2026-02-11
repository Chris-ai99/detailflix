package com.autobiz.crmdialer.crm

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class CallerLookupJsonParsingTest {
  @Test
  fun parses_lookup_response_payload() {
    val json = """
      {
        "customer_id": "c_123",
        "display_name": "Mueller GmbH",
        "company": "Mueller GmbH",
        "tags": ["VIP"],
        "last_note": "Rueckruf vereinbart",
        "deep_links": {
          "customer": "https://example.com/customers/c_123",
          "new_order": "https://example.com/orders/new?customerId=c_123"
        }
      }
    """.trimIndent()

    val adapter = Moshi.Builder()
      .addLast(KotlinJsonAdapterFactory())
      .build()
      .adapter(CallerLookupResponse::class.java)

    val payload = adapter.fromJson(json)
    assertNotNull(payload)
    assertEquals("c_123", payload?.customerId)
    assertEquals("Mueller GmbH", payload?.displayName)
    assertEquals("Mueller GmbH", payload?.company)
    assertEquals(listOf("VIP"), payload?.tags)
    assertEquals("Rueckruf vereinbart", payload?.lastNote)
    assertEquals("https://example.com/customers/c_123", payload?.deepLinks?.customer)
  }
}
