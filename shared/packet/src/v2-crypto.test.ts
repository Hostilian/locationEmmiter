import { describe, expect, it } from '@jest/globals';
import { decryptV2, encryptV2 } from './crypto.js';
import { encodeFull, decodeFull } from './index.js';

describe('LEP v2 Encryption (TS implementation)', () => {
  const key = new Uint8Array([
    0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef,
    0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef,
  ]);

  it('should encrypt and decrypt correctly', () => {
    const p = {
      version: 1 as const,
      flags: 0,
      unixTime: 1700000000,
      latE7: 488583700,
      lonE7: 22948100,
      altM: 35,
      hAccuracyM: 12,
      batteryPct: 87,
      deviceId: new Uint8Array(8).fill(0xAA),
      text: 'HELLO',
    };

    const v1 = encodeFull(p);
    const v2 = encryptV2(v1, key);
    
    expect(v2[4]).toBe(2); // Version 2
    expect(v2[5] & 0x04).toBe(0x04); // Encrypted flag set

    const decrypted = decryptV2(v2, key);
    expect(decrypted[4]).toBe(1); // Back to Version 1
    
    const d = decodeFull(decrypted);
    expect(d.ok).toBe(true);
    if (d.ok) {
      expect(d.packet.text).toBe('HELLO');
      expect(d.packet.latE7).toBe(488583700);
    }
  });

  it('should fail decryption with wrong key', () => {
    const v1 = new Uint8Array(40).fill(0xBB);
    v1.set([0x4C, 0x47, 0x45, 0x4F, 0x01], 0); // Magic + v1
    const v2 = encryptV2(v1, key);
    
    const wrongKey = new Uint8Array(32).fill(0xFF);
    expect(() => decryptV2(v2, wrongKey)).toThrow();
  });
});
