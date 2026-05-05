# Off-grid geolocation emission — architecture reference

This note ties **autonomous positioning + RF exfiltration** themes to this repository’s **Location Emitter Protocol (LEP)** implementation. It is a **condensed engineering map**, not a copy of any third-party report. Use it to choose legal, consent-based deployments.

**Further reading:** grouped citations and URLs → [REFERENCES.md](REFERENCES.md).

## 1. Problem split (matches this repo)

| Stage | Role in this project |
|--------|----------------------|
| **Acquire position** | GNSS module → `lat_e7` / `lon_e7` / `alt_m` / `h_accuracy_m` in [spec/on-air-packet-v1.md](../spec/on-air-packet-v1.md) (phone or MCU + GNSS). |
| **Encode** | `encodeFull` / `encodeBleShort` in [`shared/packet`](../shared/packet/). |
| **Exfiltrate (RF)** | BLE short (dense, short range), LoRa + [LRM1 mesh wrapper](MESH_FRAME.md) + [`RelayEngine`](../shared/mesh/), optional future satellite modem. |

Cellular trilateration is **out of scope**: MNOs see you only when you use their RAT; this stack is **your** transmitter and **your** receivers.

## 2. Position acquisition (standalone GNSS and beyond)

- **Multi-constellation GNSS** (GPS, Galileo, GLONASS, BeiDou, QZSS, etc.) is the practical default for outdoor / desert use. **Cold start** without A-GNSS increases **TTFF**; battery-backed RTC + last almanac/ephemeris cache improves wake-from-sleep behavior.
- **Urban canyon**: multipath hurts L1-only solutions; dual-/triple-band GNSS and good antenna placement help. This repo does not implement RTK/PPP; you can still **record** accuracy in `h_accuracy_m` when the module provides it.
- **GNSS-denied** options (eLoran, UWB anchors, magnetic SLAM, etc.) are **not** implemented here; they require separate hardware and maps. If you add them, feed the output into the same LEP fields.

## 3. Urban emission patterns (and how LEP fits)

| Idea | LEP / repo status | Regulatory / ethics |
|------|-------------------|---------------------|
| **Directed LPWAN (LoRa-class)** | **Supported path**: mesh-wrapped full frames, relay policy in [RECEIVERS_AND_RELAY.md](RECEIVERS_AND_RELAY.md). | Follow **ISM / national** limits: power, **duty cycle**, band plan (e.g. EU sub-bands). High-ERP windows (where legal) need explicit hardware and compliance review. |
| **BLE peer discovery** | **Supported**: 27-byte BLE short form in spec + [`encodeBleShort`](../shared/packet/). | Consent-based teams; respect platform BLE rules. |
| **Wi‑Fi beacon / SSID tricks** | **Not implemented.** Framing coordinates in beacons can implicate **telecom / computer misuse / privacy** rules and third-party databases. | If you ever prototype, treat as **research with legal review**, not a default product feature. |
| **Apple Find My / proprietary crowdsourced BLE** | **Not implemented** and not a project goal. Reverse-engineered or spoofed tag behavior raises **serious legal, ToS, and anti-stalking** issues. | Use **licensed** trackers or **your own** BLE/LoRa receivers. |

**Practical urban stack here:** GNSS → LEP → **LoRa mesh** (optionally dense BLE for last-hundred-meter peers) + [web/peer-map](../web/peer-map/) or ATAK-style tools **you** control.

## 4. Remote / desert patterns

- **LoRa / sub-GHz**: line-of-sight and height dominate; [FIELD_TEST_MATRIX.md](FIELD_TEST_MATRIX.md) guides measurements. Mesh density falls off in empty terrain—plan **relays**, **directional links**, or **satellite backup**.
- **2.4 GHz LoRa (ISM)** appears in the market as a higher-throughput option in some environments; it is **not** wired in this firmware sketch (868 MHz example in [lora_config.h](../firmware/esp32-lora/include/lora_config.h))—retune radio driver and compliance for your band.
- **Satellite IoT** (Iridium SBD, Astrocast, Myriota, Kinéis, Lacuna-style LoRa-to-LEO, etc.): **natural extension** is a gateway that accepts LEP or mesh frames and forwards **filtered** uplinks (bytes + cost control). No satellite code ships in-tree yet; treat as **bridge firmware** + subscription.

## 5. Mesh and tactical mapping

- **Meshtastic-class ecosystems**: different on-air format, but **conceptually similar** store-and-forward. You can **bridge** LEP ↔ other protocols at a gateway if you define a translation layer (out of scope for core LEP).
- **ATAK / CoT / offline tiles**: this repo exports **GPX/CSV** ([RECEIVERS_AND_RELAY.md](RECEIVERS_AND_RELAY.md)); importing into tactical tools is an integration task on the receiving side.

## 6. Emergency tiers (legal reality)

| Mechanism | Notes |
|-----------|--------|
| **LEP + SOS flag + mesh/LoRa** | Implemented as **data fields and relay behavior**; your organization defines who monitors. |
| **COSPAS-SARSAT 406 MHz PLB/EPIRB/ELT** | **Certified hardware only.** DIY or unauthorized transmission is **dangerous and illegal** in most jurisdictions and can trigger real SAR responses. **Do not** use this band for experiments. |
| **Phone satellite SOS (e.g. Globalstar-backed)** | **Proprietary;** not something this repo implements. |

See [EMERGENCY_WORKFLOW.md](EMERGENCY_WORKFLOW.md) for **last-known-good** and export paths that stay on **your** receivers.

## 7. Power and thermal (firmware implications)

- Prefer **sleep → GNSS fix → encode → short TX burst → sleep** schedules; align beacon period with **duty cycle** and battery budget.
- Hot climates: consider cell chemistry, derating, and throttling **PA / satellite** sessions when a thermistor reports high temperature—policy hooks belong in product firmware, not in the LEP codec.

## 8. Suggested roadmap (on top of current code)

1. **GNSS integration**: read fix + accuracy from your module into `lep_full_hdr_t` / TypeScript packet types; tune TTFF with RTC/almanac strategy.
2. **Compliance**: document chosen **frequency, ERP, duty cycle**, and region for each SKU; add **airtime estimator** for LoRa payloads (optional tool).
3. **Gateway**: optional **MeshSat-style** bridge (local LoRa mesh → satellite modem) with **rate limits and SOS prioritization**—mirror [`RelayEngine`](../shared/mesh/) ideas at the IP/uplink layer.
4. **Receivers**: operational **monitoring** (ATAK import, web map, logging) with consent and data retention policy.

For the **implemented** pieces, start at [README.md](../README.md) and [spec/on-air-packet-v1.md](../spec/on-air-packet-v1.md).
