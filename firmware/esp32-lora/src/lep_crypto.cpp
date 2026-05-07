#include "lep_v2.h"
#include <Arduino.h>

#if defined(ESP32)
#include <mbedtls/chachapoly.h>
#include <esp_system.h>

size_t lep_v2_encrypt(uint8_t *out, size_t out_cap, const uint8_t *in, size_t in_len, const uint8_t *key) {
  if (in_len < sizeof(lep_full_hdr_t)) return 0;
  
  const size_t encrypted_len = in_len - 8; // we encrypt everything after the first 8 bytes of header
  const size_t need = 8 + LEP_NONCE_LEN + encrypted_len + LEP_MAC_TAG_LEN;
  
  if (out_cap < need) return 0;

  // Copy magic, version, flags, reserved
  memcpy(out, in, 8);
  out[4] = LEP_VERSION_2;
  out[5] |= LEP_FLAG_ENCRYPTED; // Set encrypted flag

  // Generate Nonce
  uint8_t nonce[LEP_NONCE_LEN];
  for (int i = 0; i < LEP_NONCE_LEN; i++) {
    nonce[i] = (uint8_t)esp_random();
  }
  memcpy(out + 8, nonce, LEP_NONCE_LEN);

  // Authenticated Additional Data (AAD) is the 8-byte unencrypted header
  const uint8_t *aad = out;
  size_t aad_len = 8;

  // The payload to encrypt
  const uint8_t *plain = in + 8;
  
  mbedtls_chachapoly_context ctx;
  mbedtls_chachapoly_init(&ctx);
  mbedtls_chachapoly_setkey(&ctx, key);

  uint8_t mac_tag[LEP_MAC_TAG_LEN];
  uint8_t *cipher = out + 8 + LEP_NONCE_LEN;

  int ret = mbedtls_chachapoly_encrypt_and_tag(&ctx, encrypted_len, nonce, aad, aad_len, plain, cipher, mac_tag);
  mbedtls_chachapoly_free(&ctx);

  if (ret != 0) {
    Serial.printf("mbedtls_chachapoly_encrypt_and_tag failed: %d\n", ret);
    return 0;
  }

  // Append MAC tag
  memcpy(out + 8 + LEP_NONCE_LEN + encrypted_len, mac_tag, LEP_MAC_TAG_LEN);

  return need;
}

size_t lep_v2_decrypt(uint8_t *out, size_t out_cap, const uint8_t *in, size_t in_len, const uint8_t *key) {
  if (in_len <= 8 + LEP_NONCE_LEN + LEP_MAC_TAG_LEN) return 0;
  
  const size_t encrypted_len = in_len - 8 - LEP_NONCE_LEN - LEP_MAC_TAG_LEN;
  const size_t need = 8 + encrypted_len;

  if (out_cap < need) return 0;

  const uint8_t *nonce = in + 8;
  const uint8_t *cipher = in + 8 + LEP_NONCE_LEN;
  const uint8_t *mac_tag = in + 8 + LEP_NONCE_LEN + encrypted_len;

  // AAD is the first 8 bytes of 'in'
  const uint8_t *aad = in;
  size_t aad_len = 8;

  mbedtls_chachapoly_context ctx;
  mbedtls_chachapoly_init(&ctx);
  mbedtls_chachapoly_setkey(&ctx, key);

  uint8_t plain[256];
  if (encrypted_len > sizeof(plain)) {
    mbedtls_chachapoly_free(&ctx);
    return 0; // Too large
  }

  int ret = mbedtls_chachapoly_auth_decrypt(&ctx, encrypted_len, nonce, aad, aad_len, mac_tag, cipher, plain);
  mbedtls_chachapoly_free(&ctx);

  if (ret != 0) {
    Serial.println("mbedtls_chachapoly_auth_decrypt failed (MAC invalid!)");
    return 0;
  }

  // Restore v1 header structure
  memcpy(out, in, 8);
  out[4] = 1; // Revert to version 1 internally
  out[5] &= ~LEP_FLAG_ENCRYPTED; // Clear encrypted flag
  
  memcpy(out + 8, plain, encrypted_len);

  return need;
}

#else
// Stub for non-ESP32
size_t lep_v2_encrypt(uint8_t *out, size_t out_cap, const uint8_t *in, size_t in_len, const uint8_t *key) { return 0; }
size_t lep_v2_decrypt(uint8_t *out, size_t out_cap, const uint8_t *in, size_t in_len, const uint8_t *key) { return 0; }
#endif
