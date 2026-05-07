#ifndef LEP_ECDH_H
#define LEP_ECDH_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

#define LEP_ECDH_PUBKEY_LEN 32
#define LEP_ECDH_PRIVKEY_LEN 32
#define LEP_ECDH_SHARED_SECRET_LEN 32

/**
 * Generate a new X25519 keypair.
 */
bool lep_ecdh_generate_keypair(uint8_t *pub_out, uint8_t *priv_out);

/**
 * Compute shared secret using local private key and remote public key.
 */
bool lep_ecdh_compute_shared(const uint8_t *my_priv, const uint8_t *their_pub, uint8_t *secret_out);

#ifdef __cplusplus
}
#endif

#endif // LEP_ECDH_H
