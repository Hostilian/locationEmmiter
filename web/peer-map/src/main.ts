import 'leaflet/dist/leaflet.css';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import L from 'leaflet';
import {
  BATTERY_UNKNOWN,
  decodeAny,
  decodeFull,
  encodeBleShort,
  encodeFull,
  FLAG_RELAY_ELIGIBLE,
  FLAG_SOS,
  packetsToCsv,
  packetsToGpx,
  type LocationEmitterPacketV1,
} from '@location-emitter/packet';
import { encodeMeshFromPacket, unwrapMeshFrame } from '@location-emitter/mesh';

const hexEl = document.querySelector<HTMLTextAreaElement>('#hex')!;
const goEl = document.querySelector<HTMLButtonElement>('#go')!;
const clearDecodeEl = document.querySelector<HTMLButtonElement>('#clear-decode')!;
const copyShareLinkEl = document.querySelector<HTMLButtonElement>('#copy-share-link')!;
const decodeOkEl = document.querySelector<HTMLDivElement>('#decode-ok')!;
const decodeStatsEl = document.querySelector<HTMLParagraphElement>('#decode-stats')!;
const errEl = document.querySelector<HTMLDivElement>('#err')!;
const fitAllEl = document.querySelector<HTMLButtonElement>('#fit-all')!;
const metaThemeEl = document.querySelector<HTMLMetaElement>('#meta-theme-color')!;
const copyPlottedHexEl = document.querySelector<HTMLButtonElement>('#copy-plotted-hex')!;
const exportGpxEl = document.querySelector<HTMLButtonElement>('#export-gpx')!;
const exportCsvEl = document.querySelector<HTMLButtonElement>('#export-csv')!;
const exportGeojsonEl = document.querySelector<HTMLButtonElement>('#export-geojson')!;
const netOfflineEl = document.querySelector<HTMLDivElement>('#net-offline')!;
const themeSystemEl = document.querySelector<HTMLButtonElement>('#theme-system')!;
const themeLightEl = document.querySelector<HTMLButtonElement>('#theme-light')!;
const themeDarkEl = document.querySelector<HTMLButtonElement>('#theme-dark')!;

const deviceIdEl = document.querySelector<HTMLSpanElement>('#device-id-hex')!;
const encodeSosEl = document.querySelector<HTMLInputElement>('#encode-sos')!;
const encodeRelayEl = document.querySelector<HTMLInputElement>('#encode-relay')!;
const encodeTextEl = document.querySelector<HTMLInputElement>('#encode-text')!;
const encodeTextBytesEl = document.querySelector<HTMLParagraphElement>('#encode-text-bytes')!;
const encodeLocateEl = document.querySelector<HTMLButtonElement>('#encode-locate')!;
const encodePlotEl = document.querySelector<HTMLButtonElement>('#encode-plot')!;
const encodeStatusEl = document.querySelector<HTMLParagraphElement>('#encode-status')!;
const encodeErrEl = document.querySelector<HTMLDivElement>('#encode-err')!;
const encodeSummaryEl = document.querySelector<HTMLDivElement>('#encode-summary')!;
const outFullEl = document.querySelector<HTMLTextAreaElement>('#out-full')!;
const outBleEl = document.querySelector<HTMLTextAreaElement>('#out-ble')!;
const outMeshEl = document.querySelector<HTMLTextAreaElement>('#out-mesh')!;
const copyFullEl = document.querySelector<HTMLButtonElement>('#copy-full')!;
const copyBleEl = document.querySelector<HTMLButtonElement>('#copy-ble')!;
const copyMeshEl = document.querySelector<HTMLButtonElement>('#copy-mesh')!;
const meshToDecodeEl = document.querySelector<HTMLButtonElement>('#mesh-to-decode')!;
const copyAllWiresEl = document.querySelector<HTMLButtonElement>('#copy-all-wires')!;
const hexLineMeterEl = document.querySelector<HTMLParagraphElement>('#hex-line-meter')!;
const hexFileEl = document.querySelector<HTMLInputElement>('#hex-file')!;
const sampleHexEl = document.querySelector<HTMLButtonElement>('#sample-hex')!;
const loadHexFileEl = document.querySelector<HTMLButtonElement>('#load-hex-file')!;
const pasteHexClipboardEl = document.querySelector<HTMLButtonElement>('#paste-hex-clipboard')!;
const decodeDetailEl = document.querySelector<HTMLPreElement>('#decode-detail')!;

const STORAGE_DEVICE_ID = 'lep-peer-map-device-id-v1';

const SESSION_HEX = 'lep-peer-map-session-hex';
const SESSION_ENCODE_NOTE = 'lep-peer-map-session-encode-note';
const SESSION_ENCODE_SOS = 'lep-peer-map-session-encode-sos';
const SESSION_ENCODE_RELAY = 'lep-peer-map-session-encode-relay';
const SESSION_MAP_VIEW = 'lep-peer-map-session-map-view-v1';
const SESSION_OUT_FULL = 'lep-peer-map-session-out-full';
const SESSION_OUT_BLE = 'lep-peer-map-session-out-ble';
const SESSION_OUT_MESH = 'lep-peer-map-session-out-mesh';

const LS_THEME = 'lep-peer-map-theme';
type ThemePref = 'system' | 'light' | 'dark';

