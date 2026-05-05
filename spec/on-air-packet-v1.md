# On-air packet: Location Emitter Protocol v1

Binary layout for beacons sent over BLE (advertisement manufacturer data), LoRa P2P, or other transports. **All multi-byte integers are little-endian.**

## Goals

- Single format for **peer tracking** and **SOS / SAR-style** beacons.
- Bounded size for **LoRa airtime** and **BLE manufacturer data** (~31 B useful on BLE; see §Fragmentation).
- **Versioned** so v2+ can extend without breaking parsers.

## Privacy and security (v1)

| Topic | v1 behavior | Future |
|--------|-------------|--------|
| **Coordinates** | Sent in **plaintext** on the wire | Optional **encrypted payload** (flag `encrypted=1`) with a pre-shared or ECDH-derived group key |
| **device_id** | **8-byte opaque ID** (e.g. first 8 bytes of SHA-256 of a long-lived random secret or public key). Not globally linkable to a person if the secret is not shared outside the group | Rotating IDs, pairwise keys |
| **Who can read** | Anyone who receives the RF frame | Group key restricts decryption; plaintext SOS remains an option for interoperability with unknown receivers |
| **Ethics** | Intended for **consent-based** team safety and emergency use | Do not use for covert tracking |

**Regulatory note:** Encryption on amateur radio bands may be unlawful in some jurisdictions. If you operate under ham rules, verify before using ciphertext on those allocations. ISM LoRa is generally less restrictive; still follow local ERP and duty-cycle rules.

## Packet layout

**Magic:** `0x4F45474C` — ASCII `"LGEO"` as `uint32` little-endian (bytes on wire: `4C 47 45 4F`).

| Offset | Size | Type | Field | Description |
|--------|------|------|--------|-------------|
| 0 | 4 | `u32` | `magic` | Must be `0x4F45474C` |
| 4 | 1 | `u8` | `version` | Protocol version; **1** for this spec |
| 5 | 1 | `u8` | `flags` | Bit flags (see below) |
| 6 | 2 | `u16` | `reserved` | Set to **0**; ignored on read |
| 8 | 4 | `u32` | `unix_time` | UTC seconds since 1970-01-01; **0** if unknown |
| 12 | 4 | `i32` | `lat_e7` | Latitude × 10⁷ (WGS84), range [-900000000, 900000000] |
| 16 | 4 | `i32` | `lon_e7` | Longitude × 10⁷ (WGS84), range [-1800000000, 1800000000] |
| 20 | 2 | `i16` | `alt_m` | Altitude meters AMSL (approx); **0** if unknown |
| 22 | 2 | `u16` | `h_accuracy_m` | Horizontal accuracy estimate (68% CEPlike); **0** = unknown |
| 24 | 1 | `u8` | `battery_pct` | 0–100; **255** = unknown |
| 25 | 1 | `u8` | `text_len` | Length of `text` in bytes, **0–32** |
| 26 | 8 | `u8[8]` | `device_id` | Opaque emitter identity |
| 34 | `text_len` | `u8[]` | `text` | UTF-8; may be truncated by sender |
| 34+`text_len` | 2 | `u16` | `crc16` | CRC-16-CCITT-FALSE over bytes `[0 .. 34+text_len-1)` |

**Total wire size:** `36 + text_len` bytes (34-byte fixed prefix + `text_len` + 2 CRC).  
**Minimum:** `text_len = 0` → **36 bytes**.

### `flags` bits

| Bit | Mask | Name | Meaning |
|-----|------|------|---------|
| 0 | `0x01` | **SOS** | Distress / highest priority; receivers SHOULD alert and prefer relay |
| 1 | `0x02` | **relay_eligible** | This node allows mesh/store-and-forward relay (see [RECEIVERS_AND_RELAY.md](../docs/RECEIVERS_AND_RELAY.md)) |
| 2 | `0x04` | **encrypted** | Reserved: if set in v2+, payload interpretation changes |
| 3–7 | — | reserved | Must be **0** in v1 |

## CRC-16-CCITT-FALSE

- Polynomial `0x1021`, initial value `0xFFFF`, no reflection, XOR out `0x0000`.
- Computed over all bytes before the CRC field (entire packet excluding the final 2 bytes).

Reference implementation: [`shared/packet/src/crc16.ts`](../shared/packet/src/crc16.ts).

## BLE mapping (short payload)

BLE legacy manufacturer-specific data is typically **29 bytes** after the 2-byte **Company Identifier** (31-byte AD structure total). The **v1 BLE short form** omits altitude, horizontal accuracy, optional text, and truncates `device_id` to **4 bytes**.

| Offset | Size | Field |
|--------|------|--------|
| 0 | 4 | `magic` |
| 4 | 1 | `version` (= 1) |
| 5 | 1 | `flags` |
| 6 | 2 | `reserved` |
| 8 | 4 | `unix_time` |
| 12 | 4 | `lat_e7` |
| 16 | 4 | `lon_e7` |
| 20 | 1 | `battery_pct` |
| 21 | 4 | `device_id[0..4]` |
| 25 | 2 | `crc16` over bytes **0–24** inclusive (CRC not part of the covered range) |

**Wire size:** **27 bytes**. Parsers MAY accept two trailing **reserved** bytes (0) for forward compatibility (29-byte slot).

Receivers MUST accept **full** and **short** forms. **LoRa** and other transports SHOULD use the **full** packet (§Packet layout) when space allows.

## Validation rules

1. `magic` and `version == 1` must match.
2. `crc16` must validate.
3. `text_len <= 32`.
4. If `lat_e7 == 0 && lon_e7 == 0`, treat position as **invalid / unknown** unless SOS forces display of “last heard.”

## Example (hex dump, full form, text_len=0)

Structure: 34-byte prefix + 0 text + 2 CRC = 36 bytes.

(Values illustrative; recompute CRC for real beacons.)

```
4C 47 45 4F 01 02 00 00  E0 7A 69 68 4A 7C 1C 1D
2C 4B 9A 17 00 00 0A 00  5F 00 12 34 56 78 9A BC
DE F0 11 22 33 44 [CRC_L CRC_H]
```

- `flags = 0x02` → relay only; add `0x01` for SOS.
