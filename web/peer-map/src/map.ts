import L from 'leaflet';
import { type LocationEmitterPacketV1, FLAG_SOS } from '@location-emitter/packet';

export class MapManager {
  private map: L.Map;
  private decodeLayer: L.LayerGroup;
  private encodeLayer: L.LayerGroup;
  private activeBasemap: L.TileLayer;
  private tileLight: L.TileLayer;
  private tileDark: L.TileLayer;

  constructor(elementId: string) {
    this.map = L.map(elementId, {
      zoomControl: true,
      maxBounds: [
        [-85, -200],
        [85, 200],
      ],
      maxBoundsViscosity: 0.85,
    }).setView([20, 0], 2);

    this.decodeLayer = L.layerGroup().addTo(this.map);
    this.encodeLayer = L.layerGroup().addTo(this.map);

    this.tileLight = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    });
    this.tileDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    });

    this.activeBasemap = this.tileLight;
    this.activeBasemap.addTo(this.map);
  }

  get instance() { return this.map; }

  setTheme(isDark: boolean) {
    if (this.map.hasLayer(this.activeBasemap)) {
      this.map.removeLayer(this.activeBasemap);
    }
    this.activeBasemap = isDark ? this.tileDark : this.tileLight;
    this.activeBasemap.addTo(this.map);
    this.syncStyles();
  }

  clearDecodes() {
    this.decodeLayer.clearLayers();
  }

  clearEncodes() {
    this.encodeLayer.clearLayers();
  }

  plot(
    p: LocationEmitterPacketV1,
    label: string,
    isEncode = false,
    hue = 0
  ): L.CircleMarker {
    const lat = p.latE7 / 1e7;
    const lon = p.lonE7 / 1e7;
    const sos = (p.flags & FLAG_SOS) !== 0;

    const color = sos ? this.getThemeToken('--sos', '#c52842') : isEncode ? '#0f75c9' : `hsl(${hue % 360} 70% 40%)`;
    const fill = sos ? this.getThemeToken('--sos-soft', '#ff6179') : isEncode ? '#52b4ff' : `hsl(${hue % 360} 85% 55%)`;

    const m = L.circleMarker([lat, lon], {
      radius: sos ? 12 : 8,
      color,
      fillColor: fill,
      fillOpacity: 0.85,
      weight: isEncode ? 3 : 2,
    });

    const id = [...p.deviceId].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 8);
    m.bindPopup(
      `<strong>${sos ? 'SOS ' : ''}${id}…</strong><br/>${label}<br/>acc ${p.hAccuracyM} m<br/>${p.text ? this.escapeHtml(p.text) : ''}`
    );

    m.addTo(isEncode ? this.encodeLayer : this.decodeLayer);
    return m;
  }

  drawPath(points: L.LatLngTuple[]) {
    if (points.length < 2) return;
    L.polyline(points, {
      color: this.getPathColor(),
      weight: 2,
      dashArray: '6 10',
      opacity: 0.55,
      interactive: false,
    }).addTo(this.decodeLayer).bringToBack();
  }

  fitAll() {
    const fg = L.featureGroup([this.decodeLayer, this.encodeLayer]);
    const b = fg.getBounds();
    if (b.isValid()) {
      this.map.fitBounds(b, { padding: [52, 52], maxZoom: 16 });
    }
  }

  invalidate() {
    this.map.invalidateSize();
  }

  private getPathColor(): string {
    return document.documentElement.classList.contains('theme-dark') ? '#9db5ff' : '#4f62f0';
  }

  private syncStyles() {
    const color = this.getPathColor();
    this.decodeLayer.eachLayer((ly) => {
      if (ly instanceof L.Polyline && !(ly instanceof L.Polygon)) {
        ly.setStyle({ color });
      }
    });
  }

  private getThemeToken(name: string, fallback: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  }

  private escapeHtml(s: string): string {
    return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  }
}
