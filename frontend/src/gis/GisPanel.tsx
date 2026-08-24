import React, { useState } from 'react';
import { TerrainPanel } from './TerrainPanel';
import { LosPanel } from './LosPanel';
import { RfPanel } from './RfPanel';
import { WeatherPanel } from './WeatherPanel';
import { MeasurementPanel } from './MeasurementPanel';
import { Mountain, Eye, Radio, Cloud, Ruler } from 'lucide-react';

export const GisPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'TERRAIN' | 'LOS' | 'RF' | 'WEATHER' | 'MEASURE'>('TERRAIN');

  return (
    <div className="h-full flex flex-col space-y-3 p-3 overflow-y-auto font-mono text-xs">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
        {[
          { id: 'TERRAIN', label: 'ELEVATION', icon: Mountain },
          { id: 'LOS', label: 'LOS RAY', icon: Eye },
          { id: 'RF', label: 'RF MESH', icon: Radio },
          { id: 'WEATHER', label: 'WEATHER', icon: Cloud },
          { id: 'MEASURE', label: 'MEASURE', icon: Ruler },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-1.5 rounded flex items-center justify-center space-x-1.5 transition font-bold ${
                isActive
                  ? 'bg-cyan-950 border border-cyan-500/50 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 space-y-3">
        {activeTab === 'TERRAIN' && <TerrainPanel />}
        {activeTab === 'LOS' && <LosPanel />}
        {activeTab === 'RF' && <RfPanel />}
        {activeTab === 'WEATHER' && <WeatherPanel />}
        {activeTab === 'MEASURE' && <MeasurementPanel />}
      </div>
    </div>
  );
};
