package com.autobiz.crmdialer.setup

import android.app.role.RoleManager
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.telecom.TelecomManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.autobiz.crmdialer.DialerRuntime
import com.autobiz.crmdialer.data.AppSettings
import kotlinx.coroutines.launch

class SetupActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()

    setContent {
      MaterialTheme {
        SetupScreen(activity = this)
      }
    }
  }

  fun isDefaultDialer(): Boolean {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val roleManager = getSystemService(RoleManager::class.java)
      roleManager?.isRoleHeld(RoleManager.ROLE_DIALER) == true
    } else {
      @Suppress("DEPRECATION")
      getSystemService(TelecomManager::class.java)?.defaultDialerPackage == packageName
    }
  }

  fun buildRoleRequestIntent(): Intent? {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val roleManager = getSystemService(RoleManager::class.java)
      if (roleManager?.isRoleAvailable(RoleManager.ROLE_DIALER) == true) {
        roleManager.createRequestRoleIntent(RoleManager.ROLE_DIALER)
      } else {
        null
      }
    } else {
      Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER).putExtra(
        TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME,
        packageName
      )
    }
  }
}

@Composable
private fun SetupScreen(activity: SetupActivity) {
  val snackbarHostState = remember { SnackbarHostState() }
  val scope = rememberCoroutineScope()
  val settingsStore = remember { DialerRuntime.settingsStore }

  var callerIdBaseUrl by rememberSaveable { mutableStateOf("") }
  var webAppBaseUrl by rememberSaveable { mutableStateOf("") }
  var bearerToken by rememberSaveable { mutableStateOf("") }
  var defaultCountryCode by rememberSaveable { mutableStateOf("+49") }
  var defaultDialer by rememberSaveable { mutableStateOf(activity.isDefaultDialer()) }

  val roleRequestLauncher = rememberLauncherForActivityResult(
    contract = ActivityResultContracts.StartActivityForResult()
  ) {
    defaultDialer = activity.isDefaultDialer()
  }

  val lifecycleOwner = LocalLifecycleOwner.current
  DisposableEffect(lifecycleOwner) {
    val observer = LifecycleEventObserver { _, event ->
      if (event == Lifecycle.Event.ON_RESUME) {
        defaultDialer = activity.isDefaultDialer()
      }
    }
    lifecycleOwner.lifecycle.addObserver(observer)
    onDispose {
      lifecycleOwner.lifecycle.removeObserver(observer)
    }
  }

  LaunchedEffect(Unit) {
    val initial = settingsStore.read()
    callerIdBaseUrl = initial.callerIdBaseUrl
    webAppBaseUrl = initial.webAppBaseUrl
    bearerToken = initial.bearerToken
    defaultCountryCode = initial.defaultCountryCode
  }

  Scaffold(
    snackbarHost = { SnackbarHost(hostState = snackbarHostState) }
  ) { innerPadding ->
    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(innerPadding)
        .verticalScroll(rememberScrollState())
        .padding(20.dp),
      verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
      Text(
        text = "CRM Dialer Setup",
        style = MaterialTheme.typography.headlineSmall
      )

      Text(
        text = "Default Dialer: ${if (defaultDialer) "Ja" else "Nein"}",
        style = MaterialTheme.typography.bodyMedium
      )

      Button(
        onClick = {
          val intent = activity.buildRoleRequestIntent()
          if (intent == null) {
            scope.launch {
              snackbarHostState.showSnackbar("Dialer-Rolle ist auf diesem Gerät nicht verfügbar.")
            }
            return@Button
          }
          roleRequestLauncher.launch(intent)
        }
      ) {
        Text("Als Standard-Telefon-App festlegen")
      }

      Spacer(modifier = Modifier.height(8.dp))

      OutlinedTextField(
        modifier = Modifier.fillMaxWidth(),
        value = callerIdBaseUrl,
        onValueChange = { callerIdBaseUrl = it },
        label = { Text("Caller-ID API Base URL") },
        singleLine = true,
        placeholder = { Text("https://example.com/") }
      )

      OutlinedTextField(
        modifier = Modifier.fillMaxWidth(),
        value = webAppBaseUrl,
        onValueChange = { webAppBaseUrl = it },
        label = { Text("Web-App Base URL") },
        singleLine = true,
        placeholder = { Text("https://example.com/") }
      )

      OutlinedTextField(
        modifier = Modifier.fillMaxWidth(),
        value = bearerToken,
        onValueChange = { bearerToken = it },
        label = { Text("API Bearer Token") },
        visualTransformation = PasswordVisualTransformation()
      )

      OutlinedTextField(
        modifier = Modifier.fillMaxWidth(),
        value = defaultCountryCode,
        onValueChange = { defaultCountryCode = it },
        label = { Text("Standard-Ländervorwahl") },
        singleLine = true,
        placeholder = { Text("+49") }
      )

      Row(
        horizontalArrangement = Arrangement.spacedBy(8.dp)
      ) {
        Button(
          onClick = {
            settingsStore.save(
              AppSettings(
                callerIdBaseUrl = callerIdBaseUrl,
                webAppBaseUrl = webAppBaseUrl,
                bearerToken = bearerToken,
                defaultCountryCode = defaultCountryCode
              )
            )
            scope.launch {
              snackbarHostState.showSnackbar("Einstellungen gespeichert")
            }
          }
        ) {
          Text("Speichern")
        }

        TextButton(
          onClick = {
            val target = Intent(activity, DialerActivity::class.java)
            activity.startActivity(target)
          }
        ) {
          Text("Dialer öffnen")
        }
      }
    }
  }
}

