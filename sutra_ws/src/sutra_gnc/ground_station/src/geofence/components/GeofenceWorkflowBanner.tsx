import React from 'react';
import { 
  Check, 
  Hexagon, 
  Circle, 
  Route, 
  Dot, 
  ShieldCheck, 
  Plane, 
  FileCode2, 
  FileJson, 
  Compass, 
  SlidersHorizontal,
  AlertTriangle,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface GeofenceWorkflowBannerProps {
  onSelectStep?: (step: number) => void;
  activeStep?: number;
}

export const GeofenceWorkflowBanner: React.FC<GeofenceWorkflowBannerProps> = ({
  onSelectStep,
  activeStep = 1
}) => {
  const steps = [
    {
      step: 1,
      title: '1. DRAW',
      desc: 'Click on map to add vertices',
      svg: (
        <svg className="w-full h-24 bg-[#0a0f1d] rounded border border-cyan-900/30" viewBox="0 0 160 90">
          <path d="M 30 65 L 70 30 L 120 50" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="3,3" />
          <circle cx="30" cy="65" r="4" fill="#ffffff" stroke="#ef4444" strokeWidth="2" />
          <circle cx="70" cy="30" r="4" fill="#ffffff" stroke="#ef4444" strokeWidth="2" />
          <circle cx="120" cy="50" r="4" fill="#ef4444" />
          <path d="M 120 50 L 130 60" stroke="#06b6d4" strokeWidth="1.5" />
          <polygon points="120,50 128,48 126,56" fill="#06b6d4" />
        </svg>
      )
    },
    {
      step: 2,
      title: '2. PREVIEW',
      desc: 'Live preview with shaded area',
      svg: (
        <svg className="w-full h-24 bg-[#0a0f1d] rounded border border-cyan-900/30" viewBox="0 0 160 90">
          <polygon points="40,25 125,35 110,75 30,65" fill="rgba(239, 68, 68, 0.35)" stroke="#ef4444" strokeWidth="2" />
          <circle cx="40" cy="25" r="3" fill="#ffffff" />
          <circle cx="125" cy="35" r="3" fill="#ffffff" />
          <circle cx="110" cy="75" r="3" fill="#ffffff" />
          <circle cx="30" cy="65" r="3" fill="#ffffff" />
        </svg>
      )
    },
    {
      step: 3,
      title: '3. COMPLETE',
      desc: 'Polygon completed and saved',
      svg: (
        <svg className="w-full h-24 bg-[#0a0f1d] rounded border border-cyan-900/30" viewBox="0 0 160 90">
          <polygon points="35,25 125,30 115,75 25,60" fill="rgba(239, 68, 68, 0.45)" stroke="#ef4444" strokeWidth="2" />
          <rect x="25" y="66" width="75" height="18" rx="3" fill="#070c18" stroke="#ef4444" strokeWidth="0.8" />
          <text x="30" y="74" fill="#ffffff" fontSize="6.5" fontFamily="monospace">Area: 2.34 km²</text>
          <text x="30" y="81" fill="#94a3b8" fontSize="6" fontFamily="monospace">Perimeter: 6.78 km</text>
        </svg>
      )
    },
    {
      step: 4,
      title: '4. EDIT',
      desc: 'Drag vertices to reshape',
      svg: (
        <svg className="w-full h-24 bg-[#0a0f1d] rounded border border-cyan-900/30" viewBox="0 0 160 90">
          <polygon points="35,25 130,40 100,75 25,60" fill="rgba(239, 68, 68, 0.45)" stroke="#ef4444" strokeWidth="2" />
          <circle cx="130" cy="40" r="7" fill="none" stroke="#eab308" strokeWidth="1.5" strokeDasharray="2,2" />
          <circle cx="130" cy="40" r="4" fill="#eab308" />
          <path d="M 130 40 L 142 46" stroke="#eab308" strokeWidth="1.5" markerEnd="url(#arrow)" />
        </svg>
      )
    },
    {
      step: 5,
      title: '5. VALIDATE',
      desc: 'Mission path checked against geofences',
      svg: (
        <svg className="w-full h-24 bg-[#0a0f1d] rounded border border-cyan-900/30" viewBox="0 0 160 90">
          <polygon points="40,25 120,25 110,70 30,65" fill="rgba(239, 68, 68, 0.4)" stroke="#ef4444" strokeWidth="2" />
          <path d="M 15 80 L 70 45 L 145 20" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="4,4" />
          <circle cx="70" cy="45" r="8" fill="#ef4444" />
          <text x="67.5" y="50.5" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="sans-serif">!</text>
        </svg>
      )
    },
    {
      step: 6,
      title: '6. MONITOR',
      desc: 'Real-time drone position vs geofences',
      svg: (
        <svg className="w-full h-24 bg-[#0a0f1d] rounded border border-cyan-900/30" viewBox="0 0 160 90">
          <path d="M 20 50 Q 80 20 140 60" fill="none" stroke="#3b82f6" strokeWidth="16" strokeLinecap="round" opacity="0.35" />
          <path d="M 20 50 Q 80 20 140 60" fill="none" stroke="#60a5fa" strokeWidth="2" strokeDasharray="3,3" />
          {/* Quadcopter graphic */}
          <g transform="translate(80, 32)">
            <circle cx="0" cy="0" r="3" fill="#ffffff" />
            <line x1="-8" y1="-8" x2="8" y2="8" stroke="#06b6d4" strokeWidth="1.5" />
            <line x1="8" y1="-8" x2="-8" y2="8" stroke="#06b6d4" strokeWidth="1.5" />
            <circle cx="-8" cy="-8" r="3" fill="none" stroke="#22c55e" strokeWidth="1" />
            <circle cx="8" cy="-8" r="3" fill="none" stroke="#22c55e" strokeWidth="1" />
            <circle cx="-8" cy="8" r="3" fill="none" stroke="#22c55e" strokeWidth="1" />
            <circle cx="8" cy="8" r="3" fill="none" stroke="#22c55e" strokeWidth="1" />
          </g>
        </svg>
      )
    }
  ];

  return (
    <div className="w-full bg-[#060911] border-t border-[#1a2336] p-3 text-slate-200 select-none">
      {/* 1. TOP ROW: 6 WORKFLOW STEP CARDS */}
      <div className="grid grid-cols-6 gap-3 mb-3">
        {steps.map((s, idx) => (
          <div
            key={s.step}
            onClick={() => onSelectStep && onSelectStep(s.step)}
            className={`group relative flex flex-col p-2 rounded-lg bg-[#0b101d]/90 border transition-all duration-200 cursor-pointer ${
              activeStep === s.step
                ? 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.25)] bg-[#0f172a]'
                : 'border-[#1b263b] hover:border-cyan-700/50 hover:bg-[#11192b]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono font-bold text-cyan-400 group-hover:text-cyan-300">
                {s.title}
              </span>
              {idx < 5 && (
                <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-cyan-500 transition-colors" />
              )}
            </div>

            <div className="mb-1.5 overflow-hidden rounded">
              {s.svg}
            </div>

            <p className="text-[10px] text-slate-400 font-sans leading-tight line-clamp-1">
              {s.desc}
            </p>
          </div>
        ))}
      </div>

      {/* 2. BOTTOM ROW: 6 SUBSYSTEM CAPABILITY MATRICES */}
      <div className="grid grid-cols-6 gap-3 pt-3 border-t border-[#162032]">
        
        {/* COL 1: GEOMETRY TYPES */}
        <div className="flex flex-col bg-[#080d1a] border border-[#162032] p-2.5 rounded-lg">
          <div className="text-[11px] font-mono font-bold text-slate-300 tracking-wider mb-2 border-b border-[#162032] pb-1">
            GEOMETRY TYPES
          </div>
          <div className="space-y-1.5 text-[11px] font-mono">
            <div className="flex items-center space-x-2 text-red-400">
              <Hexagon className="w-3.5 h-3.5" />
              <span>Polygon</span>
            </div>
            <div className="flex items-center space-x-2 text-amber-400">
              <Circle className="w-3.5 h-3.5" />
              <span>Circle</span>
            </div>
            <div className="flex items-center space-x-2 text-blue-400">
              <Route className="w-3.5 h-3.5" />
              <span>Corridor</span>
            </div>
            <div className="flex items-center space-x-2 text-purple-400">
              <Dot className="w-4 h-4" />
              <span>Point</span>
            </div>
          </div>
        </div>

        {/* COL 2: FEATURES */}
        <div className="flex flex-col bg-[#080d1a] border border-[#162032] p-2.5 rounded-lg">
          <div className="text-[11px] font-mono font-bold text-slate-300 tracking-wider mb-2 border-b border-[#162032] pb-1">
            FEATURES
          </div>
          <div className="space-y-1 text-[10px] font-mono text-slate-300">
            <div className="flex items-center space-x-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Draw & Edit</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Multiple Geofence Types</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Altitude Limits</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Lock / Unlock</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Show / Hide</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Import / Export</span>
            </div>
          </div>
        </div>

        {/* COL 3: MEASUREMENTS */}
        <div className="flex flex-col bg-[#080d1a] border border-[#162032] p-2.5 rounded-lg relative overflow-hidden">
          <div className="text-[11px] font-mono font-bold text-slate-300 tracking-wider mb-2 border-b border-[#162032] pb-1">
            MEASUREMENTS
          </div>
          <div className="space-y-1 text-[10px] font-mono text-slate-300 z-10">
            <div className="flex items-center space-x-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Area (km² / ha)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Perimeter (m)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Altitude Range (m)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Vertex Count</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Length (Corridor)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Radius (Circle)</span>
            </div>
          </div>
          {/* Background Radar chart icon */}
          <div className="absolute right-1 bottom-1 opacity-20 text-cyan-400 pointer-events-none">
            <svg width="45" height="45" viewBox="0 0 100 100">
              <polygon points="50,10 90,40 75,90 25,90 10,40" fill="none" stroke="#06b6d4" strokeWidth="3" />
              <polygon points="50,25 75,45 65,80 35,80 25,45" fill="#06b6d4" opacity="0.4" />
            </svg>
          </div>
        </div>

        {/* COL 4: MISSION VALIDATION */}
        <div className="flex flex-col bg-[#080d1a] border border-[#162032] p-2.5 rounded-lg relative overflow-hidden">
          <div className="text-[11px] font-mono font-bold text-slate-300 tracking-wider mb-2 border-b border-[#162032] pb-1 flex items-center justify-between">
            <span>MISSION VALIDATION</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="space-y-1 text-[10px] font-mono text-slate-300 z-10">
            <div className="flex items-center space-x-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>No Fly Zone Check</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Altitude Compliance</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Corridor Compliance</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Warning Zone Alert</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Safe Zone Check</span>
            </div>
          </div>
        </div>

        {/* COL 5: DRONE MONITORING */}
        <div className="flex flex-col bg-[#080d1a] border border-[#162032] p-2.5 rounded-lg relative overflow-hidden">
          <div className="text-[11px] font-mono font-bold text-slate-300 tracking-wider mb-2 border-b border-[#162032] pb-1 flex items-center justify-between">
            <span>DRONE MONITORING</span>
            <Plane className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="space-y-1 text-[10px] font-mono text-slate-300 z-10">
            <div className="flex items-center space-x-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Point In Polygon</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Entry / Exit Detection</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Warning Alerts</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>RTL on Breach</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Real-time Tracking</span>
            </div>
          </div>
        </div>

        {/* COL 6: EXPORT / IMPORT */}
        <div className="flex flex-col bg-[#080d1a] border border-[#162032] p-2.5 rounded-lg">
          <div className="text-[11px] font-mono font-bold text-slate-300 tracking-wider mb-2 border-b border-[#162032] pb-1">
            EXPORT / IMPORT
          </div>
          <div className="space-y-1 text-[10px] font-mono text-slate-300">
            <div className="flex items-center space-x-1.5">
              <FileJson className="w-3 h-3 text-cyan-400" />
              <span>GeoJSON</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <FileCode2 className="w-3 h-3 text-amber-400" />
              <span>KML</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>QGroundControl</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Mission Planner</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
