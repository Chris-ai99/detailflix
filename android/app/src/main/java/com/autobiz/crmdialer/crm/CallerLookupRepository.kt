package com.autobiz.crmdialer.crm

import com.autobiz.crmdialer.data.AppSettingsStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import timber.log.Timber
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

class CallerLookupRepository(
  private val settingsStore: AppSettingsStore
) {
  private val cache = ConcurrentHashMap<String, LookupResult>()
  @Volatile private var cachedApi: CallerLookupApi? = null
  @Volatile private var cachedBaseUrl: String = ""
  @Volatile private var cachedToken: String = ""

  suspend fun lookup(e164: String): LookupResult = withContext(Dispatchers.IO) {
    cache[e164]?.let { return@withContext it }

    val settings = settingsStore.read()
    if (settings.callerIdBaseUrl.isBlank()) {
      return@withContext LookupResult.ConfigError("CALLERID_BASE_URL fehlt")
    }
    if (settings.bearerToken.isBlank()) {
      return@withContext LookupResult.ConfigError("Bearer Token fehlt")
    }

    return@withContext try {
      val api = getOrBuildApi(
        baseUrl = settings.callerIdBaseUrl,
        bearerToken = settings.bearerToken
      )
      val response = api.lookup(e164)
      val result = when {
        response.isSuccessful && response.body() != null -> {
          LookupResult.Success(response.body()!!)
        }
        response.code() == 404 -> LookupResult.NotFound
        else -> LookupResult.NetworkError("HTTP ${response.code()}")
      }
      cache[e164] = result
      result
    } catch (error: IllegalArgumentException) {
      LookupResult.ConfigError(error.message ?: "Ungueltige Konfiguration")
    } catch (error: Exception) {
      Timber.w(error, "Caller lookup failed for %s", e164)
      LookupResult.NetworkError(error.message ?: "Netzwerkfehler")
    }
  }

  fun clearCache() {
    cache.clear()
  }

  private fun getOrBuildApi(baseUrl: String, bearerToken: String): CallerLookupApi {
    val existing = cachedApi
    if (existing != null && cachedBaseUrl == baseUrl && cachedToken == bearerToken) {
      return existing
    }

    val authInterceptor = Interceptor { chain ->
      val request = chain.request().newBuilder()
        .addHeader("Authorization", "Bearer $bearerToken")
        .build()
      chain.proceed(request)
    }

    val logging = HttpLoggingInterceptor().apply {
      level = HttpLoggingInterceptor.Level.BASIC
    }

    val client = OkHttpClient.Builder()
      .addInterceptor(authInterceptor)
      .addInterceptor(logging)
      .connectTimeout(5, TimeUnit.SECONDS)
      .readTimeout(5, TimeUnit.SECONDS)
      .writeTimeout(5, TimeUnit.SECONDS)
      .build()

    val moshi = Moshi.Builder()
      .addLast(KotlinJsonAdapterFactory())
      .build()

    val retrofit = runCatching {
      Retrofit.Builder()
        .baseUrl(baseUrl)
        .addConverterFactory(MoshiConverterFactory.create(moshi))
        .client(client)
        .build()
    }.getOrElse { error ->
      throw IllegalArgumentException("Ungueltige Base URL fuer Caller Lookup", error)
    }

    return retrofit.create(CallerLookupApi::class.java).also {
      cachedApi = it
      cachedBaseUrl = baseUrl
      cachedToken = bearerToken
    }
  }
}
