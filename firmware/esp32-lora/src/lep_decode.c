#include "lep_decode.h"

#include <string.h>

static uint16_t rd_u16_le(const uint8_t *p) {
  return (uint16_t)((uint16_t)p[0] | ((uint16_t)p[1] << 8));
}

static uint32_t rd_u32_le(const uint8_t *p) {
  return (uint32_t)p[0] | ((uint32_t)p[1] << 8) | ((uint32_t)p[2] << 16) | ((uint32_t)p[3] << 24);
}

static int32_t rd_i32_le(const uint8_t *p) {
  union {
    uint32_t u;
    int32_t i;
  } x;
  x.u = rd_u32_le(p);
  return x.i;
}

static int16_t rd_i16_le(const uint8_t *p) {
  union {
    uint16_t u;
    int16_t i;
  } x;
  x.u = rd_u16_le(p);
  return x.i;
}

bool lep_decode_full(const uint8_t *wire, size_t wire_len, lep_full_hdr_t *hdr_out, char *text_out,
                     size_t text_out_cap) {
  if (!wire || !hdr_out || !text_out || text_out_cap == 0) {
    return false;
  }
  text_out[0] = '\0';
  if (wire_len < LEP_PREFIX_LEN + 2u) {
    return false;
  }
  const uint32_t magic = rd_u32_le(wire);
  if (magic != LEP_MAGIC) {
    return false;
  }
  if (wire[4] != LEP_VERSION) {
    return false;
  }
  if (wire[5] & LEP_FLAG_ENCRYPTED) {
    return false;
  }
  const uint8_t text_len = wire[25];
  if (text_len > LEP_TEXT_MAX) {
    return false;
  }
  const size_t need = LEP_PREFIX_LEN + text_len + 2u;
  if (wire_len < need) {
    return false;
  }
  const uint16_t crc_want = rd_u16_le(wire + LEP_PREFIX_LEN + text_len);
  const uint16_t crc_got = lep_crc16_ccitt_false(wire, LEP_PREFIX_LEN + text_len);
  if (crc_want != crc_got) {
    return false;
  }

  memset(hdr_out, 0, sizeof(*hdr_out));
  hdr_out->magic = magic;
  hdr_out->version = wire[4];
  hdr_out->flags = wire[5];
  hdr_out->reserved = rd_u16_le(wire + 6);
  hdr_out->unix_time = rd_u32_le(wire + 8);
  hdr_out->lat_e7 = rd_i32_le(wire + 12);
  hdr_out->lon_e7 = rd_i32_le(wire + 16);
  hdr_out->alt_m = rd_i16_le(wire + 20);
  hdr_out->h_accuracy_m = rd_u16_le(wire + 22);
  hdr_out->battery_pct = wire[24];
  hdr_out->text_len = text_len;
  memcpy(hdr_out->device_id, wire + 26, 8);

  if (text_len > 0) {
    if (text_out_cap <= text_len) {
      return false;
    }
    memcpy(text_out, wire + 34, text_len);
    text_out[text_len] = '\0';
  }
  return true;
}