/** Text file size limit for “Load file” (avoids freezing the UI on huge dumps). */
const MAX_HEX_FILE_BYTES = 1_500_000;

/** Max characters for ?hex= / #hex= bootstrap (avoids huge URLs locking the UI). */
const MAX_URL_HEX_CHARS = 100_000;

/** Prefer query string for short hex; longer payloads use #hex= (still capped by MAX_URL_HEX_CHARS). */
const MAX_LINK_QUERY_HEX = 1800;

const map = L.map('map', {
  zoomControl: true,
  maxBounds: [
    [-85, -200],
    [85, 200],
  ],
  maxBoundsViscosity: 0.85,
}).setView([20, 0], 2);

const decodeLayer = L.layerGroup().addTo(map);
const encodeLayer = L.layerGroup().addTo(map);

function saveMapViewToSession(): void {
  try {
    const c = map.getCenter();
    sessionStorage.setItem(
      SESSION_MAP_VIEW,
      JSON.stringify({ lat: c.lat, lng: c.lng, z: map.getZoom() }),
    );
  } catch {
    /* ignore */
  }
}

let mapViewSaveTimer: ReturnType<typeof setTimeout> | undefined;
map.on('moveend', () => {
  clearTimeout(mapViewSaveTimer);
  mapViewSaveTimer = setTimeout(saveMapViewToSession, 400);
});

const tileLight = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap',
});
const tileDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
  subdomains: 'abcd',
  maxZoom: 20,
  attribution: '&copy; OpenStreetMap &copy; CARTO',
});

const colorSchemeMq = window.matchMedia('(prefers-color-scheme: dark)');
let activeBasemap: L.TileLayer = tileLight;

function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(LS_THEME);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* ignore */
  }
  return 'system';
}

function effectiveDark(): boolean {
  const p = getThemePref();
  if (p === 'light') return false;
  if (p === 'dark') return true;
  return colorSchemeMq.matches;
}

function applyChromeTheme(): void {
  const dark = effectiveDark();
  document.documentElement.classList.toggle('theme-dark', dark);
  if (map.hasLayer(activeBasemap)) {
    map.removeLayer(activeBasemap);
  }
  activeBasemap = dark ? tileDark : tileLight;
  activeBasemap.addTo(map);
  metaThemeEl.setAttribute('content', dark ? '#121212' : '#1a237e');
  syncDecodePolylineStyle();
}

function decodePathLineColor(): string {
  return document.documentElement.classList.contains('theme-dark') ? '#81d4fa' : '#5c6bc0';
}

/** Keep dashed decode path readable after theme toggle (markers unchanged). */
function syncDecodePolylineStyle(): void {
  const color = decodePathLineColor();
  decodeLayer.eachLayer((ly) => {
    if (ly instanceof L.Polyline && !(ly instanceof L.Polygon)) {
      ly.setStyle({ color });
    }
  });
}

function syncThemeButtons(): void {
  const p = getThemePref();
  themeSystemEl.classList.toggle('is-active', p === 'system');
  themeLightEl.classList.toggle('is-active', p === 'light');
  themeDarkEl.classList.toggle('is-active', p === 'dark');
}

function setThemePref(pref: ThemePref): void {
  try {
    localStorage.setItem(LS_THEME, pref);
  } catch {
    /* ignore */
  }
  applyChromeTheme();
  syncThemeButtons();
}

applyChromeTheme();
colorSchemeMq.addEventListener('change', () => {
  if (getThemePref() === 'system') applyChromeTheme();
});

themeSystemEl.addEventListener('click', () => setThemePref('system'));
themeLightEl.addEventListener('click', () => setThemePref('light'));
themeDarkEl.addEventListener('click', () => setThemePref('dark'));

let lastEncoded: LocationEmitterPacketV1 | null = null;
const decodedPackets: LocationEmitterPacketV1[] = [];
/** Raw input lines that decoded successfully (same order as plotted). */
const lastPlottedHexLines: string[] = [];
let exportEncodePacket: LocationEmitterPacketV1 | null = null;

function toHexSpaced(buf: Uint8Array): string {
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join(' ');
}

function getOrCreateDeviceId(): Uint8Array {
  try {
    const existing = localStorage.getItem(STORAGE_DEVICE_ID);
    if (existing && /^[0-9a-fA-F]{16}$/.test(existing)) {
      const out = new Uint8Array(8);
      for (let i = 0; i < 8; i++) {
        out[i] = Number.parseInt(existing.slice(i * 2, i * 2 + 2), 16);
      }
      return out;
    }
  } catch {
    /* ignore */
  }
  const out = new Uint8Array(8);
  crypto.getRandomValues(out);
  try {
    localStorage.setItem(STORAGE_DEVICE_ID, toHexSpaced(out).replaceAll(/\s/g, ''));
  } catch {
    /* ignore */
  }
  return out;
}

const deviceId = getOrCreateDeviceId();
deviceIdEl.textContent = toHexSpaced(deviceId);

