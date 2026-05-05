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
| [web/peer-map/](web/peer-map/) | Vite **Leaflet** peer map (paste hex) |
| [docs/OFF_GRID_ARCHITECTURE_REFERENCE.md](docs/OFF_GRID_ARCHITECTURE_REFERENCE.md) | Urban vs remote **RF strategies**, GNSS/satellite context, **legal** guardrails (maps long-form research to this repo) |
| [docs/REFERENCES.md](docs/REFERENCES.md) | **Bibliography** (GNSS, LoRa/ETSI, Meshtastic/ATAK, satellite IoT, SAR/legal context) |
| [docs/BOARDS.md](docs/BOARDS.md) | ESP32 **board presets** (T-Beam, Heltec) and **RX** firmware envs |
| [docs/REGULATORY_AIRTIME.md](docs/REGULATORY_AIRTIME.md) | LoRa **time-on-air** notes + `npm run airtime` calculator |
| [docs/GPS_BEACON.md](docs/GPS_BEACON.md) | **T-Beam**: GNSS NMEA → periodic **LEP mesh** TX (`tbeam_gps` / `tbeam_sx1262_gps`) |

## Monorepo scripts (from repo root)

```bash
npm install
npm test
npm run build
```

## Quick start (packet + mesh)

- **Packet:** `shared/packet` — `encodeFull`, `encodeBleShort`, `decodeAny`, `packetsToGpx`, `packetsToCsv`, `lastKnownByDevice`.
- **Mesh relay:** `shared/mesh` — `wrapLepWithMesh`, `encodeMeshFromPacket`, `RelayEngine` (hops, dedupe, rate limits). Spec: [docs/MESH_FRAME.md](docs/MESH_FRAME.md).

## Decode hex (CLI)

```bash
npm run build
node tools/decode-packet.mjs 4C 52 4D 31 ...
```

Hex can be a single run of digits (no spaces) or piped/redirected into stdin when it is not a TTY.

## LoRa airtime (duty planning)

```bash
npm run airtime -- --sf 9 --bw 125 --cr 7 --payload 72
```

See [docs/REGULATORY_AIRTIME.md](docs/REGULATORY_AIRTIME.md).

## Peer map (browser)

```bash
cd web/peer-map
npm install
npm run dev
```

Paste a **LEP** or **mesh (LRM1)** hex line from serial; the map centers on the decoded position (SOS styled in red).

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
