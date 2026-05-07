import React from 'react';
import { MapLayer } from './components/MapLayer';
import { ControlPanel } from './components/ControlPanel';
import { DeviceList } from './components/DeviceList';

export const App: React.FC = () => {
  return (
    <div className="relative w-full h-screen bg-[#09090b] overflow-hidden text-slate-100 font-sans">
      <MapLayer />
      <ControlPanel />
      <DeviceList />
    </div>
  );
};
