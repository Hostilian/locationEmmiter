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

Study-oriented setup, live reload, **Web Share** for exports, **`@capacitor/app`** lifecycle hooks for the map, a **`public/manifest.webmanifest`** for install-to-home-screen on the web, and extension ideas: **[docs/ANDROID_STUDIES.md](../../docs/ANDROID_STUDIES.md)** (repo root).

After adding or upgrading Capacitor plugins, run **`npm run cap:sync`** so `android/` picks up native dependencies.
