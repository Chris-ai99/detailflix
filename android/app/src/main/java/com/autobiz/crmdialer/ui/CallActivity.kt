package com.autobiz.crmdialer.ui

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.telecom.Call
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.autobiz.crmdialer.DialerRuntime
import com.autobiz.crmdialer.crm.CallerLookupResponse
import com.autobiz.crmdialer.crm.LookupUiState
import com.autobiz.crmdialer.telecom.CallManager
import com.autobiz.crmdialer.telecom.CallUiModel
import com.autobiz.crmdialer.util.DeepLinkOpener

class CallActivity : ComponentActivity() {
  companion object {
    const val ACTION_FINISH = "com.autobiz.crmdialer.ACTION_FINISH_CALL_UI"
  }

  private val finishReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      if (intent?.action == ACTION_FINISH) {
        finishAndRemoveTask()
      }
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
      )
    }

    val filter = IntentFilter(ACTION_FINISH)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      registerReceiver(finishReceiver, filter, RECEIVER_NOT_EXPORTED)
    } else {
      @Suppress("DEPRECATION")
      registerReceiver(finishReceiver, filter)
    }

    setContent {
      MaterialTheme {
        Surface(modifier = Modifier.fillMaxSize()) {
          CallScreen(
            onDismiss = { finishAndRemoveTask() }
          )
        }
      }
    }
  }

  override fun onDestroy() {
    runCatching { unregisterReceiver(finishReceiver) }
    super.onDestroy()
  }
}

@Composable
private fun CallScreen(onDismiss: () -> Unit) {
  val calls by CallManager.calls.collectAsStateWithLifecycle()
  val audioState by CallManager.audioState.collectAsStateWithLifecycle()
  val context = LocalContext.current

  var selectedCallId by rememberSaveable { mutableStateOf<String?>(null) }

  val selectedCall = remember(calls, selectedCallId) {
    calls.firstOrNull { it.id == selectedCallId } ?: calls.firstOrNull()
  }

  LaunchedEffect(calls) {
    if (calls.isEmpty()) {
      onDismiss()
      return@LaunchedEffect
    }
    if (selectedCallId == null || calls.none { it.id == selectedCallId }) {
      selectedCallId = calls.first().id
    }
  }

  Scaffold { innerPadding ->
    if (selectedCall == null) {
      EmptyCallState(modifier = Modifier.padding(innerPadding))
      return@Scaffold
    }

    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(innerPadding)
        .padding(16.dp),
      verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
      Text("Aktiver Anruf", style = MaterialTheme.typography.titleLarge)
      Text(selectedCall.displayNumber, style = MaterialTheme.typography.headlineSmall)
      Text(
        stateLabel(selectedCall.state),
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.primary
      )

      if (calls.size > 1) {
        LazyRow(
          horizontalArrangement = Arrangement.spacedBy(8.dp),
          contentPadding = PaddingValues(vertical = 2.dp)
        ) {
          items(calls, key = { it.id }) { item ->
            FilterChip(
              selected = item.id == selectedCall.id,
              onClick = { selectedCallId = item.id },
              label = { Text(item.displayNumber) }
            )
          }
        }
      }

      CallControls(
        call = selectedCall,
        isMuted = audioState.isMuted,
        isSpeakerOn = audioState.isSpeakerOn
      )

      CustomerCard(
        call = selectedCall,
        onRetry = { CallManager.retryLookup(selectedCall.id) },
        onOpen = { url -> DeepLinkOpener.open(context, url) }
      )
    }
  }
}

@Composable
private fun EmptyCallState(modifier: Modifier = Modifier) {
  Column(
    modifier = modifier
      .fillMaxSize()
      .padding(24.dp),
    verticalArrangement = Arrangement.Center,
    horizontalAlignment = Alignment.CenterHorizontally
  ) {
    Text("Kein aktiver Anruf", style = MaterialTheme.typography.titleLarge)
  }
}

