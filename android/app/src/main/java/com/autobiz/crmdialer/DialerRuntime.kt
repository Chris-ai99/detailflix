package com.autobiz.crmdialer

import android.content.Context
import com.autobiz.crmdialer.crm.CallerLookupRepository
import com.autobiz.crmdialer.data.AppSettingsStore

object DialerRuntime {
  private lateinit var appContext: Context

  val settingsStore: AppSettingsStore by lazy {
    AppSettingsStore(appContext)
  }

  val callerLookupRepository: CallerLookupRepository by lazy {
    CallerLookupRepository(settingsStore)
  }

  fun init(context: Context) {
    appContext = context.applicationContext
  }
}
