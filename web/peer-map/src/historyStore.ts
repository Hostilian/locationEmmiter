import type { LocationEmitterPacketV1 } from '@location-emitter/packet';

const DB_NAME = 'lep-peer-map-history-v1';
const STORE = 'packets';
const DB_VER = 1;
const MAX_HISTORY_ROWS = 2500;

function deviceKey(id: Uint8Array): string {
  return [...id].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export type HistoryRow = {
  id: string;
  unixTime: number;
  packet: LocationEmitterPacketV1;
  sourceLine: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onerror = () => reject(req.error ?? new Error('idb open'));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const st = db.createObjectStore(STORE, { keyPath: 'id' });
        st.createIndex('byTime', 'unixTime');
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

export async function appendHistoryEntries(
  entries: { packet: LocationEmitterPacketV1; sourceLine: string }[],
): Promise<void> {
  if (entries.length === 0) return;
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  const st = tx.objectStore(STORE);
  const t = Date.now();
  for (let i = 0; i < entries.length; i++) {
    const { packet, sourceLine } = entries[i]!;
    const id = `${t}-${i}-${deviceKey(packet.deviceId)}-${packet.unixTime}`;
    st.put({
      id,
      unixTime: packet.unixTime,
      packet,
      sourceLine,
    });
  }
  await new Promise<void>((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error ?? new Error('idb tx'));
  });
  await pruneHistoryOverLimit(db, MAX_HISTORY_ROWS);
  db.close();
}

async function pruneHistoryOverLimit(db: IDBDatabase, maxRows: number): Promise<void> {
  if (maxRows < 1) return;
  const total = await new Promise<number>((res, rej) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).count();
    req.onerror = () => rej(req.error ?? new Error('idb count'));
    req.onsuccess = () => res(req.result);
  });
  const excess = total - maxRows;
  if (excess <= 0) return;

  const tx = db.transaction(STORE, 'readwrite');
  const idx = tx.objectStore(STORE).index('byTime');
  let removed = 0;
  await new Promise<void>((res, rej) => {
    const cur = idx.openCursor();
    cur.onerror = () => rej(cur.error ?? new Error('idb prune cursor'));
    cur.onsuccess = () => {
      const c = cur.result;
      if (!c || removed >= excess) {
        res();
        return;
      }
      c.delete();
      removed++;
      c.continue();
    };
    tx.onerror = () => rej(tx.error ?? new Error('idb prune tx'));
  });
}

export async function loadHistorySorted(): Promise<HistoryRow[]> {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readonly');
  const st = tx.objectStore(STORE);
  const idx = st.index('byTime');
  const out: HistoryRow[] = [];
  await new Promise<void>((res, rej) => {
    const cur = idx.openCursor();
    cur.onerror = () => rej(cur.error ?? new Error('cursor'));
    cur.onsuccess = () => {
      const c = cur.result;
      if (!c) {
        res();
        return;
      }
      out.push(c.value as HistoryRow);
      c.continue();
    };
  });
  db.close();
  return out.sort((a, b) => a.unixTime - b.unixTime);
}

export async function clearHistory(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).clear();
  await new Promise<void>((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error ?? new Error('idb clear'));
  });
  db.close();
}