/** Accepts spaces, commas, colons, newlines between hex pairs, or one continuous hex string. */
function parseHex(s: string): Uint8Array | null {
  const raw = s.trim();
  if (!raw) return null;
  const hexOnly = raw.replaceAll(/0x/gi, '').replaceAll(/[^0-9a-fA-F]/g, '');
  if (hexOnly.length >= 2 && hexOnly.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(hexOnly)) {
    const out = new Uint8Array(hexOnly.length / 2);
    for (let i = 0; i < hexOnly.length; i += 2) {
      out[i / 2] = Number.parseInt(hexOnly.slice(i, i + 2), 16);
    }
    return out;
  }
  const parts = raw.replaceAll(/0x/gi, '').split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  try {
    return Uint8Array.from(parts.map((h) => Number.parseInt(h, 16)));
  } catch {
    return null;
  }
}

function decodeWireDetailed(
  buf: Uint8Array,
): { ok: true; packet: LocationEmitterPacketV1; label: string } | { ok: false; reason: string } {
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

function plot(
  p: LocationEmitterPacketV1,
  extra: string,
  bounds: L.LatLngTuple[],
  hue: number,
): L.CircleMarker {
  const lat = p.latE7 / 1e7;
  const lon = p.lonE7 / 1e7;
  bounds.push([lat, lon]);
  const sos = (p.flags & FLAG_SOS) !== 0;
  const id = [...p.deviceId].map((b) => b.toString(16).padStart(2, '0')).join('');
  const title = `${sos ? 'SOS ' : ''}${id.slice(0, 8)}…`;
  const color = sos ? '#c62828' : `hsl(${hue % 360} 70% 40%)`;
  const fill = sos ? '#ff5252' : `hsl(${hue % 360} 85% 55%)`;
  const m = L.circleMarker([lat, lon], {
    radius: sos ? 12 : 8,
    color,
    fillColor: fill,
    fillOpacity: 0.85,
  });
  m.bindPopup(
    `<strong>${title}</strong><br/>${extra}<br/>acc ${p.hAccuracyM} m<br/>${p.text ? escapeHtml(p.text) : ''}`,
  );
  m.addTo(decodeLayer);
  return m;
}

function escapeHtml(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function invalidateMapSize(): void {
  requestAnimationFrame(() => map.invalidateSize());
}

function tapVibrate(): void {
  try {
    navigator.vibrate?.(14);
  } catch {
    /* ignore */
  }
}

function formatLineList(nums: number[]): string {
  if (nums.length === 0) return '';
  const max = 14;
  const head = nums.slice(0, max);
  const tail = nums.length > max ? ` (+${nums.length - max} more)` : '';
  return `${head.join(', ')}${tail}`;
}

function packetsForExport(): LocationEmitterPacketV1[] {
  return [...decodedPackets, ...(exportEncodePacket ? [exportEncodePacket] : [])];
}

function deviceIdHexString(p: LocationEmitterPacketV1): string {
  return [...p.deviceId].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function updateDecodeStats(): void {
  if (decodedPackets.length === 0) {
    decodeStatsEl.hidden = true;
    decodeStatsEl.textContent = '';
    return;
  }
  const ids = new Set(decodedPackets.map(deviceIdHexString));
  const sosN = decodedPackets.reduce((n, p) => n + ((p.flags & FLAG_SOS) !== 0 ? 1 : 0), 0);
  decodeStatsEl.hidden = false;
  const parts = [
    `${decodedPackets.length} packet${decodedPackets.length === 1 ? '' : 's'}`,
    `${ids.size} device ID${ids.size === 1 ? '' : 's'}`,
  ];
  if (sosN > 0) {
    parts.push(`${sosN} SOS`);
  }
  decodeStatsEl.textContent = parts.join(' · ');
}

function buildDecodeShareUrl(): string | null {
  const v = hexEl.value.trim();
  if (!v || v.length > MAX_URL_HEX_CHARS) {
    return null;
  }
  try {
    const u = new URL(globalThis.location.href);
    if (v.length <= MAX_LINK_QUERY_HEX) {
      u.searchParams.set('hex', v);
      u.hash = '';
    } else {
      u.search = '';
      u.hash = `hex=${encodeURIComponent(v)}`;
    }
    return u.toString();
  } catch {
    return null;
  }
}

function syncShareLinkButton(): void {
  const url = buildDecodeShareUrl();
  copyShareLinkEl.disabled = url == null;
  copyShareLinkEl.title =
    url == null
      ? 'Add hex (under length limit) to build a shareable link'
      : 'Copy URL that opens this hex in the map';
}

function updateExportButtons(): void {
  const n = packetsForExport().length;
  copyPlottedHexEl.disabled = lastPlottedHexLines.length === 0;
  exportGpxEl.disabled = n === 0;
  exportCsvEl.disabled = n === 0;
  exportGeojsonEl.disabled = n === 0;
  syncShareLinkButton();
  updateDecodeStats();
}

function exportFilename(ext: string): string {
  const t = new Date().toISOString().slice(0, 19).replaceAll('T', '-').replaceAll(':', '');
  return `location-emitter-map-${t}.${ext}`;
}

function packetsToGeoJsonText(packets: LocationEmitterPacketV1[]): string {
  const digit = (b: number) => b.toString(16).padStart(2, '0');
  const features = packets.map((p, i) => ({
    type: 'Feature' as const,
    id: i,
    geometry: {
      type: 'Point' as const,
      coordinates: [p.lonE7 / 1e7, p.latE7 / 1e7],
    },
    properties: {
      unixTime: p.unixTime,
      altM: p.altM,
      hAccuracyM: p.hAccuracyM,
      batteryPct: p.batteryPct,
      flags: p.flags,
      sos: (p.flags & FLAG_SOS) !== 0,
      relayEligible: (p.flags & FLAG_RELAY_ELIGIBLE) !== 0,
      deviceIdHex: [...p.deviceId].map((x) => digit(x)).join(''),
      text: p.text,
    },
  }));
  const idStrings = packets.map((p) => [...p.deviceId].map((x) => digit(x)).join(''));
  const meta = {
    exportedAt: new Date().toISOString(),
    packetCount: packets.length,
    uniqueDeviceIds: new Set(idStrings).size,
    sosCount: packets.reduce((n, p) => n + ((p.flags & FLAG_SOS) !== 0 ? 1 : 0), 0),
  };
  return JSON.stringify({ type: 'FeatureCollection', features, meta });
}

function downloadText(filename: string, mime: string, text: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Uses Web Share (files) on Android/Capacitor when available; otherwise download link. */
async function shareOrDownload(
  filename: string,
  mime: string,
  text: string,
  statusMsg: string,
): Promise<void> {
  try {
    const file = new File([text], filename, { type: mime });
    if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      encodeStatusEl.textContent = `${statusMsg} Shared via system sheet.`;
      tapVibrate();
      return;
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      encodeStatusEl.textContent = 'Share cancelled.';
      return;
    }
  }
  downloadText(filename, mime, text);
  encodeStatusEl.textContent = statusMsg;
  tapVibrate();
}

function fitAllMarkers(): void {
  const fg = L.featureGroup([decodeLayer, encodeLayer]);
  const b = fg.getBounds();
  if (b.isValid()) {
    map.fitBounds(b, { padding: [52, 52], maxZoom: 16 });
    tapVibrate();
  } else {
    encodeStatusEl.textContent = 'No markers to fit.';
  }
  invalidateMapSize();
}

function runDecode(): void {
  errEl.textContent = '';
  decodeOkEl.textContent = '';
  decodeDetailEl.textContent = '';
  decodeDetailEl.hidden = true;
  decodeLayer.clearLayers();
  decodedPackets.length = 0;
  lastPlottedHexLines.length = 0;
  const lines = hexEl.value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    errEl.textContent = 'Paste one or more hex lines.';
    updateExportButtons();
    return;
  }
  const bounds: L.LatLngTuple[] = [];
  const badHexLines: number[] = [];
  const badDecodeDetails: { line: number; reason: string }[] = [];
  let lastMarker: L.CircleMarker | null = null;
  for (let i = 0; i < lines.length; i++) {
    const buf = parseHex(lines[i]!);
    if (!buf) {
      badHexLines.push(i + 1);
      continue;
    }
    const got = decodeWireDetailed(buf);
    if (!got.ok) {
      badDecodeDetails.push({ line: i + 1, reason: got.reason });
      continue;
    }
    lastMarker = plot(got.packet, `${got.label} (line ${i + 1})`, bounds, i * 47);
    decodedPackets.push(got.packet);
    lastPlottedHexLines.push(lines[i]!);
  }
  if (bounds.length >= 2) {
    const path = L.polyline(bounds, {
      color: decodePathLineColor(),
      weight: 2,
      dashArray: '6 10',
      opacity: 0.55,
      interactive: false,
    }).addTo(decodeLayer);
    path.bringToBack();
  }
  if (bounds.length === 1) {
    map.setView(bounds[0]!, 14);
    queueMicrotask(() => lastMarker?.openPopup());
  } else if (bounds.length > 1) {
    map.fitBounds(L.latLngBounds(bounds), { padding: [48, 48], maxZoom: 15 });
  }

  const errors = badHexLines.length + badDecodeDetails.length;
  if (bounds.length > 0) {
    decodeOkEl.textContent =
      errors === 0
        ? `Plotted all ${bounds.length} line(s).`
        : `Plotted ${bounds.length} of ${lines.length} line(s).`;
    tapVibrate();
  }

  if (errors > 0) {
    const parts: string[] = [];
    if (badHexLines.length > 0) {
      parts.push(`invalid hex (lines ${formatLineList(badHexLines)})`);
    }
    if (badDecodeDetails.length > 0) {
      parts.push(
        `not LEP / mesh (lines ${formatLineList(badDecodeDetails.map((d) => d.line))})`,
      );
    }
    errEl.textContent = parts.join(' · ');
    const maxDetail = 6;
    if (badDecodeDetails.length > 0) {
      decodeDetailEl.hidden = false;
      const head = badDecodeDetails.slice(0, maxDetail);
      const more =
        badDecodeDetails.length > maxDetail
          ? `\n… +${badDecodeDetails.length - maxDetail} more line(s)`
          : '';
      decodeDetailEl.textContent =
        head.map((d) => `Line ${d.line}: ${d.reason}`).join('\n') + more;
    }
  }
  updateExportButtons();
  invalidateMapSize();
}

goEl.addEventListener('click', () => runDecode());

copyShareLinkEl.addEventListener('click', () => {
  const url = buildDecodeShareUrl();
  if (!url) return;
  void (async () => {
    try {
      await navigator.clipboard.writeText(url);
      decodeOkEl.textContent = decodeOkEl.textContent
        ? `${decodeOkEl.textContent} · Link copied.`
        : 'Link copied.';
      tapVibrate();
    } catch {
      errEl.textContent = 'Could not copy link — copy from the address bar if visible.';
    }
  })();
});

copyPlottedHexEl.addEventListener('click', () => {
  void (async () => {
    const t = lastPlottedHexLines.join('\n');
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
      decodeOkEl.textContent = 'Copied plotted hex lines.';
      tapVibrate();
    } catch {
      errEl.textContent = 'Copy blocked — copy from the hex field manually.';
    }
  })();
});

clearDecodeEl.addEventListener('click', () => {
  hexEl.value = '';
  errEl.textContent = '';
  decodeOkEl.textContent = '';
  decodeDetailEl.textContent = '';
  decodeDetailEl.hidden = true;
  decodeLayer.clearLayers();
  decodedPackets.length = 0;
  lastPlottedHexLines.length = 0;
  updateExportButtons();
  try {
    sessionStorage.removeItem(SESSION_HEX);
  } catch {
    /* ignore */
  }
  invalidateMapSize();
  updateHexLineMeter();
});

fitAllEl.addEventListener('click', () => fitAllMarkers());

function updateHexLineMeter(): void {
  const n = hexEl.value.split(/\r?\n/).filter((l) => l.trim().length > 0).length;
  const chars = hexEl.value.length;
  const charLabel = chars >= 1000 ? `${(chars / 1000).toFixed(1)}k chars` : `${chars} chars`;
  hexLineMeterEl.textContent = `${n} non-empty line${n === 1 ? '' : 's'} · ${charLabel}`;
  syncShareLinkButton();
}

hexEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    runDecode();
  }
});

