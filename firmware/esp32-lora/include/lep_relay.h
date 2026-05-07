#ifndef LEP_RELAY_H
#define LEP_RELAY_H

#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

/** 
 * RelayEngine for Mesh loop prevention and rate limiting.
 * Fixed-size tracker for memory efficiency on ESP32.
 */

#define RELAY_DEDUPE_MAX 64
#define RELAY_RATE_LIMIT_MAX 32
#define RELAY_DEDUPE_TTL_MS (15 * 60 * 1000)

typedef struct {
    uint32_t hash;
    uint32_t expiry_ms;
} lep_dedupe_entry_t;

typedef struct {
    uint8_t device_id[8];
    uint32_t last_relay_ms;
} lep_rate_limit_entry_t;

typedef struct {
    lep_dedupe_entry_t dedupe[RELAY_DEDUPE_MAX];
    lep_rate_limit_entry_t rate_limit[RELAY_RATE_LIMIT_MAX];
    uint8_t dedupe_head;
    uint8_t rate_limit_head;
} lep_relay_state_t;

void lep_relay_init(lep_relay_state_t *state);

/**
 * Process a received mesh frame.
 * Returns true if the frame should be forwarded (new_hop will be set).
 * Sets is_duplicate to true if the packet was already seen.
 */
bool lep_relay_process(lep_relay_state_t *state, const uint8_t *lep_data, size_t lep_len, uint8_t current_hop, uint8_t *new_hop, bool *is_duplicate);

#ifdef __cplusplus
}
#endif

#endif // LEP_RELAY_H
