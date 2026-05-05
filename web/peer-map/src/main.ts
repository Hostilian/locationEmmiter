import L from 'leaflet';
import { decodeAny, decodeFull, FLAG_SOS, type LocationEmitterPacketV1 } from '@location-emitter/packet';
import { unwrapMeshFrame } from '@location-emitter/mesh';

const hexEl = document.querySelector<HTMLTextAreaElement>('#hex')!;
const goEl = document.querySelector<HTMLButtonElement>('#go')!;
const errEl = document.querySelector<HTMLDivElement>('#err')!;

const map = L.map('map').setView([20, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap',
}).addTo(map);

const layer = L.layerGroup().addTo(map);

function parseHex(s: string): Uint8Array | null {
  const parts = s
    .trim()
    .replace(/0x/gi, '')
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return null;
  try {
    return Uint8Array.from(parts.map((h) => parseInt(h, 16)));
  } catch {
    return null;
  }
}

function decodeToPacket(buf: Uint8Array): { packet: LocationEmitterPacketV1; label: string } | null {
  if (
    buf.length >= 6 &&
    buf[0] === 0x4c &&
    buf[1] === 0x52 &&
    buf[2] === 0x4d &&
    buf[3] === 0x31
  ) {
    const u = unwrapMeshFrame(buf);
    if (!u) return null;
    const d = decodeFull(u.lepWire);
    if (!d.ok) return null;
    return { packet: d.packet, label: `mesh hop=${u.hopRemaining}` };
  }
  const d = decodeAny(buf);
  if (!d.ok) return null;
  return { packet: d.packet, label: d.wire };
}

function plot(
  p: LocationEmitterPacketV1,
  extra: string,
  bounds: L.LatLngTuple[],
  hue: number,
) {
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
  m.addTo(layer);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

goEl.addEventListener('click', () => {
  errEl.textContent = '';
  layer.clearLayers();
  const lines = hexEl.value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    errEl.textContent = 'Paste one or more hex lines.';
    return;
  }
  const bounds: L.LatLngTuple[] = [];
  let errors = 0;
  for (let i = 0; i < lines.length; i++) {
    const buf = parseHex(lines[i]!);
    if (!buf) {
      errors++;
      continue;
    }
    const got = decodeToPacket(buf);
    if (!got) {
      errors++;
      continue;
    }
    plot(got.packet, `${got.label} (line ${i + 1})`, bounds, i * 47);
  }
  if (bounds.length === 1) {
    map.setView(bounds[0]!, 14);
  } else if (bounds.length > 1) {
    map.fitBounds(L.latLngBounds(bounds), { padding: [48, 48], maxZoom: 15 });
  }
  if (errors > 0) {
    errEl.textContent = `${errors} line(s) could not be parsed or decoded.`;
  }
});
