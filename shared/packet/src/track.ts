import type { LocationEmitterPacketV1 } from './types.js';

function deviceKey(id: Uint8Array): string {
  return [...id].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Collapse a log to the newest sample per `device_id` (by `unix_time`, tie-break later in array order).
 * Useful for SAR “last known good” summaries.
 */
export function lastKnownByDevice(packets: LocationEmitterPacketV1[]): LocationEmitterPacketV1[] {
  const best = new Map<string, LocationEmitterPacketV1>();
  for (const p of packets) {
    const k = deviceKey(p.deviceId);
    const cur = best.get(k);
    if (!cur || p.unixTime > cur.unixTime) best.set(k, p);
  }
  return [...best.values()].sort((a, b) => a.unixTime - b.unixTime);
}
