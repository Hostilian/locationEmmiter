#ifndef LEP_V1_H
#define LEP_V1_H

#include <stddef.h>
#include <stdint.h>
#include <string.h>

#ifdef __cplusplus
extern "C" {
#endif

/** Wire magic: "LGEO" as little-endian u32 */
#define LEP_MAGIC 0x4F45474Cul
#define LEP_VERSION 1u
#define LEP_TEXT_MAX 32u
#define LEP_PREFIX_LEN 34u

#define LEP_FLAG_SOS (1u << 0)
#define LEP_FLAG_RELAY_ELIGIBLE (1u << 1)
#define LEP_FLAG_ENCRYPTED (1u << 2)

#pragma pack(push, 1)
typedef struct {
  uint32_t magic;
  uint8_t version;
  uint8_t flags;
  uint16_t reserved;
  uint32_t unix_time;
  int32_t lat_e7;
  int32_t lon_e7;
  int16_t alt_m;
  uint16_t h_accuracy_m;
  uint8_t battery_pct;
  uint8_t text_len;
  uint8_t device_id[8];
} lep_full_hdr_t;
#pragma pack(pop)

static inline uint16_t lep_crc16_ccitt_false(const uint8_t *data, size_t len) {
  uint16_t crc = 0xFFFFu;
  for (size_t i = 0; i < len; i++) {
    crc = (uint16_t)(crc ^ (uint16_t)(data[i] << 8));
    for (int b = 0; b < 8; b++) {
      if (crc & 0x8000u) {
        crc = (uint16_t)((crc << 1) ^ 0x1021u);
      } else {
        crc = (uint16_t)(crc << 1);
      }
    }
  }
  return crc;
}

/**
 * Encode a full v1 packet into `out`. `text` may be NULL (treated as empty).
 * Returns total wire length, or 0 if `out_cap` too small or text too long.
 */
static inline size_t lep_encode_full(uint8_t *out, size_t out_cap, const lep_full_hdr_t *hdr_in,
                                     const char *text) {
  uint8_t tlen = 0;
  if (text) {
    tlen = (uint8_t)strnlen(text, LEP_TEXT_MAX + 1);
    if (tlen > LEP_TEXT_MAX) {
      return 0;
    }
  }
  const size_t need = LEP_PREFIX_LEN + tlen + 2;
  if (out_cap < need) {
    return 0;
  }

  lep_full_hdr_t hdr = *hdr_in;
  hdr.magic = LEP_MAGIC;
  hdr.version = LEP_VERSION;
  hdr.flags = (uint8_t)(hdr.flags & (uint8_t)~LEP_FLAG_ENCRYPTED);
  hdr.text_len = tlen;
  memcpy(out, &hdr, sizeof(hdr));
  if (tlen && text) {
    memcpy(out + LEP_PREFIX_LEN, text, tlen);
  }
  const uint16_t crc = lep_crc16_ccitt_false(out, LEP_PREFIX_LEN + tlen);
  out[LEP_PREFIX_LEN + tlen] = (uint8_t)(crc & 0xFFu);
  out[LEP_PREFIX_LEN + tlen + 1] = (uint8_t)(crc >> 8);
  return need;
}

#define LEP_BLE_SHORT_LEN 27u

/** BLE manufacturer payload (27 B). Layout matches spec (not a struct slice). */
static inline size_t lep_encode_ble_short(uint8_t *out, size_t out_cap, const lep_full_hdr_t *hdr_in) {
  if (out_cap < LEP_BLE_SHORT_LEN) {
    return 0;
  }
  lep_full_hdr_t h = *hdr_in;
  h.magic = LEP_MAGIC;
  h.version = LEP_VERSION;
  h.flags = (uint8_t)(h.flags & (uint8_t)~LEP_FLAG_ENCRYPTED);

  uint8_t *w = out;
  memcpy(w, &h.magic, sizeof(h.magic));
  w += sizeof(h.magic);
  *w++ = h.version;
  *w++ = h.flags;
  memcpy(w, &h.reserved, sizeof(h.reserved));
  w += sizeof(h.reserved);
  memcpy(w, &h.unix_time, sizeof(h.unix_time));
  w += sizeof(h.unix_time);
  memcpy(w, &h.lat_e7, sizeof(h.lat_e7));
  w += sizeof(h.lat_e7);
  memcpy(w, &h.lon_e7, sizeof(h.lon_e7));
  w += sizeof(h.lon_e7);
  *w++ = h.battery_pct;
  memcpy(w, h.device_id, 4);
  w += 4;

  const uint16_t crc = lep_crc16_ccitt_false(out, 25);
  out[25] = (uint8_t)(crc & 0xFFu);
  out[26] = (uint8_t)(crc >> 8);
  return LEP_BLE_SHORT_LEN;
}

#ifdef __cplusplus
}
#endif

#endif /* LEP_V1_H */
