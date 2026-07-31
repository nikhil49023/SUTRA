import React, { useState, useEffect } from 'react';
import { SwarmCommsPhysicsSim } from './components/SwarmCommsPhysicsSim';
import { DeepJsccComparisonWidget } from './components/DeepJsccComparisonWidget';
import { 
  Radio, 
  Activity, 
  ShieldCheck, 
  Eye, 
  Zap, 
  AlertTriangle, 
  MapPin, 
  Cpu, 
  RefreshCw, 
  Sliders, 
  Play, 
  Layers 
} from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PHYSICS_SIM' | 'DEEP_JSCC_BENCHMARK' | 'GIS_HUD'>('PHYSICS_SIM');
  const [targetAlerts, setTargetAlerts] = useState<any[]>([
    { id: 1, type: 'SURVIVOR', lat: 37.774731, lon: -122.419206, alt: 15.0, confidence: 0.942, drone: 'uav_alpha', time: '10:04:12' },
    { id: 2, type: 'POSSIBLE_SURVIVOR', lat: 37.775102, lon: -122.418850, alt: 18.2, confidence: 0.785, drone: 'uav_beta', time: '10:05:40' }
  ]);

  const [rtlTriggered, setRtlTriggered] = useState<boolean>(false);

  const handleTriggerRTL = () => {
    setRtlTriggered(true);
    setTimeout(() => {
      alert("🚨 EMERGENCY RETURN-TO-LAUNCH (RTL) DISPATCHED ACROSS ALL 5 SWARM DRONES!");
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
                PROJECT SUTRA — Swarm Tactical Command & Visual Pitch Dashboard
              </h1>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                Subsystem B & D: Dynamic Multi-Radio Mesh, SwarmRAFT Consensus, & 3D GIS Telemetry
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', backgroundColor: '#0f172a', borderRadius: '10px', padding: '4px', border: '1px solid #1e293b' }}>
            <button 
              onClick={() => setActiveTab('PHYSICS_SIM')}
              style={{
                backgroundColor: activeTab === 'PHYSICS_SIM' ? '#38bdf8' : 'transparent',
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
              <Activity size={16} /> 3D Wireless Physics Simulator
            </button>

            <button 
              onClick={() => setActiveTab('DEEP_JSCC_BENCHMARK')}
              style={{
                backgroundColor: activeTab === 'DEEP_JSCC_BENCHMARK' ? '#818cf8' : 'transparent',
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
              <Cpu size={16} /> Deep JSCC vs H.264 Benchmark
            </button>

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
              <Layers size={16} /> 3D Telemetry HUD & Alerts
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
        
        {/* Tab 1: 3D Real-World Wireless Physics Simulator */}
        {activeTab === 'PHYSICS_SIM' && <SwarmCommsPhysicsSim />}

        {/* Tab 2: Deep JSCC vs H.264 Codec Visual Benchmark */}
        {activeTab === 'DEEP_JSCC_BENCHMARK' && <DeepJsccComparisonWidget />}

        {/* Tab 3: 3D GIS Telemetry & Victim Stream HUD */}
        {activeTab === 'GIS_HUD' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
            
            {/* GIS Satellite Map Mockup */}
            <div style={{ backgroundColor: '#090d16', borderRadius: '16px', padding: '24px', border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                  🗺️ 3D Satellite Mission Reconnaissance View (WGS-84)
                </h2>
                <span style={{ fontSize: '12px', color: '#34d399', backgroundColor: 'rgba(52, 211, 153, 0.15)', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
                  ROSBridge Connected (ws://localhost:9090)
                </span>
              </div>

              <div style={{ position: 'relative', width: '100%', height: '480px', backgroundColor: '#020617', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e293b', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {/* 3D Map Grid Simulation */}
                <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                  <MapPin size={48} style={{ color: '#38bdf8', marginBottom: '12px' }} />
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>Disaster Zone Tactical Satellite Grid</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Origin: Lat 37.774929°, Lon -122.419416° | Altitude: 15.0m
                  </div>
                </div>

                {/* Target Pins */}
                {targetAlerts.map((t) => (
                  <div key={t.id} style={{ position: 'absolute', top: t.id === 1 ? '40%' : '65%', left: t.id === 1 ? '55%' : '35%', backgroundColor: '#ef4444', color: '#fff', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, boxShadow: '0 0 15px rgba(239, 68, 68, 0.6)' }}>
                    🚨 {t.type}: {t.confidence * 100}% | {t.drone}
                  </div>
                ))}
              </div>
            </div>

            {/* Target Stream Sidebar */}
            <div style={{ backgroundColor: '#090d16', borderRadius: '16px', padding: '24px', border: '1px solid #1e293b' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0', color: '#f8fafc' }}>
                🎯 Survivor Detection Alert Stream
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {targetAlerts.map((t) => (
                  <div key={t.id} style={{ backgroundColor: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 800, color: '#f87171', fontSize: '13px' }}>{t.type}</span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{t.time}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                      Confidence: <strong style={{ color: '#34d399' }}>{(t.confidence * 100).toFixed(1)}%</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                      WGS84: {t.lat.toFixed(6)}°, {t.lon.toFixed(6)}°
                    </div>
                    <div style={{ fontSize: '10px', color: '#38bdf8', marginTop: '6px' }}>
                      Detected by: {t.drone} via Tri-Modal AI Perception
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </main>

    </div>
  );
};

export default App;
