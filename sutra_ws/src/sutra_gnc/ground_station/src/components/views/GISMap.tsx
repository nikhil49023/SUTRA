import React, { useState, useEffect, useRef } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  ShieldAlert, 
  Cpu, 
  Flame, 
  Grid, 
  Edit3, 
  Crosshair,
  Layers,
  MapPin,
  Play,
  Pause,
  RotateCcw,
  Ruler,
  Maximize,
  Save,
  FolderOpen,
  Plus,
  Trash2,
  Navigation2,
  Compass,
  BatteryCharging,
  Clock,
  Shield,
  Download,
  Upload
} from 'lucide-react';
import type { DroneAsset, TelemetryData, Waypoint, AIDetection } from '../../types';
import { GISService, MAP_LAYERS } from '../../services/gisService';
import { MissionService, type MissionEstimates } from '../../services/missionService';
import { SimulationService, type SimulationState } from '../../services/simulationService';

interface GISMapProps {
  activeDrone: DroneAsset;
  telemetry: TelemetryData;
  waypoints: Waypoint[];
  aiDetections: AIDetection[];
  onUpdateWaypoints: (waypoints: Waypoint[]) => void;
  onUpdateDronePos: (pos: Partial<DroneAsset>, tel: Partial<TelemetryData>) => void;
}

export type MapInteractionMode = 
  | 'SELECT' 
  | 'ADD_WAYPOINT' 
  | 'DRAW_GEOFENCE' 
  | 'MEASURE_DISTANCE' 
  | 'MEASURE_AREA';

