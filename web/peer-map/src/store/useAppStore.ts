import { LocationEmitterPacketV1 } from '@location-emitter/packet';
import { create } from 'zustand';

export interface PeerDevice {
  deviceIdHex: string;
  lastSeenMs: number;
  lastLatE7: number;
  lastLonE7: number;
  lastBatteryPct: number;
  lastSos: boolean;
  packets: LocationEmitterPacketV1[];
  nickname?: string;
}

interface AppState {
  peers: Record<string, PeerDevice>;
  bleConnected: boolean;
  mapCenter: [number, number]; // [lng, lat] for Mapbox
  units: 'metric' | 'imperial';
  weakSignal: boolean;
  inactivityTimeoutMs: number;
  nicknames: Record<string, string>;
  addPacket: (packet: LocationEmitterPacketV1) => void;
  setBleConnected: (connected: boolean) => void;
  setMapCenter: (lngLat: [number, number]) => void;
  setUnits: (units: 'metric' | 'imperial') => void;
  setWeakSignal: (weak: boolean) => void;
  setInactivityTimeout: (ms: number) => void;
  setNickname: (deviceIdHex: string, nickname: string) => void;
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
          packets: [...existing.packets, packet],
          nickname: state.nicknames[devHex] || existing.nickname
        };
      }
      return { peers: newPeers };
    });
  };

  return {
    peers: {},
    bleConnected: false,
    mapCenter: [2.2945, 48.8584],
    units: 'metric',
    weakSignal: false,
    inactivityTimeoutMs: 300000, // 5 minutes default
    nicknames: JSON.parse(localStorage.getItem('lep_nicknames') || '{}'),

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
    setUnits: (units) => set({ units }),
    setWeakSignal: (weak) => set({ weakSignal: weak }),
    setInactivityTimeout: (ms) => set({ inactivityTimeoutMs: ms }),
    setNickname: (deviceIdHex, nickname) => set((state) => {
      const newNicknames = { ...state.nicknames, [deviceIdHex]: nickname };
      localStorage.setItem('lep_nicknames', JSON.stringify(newNicknames));
      
      const newPeers = { ...state.peers };
      if (newPeers[deviceIdHex]) {
        newPeers[deviceIdHex] = { ...newPeers[deviceIdHex], nickname };
      }
      return { nicknames: newNicknames, peers: newPeers };
    }),
    clearHistory: () => set({ peers: {} }),
  };
});
