import React from 'react';
import { MissionAdvisor } from './MissionAdvisor';
import { ThreatPanel } from './ThreatPanel';
import { PredictionPanel } from './PredictionPanel';
import { Assistant } from './Assistant';

export const AiPanel: React.FC = () => {
  return (
    <div className="h-full flex flex-col space-y-3 p-3 overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
        <div className="space-y-3">
          <MissionAdvisor />
          <PredictionPanel />
        </div>
        <div className="space-y-3">
          <ThreatPanel />
          <Assistant />
        </div>
      </div>
    </div>
  );
};
