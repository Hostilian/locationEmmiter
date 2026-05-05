# LoRa mesh wrapper (v1)

The [LEP v1](../spec/on-air-packet-v1.md) payload does not carry hop count. On **LoRa**, prepend this **6-byte** header before the full LEP frame (variable length).

| Offset | Size | Field |
|--------|------|--------|
| 0 | 4 | Magic ASCII **`LRM1`** (`4C 52 4D 31`) |
| 4 | 1 | **`hop_remaining`** — drop frame if **0** on receive; source uses **3** (normal) or **4** (**SOS**, one extra hop) |
| 5 | 1 | **Reserved** — set **0** |

**Total overhead:** 6 bytes + `sizeof(LEP)`.

**Relay:** decrement `hop_remaining` by 1, retransmit **same** LEP bytes (do not recompute CRC). See [`shared/mesh`](../shared/mesh/) for reference logic.

BLE **does not** use this wrapper; use the 27-byte short form only.
