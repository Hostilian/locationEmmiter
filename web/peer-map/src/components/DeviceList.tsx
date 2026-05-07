import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../store/useAppStore';

export const DeviceList: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const { peers, inactivityTimeoutMs, setNickname } = useAppStore(useShallow(state => ({
    peers: state.peers,
    inactivityTimeoutMs: state.inactivityTimeoutMs,
    setNickname: state.setNickname
  })));
  const peerList = useMemo(() => Object.values(peers).sort((a, b) => b.lastSeenMs - a.lastSeenMs), [peers]);

  return (
    <div className="absolute top-4 right-4 z-10 w-[calc(100%-2rem)] md:w-80 max-h-[90vh] overflow-y-auto glass-panel p-6 animate-fade-in-up [animation-delay:150ms]">
      <div className="flex items-center justify-between mb-6 px-1">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
          {t('active_peers')}
        </h3>
        <span className="badge-primary">
          {peerList.length} Online
        </span>
      </div>
      
      <div className="space-y-4">
        {peerList.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center px-4">
            <div className="w-20 h-20 rounded-full bg-white/[0.03] flex items-center justify-center mb-6 border border-white/[0.05]">
              <svg viewBox="0 0 24 24" className="w-10 h-10 text-primary opacity-20 fill-none stroke-current stroke-[1.5]">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h4 className="text-base font-black text-zinc-300 mb-2 uppercase tracking-tight">No Signal</h4>
            <p className="text-[11px] text-zinc-500 max-w-[200px] leading-relaxed">
              Establishing uplink... Connect via BLE or trigger simulation to see active nodes.
            </p>
          </div>
        ) : (
          peerList.map((peer, index) => {
            const isInactive = (Date.now() - peer.lastSeenMs) > inactivityTimeoutMs;
            
            return (
              <div 
                key={peer.deviceIdHex}
                className={`group p-4 rounded-xl border transition-all active:scale-[0.98] cursor-pointer animate-fade-in-up stagger-${(index % 4) + 1} ${
                  peer.lastSos 
                    ? 'bg-danger/10 border-danger/30 hover:bg-danger/20' 
                    : isInactive 
                      ? 'bg-zinc-900/40 border-white/5 opacity-60 grayscale-[0.5]'
                      : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10 shadow-lg'
                }`}
                onClick={() => useAppStore.getState().setMapCenter([peer.lastLonE7 / 1e7, peer.lastLatE7 / 1e7])}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${
                      peer.lastSos ? 'bg-danger/20 border-danger/40 text-danger' : 'bg-primary/10 border-primary/20 text-primary'
                    }`}>
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-[1.5]">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-mono text-xs font-black text-white tracking-tighter flex items-center gap-2">
                        {peer.nickname || `${peer.deviceIdHex.substring(0, 4)}...${peer.deviceIdHex.substring(peer.deviceIdHex.length - 4)}`}
                        {!peer.nickname && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const name = prompt('Enter nickname:');
                              if (name) setNickname(peer.deviceIdHex, name);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg viewBox="0 0 24 24" className="w-3 h-3 text-zinc-500 hover:text-primary fill-none stroke-current stroke-2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">
                        {isInactive ? 'INACTIVE' : `Last Ping: ${Math.floor((Date.now() - peer.lastSeenMs) / 1000)}s`}
                      </div>
                    </div>
                  </div>
                {peer.lastSos && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-danger text-white text-[9px] font-black animate-pulse shadow-lg shadow-danger/20">
                    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white">
                      <path d="M12 2L2 22h20L12 2zm1 14h-2v2h2v-2zm0-6h-2v4h2v-4z" />
                    </svg>
                    SOS
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.05]">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-0.5">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">Power</span>
                    <span className={`text-[9px] font-black font-mono ${peer.lastBatteryPct > 20 ? 'text-secondary' : 'text-danger'}`}>
                      {peer.lastBatteryPct}%
                    </span>
                  </div>
                  <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        peer.lastBatteryPct > 20 ? 'bg-secondary' : 'bg-danger'
                      }`}
                      style={{ width: `${peer.lastBatteryPct}%` }}
                    />
                  </div>
                </div>
                <div className="text-right flex flex-col justify-end">
                  <span className="text-[9px] font-mono text-zinc-400 font-bold tracking-tighter">
                    {peer.lastLatE7 / 1e7}, {peer.lastLonE7 / 1e7}
                  </span>
                  <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-[0.1em] mt-0.5">Coordinates</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});
