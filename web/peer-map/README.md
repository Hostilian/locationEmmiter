# Peer map (web + Android)

Vite + Leaflet UI to **decode** LEP / LRM1 hex, **encode** from device GNSS, and export GPX / CSV / GeoJSON. Shared codecs come from `../../shared/packet` and `../../shared/mesh`.

Recent additions:

- PWA service worker (offline shell + cached tiles)
- Serial / BLE ingest buttons (web APIs)
- IndexedDB history timeline slider
- Capacitor plugin set for app/clipboard/filesystem/geolocation/preferences/share + Bluetooth LE

## Web

```bash
npm install
npm run dev
```

## Android (Capacitor)

```bash
npm install
npm run cap:sync    # build web + copy into android/
npm run cap:open    # Android Studio
# or
npm run cap:run     # build, sync, run on device/emulator
```

## Demo Quickstart (Android Studio)

```bash
npm install
npm run demo:ready   # doctor + typecheck + tests + build + android sync
npm run cap:open     # open Android Studio
```

Or use a single command:

```bash
npm run demo:studio
```

Run a full demo cross-check (lint + typecheck + unit + e2e + APK build + artifact verify):

```bash
npm run demo:crosscheck
```

Need a fallback installable build without opening Android Studio?

```bash
npm run android:sdk:setup  # writes android/local.properties when auto-detectable
npm run cap:apk
```

APK output: `android/app/build/outputs/apk/debug/app-debug.apk`.
If Android SDK path is missing, set `ANDROID_HOME` / `ANDROID_SDK_ROOT` or add `sdk.dir=...` to `android/local.properties`.

In Android Studio, wait for Gradle sync to complete, choose device/emulator, then run the `app` configuration.

`demo:ready` starts by clearing old `dist`, `test-results`, and `playwright-report` artifacts so the demo starts from a clean state.

Study-oriented setup, live reload, **Web Share** for exports, **`@capacitor/app`** lifecycle hooks for the map, a **`public/manifest.webmanifest`** for install-to-home-screen on the web, and extension ideas: **[docs/ANDROID_STUDIES.md](../../docs/ANDROID_STUDIES.md)** (repo root).

After adding or upgrading Capacitor plugins, run **`npm run cap:sync`** so `android/` picks up native dependencies.
