import React, { useState } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { DeviceList } from './components/DeviceList';
import { MapLayer } from './components/MapLayer';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'map' | 'controls' | 'peers'>('map');

  return (
    <div className="relative w-full h-screen bg-surface overflow-hidden text-zinc-100 font-sans selection:bg-primary/30 selection:text-white">
      <MapLayer />
      
      {/* Desktop UI */}
      <div className="hidden md:block">
        <ControlPanel />
        <DeviceList />
      </div>

      {/* Mobile Interface Overlay */}
      <div className="md:hidden">
        {activeTab === 'controls' && (
          <div className="fixed inset-0 z-50 bg-[#050505]/95 backdrop-blur-2xl p-6 pt-20 animate-fade-in-up">
            <ControlPanel />
            <button 
              onClick={() => setActiveTab('map')}
              className="fixed top-6 right-6 w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 active:scale-90 transition-transform"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-zinc-400 fill-none stroke-current stroke-[2.5]" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        {activeTab === 'peers' && (
          <div className="fixed inset-0 z-50 bg-[#050505]/95 backdrop-blur-2xl p-6 pt-20 animate-fade-in-up">
            <DeviceList />
            <button 
              onClick={() => setActiveTab('map')}
              className="fixed top-6 right-6 w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 active:scale-90 transition-transform"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-zinc-400 fill-none stroke-current stroke-[2.5]" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Tactical Mobile Navigation Bar */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 p-2.5 bg-[#111]/80 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          <button 
            aria-label="View Map"
            onClick={() => setActiveTab('map')}
            className={`p-4 rounded-2xl transition-all duration-300 ${activeTab === 'map' ? 'bg-primary text-white shadow-[0_0_20px_rgba(124,58,237,0.4)] scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-2" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
          </button>
          <div className="w-px h-6 bg-white/10 mx-1"></div>
          <button
            aria-label="View Active Peers"
            onClick={() => setActiveTab('peers')}
            className={`p-4 rounded-2xl transition-all duration-300 ${activeTab === 'peers' ? 'bg-primary text-white shadow-[0_0_20px_rgba(124,58,237,0.4)] scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-2" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          </button>
          <button 
            aria-label="View Controls"
            onClick={() => setActiveTab('controls')}
            className={`p-4 rounded-2xl transition-all duration-300 ${activeTab === 'controls' ? 'bg-primary text-white shadow-[0_0_20px_rgba(124,58,237,0.4)] scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-2" aria-hidden="true">
              <path d="M12 20v-8m0 0V4m0 8h8m-8 0H4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
