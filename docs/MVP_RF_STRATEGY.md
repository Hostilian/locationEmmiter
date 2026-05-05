# MVP RF strategy (decision)

This repo implements **both** tracks from the plan; the **primary** link for SAR and kilometer-scale range is **dedicated sub‑GHz (LoRa-class) hardware**, while **BLE** is the **fastest phone-only** path for dense urban peer discovery.

## The core engineering split

1. **Know position** — GNSS receiver (GPS/Galileo/etc.). It is **receive-only**: with a clear sky view you can compute a fix **without cellular or Wi‑Fi** (cold start is slower without assistance data). Indoors, urban canyons, and heavy canopy degrade or block fixes.
2. **Tell someone else** — a **separate transmit chain** (LoRa, BLE, satellite modem, etc.) carrying an encoded payload. This repository standardizes that payload as **LEP v1** ([spec](../spec/on-air-packet-v1.md)) plus an optional **LRM1 mesh wrapper** ([MESH_FRAME.md](MESH_FRAME.md)).

Anything that forwards your bytes to the internet (e.g. **The Things Network**) is still “no SIM on the tracker,” but the **backhaul** is someone else’s gateway online.

## Zone A — City / suburb (no SIM on device)

| Approach | Idea | vs this repo |
|----------|------|----------------|
| **LoRaWAN + TTN** | Community gateways receive 868 MHz (EU ISM) frames and forward to TTN’s servers; you view on a map. | **Different stack:** LoRaWAN framing, keys, and MAC. **Not** byte-compatible with LEP. Many cities (e.g. community coverage in **Prague** and elsewhere) have usable gateway density—**check live TTN maps** before betting a mission on it. |
| **Meshtastic** | Off-the-shelf firmware: LoRa **mesh** between nodes; optional phone map. **TTGO T-Beam** class boards = ESP32 + LoRa + GNSS in one. | **Different on-air protocol** from LEP. Fastest “it just meshes” path. You can still use the **same hardware** later for a **custom LEP** firmware that calls `lep_encode_full` / mesh wrap ([firmware](../firmware/esp32-lora/)). |
| **This repo (LEP + LRM1)** | Raw **P2P** packets + optional **RelayEngine** ([`shared/mesh`](../shared/mesh/)); **you** own receivers/gateways. | Maximum control, no dependency on TTN or Meshtastic packet formats; you must deploy **listeners** or bridges. |
| **APRS** | VHF position beacons (e.g. **144.800 MHz** in much of Europe; other regions differ), digipeaters, **aprs.fi**. | Requires **amateur license** where applicable; **no encryption** on the air in many jurisdictions. Not implemented here—could **bridge** from a LEP gateway to APRS if you build it. |
| **BLE / Wi‑Fi tricks** | Encode coords in advertisements or SSID; **short range**; mainly “searchers nearby.” | LEP defines a **27-byte BLE short** form; Wi‑Fi SSID encoding is **not** in-tree ([architecture note](OFF_GRID_ARCHITECTURE_REFERENCE.md)). |

**Practical “start hacking” (community-aligned):** a **T-Beam / Heltec / RAK4631-class** board + GNSS is the right physical stack; choose **Meshtastic** for immediate mesh UX, or **this repo’s encoder** + your LoRa driver for a **custom** protocol and receivers.

## Zone B — Desert / wilderness / no infrastructure

| Approach | Role |
|----------|------|
| **PLB (406 MHz, COSPAS-SARSAT)** | **Emergency-only**, certified hardware; triggers **real SAR**. **Not** a DIY band—see [REFERENCES.md](REFERENCES.md) / [OFF_GRID_ARCHITECTURE_REFERENCE.md](OFF_GRID_ARCHITECTURE_REFERENCE.md). |
| **Consumer satellite messengers** | Garmin inReach (Iridium), SPOT (Globalstar), Zoleo, etc.—subscription, turnkey. |
| **RockBLOCK / Iridium SBD** | **DIY-friendly** satellite uplink: MCU reads GNSS, sends small **SBD** messages (~50-byte class); pay per credit. Natural **uplink of last resort**; bridge from a **LEP** or **Meshtastic** gateway if you want local mesh + rare sat backhaul (conceptually similar to **MeshSat**-class projects—see [REFERENCES.md](REFERENCES.md)). |

## Decision summary

| Goal | Primary MVP | Why |
|------|-------------|-----|
| **Emergency / SAR with no cell** | **ESP32 (or similar) + GNSS + LoRa P2P** | Kilometer-scale LOS range, predictable duty cycle, full v1 packet on-air |
| **Peer map in city, phone-only prototype** | **BLE manufacturer data** with [BLE short form](../spec/on-air-packet-v1.md) | No extra hardware; range ≈ tens of meters—enough to validate UX and codecs |
| **True “nowhere” backup** | **Satellite messenger** (out of scope for this repo) | Requires separate hardware/service when no mesh listeners exist |

## Implementation status in this repo

| Track | Artifact |
|-------|-----------|
| **Shared format** | [spec/on-air-packet-v1.md](../spec/on-air-packet-v1.md), TypeScript codec [`shared/packet`](../shared/packet/) |
| **LoRa / MCU** | [`firmware/esp32-lora`](../firmware/esp32-lora/) — builds a **full** v1 frame; integrate your LoRa driver (e.g. RadioLib, Arduino LoRa) for TX |
| **Phone BLE** | Use `encodeBleShort()` from `@location-emitter/packet` inside a mobile app’s BLE advertisement builder (app not scaffolded here) |

## Rough hardware / cost tiers (illustrative)

| Layer | City-oriented | Wilderness-oriented |
|--------|----------------|---------------------|
| **Position** | u-blox NEO-M8\* / M10\* class, or module on T-Beam | Same |
| **RF** | LoRa 868 MHz (EU) board + this firmware or Meshtastic | Iridium SBD modem (e.g. RockBLOCK) or commercial messenger |
| **Protocol** | LEP+LRM1 here, or LoRaWAN, or Meshtastic | SBD / vendor app; LEP possible on the **terrestrial** leg |
| **Power** | 18650 / USB | Larger cell + solar common |
| **License** | **ISM rules** (power, duty cycle—not “unregulated”) | Iridium civil; **406 MHz only certified PLB** |

## Ordering recommendation

1. Lock the **packet** (done) and run **field tests** on **LoRa** in open terrain (see [FIELD_TEST_MATRIX.md](FIELD_TEST_MATRIX.md)).
2. Add a **phone BLE** advertiser only after you have a **receiver** that decodes the same bytes (another phone or an ESP32 with BLE central).
3. If you want **fast community mesh**: flash **Meshtastic** on a T-Beam; if you want **custom interoperability** with this repo: keep **LEP** on the wire and add your own gateways.

PlatformIO presets for **T-Beam / Heltec**, TX vs **RX decode**, are in [BOARDS.md](BOARDS.md).

## Regulatory reminder

Match **frequency, power, and duty cycle** to your region (e.g. EU 868 MHz vs US 915 MHz). This documentation is not legal advice.
