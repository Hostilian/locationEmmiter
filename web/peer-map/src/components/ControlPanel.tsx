import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

export const ControlPanel: React.FC = () => {
  const { bleConnected, setBleConnected, clearHistory } = useAppStore();
  const [hexInput, setHexInput] = useState('');

  const handleSimulate = () => {
    // In a real app, parse hex and add to store
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
        flags: Math.random() > 0.85 ? 1 : 2, // 1 = SOS
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
    <div className="absolute top-4 left-4 z-10 w-80 max-h-[90vh] overflow-y-auto bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-white shadow-2xl">
      <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Location Emitter</h2>
      
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">BLE Connection</span>
            <span className={`w-2 h-2 rounded-full ${bleConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`} />
          </div>
          <button 
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            onClick={() => setBleConnected(!bleConnected)}
          >
            {bleConnected ? 'Disconnect BLE' : 'Connect BLE'}
          </button>
        </div>

        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
          <h3 className="text-sm font-medium text-slate-300 mb-2">Manual Hex Input</h3>
          <textarea 
            className="w-full h-24 bg-black/40 border border-white/10 rounded-lg p-2 text-xs font-mono text-emerald-400 mb-2 focus:outline-none focus:border-indigo-500"
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value)}
            placeholder="Paste LEP hex here..."
          />
          <div className="flex gap-2">
            <button 
              className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
              onClick={handleSimulate}
            >
              Decode
            </button>
            <button 
              className="flex-1 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-sm transition-colors"
              onClick={handleMagicDemo}
            >
              ✨ Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