document.addEventListener(
  'keydown',
  (e) => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }
    const a = document.activeElement;
    if (
      a instanceof HTMLTextAreaElement ||
      a instanceof HTMLInputElement ||
      a instanceof HTMLSelectElement ||
      (a instanceof HTMLElement && a.isContentEditable)
    ) {
      if (a !== hexEl) {
        return;
      }
      return;
    }
    e.preventDefault();
    hexEl.focus();
  },
  true,
);

document.addEventListener(
  'keydown',
  (e) => {
    if (e.key !== '?' || e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }
    const a = document.activeElement;
    if (
      a instanceof HTMLTextAreaElement ||
      a instanceof HTMLInputElement ||
      a instanceof HTMLSelectElement ||
      (a instanceof HTMLElement && a.isContentEditable)
    ) {
      return;
    }
    e.preventDefault();
    const det = document.querySelector<HTMLDetailsElement>('#help-details');
    if (det) {
      det.open = true;
      det.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },
  true,
);

function updateEncodeTextMeter(): void {
  const te = new TextEncoder();
  const n = te.encode(encodeTextEl.value).length;
  encodeTextBytesEl.textContent = `${n} / 32 UTF-8 bytes`;
  encodeTextBytesEl.classList.toggle('warn', n > 32);
}

updateEncodeTextMeter();

function persistEncodeFields(): void {
  try {
    sessionStorage.setItem(SESSION_ENCODE_NOTE, encodeTextEl.value);
    sessionStorage.setItem(SESSION_ENCODE_SOS, encodeSosEl.checked ? '1' : '0');
    sessionStorage.setItem(SESSION_ENCODE_RELAY, encodeRelayEl.checked ? '1' : '0');
  } catch {
    /* ignore */
  }
}

encodeTextEl.addEventListener('input', () => {
  updateEncodeTextMeter();
  persistEncodeFields();
});
encodeSosEl.addEventListener('change', persistEncodeFields);
encodeRelayEl.addEventListener('change', persistEncodeFields);

let hexSessionTimer: ReturnType<typeof setTimeout> | undefined;
hexEl.addEventListener('input', () => {
  updateHexLineMeter();
  clearTimeout(hexSessionTimer);
  hexSessionTimer = setTimeout(() => {
    try {
      sessionStorage.setItem(SESSION_HEX, hexEl.value);
    } catch {
      /* ignore */
    }
  }, 400);
});

function persistWireOutputs(): void {
  try {
    sessionStorage.setItem(SESSION_OUT_FULL, outFullEl.value);
    sessionStorage.setItem(SESSION_OUT_BLE, outBleEl.value);
    sessionStorage.setItem(SESSION_OUT_MESH, outMeshEl.value);
  } catch {
    /* ignore */
  }
}

function restoreSession(): void {
  try {
    const h = sessionStorage.getItem(SESSION_HEX);
    if (h != null) hexEl.value = h;
    const note = sessionStorage.getItem(SESSION_ENCODE_NOTE);
    if (note != null) encodeTextEl.value = note;
    if (sessionStorage.getItem(SESSION_ENCODE_SOS) === '1') encodeSosEl.checked = true;
    if (sessionStorage.getItem(SESSION_ENCODE_SOS) === '0') encodeSosEl.checked = false;
    if (sessionStorage.getItem(SESSION_ENCODE_RELAY) === '1') encodeRelayEl.checked = true;
    if (sessionStorage.getItem(SESSION_ENCODE_RELAY) === '0') encodeRelayEl.checked = false;
    const of = sessionStorage.getItem(SESSION_OUT_FULL);
    const ob = sessionStorage.getItem(SESSION_OUT_BLE);
    const om = sessionStorage.getItem(SESSION_OUT_MESH);
    if (of) outFullEl.value = of;
    if (ob) outBleEl.value = ob;
    if (om) outMeshEl.value = om;
  } catch {
    /* ignore */
  }
  updateEncodeTextMeter();
}

function buildSampleHexLine(): string {
  const p: LocationEmitterPacketV1 = {
    version: 1,
    flags: FLAG_SOS | FLAG_RELAY_ELIGIBLE,
    unixTime: 1700000000,
    latE7: 488583700,
    lonE7: 22948100,
    altM: 35,
    hAccuracyM: 12,
    batteryPct: 87,
    deviceId: Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]),
    text: 'SOS',
  };
  return toHexSpaced(encodeFull(p));
}

