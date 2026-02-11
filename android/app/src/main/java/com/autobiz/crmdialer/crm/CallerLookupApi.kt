package com.autobiz.crmdialer.crm

import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

interface CallerLookupApi {
  @GET("api/callerid/lookup")
  suspend fun lookup(@Query("e164") e164: String): Response<CallerLookupResponse>
}
