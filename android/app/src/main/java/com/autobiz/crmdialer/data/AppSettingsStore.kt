package com.autobiz.crmdialer.data

import android.content.Context
import android.net.Uri
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.autobiz.crmdialer.BuildConfig

private const val PREFS_NAME = "crm_dialer_secure_settings"
private const val KEY_CALLERID_BASE_URL = "callerid_base_url"
private const val KEY_WEB_APP_BASE_URL = "web_app_base_url"
private const val KEY_BEARER_TOKEN = "bearer_token"
private const val KEY_DEFAULT_COUNTRY_CODE = "default_country_code"

data class AppSettings(
  val callerIdBaseUrl: String,
  val webAppBaseUrl: String,
  val bearerToken: String,
  val defaultCountryCode: String
)

class AppSettingsStore(context: Context) {
  private val prefs = EncryptedSharedPreferences.create(
    context,
    PREFS_NAME,
    MasterKey.Builder(context)
      .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
      .build(),
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
  )

  fun read(): AppSettings {
    val baseUrlRaw = prefs.getString(KEY_CALLERID_BASE_URL, null).orEmpty().trim()
    val webUrlRaw = prefs.getString(KEY_WEB_APP_BASE_URL, null).orEmpty().trim()
    return AppSettings(
      callerIdBaseUrl = normalizeBaseUrl(baseUrlRaw.ifBlank { BuildConfig.DEFAULT_CALLERID_BASE_URL }),
      webAppBaseUrl = normalizeBaseUrl(webUrlRaw.ifBlank { BuildConfig.DEFAULT_WEB_APP_BASE_URL }),
      bearerToken = prefs.getString(KEY_BEARER_TOKEN, null).orEmpty().trim(),
      defaultCountryCode = normalizeCountryCode(
        prefs.getString(KEY_DEFAULT_COUNTRY_CODE, null).orEmpty().ifBlank { "+49" }
      )
    )
  }

  fun save(settings: AppSettings) {
    prefs.edit()
      .putString(KEY_CALLERID_BASE_URL, normalizeBaseUrl(settings.callerIdBaseUrl))
      .putString(KEY_WEB_APP_BASE_URL, normalizeBaseUrl(settings.webAppBaseUrl))
      .putString(KEY_BEARER_TOKEN, settings.bearerToken.trim())
      .putString(KEY_DEFAULT_COUNTRY_CODE, normalizeCountryCode(settings.defaultCountryCode))
      .apply()
  }

  companion object {
    fun normalizeBaseUrl(raw: String): String {
      var trimmed = raw.trim()
      if (trimmed.isEmpty()) return ""

      if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
        trimmed = "https://$trimmed"
      }

      if (trimmed.startsWith("http://")) {
        val host = runCatching { Uri.parse(trimmed).host.orEmpty().lowercase() }
          .getOrDefault("")
        val isLocalHost =
          host == "localhost" ||
            host == "127.0.0.1" ||
            host == "10.0.2.2"
        if (!isLocalHost) {
          trimmed = trimmed.replaceFirst("http://", "https://")
        }
      }

      return if (trimmed.endsWith("/")) trimmed else "$trimmed/"
    }

    fun normalizeCountryCode(raw: String): String {
      val cleaned = raw.trim().replace(" ", "")
      if (cleaned.isEmpty()) return "+49"
      return if (cleaned.startsWith("+")) cleaned else "+$cleaned"
    }
  }
}
