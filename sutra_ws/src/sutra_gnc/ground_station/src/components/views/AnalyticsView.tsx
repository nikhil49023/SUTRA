import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Battery, 
  Wifi, 
  Clock, 
  Download, 
  Play, 
  Pause, 
  RotateCcw, 
  Layers, 
  Sliders, 
  FileText, 
  Search, 
  ShieldCheck, 
  Cpu, 
  CheckCircle2, 
  Activity,
  ArrowRightLeft
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { useAnalyticsStore } from '../../services/analyticsStore';

export const AnalyticsView: React.FC = () => {
  const {
    logs,
    selectedLog,
    setSelectedLog,
    comparisonLog,
    setComparisonLog,
    replayIndex,
    setReplayIndex,
    isReplaying,
    setIsReplaying,
    aggregatedMetrics,
    batteryData,
    signalData,
    utilizationStats,
    handleExportCSV
  } = useAnalyticsStore();

  const [activeTab, setActiveTab] = useState<'FLIGHT_LOGS' | 'BATTERY_SIGNAL' | 'UTILIZATION' | 'REPLAY'>('FLIGHT_LOGS');

  const COLORS = ['#00f0ff', '#00e676', '#ffb700', '#ff3b30'];

  const detectionStatsPie = [
    { name: 'Armored Vehicles', value: 42 },
    { name: 'Personnel', value: 28 },
    { name: 'Radar Systems', value: 18 },
    { name: 'Other', value: 12 }
  ];

  return (
    <div className="flex-1 h-full bg-[#070a11] hud-grid flex flex-col overflow-y-auto p-3 space-y-3 z-10 text-xs font-mono select-none">
      {/* TOP HEADER BAR & AGGREGATED SUMMARY METRICS */}
      <div className="bg-[#0a0f1c] border border-[#1a2336] p-3 rounded shadow-md flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-100 uppercase text-xs flex items-center gap-2">
              <span>FLIGHT ANALYTICS & MISSION INTELLIGENCE ENGINE</span>
              <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] px-1.5 py-0.5 rounded font-mono">
                PostgreSQL & TimescaleDB Ready
              </span>
            </div>
            <div className="text-[10px] text-slate-400">FLEET PERFORMANCE, BATTERY DEGRADATION, SIGNAL METRICS & REPLAY</div>
          </div>
        </div>

        {/* TOP TAB NAVIGATION & CSV EXPORT BUTTON */}
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1 bg-[#090d16] border border-[#1a2336] p-1 rounded">
            {(['FLIGHT_LOGS', 'BATTERY_SIGNAL', 'UTILIZATION', 'REPLAY'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                  activeTab === tab
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.replace('_', ' ')}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1 px-3 py-1.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 font-bold text-[10px] uppercase"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT CSV</span>
          </button>
        </div>
      </div>

      {/* SUMMARY STATS GRID */}
      <div className="grid grid-cols-5 gap-3">
        <div className="bg-[#0a0f1c] border border-[#1a2336] p-2.5 rounded">
          <span className="text-slate-500 text-[9px] block">TOTAL MISSIONS</span>
          <span className="text-cyan-400 font-bold text-lg">{aggregatedMetrics.totalMissions}</span>
        </div>
        <div className="bg-[#0a0f1c] border border-[#1a2336] p-2.5 rounded">
          <span className="text-slate-500 text-[9px] block">MISSION SUCCESS RATE</span>
          <span className="text-emerald-400 font-bold text-lg">{aggregatedMetrics.successRate}%</span>
        </div>
        <div className="bg-[#0a0f1c] border border-[#1a2336] p-2.5 rounded">
          <span className="text-slate-500 text-[9px] block">TOTAL DISTANCE FLOWN</span>
          <span className="text-amber-400 font-bold text-lg">{aggregatedMetrics.totalDistanceKm} KM</span>
        </div>
        <div className="bg-[#0a0f1c] border border-[#1a2336] p-2.5 rounded">
          <span className="text-slate-500 text-[9px] block">TOTAL FLIGHT HOURS</span>
          <span className="text-slate-200 font-bold text-lg">{aggregatedMetrics.totalFlightHours} HRS</span>
        </div>
        <div className="bg-[#0a0f1c] border border-[#1a2336] p-2.5 rounded">
          <span className="text-slate-500 text-[9px] block">AI TARGET DETECTIONS</span>
          <span className="text-rose-400 font-bold text-lg">{aggregatedMetrics.totalDetections} TARGETS</span>
        </div>
      </div>

      {/* MAIN TAB CONTENT */}

      {/* TAB 1: FLIGHT LOGS & MISSION COMPARISON */}
      {activeTab === 'FLIGHT_LOGS' && (
        <div className="grid grid-cols-12 gap-3 flex-1">
          {/* LOGS TABLE (7 COLS) */}
          <div className="col-span-7 bg-[#0a0f1c] border border-[#1a2336] p-3 rounded flex flex-col space-y-2">
            <div className="flex items-center justify-between border-b border-[#1a2336] pb-2">
              <h3 className="font-bold uppercase text-slate-200 text-xs">FLIGHT HISTORY & LOG ARCHIVE</h3>
              <span className="text-slate-500 text-[10px]">CLICK ROW TO SELECT FOR COMPARISON</span>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="border-b border-[#1a2336] text-slate-400 bg-[#080c14]">
                    <th className="p-2">LOG ID</th>
                    <th className="p-2">MISSION</th>
                    <th className="p-2">CALLSIGN</th>
                    <th className="p-2">OPERATOR</th>
                    <th className="p-2">DURATION</th>
                    <th className="p-2">DISTANCE</th>
                    <th className="p-2">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2336]/40">
                  {logs.map((log) => {
                    const isSelected = selectedLog.id === log.id;
                    return (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-cyan-500/10 font-bold text-cyan-300' : 'hover:bg-[#0e1624] text-slate-300'
                        }`}
                      >
                        <td className="p-2 font-mono text-cyan-400">{log.id}</td>
                        <td className="p-2">{log.missionName}</td>
                        <td className="p-2 text-slate-200">{log.droneCallsign}</td>
                        <td className="p-2 text-slate-400">{log.operator}</td>
                        <td className="p-2">{log.durationMinutes} min</td>
                        <td className="p-2">{log.distanceKm} km</td>
                        <td className="p-2">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                            log.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* MISSION COMPARISON PANEL (5 COLS) */}
          <div className="col-span-5 bg-[#0a0f1c] border border-[#1a2336] p-3 rounded flex flex-col space-y-2">
            <div className="flex items-center justify-between border-b border-[#1a2336] pb-2">
              <div className="flex items-center space-x-2">
                <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold uppercase text-slate-200 text-xs">MISSION COMPARISON</h3>
              </div>
              <span className="text-[10px] text-cyan-400 font-bold">{selectedLog.id} vs {comparisonLog?.id || 'None'}</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="grid grid-cols-3 gap-2 bg-[#080d16] p-2 rounded border border-[#1a2336]">
                <div className="text-slate-400 text-[10px]">METRIC</div>
                <div className="text-cyan-400 font-bold text-[10px]">{selectedLog.droneCallsign}</div>
                <div className="text-emerald-400 font-bold text-[10px]">{comparisonLog?.droneCallsign}</div>

                <div className="text-slate-400">Flight Time:</div>
                <div>{selectedLog.durationMinutes} mins</div>
                <div>{comparisonLog?.durationMinutes} mins</div>

                <div className="text-slate-400">Distance:</div>
                <div>{selectedLog.distanceKm} km</div>
                <div>{comparisonLog?.distanceKm} km</div>

                <div className="text-slate-400">Max Altitude:</div>
                <div>{selectedLog.maxAltitudeM} m</div>
                <div>{comparisonLog?.maxAltitudeM} m</div>

                <div className="text-slate-400">Max Speed:</div>
                <div>{selectedLog.maxSpeedKmh} km/h</div>
                <div>{comparisonLog?.maxSpeedKmh} km/h</div>

                <div className="text-slate-400">Detections:</div>
                <div className="text-amber-400 font-bold">{selectedLog.detectionsCount}</div>
                <div className="text-amber-400 font-bold">{comparisonLog?.detectionsCount}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BATTERY & SIGNAL ANALYSIS */}
      {activeTab === 'BATTERY_SIGNAL' && (
        <div className="grid grid-cols-2 gap-3 flex-1">
          {/* BATTERY DEGRADATION ANALYSIS CHART */}
          <div className="bg-[#0a0f1c] border border-[#1a2336] p-3 rounded flex flex-col">
            <div className="flex items-center justify-between border-b border-[#1a2336] pb-2 mb-2">
              <span className="font-bold text-amber-400 uppercase text-xs">BATTERY VOLTAGE DROP VS CURRENT LOAD</span>
              <span className="text-slate-500 text-[10px]">6S LIPO THERMAL MATRIX</span>
            </div>
            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={batteryData}>
                  <XAxis dataKey="loadCurrent" stroke="#475569" fontSize={9} />
                  <YAxis stroke="#475569" fontSize={9} domain={[20, 26]} />
                  <Tooltip contentStyle={{ background: '#090e18', borderColor: '#1a2336', fontSize: '10px' }} />
                  <Line type="monotone" dataKey="voltage24V" stroke="#ffb700" strokeWidth={2} name="Voltage (V)" />
                  <Line type="monotone" dataKey="temp" stroke="#ff3b30" strokeWidth={2} name="Temp (°C)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SIGNAL RSSI VS DISTANCE RANGE CHART */}
          <div className="bg-[#0a0f1c] border border-[#1a2336] p-3 rounded flex flex-col">
            <div className="flex items-center justify-between border-b border-[#1a2336] pb-2 mb-2">
              <span className="font-bold text-cyan-400 uppercase text-xs">SIGNAL RSSI % & LATENCY VS RANGE</span>
              <span className="text-slate-500 text-[10px]">SATCOM LINK METRICS</span>
            </div>
            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={signalData}>
                  <defs>
                    <linearGradient id="rssiGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#00f0ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="rangeKm" stroke="#475569" fontSize={9} />
                  <YAxis stroke="#475569" fontSize={9} />
                  <Tooltip contentStyle={{ background: '#090e18', borderColor: '#1a2336', fontSize: '10px' }} />
                  <Area type="monotone" dataKey="rssiPercent" stroke="#00f0ff" fill="url(#rssiGrad)" name="Signal RSSI (%)" />
                  <Area type="monotone" dataKey="latencyMs" stroke="#ffb700" fillOpacity={0.1} name="Latency (ms)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FLEET UTILIZATION & DETECTION STATS */}
      {activeTab === 'UTILIZATION' && (
        <div className="grid grid-cols-12 gap-3 flex-1">
          {/* FLEET UTILIZATION TABLE (7 COLS) */}
          <div className="col-span-7 bg-[#0a0f1c] border border-[#1a2336] p-3 rounded flex flex-col space-y-2">
            <div className="flex items-center justify-between border-b border-[#1a2336] pb-2">
              <h3 className="font-bold uppercase text-slate-200 text-xs">DRONE FLEET UTILIZATION & HEALTH</h3>
              <span className="text-emerald-400 font-bold text-[10px]">4 ACTIVE ASSETS</span>
            </div>

            <table className="w-full text-left border-collapse text-[10px]">
              <thead>
                <tr className="border-b border-[#1a2336] text-slate-400 bg-[#080c14]">
                  <th className="p-2">CALLSIGN</th>
                  <th className="p-2">FLIGHT HOURS</th>
                  <th className="p-2">MISSIONS</th>
                  <th className="p-2">HEALTH SCORE</th>
                  <th className="p-2">LAST MAINTENANCE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2336]/40">
                {utilizationStats.map((stat) => (
                  <tr key={stat.callsign} className="hover:bg-[#0e1624]">
                    <td className="p-2 font-bold text-slate-200">{stat.callsign}</td>
                    <td className="p-2 text-cyan-400 font-bold">{stat.totalFlightHours} hrs</td>
                    <td className="p-2 text-slate-300">{stat.totalMissions}</td>
                    <td className="p-2">
                      <span className="text-emerald-400 font-bold">{stat.healthScorePercent}%</span>
                    </td>
                    <td className="p-2 text-slate-400">{stat.lastMaintenanceDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* AI DETECTION DISTRIBUTION PIE CHART (5 COLS) */}
          <div className="col-span-5 bg-[#0a0f1c] border border-[#1a2336] p-3 rounded flex flex-col items-center justify-between">
            <div className="w-full border-b border-[#1a2336] pb-2 mb-2 flex justify-between">
              <span className="font-bold uppercase text-slate-200 text-xs">AI TARGET CATEGORY DISTRIBUTION</span>
              <span className="text-amber-400 text-[10px]">TOTAL: 100 TARGETS</span>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={detectionStatsPie} cx="50%" cy="50%" outerRadius={70} dataKey="value" label>
                    {detectionStatsPie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#090e18', borderColor: '#1a2336', fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MISSION TELEMETRY REPLAY */}
      {activeTab === 'REPLAY' && (
        <div className="bg-[#0a0f1c] border border-[#1a2336] p-3 rounded flex-1 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-[#1a2336] pb-2">
            <span className="font-bold text-cyan-400 text-xs uppercase">MISSION REPLAY ENGINE — {selectedLog.missionName}</span>
            <span className="text-slate-400 text-[10px]">DATE: {selectedLog.date} | OPERATOR: {selectedLog.operator}</span>
          </div>

          {/* REPLAY SCRUBBER CONTROLS */}
          <div className="bg-[#080d16] border border-[#1a2336] p-3 rounded space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsReplaying(!isReplaying)}
                  className="px-3 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold flex items-center space-x-1"
                >
                  {isReplaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isReplaying ? 'PAUSE REPLAY' : 'START REPLAY'}</span>
                </button>
                <button
                  onClick={() => setReplayIndex(0)}
                  className="p-1 rounded bg-[#101726] border border-[#1e293b] text-slate-400 hover:text-slate-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              <span className="text-cyan-400 font-bold">
                FRAME {replayIndex + 1} / {selectedLog.telemetryLog.length} (TIME: {selectedLog.telemetryLog[replayIndex]?.time || '00:00'})
              </span>
            </div>

            {/* SCRUBBER SLIDER */}
            <input
              type="range"
              min="0"
              max={selectedLog.telemetryLog.length - 1}
              value={replayIndex}
              onChange={(e) => setReplayIndex(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* REPLAY TELEMETRY READOUT GRID */}
          <div className="grid grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-[#0e1624] p-2.5 rounded border border-[#1e293b]">
              <span className="text-slate-500 block text-[9px]">REPLAY ALTITUDE</span>
              <span className="text-cyan-400 font-bold text-base">{selectedLog.telemetryLog[replayIndex]?.alt || 0} m</span>
            </div>
            <div className="bg-[#0e1624] p-2.5 rounded border border-[#1e293b]">
              <span className="text-slate-500 block text-[9px]">REPLAY SPEED</span>
              <span className="text-emerald-400 font-bold text-base">{selectedLog.telemetryLog[replayIndex]?.speed || 0} km/h</span>
            </div>
            <div className="bg-[#0e1624] p-2.5 rounded border border-[#1e293b]">
              <span className="text-slate-500 block text-[9px]">REPLAY BATTERY</span>
              <span className="text-amber-400 font-bold text-base">{selectedLog.telemetryLog[replayIndex]?.battery || 0}%</span>
            </div>
            <div className="bg-[#0e1624] p-2.5 rounded border border-[#1e293b]">
              <span className="text-slate-500 block text-[9px]">REPLAY SIGNAL</span>
              <span className="text-cyan-300 font-bold text-base">{selectedLog.telemetryLog[replayIndex]?.signal || 0}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