sampleHexEl.addEventListener('click', () => {
  hexEl.value = buildSampleHexLine();
  updateHexLineMeter();
  try {
    sessionStorage.setItem(SESSION_HEX, hexEl.value);
  } catch {
    /* ignore */
  }
  runDecode();
});

loadHexFileEl.addEventListener('click', () => hexFileEl.click());

pasteHexClipboardEl.addEventListener('click', () => {
  void (async () => {
    errEl.textContent = '';
    decodeDetailEl.textContent = '';
    decodeDetailEl.hidden = true;
    try {
      const raw = await navigator.clipboard.readText();
      const s = raw.replaceAll('\uFEFF', '').trim();
      if (!s) {
        errEl.textContent = 'Clipboard is empty.';
        return;
      }
      const cur = hexEl.value.trimEnd();
      hexEl.value = cur ? `${cur}\n${s}` : s;
      updateHexLineMeter();
      try {
        sessionStorage.setItem(SESSION_HEX, hexEl.value);
      } catch {
        /* ignore */
      }
      runDecode();
    } catch (e) {
      const name = e instanceof Error ? e.name : '';
      if (name === 'NotAllowedError') {
        errEl.textContent =
          'Clipboard read blocked — allow permission in the browser / app settings, or paste into the hex field manually.';
      } else {
        errEl.textContent =
          e instanceof Error ? e.message : 'Could not read clipboard. Paste into the hex field manually.';
      }
    }
  })();
});

