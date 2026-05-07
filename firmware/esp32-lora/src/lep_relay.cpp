#include "lep_relay.h"
#include <Arduino.h>
#include <string.h>

/** FNV-1a 32-bit hash for deduplication */
static uint32_t fnv1a32(const uint8_t *data, size_t len) {
    uint32_t h = 0x811c9dc5;
    for (size_t i = 0; i < len; i++) {
        h ^= data[i];
        h *= 0x01000193;
    }
    return h;
}

void lep_relay_init(lep_relay_state_t *state) {
    memset(state, 0, sizeof(*state));
}

bool lep_relay_process(lep_relay_state_t *state, const uint8_t *lep_data, size_t lep_len, uint8_t current_hop, uint8_t *new_hop, bool *is_duplicate) {
    if (!state || !lep_data || !new_hop || !is_duplicate) return false;
    
    *is_duplicate = false;
    uint32_t h = fnv1a32(lep_data, lep_len);
    uint32_t now = millis();
    
    // 1. Check Deduplication
    for (int i = 0; i < RELAY_DEDUPE_MAX; i++) {
        if (state->dedupe[i].hash == h && state->dedupe[i].expiry_ms > now) {
            *is_duplicate = true;
            return false;
        }
    }
    
    // Add to dedupe (FIFO)
    state->dedupe[state->dedupe_head].hash = h;
    state->dedupe[state->dedupe_head].expiry_ms = now + RELAY_DEDUPE_TTL_MS;
    state->dedupe_head = (state->dedupe_head + 1) % RELAY_DEDUPE_MAX;
    
    // 2. Check if relay is allowed
    if (current_hop <= 1) return false; // Hop limit reached
    
    // Extract flags and device_id from LEP header (fixed positions)
    if (lep_len < 34) return false; 
    uint8_t flags = lep_data[5];
    const uint8_t *device_id = lep_data + 26;
    
    bool relay_eligible = (flags & (1 << 1)) != 0; // FLAG_RELAY_ELIGIBLE
    if (!relay_eligible) return false;
    
    bool is_sos = (flags & (1 << 0)) != 0; // FLAG_SOS
    uint32_t gap = is_sos ? 10000 : 30000; // 10s for SOS, 30s for normal
    
    // 3. Rate limiting per device
    int entry_idx = -1;
    for (int i = 0; i < RELAY_RATE_LIMIT_MAX; i++) {
        if (memcmp(state->rate_limit[i].device_id, device_id, 8) == 0) {
            entry_idx = i;
            if (now - state->rate_limit[i].last_relay_ms < gap) {
                return false; // Rate limited
            }
            break;
        }
    }
    
    if (entry_idx == -1) {
        entry_idx = state->rate_limit_head;
        state->rate_limit_head = (state->rate_limit_head + 1) % RELAY_RATE_LIMIT_MAX;
        memcpy(state->rate_limit[entry_idx].device_id, device_id, 8);
    }
    
    state->rate_limit[entry_idx].last_relay_ms = now;
    *new_hop = current_hop - 1;
    return true;
}
