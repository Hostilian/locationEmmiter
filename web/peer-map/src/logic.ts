import {
  encodeFull,
  encodeBleShort,
  FLAG_RELAY_ELIGIBLE,
  FLAG_SOS,
  BATTERY_UNKNOWN,
  type LocationEmitterPacketV1,
} from '@location-emitter/packet';
import { encodeMeshFromPacket } from '@location-emitter/mesh';
import { toHexSpaced } from './parseHex.js';
import { STORAGE_DEVICE_ID } from './storageKeys.js';

interface BatteryStatus {
  level: number;
}

interface BatteryNavigator extends Navigator {
  getBattery?: () => Promise<BatteryStatus>;
}

export class LogicManager {
  static getDeviceId(): Uint8Array {
    try {
      const existing = localStorage.getItem(STORAGE_DEVICE_ID);
      if (existing && /^[0-9a-fA-F]{16}$/.test(existing)) {
        const out = new Uint8Array(8);
        for (let i = 0; i < 8; i++) {
          out[i] = Number.parseInt(existing.slice(i * 2, i * 2 + 2), 16);
        }
        return out;
      }
    } catch { /* ignore */ }

    const out = new Uint8Array(8);
    crypto.getRandomValues(out);
    try {
      localStorage.setItem(STORAGE_DEVICE_ID, toHexSpaced(out).replaceAll(/\s/g, ''));
    } catch { /* ignore */ }
    return out;
  }

  static async getBattery(): Promise<number> {
    try {
      const bat = await (navigator as BatteryNavigator).getBattery?.();
      if (!bat) return BATTERY_UNKNOWN;
      const n = Math.round(bat.level * 100);
      return n >= 0 && n <= 100 ? n : BATTERY_UNKNOWN;
    } catch { return BATTERY_UNKNOWN; }
  }

  static encodeCurrentLocation(
    pos: GeolocationPosition,
    deviceId: Uint8Array,
    options: { sos: boolean; relay: boolean; text: string }
  ): { packet: LocationEmitterPacketV1; full: string; ble: string; mesh: string } {
    const { latitude, longitude, altitude, accuracy } = pos.coords;
    const unixTime = Math.floor(Date.now() / 1000);
    const altM = altitude != null && Number.isFinite(altitude) ? Math.round(altitude) : 0;
    const hAccuracyM = Number.isFinite(accuracy) ? Math.min(65535, Math.max(0, Math.round(accuracy))) : 0;

    let flags = 0;
    if (options.sos) flags |= FLAG_SOS;
    if (options.relay) flags |= FLAG_RELAY_ELIGIBLE;

    const packet: LocationEmitterPacketV1 = {
      version: 1,
      flags,
      unixTime,
      latE7: Math.round(latitude * 1e7),
      lonE7: Math.round(longitude * 1e7),
      altM,
      hAccuracyM,
      batteryPct: BATTERY_UNKNOWN, // Will be updated async
      deviceId,
      text: options.text,
    };

    return {
      packet,
      full: toHexSpaced(encodeFull(packet)),
      ble: toHexSpaced(encodeBleShort(packet)),
      mesh: toHexSpaced(encodeMeshFromPacket(packet)),
    };
  }

  static buildSamplePacket(): LocationEmitterPacketV1 {
    return {
      version: 1,
      flags: FLAG_SOS | FLAG_RELAY_ELIGIBLE,
      unixTime: 1700000000,
      latE7: 488583700,
      lonE7: 22948100,
      altM: 35,
      hAccuracyM: 12,
      batteryPct: 87,
      deviceId: Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]),
      text: 'Sample SOS',
    };
  }
}
