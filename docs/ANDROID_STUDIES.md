# Android: peer map & platform studies

The **peer map** (`web/peer-map`) is wrapped with **[Capacitor](https://capacitorjs.com/)** so you can run the same Vite + Leaflet UI inside an **Android WebView**, ship a **debug APK**, and extend toward **native BLE**, **background location**, or **Play distribution** without rewriting the LEP codec (TypeScript lives in `shared/packet` and `shared/mesh`).

## What you get today

| Piece | Role |
|--------|------|
| `web/peer-map/` | Vite app: decode hex, encode from GNSS, Leaflet map, exports |
| `web/peer-map/android/` | Gradle project: `app`, `capacitor-android`, Cordova shim |
| `capacitor.config.ts` | `appId`, `appName`, `webDir: dist` |
| `MainActivity` | `BridgeActivity` — loads bundled `dist/` into the WebView; **`adjustResize`** so the soft keyboard shrinks the WebView instead of covering inputs |
| `@capacitor/app` | `resume` listener (with `visibilitychange`) so the map resizes after multitasking |

The Web bundle uses **`base: './'`** in Vite so asset URLs resolve inside the `capacitor://` / `https://localhost` origin.

## Prerequisites

- **JDK 17** (Android Studio bundles one; set `JAVA_HOME` if you use CLI only).
- **Android SDK** with **SDK Platform 35** (matches `compileSdkVersion` / `targetSdkVersion` in `android/variables.gradle`).
- **Android Studio** (recommended) or `adb` for install.

Optional: **Node 20+** for `npm` and Capacitor CLI.

## First build & install

From repo root, install shared deps if you have not:

```bash
npm install
```

From `web/peer-map`:

```bash
npm install
npm run cap:sync
```

Then either:

- **Android Studio:** `npm run cap:open` → Run ▶ on a device or emulator, or **Build → Build APK(s)**.
- **CLI (debug APK):** from `web/peer-map/android`:

  ```bash
  # Windows
  gradlew.bat assembleDebug

  # macOS / Linux
  ./gradlew assembleDebug
  ```

  Output: `app/build/outputs/apk/debug/app-debug.apk` → install with `adb install -r app-debug.apk` or sideload.

**Location:** the manifest declares `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION`. The first time you tap **Use my location**, the WebView triggers the system permission dialog; if the user denies it, encoding from GNSS shows an error (same as the browser).

## Study tracks (suggested order)

### 1. WebView + hybrid lifecycle

- Open **Chrome** on the desktop → `chrome://inspect` → attach to the **WebView** when the app runs (WebView debugging must be enabled; Capacitor debug builds typically allow this).
- Watch **network** requests for map tiles (HTTPS to OSM / CARTO). If you go offline, the in-app banner reflects `navigator.onLine`.
- **Exercise:** Change a string in `index.html`, run `npm run build`, then `npx cap sync android`, reinstall — observe that only the `dist/` copy under `android/app/src/main/assets/public` updates.
- **Lifecycle:** the app depends on **`@capacitor/app`** (`resume`) and **`visibilitychange`** so Leaflet calls **`invalidateSize()`** after you leave the app (e.g. grant location in Settings) and return — otherwise tiles/markers can look clipped until you rotate the screen.

### 2. Permissions & privacy

- Read `android/app/src/main/AndroidManifest.xml`: `INTERNET`, fine/coarse location.
- **Exercise:** Temporarily remove `ACCESS_FINE_LOCATION` and note how **Use my location** fails; restore it.
- **Going further:** read [Android 12+ approximate vs precise](https://developer.android.com/training/location/permissions) and how that interacts with `navigator.geolocation` in a WebView.

### 3. Gradle & API levels

- `android/variables.gradle`: `minSdkVersion = 23`, `compileSdkVersion = 35`.
- **Exercise:** Look up what **minSdk 23** implies for hardware you care about (e.g. older trail phones).

### 4. Live reload (cleartext HTTP)

Debug builds include **`src/debug/AndroidManifest.xml`** with **`usesCleartextTraffic="true"`** so you can point the WebView at a **dev server** on your LAN (e.g. Vite on `http://YOUR_PC_IP:5173`).

1. Uncomment / add a `server` block in `capacitor.config.ts` (see comment in that file).
2. `npm run dev -- --host` (or bind `0.0.0.0`) on the PC.
3. `npm run cap:run` (or `npx cap run android --livereload --external` per [Capacitor live reload](https://capacitorjs.com/docs/guides/live-reload)).

**Security:** release builds should **not** rely on cleartext; ship the bundled `dist/` only (default `cap:sync` flow).

### 5. Exports & Web Share

- **GPX / CSV / GeoJSON** buttons try **`navigator.share({ files: [File] })`** first when `canShare` reports support (common on **Chrome WebView** on recent Android). That opens the system **share sheet** (Drive, Mail, another app). If sharing is unavailable or the user cancels, the code falls back to a normal **download**.
- **Clipboard:** **Paste clipboard** in Decode reads **`navigator.clipboard`** (needs a tap — user gesture). Copy a hex line from a serial monitor app or chat, then tap **Paste clipboard** to append and plot. If Android blocks read, paste manually into the hex field.
- **Exercise:** Export a small GPX after plotting sample hex; share to **Files** or **Gmail** and confirm the attachment name and contents.
- **Exercise:** Filter logs while sharing: `adb logcat *:S chromium:V ActivityManager:I` (adjust tags to your device’s WebView package).

### 6. Native extensions (research / future work)

| Topic | Why it matters for “location emitter” |
|--------|----------------------------------------|
| **Capacitor plugin** (Kotlin/Java) | Expose LoRa/BLE UART, batch hex logs, or trusted device ID. |
| **Android BLE** (`BLUETOOTH_SCAN`, `CONNECT`) | Advertising **LEP BLE short** from the phone is **not** implemented in the web app; a native plugin + foreground service is the usual path. |
| **Foreground service + notif** | Long-running receive or relay on Android 8+. |
| **Play Console** | Signing, `versionCode`, privacy policy for location. |

Protocol references: [spec/on-air-packet-v1.md](../spec/on-air-packet-v1.md), [docs/MESH_FRAME.md](MESH_FRAME.md).

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Blank white screen | `npm run build` then `npx cap sync android`; confirm `dist/index.html` exists. |
| Map tiles empty | Device/emulator **network**, HTTPS allowed, not a captive portal. |
| Geolocation always fails | Permission in **Settings → Apps → Location Emitter Map**; GPS on; emulator extended controls location. |
| Live reload connection failed | Same Wi‑Fi, firewall, correct `server.url`, **debug** APK (cleartext). |
| Map tiles clipped after resume | Fixed in-app via `@capacitor/app` + `visibilitychange`; if an old WebView misbehaves, use **Fit all markers** or rotate once. |
| Export always downloads, never share sheet | WebView may not implement file sharing; try a system WebView update. Fallback download is intentional. |

## Repo hygiene

- Do not commit **`local.properties`** (SDK path) or **`android/app/build/`** — see root `.gitignore`.
- After changing **Capacitor** or **Android Gradle Plugin** versions, re-run `npx cap sync android` and re-open the project in Android Studio so it refreshes Gradle.
