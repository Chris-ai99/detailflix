package com.autobiz.crmdialer.util

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import timber.log.Timber

object DeepLinkOpener {
  fun open(context: Context, url: String) {
    val uri = runCatching { Uri.parse(url) }.getOrNull() ?: return
    val customTabsIntent = CustomTabsIntent.Builder().build()
    try {
      customTabsIntent.launchUrl(context, uri)
    } catch (error: ActivityNotFoundException) {
      Timber.w(error, "Custom tab failed, fallback to ACTION_VIEW")
      runCatching {
        context.startActivity(
          Intent(Intent.ACTION_VIEW, uri)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        )
      }.onFailure { Timber.e(it, "Unable to open deep link") }
    }
  }
}
