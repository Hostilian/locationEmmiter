import { FLAG_SOS, encodeFull, type LocationEmitterPacketV1 } from '@location-emitter/packet';

/** Magic "LRM1" on wire */
export const MESH_MAGIC = new Uint8Array([0x4c, 0x52, 0x4d, 0x31]);

const HEADER_LEN = 6;

export function meshHeaderLen(): number {
  return HEADER_LEN;
}

export function isMeshMagic(buf: Uint8Array): boolean {
  return (
    buf.length >= 4 &&
    buf[0] === MESH_MAGIC[0] &&
    buf[1] === MESH_MAGIC[1] &&
    buf[2] === MESH_MAGIC[2] &&
    buf[3] === MESH_MAGIC[3]
  );
}

/** Wrap a **full** LEP v1 wire buffer (already CRC'd). */
export function wrapLepWithMesh(lepWire: Uint8Array, hopRemaining: number, reserved = 0): Uint8Array {
  if (hopRemaining < 1 || hopRemaining > 255) throw new Error('hop_remaining out of range');
  const out = new Uint8Array(HEADER_LEN + lepWire.length);
  out.set(MESH_MAGIC, 0);
  out[4] = hopRemaining & 0xff;
  out[5] = reserved & 0xff;
  out.set(lepWire, HEADER_LEN);
  return out;
}

export function unwrapMeshFrame(buf: Uint8Array): { hopRemaining: number; reserved: number; lepWire: Uint8Array } | null {
  if (buf.length < HEADER_LEN + 36) return null;
  if (!isMeshMagic(buf)) return null;
  const hopRemaining = buf[4]!;
  const reserved = buf[5]!;
  const lepWire = buf.subarray(HEADER_LEN);
  return { hopRemaining, reserved, lepWire };
}

/** Encode a logical packet to mesh wire (full LEP + wrapper). Uses hop 4 if SOS else 3. */
export function encodeMeshFromPacket(p: LocationEmitterPacketV1): Uint8Array {
  const lep = encodeFull(p);
  const hops = (p.flags & FLAG_SOS) !== 0 ? 4 : 3;
  return wrapLepWithMesh(lep, hops, 0);
}

export function initialHopForPacket(flags: number): number {
  return (flags & FLAG_SOS) !== 0 ? 4 : 3;
}

/** Re-export for convenience */
export { FLAG_SOS, FLAG_RELAY_ELIGIBLE } from '@location-emitter/packet';
