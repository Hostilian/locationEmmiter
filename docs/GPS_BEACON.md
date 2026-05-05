# GPS → LEP mesh beacon (T-Beam)

Firmware mode **`LEP_GPS_BEACON=1`** reads **NMEA GGA** sentences on the T-Beam’s **onboard GNSS UART**, fills a **LEP v1** header when `fix quality > 0`, and transmits a **mesh-wrapped** frame on LoRa every **`LEP_GPS_BEACON_PERIOD_MS`** (default **30 s**).

## Requirements

- **TTGO T-Beam** preset: `LEP_BOARD_TBEAM` (SX1276) or `LEP_BOARD_TBEAM_SX1262`.
- Pins in [`tbeam_sx1276.h`](../firmware/esp32-lora/include/boards/tbeam_sx1276.h) / [`tbeam_sx1262.h`](../firmware/esp32-lora/include/boards/tbeam_sx1262.h): `GPS_UART_RX 34`, `GPS_UART_TX 12`, **9600 baud** (typical u-blox / AT6558).
- Do **not** combine with **`LEP_RECEIVER=1`** (receiver build wins if both are set — avoid that).

## Build

```bash
cd firmware/esp32-lora
pio run -e tbeam_gps
# or SX1262 T-Beam:
pio run -e tbeam_sx1262_gps
```

Optional: add `-D LEP_GPS_BEACON_PERIOD_MS=15000` in `build_flags` for a faster cadence (watch **duty cycle** — [REGULATORY_AIRTIME.md](REGULATORY_AIRTIME.md)).

## Behaviour

- Position/altitude from **`$xxGGA`** (any talker, e.g. GPGGA/GNGGA) when fix quality **> 0**.
- **`$xxRMC`** with status **A** supplies **UTC date + time**; we cache **unix** from RMC and, when a GGA fix arrives within **~3 s** of that RMC (same epoch as typical interleaved NMEA), **`unix_time`** uses that value (avoids midnight skew from mixing stale RMC date with GGA time). Otherwise GGA time-of-day is combined with the last RMC date, then **uptime** (`millis()/1000`) if still unknown.
- **`device_id`**: derived from **EFUSE MAC** (pseudonymous).
- **Flags**: **`RELAY_ELIGIBLE`** only (no SOS in this demo).

## Compliance

Match **EU/US ISM** limits for power and **airtime**; this mode can transmit on an interval for hours — run `npm run airtime` for payload size at your SF/BW/CR.
