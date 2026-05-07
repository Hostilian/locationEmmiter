import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LogicManager } from '../logic';
import { useAppStore } from '../store/useAppStore';

export const ControlPanel: React.FC = React.memo(() => {
  const { t, i18n } = useTranslation();
  const { bleConnected, setBleConnected, clearHistory, units, setUnits, peers, weakSignal, inactivityTimeoutMs, setInactivityTimeout } = useAppStore();
  const [hexInput, setHexInput] = useState('');
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(!localStorage.getItem('onboarding_done'));
  const [showPermissionPrompt, setShowPermissionPrompt] = useState<'location' | 'bluetooth' | null>(null);
  
  const [sosProgress, setSosProgress] = useState(0);
  const [sosHolding, setSosHolding] = useState(false);
  const sosIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const startSosTimer = () => {
    setSosHolding(true);
    setSosProgress(0);
    const start = Date.now();
    sosIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(100, (elapsed / 3000) * 100);
      setSosProgress(progress);
      if (progress >= 100) {
        clearInterval(sosIntervalRef.current!);
        handleTriggerSos();
      }
    }, 50);
  };

  const cancelSosTimer = () => {
    if (sosIntervalRef.current) clearInterval(sosIntervalRef.current);
    setSosHolding(false);
    setSosProgress(0);
  };

  const handleTriggerSos = () => {
    setSosHolding(false);
    setSosProgress(0);
    alert('SOS TRIGGERED! (In a real deployment, this would send an SOS packet via BLE/Serial)');
    // Logic to actually send the packet would go here
  };

  const onboardingSteps = [
    {
      title: t('onboarding_title'),
      text: t('onboarding_text'),
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8 text-primary fill-none stroke-current stroke-[1.5]">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      )
    },
    {
      title: "Tactical Setup",
      text: "Connect your hardware via Bluetooth or use the Manual Input to ingest packets. Your teammates will appear on the map instantly.",
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8 text-primary fill-none stroke-current stroke-[1.5]">
          <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.59 16a5 5 0 0 1 6.82 0M12 20h.01" />
        </svg>
      )
    },
    {
      title: "Safety First",
      text: "In an emergency, long-press the SOS button on your device. The app will highlight SOS beacons in red and prioritize their location.",
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8 text-danger fill-none stroke-current stroke-[1.5]">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
        </svg>
      )
    }
  ];

  const handleNextOnboarding = () => {
    if (onboardingStep < onboardingSteps.length - 1) {
      setOnboardingStep(onboardingStep + 1);
    } else {
      localStorage.setItem('onboarding_done', 'true');
      setShowOnboarding(false);
      setShowPermissionPrompt('location'); // Show location prompt after onboarding
    }
  };

  const handleAcceptPermission = () => {
    if (showPermissionPrompt === 'location') {
      setShowPermissionPrompt('bluetooth');
      // In a real app, this would trigger BackgroundLocationService.startTracking()
    } else {
      setShowPermissionPrompt(null);
      // In a real app, this would trigger BLE pairing
    }
  };

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

  const isRtl = i18n.language === 'ar';

  return (
    <>
      {showOnboarding && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="glass-panel max-w-sm p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner mx-auto mb-6">
              {onboardingSteps[onboardingStep].icon}
            </div>
            <h2 className="text-xl font-black text-white uppercase mb-4">{onboardingSteps[onboardingStep].title}</h2>
            <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
              {onboardingSteps[onboardingStep].text}
            </p>
            
            <div className="flex gap-2 mb-8 justify-center">
              {onboardingSteps.map((_, i) => (
                <div key={i} className={`h-1 rounded-full transition-all ${i === onboardingStep ? 'w-8 bg-primary' : 'w-2 bg-white/10'}`} />
              ))}
            </div>

            <button 
              onClick={handleNextOnboarding}
              className="w-full btn-primary py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.97]"
            >
              {onboardingStep === onboardingSteps.length - 1 ? 'Start Mission' : 'Next'}
            </button>
          </div>
        </div>
      )}

      {showPermissionPrompt && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="glass-panel max-w-sm p-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner mb-6">
              {showPermissionPrompt === 'location' ? (
                <svg viewBox="0 0 24 24" className="w-8 h-8 text-primary fill-none stroke-current stroke-[1.5]">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-8 h-8 text-primary fill-none stroke-current stroke-[1.5]">
                  <path d="M6.5 6.5l11 11L12 23V1l5.5 5.5-11 11" />
                </svg>
              )}
            </div>
            <h2 className="text-xl font-black text-white uppercase mb-4">
              {showPermissionPrompt === 'location' ? 'Location Access' : 'Bluetooth Access'}
            </h2>
            <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
              {showPermissionPrompt === 'location' 
                ? 'Location Emitter needs background location access to keep your "SOS Lifeline" active even when your phone is locked. Your coordinates are only shared within your private mesh.'
                : 'Bluetooth is required to pair with your LoRa transmitter hardware. This allows you to send and receive data beyond cellular range.'}
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowPermissionPrompt(null)}
                className="flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all"
              >
                Skip
              </button>
              <button 
                onClick={handleAcceptPermission}
                className="flex-[2] btn-primary py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.97]"
              >
                Grant Access
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className={`absolute top-4 ${isRtl ? 'right-4' : 'left-4'} z-10 w-[calc(100%-2rem)] md:w-80 max-h-[90vh] overflow-y-auto glass-panel p-6 animate-fade-in-up`} dir={isRtl ? 'rtl' : 'ltr'}>
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
      
      {weakSignal && (
        <div className="mb-6 p-3 bg-danger/10 border border-danger/20 rounded-xl flex items-center gap-3 animate-pulse">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-danger fill-none stroke-current stroke-2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
          </svg>
          <span className="text-[10px] font-black uppercase tracking-wider text-danger">
            {t('weak_signal')}
          </span>
        </div>
      )}

      <div className="space-y-8">
        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Emergency</h3>
          </div>
          
          <div className="relative group">
            <button 
              onMouseDown={() => startSosTimer()}
              onMouseUp={() => cancelSosTimer()}
              onMouseLeave={() => cancelSosTimer()}
              onTouchStart={() => startSosTimer()}
              onTouchEnd={() => cancelSosTimer()}
              className={`w-full py-4 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden ${
                sosHolding ? 'bg-danger/20 text-danger' : 'bg-danger text-white shadow-lg shadow-danger/20 active:scale-[0.97]'
              }`}
            >
              <div 
                className="absolute left-0 top-0 h-full bg-danger transition-all ease-linear"
                style={{ width: `${sosProgress}%` }}
              />
              <span className="relative z-10 flex items-center justify-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M12 2L2 22h20L12 2zm1 14h-2v2h2v-2zm0-6h-2v4h2v-4z" />
                </svg>
                {sosHolding ? `Hold for ${Math.ceil((100 - sosProgress) / 33.3)}s` : 'Trigger SOS'}
              </span>
            </button>
          </div>
          <p className="mt-3 text-[9px] text-zinc-500 text-center font-bold uppercase tracking-wider leading-relaxed">
            <span className="text-danger">⚠️ Notice:</span> This is NOT a Personal Locator Beacon (PLB). SOS is broadcast over LoRa/BLE to nearby peers only.
          </p>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Settings</h3>
            <div className="flex gap-2">
              <select 
                value={i18n.language} 
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="bg-zinc-900 text-[10px] font-bold text-white border border-white/10 rounded px-1 py-0.5"
              >
                <option value="en">EN</option>
                <option value="fr">FR</option>
                <option value="es">ES</option>
                <option value="ar">AR</option>
              </select>
              <button 
                onClick={() => setUnits(units === 'metric' ? 'imperial' : 'metric')}
                className="bg-zinc-900 text-[10px] font-bold text-white border border-white/10 rounded px-2 py-0.5 uppercase"
              >
                {units === 'metric' ? t('units_metric') : t('units_imperial')}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Connectivity</h3>
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${bleConnected ? 'bg-secondary animate-pulse-glow' : 'bg-danger'}`} />
              <span className={`text-[10px] font-black uppercase tracking-wider ${bleConnected ? 'text-secondary' : 'text-danger'}`}>
                {bleConnected ? 'Active' : 'Offline'}
              </span>
            </div>
          </div>

          <div className="mb-6 px-1">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Inactivity Alert</h3>
              <span className="text-[10px] font-bold text-white">{inactivityTimeoutMs / 60000}m</span>
            </div>
            <input 
              type="range" 
              min="60000" 
              max="3600000" 
              step="60000"
              value={inactivityTimeoutMs}
              onChange={(e) => setInactivityTimeout(parseInt(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
            />
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
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Data & Privacy</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => LogicManager.exportData(peers)}
              className="py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-400 border border-white/5 transition-all"
            >
              {t('export_data')}
            </button>
            <button 
              onClick={() => LogicManager.deleteAccount()}
              className="py-2.5 rounded-xl bg-danger/10 hover:bg-danger/20 text-[10px] font-black uppercase tracking-widest text-danger border border-danger/20 transition-all"
            >
              {t('delete_account')}
            </button>
          </div>
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
    </>
  );
});