hexFileEl.addEventListener('change', () => {
  void (async () => {
    const f = hexFileEl.files?.[0];
    hexFileEl.value = '';
    if (!f) return;
    if (f.size > MAX_HEX_FILE_BYTES) {
      errEl.textContent = `File too large (${(f.size / (1024 * 1024)).toFixed(1)} MB). Maximum is ${(MAX_HEX_FILE_BYTES / (1024 * 1024)).toFixed(1)} MB.`;
      decodeDetailEl.hidden = true;
      decodeDetailEl.textContent = '';
      return;
    }
    const text = await f.text();
    hexEl.value = text.replaceAll('\uFEFF', '').trimEnd();
    updateHexLineMeter();
    try {
      sessionStorage.setItem(SESSION_HEX, hexEl.value);
    } catch {
      /* ignore */
    }
    runDecode();
  })();
});

restoreSession();
syncThemeButtons();
updateExportButtons();
updateHexLineMeter();

/** Prefill from ?hex=… or #hex=… (e.g. shared link). Runs after session restore so URL wins. */
function bootstrapDecodeFromUrl(): void {
  try {
    const u = new URL(globalThis.location.href);
    let raw = u.searchParams.get('hex');
    if (raw == null && u.hash.startsWith('#hex=')) {
      raw = decodeURIComponent(u.hash.slice(5));
    }
    if (raw == null || !raw.trim()) {
      return;
    }
    const t = raw.trim();
    if (t.length > MAX_URL_HEX_CHARS) {
      errEl.textContent = `URL hex exceeds ${MAX_URL_HEX_CHARS} characters — paste manually or use Load file.`;
      return;
    }
    hexEl.value = t;
    updateHexLineMeter();
    try {
      sessionStorage.setItem(SESSION_HEX, hexEl.value);
    } catch {
      /* ignore */
    }
    runDecode();
  } catch {
    /* ignore malformed URLs */
  }
}

bootstrapDecodeFromUrl();

function urlHasDecodeHexParam(): boolean {
  try {
    const u = new URL(globalThis.location.href);
    const q = u.searchParams.get('hex');
    if (q != null && q.trim()) {
      return true;
    }
    if (u.hash.startsWith('#hex=')) {
      const inner = decodeURIComponent(u.hash.slice(5));
      if (inner.trim()) {
        return true;
      }
    }
  } catch {
    /* ignore */
  }
  return false;
}

function restoreSessionMapViewIfIdle(): void {
  if (urlHasDecodeHexParam()) {
    return;
  }
  try {
    const raw = sessionStorage.getItem(SESSION_MAP_VIEW);
    if (!raw) {
      return;
    }
    const o = JSON.parse(raw) as { lat: number; lng: number; z: number };
    if (
      typeof o.lat === 'number' &&
      Number.isFinite(o.lat) &&
      typeof o.lng === 'number' &&
      Number.isFinite(o.lng) &&
      typeof o.z === 'number' &&
      Number.isFinite(o.z)
    ) {
      map.setView([o.lat, o.lng], o.z, { animate: false });
    }
  } catch {
    /* ignore */
  }
}

