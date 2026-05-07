import { decodeAny, decodeFull, type LocationEmitterPacketV1 } from '@location-emitter/packet';
import { unwrapMeshFrame } from '@location-emitter/mesh';

const ERROR_MAP: Record<string, string> = {
  'empty payload': 'No data received.',
  'bad magic': 'Invalid packet header (Magic mismatch).',
  'crc mismatch': 'Packet corrupted in transit (CRC error).',
  'truncated packet': 'Incomplete packet received.',
  'text_len out of range': 'Malformed text field in packet.',
  'unsupported version': 'Incompatible protocol version.',
  'encrypted flag set (not implemented)': 'Received encrypted packet, but no key is configured.',
  'mesh frame too short or malformed LRM1 wrapper': 'Invalid Mesh (LRM1) encapsulation.',
  'buffer too small for full packet': 'Packet too short to be a valid LEP frame.',
  'buffer too small for BLE short': 'Packet too short for BLE advertisement format.',
};

export function decodeWireDetailed(
  buf: Uint8Array,
): { ok: true; packet: LocationEmitterPacketV1; label: string } | { ok: false; reason: string } {
  if (buf.length === 0) {
    return { ok: false, reason: ERROR_MAP['empty payload'] };
  }
  
  let res: { ok: true; packet: LocationEmitterPacketV1; label: string } | { ok: false; reason: string };

  if (
    buf.length >= 6 &&
    buf[0] === 0x4c &&
    buf[1] === 0x52 &&
    buf[2] === 0x4d &&
    buf[3] === 0x31
  ) {
    const u = unwrapMeshFrame(buf);
    if (!u) {
      res = { ok: false, reason: ERROR_MAP['mesh frame too short or malformed LRM1 wrapper'] };
    } else {
      const d = decodeFull(u.lepWire);
      if (!d.ok) {
        const mapped = Object.keys(ERROR_MAP).find(k => d.error.includes(k));
        res = { ok: false, reason: `Mesh Decode Error: ${mapped ? ERROR_MAP[mapped] : d.error}` };
      } else {
        res = { ok: true, packet: d.packet, label: `mesh hop=${u.hopRemaining}` };
      }
    }
  } else {
    const d = decodeAny(buf);
    if (!d.ok) {
      const mapped = Object.keys(ERROR_MAP).find(k => d.error.includes(k));
      res = { ok: false, reason: mapped ? ERROR_MAP[mapped] : d.error };
    } else {
      res = { ok: true, packet: d.packet, label: d.wire };
    }
  }

  return res;
}
