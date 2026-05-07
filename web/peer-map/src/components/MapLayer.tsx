import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAppStore } from '../store/useAppStore';

// In a real app, this would be an env var
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoibG9jYXRpb25lbWl0dGVyIiwiYSI6ImNtMHhndTR0azAweW8yanF6cTBrZGdha3AifQ.placeholder';

export const MapLayer: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Record<string, mapboxgl.Marker>>({});
  
  const peers = useAppStore(state => state.peers);
  const mapCenter = useAppStore(state => state.mapCenter);

  useEffect(() => {
    if (map.current) return; // initialize map only once
    
    if (mapContainer.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11', // Perfect for our dark theme
        center: mapCenter,
        zoom: 12
      });
      
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    }
  }, []);

  // Update markers when peers change
  useEffect(() => {
    if (!map.current) return;
    
    Object.values(peers).forEach(peer => {
      const lng = peer.lastLonE7 / 1e7;
      const lat = peer.lastLatE7 / 1e7;
      
      const el = document.createElement('div');
      el.className = 'w-4 h-4 rounded-full border-2 border-white shadow-lg';
      el.style.backgroundColor = peer.lastSos ? '#ef4444' : '#3b82f6';
      if (peer.lastSos) {
        el.classList.add('animate-ping');
      }

      if (markers.current[peer.deviceIdHex]) {
        markers.current[peer.deviceIdHex].setLngLat([lng, lat]);
      } else {
        markers.current[peer.deviceIdHex] = new mapboxgl.Marker(el)
          .setLngLat([lng, lat])
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<h3>Device: ${peer.deviceIdHex}</h3>
             <p>Battery: ${peer.lastBatteryPct}%</p>`
          ))
          .addTo(map.current!);
      }
    });
    
  }, [peers]);

  return (
    <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
  );
};
