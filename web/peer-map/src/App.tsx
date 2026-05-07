import React, { useState } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { DeviceList } from './components/DeviceList';
import { MapLayer } from './components/MapLayer';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'map' | 'controls' | 'peers'>('map');

  return (
    <div className="relative w-full h-screen bg-surface overflow-hidden text-slate-100 font-sans">
      <MapLayer />
      
      {/* Desktop Layout */}
      <div className="hidden md:block">
        <ControlPanel />
        <DeviceList />
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        {activeTab === 'controls' && (
          <div className="fixed inset-0 z-50 bg-surface/90 backdrop-blur-md p-4 pt-16 animate-fade-in-up">
            <ControlPanel />
            <button 
              onClick={() => setActiveTab('map')}
              className="fixed top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        {activeTab === 'peers' && (
          <div className="fixed inset-0 z-50 bg-surface/90 backdrop-blur-md p-4 pt-16 animate-fade-in-up">
            <DeviceList />
            <button 
              onClick={() => setActiveTab('map')}
              className="fixed top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Mobile Navigation Bar */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 p-2 glass-panel rounded-full border-white/20">
          <button 
            aria-label="View Map"
            onClick={() => setActiveTab('map')}
            className={`p-3 rounded-full transition-all ${activeTab === 'map' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:bg-white/5'}`}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-2" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
          </button>
          <button 
            aria-label="View Active Peers"
            onClick={() => setActiveTab('peers')}
            className={`p-3 rounded-full transition-all ${activeTab === 'peers' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:bg-white/5'}`}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-2" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </button>
          <button 
            aria-label="View Controls"
            onClick={() => setActiveTab('controls')}
            className={`p-3 rounded-full transition-all ${activeTab === 'controls' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:bg-white/5'}`}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-2" aria-hidden="true">
              <path d="M12 20v-8m0 0V4m0 8h8m-8 0H4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
