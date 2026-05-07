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

export const useAppStore = create<AppState>((set) => ({
  peers: {},
  bleConnected: false,
  mapCenter: [2.2945, 48.8584], // Default to Paris (Eiffel Tower approx)

  addPacket: (packet) => set((state) => {
    const devHex = [...packet.deviceId].map(b => b.toString(16).padStart(2, '0')).join('');
    const isSos = (packet.flags & 1) !== 0; // FLAG_SOS
    
    const existing = state.peers[devHex] || {
      deviceIdHex: devHex,
      packets: [],
    };
    
    return {
      peers: {
        ...state.peers,
        [devHex]: {
          ...existing,
          lastSeenMs: packet.unixTime * 1000,
          lastLatE7: packet.latE7,
          lastLonE7: packet.lonE7,
          lastBatteryPct: packet.batteryPct,
          lastSos: isSos,
          packets: [...existing.packets, packet]
        }
      }
    };
  }),

  setBleConnected: (connected) => set({ bleConnected: connected }),
  setMapCenter: (lngLat) => set({ mapCenter: lngLat }),
  clearHistory: () => set({ peers: {} }),
}));
