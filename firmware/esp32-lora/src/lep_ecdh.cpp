#include "lep_ecdh.h"

#if defined(ESP32)
#include <mbedtls/ecdh.h>
#include <mbedtls/entropy.h>
#include <mbedtls/ctr_drbg.h>
#include <string.h>
#include <Arduino.h>

bool lep_ecdh_generate_keypair(uint8_t *pub_out, uint8_t *priv_out) {
  mbedtls_ecp_group grp;
  mbedtls_ecp_group_init(&grp);
  mbedtls_ecp_point Q;
  mbedtls_ecp_point_init(&Q);
  mbedtls_mpi d;
  mbedtls_mpi_init(&d);
  
  mbedtls_entropy_context entropy;
  mbedtls_ctr_drbg_context ctr_drbg;
  mbedtls_entropy_init(&entropy);
  mbedtls_ctr_drbg_init(&ctr_drbg);
  
  const char *pers = "lep_ecdh";
  int ret = mbedtls_ctr_drbg_seed(&entropy, &entropy, (const unsigned char *)pers, strlen(pers));
  if (ret != 0) return false;

  ret = mbedtls_ecp_group_load(&grp, MBEDTLS_ECP_DP_CURVE25519);
  if (ret != 0) return false;

  ret = mbedtls_ecp_gen_keypair(&grp, &d, &Q, mbedtls_ctr_drbg_random, &ctr_drbg);
  if (ret != 0) return false;

  // Export private key
  ret = mbedtls_mpi_write_binary(&d, priv_out, LEP_ECDH_PRIVKEY_LEN);
  if (ret != 0) return false;

  // Export public key (X coordinate for Curve25519)
  ret = mbedtls_mpi_write_binary(&Q.X, pub_out, LEP_ECDH_PUBKEY_LEN);
  if (ret != 0) return false;

  mbedtls_ecp_group_free(&grp);
  mbedtls_ecp_point_free(&Q);
  mbedtls_mpi_free(&d);
  mbedtls_entropy_free(&entropy);
  mbedtls_ctr_drbg_free(&ctr_drbg);

  return true;
}

bool lep_ecdh_compute_shared(const uint8_t *my_priv, const uint8_t *their_pub, uint8_t *secret_out) {
  mbedtls_ecp_group grp;
  mbedtls_ecp_group_init(&grp);
  mbedtls_ecp_point Q_their;
  mbedtls_ecp_point_init(&Q_their);
  mbedtls_mpi d_my, z;
  mbedtls_mpi_init(&d_my);
  mbedtls_mpi_init(&z);

  int ret = mbedtls_ecp_group_load(&grp, MBEDTLS_ECP_DP_CURVE25519);
  if (ret != 0) return false;

  ret = mbedtls_mpi_read_binary(&d_my, my_priv, LEP_ECDH_PRIVKEY_LEN);
  if (ret != 0) return false;

  ret = mbedtls_mpi_read_binary(&Q_their.X, their_pub, LEP_ECDH_PUBKEY_LEN);
  if (ret != 0) return false;
  ret = mbedtls_mpi_lset(&Q_their.Z, 1);
  if (ret != 0) return false;

  // Curve25519 shared secret is the X coordinate of (d_my * Q_their)
  ret = mbedtls_ecdh_compute_shared(&grp, &z, &Q_their, &d_my, NULL, NULL);
  if (ret != 0) return false;

  ret = mbedtls_mpi_write_binary(&z, secret_out, LEP_ECDH_SHARED_SECRET_LEN);
  if (ret != 0) return false;

  mbedtls_ecp_group_free(&grp);
  mbedtls_ecp_point_free(&Q_their);
  mbedtls_mpi_free(&d_my);
  mbedtls_mpi_free(&z);

  return true;
}

#else
bool lep_ecdh_generate_keypair(uint8_t *pub_out, uint8_t *priv_out) { return false; }
bool lep_ecdh_compute_shared(const uint8_t *my_priv, const uint8_t *their_pub, uint8_t *secret_out) { return false; }
#endif
