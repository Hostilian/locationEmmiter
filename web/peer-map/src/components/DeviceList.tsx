import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../store/useAppStore';

export const DeviceList: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const peers = useAppStore(useShallow(state => state.peers));
  const peerList = useMemo(() => Object.values(peers).sort((a, b) => b.lastSeenMs - a.lastSeenMs), [peers]);

  return (
    <div className="absolute top-4 right-4 z-10 w-[calc(100%-2rem)] md:w-80 max-h-[90vh] overflow-y-auto glass-panel p-5 animate-fade-in-up [animation-delay:150ms]">
      <div className="flex items-center justify-between mb-5 px-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
          {t('active_peers')}
        </h3>
        <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold border border-primary/20">
          {peerList.length} ONLINE
        </span>
      </div>
      
      <div className="space-y-3">
        {peerList.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/5">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-text-muted opacity-20 fill-none stroke-current stroke-2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <h4 className="text-sm font-bold text-slate-300 mb-1">No Active Peers</h4>
            <p className="text-[11px] text-text-muted max-w-[180px]">
              Connect via BLE or use the Demo button to populate the map.
            </p>
          </div>
        ) : (
          peerList.map(peer => (
            <div 
              key={peer.deviceIdHex}
              className={`group p-4 rounded-xl border transition-all active:scale-[0.98] cursor-pointer ${
                peer.lastSos 
                  ? 'bg-danger/10 border-danger/30 hover:bg-danger/20' 
                  : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
              }`}
              onClick={() => useAppStore.getState().setMapCenter([peer.lastLonE7 / 1e7, peer.lastLatE7 / 1e7])}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                    peer.lastSos ? 'bg-danger/20 border-danger/30 text-danger' : 'bg-primary/10 border-primary/20 text-primary'
                  }`}>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-mono text-xs font-bold text-white">
                      {peer.deviceIdHex.substring(0, 8)}
                    </div>
                    <div className="text-[10px] text-text-muted font-medium">
                      {Math.floor((Date.now() - peer.lastSeenMs) / 1000)}s {t('ago')}
                    </div>
                  </div>
                </div>
                {peer.lastSos && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-danger text-white text-[10px] font-black animate-pulse">
                    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white">
                      <path d="M12 2L2 22h20L12 2zm1 14h-2v2h2v-2zm0-6h-2v4h2v-4z" />
                    </svg>
                    SOS
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        peer.lastBatteryPct > 20 ? 'bg-secondary' : 'bg-danger'
                      }`}
                      style={{ width: `${peer.lastBatteryPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-text-muted">
                    {peer.lastBatteryPct}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-text-muted">
                    {peer.lastLatE7 / 1e7}, {peer.lastLonE7 / 1e7}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});
