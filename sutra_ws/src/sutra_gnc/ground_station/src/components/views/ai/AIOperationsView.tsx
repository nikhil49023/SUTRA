import React, { useState } from 'react';
import { 
  Brain, 
  ShieldAlert, 
  Sparkles, 
  MessageSquare, 
  TrendingUp, 
  Target, 
  Cpu, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Clock, 
  Battery, 
  Radio, 
  Layers 
} from 'lucide-react';

import { 
  DecisionEngine, 
  ThreatAssessmentEngine, 
  FailurePredictor, 
  MissionAssistant, 
  TargetTracker, 
  SensorFusionEngine, 
  MissionAnalyticsEngine, 
  AnomalyDetectorEngine 
} from '../../../ai';

import type { DroneAsset, TelemetryData, Waypoint, AIDetection } from '../../../types';
import type { AIRecommendation, ThreatItem, AIPredictions, TrackedTarget, FlightAnomaly } from '../../../ai/types';

interface AIOperationsViewProps {
  activeDrone: DroneAsset;
  telemetry: TelemetryData;
  waypoints: Waypoint[];
  aiDetections?: AIDetection[];
}

export const AIOperationsView: React.FC<AIOperationsViewProps> = ({
  activeDrone,
  telemetry,
  waypoints,
  aiDetections = []
}) => {
  const [activeTab, setActiveTab] = useState<'RECOMMENDATIONS' | 'THREATS' | 'PREDICTIONS' | 'ASSISTANT' | 'INSIGHTS' | 'ANOMALIES'>('RECOMMENDATIONS');
  const [chatPrompt, setChatPrompt] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<{ user: string; assistant: string; time: string }[]>([
    {
      user: 'Create a grid mission.',
      assistant: 'Generating autonomous Grid Search survey pattern centered at current drone coordinates.',
      time: '11:42:15'
    }
  ]);

  // Compute live AI Engine data
  const decision = DecisionEngine.evaluateAll(waypoints, aiDetections, activeDrone.battery);
  const predictions: AIPredictions = FailurePredictor.predictAll(waypoints, activeDrone.battery, activeDrone.signalStrength);
  const targets: TrackedTarget[] = TargetTracker.processDetections(aiDetections);
  const fusion = SensorFusionEngine.fuse(activeDrone, telemetry, aiDetections);
  const analytics = MissionAnalyticsEngine.computeAnalytics(waypoints, aiDetections);
  const anomalies: FlightAnomaly[] = AnomalyDetectorEngine.detectAnomalies(activeDrone, telemetry);

  const handleSendPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatPrompt.trim()) return;

    const result = MissionAssistant.processQuery(chatPrompt);
    setChatHistory((prev) => [
      ...prev,
      {
        user: chatPrompt,
        assistant: result.responseText,
        time: new Date().toLocaleTimeString()
      }
    ]);

    setChatPrompt('');
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#050811] text-slate-200 font-mono select-none overflow-hidden relative">
      {/* 1. TOP TITLE BAR */}
      <header className="h-12 bg-[#080d1a] border-b border-[#1b253b] px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 rounded bg-purple-500/20 border border-purple-400 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          </div>
          <span className="font-bold text-sm text-white tracking-wider">AI INTELLIGENCE & DECISION SUPPORT SYSTEM</span>
          <span className="text-xs px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold uppercase">
            COP CONFIDENCE: {fusion.overallConfidenceScore}%
          </span>
        </div>

        {/* SUB-PANEL SELECTORS */}
        <div className="flex items-center space-x-1 bg-[#050914] p-1 rounded-lg border border-[#1b253b] text-xs">
          {(
            [
              { id: 'RECOMMENDATIONS', label: 'Recommendations' },
              { id: 'THREATS', label: 'Threat Alerts' },
              { id: 'PREDICTIONS', label: 'Predictions' },
              { id: 'ASSISTANT', label: 'Command Assistant' },
              { id: 'INSIGHTS', label: 'AI Insights' },
              { id: 'ANOMALIES', label: 'Anomalies' }
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* 2. MAIN BODY CONTENT */}
      <div className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
        {/* TAB 1: RECOMMENDATIONS */}
        {activeTab === 'RECOMMENDATIONS' && (
          <div className="space-y-4">
            <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-sm tracking-wider uppercase">AI TACTICAL RECOMMENDATIONS ({decision.recommendations.length})</h3>
                <p className="text-xs text-slate-400">Contextual flight path, battery, and safety optimizations.</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold">
                AUTONOMOUS ADVISOR ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {decision.recommendations.map((rec) => (
                <div key={rec.id} className="bg-[#070d1a] border border-[#1b253b] hover:border-purple-500/80 p-4 rounded-xl space-y-2 group transition-all">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-purple-400 group-hover:text-purple-300">{rec.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                      {rec.confidencePercent}% CONFIDENCE
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{rec.summary}</p>
                  <div className="text-xs bg-[#0b1428] p-2 rounded border border-slate-800 text-cyan-300 font-bold flex items-center justify-between">
                    <span>Action: {rec.suggestedAction}</span>
                    <span className="text-purple-400 text-[10px] uppercase font-mono">Impact: +{rec.impactScore}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: THREAT ALERTS */}
        {activeTab === 'THREATS' && (
          <div className="space-y-4">
            <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-sm tracking-wider uppercase">THREAT ASSESSMENT MATRIX</h3>
                <p className="text-xs text-slate-400">Multi-factor evaluation of targets, geofence breaches, and signal hazards.</p>
              </div>
              <span className={`px-3 py-1 rounded text-xs font-bold border uppercase ${
                decision.threatAssessment.overallThreatLevel === 'CRITICAL'
                  ? 'bg-red-950 text-red-400 border-red-800'
                  : decision.threatAssessment.overallThreatLevel === 'HIGH'
                  ? 'bg-amber-950 text-amber-400 border-amber-800'
                  : 'bg-emerald-950 text-emerald-400 border-emerald-800'
              }`}>
                OVERALL THREAT: {decision.threatAssessment.overallThreatLevel} ({decision.threatAssessment.threatScore}/100)
              </span>
            </div>

            <div className="space-y-2">
              {decision.threatAssessment.threats.map((th) => (
                <div key={th.id} className="bg-[#070d1a] border border-[#1b253b] p-3.5 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${th.severity === 'HIGH' ? 'bg-red-400 animate-ping' : 'bg-amber-400'}`} />
                    <div>
                      <span className="font-bold text-white block">{th.title}</span>
                      <span className="text-slate-400 text-[11px]">{th.description}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                    th.severity === 'HIGH' ? 'bg-red-950 text-red-400 border-red-800' : 'bg-amber-950 text-amber-400 border-amber-800'
                  }`}>
                    {th.severity} ({th.score})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: PREDICTIONS */}
        {activeTab === 'PREDICTIONS' && (
          <div className="space-y-4">
            <h3 className="text-white font-bold text-sm tracking-wider uppercase">AI PREDICTIVE METRICS ENGINE</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl">
                <span className="text-xs text-slate-400 font-bold block">MISSION SUCCESS PROBABILITY</span>
                <span className="text-2xl font-bold text-emerald-400">{predictions.missionSuccessProbabilityPercent} <span className="text-xs">%</span></span>
              </div>
              <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl">
                <span className="text-xs text-slate-400 font-bold block">PREDICTED END BATTERY</span>
                <span className="text-2xl font-bold text-cyan-400">{predictions.predictedRemainingBatteryPercent} <span className="text-xs">%</span></span>
              </div>
              <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl">
                <span className="text-xs text-slate-400 font-bold block">COMMS LOSS PROBABILITY</span>
                <span className="text-2xl font-bold text-amber-400">{predictions.commsLossProbabilityPercent} <span className="text-xs">%</span></span>
              </div>
              <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl">
                <span className="text-xs text-slate-400 font-bold block">ESTIMATED ETA</span>
                <span className="text-xl font-bold text-white">{predictions.etaTimestamp}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: NATURAL LANGUAGE COMMAND ASSISTANT */}
        {activeTab === 'ASSISTANT' && (
          <div className="space-y-4 flex flex-col h-full">
            <div className="bg-[#070d1a] border border-[#1b253b] p-3 rounded-xl flex items-center justify-between">
              <span className="text-xs text-slate-300 font-bold uppercase">NATURAL-LANGUAGE MISSION COMMAND ASSISTANT</span>
              <span className="text-[10px] text-slate-400">Supported: "Create grid mission", "Return all drones", "Pause", "Land"</span>
            </div>

            {/* CHAT LOG STREAM */}
            <div className="bg-[#040710] border border-[#1b253b] rounded-xl p-4 space-y-3 min-h-[260px] max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className="space-y-1.5 text-xs">
                  <div className="flex justify-end">
                    <span className="bg-purple-950/80 text-purple-200 border border-purple-800/80 px-3 py-1.5 rounded-lg max-w-[70%]">
                      {msg.user}
                    </span>
                  </div>
                  <div className="flex justify-start">
                    <span className="bg-[#0b1428] text-slate-200 border border-slate-800 px-3 py-1.5 rounded-lg max-w-[80%] flex items-start space-x-2">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                      <span>{msg.assistant}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* PROMPT INPUT FORM */}
            <form onSubmit={handleSendPrompt} className="flex items-center space-x-2">
              <input
                type="text"
                value={chatPrompt}
                onChange={(e) => setChatPrompt(e.target.value)}
                placeholder="Enter command prompt e.g. 'Create a grid mission' or 'Return all drones'..."
                className="flex-1 bg-[#080d1a] border border-[#1b253b] focus:border-purple-500 rounded-lg px-3.5 py-2 text-xs text-white outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-purple-600/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>EXECUTE</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 5: AI INSIGHTS & ANALYTICS */}
        {activeTab === 'INSIGHTS' && (
          <div className="space-y-4">
            <h3 className="text-white font-bold text-sm tracking-wider uppercase">AI MISSION PERFORMANCE INSIGHTS</h3>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl space-y-1">
                <span className="text-slate-400 font-bold block">MISSION EFFICIENCY SCORE</span>
                <span className="text-2xl font-bold text-purple-400">{analytics.missionEfficiencyScore} / 100</span>
              </div>
              <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl space-y-1">
                <span className="text-slate-400 font-bold block">AREA COVERAGE PERCENT</span>
                <span className="text-2xl font-bold text-cyan-400">{analytics.areaCoveragePercent}%</span>
              </div>
              <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl space-y-1">
                <span className="text-slate-400 font-bold block">OPERATOR WORKLOAD INDEX</span>
                <span className="text-2xl font-bold text-emerald-400">{analytics.operatorWorkloadIndex}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: ANOMALIES */}
        {activeTab === 'ANOMALIES' && (
          <div className="space-y-4">
            <h3 className="text-white font-bold text-sm tracking-wider uppercase">FLIGHT BEHAVIOR ANOMALY DETECTOR ({anomalies.length})</h3>
            <div className="space-y-2">
              {anomalies.length > 0 ? (
                anomalies.map((anom) => (
                  <div key={anom.id} className="bg-[#070d1a] border border-red-900/60 p-3.5 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <span className="text-slate-200 font-bold">{anom.message}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 text-[10px] font-bold">{anom.severity}</span>
                  </div>
                ))
              ) : (
                <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl text-xs text-slate-400">
                  No anomalous flight behaviors detected. Flight parameters operating within nominal safety thresholds.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
