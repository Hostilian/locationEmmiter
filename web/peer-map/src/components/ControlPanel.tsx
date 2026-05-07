import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';

export const ControlPanel: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const { bleConnected, setBleConnected, clearHistory } = useAppStore();
  const [hexInput, setHexInput] = useState('');

  const handleSimulate = () => {
    console.log("Simulating hex:", hexInput);
  };

  const handleMagicDemo = () => {
    let count = 0;
    clearHistory();
    const interval = setInterval(() => {
      if (count > 25) {
        clearInterval(interval);
        return;
      }
      count++;
      
      useAppStore.getState().addPacket({
        version: 1,
        flags: Math.random() > 0.85 ? 1 : 2,
        unixTime: Math.floor(Date.now() / 1000),
        latE7: 488583700 + Math.floor((Math.random() - 0.5) * 80000),
        lonE7: 22948100 + Math.floor((Math.random() - 0.5) * 80000),
        altM: 35,
        hAccuracyM: 10,
        batteryPct: Math.floor(40 + Math.random() * 60),
        deviceId: Uint8Array.from([count, 8, 8, 8, count, 8, 8, 8]),
        text: '',
      });
    }, 250);
  };

  return (
    <div className="absolute top-4 left-4 z-10 w-[calc(100%-2rem)] md:w-80 max-h-[90vh] overflow-y-auto glass-panel p-6 animate-fade-in-up">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
          <svg viewBox="0 0 24 24" className="w-7 h-7 text-primary fill-none stroke-current stroke-[1.5]">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-black leading-none tracking-tight text-white uppercase">{t('app_title')}</h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold mt-1.5 opacity-80">Command Center</p>
        </div>
      </div>
      
      <div className="space-y-8">
        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Connectivity</h3>
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${bleConnected ? 'bg-secondary animate-pulse-glow' : 'bg-danger'}`} />
              <span className={`text-[10px] font-black uppercase tracking-wider ${bleConnected ? 'text-secondary' : 'text-danger'}`}>
                {bleConnected ? 'Active' : 'Offline'}
              </span>
            </div>
          </div>
          
          <button 
            aria-label={bleConnected ? "Disconnect Bluetooth" : "Connect Bluetooth"}
            className={`w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.97] ${
              bleConnected 
                ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-white/5'
                : 'btn-primary'
            }`}
            onClick={() => setBleConnected(!bleConnected)}
          >
            {bleConnected ? (
              <>
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2" aria-hidden="true">
                  <path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" />
                </svg>
                {t('disconnect_ble')}
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2" aria-hidden="true">
                  <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.59 16a5 5 0 0 1 6.82 0M12 20h.01" />
                </svg>
                {t('connect_ble')}
              </>
            )}
          </button>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">{t('manual_input')}</h3>
            <span className="text-[9px] font-bold text-primary/60 px-1.5 py-0.5 rounded border border-primary/20 bg-primary/5 uppercase">Hex-Link</span>
          </div>

          <div className="relative group mb-4">
            <textarea 
              aria-label="Hex Packet Input"
              className="w-full h-32 input-field font-mono text-[11px] text-primary-light leading-relaxed resize-none p-4"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              placeholder="0xAA 0xBB 0xCC..."
            />
            <div className="absolute bottom-3 right-3 opacity-30 pointer-events-none">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary fill-none stroke-current stroke-1">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              aria-label="Decode hex packet"
              className="flex-1 btn-secondary text-[11px] py-3 uppercase tracking-widest flex items-center justify-center gap-2 border-white/5 bg-zinc-900/50"
              onClick={handleSimulate}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2" aria-hidden="true">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {t('decode')}
            </button>
            <button 
              aria-label="Run magic demo"
              className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all active:scale-[0.97] py-3 flex items-center justify-center gap-2"
              onClick={handleMagicDemo}
            >
              <span className="text-sm" aria-hidden="true">✨</span>
              {t('demo')}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
});
