# Supported board presets (firmware)

Pin macros live under [`firmware/esp32-lora/include/boards/`](../firmware/esp32-lora/include/boards/). Pick a PlatformIO environment or define the matching `-D LEP_BOARD_*` flag.

| Environment | Board (PlatformIO) | Preset header | Notes |
|-------------|-------------------|---------------|--------|
| `tbeam_lora` | `ttgo-t-beam` | `tbeam_sx1276.h` | **SX1276**: CS 18, RST 23, DIO0 26, DIO1 33. |
| `tbeam_lora_rx` | `ttgo-t-beam` | same | **Receiver** (SX1276). |
| `tbeam_sx1262_lora` | `ttgo-t-beam` | `tbeam_sx1262.h` | **SX1262** (many **V1.1+ / USB-C** T-Beams): CS 18, DIO1 33, RST 23, **BUSY 32**. Uses RadioLib `SX1262` + TCXO `1.6f` in `begin()`. |
| `tbeam_sx1262_lora_rx` | `ttgo-t-beam` | same | **Receiver** (SX1262). |
| `tbeam_gps` | `ttgo-t-beam` | SX1276 + GPS UART | **Live GPS beacon** — see [GPS_BEACON.md](GPS_BEACON.md). |
| `tbeam_sx1262_gps` | `ttgo-t-beam` | SX1262 + GPS UART | Same on newer T-Beam. |
| `heltec_lora` | `heltec_wifi_lora_32_V2` | `heltec_wifi_lora_32_v2.h` | **SX1276** — verify DIO pins against your PCB. |
| `heltec_v3_lora` | `heltec_wifi_lora_32_V3` | `heltec_wifi_lora_32_v3_sx1262.h` | **SX1262** — NSS 8, DIO1 14, RST 12, BUSY 13; **TCXO 0 V** in RadioLib `begin` (crystal ref). |
| `heltec_v3_lora_rx` | `heltec_wifi_lora_32_V3` | same | Receiver. |
| `esp32dev_lora` | generic `esp32dev` | default pins in [`lora_config.h`](../firmware/esp32-lora/include/lora_config.h) | Edit pins to match your shield. |

**Radio parameters** (frequency, SF, BW, power) must match between **TX and RX** builds and comply with your region. Defaults are EU-style **868 MHz** in `lora_config.h`.

**RX mode** (`LEP_RECEIVER=1`): calls RadioLib `receive()`. Behavior is **blocking** per call; adjust `loop()` delay if you need lower CPU use (async DIO0 IRQ not implemented in this demo).

**SX1276 vs SX1262:** If `RadioLib begin failed: -705` (SPI timeout) on a T-Beam, you likely have an **SX1262** board—use `tbeam_sx1262_lora` / `_rx`, not `tbeam_lora`.
