import { create } from 'zustand';
import { LocationEmitterPacketV1 } from '@location-emitter/packet';

export interface PeerDevice {
  deviceIdHex: string;
  lastSeenMs: number;
  lastLatE7: number;
  lastLonE7: number;
  lastBatteryPct: number;
  lastSos: boolean;
  packets: LocationEmitterPacketV1[];
}

interface AppState {
  peers: Record<string, PeerDevice>;
  bleConnected: boolean;
  mapCenter: [number, number]; // [lng, lat] for Mapbox
  addPacket: (packet: LocationEmitterPacketV1) => void;
  setBleConnected: (connected: boolean) => void;
  setMapCenter: (lngLat: [number, number]) => void;
  clearHistory: () => void;
}

let packetBuffer: LocationEmitterPacketV1[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

export const useAppStore = create<AppState>((set) => {
  const flushPackets = () => {
    if (packetBuffer.length === 0) return;
    const packets = [...packetBuffer];
    packetBuffer = [];
    
    set((state) => {
      const newPeers = { ...state.peers };
      for (const packet of packets) {
        const devHex = [...packet.deviceId].map(b => b.toString(16).padStart(2, '0')).join('');
        const isSos = (packet.flags & 1) !== 0; // FLAG_SOS
        
        const existing = newPeers[devHex] || {
          deviceIdHex: devHex,
          packets: [],
        };
        
        newPeers[devHex] = {
          ...existing,
          lastSeenMs: packet.unixTime * 1000,
          lastLatE7: packet.latE7,
          lastLonE7: packet.lonE7,
          lastBatteryPct: packet.batteryPct,
          lastSos: isSos,
          packets: [...existing.packets, packet]
        };
      }
      return { peers: newPeers };
    });
  };

  return {
    peers: {},
    bleConnected: false,
    mapCenter: [2.2945, 48.8584],

    addPacket: (packet) => {
      packetBuffer.push(packet);
      if (!flushTimeout) {
        flushTimeout = setTimeout(() => {
          flushTimeout = null;
          flushPackets();
        }, 33); // ~30 FPS throttling
      }
    },

    setBleConnected: (connected) => set({ bleConnected: connected }),
    setMapCenter: (lngLat) => set({ mapCenter: lngLat }),
    clearHistory: () => set({ peers: {} }),
  };
});
