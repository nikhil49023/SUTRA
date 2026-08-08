import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Activity, 
  Battery, 
  Navigation, 
  Layers, 
  Sliders, 
  FileText, 
  Clock, 
  Zap, 
  Radio, 
  Compass, 
  Flame, 
  Check, 
  Plus, 
  Trash2,
  Cpu,
  ArrowRight
} from 'lucide-react';

import { 
  missionEngine, 
  missionExecutionEngine, 
  missionStateMachine, 
  missionTimeline,
  MissionTemplateManager,
  RiskEngine,
  BatteryEstimator,
  MissionValidator
} from '../../engine';

import type { Waypoint, DroneAsset, TelemetryData } from '../../types';
import type { 
  MissionState, 
  PreflightReport, 
  TimelineEvent, 
  MissionTemplate,
  TemplatePatternType 
} from '../../engine/types';

interface MissionPlannerViewProps {
  activeDrone: DroneAsset;
  telemetry: TelemetryData;
  waypoints: Waypoint[];
  onUpdateWaypoints: (wps: Waypoint[]) => void;
}

export const MissionPlannerView: React.FC<MissionPlannerViewProps> = ({
  activeDrone,
  telemetry,
  waypoints,
  onUpdateWaypoints
}) => {
  const [activeTab, setActiveTab] = useState<'PLANNING' | 'EXECUTION' | 'VALIDATION' | 'TEMPLATES' | 'REPORTS' | 'TIMELINE'>('PLANNING');
  const [currentState, setCurrentState] = useState<MissionState>(missionStateMachine.getState());
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>(missionTimeline.getEvents());
  const [preflightReport, setPreflightReport] = useState<PreflightReport | null>(missionEngine.getLastPreflightReport());
  const [selectedTemplate, setSelectedTemplate] = useState<MissionTemplate | null>(null);

  // Subscribe to state machine and timeline updates
  useEffect(() => {
    const unsubState = missionStateMachine.subscribe((newState) => {
      setCurrentState(newState);
    });

    const unsubTimeline = missionTimeline.subscribe(() => {
      setTimelineEvents(missionTimeline.getEvents());
    });

    return () => {
      unsubState();
      unsubTimeline();
    };
  }, []);

  // Run initial preflight pipeline
  const handleRunPreparation = () => {
    const report = missionEngine.prepareMission("Tactical Alpha Ops", waypoints);
    setPreflightReport(report);
  };

  // Load Template Pattern
  const handleSelectTemplate = (template: MissionTemplate) => {
    setSelectedTemplate(template);
    const newWps = MissionTemplateManager.generateCustomPattern(
      template.patternType,
      activeDrone.lat,
      activeDrone.lng,
      template.defaultAltitudeM
    );
    onUpdateWaypoints(newWps);
    const report = missionEngine.prepareMission(template.name, newWps);
    setPreflightReport(report);
  };

  // Dispatch Execution Commands
  const handleStartMission = () => {
    missionExecutionEngine.startMission(activeDrone, waypoints);
  };

  const handlePauseMission = () => {
    missionExecutionEngine.pauseMission();
  };

  const handleResumeMission = () => {
    missionExecutionEngine.resumeMission();
  };

  const handleRTL = () => {
    missionExecutionEngine.returnToHome(activeDrone);
  };

  const handleLand = () => {
    missionExecutionEngine.land(activeDrone);
  };

  const handleAbort = () => {
    missionExecutionEngine.abortMission(activeDrone);
  };

  const handleReset = () => {
    missionExecutionEngine.reset();
    setPreflightReport(null);
  };

  const templates = MissionTemplateManager.getTemplates();
  const batteryReport = BatteryEstimator.calculate(waypoints);
  const validation = MissionValidator.validate(waypoints);
  const risk = RiskEngine.evaluateRisk(waypoints);

  return (
    <div className="flex flex-col h-full w-full bg-[#050811] text-slate-200 font-mono select-none overflow-hidden relative">
      {/* 1. TOP MODULE NAVIGATION BAR */}
      <header className="h-12 bg-[#080d1a] border-b border-[#1b253b] px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 rounded bg-cyan-500/20 border border-cyan-400 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <span className="font-bold text-sm text-white tracking-wider">MISSION ORCHESTRATOR ENGINE</span>
          <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold uppercase">
            STATE: {currentState}
          </span>
        </div>

        {/* SUB-TAB SELECTORS */}
        <div className="flex items-center space-x-1 bg-[#050914] p-1 rounded-lg border border-[#1b253b] text-xs">
          {(
            [
              { id: 'PLANNING', label: 'Mission Planning' },
              { id: 'EXECUTION', label: 'Mission Execution' },
              { id: 'VALIDATION', label: 'Validation' },
              { id: 'TEMPLATES', label: 'Templates' },
              { id: 'REPORTS', label: 'Reports' },
              { id: 'TIMELINE', label: 'Timeline' }
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* 2. MAIN BODY CONTENT AREA */}
      <div className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
        {/* TAB 1: MISSION PLANNING */}
        {activeTab === 'PLANNING' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-[#080e1e] p-4 rounded-xl border border-[#1b253b]">
              <div>
                <h2 className="text-white font-bold text-sm tracking-wider uppercase">FLIGHT ROUTE PLANNER</h2>
                <p className="text-xs text-slate-400">Configure waypoints, altitude envelopes, and cruise speeds.</p>
              </div>
              <button
                onClick={handleRunPreparation}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 flex items-center space-x-2 transition-all"
              >
                <Activity className="w-4 h-4 animate-spin" />
                <span>RUN MISSION PIPELINE</span>
              </button>
            </div>

            {/* WAYPOINT TABLE & STATS GRID */}
            <div className="grid grid-cols-3 gap-4">
              {/* COL 1 & 2: WAYPOINT TABLE */}
              <div className="col-span-2 bg-[#070d1a] border border-[#1b253b] rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-slate-300 uppercase">WAYPOINTS ({waypoints.length})</span>
                  <button
                    onClick={() => {
                      const newWp: Waypoint = {
                        id: waypoints.length + 1,
                        lat: activeDrone.lat + (Math.random() - 0.5) * 0.005,
                        lng: activeDrone.lng + (Math.random() - 0.5) * 0.005,
                        alt: 100,
                        action: 'WAYPOINT',
                        completed: false
                      };
                      onUpdateWaypoints([...waypoints, newWp]);
                    }}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ADD WAYPOINT</span>
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
                  {waypoints.map((wp, idx) => (
                    <div
                      key={wp.id}
                      className="flex items-center justify-between bg-[#0a1224] border border-slate-800/80 p-2 rounded text-xs hover:border-cyan-500/50"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="text-slate-300 font-mono">
                          {wp.lat.toFixed(5)} N, {wp.lng.toFixed(5)} E
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-emerald-400 font-bold">{wp.alt}m AGL</span>
                        <button
                          onClick={() => {
                            const updated = waypoints.filter((w) => w.id !== wp.id);
                            onUpdateWaypoints(updated);
                          }}
                          className="p-1 rounded bg-red-950/40 text-red-400 hover:bg-red-900 hover:text-white"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* COL 3: BATTERY & RISK OVERVIEW */}
              <div className="space-y-4">
                <div className="bg-[#070d1a] border border-[#1b253b] rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-300 uppercase flex items-center space-x-1.5">
                      <Battery className="w-4 h-4 text-emerald-400" />
                      <span>BATTERY ESTIMATOR</span>
                    </span>
                    <span className="text-emerald-400 font-bold text-xs">{batteryReport.missionBatteryPercent}% REQ</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>RTL Reserve:</span>
                      <span className="text-slate-200 font-bold">{batteryReport.rtlReservePercent}%</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Emergency Buffer:</span>
                      <span className="text-slate-200 font-bold">{batteryReport.emergencyReservePercent}%</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Est. Flight Duration:</span>
                      <span className="text-cyan-400 font-bold">{batteryReport.estimatedFlightTimeMin} min</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#070d1a] border border-[#1b253b] rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-300 uppercase flex items-center space-x-1.5">
                      <Shield className="w-4 h-4 text-cyan-400" />
                      <span>RISK EVALUATION</span>
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded border uppercase ${
                        risk.overallRisk === 'CRITICAL'
                          ? 'bg-red-950 text-red-400 border-red-800'
                          : risk.overallRisk === 'HIGH'
                          ? 'bg-amber-950 text-amber-400 border-amber-800'
                          : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      }`}
                    >
                      {risk.overallRisk}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">{risk.recommendations[0]}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MISSION EXECUTION */}
        {activeTab === 'EXECUTION' && (
          <div className="space-y-4">
            <div className="bg-[#070d1a] border border-[#1b253b] rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-bold uppercase">CURRENT FLIGHT STATE</span>
                <span className="text-2xl font-bold text-cyan-400 tracking-wider">{currentState}</span>
              </div>

              {/* COMMAND CONTROLS */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleStartMission}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>START MISSION</span>
                </button>

                <button
                  onClick={handlePauseMission}
                  className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs flex items-center space-x-1"
                >
                  <Pause className="w-4 h-4 fill-current" />
                  <span>PAUSE</span>
                </button>

                <button
                  onClick={handleResumeMission}
                  className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
                >
                  RESUME
                </button>

                <button
                  onClick={handleRTL}
                  className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  RTL
                </button>

                <button
                  onClick={handleLand}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                >
                  LAND
                </button>

                <button
                  onClick={handleAbort}
                  className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
                >
                  ABORT
                </button>

                <button
                  onClick={handleReset}
                  className="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
                  title="Reset Engine"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* LIVE TELEMETRY GAUGES GRID */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-[#070d1a] border border-[#1b253b] p-3.5 rounded-xl">
                <span className="text-xs text-slate-400 font-bold block">ALTITUDE (AGL)</span>
                <span className="text-2xl font-bold text-white">{telemetry.altitudeAGL || 0} <span className="text-xs">m</span></span>
              </div>
              <div className="bg-[#070d1a] border border-[#1b253b] p-3.5 rounded-xl">
                <span className="text-xs text-slate-400 font-bold block">GROUND SPEED</span>
                <span className="text-2xl font-bold text-cyan-400">{telemetry.groundSpeed || 0} <span className="text-xs">km/h</span></span>
              </div>
              <div className="bg-[#070d1a] border border-[#1b253b] p-3.5 rounded-xl">
                <span className="text-xs text-slate-400 font-bold block">BATTERY REMAINING</span>
                <span className="text-2xl font-bold text-emerald-400">{activeDrone.battery || 100} <span className="text-xs">%</span></span>
              </div>
              <div className="bg-[#070d1a] border border-[#1b253b] p-3.5 rounded-xl">
                <span className="text-xs text-slate-400 font-bold block">PITCH / ROLL</span>
                <span className="text-2xl font-bold text-slate-200">{(telemetry.pitch || 0).toFixed(1)}° / {(telemetry.roll || 0).toFixed(1)}°</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: VALIDATION */}
        {activeTab === 'VALIDATION' && (
          <div className="space-y-4">
            <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-sm tracking-wider uppercase">PREFLIGHT VALIDATION MATRIX</h3>
                <p className="text-xs text-slate-400">Comprehensive safety checks for waypoints, geofence, and battery limits.</p>
              </div>
              <span className={`px-3 py-1 rounded text-xs font-bold ${validation.isValid ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'}`}>
                {validation.isValid ? 'VALIDATED FOR FLIGHT' : 'VALIDATION ISSUES DETECTED'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase block border-b border-slate-800 pb-2">CHECKLIST SUMMARY</span>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span>Waypoint Count Check:</span>
                    {validation.waypointCountValid ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Altitude Range Check:</span>
                    {validation.maxAltitudeValid ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                  </div>
                  <div className="flex justify-between items-center">
                    <span>No-Fly Geofence Breaches:</span>
                    <span className="font-bold text-slate-200">{validation.geofenceViolationCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Battery Sufficiency:</span>
                    {validation.batterySufficiency ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                  </div>
                </div>
              </div>

              <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase block border-b border-slate-800 pb-2">DETECTED ISSUES ({validation.issues.length})</span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
                  {validation.issues.map((issue) => (
                    <div key={issue.id} className="p-2 rounded bg-[#0b1428] border border-slate-800 text-xs flex items-center justify-between">
                      <span className="text-slate-300">{issue.message}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${issue.severity === 'ERROR' ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'}`}>
                        {issue.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TEMPLATES */}
        {activeTab === 'TEMPLATES' && (
          <div className="space-y-4">
            <h3 className="text-white font-bold text-sm tracking-wider uppercase">AUTOPILOT PATTERN TEMPLATES</h3>
            <div className="grid grid-cols-3 gap-4">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => handleSelectTemplate(tpl)}
                  className="bg-[#070d1a] border border-[#1b253b] hover:border-cyan-500 p-4 rounded-xl cursor-pointer transition-all space-y-2 group"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-cyan-400 group-hover:text-cyan-300">{tpl.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">{tpl.patternType}</span>
                  </div>
                  <p className="text-xs text-slate-400">{tpl.description}</p>
                  <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/80 flex justify-between">
                    <span>Default Alt: {tpl.defaultAltitudeM}m</span>
                    <span>Speed: {tpl.defaultSpeedKmh} km/h</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: REPORTS */}
        {activeTab === 'REPORTS' && (
          <div className="space-y-4">
            <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl">
              <h3 className="text-white font-bold text-sm tracking-wider uppercase mb-2">PREFLIGHT REPORT SUMMARY</h3>
              {preflightReport ? (
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div className="bg-[#0a1224] p-3 rounded border border-slate-800">
                    <span className="text-slate-400 block font-bold">APPROVAL STATUS</span>
                    <span className={`text-sm font-bold ${preflightReport.isApprovedForTakeoff ? 'text-emerald-400' : 'text-red-400'}`}>
                      {preflightReport.isApprovedForTakeoff ? 'APPROVED FOR TAKEOFF' : 'APPROVAL REJECTED'}
                    </span>
                  </div>
                  <div className="bg-[#0a1224] p-3 rounded border border-slate-800">
                    <span className="text-slate-400 block font-bold">REQUIRED ENERGY</span>
                    <span className="text-sm font-bold text-cyan-400">{preflightReport.batteryAnalysis.totalEnergyRequiredWh} Wh</span>
                  </div>
                  <div className="bg-[#0a1224] p-3 rounded border border-slate-800">
                    <span className="text-slate-400 block font-bold">ESTIMATED DURATION</span>
                    <span className="text-sm font-bold text-slate-200">{preflightReport.batteryAnalysis.estimatedFlightTimeMin} Minutes</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">No report generated. Click "Run Mission Pipeline" in Planning tab.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: TIMELINE */}
        {activeTab === 'TIMELINE' && (
          <div className="space-y-4">
            <h3 className="text-white font-bold text-sm tracking-wider uppercase">REAL-TIME MISSION EVENT STREAM</h3>
            <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl space-y-2 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
              {timelineEvents.map((evt) => (
                <div key={evt.id} className="flex items-center justify-between bg-[#0a1224] border border-slate-800 p-2.5 rounded text-xs">
                  <div className="flex items-center space-x-3">
                    <span className="text-slate-500 font-mono text-[10px]">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold text-[10px]">{evt.state}</span>
                    <span className="text-slate-200 font-medium">{evt.message}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono">{evt.category}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
