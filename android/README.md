# AutoBiz CRM Dialer (Android)

Default-Dialer App (Variante B) mit eigener InCall-UI und CRM Caller Lookup.

## Scope

- `minSdk = 29` (Android 10+)
- `targetSdk = 35`
- Jetpack Compose UI
- `ROLE_DIALER` Setup-Flow
- `InCallService`-basierte Call-UI (Incoming + Ongoing)
- CRM Lookup via `GET /api/callerid/lookup?e164=...` mit Bearer Token

## Projektstruktur

- `android/app/src/main/java/com/autobiz/crmdialer/setup/SetupActivity.kt`
- `android/app/src/main/java/com/autobiz/crmdialer/setup/DialerActivity.kt`
- `android/app/src/main/java/com/autobiz/crmdialer/telecom/CrmInCallService.kt`
- `android/app/src/main/java/com/autobiz/crmdialer/ui/CallActivity.kt`
- `android/app/src/main/java/com/autobiz/crmdialer/crm/*`

## Setup

1. JDK 17 installieren.
2. Android SDK + Platform 35 installieren.
3. In `android/` builden:

```bash
./gradlew :app:assembleDebug
```

## App-Konfiguration

In der `SetupActivity` konfigurieren:

- `Caller-ID API Base URL` (z. B. `https://domain.tld/`)
- `Web-App Base URL` (z. B. `https://domain.tld/`)
- `API Bearer Token`
- `Standard-Ländervorwahl` (z. B. `+49`)

Dann:

- `Als Standard-Telefon-App festlegen` (RoleManager `ROLE_DIALER`)

## API Vertrag

Request:

```http
GET /api/callerid/lookup?e164=+491701234567
Authorization: Bearer <token>
```

Response (Beispiel):

```json
{
  "customer_id": "c_123",
  "display_name": "Mueller GmbH",
  "company": "Mueller GmbH",
  "tags": ["B2B"],
  "last_note": "Rueckruf vereinbart",
  "deep_links": {
    "customer": "https://domain.tld/customers/c_123",
    "new_order": "https://domain.tld/orders/new?customerId=c_123"
  }
}
```

## Testen

Unit Tests:

```bash
./gradlew :app:testDebugUnitTest
```

Instrumented Skeleton:

```bash
./gradlew :app:connectedDebugAndroidTest
```

## Troubleshooting / OEM Hinweise

- Einige OEMs begrenzen Hintergrundstarts aggressiv. Als Default Dialer sollte die InCall-UI dennoch ueber Telecom-Flows starten; Energiespar-Whitelist kann trotzdem noetig sein.
- Bei fehlender Call-UI zuerst pruefen:
  - Rolle wirklich gesetzt (`Default Dialer: Ja`)
  - `InCallService` in App-Details nicht deaktiviert
  - Kein konkurrierender OEM-Dialer als Standard aktiv
- Bei CRM-Lookup Fehlern pruefen:
  - HTTPS erreichbar
  - Bearer Token gueltig
  - Base URL endet mit `/`
