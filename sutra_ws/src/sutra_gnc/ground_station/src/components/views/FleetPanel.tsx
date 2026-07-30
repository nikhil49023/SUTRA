import React, { useState } from 'react';
import { 
  Search, 
  Battery, 
  Wifi, 
  Navigation, 
  X
} from 'lucide-react';
import type { DroneAsset } from '../../types';

interface FleetPanelProps {
  drones: DroneAsset[];
  activeDrone: DroneAsset;
  onSelectDrone: (drone: DroneAsset) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const FleetPanel: React.FC<FleetPanelProps> = ({
  drones,
  activeDrone,
  onSelectDrone,
  isOpen,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_FLIGHT' | 'STANDBY' | 'RTH'>('ALL');
  const [selectedDroneDrawer, setSelectedDroneDrawer] = useState<DroneAsset | null>(null);

  const filteredDrones = drones.filter((d) => {
    const matchesSearch = d.callsign.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          d.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = statusFilter === 'ALL' || d.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  if (!isOpen) return null;

  return (
    <div className="absolute left-16 top-13 bottom-0 w-80 bg-[#0a0e17]/95 backdrop-blur-md border-r border-[#1a2336] z-20 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
      {/* Header */}
      <div className="p-3 border-b border-[#1a2336] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Navigation className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Fleet Control ({drones.length})</h3>
        </div>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-[#151d2d]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search & Filters */}
      <div className="p-3 border-b border-[#1a2336] space-y-2 bg-[#080c14]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search callsign or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#101726] border border-[#1e293b] rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        <div className="flex items-center space-x-1 text-[10px]">
          {(['ALL', 'IN_FLIGHT', 'STANDBY', 'RTH'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`flex-1 py-1 rounded font-mono uppercase transition-colors ${
                statusFilter === st
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'bg-[#101726] text-slate-400 border border-[#1e293b] hover:text-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Compact Drone List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredDrones.map((drone) => {
          const isSelected = activeDrone.id === drone.id;
          return (
            <div
              key={drone.id}
              onClick={() => {
                onSelectDrone(drone);
                setSelectedDroneDrawer(drone);
              }}
              className={`p-2.5 rounded border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-cyan-500/10 border-cyan-500/50 shadow-md'
                  : 'bg-[#0d1320] border-[#1a2336] hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${
                    drone.status === 'IN_FLIGHT' ? 'bg-emerald-400 animate-pulse' :
                    drone.status === 'RTH' ? 'bg-amber-400 animate-pulse' : 'bg-slate-400'
                  }`}></span>
                  <span className="font-bold font-mono text-slate-200 text-xs">{drone.callsign}</span>
                  <span className="text-[10px] text-slate-500 font-mono">({drone.id})</span>
                </div>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                  drone.status === 'IN_FLIGHT' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                  drone.status === 'RTH' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                  'bg-slate-500/10 border-slate-500/30 text-slate-400'
                }`}>
                  {drone.status}
                </span>
              </div>

              {/* Stats Summary Grid */}
              <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-slate-400 bg-[#080c14] p-1.5 rounded">
                <div className="flex items-center space-x-1">
                  <Battery className="w-3 h-3 text-emerald-400" />
                  <span className="text-slate-200 font-semibold">{drone.battery}%</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Navigation className="w-3 h-3 text-cyan-400" />
                  <span>{drone.altitude}m</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Wifi className="w-3 h-3 text-amber-400" />
                  <span>{drone.signalStrength}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Drone Drawer (Opened on click) */}
      {selectedDroneDrawer && (
        <div className="p-3 border-t border-[#1a2336] bg-[#070b12] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-cyan-400 font-bold">DRAWER: {selectedDroneDrawer.callsign}</span>
            <button 
              onClick={() => setSelectedDroneDrawer(null)}
              className="text-slate-400 hover:text-slate-200 text-[10px]"
            >
              Close Drawer
            </button>
          </div>
          <div className="text-[11px] text-slate-300 font-mono space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Payload:</span>
              <span>{selectedDroneDrawer.payload}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Flight Time:</span>
              <span className="text-emerald-400">{selectedDroneDrawer.flightTime}</span>
            </div>
          </div>
          <div className="flex space-x-2 pt-1">
            <button className="flex-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 py-1 rounded font-mono text-[10px]">
              MANUAL OVERRIDE
            </button>
            <button className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 py-1 rounded font-mono text-[10px]">
              TRIGGER RTH
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