@Composable
private fun CallControls(call: CallUiModel, isMuted: Boolean, isSpeakerOn: Boolean) {
  if (call.state == Call.STATE_RINGING) {
    Row(
      modifier = Modifier.fillMaxWidth(),
      horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
      Button(
        modifier = Modifier.weight(1f),
        onClick = { CallManager.answer(call.id) }
      ) {
        Text("Annehmen")
      }
      OutlinedButton(
        modifier = Modifier.weight(1f),
        onClick = { CallManager.reject(call.id) }
      ) {
        Text("Ablehnen")
      }
    }
    return
  }

  Column(
    verticalArrangement = Arrangement.spacedBy(8.dp)
  ) {
    Row(
      modifier = Modifier.fillMaxWidth(),
      horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
      Button(
        modifier = Modifier.weight(1f),
        onClick = { CallManager.disconnect(call.id) }
      ) {
        Text("Auflegen")
      }
      OutlinedButton(
        modifier = Modifier.weight(1f),
        onClick = { CallManager.setMuted(!isMuted) }
      ) {
        Text(if (isMuted) "Mikro aktivieren" else "Stumm")
      }
    }

    Row(
      modifier = Modifier.fillMaxWidth(),
      horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
      OutlinedButton(
        modifier = Modifier.weight(1f),
        onClick = { CallManager.setSpeaker(!isSpeakerOn) }
      ) {
        Text(if (isSpeakerOn) "Lautsprecher aus" else "Lautsprecher")
      }
      OutlinedButton(
        modifier = Modifier.weight(1f),
        onClick = { CallManager.toggleHold(call.id) },
        enabled = call.canHold
      ) {
        Text(if (call.state == Call.STATE_HOLDING) "Fortsetzen" else "Halten")
      }
    }
  }
}

@Composable
private fun CustomerCard(
  call: CallUiModel,
  onRetry: () -> Unit,
  onOpen: (String) -> Unit
) {
  val settings = remember { DialerRuntime.settingsStore.read() }
  Card(modifier = Modifier.fillMaxWidth()) {
    Column(
      modifier = Modifier.padding(16.dp),
      verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
      Text("Kundenkarte", fontWeight = FontWeight.SemiBold)

      when (val state = call.lookupUiState) {
        LookupUiState.Idle,
        LookupUiState.Loading -> LoadingCustomerState()

        LookupUiState.NotFound -> {
          Text("Unbekannt")
          OutlinedButton(
            onClick = {
              val target = buildUnknownCustomerUrl(
                webAppBaseUrl = settings.webAppBaseUrl,
                number = call.normalizedNumber ?: call.numberRaw
              )
              if (target != null) {
                onOpen(target)
              }
            }
          ) {
            Text("Kunde anlegen")
          }
        }

        is LookupUiState.Error -> {
          Text("Daten nicht verfuegbar: ${state.message}")
          OutlinedButton(onClick = onRetry) {
            Text("Retry")
          }
        }

        is LookupUiState.Loaded -> {
          LoadedCustomerState(
            payload = state.payload,
            webAppBaseUrl = settings.webAppBaseUrl,
            fallbackNumber = call.normalizedNumber ?: call.numberRaw,
            onOpen = onOpen
          )
        }
      }
    }
  }
}

@Composable
private fun LoadingCustomerState() {
  Row(
    verticalAlignment = Alignment.CenterVertically,
    horizontalArrangement = Arrangement.spacedBy(8.dp)
  ) {
    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
    Text("Lade Kundendaten ...")
  }
}

