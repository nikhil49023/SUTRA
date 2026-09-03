import React, { useEffect, useState } from 'react';
import { useRiskStore, RiskGridCell, PrepositioningRecommendation, NationalDisasterZone } from '../stores/riskStore';
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
  RefreshCw,
  Radio,
  MapPin,
  Waves,
  Target,
  Users,
  Search,
  ExternalLink
} from 'lucide-react';

export const DisasterIntelPanel: React.FC = () => {
  const {
    temporalMap,
    activeHorizon,
    forecast,
    activeAlerts,
    recommendations,
    chargingStations,
    disasterZones,
    selectedZoneId,
    selectedZone,
    selectedCellId,
    selectedTheater,
    isLoading,
    fetchRiskData,
    fetchDisasterZones,
    setActiveHorizon,
    selectCell,
    selectDisasterZone,
    injectDisasterScenario,
    executePrepositioning,
    rejectPrepositioning,
  } = useRiskStore();

  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchRiskData();
    fetchDisasterZones();
    const interval = setInterval(() => {
      fetchRiskData();
      fetchDisasterZones();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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

  // Filter disaster zones
  const filteredZones = disasterZones.filter((z) => {
    const matchesSev = filterSeverity === 'ALL' || z.severity === filterSeverity;
    const matchesQ = !searchQuery || 
      z.place_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      z.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      z.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      z.disaster_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      z.ndrf_battalion.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSev && matchesQ;
  });

  const redCount = disasterZones.filter((z) => z.severity === 'RED').length;
  const orangeCount = disasterZones.filter((z) => z.severity === 'ORANGE').length;
  const yellowCount = disasterZones.filter((z) => z.severity === 'YELLOW').length;

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-mono text-xs overflow-y-auto border-r border-slate-800 p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-amber-400 animate-pulse" />
          <div>
            <h2 className="text-sm font-bold tracking-wider text-slate-100">PREDICTIVE DISASTER RISK & IMD/NDRF FEED</h2>
            <div className="text-[10px] text-slate-400 flex items-center space-x-2">
              <span>ACTIVE FOCUS: <strong className="text-cyan-400 truncate max-w-[280px] inline-block align-bottom">{selectedTheater}</strong></span>
              <span>•</span>
              <span>PROVIDER: <strong className="text-cyan-400">{forecast?.provider_name || 'SIMULATION'}</strong></span>
              <span>•</span>
              <span className="text-emerald-400">HEALTHY (100% ONLINE)</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => { fetchRiskData(); fetchDisasterZones(); }}
          disabled={isLoading}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-slate-300 flex items-center"
          title="Refresh Risk Model & Feeds"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>

      {/* 🚨 IMD & NDRF ACTIVE DISASTER RISK ZONES FEED */}
      <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span className="flex items-center space-x-1.5 text-slate-200 font-bold text-[11px]">
            <Radio className="w-4 h-4 text-red-400 animate-pulse" />
            <span>IMD & NDRF ACTIVE DISASTER RISK ZONES</span>
            <span className="bg-slate-800 text-slate-300 text-[9px] px-1.5 py-0.5 rounded border border-slate-700 ml-1">
              {disasterZones.length} ACTIVE
            </span>
          </span>
          <div className="flex items-center space-x-1 text-[9px]">
            <span className="px-1.5 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-800/80 font-bold">
              {redCount} RED
            </span>
            <span className="px-1.5 py-0.5 rounded bg-orange-950/80 text-orange-400 border border-orange-800/80 font-bold">
              {orangeCount} ORANGE
            </span>
            <span className="px-1.5 py-0.5 rounded bg-yellow-950/80 text-yellow-400 border border-yellow-800/80 font-bold">
              {yellowCount} YELLOW
            </span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex items-center space-x-1.5 pt-0.5">
          <div className="relative flex-1">
            <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search district, state, NDRF battalion, or hazard type..."
              className="w-full bg-slate-950 border border-slate-800 rounded pl-7 pr-2 py-1 text-[10px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="flex space-x-1 shrink-0">
            {['ALL', 'RED', 'ORANGE', 'YELLOW'].map((s) => (
              <button
                key={s}
                onClick={() => setFilterSeverity(s)}
                className={`px-1.5 py-1 text-[9px] font-bold rounded border transition-all ${
                  filterSeverity === s
                    ? 'bg-slate-800 border-cyan-500 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Active Disaster Cards List */}
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {filteredZones.map((zone) => {
            const isSelected = selectedZoneId === zone.alert_id || selectedTheater.includes(zone.district);
            return (
              <div
                key={zone.alert_id}
                className={`p-2 rounded border transition-all ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-500 shadow-sm shadow-cyan-900/30'
                    : 'bg-slate-950/80 hover:bg-slate-900 border-slate-800/90'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${getWarningBadge(zone.severity)}`}>
                      {zone.severity} ALERT
                    </span>
                    <span className="px-1 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 text-[8px] font-semibold">
                      {zone.disaster_type.replace('_', ' ')}
                    </span>
                    <span className="text-[9px] text-slate-500">
                      {zone.agency}
                    </span>
                  </div>
                  <button
                    onClick={() => selectDisasterZone(zone.alert_id)}
                    className={`px-2 py-0.5 text-[9px] font-bold rounded border flex items-center space-x-1 transition-all ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm shadow-cyan-400/40'
                        : 'bg-slate-800 hover:bg-cyan-900/60 text-cyan-400 border-slate-700 hover:border-cyan-500'
                    }`}
                  >
                    <Target className="w-3 h-3" />
                    <span>{isSelected ? 'ACTIVE FOCUS' : 'DEPLOY SWARM'}</span>
                  </button>
                </div>

                <div className="flex items-baseline justify-between">
                  <div className="font-bold text-slate-100 text-[11px] flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>{zone.place_name}</span>
                  </div>
                  <div className="text-[9px] text-slate-400">
                    {zone.latitude.toFixed(4)}°N, {zone.longitude.toFixed(4)}°E • {zone.elevation_m}m MSL
                  </div>
                </div>

                <div className="text-[10px] text-slate-300 my-1 leading-tight">
                  {zone.headline}
                </div>

                <div className="grid grid-cols-3 gap-1 pt-1 mt-1 border-t border-slate-900 text-[9px]">
                  <div className="text-slate-400">
                    🌧️ NOWCAST: <strong className="text-cyan-300">{zone.rainfall_nowcast_mm_h} mm/h</strong>
                  </div>
                  <div className="text-slate-400 truncate">
                    🛡️ NDRF: <strong className="text-amber-300">{zone.ndrf_battalion.split('(')[0]}</strong>
                  </div>
                  <div className="text-slate-400 text-right">
                    👥 EXPOSED: <strong className="text-emerald-300">{zone.affected_population_est.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Meteorological Telemetry Stream for Focused Disaster Site */}
      <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold border-b border-slate-800 pb-1">
          <span className="flex items-center space-x-1.5 text-slate-300">
            <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
            <span>FOCUSED SITE NOWCAST (COORDINATES: {currentGrid ? `${currentGrid.center_lat.toFixed(4)}°N, ${currentGrid.center_lon.toFixed(4)}°E` : ''})</span>
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
      <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold border-b border-slate-800 pb-1">
          <span className="flex items-center space-x-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>TEMPORAL RISK HORIZONS</span>
          </span>
          <span className="text-[10px] text-slate-400">PROJECTION: +{activeHorizon.replace('h', '')} HOURS</span>
        </div>

        <div className="grid grid-cols-5 gap-1 text-center">
          {['0h', '1h', '2h', '3h', '4h'].map((h) => {
            const gridH = temporalMap?.horizons[h];
            const avgRisk = gridH?.cells.length
              ? Math.round(gridH.cells.reduce((sum, c) => sum + c.risk_score, 0) / gridH.cells.length)
              : 0;
            const isCurrent = activeHorizon === h;

            return (
              <button
                key={h}
                onClick={() => setActiveHorizon(h)}
                className={`p-1.5 rounded border text-[10px] flex flex-col items-center justify-center transition-all ${
                  isCurrent
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-sm shadow-cyan-900/50'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span className="font-bold">{h === '0h' ? 'NOW' : `+${h.toUpperCase()}`}</span>
                <span className={`text-[9px] font-semibold ${avgRisk > 60 ? 'text-red-400' : avgRisk > 35 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {avgRisk}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Threat Zone Inspector & Explainability */}
      {activeCell && (
        <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <span className="flex items-center space-x-1.5 font-bold text-slate-200">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>THREAT ZONE INSPECTOR: {activeCell.cell_id}</span>
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getCategoryColor(activeCell.category)}`}>
              {activeCell.category} ({Math.round(activeCell.risk_score)}/100)
            </span>
          </div>

          <div className="text-[10px] text-slate-300 bg-slate-950/70 p-2 rounded border border-slate-800/80">
            <span className="text-amber-400 font-bold">RATIONALE: </span>
            {activeCell.primary_explanation}
          </div>

          {/* Factor Breakdown Bars */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[10px] text-slate-400 font-semibold">EXPLAINABLE FACTOR BREAKDOWN (7-VARIABLE MATRIX):</div>
            {activeCell.factors.map((f) => (
              <div key={f.name} className="space-y-0.5">
                <div className="flex justify-between text-[9px] text-slate-400">
                  <span>{f.name.toUpperCase()} (W={Math.round(f.weight * 100)}%)</span>
                  <span className="text-slate-200">{Math.round(f.normalized_score)}/100</span>
                </div>
                <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      f.normalized_score > 70 ? 'bg-red-500' : f.normalized_score > 40 ? 'bg-amber-500' : 'bg-cyan-500'
                    }`}
                    style={{ width: `${Math.min(100, f.normalized_score)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resource Pre-Positioning Decision Support */}
      <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1">
          <span className="flex items-center space-x-1.5 font-bold text-slate-200">
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            <span>ACTIONABLE RESOURCE PRE-POSITIONING</span>
          </span>
          <span className="text-[9px] text-slate-400">
            {recommendations.length} RECOMMENDATION{recommendations.length !== 1 ? 'S' : ''}
          </span>
        </div>

        {recommendations.length === 0 ? (
          <div className="text-[10px] text-slate-500 italic text-center py-2">
            No pre-positioning alerts. Fleet deployment nominal.
          </div>
        ) : (
          recommendations.map((rec) => (
            <div key={rec.recommendation_id} className="bg-slate-950/80 p-2 rounded border border-amber-900/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-300 flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span>TARGET HAZARD: {rec.target_zone_id} (RISK {Math.round(rec.target_risk_score)})</span>
                </span>
                <span className="text-[9px] bg-amber-950/70 text-amber-400 border border-amber-800/80 px-1 py-0.5 rounded font-bold">
                  {rec.status}
                </span>
              </div>

              <div className="text-[10px] text-slate-300">
                RECOMMENDED STAGING: <strong className="text-cyan-300">{rec.staging_name}</strong>
              </div>
              <div className="text-[9px] text-slate-400">
                DRONES: <span className="text-slate-200">{rec.recommended_drone_ids.join(', ')}</span> | 
                BATTERY MARGIN: <span className="text-emerald-400">+{rec.safe_battery_margin_pct.toFixed(1)}%</span>
              </div>
              <div className="text-[9px] text-slate-400 italic">
                {rec.rationale}
              </div>

              {rec.status === 'PENDING' && (
                <div className="flex space-x-2 pt-1">
                  <button
                    onClick={() => executePrepositioning(rec.recommendation_id)}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 py-1 rounded text-[10px] font-bold flex items-center justify-center space-x-1 shadow-sm shadow-cyan-900/50"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>EXECUTE PRE-POSITIONING</span>
                  </button>
                  <button
                    onClick={() => rejectPrepositioning(rec.recommendation_id)}
                    className="px-2 bg-slate-800 hover:bg-slate-700 text-slate-400 py-1 rounded text-[10px] flex items-center justify-center space-x-1"
                  >
                    <XCircle className="w-3 h-3" />
                    <span>DISMISS</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Portable Charging Hubs */}
      <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1">
          <span className="flex items-center space-x-1.5 font-bold text-slate-200">
            <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
            <span>PORTABLE CHARGING HUBS</span>
          </span>
          <span className="text-[9px] text-slate-400">{chargingStations.length} DEPLOYED</span>
        </div>

        <div className="space-y-1">
          {chargingStations.map((st) => (
            <div key={st.station_id} className="bg-slate-950/70 p-1.5 rounded border border-slate-800 flex items-center justify-between text-[10px]">
              <div>
                <div className="font-bold text-slate-200">{st.name}</div>
                <div className="text-[9px] text-slate-400">{st.power_source} • {st.battery_capacity_pct}% SOC</div>
              </div>
              <div className="text-right">
                <span className="text-emerald-400 font-bold">{st.available_bays}/{st.total_bays} BAYS FREE</span>
                <div className="text-[9px] text-slate-400">{st.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Disaster Scenario Stress Injector (Live Demonstration) */}
      <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800 space-y-1.5">
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">LIVE SCENARIO STRESS INJECTOR:</div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => injectDisasterScenario('CLOUDBURST_SURGE', 45.0)}
            className="p-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/80 rounded text-[9px] font-bold flex items-center justify-center space-x-1"
          >
            <CloudRain className="w-3 h-3" />
            <span>+45mm/h CLOUDBURST</span>
          </button>
          <button
            onClick={() => injectDisasterScenario('RIVER_LEVEE_BREACH', 60.0)}
            className="p-1.5 bg-red-950 hover:bg-red-900 text-red-300 border border-red-800/80 rounded text-[9px] font-bold flex items-center justify-center space-x-1"
          >
            <AlertTriangle className="w-3 h-3" />
            <span>RIVER LEVEE BREACH</span>
          </button>
        </div>
      </div>
    </div>
  );
};
