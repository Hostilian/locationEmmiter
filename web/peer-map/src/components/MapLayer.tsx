import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

// In a real app, this would be an env var
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoibG9jYXRpb25lbWl0dGVyIiwiYSI6ImNtMHhndTR0azAweW8yanF6cTBrZGdha3AifQ.placeholder';

export const MapLayer: React.FC = React.memo(() => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  
  const mapCenter = useAppStore(state => state.mapCenter);
  // Using useShallow to prevent rerenders if the object structure hasn't changed
  const peers = useAppStore(useShallow(state => state.peers));

  useEffect(() => {
    if (map.current) return;
    
    if (mapContainer.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: mapCenter,
        zoom: 12
      });
      
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('load', () => {
        if (!map.current) return;

        map.current.addSource('peers', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });

        map.current.addLayer({
          id: 'peers-normal',
          type: 'circle',
          source: 'peers',
          filter: ['!=', 'sos', true],
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 6, 15, 12],
            'circle-color': '#6366f1',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.8
          }
        });

        map.current.addLayer({
          id: 'peers-sos',
          type: 'circle',
          source: 'peers',
          filter: ['==', 'sos', true],
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 8, 15, 16],
            'circle-color': '#f43f5e',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9
          }
        });

        map.current.on('click', ['peers-normal', 'peers-sos'], (e) => {
          if (!e.features || e.features.length === 0 || !map.current) return;
          const coordinates = (e.features[0].geometry as any).coordinates.slice();
          const { id, battery, sos } = e.features[0].properties as any;
          
          while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
          }

          const popupContent = `
            <div class="p-3 bg-slate-900 text-white rounded-lg border border-white/10 shadow-xl min-w-[160px]">
              <div class="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                <div class="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/20">
                  ${id.substring(0, 2)}
                </div>
                <div class="font-mono text-xs font-bold">${id.substring(0, 12)}...</div>
              </div>
              <div class="space-y-1.5">
                <div class="flex justify-between text-[10px]">
                  <span class="text-slate-400">Battery</span>
                  <span class="font-mono font-bold ${battery > 20 ? 'text-secondary' : 'text-danger'}">${battery}%</span>
                </div>
                <div class="flex justify-between text-[10px]">
                  <span class="text-slate-400">Status</span>
                  <span class="font-bold ${sos ? 'text-danger animate-pulse' : 'text-primary'}">${sos ? 'SOS' : 'Normal'}</span>
                </div>
              </div>
            </div>
          `;

          new mapboxgl.Popup({ 
            closeButton: false, 
            className: 'custom-popup',
            maxWidth: 'none'
          })
            .setLngLat(coordinates)
            .setHTML(popupContent)
            .addTo(map.current);
        });
        
        const setCursor = (cursor: string) => { if (map.current) map.current.getCanvas().style.cursor = cursor; };
        map.current.on('mouseenter', 'peers-normal', () => setCursor('pointer'));
        map.current.on('mouseleave', 'peers-normal', () => setCursor(''));
        map.current.on('mouseenter', 'peers-sos', () => setCursor('pointer'));
        map.current.on('mouseleave', 'peers-sos', () => setCursor(''));
      });
    }
  }, []);

  // Update GeoJSON source when peers change
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    
    const source = map.current.getSource('peers') as mapboxgl.GeoJSONSource;
    if (source) {
      const features: GeoJSON.Feature<GeoJSON.Point>[] = Object.values(peers).map(peer => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [peer.lastLonE7 / 1e7, peer.lastLatE7 / 1e7]
        },
        properties: {
          id: peer.deviceIdHex,
          battery: peer.lastBatteryPct,
          sos: peer.lastSos
        }
      }));

      source.setData({
        type: 'FeatureCollection',
        features
      });
    }
  }, [peers]);

  return (
    <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
  );
});