@Composable
private fun LoadedCustomerState(
  payload: CallerLookupResponse,
  webAppBaseUrl: String,
  fallbackNumber: String?,
  onOpen: (String) -> Unit
) {
  val displayName = payload.displayName?.takeIf { it.isNotBlank() }
    ?: payload.company?.takeIf { it.isNotBlank() }
    ?: "Kunde"

  Text(displayName, style = MaterialTheme.typography.titleMedium)

  payload.company
    ?.takeIf { it.isNotBlank() }
    ?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }

  if (payload.tags.isNotEmpty()) {
    Surface(
      shape = MaterialTheme.shapes.small,
      color = MaterialTheme.colorScheme.secondaryContainer
    ) {
      Text(
        text = payload.tags.joinToString(separator = " | "),
        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
        style = MaterialTheme.typography.labelSmall
      )
    }
  }

  payload.lastNote
    ?.takeIf { it.isNotBlank() }
    ?.let { Text("Letzte Notiz: $it", style = MaterialTheme.typography.bodySmall) }

  val customerUrl = resolveWebUrl(payload.deepLinks?.customer, webAppBaseUrl)
    ?: buildCustomerUrl(webAppBaseUrl, payload.customerId)
  val newOrderUrl = resolveWebUrl(payload.deepLinks?.newOrder, webAppBaseUrl)
    ?: buildNewOrderUrl(webAppBaseUrl, payload.customerId)
  val noteUrl = customerUrl?.let { appendQuery(it, "focus", "note") }
    ?: buildUnknownCustomerUrl(webAppBaseUrl, fallbackNumber)

  Row(
    modifier = Modifier.fillMaxWidth(),
    horizontalArrangement = Arrangement.spacedBy(8.dp)
  ) {
    OutlinedButton(
      modifier = Modifier.weight(1f),
      onClick = { customerUrl?.let(onOpen) },
      enabled = customerUrl != null
    ) {
      Text("Kunde oeffnen")
    }

    OutlinedButton(
      modifier = Modifier.weight(1f),
      onClick = { newOrderUrl?.let(onOpen) },
      enabled = newOrderUrl != null
    ) {
      Text("Neuer Auftrag")
    }
  }

  OutlinedButton(
    modifier = Modifier.fillMaxWidth(),
    onClick = { noteUrl?.let(onOpen) },
    enabled = noteUrl != null
  ) {
    Text("Notiz")
  }
}

private fun stateLabel(state: Int): String {
  return when (state) {
    Call.STATE_RINGING -> "Eingehender Anruf"
    Call.STATE_ACTIVE -> "Aktiv"
    Call.STATE_DIALING -> "Wird gewaehlt"
    Call.STATE_HOLDING -> "Gehalten"
    Call.STATE_DISCONNECTED -> "Beendet"
    Call.STATE_CONNECTING -> "Verbindet"
    else -> "Status: $state"
  }
}

private fun resolveWebUrl(value: String?, webAppBaseUrl: String): String? {
  val raw = value?.trim().orEmpty()
  if (raw.isBlank()) return null

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw
  }

  val base = webAppBaseUrl.trim().trimEnd('/')
  if (base.isBlank()) return null

  return "$base/${raw.trimStart('/')}"
}

private fun buildCustomerUrl(webAppBaseUrl: String, customerId: String?): String? {
  val customer = customerId?.trim().orEmpty()
  if (customer.isBlank()) return null

  val base = webAppBaseUrl.trim().trimEnd('/')
  if (base.isBlank()) return null

  return "$base/customers/${Uri.encode(customer)}"
}

private fun buildNewOrderUrl(webAppBaseUrl: String, customerId: String?): String? {
  val customer = customerId?.trim().orEmpty()
  if (customer.isBlank()) return null

  val base = webAppBaseUrl.trim().trimEnd('/')
  if (base.isBlank()) return null

  return "$base/orders/new?customerId=${Uri.encode(customer)}"
}

private fun buildUnknownCustomerUrl(webAppBaseUrl: String, number: String?): String? {
  val base = webAppBaseUrl.trim().trimEnd('/')
  if (base.isBlank()) return null

  val cleanNumber = number?.trim().orEmpty()
  return if (cleanNumber.isBlank()) {
    "$base/customers/new"
  } else {
    "$base/customers/new?phone=${Uri.encode(cleanNumber)}"
  }
}

private fun appendQuery(url: String, key: String, value: String): String {
  val uri = Uri.parse(url)
  val builder = uri.buildUpon().clearQuery()

  val existingNames = uri.queryParameterNames
  for (name in existingNames) {
    if (name == key) continue
    for (existingValue in uri.getQueryParameters(name)) {
      builder.appendQueryParameter(name, existingValue)
    }
  }

  builder.appendQueryParameter(key, value)
  return builder.build().toString()
}
