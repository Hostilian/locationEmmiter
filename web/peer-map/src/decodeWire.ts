import { decodeAny, decodeFull, type LocationEmitterPacketV1 } from '@location-emitter/packet';
import { unwrapMeshFrame } from '@location-emitter/mesh';

export function decodeWireDetailed(
  buf: Uint8Array,
): { ok: true; packet: LocationEmitterPacketV1; label: string } | { ok: false; reason: string } {
  if (buf.length === 0) {
    return { ok: false, reason: 'empty payload' };
  }
  if (
    buf.length >= 6 &&
    buf[0] === 0x4c &&
    buf[1] === 0x52 &&
    buf[2] === 0x4d &&
    buf[3] === 0x31
  ) {
    const u = unwrapMeshFrame(buf);
    if (!u) return { ok: false, reason: 'mesh frame too short or malformed LRM1 wrapper' };
    const d = decodeFull(u.lepWire);
    if (!d.ok) return { ok: false, reason: `inner LEP: ${d.error}` };
    return { ok: true, packet: d.packet, label: `mesh hop=${u.hopRemaining}` };
  }
  const d = decodeAny(buf);
  if (!d.ok) return { ok: false, reason: d.error };
  return { ok: true, packet: d.packet, label: d.wire };
}
