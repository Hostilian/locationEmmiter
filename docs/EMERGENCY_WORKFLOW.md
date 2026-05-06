# Emergency workflow

## On the emitter

1. Obtain GNSS fix; if unavailable, you may still send **SOS** with last known coords (set accuracy to **0** and document policy locally).
2. Set **`FLAG_SOS`** on the LEP packet; keep **`FLAG_RELAY_ELIGIBLE`** if the mesh should repeat you.
3. Use **mesh-wrapped LoRa** ([MESH_FRAME.md](MESH_FRAME.md)) for sub-GHz TX; use **BLE short** only for nearby responders.
4. Respect **duty cycle** and power: prefer a slower beacon period when not in SOS, faster when SOS is active (within legal limits).

## On receive / base

1. Decode every frame → validate CRC → apply [relay rules](RECEIVERS_AND_RELAY.md).
2. **Deduplicate** by payload hash or `(device_id, unix_time, lat, lon)`.
3. Build a **last-known-good** table: `lastKnownByDevice()` in [`shared/packet`](../shared/packet/src/track.ts).
4. Export **GPX/CSV** for SAR tools ([RECEIVERS_AND_RELAY.md](RECEIVERS_AND_RELAY.md)).
5. Prioritize display: **SOS** first, then freshest **unix_time** per device.

## CLI

After `npm run build`:

```bash
npm run decode-packet -- -- 4C 52 4D 31 ...
```
