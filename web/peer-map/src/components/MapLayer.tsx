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
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 8, 15, 14],
            'circle-color': '#7c3aed',
            'circle-stroke-width': 3,
            'circle-stroke-color': 'rgba(255, 255, 255, 0.2)',
            'circle-opacity': 0.9
          }
        });

        map.current.addLayer({
          id: 'peers-sos',
          type: 'circle',
          source: 'peers',
          filter: ['==', 'sos', true],
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 10, 15, 20],
            'circle-color': '#f43f5e',
            'circle-stroke-width': 4,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 1
          }
        });

        map.current.on('click', ['peers-normal', 'peers-sos'], (e) => {
          if (!e.features || e.features.length === 0 || !map.current) return;
          
          const feature = e.features[0];
          const geometry = feature.geometry as GeoJSON.Point;
          const coordinates = geometry.coordinates.slice() as [number, number];
          const properties = feature.properties as { id: string; battery: number; sos: boolean };
          const { id, battery, sos } = properties;
          
          while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
          }

          const popupContent = `
            <div class="p-5 bg-[#050505]/95 backdrop-blur-xl text-white rounded-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-w-[200px] animate-fade-in-up">
              <div class="flex items-center gap-3 mb-4 pb-4 border-b border-white/5">
                <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-[11px] font-black text-primary border border-primary/20 shadow-inner">
                  ${id.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div class="font-mono text-[11px] font-black tracking-tighter">${id.substring(0, 16)}...</div>
                  <div class="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">Tactical Node</div>
                </div>
              </div>
              <div class="space-y-3">
                <div class="flex justify-between items-center">
                  <span class="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">Energy Core</span>
                  <span class="font-mono text-[10px] font-black ${battery > 20 ? 'text-secondary' : 'text-danger'}">${battery}%</span>
                </div>
                <div class="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div class="h-full ${battery > 20 ? 'bg-secondary' : 'bg-danger'} transition-all duration-1000" style="width: ${battery}%"></div>
                </div>
                <div class="flex justify-between items-center pt-1">
                  <span class="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">Status</span>
                  <div class="flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full ${sos ? 'bg-danger animate-pulse' : 'bg-primary'}"></span>
                    <span class="text-[9px] font-black uppercase ${sos ? 'text-danger' : 'text-primary'}">${sos ? 'CRITICAL' : 'OPTIMAL'}</span>
                  </div>
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
