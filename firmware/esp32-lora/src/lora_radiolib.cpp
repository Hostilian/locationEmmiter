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
static uint32_t g_init_failures = 0;
static uint32_t g_duty_cycle_unlock_ms = 0; // Absolute millis() when TX is allowed again

bool lora_radio_ensure_init(void) {
  if (g_lora_inited) {
    return true;
  }
  uint32_t backoff_ms = 60;
  for (int attempt = 1; attempt <= 4; attempt++) {
#if LEP_USE_SX1262
#ifndef LORA_SX1262_TCXO_V
#define LORA_SX1262_TCXO_V 1.6f
#endif
  const int st = g_radio.begin(LORA_FREQ, LORA_BW, LORA_SF, LORA_CR, 0x12, (int8_t)LORA_POWER, 8,
                               LORA_SX1262_TCXO_V, false);
#else
    const int st = g_radio.begin(LORA_FREQ, LORA_BW, LORA_SF, LORA_CR, 0x12, LORA_POWER, 8, 0);
#endif
    if (st == RADIOLIB_ERR_NONE) {
      g_lora_inited = true;
      return true;
    }
    g_init_failures++;
    Serial.printf("RadioLib begin failed: %d (attempt %d/4, failures=%lu)\n", st, attempt,
                  (unsigned long)g_init_failures);
    delay(backoff_ms);
    backoff_ms = backoff_ms < 400 ? (backoff_ms * 2) : 400;
  }
  return false;
}

bool lora_send(const uint8_t *data, size_t len) {
  if (!lora_radio_ensure_init()) {
    return false;
  }

  // ETSI Duty Cycle Enforcement (1% for 868MHz)
  if (LORA_FREQ >= 868.0 && LORA_FREQ <= 870.0) {
    if (millis() < g_duty_cycle_unlock_ms) {
      Serial.println("TX Blocked: Duty Cycle limit active");
      return false;
    }
  }

  // CSMA/CA: Clear Channel Assessment
  bool channel_free = false;
  int backoff_ms = 10;
  for (int cca_attempt = 0; cca_attempt < 5; cca_attempt++) {
    int rssi = g_radio.getRSSI(); // Quick channel check
    if (rssi < -90) { // Threshold for "channel free"
      channel_free = true;
      break;
    }
    Serial.printf("CCA Busy (RSSI %d). Backing off %d ms...\n", rssi, backoff_ms);
    delay(backoff_ms);
    backoff_ms += random(10, 50);
  }

  if (!channel_free) {
    Serial.println("TX Failed: Channel persistently busy (CSMA/CA)");
    return false;
  }

  uint32_t tx_start = millis();
  std::vector<uint8_t> copy(data, data + len);
  const int st = g_radio.transmit(copy.data(), copy.size());
  uint32_t toa_ms = millis() - tx_start;

  if (st != RADIOLIB_ERR_NONE) {
    Serial.printf("RadioLib transmit failed: %d\n", st);
    return false;
  }

  // Update Duty Cycle
  if (LORA_FREQ >= 868.0 && LORA_FREQ <= 870.0) {
    g_duty_cycle_unlock_ms = millis() + (toa_ms * 99); // 1% duty cycle
    Serial.printf("TX Success. ToA: %lu ms. Duty Cycle Lock until: %lu ms\n", toa_ms, g_duty_cycle_unlock_ms);
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

void lora_radio_sleep_hint(void) {
#if LEP_USE_SX1262
  g_radio.sleep(false);
#else
  g_radio.sleep();
#endif
}

#endif