restoreSessionMapViewIfIdle();
queueMicrotask(() => invalidateMapSize());

const capacitorHintEl = document.querySelector<HTMLParagraphElement>('#capacitor-hint');
if (capacitorHintEl && Capacitor.getPlatform() === 'android') {
  capacitorHintEl.hidden = false;
}

/** Leaflet often needs a resize after WebView pause/resume or tab focus. */
function hookMapResizeOnForeground(): void {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      invalidateMapSize();
    }
  });
  if (Capacitor.isNativePlatform()) {
    void App.addListener('resume', () => {
      invalidateMapSize();
    });
  }
}

hookMapResizeOnForeground();

type NavigatorWithBattery = Navigator & {
  getBattery?: () => Promise<{ level: number }>;
};

async function readBatteryPct(): Promise<number> {
  try {
    const bat = await (navigator as NavigatorWithBattery).getBattery?.();
    if (!bat) return BATTERY_UNKNOWN;
    const n = Math.round(bat.level * 100);
    return n >= 0 && n <= 100 ? n : BATTERY_UNKNOWN;
  } catch {
    return BATTERY_UNKNOWN;
  }
}

function latLonToE7(n: number): number {
  return Math.round(n * 1e7);
}

function formatGeoError(geoErr: GeolocationPositionError): string {
  if (geoErr.code === 1) {
    return 'Location permission denied. Allow location for this app in system settings.';
  }
  if (geoErr.code === 2) {
    return 'Position unavailable.';
  }
  if (geoErr.code === 3) {
    return 'Location request timed out.';
  }
  return geoErr.message || 'Geolocation failed.';
}

function setEncodeSummary(p: LocationEmitterPacketV1): void {
  const lat = p.latE7 / 1e7;
  const lon = p.lonE7 / 1e7;
  const utc = new Date(p.unixTime * 1000).toISOString().replace('T', ' ').slice(0, 19);
  const bat =
    p.batteryPct === BATTERY_UNKNOWN ? 'unknown' : `${p.batteryPct}%`;
  const flags: string[] = [];
  if ((p.flags & FLAG_SOS) !== 0) flags.push('SOS');
  if ((p.flags & FLAG_RELAY_ELIGIBLE) !== 0) flags.push('relay');
  const flagStr = flags.length ? flags.join(', ') : 'none';
  encodeSummaryEl.hidden = false;
  encodeSummaryEl.textContent = `Fix: ${lat.toFixed(6)}, ${lon.toFixed(6)} · alt ${p.altM} m · ±${p.hAccuracyM} m · UTC ${utc}Z · battery ${bat} · flags: ${flagStr}`;
}

function clearEncodeOutputs(): void {
  outFullEl.value = '';
  outBleEl.value = '';
  outMeshEl.value = '';
  encodeSummaryEl.hidden = true;
  encodeSummaryEl.textContent = '';
  encodeLayer.clearLayers();
  exportEncodePacket = null;
  try {
    sessionStorage.removeItem(SESSION_OUT_FULL);
    sessionStorage.removeItem(SESSION_OUT_BLE);
    sessionStorage.removeItem(SESSION_OUT_MESH);
  } catch {
    /* ignore */
  }
  updateExportButtons();
}

encodeLocateEl.addEventListener('click', () => {
  encodeErrEl.textContent = '';
  encodeStatusEl.textContent = '';
  clearEncodeOutputs();
  lastEncoded = null;
  encodePlotEl.disabled = true;

  const text = encodeTextEl.value;
  const te = new TextEncoder();
  if (te.encode(text).length > 32) {
    encodeErrEl.textContent = 'Note exceeds 32 UTF-8 bytes.';
    return;
  }

  encodeLocateEl.disabled = true;
  encodeStatusEl.textContent = 'Requesting location…';

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      encodeLocateEl.disabled = false;
      const { latitude, longitude, altitude, accuracy } = pos.coords;
      const unixTime = Math.floor(Date.now() / 1000);
      const altM =
        altitude != null && Number.isFinite(altitude) ? Math.round(altitude) : 0;
      const hAccuracyM = Number.isFinite(accuracy) ? Math.min(65535, Math.max(0, Math.round(accuracy))) : 0;

      let flags = 0;
      if (encodeSosEl.checked) flags |= FLAG_SOS;
      if (encodeRelayEl.checked) flags |= FLAG_RELAY_ELIGIBLE;

      const packet: LocationEmitterPacketV1 = {
        version: 1,
        flags,
        unixTime,
        latE7: latLonToE7(latitude),
        lonE7: latLonToE7(longitude),
        altM,
        hAccuracyM,
        batteryPct: await readBatteryPct(),
        deviceId,
        text,
      };

      try {
        const full = encodeFull(packet);
        const ble = encodeBleShort(packet);
        const mesh = encodeMeshFromPacket(packet);
        outFullEl.value = toHexSpaced(full);
        outBleEl.value = toHexSpaced(ble);
        outMeshEl.value = toHexSpaced(mesh);
        lastEncoded = packet;
        encodePlotEl.disabled = false;
        setEncodeSummary(packet);
        persistWireOutputs();
        encodeStatusEl.textContent = `Encoded fix · ±${hAccuracyM} m (horizontal accuracy)`;
        tapVibrate();
      } catch (e) {
        encodeErrEl.textContent = e instanceof Error ? e.message : 'Encode failed.';
      }
    },
    (geoErr) => {
      encodeLocateEl.disabled = false;
      encodeStatusEl.textContent = '';
      encodeErrEl.textContent = formatGeoError(geoErr);
    },
    { enableHighAccuracy: true, maximumAge: 10_000, timeout: 25_000 },
  );
});

