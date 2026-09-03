import React, { useState } from 'react';
import { TerrainPanel } from './TerrainPanel';
import { SlopePanel } from './SlopePanel';
import { LosPanel } from './LosPanel';
import { RfPanel } from './RfPanel';
import { WeatherPanel } from './WeatherPanel';
import { SearchGridPanel } from './SearchGridPanel';
import { MeasurementPanel } from './MeasurementPanel';
import { Mountain, TrendingUp, Eye, Radio, Cloud, Grid, Ruler } from 'lucide-react';

export const GisPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'TERRAIN' | 'SLOPE' | 'LOS' | 'RF' | 'WEATHER' | 'SEARCH' | 'MEASURE'>('TERRAIN');

  return (
    <div className="h-full w-full overflow-y-auto p-3 sm:p-4 md:p-6 font-mono text-xs custom-scrollbar">
      <div className="max-w-7xl mx-auto flex flex-col space-y-3 sm:space-y-4">
        {/* Tab Navigation */}
        <div className="flex flex-wrap sm:flex-nowrap gap-1.5 bg-[#11171E] p-1.5 rounded-lg border border-[#2B3743]">
          {[
            { id: 'TERRAIN', label: 'ELEVATION PROFILE', icon: Mountain },
            { id: 'SLOPE', label: 'SLOPE & LZ', icon: TrendingUp },
            { id: 'LOS', label: 'LINE-OF-SIGHT', icon: Eye },
            { id: 'RF', label: 'RF MESH HEATMAP', icon: Radio },
            { id: 'WEATHER', label: 'METEOROLOGY', icon: Cloud },
            { id: 'SEARCH', label: 'SAR GRID', icon: Grid },
            { id: 'MEASURE', label: 'MEASURE', icon: Ruler },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-2 px-2 sm:px-3 rounded-md flex items-center justify-center space-x-1.5 sm:space-x-2 transition font-bold text-xs ${
                  isActive
                    ? 'bg-[#1B2530] border border-[#5B8FB9] text-[#E7EBEF] shadow-[0_0_10px_rgba(91,143,185,0.15)] ring-1 ring-[#5B8FB9]/50'
                    : 'text-[#707C88] hover:text-[#E7EBEF] hover:bg-[#151D26] border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#5B8FB9]' : 'text-[#707C88]'}`} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1">
          {activeTab === 'TERRAIN' && <TerrainPanel />}
          {activeTab === 'SLOPE' && <SlopePanel />}
          {activeTab === 'LOS' && <LosPanel />}
          {activeTab === 'RF' && <RfPanel />}
          {activeTab === 'WEATHER' && <WeatherPanel />}
          {activeTab === 'SEARCH' && <SearchGridPanel />}
          {activeTab === 'MEASURE' && <MeasurementPanel />}
        </div>
      </div>
    </div>
  );
};
