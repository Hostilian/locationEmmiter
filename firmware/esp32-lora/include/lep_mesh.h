#ifndef LEP_MESH_H
#define LEP_MESH_H

#include <stdbool.h>
#include <stdint.h>
#include <string.h>

#ifdef __cplusplus
extern "C" {
#endif

#define LEP_MESH_HEADER_LEN 6u

/** Magic LRM1 + hop + reserved; see docs/MESH_FRAME.md */
static inline size_t lep_mesh_wrap(const uint8_t *lep, size_t lep_len, uint8_t hop_remaining, uint8_t *out,
                                   size_t out_cap) {
  if (hop_remaining == 0 || out_cap < LEP_MESH_HEADER_LEN + lep_len) {
    return 0;
  }
  out[0] = 0x4Cu;
  out[1] = 0x52u;
  out[2] = 0x4Du;
  out[3] = 0x31u;
  out[4] = hop_remaining;
  out[5] = 0;
  memcpy(out + LEP_MESH_HEADER_LEN, lep, lep_len);
  return LEP_MESH_HEADER_LEN + lep_len;
}

/** Parse LRM1 header; sets `*lep_data` to inner payload (not copied). */
static inline bool lep_mesh_unwrap(const uint8_t *buf, size_t len, uint8_t *hop_remaining, uint8_t *reserved,
                                   const uint8_t **lep_data, size_t *lep_len) {
  if (len < LEP_MESH_HEADER_LEN + 36u || !hop_remaining || !reserved || !lep_data || !lep_len) {
    return false;
  }
  if (buf[0] != 0x4Cu || buf[1] != 0x52u || buf[2] != 0x4Du || buf[3] != 0x31u) {
    return false;
  }
  *hop_remaining = buf[4];
  *reserved = buf[5];
  *lep_data = buf + LEP_MESH_HEADER_LEN;
  *lep_len = len - LEP_MESH_HEADER_LEN;
  return true;
}

/** Initial hop: 4 if SOS bit set in LEP flags, else 3. */
static inline uint8_t lep_mesh_initial_hop(uint8_t lep_flags) {
  const uint8_t sos = 1u << 0;
  return (lep_flags & sos) ? 4u : 3u;
}

#ifdef __cplusplus
}
#endif

#endif /* LEP_MESH_H */
