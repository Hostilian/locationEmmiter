import { chacha20poly1305 } from '@noble/ciphers/chacha.js';
import { FLAG_ENCRYPTED, LEP_VERSION } from './constants.js';

export const LEP_NONCE_LEN = 12;
export const LEP_MAC_TAG_LEN = 16;
export const LEP_VERSION_2 = 2;

/**
 * Encrypt a LEP v1 packet into a v2 packet.
 */
export function encryptV2(packet: Uint8Array, key: Uint8Array): Uint8Array {
  if (packet.length < 8) throw new Error('Packet too short');

  const encryptedLen = packet.length - 8;
  const out = new Uint8Array(8 + LEP_NONCE_LEN + encryptedLen + LEP_MAC_TAG_LEN);

  // Copy header
  out.set(packet.slice(0, 8));
  out[4] = LEP_VERSION_2;
  out[5] |= FLAG_ENCRYPTED;

  // Generate random nonce
  const nonce = crypto.getRandomValues(new Uint8Array(LEP_NONCE_LEN));
  out.set(nonce, 8);

  // AAD is the first 8 bytes of the header
  const aad = out.slice(0, 8);
  const plain = packet.slice(8);

  const chacha = chacha20poly1305(key, nonce, aad);
  const cipherWithTag = chacha.encrypt(plain);

  out.set(cipherWithTag, 8 + LEP_NONCE_LEN);

  return out;
}

/**
 * Decrypt a LEP v2 packet back to v1.
 */
export function decryptV2(packet: Uint8Array, key: Uint8Array): Uint8Array {
  if (packet.length < 8 + LEP_NONCE_LEN + LEP_MAC_TAG_LEN) {
    throw new Error('Encrypted packet too short');
  }

  const encryptedLen = packet.length - 8 - LEP_NONCE_LEN - LEP_MAC_TAG_LEN;
  const nonce = packet.slice(8, 8 + LEP_NONCE_LEN);
  const aad = packet.slice(0, 8);
  const cipherWithTag = packet.slice(8 + LEP_NONCE_LEN);

  const chacha = chacha20poly1305(key, nonce, aad);
  const plain = chacha.decrypt(cipherWithTag);

  const out = new Uint8Array(8 + encryptedLen);
  out.set(packet.slice(0, 8));
  out[4] = LEP_VERSION; // Revert to v1
  out[5] &= ~FLAG_ENCRYPTED;
  out.set(plain, 8);

  return out;
}
