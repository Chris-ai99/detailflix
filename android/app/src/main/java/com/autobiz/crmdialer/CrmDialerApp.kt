package com.autobiz.crmdialer

import android.app.Application
import timber.log.Timber

class CrmDialerApp : Application() {
  override fun onCreate() {
    super.onCreate()
    DialerRuntime.init(this)
    if (BuildConfig.DEBUG) {
      Timber.plant(Timber.DebugTree())
    }
    Timber.i("CRM Dialer app initialized")
  }
}
