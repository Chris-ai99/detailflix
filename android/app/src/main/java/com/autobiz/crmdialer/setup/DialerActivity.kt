package com.autobiz.crmdialer.setup

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.telecom.TelecomManager
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.text.KeyboardOptions
import com.autobiz.crmdialer.ui.CallActivity

class DialerActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()

    val prefNumber = intent?.data?.schemeSpecificPart?.orEmpty().orEmpty()

    setContent {
      MaterialTheme {
        DialerScreen(
          prefilledNumber = prefNumber,
          onOpenSetup = {
            startActivity(Intent(this, SetupActivity::class.java))
          },
          onPlaceCall = { number ->
            val normalized = number.trim()
            if (normalized.isBlank()) {
              Toast.makeText(this, "Bitte Nummer eingeben", Toast.LENGTH_SHORT).show()
            } else {
              val telecomManager = getSystemService(TelecomManager::class.java)
              val uri = Uri.fromParts("tel", normalized, null)
              runCatching {
                telecomManager?.placeCall(uri, Bundle.EMPTY)
              }.onFailure {
                Toast.makeText(
                  this,
                  "Anruf konnte nicht gestartet werden. Bitte Default-Dialer zuerst aktivieren.",
                  Toast.LENGTH_LONG
                ).show()
              }
            }
          },
          onOpenCallUi = {
            startActivity(Intent(this, CallActivity::class.java))
          }
        )
      }
    }
  }
}

@Composable
private fun DialerScreen(
  prefilledNumber: String,
  onOpenSetup: () -> Unit,
  onPlaceCall: (String) -> Unit,
  onOpenCallUi: () -> Unit
) {
  var number by rememberSaveable(stateSaver = TextFieldValue.Saver) {
    mutableStateOf(TextFieldValue(prefilledNumber))
  }

  Scaffold { innerPadding ->
    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(innerPadding)
        .padding(20.dp),
      verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
      Text("CRM Dialer", style = MaterialTheme.typography.headlineSmall)
      Text(
        "Diese Ansicht dient als ROLE_DIALER Einstieg fuer ausgehende Anrufe.",
        style = MaterialTheme.typography.bodyMedium
      )

      OutlinedTextField(
        modifier = Modifier.fillMaxWidth(),
        value = number,
        onValueChange = { number = it },
        label = { Text("Telefonnummer") },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
        singleLine = true
      )

      Button(onClick = { onPlaceCall(number.text) }) {
        Text("Anruf starten")
      }

      Button(onClick = onOpenCallUi) {
        Text("Call-UI öffnen")
      }

      TextButton(onClick = onOpenSetup) {
        Text("Zu Setup")
      }
    }
  }
}

