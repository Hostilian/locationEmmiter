#ifndef LORA_RADIO_H
#define LORA_RADIO_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/** Initialize LoRa radio once (safe to call multiple times). */
bool lora_radio_ensure_init(void);

/** TX raw bytes on LoRa when `LEP_HAS_LORA=1`; stub returns false otherwise. */
bool lora_send(const uint8_t *data, size_t len);

/**
 * Blocking receive until a packet arrives or RadioLib times out internally.
 * On success, sets `*out_len` to payload length. Stub returns false when no radio.
 */
bool lora_try_receive(uint8_t *buf, size_t cap, size_t *out_len);

/** Optional power-save hint; no-op when unsupported/stubbed. */
void lora_radio_sleep_hint(void);

#ifdef __cplusplus
}
#endif

#endif
