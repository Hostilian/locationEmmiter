export type BleIngest = {
  notifications: number;
  lastAt: number;
  disconnect: () => Promise<void>;
};

const DEFAULT_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const DEFAULT_NOTIFY = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
const UUID_V4_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readBleUuid(key: string, fallback: string): string {
  if (typeof localStorage === 'undefined') {
    return fallback;
  }
  return localStorage.getItem(key) ?? fallback;
}

type GattCharacteristicLike = {
  value: DataView | null;
  startNotifications: () => Promise<void>;
  stopNotifications: () => Promise<void>;
  addEventListener: (type: string, fn: (ev: Event) => void) => void;
  removeEventListener: (type: string, fn: (ev: Event) => void) => void;
};

/**
 * Web Bluetooth: notifications on a UART-style characteristic.
 * Override service/notify UUIDs via localStorage `lep-ble-service-uuid` / `lep-ble-notify-uuid`.
 */
export async function startWebBleIngest(
  onLine: (line: string) => void,
  serviceUuid = readBleUuid('lep-ble-service-uuid', DEFAULT_SERVICE),
  notifyUuid = readBleUuid('lep-ble-notify-uuid', DEFAULT_NOTIFY),
): Promise<BleIngest> {
  if (!UUID_V4_LIKE.test(serviceUuid) || !UUID_V4_LIKE.test(notifyUuid)) {
    throw new Error('BLE service/notify UUID must be canonical 36-char UUID');
  }
  const ble = (navigator as Navigator & { bluetooth?: { requestDevice: (o: unknown) => Promise<unknown> } })
    .bluetooth;
  if (!ble) {
    throw new Error('Web Bluetooth not supported in this browser');
  }
  const device = (await ble.requestDevice({
    optionalServices: [serviceUuid],
  })) as { gatt?: { connect: () => Promise<{ getPrimaryService: (s: string) => Promise<{ getCharacteristic: (c: string) => Promise<GattCharacteristicLike> }> }> } };
  const server = await device.gatt?.connect();
  if (!server) throw new Error('GATT unavailable');
  const svc = await server.getPrimaryService(serviceUuid);
  const ch = await svc.getCharacteristic(notifyUuid);
  const dec = new TextDecoder();
  let buf = '';
  let notifications = 0;
  let lastAt = 0;
  let closed = false;
  const emitLine = (line: string) => {
    try {
      onLine(line);
    } catch (error) {
      console.error('ble ingest callback failed', error);
    }
  };
  const handler = (ev: Event) => {
    const tgt = ev.target as unknown as GattCharacteristicLike;
    const t = tgt.value;
    if (!t) return;
    const bytes = new Uint8Array(t.buffer, t.byteOffset, t.byteLength);
    buf += dec.decode(bytes, { stream: true });
    const parts = buf.split(/\r?\n/);
    buf = parts.pop() ?? '';
    for (const line of parts) {
      const s = line.trim();
      if (s) {
        notifications++;
        lastAt = Date.now();
        emitLine(s);
      }
    }
  };
  await ch.startNotifications();
  ch.addEventListener('characteristicvaluechanged', handler);

  return {
    get notifications() {
      return notifications;
    },
    get lastAt() {
      return lastAt;
    },
    disconnect: async () => {
      if (closed) return;
      closed = true;
      try {
        ch.removeEventListener('characteristicvaluechanged', handler);
        const tail = dec.decode();
        if (tail.trim()) {
          emitLine(tail.trim());
        }
        await ch.stopNotifications();
      } catch {
        /* ignore */
      }
      try {
        (device as { gatt?: { disconnect: () => void } }).gatt?.disconnect();
      } catch {
        /* ignore */
      }
    },
  };
}
