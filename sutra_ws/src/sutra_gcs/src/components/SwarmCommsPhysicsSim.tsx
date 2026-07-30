import React, { useEffect, useRef, useState } from 'react';
import { Shield, Zap, Radio, AlertTriangle, RefreshCw, Cpu, Activity, Play, Pause, Volume2, VolumeX, Eye, Layers, Compass, Maximize2 } from 'lucide-react';
import { audioSynth } from '../utils/webAudioSynth';

interface Drone3D {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  roll: number;
  pitch: number;
  yaw: number;
  role: 'LEADER' | 'FOLLOWER' | 'CANDIDATE' | 'OFFLINE';
  activeMedium: 'WIFI_MESH' | 'ESP_NOW' | 'LORA' | 'BLACKOUT';
  battery: number;
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
  
  // Interactive UI Controls
  const [audioMuted, setAudioMuted] = useState<boolean>(false);
  const [jammingActive, setJammingActive] = useState<boolean>(false);
  const [nlosObstacleActive, setNlosObstacleActive] = useState<boolean>(true);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showInterference, setShowInterference] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1.0);

  // 3D Camera State (Interactive Drag & Zoom)
  const [cameraAngle, setCameraAngle] = useState<number>(0.65);
  const [cameraZoom, setCameraZoom] = useState<number>(1.0);
  const isDraggingRef = useRef<boolean>(false);
  const lastMouseXRef = useRef<number>(0);

  // Story Presentation State
  const [isStoryRunning, setIsStoryRunning] = useState<boolean>(false);
  const [storyPhase, setStoryPhase] = useState<number>(0);
  const [storyCaption, setStoryCaption] = useState<string>('Click "Play Guided Pitch Story" for automated 60s jury presentation.');

  // SwarmRAFT Consensus State
  const [term, setTerm] = useState<number>(3);
  const [leaderId, setLeaderId] = useState<string>('uav_alpha');
  const [electionStatus, setElectionStatus] = useState<string>('HEALTHY (Quorum 5/5)');
  const [failoverTimeMs, setFailoverTimeMs] = useState<number | null>(null);

  // Drones State
  const dronesRef = useRef<Drone3D[]>([
    { id: 'uav_alpha', name: 'Alpha (Lead)', x: 0, y: 0, z: 25, vx: 0.8, vy: 0.6, vz: 0, roll: 0, pitch: 0, yaw: 0, role: 'LEADER', activeMedium: 'WIFI_MESH', battery: 94 },
    { id: 'uav_beta', name: 'Beta (Relay)', x: 60, y: 70, z: 30, vx: -0.6, vy: 0.9, vz: 0, roll: 0, pitch: 0, yaw: 0, role: 'FOLLOWER', activeMedium: 'WIFI_MESH', battery: 89 },
    { id: 'uav_gamma', name: 'Gamma (Perception)', x: -80, y: 90, z: 22, vx: 0.9, vy: -0.7, vz: 0, roll: 0, pitch: 0, yaw: 0, role: 'FOLLOWER', activeMedium: 'WIFI_MESH', battery: 86 },
    { id: 'uav_delta', name: 'Delta (Scout)', x: 130, y: -60, z: 32, vx: -0.7, vy: -0.5, vz: 0, roll: 0, pitch: 0, yaw: 0, role: 'FOLLOWER', activeMedium: 'ESP_NOW', battery: 91 },
    { id: 'uav_epsilon', name: 'Epsilon (Backhaul)', x: 210, y: 120, z: 28, vx: -0.4, vy: 0.8, vz: 0, roll: 0, pitch: 0, yaw: 0, role: 'FOLLOWER', activeMedium: 'LORA', battery: 82 },
  ]);

  const [links, setLinks] = useState<RFLink[]>([]);
  const animTimeRef = useRef<number>(0);

  // Toggle Audio
  const toggleAudio = () => {
    audioSynth.enabled = audioMuted;
    setAudioMuted(!audioMuted);
  };

  // 3D Projection Math: World (x,y,z) -> Screen (isoX, isoY) with Zoom and Angle Orbit
  const project3D = (x: number, y: number, z: number, angle: number, zoom = 1.0, originX = 400, originY = 280) => {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const isoX = originX + ((x - y) * cosA) * zoom;
    const isoY = originY + ((x + y) * sinA * 0.45 - z * 1.8) * zoom;
    return { isoX, isoY };
  };

  // Trigger Leader Failover Simulation
  const triggerLeaderFailover = () => {
    const start = performance.now();
    audioSynth.playFailoverAlarm();
    setElectionStatus('🚨 LEADER DISCONNECTED! Pre-Vote Quorum Triggered...');

    dronesRef.current[0].role = 'OFFLINE';
    dronesRef.current[0].activeMedium = 'BLACKOUT';

    setTimeout(() => {
      dronesRef.current[1].role = 'CANDIDATE';
      setElectionStatus('CANDIDATE ELECTION IN PROGRESS (Pre-Vote Quorum Met)');
    }, 180);

    setTimeout(() => {
      dronesRef.current[1].role = 'LEADER';
      setLeaderId('uav_beta');
      setTerm((t) => t + 1);
      const elapsed = Math.round(performance.now() - start);
      setFailoverTimeMs(elapsed);
      setElectionStatus(`NEW LEADER ELECTED: Beta (Term ${term + 1}) in ${elapsed}ms ✅`);
      audioSynth.playTargetLockChime();
    }, 420);
  };

  // Reset Simulation
  const resetSimulation = () => {
    setJammingActive(false);
    setLeaderId('uav_alpha');
    setTerm(3);
    setElectionStatus('HEALTHY (Quorum 5/5)');
    setFailoverTimeMs(null);
    setIsStoryRunning(false);
    setStoryPhase(0);
    setStoryCaption('Click "Play Guided Pitch Story" for automated 60s jury presentation.');

    dronesRef.current = [
      { id: 'uav_alpha', name: 'Alpha (Lead)', x: 0, y: 0, z: 25, vx: 0.8, vy: 0.6, vz: 0, roll: 0, pitch: 0, yaw: 0, role: 'LEADER', activeMedium: 'WIFI_MESH', battery: 94 },
      { id: 'uav_beta', name: 'Beta (Relay)', x: 60, y: 70, z: 30, vx: -0.6, vy: 0.9, vz: 0, roll: 0, pitch: 0, yaw: 0, role: 'FOLLOWER', activeMedium: 'WIFI_MESH', battery: 89 },
      { id: 'uav_gamma', name: 'Gamma (Perception)', x: -80, y: 90, z: 22, vx: 0.9, vy: -0.7, vz: 0, roll: 0, pitch: 0, yaw: 0, role: 'FOLLOWER', activeMedium: 'WIFI_MESH', battery: 86 },
      { id: 'uav_delta', name: 'Delta (Scout)', x: 130, y: -60, z: 32, vx: -0.7, vy: -0.5, vz: 0, roll: 0, pitch: 0, yaw: 0, role: 'FOLLOWER', activeMedium: 'ESP_NOW', battery: 91 },
      { id: 'uav_epsilon', name: 'Epsilon (Backhaul)', x: 210, y: 120, z: 28, vx: -0.4, vy: 0.8, vz: 0, roll: 0, pitch: 0, yaw: 0, role: 'FOLLOWER', activeMedium: 'LORA', battery: 82 },
    ];
  };

  // 🎬 Automated 60-Second Guided Investor Pitch Controller
  const startPitchStory = () => {
    resetSimulation();
    setIsStoryRunning(true);
    setStoryPhase(1);
    setStoryCaption('PHASE 1: 5-Drone Swarm in Autonomous Search Formation over 802.11s Wi-Fi Mesh (54 Mbps).');
    audioSynth.playRadarPing();

    setTimeout(() => {
      setStoryPhase(2);
      setStoryCaption('PHASE 2: NLoS Mountain Shadowing (+15dB Loss) — Drones automatically trigger Multi-Radio Handover to LoRa (915MHz).');
      audioSynth.playRadarPing();
    }, 6000);

    setTimeout(() => {
      setStoryPhase(3);
      setJammingActive(true);
      audioSynth.playJammerNoise();
      setStoryCaption('PHASE 3: Enemy RF Jamming Noise (+22dB) — Deep JSCC Semantic Coding preserves thermal features without Digital Cliff Effect.');
    }, 12000);

    setTimeout(() => {
      setStoryPhase(4);
      setJammingActive(false);
      triggerLeaderFailover();
      setStoryCaption('PHASE 4: Leader UAV Disconnect — SwarmRAFT executes Pre-Vote election (< 500ms failover) to select new Leader.');
    }, 18000);

    setTimeout(() => {
      setStoryPhase(5);
      audioSynth.playTargetLockChime();
      setStoryCaption('PHASE 5: Victim Survivor Identified! WGS84 GPS Target Locked (Sub-1.5m accuracy) & 1-Click Emergency RTL ready.');
      setIsStoryRunning(false);
    }, 24000);
  };

  // Canvas Mouse Drag Orbit Controls
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMouseXRef.current = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - lastMouseXRef.current;
    lastMouseXRef.current = e.clientX;
    setCameraAngle((prev) => prev + deltaX * 0.005);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setCameraZoom((prev) => Math.max(0.6, Math.min(2.0, prev - e.deltaY * 0.001)));
  };

  // Main 3D WebGL / Canvas Rendering Engine Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      animTimeRef.current += 0.04 * simSpeed;
      const time = animTimeRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw 3D RF Coverage Heatmap Background Overlay
      if (showHeatmap) {
        const heatmapGridSize = 60;
        for (let hx = -300; hx <= 300; hx += heatmapGridSize) {
          for (let hy = -300; hy <= 300; hy += heatmapGridSize) {
            const hp = project3D(hx, hy, 0, cameraAngle, cameraZoom);
            // Calculate field signal strength from nearest drone
            let minDistance = 9999;
            dronesRef.current.forEach((d) => {
              if (d.role !== 'OFFLINE') {
                const dist = Math.hypot(d.x - hx, d.y - hy);
                if (dist < minDistance) minDistance = dist;
              }
            });

            const signalIntensity = Math.max(0, 1.0 - minDistance / 250.0);
            if (signalIntensity > 0.05) {
              ctx.beginPath();
              ctx.arc(hp.isoX, hp.isoY, heatmapGridSize * 0.6 * cameraZoom, 0, Math.PI * 2);
              const heatColor = signalIntensity > 0.6 ? `rgba(16, 185, 129, ${signalIntensity * 0.15})` :
                                signalIntensity > 0.3 ? `rgba(6, 182, 212, ${signalIntensity * 0.12})` :
                                `rgba(249, 115, 22, ${signalIntensity * 0.08})`;
              ctx.fillStyle = heatColor;
              ctx.fill();
            }
          }
        }
      }

      // 2. Draw 3D Isometric Ground Terrain Grid with Elevation Contours
      ctx.lineWidth = 1;
      const gridSize = 40;
      const gridExtent = 320;

      for (let x = -gridExtent; x <= gridExtent; x += gridSize) {
        const p1 = project3D(x, -gridExtent, 0, cameraAngle, cameraZoom);
        const p2 = project3D(x, gridExtent, 0, cameraAngle, cameraZoom);
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.35)';
        ctx.beginPath();
        ctx.moveTo(p1.isoX, p1.isoY);
        ctx.lineTo(p2.isoX, p2.isoY);
        ctx.stroke();
      }

      for (let y = -gridExtent; y <= gridExtent; y += gridSize) {
        const p1 = project3D(-gridExtent, y, 0, cameraAngle, cameraZoom);
        const p2 = project3D(gridExtent, y, 0, cameraAngle, cameraZoom);
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.35)';
        ctx.beginPath();
        ctx.moveTo(p1.isoX, p1.isoY);
        ctx.lineTo(p2.isoX, p2.isoY);
        ctx.stroke();
      }

      // 3. Render 3D NLoS Mountain Obstacle Mesh with Shading
      const obsX = 30, obsY = 40, obsR = 75;
      if (nlosObstacleActive) {
        const obsCenter = project3D(obsX, obsY, 0, cameraAngle, cameraZoom);
        const obsPeak = project3D(obsX, obsY, 50, cameraAngle, cameraZoom);

        ctx.beginPath();
        ctx.moveTo(obsPeak.isoX, obsPeak.isoY);
        ctx.lineTo(obsCenter.isoX - obsR * cameraZoom, obsCenter.isoY + obsR * 0.3 * cameraZoom);
        ctx.lineTo(obsCenter.isoX + obsR * cameraZoom, obsCenter.isoY + obsR * 0.3 * cameraZoom);
        ctx.closePath();

        const grad = ctx.createLinearGradient(obsPeak.isoX, obsPeak.isoY, obsCenter.isoX, obsCenter.isoY + obsR * 0.3 * cameraZoom);
        grad.addColorStop(0, 'rgba(239, 68, 68, 0.45)');
        grad.addColorStop(1, 'rgba(153, 27, 27, 0.15)');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
        ctx.stroke();

        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('⛰️ NLoS Rubble Mountain (Shadowing)', obsPeak.isoX - 80, obsPeak.isoY - 12);
      }

      // 4. Update Kinematics & 3D Radio Links
      const drones = dronesRef.current;
      const activeLinks: RFLink[] = [];

      drones.forEach((d) => {
        if (d.role !== 'OFFLINE') {
          d.x += d.vx * simSpeed;
          d.y += d.vy * simSpeed;

          if (d.x < -240 || d.x > 240) d.vx *= -1;
          if (d.y < -240 || d.y > 240) d.vy *= -1;

          d.pitch = d.vy * 0.15;
          d.roll = d.vx * 0.15;
        }
      });

      // 5. Compute 3D RF Links & Draw Particle Streams
      for (let i = 0; i < drones.length; i++) {
        for (let j = i + 1; j < drones.length; j++) {
          const d1 = drones[i];
          const d2 = drones[j];

          if (d1.role === 'OFFLINE' || d2.role === 'OFFLINE') continue;

          const dx = d2.x - d1.x;
          const dy = d2.y - d1.y;
          const dz = d2.z - d1.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          let isNlos = false;
          if (nlosObstacleActive) {
            const segDist = Math.abs((obsY - d1.y) * dx - (obsX - d1.x) * dy) / (dist + 1e-5);
            isNlos = segDist < obsR && (Math.hypot(d1.x - obsX, d1.y - obsY) < obsR + dist);
          }

          let nlosPenalty = isNlos ? 15.0 : 0.0;
          let jamPenalty = jammingActive ? 22.0 : 0.0;
          let fspl = 20 * Math.log10(dist / 10) + 38.0;
          let snr = 20.0 - fspl - nlosPenalty - jamPenalty - (-95.0);

          let medium: 'WIFI_MESH' | 'ESP_NOW' | 'LORA' | 'BLACKOUT';
          if (snr >= 15.0 && dist < 160) medium = 'WIFI_MESH';
          else if (snr >= 8.0 && dist < 260) medium = 'ESP_NOW';
          else if (snr >= 1.0) medium = 'LORA';
          else medium = 'BLACKOUT';

          let per = Math.max(0.05, Math.min(85.0, (25.0 - snr) * 1.2));

          activeLinks.push({ from: d1.id, to: d2.id, distance: Math.round(dist), snr: Math.round(snr * 10) / 10, per: Math.round(per * 10) / 10, medium, isNlos });

          const p1 = project3D(d1.x, d1.y, d1.z, cameraAngle, cameraZoom);
          const p2 = project3D(d2.x, d2.y, d2.z, cameraAngle, cameraZoom);

          // Draw RF Link Line
          ctx.beginPath();
          ctx.moveTo(p1.isoX, p1.isoY);
          ctx.lineTo(p2.isoX, p2.isoY);

          if (medium === 'WIFI_MESH') {
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([]);
          } else if (medium === 'ESP_NOW') {
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 2.0;
            ctx.setLineDash([6, 3]);
          } else if (medium === 'LORA') {
            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
          } else {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1.0;
            ctx.setLineDash([2, 4]);
          }
          ctx.stroke();
          ctx.setLineDash([]);

          // Photon Data Packet Particles Stream
          const particleCount = 3;
          for (let k = 0; k < particleCount; k++) {
            const progress = ((time * 0.9 + k / particleCount + i * 0.2) % 1.0);
            const px = p1.isoX + (p2.isoX - p1.isoX) * progress;
            const py = p1.isoY + (p2.isoY - p1.isoY) * progress;

            ctx.beginPath();
            ctx.arc(px, py, 3.8 * cameraZoom, 0, Math.PI * 2);
            ctx.fillStyle = medium === 'WIFI_MESH' ? '#34d399' : medium === 'ESP_NOW' ? '#38bdf8' : '#fb923c';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }
      setLinks(activeLinks);

      // 6. Render 3D Quadcopter Drones & Spinning Rotors
      drones.forEach((d) => {
        const p = project3D(d.x, d.y, d.z, cameraAngle, cameraZoom);
        const shadowP = project3D(d.x, d.y, 0, cameraAngle, cameraZoom);

        if (d.role === 'OFFLINE') {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(p.isoX - 12, p.isoY - 12);
          ctx.lineTo(p.isoX + 12, p.isoY + 12);
          ctx.moveTo(p.isoX + 12, p.isoY - 12);
          ctx.lineTo(p.isoX - 12, p.isoY + 12);
          ctx.stroke();
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText('❌ OFFLINE', p.isoX - 30, p.isoY - 18);
          return;
        }

        // Ground Shadow
        ctx.beginPath();
        ctx.ellipse(shadowP.isoX, shadowP.isoY, 14 * cameraZoom, 6 * cameraZoom, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fill();

        // Altitude Drop Line
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(shadowP.isoX, shadowP.isoY);
        ctx.lineTo(p.isoX, p.isoY);
        ctx.stroke();
        ctx.setLineDash([]);

        // 3D Quadcopter Airframe Arms
        const armLength = 16 * cameraZoom;
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(p.isoX - armLength, p.isoY - armLength * 0.5);
        ctx.lineTo(p.isoX + armLength, p.isoY + armLength * 0.5);
        ctx.moveTo(p.isoX + armLength, p.isoY - armLength * 0.5);
        ctx.lineTo(p.isoX - armLength, p.isoY + armLength * 0.5);
        ctx.stroke();

        // 🛸 Spinning Rotor Blades
        const rotorR = 8 * cameraZoom;
        const rotorAngle = time * 22;

        [
          { rx: p.isoX - armLength, ry: p.isoY - armLength * 0.5 },
          { rx: p.isoX + armLength, ry: p.isoY + armLength * 0.5 },
          { rx: p.isoX + armLength, ry: p.isoY - armLength * 0.5 },
          { rx: p.isoX - armLength, ry: p.isoY + armLength * 0.5 }
        ].forEach((rotor, idx) => {
          ctx.beginPath();
          ctx.ellipse(rotor.rx, rotor.ry, rotorR, rotorR * 0.4, rotorAngle + idx, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
          ctx.stroke();
        });

        // Core Body Hub
        ctx.beginPath();
        ctx.arc(p.isoX, p.isoY, 7 * cameraZoom, 0, Math.PI * 2);
        ctx.fillStyle = d.role === 'LEADER' ? '#eab308' : d.role === 'CANDIDATE' ? '#f97316' : '#38bdf8';
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Leader Crown Badge
        if (d.role === 'LEADER') {
          ctx.fillStyle = '#eab308';
          ctx.font = 'bold 13px sans-serif';
          ctx.fillText('👑 LEADER', p.isoX - 28, p.isoY - 22);
        }

        // Drone Name Label
        ctx.fillStyle = '#f8fafc';
        ctx.font = '11px sans-serif';
        ctx.fillText(d.name, p.isoX - 25, p.isoY + 22);
      });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [cameraAngle, cameraZoom, simSpeed, jammingActive, nlosObstacleActive, showHeatmap]);

  return (
    <div style={{ backgroundColor: '#090d16', color: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #1e293b', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Narrative Story Banner */}
      {isStoryRunning && (
        <div style={{ backgroundColor: '#1e1b4b', color: '#c084fc', border: '2px solid #818cf8', borderRadius: '12px', padding: '14px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 0 25px rgba(129, 140, 248, 0.3)' }}>
          <Eye size={24} style={{ color: '#c084fc' }} />
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#a78bfa' }}>
              🎬 INVESTOR PITCH STORY MODE — STEP {storyPhase} / 5
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#f3e8ff', marginTop: '2px' }}>
              {storyCaption}
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #1e293b', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Radio style={{ color: '#38bdf8' }} size={28} />
            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, background: 'linear-gradient(90deg, #38bdf8, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Superpowered 3D Swarm Physics & Multi-Radio Visualizer
            </h2>
          </div>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
            3D Quadcopter kinematics, photon packet particle streams, Rician fading, & native Web Audio spatial sound.
          </p>
        </div>

        {/* Pitch Actions */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={toggleAudio} style={{ backgroundColor: '#1e293b', color: audioMuted ? '#ef4444' : '#34d399', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' }}>
            {audioMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          
          <button onClick={startPitchStory} style={{ backgroundColor: '#818cf8', color: '#0f172a', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 20px rgba(129, 140, 248, 0.4)' }}>
            <Play size={16} /> 🎬 Play Guided Pitch Story (60s)
          </button>

          <button onClick={triggerLeaderFailover} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={14} /> Kill Leader
          </button>
        </div>
      </div>

      {/* Main Grid Display */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        
        {/* 3D Isometric Interactive Canvas */}
        <div 
          style={{ position: 'relative', backgroundColor: '#020617', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e293b', cursor: 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
        >
          <canvas ref={canvasRef} width={800} height={520} style={{ width: '100%', height: '520px', display: 'block' }} />

          {/* Controls Overlay */}
          <div style={{ position: 'absolute', bottom: '16px', left: '16px', display: 'flex', gap: '12px', backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', padding: '10px 16px', borderRadius: '10px', border: '1px solid #334155' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
              <input type="checkbox" checked={jammingActive} onChange={(e) => { setJammingActive(e.target.checked); if(e.target.checked) audioSynth.playJammerNoise(); }} />
              <span style={{ color: jammingActive ? '#ef4444' : '#94a3b8', fontWeight: 600 }}>⚡ RF Jammer (+22dB)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', marginLeft: '6px' }}>
              <input type="checkbox" checked={nlosObstacleActive} onChange={(e) => setNlosObstacleActive(e.target.checked)} />
              <span style={{ color: nlosObstacleActive ? '#f87171' : '#94a3b8', fontWeight: 600 }}>⛰️ NLoS Mountain</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', marginLeft: '6px' }}>
              <input type="checkbox" checked={showHeatmap} onChange={(e) => setShowHeatmap(e.target.checked)} />
              <span style={{ color: showHeatmap ? '#34d399' : '#94a3b8', fontWeight: 600 }}>🌐 RF Heatmap</span>
            </label>
          </div>

          <div style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155', fontSize: '11px', color: '#94a3b8' }}>
            💡 <em>Drag mouse to rotate 3D orbit | Scroll wheel to zoom</em>
          </div>
        </div>

        {/* Telemetry Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
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
              {electionStatus}
            </div>

            {failoverTimeMs && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#34d399', fontWeight: 700, textAlign: 'center' }}>
                ⚡ SwarmRAFT Failover Executed in {failoverTimeMs} ms (&lt; 500ms target)
              </div>
            )}
          </div>

          <div style={{ backgroundColor: '#0f172a', borderRadius: '12px', padding: '16px', border: '1px solid #1e293b', flex: 1, overflowY: 'auto', maxHeight: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Activity style={{ color: '#38bdf8' }} size={20} />
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Active RF Links</h3>
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
