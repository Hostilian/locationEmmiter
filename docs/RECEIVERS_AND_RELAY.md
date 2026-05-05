# Receivers, relay rules, and exports

## Who receives

| Role | Hardware / software | Notes |
|------|---------------------|--------|
| **Peer** | Phone app (BLE central), ESP32-S3 with BLE + LoRa, or Meshtastic-class node adapted to this payload | Displays map pins; optional alert on **SOS** |
| **Fixed relay** | ESP32 or SBC at window/roof with **good antenna height** | Extends mesh toward a **base camp** or internet uplink (uplink is product-specific) |
| **SAR / base camp** | Laptop + USB LoRa dongle or dedicated handheld | Import **GPX/CSV** from logs; prioritize **SOS** and freshest **unix_time** |

All receivers implement: **parse v1** → validate **CRC** → dedupe by **`(device_id, unix_time)`** (or sliding window per `device_id`).

## Relay policy (store-and-forward)

Default rules for nodes that set **`FLAG_RELAY_ELIGIBLE`** on their **own** beacons and implement relay:

1. **Never relay** if the frame fails CRC or `version != 1`.
2. **Hop limit:** add a **relay header** *outside* the v1 packet (transport-specific). Suggested: 1 byte `hop_remaining` initialized to **3**; decrement each relay; drop at **0**.
3. **Dedupe:** maintain a cache of **`hash(device_id, unix_time, lat_e7, lon_e7)`** (or full payload hash) for **15 minutes**; suppress duplicates.
4. **SOS priority:** if **`FLAG_SOS`**, relay **sooner** (lower random backoff) and allow **one extra hop** vs non-SOS (implementation choice).
5. **Rate limit:** max **1 relay per originating device per 30 s** for non-SOS; **1 per 10 s** for SOS (prevents mesh floods).

*The v1 packet does not contain hop count; always wrap it in a mesh-specific envelope on LoRa.* See [MESH_FRAME.md](MESH_FRAME.md) and [`shared/mesh`](../shared/mesh/).

## BLE vs LoRa framing

- **BLE:** raw **27-byte** short payload in manufacturer data (see spec).
- **LoRa:** **full** packet (`36 + text_len` bytes typical). Prepend mesh header (hop, optional `sender_id`) as your stack requires.

## Export formats

### GPX 1.1 (waypoints)

One waypoint per decoded position (file built from a time-ordered log):

- **`lat` / `lon`:** from `lat_e7` / `lon_e7` ÷ 1e7  
- **`ele`:** `alt_m` if non-zero or if policy treats 0 as unknown  
- **`time`:** ISO 8601 from `unix_time`  
- **`name`:** `device_id` hex + optional `(SOS)` if flag set  
- **`desc`:** UTF-8 `text` if present  

Programmatic helper: `packetsToGpx()` in [`shared/packet/src/export.ts`](../shared/packet/src/export.ts).

### CSV

Columns (header row):

```text
unix_time,iso_time,lat,lon,alt_m,h_accuracy_m,battery_pct,sos,relay_eligible,device_id_hex,text
```

`device_id_hex` is 16 hex chars (8 bytes). `sos` / `relay_eligible` are `0` or `1`.

Helper: `packetsToCsv()` in the same module.

## Privacy

Receivers should **not** upload live tracks to public servers without **explicit user consent**. Treat `device_id` as pseudonymous.
