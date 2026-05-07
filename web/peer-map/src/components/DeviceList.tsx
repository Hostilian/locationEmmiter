import React from 'react';
import { useAppStore } from '../store/useAppStore';

export const DeviceList: React.FC = () => {
  const peers = useAppStore(state => state.peers);
  const peerList = Object.values(peers).sort((a, b) => b.lastSeenMs - a.lastSeenMs);

  if (peerList.length === 0) return null;

  return (
    <div className="absolute top-4 right-4 z-10 w-72 max-h-[90vh] overflow-y-auto bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-white shadow-2xl">
      <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center justify-between">
        Active Peers
        <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs">{peerList.length}</span>
      </h3>
      
      <div className="space-y-2">
        {peerList.map(peer => (
          <div 
            key={peer.deviceIdHex}
            className={`p-3 rounded-xl border ${peer.lastSos ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/5'} transition-all hover:bg-white/10 cursor-pointer`}
            onClick={() => useAppStore.getState().setMapCenter([peer.lastLonE7 / 1e7, peer.lastLatE7 / 1e7])}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-sm font-semibold">{peer.deviceIdHex.substring(0, 8)}...</span>
              {peer.lastSos && <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded animate-pulse">SOS</span>}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{peer.lastBatteryPct}% 🔋</span>
              <span>{Math.floor((Date.now() - peer.lastSeenMs) / 1000)}s ago</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
