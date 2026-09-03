import React from 'react';
import { MissionAdvisor } from './MissionAdvisor';
import { ThreatPanel } from './ThreatPanel';
import { PredictionPanel } from './PredictionPanel';
import { Assistant } from './Assistant';

export const AiPanel: React.FC = () => {
  return (
    <div className="h-full w-full overflow-y-auto p-3 sm:p-4 md:p-6 custom-scrollbar">
      <div className="max-w-7xl mx-auto flex flex-col space-y-3 sm:space-y-4">
        {/* Main 12-Col Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
          {/* Left Column: Advisories & Predictions (6 cols) */}
          <div className="lg:col-span-6 space-y-3 sm:space-y-4">
            <MissionAdvisor />
            <PredictionPanel />
          </div>

          {/* Right Column: Threats / SAR Targets & NLP Assistant (6 cols) */}
          <div className="lg:col-span-6 space-y-3 sm:space-y-4">
            <ThreatPanel />
            <Assistant />
          </div>
        </div>
      </div>
    </div>
  );
};
