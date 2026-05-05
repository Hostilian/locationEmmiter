#if !defined(LEP_HAS_LORA) || LEP_HAS_LORA == 0

#include <lora_radio.h>

bool lora_radio_ensure_init(void) {
  return false;
}

bool lora_send(const uint8_t *data, size_t len) {
  (void)data;
  (void)len;
  return false;
}

bool lora_try_receive(uint8_t *buf, size_t cap, size_t *out_len) {
  (void)buf;
  (void)cap;
  if (out_len) {
    *out_len = 0;
  }
  return false;
}

#endif
