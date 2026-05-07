#ifndef LEP_V2_H
#define LEP_V2_H

#include "lep_v1.h"

#ifdef __cplusplus
extern "C" {
#endif

#define LEP_VERSION_2 2u
#define LEP_NONCE_LEN 12u
#define LEP_MAC_TAG_LEN 16u

#pragma pack(push, 1)
typedef struct {
  uint32_t magic;           // "LGEO"
  uint8_t version;          // 2
  uint8_t flags;            // Includes LEP_FLAG_ENCRYPTED
  uint16_t reserved;
  uint8_t nonce[LEP_NONCE_LEN]; // ChaCha20 Nonce
  // Everything below here is encrypted
  uint32_t unix_time;
  int32_t lat_e7;
  int32_t lon_e7;
  int16_t alt_m;
  uint16_t h_accuracy_m;
  uint8_t battery_pct;
  uint8_t text_len;
  uint8_t device_id[8];
  // text follows here...
  // MAC tag follows text...
} lep_v2_encrypted_packet_t;
#pragma pack(pop)

/**
 * Encrypt a v1 payload into a v2 buffer.
 * out: Buffer to hold encrypted packet
 * out_cap: Capacity of out
 * in: Unencrypted v1 packet
 * in_len: Length of unencrypted packet
 * key: 32-byte ChaCha20 key
 */
size_t lep_v2_encrypt(uint8_t *out, size_t out_cap, const uint8_t *in, size_t in_len, const uint8_t *key);

/**
 * Decrypt a v2 payload back into a v1 buffer.
 * out: Buffer to hold decrypted v1 packet
 * out_cap: Capacity of out
 * in: Encrypted v2 packet
 * in_len: Length of encrypted packet
 * key: 32-byte ChaCha20 key
 */
size_t lep_v2_decrypt(uint8_t *out, size_t out_cap, const uint8_t *in, size_t in_len, const uint8_t *key);

#ifdef __cplusplus
}
#endif

#endif // LEP_V2_H
