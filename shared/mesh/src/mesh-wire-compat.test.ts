import { describe, expect, it } from '@jest/globals';
import { decodeFull } from '@location-emitter/packet';
import { unwrapMeshFrame, wrapLepWithMesh } from './envelope.js';

/**
 * Golden wire must match firmware `lep_mesh_wrap` / `lep_mesh_unwrap`
 * (`firmware/esp32-lora/include/lep_mesh.h`) and inner LEP vectors in
 * `firmware-wire-compat.test.ts` (packet workspace).
 */
describe('LRM1 mesh wire (firmware-aligned golden vectors)', () => {
  const lepNonSos =
    '4c47454f0102000000f1536514321f1d04295e0123000c00570001020304050607082aee';
  const meshNonSos = `4c524d310300${lepNonSos}`;

  const lepSos =
    '4c47454f0103000000f1536514321f1d04295e0123000c0057030102030405060708534f533e7e';
  const meshSos = `4c524d310400${lepSos}`;

  it('non-SOS: unwrap hop 3 and decode inner LEP', () => {
    const buf = Uint8Array.from(Buffer.from(meshNonSos, 'hex'));
    const u = unwrapMeshFrame(buf);
    expect(u).not.toBeNull();
    if (!u) return;
    expect(u.hopRemaining).toBe(3);
    expect(u.reserved).toBe(0);
    expect(Buffer.from(u.lepWire).toString('hex')).toBe(lepNonSos);
    const d = decodeFull(u.lepWire);
    expect(d.ok).toBe(true);
  });

  it('non-SOS: wrap matches golden mesh hex', () => {
    const lep = Uint8Array.from(Buffer.from(lepNonSos, 'hex'));
    const w = wrapLepWithMesh(lep, 3, 0);
    expect(Buffer.from(w).toString('hex')).toBe(meshNonSos);
  });

  it('SOS: unwrap hop 4 and decode inner LEP', () => {
    const buf = Uint8Array.from(Buffer.from(meshSos, 'hex'));
    const u = unwrapMeshFrame(buf);
    expect(u).not.toBeNull();
    if (!u) return;
    expect(u.hopRemaining).toBe(4);
    const d = decodeFull(u.lepWire);
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.packet.text).toBe('SOS');
  });

  it('SOS: wrap matches golden mesh hex', () => {
    const lep = Uint8Array.from(Buffer.from(lepSos, 'hex'));
    const w = wrapLepWithMesh(lep, 4, 0);
    expect(Buffer.from(w).toString('hex')).toBe(meshSos);
  });
});
