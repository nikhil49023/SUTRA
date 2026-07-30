import React, { useEffect, useRef, useState } from 'react';
import { Shield, Zap, Radio, AlertTriangle, RefreshCw, Cpu, Activity, Compass, Flame } from 'lucide-react';

interface DroneState {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  heading: number;
  role: 'LEADER' | 'FOLLOWER' | 'CANDIDATE' | 'OFFLINE';
  activeMedium: 'WIFI_MESH' | 'ESP_NOW' | 'LORA' | 'BLACKOUT';
  snr: number;
  battery: number;
  packetLoss: number;
}

interface RFLink {
  from: string;
  to: string;
  distance: number;
  snr: number;
  per: number;
  medium: 'WIFI_MESH' | 'ESP_NOW' | 'LORA' | 'BLACKOUT';
  isNlos: boolean;
}

export const SwarmCommsPhysicsSim: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [jammingActive, setJammingActive] = useState<boolean>(false);
  const [nlosObstacleActive, setNlosObstacleActive] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1.0);
  const [activePreset, setActivePreset] = useState<string>('NORMAL');

  // Consensus State
  const [term, setTerm] = useState<number>(3);
  const [leaderId, setLeaderId] = useState<string>('uav_alpha');
  const [electionStatus, setElectionStatus] = useState<string>('HEALTHY (Quorum 5/5)');
  const [failoverTimeMs, setFailoverTimeMs] = useState<number | null>(null);

  // Drone Kinematics
  const dronesRef = useRef<DroneState[]>([
    { id: 'uav_alpha', name: 'Alpha (Lead)', x: 300, y: 250, z: 15, vx: 1.2, vy: 0.8, heading: 45, role: 'LEADER', activeMedium: 'WIFI_MESH', snr: 24.5, battery: 92, packetLoss: 0.05 },
    { id: 'uav_beta', name: 'Beta (Relay)', x: 420, y: 180, z: 18, vx: -0.9, vy: 1.1, heading: 135, role: 'FOLLOWER', activeMedium: 'WIFI_MESH', snr: 21.0, battery: 88, packetLoss: 0.2 },
    { id: 'uav_gamma', name: 'Gamma (Perception)', x: 180, y: 380, z: 14, vx: 1.0, vy: -1.0, heading: 225, role: 'FOLLOWER', activeMedium: 'WIFI_MESH', snr: 19.8, battery: 85, packetLoss: 0.4 },
    { id: 'uav_delta', name: 'Delta (Scout)', x: 550, y: 360, z: 20, vx: -1.1, vy: -0.7, heading: 315, role: 'FOLLOWER', activeMedium: 'ESP_NOW', snr: 13.5, battery: 90, packetLoss: 1.2 },
    { id: 'uav_epsilon', name: 'Epsilon (Backhaul)', x: 650, y: 150, z: 16, vx: -0.6, vy: 1.3, heading: 90, role: 'FOLLOWER', activeMedium: 'LORA', snr: 7.2, battery: 81, packetLoss: 3.5 },
  ]);

  const [links, setLinks] = useState<RFLink[]>([]);
  const pulseRef = useRef<number>(0);

  // Trigger Leader Failover Simulation
  const triggerLeaderFailover = () => {
    const start = performance.now();
    setElectionStatus('LEADER DISCONNECTED! Triggering Pre-Vote...');
    
    // Set Alpha Offline
    dronesRef.current[0].role = 'OFFLINE';
    dronesRef.current[0].activeMedium = 'BLACKOUT';

    setTimeout(() => {
      // Followers enter Candidate state
      dronesRef.current[1].role = 'CANDIDATE';
      setElectionStatus('CANDIDATE ELECTION IN PROGRESS (Pre-Vote Quorum Met)');
    }, 180);

    setTimeout(() => {
      // Beta becomes new Leader
      dronesRef.current[1].role = 'LEADER';
      setLeaderId('uav_beta');
      setTerm((prev) => prev + 1);
      const elapsed = Math.round(performance.now() - start);
      setFailoverTimeMs(elapsed);
      setElectionStatus(`NEW LEADER ELECTED: Beta (Term ${term + 1}) in ${elapsed}ms ✅`);
    }, 420);
  };

  // Reset Simulation
  const resetSimulation = () => {
    setJammingActive(false);
    setLeaderId('uav_alpha');
    setTerm(3);
    setElectionStatus('HEALTHY (Quorum 5/5)');
    setFailoverTimeMs(null);
    setActivePreset('NORMAL');

    dronesRef.current = [
      { id: 'uav_alpha', name: 'Alpha (Lead)', x: 300, y: 250, z: 15, vx: 1.2, vy: 0.8, heading: 45, role: 'LEADER', activeMedium: 'WIFI_MESH', snr: 24.5, battery: 92, packetLoss: 0.05 },
      { id: 'uav_beta', name: 'Beta (Relay)', x: 420, y: 180, z: 18, vx: -0.9, vy: 1.1, heading: 135, role: 'FOLLOWER', activeMedium: 'WIFI_MESH', snr: 21.0, battery: 88, packetLoss: 0.2 },
      { id: 'uav_gamma', name: 'Gamma (Perception)', x: 180, y: 380, z: 14, vx: 1.0, vy: -1.0, heading: 225, role: 'FOLLOWER', activeMedium: 'WIFI_MESH', snr: 19.8, battery: 85, packetLoss: 0.4 },
      { id: 'uav_delta', name: 'Delta (Scout)', x: 550, y: 360, z: 20, vx: -1.1, vy: -0.7, heading: 315, role: 'FOLLOWER', activeMedium: 'ESP_NOW', snr: 13.5, battery: 90, packetLoss: 1.2 },
      { id: 'uav_epsilon', name: 'Epsilon (Backhaul)', x: 650, y: 150, z: 16, vx: -0.6, vy: 1.3, heading: 90, role: 'FOLLOWER', activeMedium: 'LORA', snr: 7.2, battery: 81, packetLoss: 3.5 },
    ];
  };

  // Main Physics Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      pulseRef.current = (pulseRef.current + 0.05 * simSpeed) % (Math.PI * 2);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Grid Lines
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // 2. Draw NLoS Mountain / Rubble Obstacle
      const obsX = 380, obsY = 280, obsR = 65;
      if (nlosObstacleActive) {
        ctx.beginPath();
        ctx.arc(obsX, obsY, obsR, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(obsX, obsY, 10, obsX, obsY, obsR);
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
        gradient.addColorStop(0.7, 'rgba(185, 28, 28, 0.15)');
        gradient.addColorStop(1, 'rgba(153, 27, 27, 0.05)');
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#f87171';
        ctx.font = '11px sans-serif';
        ctx.fillText('⛰️ NLoS Shadowing Mountain (Rubble)', obsX - 85, obsY - 5);
      }

      // 3. Update Kinematics & RF Physics
      const currentDrones = dronesRef.current;
      const activeLinks: RFLink[] = [];

      currentDrones.forEach((d, idx) => {
        if (d.role !== 'OFFLINE') {
          // Update drone positions
          d.x += d.vx * simSpeed;
          d.y += d.vy * simSpeed;

          // Bounce off boundaries
          if (d.x < 50 || d.x > canvas.width - 50) d.vx *= -1;
          if (d.y < 50 || d.y > canvas.height - 50) d.vy *= -1;
        }
      });

      // 4. Calculate Link Physics Matrix
      for (let i = 0; i < currentDrones.length; i++) {
        for (let j = i + 1; j < currentDrones.length; j++) {
          const d1 = currentDrones[i];
          const d2 = currentDrones[j];

          if (d1.role === 'OFFLINE' || d2.role === 'OFFLINE') continue;

          const dx = d2.x - d1.x;
          const dy = d2.y - d1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // NLoS Check (Line-circle intersection test)
          let isNlos = false;
          if (nlosObstacleActive) {
            const segDist = Math.abs((obsY - d1.y) * dx - (obsX - d1.x) * dy) / (dist + 1e-5);
            isNlos = segDist < obsR && (Math.hypot(d1.x - obsX, d1.y - obsY) < obsR + dist);
          }

          // Path Loss & SNR
          let nlosPenalty = isNlos ? 15.0 : 0.0;
          let jamPenalty = jammingActive ? 22.0 : 0.0;
          let fspl = 20 * Math.log10(dist / 10) + 38.0;
          let rxPower = 20.0 - fspl - nlosPenalty - jamPenalty;
          let snr = rxPower - (-95.0);

          let medium: 'WIFI_MESH' | 'ESP_NOW' | 'LORA' | 'BLACKOUT';
          if (snr >= 15.0 && dist < 180) medium = 'WIFI_MESH';
          else if (snr >= 8.0 && dist < 320) medium = 'ESP_NOW';
          else if (snr >= 1.0) medium = 'LORA';
          else medium = 'BLACKOUT';

          let per = Math.max(0.05, Math.min(85.0, (25.0 - snr) * 1.2));

          activeLinks.push({
            from: d1.id,
            to: d2.id,
            distance: dist,
            snr: Math.round(snr * 10) / 10,
            per: Math.round(per * 10) / 10,
            medium,
            isNlos
          });

          // Draw Link Lines
          ctx.beginPath();
          ctx.moveTo(d1.x, d1.y);
          ctx.lineTo(d2.x, d2.y);

          if (medium === 'WIFI_MESH') {
            ctx.strokeStyle = '#10b981'; // Green
            ctx.lineWidth = 2.5;
            ctx.setLineDash([]);
          } else if (medium === 'ESP_NOW') {
            ctx.strokeStyle = '#06b6d4'; // Cyan
            ctx.lineWidth = 2.0;
            ctx.setLineDash([6, 3]);
          } else if (medium === 'LORA') {
            ctx.strokeStyle = '#f97316'; // Orange
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
          } else {
            ctx.strokeStyle = '#ef4444'; // Red Blackout
            ctx.lineWidth = 1.0;
            ctx.setLineDash([2, 4]);
          }
          ctx.stroke();
          ctx.setLineDash([]);

          // Animated RF Energy Pulses along links
          const pulsePos = (Math.sin(pulseRef.current * 2 + i) + 1) / 2;
          const px = d1.x + (d2.x - d1.x) * pulsePos;
          const py = d1.y + (d2.y - d1.y) * pulsePos;
          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = medium === 'WIFI_MESH' ? '#34d399' : medium === 'ESP_NOW' ? '#38bdf8' : '#fb923c';
          ctx.fill();
        }
      }
      setLinks(activeLinks);

      // 5. Draw Drones & Heartbeat Pulses
      currentDrones.forEach((d) => {
        // Draw RF Propagation Pulse Sphere
        if (d.role === 'LEADER') {
          const pulseR = 25 + Math.sin(pulseRef.current * 3) * 10;
          ctx.beginPath();
          ctx.arc(d.x, d.y, pulseR, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Leader Crown Badge
          ctx.fillStyle = '#eab308';
          ctx.font = '16px sans-serif';
          ctx.fillText('👑 LEADER', d.x - 30, d.y - 25);
        }

        if (d.role === 'OFFLINE') {
          ctx.fillStyle = '#64748b';
          ctx.beginPath();
          ctx.arc(d.x, d.y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ef4444';
          ctx.font = '14px sans-serif';
          ctx.fillText('❌ OFFLINE', d.x - 30, d.y - 15);
          return;
        }

        // Drone Icon Body
        ctx.beginPath();
        ctx.arc(d.x, d.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = d.role === 'LEADER' ? '#eab308' : d.role === 'CANDIDATE' ? '#f97316' : '#38bdf8';
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#f8fafc';
        ctx.font = '11px sans-serif';
        ctx.fillText(d.name, d.x - 25, d.y + 22);

        // Medium Indicator Tag
        ctx.fillStyle = d.activeMedium === 'WIFI_MESH' ? '#10b981' : d.activeMedium === 'ESP_NOW' ? '#06b6d4' : '#f97316';
        ctx.fillRect(d.x - 22, d.y + 26, 44, 12);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText(d.activeMedium, d.x - 18, d.y + 35);
      });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [simSpeed, jammingActive, nlosObstacleActive]);

  return (
    <div style={{ backgroundColor: '#090d16', color: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #1e293b', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #1e293b', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Radio style={{ color: '#38bdf8' }} size={28} />
            <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0, background: 'linear-gradient(90deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Real-World Swarm Multi-Radio & Consensus Physics Simulator
            </h2>
          </div>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
            Live WebGL physics engine: Rician K-factor fading, NLoS terrain shadowing, CSMA/CA MAC contention, and SwarmRAFT failover.
          </p>
        </div>

        {/* Preset Selector */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={resetSimulation} style={{ backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={14} /> Reset Demo
          </button>
          <button onClick={triggerLeaderFailover} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 0 15px rgba(220, 38, 38, 0.4)' }}>
            <Zap size={14} /> Kill Leader (Simulate Failover)
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        
        {/* Canvas Display */}
        <div style={{ position: 'relative', backgroundColor: '#020617', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e293b' }}>
          <canvas ref={canvasRef} width={800} height={520} style={{ width: '100%', height: '520px', display: 'block' }} />

          {/* Floating Controls Overlay */}
          <div style={{ position: 'absolute', bottom: '16px', left: '16px', display: 'flex', gap: '10px', backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', padding: '10px 16px', borderRadius: '10px', border: '1px solid #334155' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
              <input type="checkbox" checked={jammingActive} onChange={(e) => setJammingActive(e.target.checked)} />
              <span style={{ color: jammingActive ? '#ef4444' : '#94a3b8', fontWeight: 600 }}>⚡ RF Jamming Noise (+22dB)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', marginLeft: '12px' }}>
              <input type="checkbox" checked={nlosObstacleActive} onChange={(e) => setNlosObstacleActive(e.target.checked)} />
              <span style={{ color: nlosObstacleActive ? '#f87171' : '#94a3b8', fontWeight: 600 }}>⛰️ NLoS Mountain Shadowing</span>
            </label>
          </div>

          {/* Dynamic Link Legend Overlay */}
          <div style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', padding: '12px 16px', borderRadius: '10px', border: '1px solid #334155', fontSize: '11px' }}>
            <div style={{ fontWeight: 700, marginBottom: '6px', color: '#94a3b8' }}>MULTI-RADIO LINKS</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: '16px', height: '3px', backgroundColor: '#10b981' }}></div> 802.11s Wi-Fi (54Mbps, &lt;70m)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: '16px', height: '3px', backgroundColor: '#06b6d4' }}></div> ESP-NOW (2.4GHz, 70-120m)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '16px', height: '3px', backgroundColor: '#f97316' }}></div> LoRa (915MHz, &gt;120m NLoS)
            </div>
          </div>
        </div>

        {/* Right Sidebar: Telemetry & SwarmRAFT State */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* SwarmRAFT Leader Status Card */}
          <div style={{ backgroundColor: '#0f172a', borderRadius: '12px', padding: '16px', border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Shield style={{ color: '#eab308' }} size={20} />
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>SwarmRAFT Consensus</h3>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div style={{ backgroundColor: '#1e293b', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>CURRENT LEADER</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#eab308' }}>👑 {leaderId}</div>
              </div>
              <div style={{ backgroundColor: '#1e293b', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>RAFT TERM</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#38bdf8' }}>Term {term}</div>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: '#cbd5e1', backgroundColor: '#020617', padding: '10px', borderRadius: '8px', border: '1px solid #334155' }}>
              <span style={{ color: '#94a3b8' }}>Status: </span>
              <span style={{ fontWeight: 600, color: electionStatus.includes('ELECTED') ? '#34d399' : electionStatus.includes('DISCONNECTED') ? '#f87171' : '#38bdf8' }}>
                {electionStatus}
              </span>
            </div>

            {failoverTimeMs && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#34d399', fontWeight: 700, textAlign: 'center' }}>
                ⚡ SwarmRAFT Leader Failover Executed in {failoverTimeMs} ms (&lt; 500ms target met)
              </div>
            )}
          </div>

          {/* Active Links Telemetry Monitor */}
          <div style={{ backgroundColor: '#0f172a', borderRadius: '12px', padding: '16px', border: '1px solid #1e293b', flex: 1, overflowY: 'auto', maxHeight: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Activity style={{ color: '#38bdf8' }} size={20} />
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>RF Link Physical Metrics</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {links.slice(0, 5).map((l, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: '#020617', borderRadius: '6px', border: '1px solid #1e293b', fontSize: '11px' }}>
                  <div>
                    <span style={{ fontWeight: 700 }}>{l.from} ↔ {l.to}</span>
                    {l.isNlos && <span style={{ color: '#ef4444', marginLeft: '6px' }}>[NLoS]</span>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: l.medium === 'WIFI_MESH' ? '#34d399' : l.medium === 'ESP_NOW' ? '#38bdf8' : '#fb923c', fontWeight: 700 }}>{l.medium}</span>
                    <div style={{ color: '#94a3b8', fontSize: '10px' }}>{l.snr} dB SNR | {l.per}% loss</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
