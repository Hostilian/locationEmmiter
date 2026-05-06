# Location Emitter (offline geolocation beacon)

Offline-first **position beacons** for **peer tracking** and **SOS-style** use: a shared **v1 binary format** for **BLE** (short) and **LoRa / MCU** (full), plus ESP32 sample firmware that builds frames for your radio driver.

## Contents

| Path | Purpose |
|------|---------|
| [spec/on-air-packet-v1.md](spec/on-air-packet-v1.md) | Normative byte layout, `flags`, CRC, BLE short form, privacy notes |
| [shared/packet/](shared/packet/) | TypeScript **encode/decode**, **GPX/CSV** export, tests |
| [firmware/esp32-lora/](firmware/esp32-lora/) | Arduino/PlatformIO sketch + **`lep_v1.h`**, **T-Beam / Heltec** presets, **RX decode** mode ([BOARDS.md](docs/BOARDS.md)) |
| [docs/MVP_RF_STRATEGY.md](docs/MVP_RF_STRATEGY.md) | **MVP RF choice:** LoRa primary for range, BLE for phone-only prototype |
| [docs/RECEIVERS_AND_RELAY.md](docs/RECEIVERS_AND_RELAY.md) | Who receives, **relay/dedupe**, export formats |
| [docs/FIELD_TEST_MATRIX.md](docs/FIELD_TEST_MATRIX.md) | **Field test** checklist (city vs open terrain, power) |
| [docs/MESH_FRAME.md](docs/MESH_FRAME.md) | LoRa **LRM1** mesh wrapper |
| [docs/EMERGENCY_WORKFLOW.md](docs/EMERGENCY_WORKFLOW.md) | SOS / last-known-good / CLI |
| [web/peer-map/](web/peer-map/) | Vite **Leaflet** peer map (paste hex) + **Capacitor Android** shell |
| [docs/ANDROID_STUDIES.md](docs/ANDROID_STUDIES.md) | **Android** build, live reload, study tracks, native extensions |
| [docs/OFF_GRID_ARCHITECTURE_REFERENCE.md](docs/OFF_GRID_ARCHITECTURE_REFERENCE.md) | Urban vs remote **RF strategies**, GNSS/satellite context, **legal** guardrails (maps long-form research to this repo) |
| [docs/REFERENCES.md](docs/REFERENCES.md) | **Bibliography** (GNSS, LoRa/ETSI, Meshtastic/ATAK, satellite IoT, SAR/legal context) |
| [docs/BOARDS.md](docs/BOARDS.md) | ESP32 **board presets** (T-Beam, Heltec) and **RX** firmware envs |
| [docs/REGULATORY_AIRTIME.md](docs/REGULATORY_AIRTIME.md) | LoRa **time-on-air** notes + `npm run airtime` calculator |
| [docs/GPS_BEACON.md](docs/GPS_BEACON.md) | **T-Beam**: GNSS NMEA → periodic **LEP mesh** TX (`tbeam_gps` / `tbeam_sx1262_gps`) |

## Monorepo scripts (from repo root)

```bash
npm install
npm run test
npm run build
npm run demo:ready    # peer-map Android preflight
npm run demo:studio   # preflight + open Android Studio
npm run demo:apk      # preflight + build Android debug APK
npm run demo:crosscheck # full quality + demo artifact cross-check
```

## Operational runbooks

- Release + rollback + incident handling: [docs/RUNBOOK_RELEASE_AND_INCIDENTS.md](docs/RUNBOOK_RELEASE_AND_INCIDENTS.md)
- Security disclosure process: [SECURITY.md](SECURITY.md)

## Quick start (packet + mesh)

- **Packet:** `shared/packet` — `encodeFull`, `encodeBleShort`, `decodeAny`, `packetsToGpx`, `packetsToCsv`, `packetsToGeoJson`, `lastKnownByDevice`.
- **Mesh relay:** `shared/mesh` — `wrapLepWithMesh`, `encodeMeshFromPacket`, `RelayEngine` (hops, dedupe, rate limits). Spec: [docs/MESH_FRAME.md](docs/MESH_FRAME.md).

## Decode hex (CLI)

```bash
npm run build
npm run decode-packet -- -- 4C 52 4D 31 ...
npm run decode-packet-all -- -- --file path/to/log.txt
npm run decode-packet-all-jsonl -- -- --file path/to/log.txt
npm run encode-packet -- --lat 48.85837 --lon 2.29481 --relay --mesh-only
```

