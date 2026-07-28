import React, { useState, useEffect } from 'react';

interface DroneTelemetry {
  id: string;
  lat: number;
  lng: number;
  alt: number;
  battery: number;
  status: 'ARMED' | 'DISARMED' | 'OFFBOARD' | 'RTL';
}

export function App() {
  const [drones, setDrones] = useState<DroneTelemetry[]>([
    { id: 'UAV_ALPHA', lat: 37.774929, lng: -122.419416, alt: 15.0, battery: 94, status: 'OFFBOARD' },
    { id: 'UAV_BRAVO', lat: 37.775100, lng: -122.418900, alt: 18.2, battery: 88, status: 'OFFBOARD' },
    { id: 'UAV_CHARLIE', lat: 37.774500, lng: -122.420100, alt: 12.5, battery: 91, status: 'OFFBOARD' },
  ]);

  return (
    <div style={{ fontFamily: 'sans-serif', background: '#0a0e17', color: '#e0e6ed', minHeight: '100vh', padding: '24px' }}>
      <header style={{ borderBottom: '1px solid #1e293b', pb: '16px', marginBottom: '24px' }}>
        <h1 style={{ color: '#38bdf8', margin: 0 }}>🛸 SUTRA 3D GIS Ground Control Station</h1>
        <p style={{ color: '#94a3b8', margin: '4px 0 0 0' }}>Subsystem D (Siva Kesava) — Real-Time Swarm Telemetry &amp; HUD</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ color: '#38bdf8' }}>Mapbox GL JS 3D Satellite Map Viewport</h3>
            <p style={{ color: '#64748b' }}>GPS Origin: San Francisco Digital Twin (37.774929°, -122.419416°)</p>
          </div>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#f8fafc' }}>Swarm Fleet Telemetry</h3>
          {drones.map((d) => (
            <div key={d.id} style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
              <div style={{ fontWeight: 'bold', color: '#38bdf8' }}>{d.id}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                Mode: <span style={{ color: '#4ade80' }}>{d.status}</span> | Batt: {d.battery}%
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                Alt: {d.alt}m | Lat: {d.lat.toFixed(4)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
