import React, { useState, useEffect, useRef, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DroneTelemetry {
  id: string;
  lat: number;
  lng: number;
  alt: number;
  battery: number;
  status: 'ARMED' | 'DISARMED' | 'OFFBOARD' | 'RTL';
  vx?: number;
  vy?: number;
  vz?: number;
}

/** Shape of each target from /sutra/perception/targets (Subsystem C output) */
interface SurvivorTarget {
  id: number;
  label: 'SURVIVOR' | 'POSSIBLE_SURVIVOR' | 'THREAT' | 'UNKNOWN';
  confidence: number;
  lat: number;
  lon: number;
  alt: number;
  modalities: string[];
  ts: number;
}

interface MeshStatus {
  subsystem: string;
  peer_links: Record<string, { distance_m: number; snr_db: number; packet_loss_pct: number; latency_ms: number }>;
  gate_g2_audit: { status: string; max_measured_latency_ms: number; max_measured_packet_loss_pct: number };
}

// ── ROS2 Bridge (rosbridge WebSocket) ────────────────────────────────────────
const ROS_BRIDGE_URL = 'ws://localhost:9090';

function useROSBridge() {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef<Map<string, (msg: unknown) => void>>(new Map());

  useEffect(() => {
    const connect = () => {
      try {
        const ws = new WebSocket(ROS_BRIDGE_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
          console.log('✅ ROS Bridge connected');
          // Subscribe to Subsystem C targets
          ws.send(JSON.stringify({ op: 'subscribe', topic: '/sutra/perception/targets', type: 'std_msgs/String' }));
          // Subscribe to Subsystem B mesh status
          ws.send(JSON.stringify({ op: 'subscribe', topic: '/sutra/swarm/mesh_status', type: 'std_msgs/String' }));
          // Subscribe to drone odometry
          ws.send(JSON.stringify({ op: 'subscribe', topic: '/sutra/gnc/pose', type: 'std_msgs/String' }));
        };

        ws.onmessage = (event) => {
          try {
            const packet = JSON.parse(event.data);
            const handler = handlersRef.current.get(packet.topic);
            if (handler && packet.msg) handler(packet.msg);
          } catch (_) {}
        };

        ws.onclose = () => {
          setConnected(false);
          setTimeout(connect, 3000); // auto-reconnect
        };

        ws.onerror = () => ws.close();
      } catch (_) {
        setTimeout(connect, 3000);
      }
    };

    connect();
    return () => { wsRef.current?.close(); };
  }, []);

  const subscribe = useCallback((topic: string, handler: (msg: unknown) => void) => {
    handlersRef.current.set(topic, handler);
  }, []);

  const publish = useCallback((topic: string, type: string, data: unknown) => {
    wsRef.current?.send(JSON.stringify({ op: 'publish', topic, type, msg: { data: JSON.stringify(data) } }));
  }, []);

  return { connected, subscribe, publish };
}

// ── Colours & utilities ───────────────────────────────────────────────────────

const LABEL_COLOUR: Record<string, string> = {
  SURVIVOR:          '#22c55e',
  POSSIBLE_SURVIVOR: '#f59e0b',
  THREAT:            '#ef4444',
  UNKNOWN:           '#94a3b8',
};

const LABEL_ICON: Record<string, string> = {
  SURVIVOR:          '🟢',
  POSSIBLE_SURVIVOR: '🟡',
  THREAT:            '🔴',
  UNKNOWN:           '⚪',
};

const DRONE_COLOURS = ['#38bdf8', '#818cf8', '#f472b6', '#34d399', '#fb923c'];

function timeAgo(ts: number): string {
  const s = Math.floor(Date.now() / 1000 - ts);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  return `${Math.floor(s/3600)}h ago`;
}

// ── Mock data (used when ROS bridge is offline) ───────────────────────────────

const MOCK_DRONES: DroneTelemetry[] = [
  { id: 'UAV_ALPHA',   lat: 37.774929, lng: -122.419416, alt: 15.0, battery: 94, status: 'OFFBOARD', vx: 2.0, vy: 1.2, vz: 0.5 },
  { id: 'UAV_BRAVO',   lat: 37.775100, lng: -122.418900, alt: 18.2, battery: 88, status: 'OFFBOARD', vx: 1.5, vy: 0.8, vz: 0.0 },
  { id: 'UAV_CHARLIE', lat: 37.774500, lng: -122.420100, alt: 12.5, battery: 91, status: 'OFFBOARD', vx: 0.0, vy: 2.0, vz: 0.3 },
];

const MOCK_TARGETS: SurvivorTarget[] = [
  { id: 1, label: 'SURVIVOR',          confidence: 0.886, lat: 37.774898, lon: -122.419544, alt: 15.0, modalities: ['visual','thermal','radar'], ts: Date.now()/1000 - 12 },
  { id: 2, label: 'POSSIBLE_SURVIVOR', confidence: 0.512, lat: 37.775200, lon: -122.419100, alt: 15.0, modalities: ['thermal'],                  ts: Date.now()/1000 - 45 },
  { id: 3, label: 'THREAT',            confidence: 0.711, lat: 37.774300, lon: -122.420200, alt: 15.0, modalities: ['visual'],                    ts: Date.now()/1000 - 88 },
];

// ── Main App ──────────────────────────────────────────────────────────────────

export function App() {
  const [drones,       setDrones]       = useState<DroneTelemetry[]>(MOCK_DRONES);
  const [targets,      setTargets]      = useState<SurvivorTarget[]>(MOCK_TARGETS);
  const [mesh,         setMesh]         = useState<MeshStatus | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<SurvivorTarget | null>(null);
  const [rtlConfirm,   setRtlConfirm]   = useState(false);
  const [alertLog,     setAlertLog]     = useState<string[]>(['System initialised', 'Waiting for swarm telemetry...']);

  const { connected, subscribe, publish } = useROSBridge();

  // ── Wire up ROS2 topics ──────────────────────────────────────────────────────

  useEffect(() => {
    // /sutra/perception/targets → Subsystem C survivor alerts
    subscribe('/sutra/perception/targets', (msg: unknown) => {
      try {
        const parsed = JSON.parse((msg as {data: string}).data);
        if (parsed.targets) {
          setTargets(parsed.targets);
          parsed.targets.forEach((t: SurvivorTarget) => {
            setAlertLog(prev => [
              `${LABEL_ICON[t.label]} ${t.label} @ (${t.lat.toFixed(5)}, ${t.lon.toFixed(5)}) conf=${t.confidence.toFixed(2)}`,
              ...prev.slice(0, 49),
            ]);
          });
        }
      } catch (_) {}
    });

    // /sutra/swarm/mesh_status → Subsystem B comms
    subscribe('/sutra/swarm/mesh_status', (msg: unknown) => {
      try {
        setMesh(JSON.parse((msg as {data: string}).data));
      } catch (_) {}
    });

    // /sutra/gnc/pose → Subsystem A drone positions
    subscribe('/sutra/gnc/pose', (msg: unknown) => {
      try {
        const pose = JSON.parse((msg as {data: string}).data);
        setDrones(prev => prev.map(d =>
          d.id === 'UAV_ALPHA'
            ? { ...d, lat: pose.lat, lng: pose.lon, alt: pose.alt }
            : d
        ));
      } catch (_) {}
    });
  }, [subscribe]);

  // ── Emergency RTL ────────────────────────────────────────────────────────────
  const triggerRTL = () => {
    if (!rtlConfirm) { setRtlConfirm(true); return; }
    publish('/sutra/gnc/rtl_command', 'std_msgs/String', { command: 'RTL_ALL', ts: Date.now()/1000 });
    setAlertLog(prev => ['🚨 EMERGENCY RTL ISSUED — All drones returning home', ...prev]);
    setRtlConfirm(false);
  };

  // ── Styles ───────────────────────────────────────────────────────────────────
  const s: Record<string, React.CSSProperties> = {
    root:     { fontFamily: "'Inter', 'Segoe UI', sans-serif", background: '#060b14', color: '#e2e8f0', minHeight: '100vh', display: 'flex', flexDirection: 'column' },
    header:   { background: '#0a1628', borderBottom: '1px solid #1e3a5f', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    title:    { margin: 0, fontSize: 20, fontWeight: 700, color: '#38bdf8', letterSpacing: '0.5px' },
    badge:    (ok: boolean): React.CSSProperties => ({ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: ok ? '#14532d' : '#450a0a', color: ok ? '#4ade80' : '#f87171', fontWeight: 600 }),
    body:     { flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', gap: 0, overflow: 'hidden', height: 'calc(100vh - 53px)' },
    map:      { background: '#0d1b2a', position: 'relative', overflow: 'hidden' },
    sidebar:  { background: '#080e1a', borderLeft: '1px solid #1e3a5f', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    section:  { borderBottom: '1px solid #1e3a5f', padding: '14px 16px' },
    sLabel:   { fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '1.5px', textTransform: 'uppercase' as const, marginBottom: 10 },
    card:     { background: '#0f1f35', border: '1px solid #1e3a5f', borderRadius: 8, padding: '10px 12px', marginBottom: 8, cursor: 'pointer', transition: 'border-color 0.15s' },
    rtl:      { margin: '14px 16px', padding: '10px', borderRadius: 8, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', width: 'calc(100% - 32px)', letterSpacing: '0.5px' },
  };

  // ── Fake map canvas with SVG pins ────────────────────────────────────────────
  // (Mapbox GL JS would go here with a real token — this is the wire-up layer)
  const MAP_BOUNDS = { latMin: 37.773, latMax: 37.776, lonMin: -122.422, lonMax: -122.417 };
  const toXY = (lat: number, lon: number, w: number, h: number) => ({
    x: ((lon - MAP_BOUNDS.lonMin) / (MAP_BOUNDS.lonMax - MAP_BOUNDS.lonMin)) * w,
    y: h - ((lat - MAP_BOUNDS.latMin) / (MAP_BOUNDS.latMax - MAP_BOUNDS.latMin)) * h,
  });

  return (
    <div style={s.root}>
      {/* ── Header ── */}
      <header style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={s.title}>🛸 SUTRA — Ground Control Station</h1>
          <span style={{ fontSize: 12, color: '#64748b' }}>Subsystem D (Siva Kesava) · 3D GIS Telemetry HUD</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={s.badge(connected)}>● {connected ? 'ROS2 LIVE' : 'SIM MODE'}</span>
          <span style={s.badge(targets.some(t => t.label === 'SURVIVOR'))}>
            🎯 {targets.filter(t => t.label === 'SURVIVOR').length} SURVIVORS
          </span>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      </header>

      <div style={s.body}>
        {/* ── Map viewport ── */}
        <div style={s.map}>
          {/* Map background — replace inner div with <Map> from react-map-gl for real Mapbox */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 60%, #0a2540 0%, #060b14 80%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
              {/* Grid lines */}
              {Array.from({ length: 10 }, (_, i) => (
                <g key={i}>
                  <line x1={`${i * 10}%`} y1="0" x2={`${i * 10}%`} y2="100%" stroke="#0e2040" strokeWidth="1" />
                  <line x1="0" y1={`${i * 10}%`} x2="100%" y2={`${i * 10}%`} stroke="#0e2040" strokeWidth="1" />
                </g>
              ))}
              {/* Survivor / Threat pins from Subsystem C */}
              {targets.map(t => {
                const el = document.querySelector('#map-svg');
                const w = el?.clientWidth || 800;
                const h = el?.clientHeight || 500;
                const { x, y } = toXY(t.lat, t.lon, w, h);
                const col = LABEL_COLOUR[t.label];
                return (
                  <g key={t.id} onClick={() => setSelectedTarget(t)} style={{ cursor: 'pointer' }}>
                    <circle cx={x} cy={y} r={14} fill={col} opacity={0.2} />
                    <circle cx={x} cy={y} r={7}  fill={col} opacity={0.9} />
                    <circle cx={x} cy={y} r={7}  fill="none" stroke={col} strokeWidth={1.5}>
                      <animate attributeName="r" from="7" to="20" dur="1.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                    <text x={x + 10} y={y - 8} fill={col} fontSize={10} fontWeight="600">{t.label} {(t.confidence * 100).toFixed(0)}%</text>
                  </g>
                );
              })}
              {/* Drone positions from Subsystem A */}
              {drones.map((d, i) => {
                const el = document.querySelector('#map-svg');
                const w = el?.clientWidth || 800;
                const h = el?.clientHeight || 500;
                const { x, y } = toXY(d.lat, d.lng, w, h);
                const col = DRONE_COLOURS[i % DRONE_COLOURS.length];
                return (
                  <g key={d.id}>
                    <polygon
                      points={`${x},${y - 10} ${x - 7},${y + 6} ${x + 7},${y + 6}`}
                      fill={col} opacity={0.9}
                    />
                    <text x={x + 10} y={y} fill={col} fontSize={9}>{d.id} {d.alt.toFixed(0)}m</text>
                  </g>
                );
              })}
            </svg>
            <div id="map-svg" style={{ position: 'absolute', inset: 0 }} />
            <div style={{ textAlign: 'center', color: '#1e3a5f', pointerEvents: 'none', zIndex: 1 }}>
              <div style={{ fontSize: 12, color: '#1e4d80' }}>
                Mapbox GL JS 3D Satellite · Origin: 37.7749°N, 122.4194°W
              </div>
              <div style={{ fontSize: 11, color: '#1a3a5c', marginTop: 4 }}>
                Replace this div with &lt;Map&gt; from react-map-gl + MAPBOX_TOKEN
              </div>
            </div>
          </div>

          {/* Target detail popup */}
          {selectedTarget && (
            <div style={{ position: 'absolute', top: 16, left: 16, background: '#0f1f35', border: `1px solid ${LABEL_COLOUR[selectedTarget.label]}`, borderRadius: 10, padding: 16, minWidth: 240 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, color: LABEL_COLOUR[selectedTarget.label] }}>
                  {LABEL_ICON[selectedTarget.label]} {selectedTarget.label} #{selectedTarget.id}
                </span>
                <button onClick={() => setSelectedTarget(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.8 }}>
                <div>Confidence: <b style={{ color: '#e2e8f0' }}>{(selectedTarget.confidence * 100).toFixed(1)}%</b></div>
                <div>Lat: <b style={{ color: '#e2e8f0' }}>{selectedTarget.lat.toFixed(6)}°</b></div>
                <div>Lon: <b style={{ color: '#e2e8f0' }}>{selectedTarget.lon.toFixed(6)}°</b></div>
                <div>Alt: <b style={{ color: '#e2e8f0' }}>{selectedTarget.alt}m</b></div>
                <div>Sensors: <b style={{ color: '#38bdf8' }}>{selectedTarget.modalities.join(' + ')}</b></div>
                <div>Detected: <b style={{ color: '#e2e8f0' }}>{timeAgo(selectedTarget.ts)}</b></div>
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <button style={{ flex: 1, padding: '6px 0', background: '#14532d', border: 'none', borderRadius: 6, color: '#4ade80', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                  📍 Navigate Here
                </button>
                <button style={{ flex: 1, padding: '6px 0', background: '#1e3a5f', border: 'none', borderRadius: 6, color: '#38bdf8', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                  📡 Alert Team
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside style={s.sidebar}>
          {/* Swarm fleet */}
          <div style={{ ...s.section, overflowY: 'auto' }}>
            <div style={s.sLabel}>Swarm Fleet — Subsystem A</div>
            {drones.map((d, i) => (
              <div key={d.id} style={{ ...s.card, borderColor: DRONE_COLOURS[i % DRONE_COLOURS.length] + '55' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, color: DRONE_COLOURS[i % DRONE_COLOURS.length], fontSize: 13 }}>{d.id}</span>
                  <span style={{ fontSize: 10, color: d.battery > 30 ? '#4ade80' : '#f87171', fontWeight: 600 }}>🔋 {d.battery}%</span>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, lineHeight: 1.6 }}>
                  <div>Mode: <span style={{ color: '#4ade80' }}>{d.status}</span> · Alt: {d.alt.toFixed(1)}m</div>
                  <div>Lat: {d.lat.toFixed(5)}° · Lon: {d.lng.toFixed(5)}°</div>
                </div>
              </div>
            ))}
          </div>

          {/* Survivor targets from Subsystem C */}
          <div style={{ ...s.section, flex: 1, overflowY: 'auto' }}>
            <div style={s.sLabel}>Survivor Alerts — Subsystem C</div>
            {targets.length === 0 && (
              <div style={{ fontSize: 12, color: '#334155', textAlign: 'center', marginTop: 20 }}>
                Scanning... No targets detected
              </div>
            )}
            {targets.map(t => (
              <div key={t.id}
                style={{ ...s.card, borderColor: LABEL_COLOUR[t.label] + '44' }}
                onClick={() => setSelectedTarget(t)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: LABEL_COLOUR[t.label], fontSize: 12 }}>
                    {LABEL_ICON[t.label]} {t.label}
                  </span>
                  <span style={{ fontSize: 10, color: '#64748b' }}>{timeAgo(t.ts)}</span>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, lineHeight: 1.6 }}>
                  <div>Conf: <b style={{ color: '#e2e8f0' }}>{(t.confidence * 100).toFixed(1)}%</b> · {t.modalities.join('+')}
                  </div>
                  <div>GPS: {t.lat.toFixed(5)}, {t.lon.toFixed(5)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Mesh status from Subsystem B */}
          {mesh && (
            <div style={s.section}>
              <div style={s.sLabel}>Mesh Status — Subsystem B</div>
              <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.8 }}>
                <div>Gate G2: <span style={{ color: mesh.gate_g2_audit.status === 'PASSED' ? '#4ade80' : '#f87171', fontWeight: 600 }}>{mesh.gate_g2_audit.status}</span></div>
                <div>Max Latency: {mesh.gate_g2_audit.max_measured_latency_ms?.toFixed(1)}ms</div>
                <div>Packet Loss: {mesh.gate_g2_audit.max_measured_packet_loss_pct?.toFixed(2)}%</div>
                <div>Links: {Object.keys(mesh.peer_links || {}).length} active</div>
              </div>
            </div>
          )}

          {/* Alert log */}
          <div style={{ ...s.section, maxHeight: 120, overflowY: 'auto' }}>
            <div style={s.sLabel}>Alert Log</div>
            {alertLog.map((l, i) => (
              <div key={i} style={{ fontSize: 10, color: '#475569', lineHeight: 1.6 }}>{l}</div>
            ))}
          </div>

          {/* Emergency RTL */}
          <button
            onClick={triggerRTL}
            style={{
              ...s.rtl,
              background: rtlConfirm ? '#7f1d1d' : '#450a0a',
              color: rtlConfirm ? '#fca5a5' : '#f87171',
              border: `1px solid ${rtlConfirm ? '#dc2626' : '#7f1d1d'}`,
            }}
          >
            {rtlConfirm ? '⚠ CONFIRM: Send All Drones Home?' : '🚨 EMERGENCY RTL'}
          </button>
        </aside>
      </div>
    </div>
  );
}

export default App;
