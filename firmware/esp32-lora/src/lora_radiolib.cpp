#if defined(LEP_HAS_LORA) && LEP_HAS_LORA == 1

#include <Arduino.h>
#include <RadioLib.h>
#include <lora_config.h>
#include <lora_radio.h>
#include <vector>

#if LEP_USE_SX1262
static SX1262 g_radio = new Module(LORA_CS, LORA_DIO1, LORA_RST, LORA_BUSY);
#else
static SX1276 g_radio = new Module(LORA_CS, LORA_DIO0, LORA_RST, LORA_DIO1);
#endif

static bool g_lora_inited = false;

bool lora_radio_ensure_init(void) {
  if (g_lora_inited) {
    return true;
  }
#if LEP_USE_SX1262
#ifndef LORA_SX1262_TCXO_V
#define LORA_SX1262_TCXO_V 1.6f
#endif
  const int st = g_radio.begin(LORA_FREQ, LORA_BW, LORA_SF, LORA_CR, 0x12, (int8_t)LORA_POWER, 8,
                                LORA_SX1262_TCXO_V, false);
#else
  const int st = g_radio.begin(LORA_FREQ, LORA_BW, LORA_SF, LORA_CR, 0x12, LORA_POWER, 8, 0);
#endif
  if (st != RADIOLIB_ERR_NONE) {
    Serial.printf("RadioLib begin failed: %d\n", st);
    return false;
  }
  g_lora_inited = true;
  return true;
}

bool lora_send(const uint8_t *data, size_t len) {
  if (!lora_radio_ensure_init()) {
    return false;
  }
  std::vector<uint8_t> copy(data, data + len);
  const int st = g_radio.transmit(copy.data(), copy.size());
  if (st != RADIOLIB_ERR_NONE) {
    Serial.printf("RadioLib transmit failed: %d\n", st);
    return false;
  }
  return true;
}

bool lora_try_receive(uint8_t *buf, size_t cap, size_t *out_len) {
  if (!out_len || cap == 0) {
    return false;
  }
  *out_len = 0;
  if (!lora_radio_ensure_init()) {
    return false;
  }
  const int st = g_radio.receive(buf, cap);
  if (st != RADIOLIB_ERR_NONE) {
    return false;
  }
  const size_t n = g_radio.getPacketLength();
  *out_len = n > cap ? cap : n;
  return true;
}

#endif
