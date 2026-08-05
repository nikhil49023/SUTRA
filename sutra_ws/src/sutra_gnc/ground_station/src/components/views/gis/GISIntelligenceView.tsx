import React, { useState } from 'react';
import { 
  Globe, 
  Mountain, 
  Radio, 
  Eye, 
  Wind, 
  Grid, 
  MapPin, 
  ShieldAlert, 
  Layers, 
  TrendingUp, 
  Activity, 
  CheckCircle2, 
  AlertTriangle,
  Zap,
  Sliders,
  Crosshair
} from 'lucide-react';

import { 
  GISIntelligenceService, 
  GISLayerManager, 
  SearchGridGenerator, 
  ELZDetectorEngine, 
  DEMEngine,
  LineOfSightEngine,
  RFCoveragePredictor,
  WeatherEngine,
  WeatherAlertsEngine
} from '../../../gis';

import type { DroneAsset, TelemetryData, Waypoint } from '../../../types';
import type { SearchPatternType, GISLayerConfig } from '../../../gis/types';

interface GISIntelligenceViewProps {
  activeDrone: DroneAsset;
  telemetry: TelemetryData;
  waypoints: Waypoint[];
}

export const GISIntelligenceView: React.FC<GISIntelligenceViewProps> = ({
  activeDrone,
  telemetry,
  waypoints
}) => {
  const [activeTab, setActiveTab] = useState<'TERRAIN' | 'LOS' | 'RF_COVERAGE' | 'WEATHER' | 'SEARCH_GRID' | 'SPATIAL' | 'LAYERS'>('TERRAIN');
  const [layers, setLayers] = useState<GISLayerConfig[]>(GISLayerManager.getLayers());
  const [searchPattern, setSearchPattern] = useState<SearchPatternType>('GRID');
  const [searchRadius, setSearchRadius] = useState<number>(500);

  const gcsPos = { lat: 45.1082, lng: 34.5225, altAGLM: 10 };
  const dronePos = { lat: activeDrone.lat, lng: activeDrone.lng, altAGLM: activeDrone.altitude || 100 };

  const spatialAudit = GISIntelligenceService.runFullSpatialAudit(dronePos, gcsPos, waypoints);
  const elzs = ELZDetectorEngine.getAllELZs(activeDrone.lat, activeDrone.lng);
  const searchGrid = SearchGridGenerator.generateGrid(searchPattern, activeDrone.lat, activeDrone.lng, searchRadius, 80);

  const handleToggleLayer = (id: any) => {
    GISLayerManager.toggleLayer(id);
    setLayers([...GISLayerManager.getLayers()]);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#050811] text-slate-200 font-mono select-none overflow-hidden relative">
      {/* 1. TOP TITLE BAR */}
      <header className="h-12 bg-[#080d1a] border-b border-[#1b253b] px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 rounded bg-indigo-500/20 border border-indigo-400 flex items-center justify-center">
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <span className="font-bold text-sm text-white tracking-wider">GIS INTELLIGENCE ENGINE</span>
          <span className="text-xs px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold uppercase">
            3D SPATIAL ANALYTICS ACTIVE
          </span>
        </div>

        {/* SUB-MODULE SELECTORS */}
        <div className="flex items-center space-x-1 bg-[#050914] p-1 rounded-lg border border-[#1b253b] text-xs">
          {(
            [
              { id: 'TERRAIN', label: 'Terrain DEM' },
              { id: 'LOS', label: 'Line of Sight' },
              { id: 'RF_COVERAGE', label: 'RF Signal' },
              { id: 'WEATHER', label: 'Weather Matrix' },
              { id: 'SEARCH_GRID', label: 'Search Grid' },
              { id: 'SPATIAL', label: 'Spatial & ELZ' },
              { id: 'LAYERS', label: 'Map Layers' }
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* 2. CONTENT CONTAINER */}
      <div className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
        {/* TAB 1: TERRAIN DEM */}
        {activeTab === 'TERRAIN' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-[#070d1a] border border-[#1b253b] p-3.5 rounded-xl">
                <span className="text-xs text-slate-400 font-bold block">MIN ELEVATION (MSL)</span>
                <span className="text-2xl font-bold text-white">{spatialAudit.terrainSummary.minElevationM} <span className="text-xs">m</span></span>
              </div>
              <div className="bg-[#070d1a] border border-[#1b253b] p-3.5 rounded-xl">
                <span className="text-xs text-slate-400 font-bold block">PEAK ELEVATION (MSL)</span>
                <span className="text-2xl font-bold text-amber-400">{spatialAudit.terrainSummary.maxElevationM} <span className="text-xs">m</span></span>
              </div>
              <div className="bg-[#070d1a] border border-[#1b253b] p-3.5 rounded-xl">
                <span className="text-xs text-slate-400 font-bold block">AVG / MAX SLOPE</span>
                <span className="text-2xl font-bold text-cyan-400">{spatialAudit.terrainSummary.avgSlopeDegrees}° / {spatialAudit.terrainSummary.maxSlopeDegrees}°</span>
              </div>
              <div className="bg-[#070d1a] border border-[#1b253b] p-3.5 rounded-xl">
                <span className="text-xs text-slate-400 font-bold block">TERRAIN DIFFICULTY</span>
                <span className="text-xl font-bold text-emerald-400 uppercase">{spatialAudit.terrainSummary.terrainDifficultyIndex}</span>
              </div>
            </div>

            {/* TERRAIN PROFILE CHART */}
            <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl space-y-2">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-300 uppercase flex items-center space-x-1.5">
                  <Mountain className="w-4 h-4 text-cyan-400" />
                  <span>3D ELEVATION PROFILE ALONG FLIGHT PATH</span>
                </span>
                <span className="text-xs text-slate-400">Total Route: {spatialAudit.routeLengthKm} km</span>
              </div>
              <div className="h-44 bg-[#040710] rounded border border-slate-800 p-2 flex items-end justify-between space-x-1">
                {spatialAudit.terrainProfile.map((pt, idx) => {
                  const h = Math.max(10, Math.min(100, (pt.elevationM / (spatialAudit.terrainSummary.maxElevationM || 400)) * 100));
                  return (
                    <div key={idx} className="flex-1 bg-cyan-950/80 border-t border-cyan-400/60 rounded-t relative group" style={{ height: `${h}%` }}>
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 border border-slate-700 text-[10px] px-1.5 py-0.5 rounded text-white z-30 whitespace-nowrap">
                        {pt.elevationM}m MSL
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LINE OF SIGHT */}
        {activeTab === 'LOS' && (
          <div className="space-y-4">
            <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-sm tracking-wider uppercase">GCS ↔ DRONE RAYCASTING LINE OF SIGHT</h3>
                <p className="text-xs text-slate-400">Evaluates 3D optical visibility and Fresnel zone clearance.</p>
              </div>
              <span className={`px-3 py-1 rounded text-xs font-bold border ${spatialAudit.los.hasClearLOS ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-red-950 text-red-400 border-red-800'}`}>
                {spatialAudit.los.hasClearLOS ? 'CLEAR LINE OF SIGHT' : 'TERRAIN OBSTRUCTED'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl space-y-1">
                <span className="text-xs text-slate-400 font-bold block">GCS DISTANCE</span>
                <span className="text-2xl font-bold text-white">{spatialAudit.los.distanceKm} <span className="text-xs">km</span></span>
              </div>
              <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl space-y-1">
                <span className="text-xs text-slate-400 font-bold block">FRESNEL ZONE CLEARANCE</span>
                <span className="text-2xl font-bold text-cyan-400">{spatialAudit.los.maxFresnelZoneClearanceM} <span className="text-xs">m</span></span>
              </div>
              <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl space-y-1">
                <span className="text-xs text-slate-400 font-bold block">MAX RADIO HORIZON</span>
                <span className="text-2xl font-bold text-emerald-400">{spatialAudit.los.radioHorizonKm} <span className="text-xs">km</span></span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RF COVERAGE */}
        {activeTab === 'RF_COVERAGE' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl">
                <span className="text-xs text-slate-400 font-bold block">ESTIMATED RSSI</span>
                <span className="text-2xl font-bold text-indigo-400">{spatialAudit.rf.rssiDbm} <span className="text-xs">dBm</span></span>
              </div>
              <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl">
                <span className="text-xs text-slate-400 font-bold block">SIGNAL QUALITY</span>
                <span className="text-2xl font-bold text-emerald-400">{spatialAudit.rf.signalQualityPercent} <span className="text-xs">%</span></span>
              </div>
              <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl">
                <span className="text-xs text-slate-400 font-bold block">FADE MARGIN</span>
                <span className="text-2xl font-bold text-white">+{spatialAudit.rf.estimatedMarginDb} <span className="text-xs">dB</span></span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: WEATHER */}
        {activeTab === 'WEATHER' && (
          <div className="space-y-4">
            <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-sm tracking-wider uppercase">MICRO-METEOROLOGICAL SUITABILITY</h3>
                <p className="text-xs text-slate-400">Evaluates wind velocity, gusting, rain, and cloud ceiling.</p>
              </div>
              <span className={`px-3 py-1 rounded text-xs font-bold border ${spatialAudit.weatherSuitability.isSuitable ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-red-950 text-red-400 border-red-800'}`}>
                SUITABILITY SCORE: {spatialAudit.weatherSuitability.suitabilityScore}/100
              </span>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="bg-[#070d1a] border border-[#1b253b] p-3.5 rounded-xl">
                <span className="text-xs text-slate-400 font-bold block">WIND SPEED / GUST</span>
                <span className="text-xl font-bold text-amber-400">{spatialAudit.weather.windSpeedMps} m/s ({spatialAudit.weather.gustMps} m/s)</span>
              </div>
              <div className="bg-[#070d1a] border border-[#1b253b] p-3.5 rounded-xl">
                <span className="text-xs text-slate-400 font-bold block">RAIN PROBABILITY</span>
                <span className="text-xl font-bold text-cyan-400">{spatialAudit.weather.rainProbabilityPercent}%</span>
              </div>
              <div className="bg-[#070d1a] border border-[#1b253b] p-3.5 rounded-xl">
                <span className="text-xs text-slate-400 font-bold block">VISIBILITY</span>
                <span className="text-xl font-bold text-white">{spatialAudit.weather.visibilityKm} km</span>
              </div>
              <div className="bg-[#070d1a] border border-[#1b253b] p-3.5 rounded-xl">
                <span className="text-xs text-slate-400 font-bold block">CLOUD BASE</span>
                <span className="text-xl font-bold text-slate-300">{spatialAudit.weather.cloudBaseM} m</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SEARCH GRID */}
        {activeTab === 'SEARCH_GRID' && (
          <div className="space-y-4">
            <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-sm tracking-wider uppercase">AUTONOMOUS SEARCH GRID GENERATOR</h3>
                <p className="text-xs text-slate-400">Generate SAR patterns: Grid, Spiral, Sector, Lawn Mower, Corridor, Expanding Sq.</p>
              </div>

              <div className="flex items-center space-x-2">
                {(['GRID', 'SPIRAL', 'SECTOR', 'LAWN_MOWER', 'CORRIDOR', 'EXPANDING_SQUARE'] as SearchPatternType[]).map((pat) => (
                  <button
                    key={pat}
                    onClick={() => setSearchPattern(pat)}
                    className={`px-2.5 py-1 rounded text-xs font-bold border transition-all ${
                      searchPattern === pat ? 'bg-cyan-600 text-white border-cyan-400' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {pat}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-bold">TOTAL AREA COVERAGE</span>
                <span className="text-xl font-bold text-cyan-400">{searchGrid.totalAreaKm2} km²</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold">GENERATED WAYPOINTS</span>
                <span className="text-xl font-bold text-white">{searchGrid.pathWaypoints.length} Points</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold">ESTIMATED SEARCH TIME</span>
                <span className="text-xl font-bold text-emerald-400">{searchGrid.estimatedSearchTimeMin} Min</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SPATIAL & ELZ */}
        {activeTab === 'SPATIAL' && (
          <div className="space-y-4">
            <h3 className="text-white font-bold text-sm tracking-wider uppercase">NEAREST EMERGENCY LANDING ZONES (ELZ)</h3>
            <div className="grid grid-cols-3 gap-4">
              {elzs.map((elz) => (
                <div key={elz.id} className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-pink-400">{elz.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-pink-950 text-pink-300 border border-pink-800">{elz.surfaceType}</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Distance:</span>
                      <span className="text-cyan-400 font-bold">{elz.distanceFromDroneKm} km</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Elevation:</span>
                      <span className="text-white font-bold">{elz.elevationM} m MSL</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Suitability Score:</span>
                      <span className="text-emerald-400 font-bold">{elz.suitabilityScore}/100</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: LAYERS */}
        {activeTab === 'LAYERS' && (
          <div className="space-y-4">
            <h3 className="text-white font-bold text-sm tracking-wider uppercase">TOGGLEABLE GIS MAP OVERLAY LAYERS</h3>
            <div className="grid grid-cols-2 gap-4">
              {layers.map((lyr) => (
                <div key={lyr.id} className="bg-[#070d1a] border border-[#1b253b] p-3.5 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: lyr.color }} />
                    <span className="text-xs font-bold text-slate-200">{lyr.name}</span>
                  </div>
                  <button
                    onClick={() => handleToggleLayer(lyr.type)}
                    className={`px-3 py-1 rounded text-xs font-bold border transition-all ${
                      lyr.visible ? 'bg-cyan-600 text-white border-cyan-400' : 'bg-slate-900 text-slate-500 border-slate-800'
                    }`}
                  >
                    {lyr.visible ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
