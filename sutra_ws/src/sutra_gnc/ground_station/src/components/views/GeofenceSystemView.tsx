import React, { useState, useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
  Shield, 
  Wifi, 
  Battery, 
  Navigation, 
  Layers, 
  Compass, 
  Plus, 
  Minus, 
  Crosshair, 
  Activity,
  CheckCircle2,
  Lock,
  Eye,
  Sliders,
  Plane
} from 'lucide-react';

import GeofenceRenderer from '../../geofence/components/GeofenceRenderer';
import GeofenceToolbar from '../../geofence/components/GeofenceToolbar';
import GeofenceEditor from '../../geofence/components/GeofenceEditor';
import GeofenceSidebar from '../../geofence/components/GeofenceSidebar';
import { GeofenceWorkflowBanner } from '../../geofence/components/GeofenceWorkflowBanner';
import GeofenceManagementPanel from '../../geofence/components/GeofenceManagementPanel';
import { geofenceStore } from '../../geofence/store/GeofenceStore';
import { GeofenceService } from '../../geofence/services/GeofenceService';
import { GeofenceController } from '../../geofence/controllers/GeofenceController';
import { ZoneType, GeometryType } from '../../geofence/types/GeofenceTypes';
import type { DroneAsset, TelemetryData } from '../../types';

interface GeofenceSystemViewProps {
  activeDrone?: DroneAsset;
  telemetry?: TelemetryData;
}