encodePlotEl.addEventListener('click', () => {
  if (!lastEncoded) return;
  encodeErrEl.textContent = '';
  encodeLayer.clearLayers();
  const bounds: L.LatLngTuple[] = [];
  const lat = lastEncoded.latE7 / 1e7;
  const lon = lastEncoded.lonE7 / 1e7;
  bounds.push([lat, lon]);
  const sos = (lastEncoded.flags & FLAG_SOS) !== 0;
  const id = [...lastEncoded.deviceId].map((b) => b.toString(16).padStart(2, '0')).join('');
  const title = `${sos ? 'SOS ' : ''}${id.slice(0, 8)}…`;
  const color = sos ? '#c62828' : '#1565c0';
  const fill = sos ? '#ff5252' : '#42a5f5';
  const m = L.circleMarker([lat, lon], {
    radius: sos ? 14 : 10,
    color,
    fillColor: fill,
    fillOpacity: 0.9,
    weight: 3,
  });
  m.bindPopup(
    `<strong>${escapeHtml(title)}</strong><br/>from Encode (this device)<br/>acc ${lastEncoded.hAccuracyM} m<br/>${lastEncoded.text ? escapeHtml(lastEncoded.text) : ''}`,
  );
  m.addTo(encodeLayer);
  exportEncodePacket = lastEncoded;
  map.setView(bounds[0]!, 15);
  queueMicrotask(() => m.openPopup());
  tapVibrate();
  updateExportButtons();
  encodeStatusEl.textContent = 'Encode pin on map — included in GPX/CSV export.';
  invalidateMapSize();
});

async function copyText(text: string, okMsg: string): Promise<void> {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    encodeStatusEl.textContent = okMsg;
  } catch {
    encodeStatusEl.textContent = 'Copy blocked — select the field and copy manually.';
  }
}

copyFullEl.addEventListener('click', () => copyText(outFullEl.value, 'Copied full LEP.'));
copyBleEl.addEventListener('click', () => copyText(outBleEl.value, 'Copied BLE short.'));
copyMeshEl.addEventListener('click', () => copyText(outMeshEl.value, 'Copied mesh frame.'));

copyAllWiresEl.addEventListener('click', () => {
  const a = outFullEl.value.trim();
  const b = outBleEl.value.trim();
  const c = outMeshEl.value.trim();
  if (!a && !b && !c) return;
  void copyText([a, b, c].filter(Boolean).join('\n'), 'Copied all three wires (line-separated).');
});

meshToDecodeEl.addEventListener('click', () => {
  const mesh = outMeshEl.value.trim();
  if (!mesh) {
    encodeStatusEl.textContent = 'Encode a mesh frame first.';
    return;
  }
  const cur = hexEl.value.trim();
  hexEl.value = cur ? `${cur}\n${mesh}` : mesh;
  hexEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  runDecode();
  encodeStatusEl.textContent = 'Mesh line added to Decode — plotted.';
});

exportGpxEl.addEventListener('click', () => {
  void (async () => {
    const pkts = packetsForExport();
    if (pkts.length === 0) return;
    await shareOrDownload(
      exportFilename('gpx'),
      'application/gpx+xml',
      packetsToGpx(pkts, 'peer-map'),
      `Exported ${pkts.length} waypoint(s) as GPX.`,
    );
  })();
});

exportCsvEl.addEventListener('click', () => {
  void (async () => {
    const pkts = packetsForExport();
    if (pkts.length === 0) return;
    const csv = `\uFEFF${packetsToCsv(pkts)}`;
    await shareOrDownload(
      exportFilename('csv'),
      'text/csv;charset=utf-8',
      csv,
      `Exported ${pkts.length} row(s) as CSV (UTF-8 with BOM for Excel).`,
    );
  })();
});

exportGeojsonEl.addEventListener('click', () => {
  void (async () => {
    const pkts = packetsForExport();
    if (pkts.length === 0) return;
    await shareOrDownload(
      exportFilename('geojson'),
      'application/geo+json;charset=utf-8',
      packetsToGeoJsonText(pkts),
      `Exported ${pkts.length} feature(s) as GeoJSON.`,
    );
  })();
});

function syncOnlineBanner(): void {
  netOfflineEl.hidden = navigator.onLine;
}

window.addEventListener('online', syncOnlineBanner);
window.addEventListener('offline', syncOnlineBanner);
syncOnlineBanner();

window.addEventListener('resize', invalidateMapSize);
if (typeof ResizeObserver !== 'undefined') {
  const wrap = document.querySelector('.map-wrap');
  if (wrap) {
    const ro = new ResizeObserver(() => invalidateMapSize());
    ro.observe(wrap);
  }
}

invalidateMapSize();