export const GISMap: React.FC<GISMapProps> = ({
  activeDrone,
  telemetry,
  waypoints,
  aiDetections,
  onUpdateWaypoints,
  onUpdateDronePos
}) => {
  const [mapMode, setMapMode] = useState<'TACTICAL_DARK' | 'SATELLITE' | 'TERRAIN' | 'ROAD'>('TACTICAL_DARK');
  const [interactionMode, setInteractionMode] = useState<MapInteractionMode>('SELECT');
  
  // Layer toggles
  const [showGrid, setShowGrid] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showGeofence, setShowGeofence] = useState(true);
  const [showWaypointsLayer, setShowWaypointsLayer] = useState(true);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);

  // Home location
  const [homeLocation] = useState({ lat: 34.5011, lng: 45.0920, alt: 0 });

  // Geofence Polygons
  const [geofences, setGeofences] = useState<[number, number][][]>([
    [
      [34.528, 45.102],
      [34.538, 45.118],
      [34.532, 45.138],
      [34.518, 45.122]
    ]
  ]);
  const [drawingGeofencePoints, setDrawingGeofencePoints] = useState<[number, number][]>([]);

  // Measurement tool states
  const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);
  const [measuredDistance, setMeasuredDistance] = useState<number | null>(null);
  const [measuredArea, setMeasuredArea] = useState<{ areaSqMeters: number; hectares: number } | null>(null);

  // Dragging waypoint state
  const [draggingWpId, setDraggingWpId] = useState<number | null>(null);

  // Simulation Service
  const [simState, setSimState] = useState<SimulationState>({
    isRunning: false,
    isPaused: false,
    currentWaypointIndex: 0,
    progressPercent: 0,
    multiplier: 1
  });
  const simulationRef = useRef<SimulationService | null>(null);

  // File input ref for Load Mission
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Mission Estimates
  const estimates: MissionEstimates = MissionService.calculateMissionEstimates(waypoints);

  // Initialize simulation service
  useEffect(() => {
    simulationRef.current = new SimulationService(waypoints);
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [waypoints]);

  // Handle map click events based on active interaction mode
  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert pixel click to pseudo lat/lng within bounds
    const lat = +(34.550 - (clickY / rect.height) * 0.08).toFixed(4);
    const lng = +(45.080 + (clickX / rect.width) * 0.08).toFixed(4);

    if (interactionMode === 'ADD_WAYPOINT') {
      const newWp: Waypoint = {
        id: waypoints.length + 1,
        lat,
        lng,
        alt: 200,
        action: 'WAYPOINT',
        completed: false
      };
      onUpdateWaypoints([...waypoints, newWp]);
    } else if (interactionMode === 'DRAW_GEOFENCE') {
      setDrawingGeofencePoints((prev) => [...prev, [lat, lng]]);
    } else if (interactionMode === 'MEASURE_DISTANCE') {
      const newPts: [number, number][] = [...measurePoints, [lat, lng]];
      setMeasurePoints(newPts);
      if (newPts.length >= 2) {
        const dist = GISService.calculateRouteDistance(newPts);
        setMeasuredDistance(+dist.toFixed(2));
      }
    } else if (interactionMode === 'MEASURE_AREA') {
      const newPts: [number, number][] = [...measurePoints, [lat, lng]];
      setMeasurePoints(newPts);
      if (newPts.length >= 3) {
        const res = GISService.calculatePolygonArea(newPts);
        setMeasuredArea(res);
      }
    }
  };

  // Close drawn geofence polygon
  const handleCompleteGeofence = () => {
    if (drawingGeofencePoints.length >= 3) {
      setGeofences([...geofences, drawingGeofencePoints]);
      setDrawingGeofencePoints([]);
      setInteractionMode('SELECT');
    }
  };

  // Reset measurements
  const handleClearMeasurement = () => {
    setMeasurePoints([]);
    setMeasuredDistance(null);
    setMeasuredArea(null);
  };

  // Simulation Controls
  const handleToggleSimulation = () => {
    if (!simulationRef.current) return;

    if (!simState.isRunning) {
      simulationRef.current.setWaypoints(waypoints);
      simulationRef.current.start((dronePos, telData, updatedState) => {
        onUpdateDronePos(dronePos, telData);
        setSimState(updatedState);
      });
    } else if (simState.isPaused) {
      simulationRef.current.resume();
      setSimState((prev) => ({ ...prev, isPaused: false }));
    } else {
      simulationRef.current.pause();
      setSimState((prev) => ({ ...prev, isPaused: true }));
    }
  };

  const handleResetSimulation = () => {
    if (simulationRef.current) {
      simulationRef.current.stop();
      setSimState({
        isRunning: false,
        isPaused: false,
        currentWaypointIndex: 0,
        progressPercent: 0,
        multiplier: 1
      });
    }
  };

  const handleChangeSimSpeed = (mult: number) => {
    if (simulationRef.current) {
      simulationRef.current.setMultiplier(mult);
      setSimState((prev) => ({ ...prev, multiplier: mult }));
    }
  };

  // Save Mission to MAVLink / JSON file
  const handleSaveMission = () => {
    const missionData = MissionService.exportMissionToMAVLinkJSON({
      id: `MISSION-${Date.now()}`,
      name: 'Smart Horizon Mission Plan',
      createdTime: new Date().toISOString(),
      cruiseSpeedKmh: 54,
      cruiseAltitudeM: 200,
      waypoints,
      homeLocation,
      geofencePolygons: geofences.map((pts, i) => ({ id: `GEO-${i}`, name: `Geofence ${i+1}`, points: pts }))
    });

    const blob = new Blob([missionData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Mission_Plan_MAVLink_${Date.now()}.plan`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Load Mission from JSON file
  const handleLoadMission = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const imported = MissionService.importMissionFromJSON(content);
      if (imported && imported.waypoints.length > 0) {
        onUpdateWaypoints(imported.waypoints);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="relative flex-1 h-full bg-[#070a11] hud-grid overflow-hidden border-r border-[#1a2336] flex flex-col">
      {/* Invisible file input for loading mission */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleLoadMission}
        accept=".json,.plan"
        className="hidden"
      />

      {/* Map Canvas Visual Simulation Layer */}
      <div 
        className={`absolute inset-0 transition-all duration-300 ${
          mapMode === 'SATELLITE' ? 'bg-[#060c18]' : 
          mapMode === 'TERRAIN' ? 'bg-[#08121d]' : 
          mapMode === 'ROAD' ? 'bg-[#0c1626]' : 'bg-[#070a11]'
        }`}
      >
        {/* Tactical Interactive Map Vector SVG */}
        <svg 
          onClick={handleMapClick}
          className="w-full h-full absolute inset-0 cursor-crosshair select-none"
        >
          <defs>
            <pattern id="grid-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#00f0ff" strokeWidth="0.5" strokeDasharray="2,2" />
            </pattern>
            <radialGradient id="map-radar-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
            </radialGradient>
          </defs>

          {showGrid && <rect width="100%" height="100%" fill="url(#grid-pattern)" />}
          
          {/* Radar Sweep Effect */}
          <circle cx="50%" cy="45%" r="320" fill="url(#map-radar-glow)" className="animate-pulse" />

          {/* HOME LOCATION MARKER */}
          <g transform="translate(140, 480)" className="cursor-pointer">
            <circle r="16" fill="rgba(0, 240, 255, 0.15)" stroke="#00f0ff" strokeWidth="1.5" strokeDasharray="3,3" />
            <circle r="8" fill="#00f0ff" />
            <text x="0" y="3" textAnchor="middle" fill="#070a11" fontSize="9" fontFamily="monospace" fontWeight="bold">H</text>
            <text x="0" y="24" textAnchor="middle" fill="#00f0ff" fontSize="9" fontFamily="monospace" fontWeight="bold">LAUNCH PAD (HOME)</text>
          </g>

          {/* GEOFENCE POLYGONS */}
          {showGeofence && geofences.map((poly, idx) => (
            <g key={idx}>
              <polygon 
                points="220,120 480,140 520,380 280,420 180,280" 
                fill="rgba(255, 59, 48, 0.12)" 
                stroke="#ff3b30" 
                strokeWidth="2" 
                strokeDasharray="4,4" 
              />
              <text x="320" y="160" fill="#ff3b30" fontSize="10" fontFamily="monospace" fontWeight="bold">
                RESTRICTED AIRSPACE / GEOFENCE ALPHA
              </text>
            </g>
          ))}

          {/* DRAWING GEOFENCE POINTS */}
          {drawingGeofencePoints.length > 0 && (
            <g>
              <polyline
                points={drawingGeofencePoints.map(([lat, lng]) => `${(lng - 45.080) * 10000},${(34.550 - lat) * 10000}`).join(' ')}
                fill="none"
                stroke="#ff3b30"
                strokeWidth="2"
                strokeDasharray="2,2"
              />
              {drawingGeofencePoints.map(([lat, lng], i) => (
                <circle
                  key={i}
                  cx={(lng - 45.080) * 10000}
                  cy={(34.550 - lat) * 10000}
                  r="5"
                  fill="#ff3b30"
                />
              ))}
            </g>
          )}

          {/* MEASUREMENT POLYLINE */}
          {measurePoints.length > 0 && (
            <g>
              {measurePoints.map(([lat, lng], i) => (
                <circle
                  key={i}
                  cx={(lng - 45.080) * 10000}
                  cy={(34.550 - lat) * 10000}
                  r="6"
                  fill="#ffb700"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              ))}
            </g>
          )}

          {/* MISSION FLIGHT TRACK POLYLINE */}
          {showWaypointsLayer && waypoints.length >= 2 && (
            <polyline
              points={waypoints.map((_, idx) => {
                const coords = [
                  { x: 140, y: 480 },
                  { x: 240, y: 400 },
                  { x: 360, y: 340 },
                  { x: 450, y: 260 },
                  { x: 560, y: 280 },
                  { x: 680, y: 320 },
                  { x: 140, y: 480 },
                ][idx] || { x: 300, y: 300 };
                return `${coords.x},${coords.y}`;
              }).join(' ')}
              fill="none"
              stroke="#00f0ff"
              strokeWidth="2.5"
              strokeDasharray="6,4"
            />
          )}

          {/* DRONE MARKER (ANIMATED REAPER DRONE) */}
          <g 
            transform={`translate(${
              simState.isRunning 
                ? 140 + (simState.progressPercent / 100) * 500 
                : 450
            }, 260)`} 
            className="transition-transform duration-300"
          >
            {/* Dynamic Orientation Radar Wings */}
            <circle r="36" fill="none" stroke="#00f0ff" strokeWidth="0.8" opacity="0.5" strokeDasharray="3,3" />
            <circle r="72" fill="none" stroke="#00f0ff" strokeWidth="0.5" opacity="0.2" />

            {/* Vector Heading Arrow */}
            <line x1="0" y1="0" x2="35" y2="-35" stroke="#00e676" strokeWidth="2.5" />

            {/* Drone Icon Center */}
            <circle r="6" fill="#00f0ff" />
            <circle r="14" fill="none" stroke="#00f0ff" strokeWidth="1.5" className="animate-ping" />

            {/* Callsign Tag */}
            <rect x="18" y="-25" width="115" height="22" rx="3" fill="#0b1322" stroke="#00f0ff" strokeWidth="1" />
            <text x="24" y="-10" fill="#00f0ff" fontSize="10" fontFamily="monospace" fontWeight="bold">
              {activeDrone.callsign}
            </text>
          </g>

          {/* WAYPOINT MARKERS */}
          {showWaypointsLayer && waypoints.map((wp, idx) => {
            const coords = [
              { x: 140, y: 480 },
              { x: 240, y: 400 },
              { x: 360, y: 340 },
              { x: 450, y: 260 },
              { x: 560, y: 280 },
              { x: 680, y: 320 },
              { x: 140, y: 480 },
            ][idx] || { x: 300, y: 300 };

            return (
              <g 
                key={wp.id} 
                transform={`translate(${coords.x}, ${coords.y})`} 
                className="cursor-grab active:cursor-grabbing"
              >
                <circle r="12" fill={wp.completed ? '#00e67622' : '#ffb70022'} stroke={wp.completed ? '#00e676' : '#ffb700'} strokeWidth="2" />
                <text x="0" y="4" textAnchor="middle" fill={wp.completed ? '#00e676' : '#ffb700'} fontSize="10" fontFamily="monospace" fontWeight="bold">
                  {wp.id}
                </text>
                <rect x="-25" y="-24" width="50" height="14" rx="2" fill="#080d16" stroke={wp.completed ? '#00e676' : '#ffb700'} strokeWidth="0.8" />
                <text x="0" y="-14" textAnchor="middle" fill="#ffffff" fontSize="8" fontFamily="monospace">
                  {wp.alt}m AGL
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* TOP MAP CONTROL BAR & LAYER MANAGER */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-auto">
        {/* Left Status & Telemetry Badge */}
        <div className="flex items-center space-x-2 bg-[#090e18]/95 border border-[#1a2336] backdrop-blur-md px-3 py-1.5 rounded shadow-lg text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-slate-300 font-semibold uppercase">GIS & MISSION ENGINE</span>
          <span className="text-slate-600">|</span>
          <span className="text-cyan-400">LAT {activeDrone.lat.toFixed(4)} N</span>
          <span className="text-cyan-400">LON {activeDrone.lng.toFixed(4)} E</span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400 font-bold">{estimates.totalDistanceKm} KM ROUTE</span>
        </div>

        {/* Right Toolbar: Map Layers, Mission Save/Load, Interactive Modes */}
        <div className="flex items-center space-x-1.5 bg-[#090e18]/95 border border-[#1a2336] backdrop-blur-md p-1 rounded shadow-lg">
          {/* Layer Selector */}
          <div className="relative">
            <button
              onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#101726] border border-[#1e293b] text-slate-300 hover:text-cyan-400 text-[10px] font-mono"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>LAYER MANAGER</span>
            </button>

            {isLayerMenuOpen && (
              <div className="absolute top-8 right-0 w-52 bg-[#090e18] border border-[#1a2336] p-2 rounded shadow-2xl space-y-1.5 text-[10px] font-mono z-30">
                <div className="text-slate-400 font-bold uppercase border-b border-[#1a2336] pb-1">MAP BASE TILES</div>
                {(['TACTICAL_DARK', 'SATELLITE', 'TERRAIN', 'ROAD'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => { setMapMode(mode); setIsLayerMenuOpen(false); }}
                    className={`w-full text-left px-2 py-1 rounded transition-colors ${
                      mapMode === mode ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-300 hover:bg-[#131b2b]'
                    }`}
                  >
                    {mode.replace('_', ' ')}
                  </button>
                ))}

                <div className="text-slate-400 font-bold uppercase border-b border-[#1a2336] pt-1 pb-1">OVERLAY LAYERS</div>
                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={showWaypointsLayer} onChange={(e) => setShowWaypointsLayer(e.target.checked)} className="rounded" />
                  <span>Waypoints Layer</span>
                </label>
                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={showGeofence} onChange={(e) => setShowGeofence(e.target.checked)} className="rounded" />
                  <span>Geofence Polygons</span>
                </label>
                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} className="rounded" />
                  <span>HUD Tactical Grid</span>
                </label>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-[#1a2336] mx-0.5"></div>

          {/* Interactive Tools */}
          <button
            onClick={() => setInteractionMode(interactionMode === 'ADD_WAYPOINT' ? 'SELECT' : 'ADD_WAYPOINT')}
            className={`p-1.5 rounded text-[10px] font-mono flex items-center space-x-1 ${
              interactionMode === 'ADD_WAYPOINT' ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Add Waypoint on Click"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">ADD WP</span>
          </button>

          <button
            onClick={() => setInteractionMode(interactionMode === 'DRAW_GEOFENCE' ? 'SELECT' : 'DRAW_GEOFENCE')}
            className={`p-1.5 rounded text-[10px] font-mono flex items-center space-x-1 ${
              interactionMode === 'DRAW_GEOFENCE' ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Draw Polygon Geofence"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="hidden md:inline">GEOFENCE</span>
          </button>

          <button
            onClick={() => setInteractionMode(interactionMode === 'MEASURE_DISTANCE' ? 'SELECT' : 'MEASURE_DISTANCE')}
            className={`p-1.5 rounded text-[10px] font-mono flex items-center space-x-1 ${
              interactionMode === 'MEASURE_DISTANCE' ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Measure Linear Distance"
          >
            <Ruler className="w-3.5 h-3.5" />
            <span className="hidden md:inline">MEASURE</span>
          </button>

          <div className="h-4 w-px bg-[#1a2336] mx-0.5"></div>

          {/* Save / Load Mission Buttons */}
          <button
            onClick={handleSaveMission}
            className="p-1.5 rounded text-cyan-400 hover:bg-cyan-500/10 flex items-center space-x-1 text-[10px] font-mono"
            title="Export MAVLink / JSON Plan"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">SAVE</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded text-emerald-400 hover:bg-emerald-500/10 flex items-center space-x-1 text-[10px] font-mono"
            title="Import MAVLink Plan File"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">LOAD</span>
          </button>
        </div>
      </div>

      {/* FLOATING MISSION ESTIMATION & SIMULATION CONTROL BAR (Top-Right Overlay) */}
      <div className="absolute top-14 right-3 bg-[#080d16]/95 border border-[#1a2336] backdrop-blur-md p-2.5 rounded shadow-xl z-10 w-72 text-xs font-mono space-y-2 pointer-events-auto">
        <div className="flex items-center justify-between border-b border-[#1a2336] pb-1">
          <div className="flex items-center space-x-1.5 text-cyan-400 font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>MISSION ESTIMATION & SIM</span>
          </div>
          <span className="text-emerald-400 font-bold">{simState.progressPercent}%</span>
        </div>

        {/* Battery & Flight Time Metrics */}
        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          <div className="bg-[#0e1624] p-1.5 rounded border border-[#1e293b]">
            <span className="text-slate-500 block text-[8px]">EST FLIGHT TIME</span>
            <span className="text-cyan-300 font-bold">{estimates.estimatedFlightTimeMinutes} MINS</span>
          </div>
          <div className="bg-[#0e1624] p-1.5 rounded border border-[#1e293b]">
            <span className="text-slate-500 block text-[8px]">EST BATTERY DRAIN</span>
            <span className="text-amber-400 font-bold">{estimates.batteryConsumedPercent}% ({estimates.mahDrawEstimate}mAh)</span>
          </div>
        </div>

        {/* Mission Simulation Actions */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={handleToggleSimulation}
            className={`flex-1 py-1 px-2 rounded font-bold uppercase text-[10px] flex items-center justify-center space-x-1 mr-1 transition-colors ${
              simState.isRunning && !simState.isPaused
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}
          >
            {simState.isRunning && !simState.isPaused ? (
              <>
                <Pause className="w-3 h-3" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                <span>{simState.isPaused ? 'RESUME' : 'SIMULATE'}</span>
              </>
            )}
          </button>

          <button
            onClick={handleResetSimulation}
            className="p-1 rounded bg-[#101726] border border-[#1e293b] text-slate-400 hover:text-slate-200 mr-1"
            title="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Speed Multipliers */}
          <div className="flex space-x-0.5">
            {[1, 2, 5, 10].map((mult) => (
              <button
                key={mult}
                onClick={() => handleChangeSimSpeed(mult)}
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                  simState.multiplier === mult ? 'bg-cyan-500/30 text-cyan-300 font-bold' : 'text-slate-400'
                }`}
              >
                {mult}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FLOATING MEASUREMENT READOUT BADGE */}
      {(measuredDistance !== null || measuredArea !== null || drawingGeofencePoints.length > 0) && (
        <div className="absolute bottom-16 left-4 bg-[#090e18]/95 border border-amber-500/40 backdrop-blur-md p-2.5 rounded shadow-xl z-10 text-xs font-mono space-y-1">
          <div className="text-amber-400 font-bold text-[10px] uppercase border-b border-amber-500/20 pb-1 flex justify-between">
            <span>SPATIAL MEASUREMENT</span>
            <button onClick={handleClearMeasurement} className="text-slate-400 hover:text-slate-200">CLEAR</button>
          </div>
          {measuredDistance !== null && (
            <div className="text-slate-200">Distance: <span className="text-cyan-400 font-bold">{measuredDistance} km</span></div>
          )}
          {measuredArea !== null && (
            <div className="text-slate-200">Enclosed Area: <span className="text-emerald-400 font-bold">{measuredArea.areaSqMeters} m² ({measuredArea.hectares} ha)</span></div>
          )}
          {drawingGeofencePoints.length > 0 && (
            <div className="space-y-1">
              <div className="text-rose-400">Geofence Nodes: {drawingGeofencePoints.length}</div>
              <button 
                onClick={handleCompleteGeofence}
                className="w-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 py-0.5 rounded text-[9px] font-bold uppercase"
              >
                CLOSE GEOFENCE POLYGON
              </button>
            </div>
          )}
        </div>
      )}

      {/* FLOATING MAP NAVIGATION CONTROLS */}
      <div className="absolute bottom-4 right-4 flex flex-col space-y-1.5 z-10 pointer-events-auto">
        <button className="p-2 bg-[#090e18]/90 border border-[#1a2336] hover:border-cyan-500/50 text-slate-300 hover:text-cyan-400 rounded shadow-lg backdrop-blur-md">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button className="p-2 bg-[#090e18]/90 border border-[#1a2336] hover:border-cyan-500/50 text-slate-300 hover:text-cyan-400 rounded shadow-lg backdrop-blur-md">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button className="p-2 bg-[#090e18]/90 border border-[#1a2336] hover:border-cyan-500/50 text-slate-300 hover:text-cyan-400 rounded shadow-lg backdrop-blur-md">
          <Crosshair className="w-4 h-4 text-cyan-400" />
        </button>
      </div>
    </div>
  );
};