export const GeofenceSystemView: React.FC<GeofenceSystemViewProps> = ({
  activeDrone,
  telemetry
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [is3D, setIs3D] = useState(false);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(1);
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  // Initialize MapLibre Map with Satellite Tiles
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'satellite-tiles': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            attribution: 'Esri, Maxar, Earthstar Geographics'
          }
        },
        layers: [
          {
            id: 'satellite-layer',
            type: 'raster',
            source: 'satellite-tiles',
            minzoom: 0,
            maxzoom: 20
          }
        ]
      },
      center: [45.1082, 34.5225], // Sector 4-B coordinates from GCS
      zoom: 14,
      pitch: 0,
      bearing: 0
    });

    map.on('load', () => {
      mapRef.current = map;
      setMapLoaded(true);

      // Seed initial default reference geofences if empty
      const existing = geofenceStore.getState().collection.features;
      if (existing.length === 0) {
        const nf = GeofenceService.createGeofence({
          name: "No Fly Zone",
          type: ZoneType.NO_FLY,
          geometryType: GeometryType.POLYGON,
          altitudeMin: 0,
          altitudeMax: 120,
          vertices: [
            [45.080, 34.538],
            [45.102, 34.542],
            [45.098, 34.515],
            [45.078, 34.518]
          ],
          color: "#ef4444"
        });

        GeofenceService.createGeofence({
          name: "Warning Zone",
          type: ZoneType.WARNING,
          geometryType: GeometryType.CIRCLE,
          altitudeMin: 0,
          altitudeMax: 150,
          vertices: [[45.108, 34.538]],
          radiusMeters: 500,
          color: "#f59e0b"
        });

        GeofenceService.createGeofence({
          name: "Safe Zone",
          type: ZoneType.SAFE,
          geometryType: GeometryType.POLYGON,
          altitudeMin: 0,
          altitudeMax: 200,
          vertices: [
            [45.118, 34.538],
            [45.136, 34.536],
            [45.132, 34.520],
            [45.115, 34.518]
          ],
          color: "#10b981"
        });

        GeofenceService.createGeofence({
          name: "Corridor",
          type: ZoneType.CORRIDOR,
          geometryType: GeometryType.CORRIDOR,
          altitudeMin: 50,
          altitudeMax: 120,
          vertices: [
            [45.092, 34.510],
            [45.108, 34.513],
            [45.125, 34.516]
          ],
          corridorWidthMeters: 250,
          color: "#3b82f6"
        });

        if (nf) {
          GeofenceController.selectGeofence(nf.properties.id);
        }
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Toggle 3D Pitch
  const handleToggle3D = () => {
    if (!mapRef.current) return;
    if (is3D) {
      mapRef.current.easeTo({ pitch: 0, bearing: 0, duration: 800 });
      setIs3D(false);
    } else {
      mapRef.current.easeTo({ pitch: 55, bearing: -20, duration: 800 });
      setIs3D(true);
    }
  };

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleRecenter = () => mapRef.current?.flyTo({ center: [45.1082, 34.5225], zoom: 14 });

  return (
    <div className="flex flex-col h-full w-full bg-[#050811] text-slate-200 overflow-hidden select-none font-sans relative">
      
      {/* 1. TOP HEADER STATUS BAR (Matching Reference Image Header) */}
      <header className="h-12 bg-[#080d1a] border-b border-[#1b253b] px-4 flex items-center justify-between shrink-0 z-30">
        {/* Left: Branding & Title */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-cyan-500/20 border border-cyan-400 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <span className="font-bold text-sm tracking-wider text-white">SMART HORIZON</span>
          </div>

          <div className="h-4 w-[1px] bg-slate-800" />

          <div className="flex items-center space-x-2 font-mono">
            <span className="text-xs font-bold text-slate-200">SMART HORIZON GCS – GEOFENCE SYSTEM</span>
            <span className="text-[10px] text-cyan-400 tracking-widest uppercase font-semibold">
              DRAW • EDIT • VALIDATE • MONITOR
            </span>
          </div>
        </div>

        {/* Right: Telemetry & Arming Pills */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          {/* GPS */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#0e1626] border border-slate-800">
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400 text-[10px]">GPS</span>
            <span className="text-emerald-400 font-bold">20</span>
            <span className="text-slate-500 text-[10px]">12.1</span>
          </div>

          {/* BATTERY */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#0e1626] border border-slate-800">
            <Battery className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400 text-[10px]">BATTERY</span>
            <span className="text-emerald-400 font-bold">91%</span>
          </div>

          {/* LINK */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#0e1626] border border-slate-800">
            <Wifi className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400 text-[10px]">LINK</span>
            <span className="text-emerald-400 font-bold">Strong</span>
          </div>

          {/* ALT */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#0e1626] border border-slate-800">
            <span className="text-slate-400 text-[10px]">ALT</span>
            <span className="text-white font-bold">125 m</span>
          </div>

          {/* MODE */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#0e1626] border border-slate-800">
            <span className="text-slate-400 text-[10px]">MODE</span>
            <span className="text-cyan-400 font-bold">AUTO</span>
          </div>

          {/* MANAGEMENT CONSOLE */}
          <button 
            onClick={() => setIsManagerOpen(true)}
            className="px-3 py-1 rounded bg-cyan-600/90 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 hover:bg-cyan-500 transition-colors flex items-center space-x-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>CONSOLE</span>
          </button>

          {/* ARMED */}
          <button className="px-3 py-1 rounded bg-emerald-500 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-colors">
            ARMED
          </button>
        </div>
      </header>

      {/* 2. MAIN CENTER BODY (MAP + RIGHT SIDEBAR) */}
      <div className="flex-1 flex relative overflow-hidden">
        
        {/* CENTER MAP CONTAINER */}
        <div className="flex-1 relative h-full">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Render Geofence Map Libre Layers */}
          {mapLoaded && mapRef.current && (
            <GeofenceRenderer map={mapRef.current} />
          )}

          {/* Floating Geofence Tools Box (Top-Left of Map) */}
          <GeofenceToolbar onOpenManager={() => setIsManagerOpen(true)} />

          {/* Floating Geofence Editor Box (Bottom-Left of Map) */}
          <GeofenceEditor />

          {/* Floating Right Map Navigation Controls */}
          <div className="absolute right-4 top-4 flex flex-col gap-1.5 z-30 font-mono">
            <button
              onClick={handleToggle3D}
              className={`w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center border backdrop-blur-md transition-all ${
                is3D 
                  ? 'bg-cyan-500 text-black border-cyan-400 shadow-lg shadow-cyan-500/30' 
                  : 'bg-[#080d1a]/90 text-slate-300 border-[#1b253b] hover:bg-[#121c33]'
              }`}
              title="Toggle 3D Pitch View"
            >
              3D
            </button>
            <button
              onClick={() => mapRef.current?.easeTo({ bearing: 0 })}
              className="w-9 h-9 rounded-lg bg-[#080d1a]/90 text-slate-300 border border-[#1b253b] hover:bg-[#121c33] flex items-center justify-center"
              title="Reset North Orientation"
            >
              <Compass className="w-4 h-4 text-cyan-400" />
            </button>
            <button
              onClick={handleZoomIn}
              className="w-9 h-9 rounded-lg bg-[#080d1a]/90 text-slate-300 border border-[#1b253b] hover:bg-[#121c33] flex items-center justify-center"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="w-9 h-9 rounded-lg bg-[#080d1a]/90 text-slate-300 border border-[#1b253b] hover:bg-[#121c33] flex items-center justify-center"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={handleRecenter}
              className="w-9 h-9 rounded-lg bg-[#080d1a]/90 text-slate-300 border border-[#1b253b] hover:bg-[#121c33] flex items-center justify-center"
            >
              <Crosshair className="w-4 h-4 text-emerald-400" />
            </button>
          </div>

          {/* Scale Bar Graphic (Bottom-Left) */}
          <div className="absolute left-80 bottom-4 bg-[#080d1a]/80 border border-[#1b253b] backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-mono text-slate-400 flex items-center space-x-3 pointer-events-none">
            <span>0</span>
            <div className="w-16 h-[2px] bg-slate-400 relative">
              <div className="absolute left-0 top-[-2px] w-[1px] h-2 bg-slate-400" />
              <div className="absolute right-0 top-[-2px] w-[1px] h-2 bg-slate-400" />
            </div>
            <span>750 m</span>
          </div>

        </div>

        {/* RIGHT SIDEBAR (Full height GEOFENCE LIST & DETAILS card) */}
        <div className="w-[340px] h-full shrink-0 border-l border-[#1b253b] bg-[#070b16] z-30 overflow-y-auto">
          <GeofenceSidebar />
        </div>

      </div>

      {/* 3. BOTTOM WORKFLOW & FEATURE MATRIX BANNER */}
      <div className="shrink-0 z-30">
        <GeofenceWorkflowBanner 
          activeStep={activeWorkflowStep} 
          onSelectStep={(s) => setActiveWorkflowStep(s)} 
        />
      </div>

      {/* 4. MANAGEMENT CONSOLE MODAL */}
      <GeofenceManagementPanel 
        isOpen={isManagerOpen} 
        onClose={() => setIsManagerOpen(false)} 
      />

    </div>
  );
};
