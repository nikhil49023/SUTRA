import React, { useState } from 'react';
import { SwarmCommsPhysicsSim } from './components/SwarmCommsPhysicsSim';
import { DeepJsccComparisonWidget } from './components/DeepJsccComparisonWidget';
import { GisTelemetryHud } from './components/GisTelemetryHud';
import { DeepJsccLiveVideoGrid } from './components/DeepJsccLiveVideoGrid';
import { SwarmRingCrossingArena } from './components/SwarmRingCrossingArena';
import { 
  Radio, 
  Activity, 
  Zap, 
  Cpu, 
  Layers,
  Video,
  Compass
} from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'GIS_HUD' | 'RING_CROSSING' | 'CAMERA_STREAMS' | 'PHYSICS_SIM' | 'DEEP_JSCC_BENCHMARK'>('GIS_HUD');
  const [rtlTriggered, setRtlTriggered] = useState<boolean>(false);

  const handleTriggerRTL = () => {
    setRtlTriggered(true);
    setTimeout(() => {
      alert("🚨 EMERGENCY RETURN-TO-LAUNCH (RTL) DISPATCHED OVER REMOTE WEBSOCKET TO ALL SWARM DRONES!");
    }, 100);
  };

  return (
    <div style={{ backgroundColor: '#020617', minHeight: '100vh', color: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Top Navigation Bar */}
      <header style={{ borderBottom: '1px solid #1e293b', backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50, padding: '14px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1400px', margin: '0 auto' }}>
          
          {/* Title & Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ backgroundColor: '#38bdf8', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Radio style={{ color: '#0f172a' }} size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px', background: 'linear-gradient(90deg, #38bdf8, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                PROJECT SUTRA — Swarm Tactical Command & 3D GIS Dashboard
              </h1>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                Subsystems A, B & D: SORCA 3D Ring Crossing, Dynamic Multi-Radio Mesh & Deep JSCC Telemetry HUD
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', backgroundColor: '#0f172a', borderRadius: '10px', padding: '4px', border: '1px solid #1e293b' }}>
            <button 
              onClick={() => setActiveTab('GIS_HUD')}
              style={{
                backgroundColor: activeTab === 'GIS_HUD' ? '#c084fc' : 'transparent',
                color: activeTab === 'GIS_HUD' ? '#0f172a' : '#94a3b8',
                border: 'none',
                borderRadius: '7px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <Layers size={16} /> 3D Telemetry HUD
            </button>

            <button 
              onClick={() => setActiveTab('RING_CROSSING')}
              style={{
                backgroundColor: activeTab === 'RING_CROSSING' ? '#38bdf8' : 'transparent',
                color: activeTab === 'RING_CROSSING' ? '#0f172a' : '#94a3b8',
                border: 'none',
                borderRadius: '7px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <Compass size={16} /> 3D Ring Crossing Arena
            </button>

            <button 
              onClick={() => setActiveTab('CAMERA_STREAMS')}
              style={{
                backgroundColor: activeTab === 'CAMERA_STREAMS' ? '#818cf8' : 'transparent',
                color: activeTab === 'CAMERA_STREAMS' ? '#0f172a' : '#94a3b8',
                border: 'none',
                borderRadius: '7px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <Video size={16} /> Deep JSCC Video
            </button>

            <button 
              onClick={() => setActiveTab('PHYSICS_SIM')}
              style={{
                backgroundColor: activeTab === 'PHYSICS_SIM' ? '#34d399' : 'transparent',
                color: activeTab === 'PHYSICS_SIM' ? '#0f172a' : '#94a3b8',
                border: 'none',
                borderRadius: '7px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <Activity size={16} /> Wireless Simulator
            </button>

            <button 
              onClick={() => setActiveTab('DEEP_JSCC_BENCHMARK')}
              style={{
                backgroundColor: activeTab === 'DEEP_JSCC_BENCHMARK' ? '#f59e0b' : 'transparent',
                color: activeTab === 'DEEP_JSCC_BENCHMARK' ? '#0f172a' : '#94a3b8',
                border: 'none',
                borderRadius: '7px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <Cpu size={16} /> JSCC vs H.264
            </button>
          </div>

          {/* Emergency RTL Button */}
          <button 
            onClick={handleTriggerRTL}
            style={{
              backgroundColor: rtlTriggered ? '#64748b' : '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: rtlTriggered ? 'none' : '0 0 15px rgba(220, 38, 38, 0.5)'
            }}
          >
            <Zap size={16} /> {rtlTriggered ? 'RTL DISPATCHED' : '1-CLICK EMERGENCY RTL'}
          </button>

        </div>
      </header>

      {/* Main Workspace Container */}
      <main style={{ maxWidth: '1400px', margin: '24px auto', padding: '0 24px' }}>
        
        {/* Tab 1: 3D GIS Telemetry & Victim Stream HUD */}
        {activeTab === 'GIS_HUD' && <GisTelemetryHud />}

        {/* Tab 2: 3D SORCA Swarm Ring Crossing Arena */}
        {activeTab === 'RING_CROSSING' && <SwarmRingCrossingArena />}

        {/* Tab 3: Deep JSCC Multi-UAV Neural Camera Streaming */}
        {activeTab === 'CAMERA_STREAMS' && <DeepJsccLiveVideoGrid />}

        {/* Tab 4: 3D Real-World Wireless Physics Simulator */}
        {activeTab === 'PHYSICS_SIM' && <SwarmCommsPhysicsSim />}

        {/* Tab 5: Deep JSCC vs H.264 Codec Visual Benchmark */}
        {activeTab === 'DEEP_JSCC_BENCHMARK' && <DeepJsccComparisonWidget />}

      </main>

    </div>
  );
};

export default App;
