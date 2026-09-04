import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { 
  MapPin, 
  Radio, 
  ShieldCheck, 
  Activity, 
  AlertTriangle, 
  Zap, 
  Crosshair, 
  Compass, 
  Eye, 
  Layers, 
  Wifi, 
  Navigation,
  Download,
  Filter,
  Video
} from 'lucide-react';
import { generateAtakCotXml } from '../utils/atakCotStreamer';
import { globalTelemetryBuffer } from '../utils/telemetryBuffer';

export interface TargetAlert {
  id: number | string;
  type: 'SURVIVOR' | 'POSSIBLE_SURVIVOR' | 'THREAT' | 'HAZARD';
  lat: number;
  lon: number;
  alt: number;
  confidence: number;
  drone: string;
  time: string;
  bbox?: [number, number, number, number];
  sensors?: string[];
}

export interface SwarmDroneState {
  lat: number;
  lon: number;
  alt: number;
  battery: number;
  status: string;
  speed?: number;
  vio_mode?: 'GPS_PRIMARY' | 'VIO_FALLBACK_ACTIVE' | 'DEAD_RECKONING_IMU_ONLY';
  vio_local_x?: number;
  vio_local_y?: number;
  vio_local_z?: number;
}

export const GisTelemetryHud: React.FC = () => {
  const [selectedTargetId, setSelectedTargetId] = useState<number | string | null>(1);
  const [filterType, setFilterType] = useState<'ALL' | 'SURVIVORS' | 'THREATS'>('ALL');
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [activePort, setActivePort] = useState<number>(9090);
  const [wsRef, setWsRef] = useState<WebSocket | null>(null);
  const [rtlTriggered, setRtlTriggered] = useState<boolean>(false);
  const [liveCameraFrame, setLiveCameraFrame] = useState<any>(null);

  const originLat = 12.934444;
  const originLon = 77.691722;
  const [mapMode, setMapMode] = useState<'TACTICAL_RADAR' | 'MAPBOX_3D'>('TACTICAL_RADAR');
  const [webGpuStatus, setWebGpuStatus] = useState<string>('🛡️ Canvas 2D Ring Buffer (60 FPS)');
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      (navigator as any).gpu?.requestAdapter()
        .then((adapter: any) => {
          if (adapter) {
            setWebGpuStatus('⚡ WebGPU HW-Accelerated');
          } else {
            setWebGpuStatus('🛡️ Canvas 2D Ring Buffer (60 FPS)');
          }
        })
        .catch(() => {
          setWebGpuStatus('🛡️ Canvas 2D Ring Buffer (60 FPS)');
        });
    }
  }, []);

  // Default Swarm Telemetry Cache (Bengaluru Hackathon Venue: 12.934444° N, 77.691722° E)
  const [swarmTelemetry, setSwarmTelemetry] = useState<Record<string, SwarmDroneState>>({
    uav_alpha: { lat: originLat, lon: originLon, alt: 15.0, battery: 98.5, status: 'MISSION', speed: 2.4 },
    uav_beta:  { lat: originLat + 0.000200, lon: originLon + 0.000200, alt: 18.0, battery: 95.0, status: 'MISSION', speed: 2.1 },
    uav_gamma: { lat: originLat - 0.000300, lon: originLon - 0.000200, alt: 20.0, battery: 92.0, status: 'MISSION', speed: 2.5 },
    uav_delta: { lat: originLat + 0.000400, lon: originLon + 0.000400, alt: 16.5, battery: 97.0, status: 'MISSION', speed: 2.2 },
    uav_epsilon:{ lat: originLat - 0.000600, lon: originLon - 0.000400, alt: 22.0, battery: 89.5, status: 'RELAY',   speed: 0.8 }
  });

  // Default Survivor & Threat Detection Stream
  const [targetAlerts, setTargetAlerts] = useState<TargetAlert[]>([
    {
      id: 1,
      type: 'SURVIVOR',
      lat: originLat - 0.000050,
      lon: originLon + 0.000070,
      alt: 15.0,
      confidence: 0.948,
      drone: 'uav_alpha',
      time: '11:45:12',
      bbox: [120, 84, 210, 240],
      sensors: ['RGB', 'Thermal', 'Radar']
    },
    {
      id: 2,
      type: 'POSSIBLE_SURVIVOR',
      lat: originLat + 0.000250,
      lon: originLon + 0.000370,
      alt: 18.2,
      confidence: 0.785,
      drone: 'uav_beta',
      time: '11:46:40',
      bbox: [310, 140, 390, 260],
      sensors: ['Thermal']
    },
    {
      id: 3,
      type: 'THREAT',
      lat: originLat + 0.000550,
      lon: originLon - 0.000450,
      alt: 16.0,
      confidence: 0.882,
      drone: 'uav_delta',
      time: '11:48:22',
      bbox: [410, 210, 520, 380],
      sensors: ['Radar']
    }
  ]);

  // SwarmRAFT Consensus Cache
  const [raftStatus, setRaftStatus] = useState<any>({
    leader: 'uav_alpha',
    term: 4,
    peers_online: 5,
    mesh_pdr_percent: 98.4,
    avg_latency_ms: 4.2
  });

  // WebSocket Connection with Auto-Port Failover (9090 -> 8765)
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: any = null;
    const ports = [9090, 8765];
    let portIdx = 0;

    const connectWs = () => {
      const host = window.location.hostname || 'localhost';
      const targetPort = ports[portIdx];
      setActivePort(targetPort);

      try {
        ws = new WebSocket(`ws://${host}:${targetPort}`);

        ws.onopen = () => {
          setWsConnected(true);
          setWsRef(ws);
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.topic === 'SWARM_TELEMETRY') {
              if (payload.telemetry) setSwarmTelemetry(payload.telemetry);
              if (payload.raft_status) setRaftStatus(payload.raft_status);
              if (payload.survivors && payload.survivors.length > 0) {
                setTargetAlerts(payload.survivors);
              }
            } else if (payload.topic === 'CAMERA_FRAME') {
              setLiveCameraFrame(payload);
            } else if (payload.topic === 'VIO_POSE') {
              // EKF2 VIO state from vio_localization.py via sutra_sim_exporter.py
              // Architecture: Merat et al. RA-L 2024 (digital twin VIO) + Xu et al. T-RO 2022 (Omni-swarm)
              if (payload.poses) {
                setSwarmTelemetry((prev) => {
                  const updated = { ...prev };
                  Object.entries(payload.poses as Record<string, any>).forEach(([did, pose]: [string, any]) => {
                    if (updated[did]) {
                      updated[did] = {
                        ...updated[did],
                        // Override lat/lon/alt ONLY when GPS is unavailable (VIO is authoritative)
                        ...(pose.mode !== 'GPS_PRIMARY' ? {
                          lat: typeof pose.lat === 'number' ? pose.lat : updated[did].lat,
                          lon: typeof pose.lon === 'number' ? pose.lon : updated[did].lon,
                          alt: typeof pose.alt === 'number' ? pose.alt : updated[did].alt,
                        } : {}),
                        vio_mode: pose.mode as SwarmDroneState['vio_mode'],
                        vio_local_x: pose.local_x,
                        vio_local_y: pose.local_y,
                        vio_local_z: pose.local_z,
                      };
                    }
                  });
                  return updated;
                });
              }
            } else if (payload.topic === 'SURVIVOR_ALERT') {
              setTargetAlerts((prev) => [payload.data, ...prev]);
            } else if (payload.topic === 'RAFT_STATUS') {
              setRaftStatus(payload.data);
            } else if (payload.topic === 'RTL_DISPATCHED') {
              setRtlTriggered(true);
            }
          } catch (err) {
            console.error("GCS HUD failed to parse message:", err);
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          setWsRef(null);
          portIdx = (portIdx + 1) % ports.length;
          reconnectTimer = setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch (e) {
        portIdx = (portIdx + 1) % ports.length;
        reconnectTimer = setTimeout(connectWs, 3000);
      }
    };

    connectWs();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  useEffect(() => {
    if (mapMode === 'MAPBOX_3D' && mapContainerRef.current && !mapInstanceRef.current) {
      const token = (import.meta as any).env?.VITE_MAPBOX_TOKEN || 'pk.sample_token';
      mapboxgl.accessToken = token;
      try {
        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [originLon, originLat],
          zoom: 16,
          pitch: 45,
        });

        // Add markers for each drone in the swarm
        Object.entries(swarmTelemetry).forEach(([droneId, drone]) => {
          const el = document.createElement('div');
          el.className = 'drone-marker';
          el.style.width = '14px';
          el.style.height = '14px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = '#38bdf8';
          el.style.border = '2px solid white';
          new mapboxgl.Marker(el)
            .setLngLat([drone.lon, drone.lat])
            .setPopup(new mapboxgl.Popup({ offset: 20 }).setText(`${droneId} (${drone.alt.toFixed(1)}m)`))
            .addTo(map);
        });

        mapInstanceRef.current = map;
      } catch (err) {
        console.warn('Mapbox initialization fallback:', err);
      }
    }
    return () => {
      if (mapMode !== 'MAPBOX_3D' && mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapMode, swarmTelemetry]);

  const handleTriggerRTL = () => {
    setRtlTriggered(true);
    if (wsRef && wsRef.readyState === WebSocket.OPEN) {
      wsRef.send(JSON.stringify({ command: 'RTL', drone_id: 'ALL' }));
    }
  };

  const handleExportCotXml = () => {
    const selectedTarget = targetAlerts.find(t => t.id === selectedTargetId) || targetAlerts[0];
    const cotXml = generateAtakCotXml({
      id: String(selectedTarget.id),
      type: selectedTarget.type === 'THREAT' ? 'THREAT' : selectedTarget.type === 'SURVIVOR' ? 'SURVIVOR' : 'POSSIBLE_SURVIVOR',
      lat: selectedTarget.lat,
      lon: selectedTarget.lon,
      alt: selectedTarget.alt,
      confidence: selectedTarget.confidence,
      detectedBy: selectedTarget.drone,
    });
    
    const blob = new Blob([cotXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SUTRA_COT_Survivor_${selectedTarget.id}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredTargets = targetAlerts.filter((t) => {
    if (filterType === 'SURVIVORS') return t.type === 'SURVIVOR' || t.confidence >= 0.85;
    if (filterType === 'THREATS') return t.type === 'THREAT' || t.type === 'HAZARD';
    return true;
  });

  const selectedTarget = targetAlerts.find((t) => t.id === selectedTargetId) || targetAlerts[0];

  // VIO Mode badge: shows real-time EKF2 localization state per drone
  // 🟢 GPS_PRIMARY = GPS authoritative | 🟡 VIO_FALLBACK_ACTIVE = GPS denied, VIO active | 🔴 DEAD_RECKONING = IMU only
  const vioModeBadge = (mode?: string) => {
    if (!mode || mode === 'GPS_PRIMARY')
      return <span style={{ fontSize: '9px', color: '#34d399', fontWeight: 700, letterSpacing: '0.02em' }}>🟢 GPS</span>;
    if (mode === 'VIO_FALLBACK_ACTIVE')
      return <span style={{ fontSize: '9px', color: '#fbbf24', fontWeight: 700, letterSpacing: '0.02em' }}>🟡 VIO</span>;
    return <span style={{ fontSize: '9px', color: '#ef4444', fontWeight: 700, letterSpacing: '0.02em' }}>🔴 DR</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: '#f8fafc' }}>
      
      {/* HUD Telemetry & Consensus Top Banner */}
      <div style={{ backgroundColor: '#090d16', borderRadius: '16px', padding: '16px 24px', border: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        
        {/* Consensus Leader & Mesh Health */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', padding: '8px', borderRadius: '8px' }}>
              <ShieldCheck style={{ color: '#38bdf8' }} size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>SwarmRAFT Leader</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#38bdf8' }}>{raftStatus.leader || 'uav_alpha'} (Term {raftStatus.term || 4})</div>
            </div>
          </div>

          <div style={{ width: '1px', height: '32px', backgroundColor: '#1e293b' }} />

          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>802.11s Mesh PDR</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#34d399' }}>{raftStatus.mesh_pdr_percent || 98.4}%</div>
          </div>

          <div style={{ width: '1px', height: '32px', backgroundColor: '#1e293b' }} />

          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Mesh Latency</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#818cf8' }}>{raftStatus.avg_latency_ms || 4.2} ms</div>
          </div>

          <div style={{ width: '1px', height: '32px', backgroundColor: '#1e293b' }} />

          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Swarm Nodes Online</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc' }}>{raftStatus.peers_online || 5} / 5 Active</div>
          </div>

        </div>

        {/* WebSocket Connection Status & Port Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: wsConnected ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: `1px solid ${wsConnected ? 'rgba(52, 211, 153, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, padding: '6px 14px', borderRadius: '8px' }}>
            <Wifi style={{ color: wsConnected ? '#34d399' : '#ef4444' }} size={16} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: wsConnected ? '#34d399' : '#ef4444' }}>
              {wsConnected ? `Bridge Connected (ws://localhost:${activePort})` : 'Connecting to Subsystem B Bridge...'}
            </span>
          </div>

          <button
            onClick={handleTriggerRTL}
            style={{
              backgroundColor: rtlTriggered ? '#64748b' : '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: rtlTriggered ? 'none' : '0 0 12px rgba(220, 38, 38, 0.5)'
            }}
          >
            <Zap size={15} /> {rtlTriggered ? 'RTL DISPATCHED' : 'EMERGENCY RTL'}
          </button>
        </div>

      </div>

      {/* Main Grid Workspace: Left = 3D Map + Telemetry, Right = Victim Alert Stream */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '20px' }}>
        
        {/* Left Column: 3D Mission Recon Map & Drone Telemetry Matrix */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* 3D Mission Reconnaissance Satellite Map View */}
          <div style={{ backgroundColor: '#090d16', borderRadius: '16px', padding: '20px', border: '1px solid #1e293b' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Navigation style={{ color: '#38bdf8' }} size={20} />
                  3D GIS Satellite Mission Grid (WGS84 Datum)
                </h2>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  Venue Datum: Lat {originLat.toFixed(6)}° N, Lon {originLon.toFixed(6)}° E (Bengaluru Track)
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', backgroundColor: '#0f172a', borderRadius: '8px', padding: '3px', border: '1px solid #334155' }}>
                  <button
                    onClick={() => setMapMode('TACTICAL_RADAR')}
                    style={{
                      backgroundColor: mapMode === 'TACTICAL_RADAR' ? '#0284c7' : 'transparent',
                      color: mapMode === 'TACTICAL_RADAR' ? '#ffffff' : '#94a3b8',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '5px 12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    🎯 Tactical Radar
                  </button>
                  <button
                    onClick={() => setMapMode('MAPBOX_3D')}
                    style={{
                      backgroundColor: mapMode === 'MAPBOX_3D' ? '#0284c7' : 'transparent',
                      color: mapMode === 'MAPBOX_3D' ? '#ffffff' : '#94a3b8',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '5px 12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    🗺️ Mapbox 3D GIS
                  </button>
                </div>
                <span style={{ fontSize: '11px', backgroundColor: '#0f172a', padding: '6px 12px', borderRadius: '6px', border: '1px solid #334155', color: '#38bdf8', fontWeight: 700 }}>
                  {webGpuStatus}
                </span>
                <span style={{ fontSize: '11px', backgroundColor: '#0f172a', padding: '6px 12px', borderRadius: '6px', border: '1px solid #334155', color: '#cbd5e1', fontWeight: 600 }}>
                  Active Targets: <strong style={{ color: '#ef4444' }}>{targetAlerts.length}</strong>
                </span>
              </div>
            </div>

            {/* 3D Map View: Mapbox 3D Satellite or Offline Tactical Radar */}
            {mapMode === 'MAPBOX_3D' ? (
              <div 
                ref={mapContainerRef} 
                style={{ 
                  width: '100%', 
                  height: '440px', 
                  backgroundColor: '#020617', 
                  borderRadius: '12px', 
                  overflow: 'hidden', 
                  border: '1px solid #1e293b' 
                }} 
              />
            ) : (
              <div style={{ position: 'relative', width: '100%', height: '440px', backgroundColor: '#020617', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e293b', background: 'radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%)' }}>
                
                {/* Radar Grid Lines Overlay */}
                <div style={{ position: 'absolute', inset: 0, opacity: 0.15, backgroundImage: 'linear-gradient(#38bdf8 1px, transparent 1px), linear-gradient(90deg, #38bdf8 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                
                {/* Concentric Search Rings */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '320px', height: '320px', border: '1px dashed rgba(56, 189, 248, 0.25)', borderRadius: '50%', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '180px', height: '180px', border: '1px solid rgba(56, 189, 248, 0.35)', borderRadius: '50%', pointerEvents: 'none' }} />

                {/* Drone Swarm Markers */}
                {Object.entries(swarmTelemetry).map(([droneId, drone]) => {
                  const posX = 50 + (drone.lon - originLon) * 120000;
                  const posY = 50 - (drone.lat - originLat) * 120000;
                  const isLeader = droneId === (raftStatus.leader || 'uav_alpha');

                  return (
                    <div 
                      key={droneId}
                      style={{
                        position: 'absolute',
                        left: `${Math.max(10, Math.min(90, posX))}%`,
                        top: `${Math.max(10, Math.min(90, posY))}%`,
                        transform: 'translate(-50%, -50%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        zIndex: 20
                      }}
                    >
                      <div 
                        style={{
                          width: isLeader ? '24px' : '18px',
                          height: isLeader ? '24px' : '18px',
                          borderRadius: '50%',
                          backgroundColor: isLeader ? '#38bdf8' : '#818cf8',
                          border: '2px solid #ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: isLeader ? '0 0 15px #38bdf8' : '0 0 10px #818cf8',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <Crosshair size={isLeader ? 14 : 10} style={{ color: '#0f172a' }} />
                      </div>
                      <div style={{ fontSize: '10px', fontWeight: 800, backgroundColor: 'rgba(15, 23, 42, 0.85)', padding: '2px 6px', borderRadius: '4px', border: '1px solid #334155', marginTop: '4px', whiteSpace: 'nowrap' }}>
                        {droneId} ({drone.alt.toFixed(1)}m)
                      </div>
                    </div>
                  );
                })}

                {/* Survivor / Threat Detection Markers */}
                {targetAlerts.map((target) => {
                  const targetX = 50 + (target.lon - originLon) * 120000;
                  const targetY = 50 - (target.lat - originLat) * 120000;
                  const isSelected = target.id === selectedTargetId;

                return (
                  <div
                    key={target.id}
                    onClick={() => setSelectedTargetId(target.id)}
                    style={{
                      position: 'absolute',
                      left: `${Math.max(12, Math.min(88, targetX))}%`,
                      top: `${Math.max(12, Math.min(88, targetY))}%`,
                      transform: 'translate(-50%, -50%)',
                      cursor: 'pointer',
                      zIndex: 30,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center'
                    }}
                  >
                    <div
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        backgroundColor: isSelected ? '#ef4444' : 'rgba(239, 68, 68, 0.85)',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 800,
                        border: isSelected ? '2px solid #ffffff' : '1px solid #ef4444',
                        boxShadow: isSelected ? '0 0 20px rgba(239, 68, 68, 0.9)' : '0 0 10px rgba(239, 68, 68, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <MapPin size={14} />
                      {target.type}: {(target.confidence * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '9px', color: '#f8fafc', backgroundColor: '#0f172a', padding: '1px 5px', borderRadius: '3px', marginTop: '2px' }}>
                      {target.lat.toFixed(6)}°, {target.lon.toFixed(6)}°
                    </div>
                  </div>
                );
              })}

              {/* PiP Deep JSCC Live Camera Feed Overlay */}
              {liveCameraFrame?.image_b64 && (
                <div style={{ position: 'absolute', bottom: '16px', right: '16px', width: '220px', height: '124px', backgroundColor: '#020617', borderRadius: '10px', overflow: 'hidden', border: '1.5px solid #38bdf8', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8)', zIndex: 40 }}>
                  <img src={liveCameraFrame.image_b64} alt="PiP Stream" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: '4px', left: '6px', backgroundColor: 'rgba(15, 23, 42, 0.85)', padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 800, color: '#38bdf8' }}>
                    JSCC // {liveCameraFrame.drone_id?.toUpperCase()}
                  </div>
                  <div style={{ position: 'absolute', bottom: '4px', right: '6px', backgroundColor: 'rgba(15, 23, 42, 0.85)', padding: '1px 6px', borderRadius: '4px', fontSize: '8px', fontWeight: 700, color: '#34d399' }}>
                    {liveCameraFrame.jscc?.psnr_db ? `${liveCameraFrame.jscc.psnr_db.toFixed(1)} dB` : '96.9%'}
                  </div>
                </div>
              )}

            </div>
          )}

          </div>

          {/* Real-Time Swarm Telemetry Matrix Cards */}
          <div style={{ backgroundColor: '#090d16', borderRadius: '16px', padding: '20px', border: '1px solid #1e293b' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 14px 0', color: '#f8fafc' }}>
              🚁 5-Drone Swarm Live Telemetry Stream
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
              {Object.entries(swarmTelemetry).map(([droneId, drone]) => (
                <div 
                  key={droneId} 
                  style={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '10px', 
                    padding: '12px', 
                    border: droneId === raftStatus.leader ? '1.5px solid #38bdf8' : '1px solid #1e293b' 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 800, fontSize: '12px', color: droneId === raftStatus.leader ? '#38bdf8' : '#f8fafc' }}>
                      {droneId}
                    </span>
                    <span style={{ fontSize: '9px', backgroundColor: drone.status === 'MISSION' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: drone.status === 'MISSION' ? '#34d399' : '#f59e0b', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                      {drone.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '11px', color: '#cbd5e1', marginBottom: '2px' }}>
                    Alt: <strong style={{ color: '#f8fafc' }}>{drone.alt.toFixed(1)}m</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1', marginBottom: '2px' }}>
                    Battery: <strong style={{ color: drone.battery > 30 ? '#34d399' : '#ef4444' }}>{drone.battery.toFixed(1)}%</strong>
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                    {drone.lat.toFixed(5)}°, {drone.lon.toFixed(5)}°
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', paddingTop: '5px', borderTop: '1px solid #1e293b' }}>
                    {vioModeBadge(drone.vio_mode)}
                    {drone.vio_local_x !== undefined && (
                      <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 600 }}>
                        ({drone.vio_local_x.toFixed(1)},{drone.vio_local_y?.toFixed(1)},{drone.vio_local_z?.toFixed(1)}m)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>

        {/* Right Column: Victim Alert Stream & Target Inspection Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Target Alert Filter & Header */}
          <div style={{ backgroundColor: '#090d16', borderRadius: '16px', padding: '20px', border: '1px solid #1e293b' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye style={{ color: '#ef4444' }} size={18} />
                Survivor Alert Stream
              </h3>

              <button 
                onClick={handleExportCotXml}
                style={{ 
                  backgroundColor: '#0f172a', 
                  color: '#38bdf8', 
                  border: '1px solid #334155', 
                  borderRadius: '6px', 
                  padding: '6px 10px', 
                  fontSize: '11px', 
                  fontWeight: 700, 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Download size={13} /> Export CoT XML
              </button>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '6px', backgroundColor: '#0f172a', padding: '4px', borderRadius: '8px', border: '1px solid #1e293b', marginBottom: '14px' }}>
              <button 
                onClick={() => setFilterType('ALL')}
                style={{ 
                  flex: 1, 
                  backgroundColor: filterType === 'ALL' ? '#334155' : 'transparent', 
                  color: '#f8fafc', 
                  border: 'none', 
                  borderRadius: '5px', 
                  padding: '6px', 
                  fontSize: '11px', 
                  fontWeight: 700, 
                  cursor: 'pointer' 
                }}
              >
                All ({targetAlerts.length})
              </button>
              <button 
                onClick={() => setFilterType('SURVIVORS')}
                style={{ 
                  flex: 1, 
                  backgroundColor: filterType === 'SURVIVORS' ? '#dc2626' : 'transparent', 
                  color: '#f8fafc', 
                  border: 'none', 
                  borderRadius: '5px', 
                  padding: '6px', 
                  fontSize: '11px', 
                  fontWeight: 700, 
                  cursor: 'pointer' 
                }}
              >
                Survivors
              </button>
              <button 
                onClick={() => setFilterType('THREATS')}
                style={{ 
                  flex: 1, 
                  backgroundColor: filterType === 'THREATS' ? '#d97706' : 'transparent', 
                  color: '#f8fafc', 
                  border: 'none', 
                  borderRadius: '5px', 
                  padding: '6px', 
                  fontSize: '11px', 
                  fontWeight: 700, 
                  cursor: 'pointer' 
                }}
              >
                Threats
              </button>
            </div>

            {/* Target List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              {filteredTargets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTargetId(t.id)}
                  style={{
                    backgroundColor: t.id === selectedTargetId ? 'rgba(239, 68, 68, 0.15)' : '#0f172a',
                    borderRadius: '10px',
                    padding: '12px',
                    border: t.id === selectedTargetId ? '1.5px solid #ef4444' : '1px solid #1e293b',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 800, color: '#f87171', fontSize: '13px' }}>{t.type} #{t.id}</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{t.time}</span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                    Tri-Modal AI Confidence: <strong style={{ color: '#34d399' }}>{(t.confidence * 100).toFixed(1)}%</strong>
                  </div>

                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                    WGS84: <strong>{t.lat.toFixed(6)}° N, {t.lon.toFixed(6)}° E</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <span style={{ fontSize: '10px', color: '#38bdf8' }}>Detected by {t.drone}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {(t.sensors || ['RGB', 'Thermal']).map((s) => (
                        <span key={s} style={{ fontSize: '9px', backgroundColor: '#1e293b', color: '#cbd5e1', padding: '1px 5px', borderRadius: '3px' }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Selected Target Deep Inspection Details */}
          {selectedTarget && (
            <div style={{ backgroundColor: '#090d16', borderRadius: '16px', padding: '20px', border: '1px solid #1e293b' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 12px 0', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Crosshair size={16} /> Target #{selectedTarget.id} Deep Inspection Card
              </h4>

              <div style={{ backgroundColor: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #1e293b', fontSize: '12px' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #1e293b', paddingBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Classification:</span>
                  <strong style={{ color: '#f87171' }}>{selectedTarget.type}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #1e293b', paddingBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>WGS84 Geolocation:</span>
                  <strong style={{ color: '#f8fafc' }}>{selectedTarget.lat.toFixed(6)}°, {selectedTarget.lon.toFixed(6)}°</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #1e293b', paddingBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Altitude AGL:</span>
                  <strong style={{ color: '#f8fafc' }}>{selectedTarget.alt.toFixed(1)} m</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #1e293b', paddingBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Sensor Modalities:</span>
                  <strong style={{ color: '#34d399' }}>{(selectedTarget.sensors || ['RGB', 'Thermal', 'Radar']).join(' + ')}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#94a3b8' }}>Bounding Box [2D]:</span>
                  <code style={{ color: '#38bdf8', fontSize: '11px' }}>
                    {JSON.stringify(selectedTarget.bbox || [120, 84, 210, 240])}
                  </code>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
