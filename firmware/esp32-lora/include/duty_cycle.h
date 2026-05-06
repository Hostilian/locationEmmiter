#ifndef DUTY_CYCLE_H
#define DUTY_CYCLE_H

#include <Arduino.h>
#include <lora_config.h>

/**
 * Rough airtime estimate (ms) similar to tools/lora-airtime.mjs.
 * Explicit header + CRC assumed.
 */
static inline uint32_t duty_estimate_toa_ms(size_t payload_bytes) {
  const float sf = (float)LORA_SF;
  const float bw_hz = (float)LORA_BW * 1000.0f;
  const float ts = powf(2.0f, sf) / bw_hz;
  const float de = (LORA_SF >= 12) ? 1.0f : 0.0f;
  const float num = 8.0f * (float)payload_bytes - 4.0f * sf + 28.0f + 16.0f - 20.0f;
  const float den = 4.0f * (sf - 2.0f * de);
  const float ratio = num / den;
  const float ceil_part = ceilf(ratio > 0.0f ? ratio : 0.0f);
  const float payload_symbols = 8.0f + ceil_part * (float)LORA_CR;
  const float total_symbols = 8.0f + 4.25f + payload_symbols;
  const float toa_ms = total_symbols * ts * 1000.0f;
  return (uint32_t)(toa_ms + 0.5f);
}

/** Conservative min TX gap for rough 1% duty planning. */
static inline uint32_t duty_min_gap_ms(size_t payload_bytes) {
  const uint32_t toa = duty_estimate_toa_ms(payload_bytes);
  const uint32_t min_gap = toa * 100u; // 1%
  return min_gap < 1000u ? 1000u : min_gap;
}

#endif
