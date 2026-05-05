/**
 * Heltec **WiFi LoRa 32 V3** (ESP32-S3 + SX1262).
 * RadioLib: `SX1262 = Module(NSS, DIO1, RST, BUSY)` per Heltec / community sketches.
 * @see https://wiki.heltec.org/docs/devices/open-source-hardware/esp32-series/lora-32/wifi-lora-32-v3/Pin-diagram-guidance
 */
#ifndef BOARDS_HELTEC_WIFI_LORA_32_V3_SX1262_H
#define BOARDS_HELTEC_WIFI_LORA_32_V3_SX1262_H

#define LEP_USE_SX1262 1
#define LORA_CS 8
#define LORA_DIO1 14
#define LORA_RST 12
#define LORA_BUSY 13

/** Many Heltec V3 boards use crystal reference; use 0 TCXO voltage (per RadioLib). T-Beam often 1.6 V. */
#ifndef LORA_SX1262_TCXO_V
#define LORA_SX1262_TCXO_V 0.0f
#endif

#endif
