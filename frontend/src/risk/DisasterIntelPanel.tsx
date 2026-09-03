import React, { useEffect } from 'react';
import { useRiskStore, RiskGridCell, PrepositioningRecommendation } from '../stores/riskStore';
import { 
  CloudRain, 
  Wind, 
  AlertTriangle, 
  ShieldAlert, 
  BatteryCharging, 
  Navigation, 
  Zap, 
  Clock, 
  Compass, 
  Layers, 
  CheckCircle2, 
  XCircle,
  RefreshCw
} from 'lucide-react';

export const DisasterIntelPanel: React.FC = () => {
  const {
    temporalMap,
    activeHorizon,
    forecast,
    activeAlerts,
    recommendations,
    chargingStations,
    selectedCellId,
    selectedTheater,
    isLoading,
    fetchRiskData,
    setActiveHorizon,
    selectCell,
    selectTheater,
    injectDisasterScenario,
    executePrepositioning,
    rejectPrepositioning,
  } = useRiskStore();

  useEffect(() => {
    fetchRiskData();
    const interval = setInterval(fetchRiskData, 5000);
    return () => clearInterval(interval);
  }, []);

  const THEATERS = [
    { name: 'NHCE Bengaluru (Hackathon Venue)', lat: 12.9345, lon: 77.6912, label: '📍 NHCE BENGALURU' },
    { name: 'Kedarnath Basin (Mandakini River)', lat: 30.7352, lon: 79.0669, label: '🏔️ KEDARNATH' },
    { name: 'Wayanad Meppadi (Landslide Zone)', lat: 11.5300, lon: 76.1300, label: '🌿 WAYANAD' },
    { name: 'Tactical Urban Grid (Default)', lat: 37.7749, lon: -122.4194, label: '🏙️ URBAN GRID' },
  ];

  const currentGrid = temporalMap?.horizons[activeHorizon];
  const activeObservation = forecast?.observations.find((o) => {
    const h = parseInt(activeHorizon.replace('h', '')) || 0;
    return o.valid_from <= (forecast.reference_time + h * 3600 + 1800);
  }) || forecast?.observations[0];

  // Selected cell or highest risk cell default
  const activeCell: RiskGridCell | undefined = currentGrid?.cells.find((c) => c.cell_id === selectedCellId) ||
    currentGrid?.cells.reduce((max, c) => (c.risk_score > (max?.risk_score || 0) ? c : max), currentGrid.cells[0]);

  const getCategoryColor = (cat?: string) => {
    switch (cat) {
      case 'CRITICAL': return 'text-red-400 bg-red-950/60 border-red-500';
      case 'VERY_HIGH': return 'text-orange-400 bg-orange-950/60 border-orange-500';
      case 'HIGH': return 'text-amber-400 bg-amber-950/60 border-amber-500';
      case 'MODERATE': return 'text-yellow-400 bg-yellow-950/60 border-yellow-500';
      default: return 'text-emerald-400 bg-emerald-950/60 border-emerald-500';
    }
  };

  const getWarningBadge = (level?: string) => {
    switch (level) {
      case 'RED': return 'bg-red-500/20 text-red-400 border-red-500';
      case 'ORANGE': return 'bg-orange-500/20 text-orange-400 border-orange-500';
      case 'YELLOW': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500';
      default: return 'bg-emerald-500/20 text-emerald-400 border-emerald-500';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-mono text-xs overflow-y-auto border-r border-slate-800 p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-amber-400 animate-pulse" />
          <div>
            <h2 className="text-sm font-bold tracking-wider text-slate-100">PREDICTIVE DISASTER RISK</h2>
            <div className="text-[10px] text-slate-400 flex items-center space-x-2">
              <span>THEATER: <strong className="text-cyan-400">{selectedTheater}</strong></span>
              <span>•</span>
              <span>PROVIDER: <strong className="text-cyan-400">{forecast?.provider_name || 'SIMULATION'}</strong></span>
              <span>•</span>
              <span className="text-emerald-400">HEALTHY (100% ONLINE)</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => fetchRiskData()}
          disabled={isLoading}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-slate-300 flex items-center"
          title="Refresh Risk Model"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>

      {/* Operational Disaster Theater Switcher */}
      <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800 space-y-1.5">
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
          <span>OPERATIONAL DISASTER THEATER (COORDINATES & LIVE IMD INGESTION)</span>
          <span className="text-cyan-400 text-[9px]">{currentGrid ? `${currentGrid.center_lat.toFixed(4)}°N, ${currentGrid.center_lon.toFixed(4)}°E` : ''}</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {THEATERS.map((th) => (
            <button
              key={th.name}
              onClick={() => selectTheater(th.name, th.lat, th.lon)}
              className={`px-1.5 py-1 text-[9px] font-bold rounded border truncate transition-all ${
                selectedTheater.includes(th.name.split(' ')[0])
                  ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-sm shadow-cyan-900/30'
                  : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-400'
              }`}
            >
              {th.label}
            </button>
          ))}
        </div>
      </div>

      {/* Meteorological Telemetry Stream */}
      <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold border-b border-slate-800 pb-1">
          <span className="flex items-center space-x-1.5 text-slate-300">
            <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
            <span>METEOROLOGICAL NOWCAST & FORECAST</span>
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getWarningBadge(activeObservation?.warning_level)}`}>
            ALERT: {activeObservation?.warning_level || 'GREEN'}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800">
            <div className="text-[9px] text-slate-400">RAIN RATE</div>
            <div className="text-xs font-bold text-cyan-300">{activeObservation?.rainfall_rate_mm_h || 0} <span className="text-[9px] font-normal">mm/h</span></div>
          </div>
          <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800">
            <div className="text-[9px] text-slate-400">ACCUMULATION</div>
            <div className="text-xs font-bold text-blue-300">{activeObservation?.rainfall_mm || 0} <span className="text-[9px] font-normal">mm</span></div>
          </div>
          <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800">
            <div className="text-[9px] text-slate-400">WIND SPEED</div>
            <div className="text-xs font-bold text-amber-300">{activeObservation?.wind_speed_mps || 0} <span className="text-[9px] font-normal">m/s</span></div>
          </div>
          <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800">
            <div className="text-[9px] text-slate-400">CONFIDENCE</div>
            <div className="text-xs font-bold text-emerald-300">{Math.round((activeObservation?.confidence || 0.9) * 100)}%</div>
          </div>
        </div>

        {activeObservation?.warning_headline && (
          <div className="text-[10px] text-amber-300 bg-amber-950/40 p-1.5 rounded border border-amber-900/50 flex items-start space-x-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
            <span>{activeObservation.warning_headline}</span>
          </div>
        )}
      </div>

      {/* Temporal Timeline Stepper */}
      <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span className="flex items-center space-x-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>TEMPORAL RISK HORIZONS</span>
          </span>
          <span className="text-[9px] text-slate-400">PROJECTION: +{activeHorizon.replace('h', '')} HOURS</span>
        </div>

        <div className="grid grid-cols-5 gap-1">
          {['0h', '1h', '2h', '3h', '4h'].map((h) => {
            const grid = temporalMap?.horizons[h];
            const maxScore = grid?.cells.reduce((m, c) => Math.max(m, c.risk_score), 0) || 0;
            const isSelected = activeHorizon === h;

            return (
              <button
                key={h}
                onClick={() => setActiveHorizon(h)}
                className={`py-1.5 px-1 rounded flex flex-col items-center border transition-all ${
                  isSelected
                    ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-sm shadow-cyan-500/20'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-[9px] font-bold">{h === '0h' ? 'NOW' : `+${h.toUpperCase()}`}</span>
                <span className={`text-[10px] font-bold mt-0.5 ${maxScore >= 60 ? 'text-red-400' : maxScore >= 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {Math.round(maxScore)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Explainable Risk Assessment Breakdown */}
      {activeCell && (
        <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="flex items-center space-x-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold text-slate-200">ZONE INSPECTOR: {activeCell.cell_id}</span>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getCategoryColor(activeCell.category)}`}>
              {activeCell.category} ({Math.round(activeCell.risk_score)}/100)
            </span>
          </div>

          {/* Natural Language Rationale */}
          <div className="text-[10px] text-slate-300 bg-slate-950 p-2 rounded border border-slate-800 leading-relaxed">
            <strong className="text-amber-400">RATIONALE: </strong>
            {activeCell.primary_explanation}
            {activeCell.confirmed_flooded && (
              <div className="mt-1 text-cyan-300 font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                <span>OBSERVED: Drone camera confirmed surface inundation.</span>
              </div>
            )}
          </div>

          {/* Factor Breakdown Bars */}
          <div className="space-y-1.5">
            <div className="text-[9px] font-bold text-slate-400 tracking-wider">CONTRIBUTING FACTOR WEIGHTS:</div>
            {activeCell.factors.map((f) => (
              <div key={f.name} className="space-y-0.5">
                <div className="flex justify-between text-[9px]">
                  <span className="text-slate-300">{f.name} <span className="text-slate-500">({Math.round(f.weight * 100)}%)</span></span>
                  <span className="font-bold text-slate-200">{Math.round(f.normalized_score)}/100</span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-300 ${
                      f.normalized_score >= 75
                        ? 'bg-red-500'
                        : f.normalized_score >= 50
                        ? 'bg-amber-500'
                        : 'bg-cyan-500'
                    }`}
                    style={{ width: `${Math.min(100, f.normalized_score)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actionable Resource Pre-Positioning Advisory */}
      {recommendations.length > 0 && (
        <div className="bg-amber-950/30 rounded-lg p-2.5 border border-amber-500/50 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-300 border-b border-amber-900/50 pb-1">
            <span className="flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              <span>PRE-POSITIONING DECISION SUPPORT</span>
            </span>
            <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/40">
              ACTIONABLE
            </span>
          </div>

          {recommendations.map((rec) => (
            <div key={rec.recommendation_id} className="space-y-2">
              <div className="text-[10px] text-slate-200 leading-normal">
                {rec.rationale}
              </div>

              <div className="grid grid-cols-3 gap-1 text-[9px] bg-slate-950/80 p-1.5 rounded border border-slate-800 text-center">
                <div>
                  <div className="text-slate-400">STAGING PAD</div>
                  <div className="font-bold text-cyan-300">{rec.staging_name}</div>
                </div>
                <div>
                  <div className="text-slate-400">FLIGHT ETA</div>
                  <div className="font-bold text-amber-300">{Math.round(rec.estimated_flight_time_s / 60)} min</div>
                </div>
                <div>
                  <div className="text-slate-400">BATTERY MARGIN</div>
                  <div className="font-bold text-emerald-300">+{Math.round(rec.safe_battery_margin_pct)}%</div>
                </div>
              </div>

              <div className="flex space-x-1.5 pt-1">
                <button
                  onClick={() => executePrepositioning(rec.recommendation_id)}
                  className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded flex items-center justify-center space-x-1 transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>EXECUTE PRE-POSITIONING</span>
                </button>
                <button
                  onClick={() => rejectPrepositioning(rec.recommendation_id)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 flex items-center justify-center"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Portable Charging Stations */}
      <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 border-b border-slate-800 pb-1">
          <span className="flex items-center space-x-1.5">
            <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
            <span>PORTABLE CHARGING HUBS</span>
          </span>
          <span className="text-[9px] text-slate-400">{chargingStations.length} DEPLOYED</span>
        </div>

        {chargingStations.map((st) => (
          <div key={st.station_id} className="bg-slate-950 p-2 rounded border border-slate-800 flex items-center justify-between text-[10px]">
            <div>
              <div className="font-bold text-slate-200">{st.name}</div>
              <div className="text-[9px] text-slate-400">{st.power_source} • Elev: {st.elevation_m}m</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-emerald-400">{st.battery_capacity_pct}% SOC</div>
              <div className="text-[9px] text-cyan-300">{st.available_bays}/{st.total_bays} BAYS FREE</div>
            </div>
          </div>
        ))}
      </div>

      {/* Dynamic Scenario Injector (Demonstration & Verification) */}
      <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 space-y-1.5">
        <div className="text-[10px] font-bold text-slate-400 tracking-wider">LIVE SCENARIO STRESS INJECTOR:</div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => injectDisasterScenario('CLOUD_BURST', 45.0)}
            className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded text-[9px] font-bold flex items-center justify-center space-x-1"
          >
            <CloudRain className="w-3 h-3 text-cyan-400" />
            <span>+45mm/h CLOUDBURST</span>
          </button>
          <button
            onClick={() => injectDisasterScenario('RIVER_BREACH', 65.0)}
            className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-red-300 border border-slate-700 rounded text-[9px] font-bold flex items-center justify-center space-x-1"
          >
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span>RIVER LEVEE BREACH</span>
          </button>
        </div>
      </div>
    </div>
  );
};