Hex can be a single run of digits (no spaces) or piped/redirected into stdin when it is not a TTY. Use **`--file path`** to read from a file (first non-empty line if there are several, unless **`--all-lines`** / **`-a`** decodes every line into one JSON report). Root scripts: **`npm run decode-packet`**, **`npm run decode-packet-all`** (pass **`-- --`** then CLI args). Batch mode supports **`--jsonl`** with **`--all-lines`** (one JSON object per stdout line). **`--quiet`** / **`-q`** suppresses stdout on success (errors still on stderr); on Windows PowerShell prefer **`--quiet`** so `-q` is not swallowed by the shell. **`--strict`** fails on semantic warnings. **`--help`** lists options. **`--version`** / **`-V`** / **`-v`** prints the **`@location-emitter/packet`** semver used for decode.

## LoRa airtime (duty planning)

```bash
npm run airtime -- -- --sf 9 --bw 125 --cr 7 --payload 72
npm run airtime -- -- --version
```

**`--help`** / **`--version`** (or **`-v`**) work like the decode tool; semver comes from **`@location-emitter/packet`**.

See [docs/REGULATORY_AIRTIME.md](docs/REGULATORY_AIRTIME.md).

## Peer map (browser)

```bash
cd web/peer-map
npm install
npm run dev
```

Paste a **LEP** or **mesh (LRM1)** hex line from serial (flexible separators: spaces, commas, or a continuous hex string); the map centers on the decoded position (SOS styled in red). **Paste clipboard** appends from the system clipboard and plots (handy on Android). **Encode** builds full LEP, BLE short, and mesh wires from GNSS, with **Mesh → decode** round-trip, **Fit all markers**, and **Ctrl+Enter** to plot (no BLE advertising from the browser). The peer map UI supports **Auto / Light / Dark** theme (saved in `localStorage`), keeps a **session draft** of hex and encode fields while the tab is open, restores **map pan/zoom** in the same session (unless you open a **`hex` URL**), reports **which lines** failed (with **decoder reasons** for bad frames), offers **sample hex** and **load file** (size-capped) for quick tests, supports **Web Serial** / **Web Bluetooth** ingest buttons, keeps an **IndexedDB history timeline** via a slider, draws a **dashed path** through multi-point decodes (stroke updates when you change theme), shows an **offline** hint when the network drops, and can **download GPX, CSV, or GeoJSON** (GeoJSON includes **`meta`** counts; CSV UTF-8 **with BOM** for Excel) from the last plotted decode plus an optional encode pin.

### Peer map — Android (Capacitor)

Requires **JDK 17**, **Android SDK**, and **Android Studio** (or Gradle). From `web/peer-map`:

```bash
npm install
npm run cap:sync      # web build + copy into android/
npm run cap:open      # Android Studio
# or: npm run cap:run  # build, sync, run on device/emulator
```

Debug APK: `web/peer-map/android/app/build/outputs/apk/debug/app-debug.apk` (e.g. `gradlew.bat assembleDebug` under `android/`). Install with **adb** or sideload; grant **location** for **Use my location**. **Study guide** (live reload, permissions, extension ideas): [docs/ANDROID_STUDIES.md](docs/ANDROID_STUDIES.md).

## Quick start (ESP32 frame builder)

Install [PlatformIO](https://platformio.org/), then:

```bash
cd firmware/esp32-lora
pio run -e esp32dev
pio device monitor
# LoRa TX demo (generic ESP32; edit lora_config.h pins):
pio run -e esp32dev_lora
# TTGO T-Beam: SX1276 vs SX1262 (try sx1262 if init fails with -705):
pio run -e tbeam_lora
pio run -e tbeam_lora_rx
pio run -e tbeam_sx1262_lora
pio run -e tbeam_sx1262_lora_rx
# T-Beam live GPS → mesh beacon (see docs/GPS_BEACON.md):
pio run -e tbeam_gps
pio run -e tbeam_sx1262_gps
```
See [docs/BOARDS.md](docs/BOARDS.md) for **Heltec** and pin notes.

- **Default env** (`esp32dev`): **mesh-wrapped** frames on serial; `lora_send` is a stub.
- **LoRa env** (`esp32dev_lora`): **RadioLib** TX; edit [firmware/esp32-lora/include/lora_config.h](firmware/esp32-lora/include/lora_config.h) for pins and regional frequency.

## Regulatory and ethics

Follow **local RF rules** (band, ERP, duty cycle). Use for **consent-based** safety, not covert tracking.
