#ifndef LEP_DECODE_H
#define LEP_DECODE_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "lep_v1.h"

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Decode a **full** LEP v1 wire buffer (variable length). `text_out` is NUL-terminated on success.
 * Returns false on CRC / length / version errors.
 */
bool lep_decode_full(const uint8_t *wire, size_t wire_len, lep_full_hdr_t *hdr_out, char *text_out,
                     size_t text_out_cap);

#ifdef __cplusplus
}
#endif

#endif
