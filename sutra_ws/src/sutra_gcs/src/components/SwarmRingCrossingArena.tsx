import React, { useEffect, useRef, useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Activity, 
  Play, 
  Pause, 
  RotateCcw, 
  Sliders, 
  Cpu, 
  Zap, 
  Compass, 
  Layers, 
  Maximize2 
} from 'lucide-react';

interface DroneState {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  accel: number;
  trail: [number, number, number][];
}

export const SwarmRingCrossingArena: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Simulation Controls
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [enableSorca, setEnableSorca] = useState<boolean>(true);
  const [hasCentralObstacle, setHasCentralObstacle] = useState<boolean>(false);
  const [ringRadius, setRingRadius] = useState<number>(10.0);
  const [simSpeed, setSimSpeed] = useState<number>(1.0);
  const [recordedMinDistance, setRecordedMinDistance] = useState<number>(10.0);

  // 3D Camera Controls
  const [cameraAngle, setCameraAngle] = useState<number>(0.75);
  const [cameraPitch, setCameraPitch] = useState<number>(0.55);
  const [cameraZoom, setCameraZoom] = useState<number>(1.0);
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 5 Drones Initial State
  const initialDrones = (): DroneState[] => {
    const names = ['uav_alpha', 'uav_beta', 'uav_gamma', 'uav_delta', 'uav_epsilon'];
    const colors = ['#38bdf8', '#818cf8', '#34d399', '#f59e0b', '#ec4899'];
    const r = ringRadius;
    const z = 4.0;

    return names.map((id, i) => {
      const theta = i * ((2 * Math.PI) / names.length);
      const px = r * Math.cos(theta);
      const py = r * Math.sin(theta);
      const tx = r * Math.cos(theta + Math.PI);
      const ty = r * Math.sin(theta + Math.PI);

      return {
        id,
        name: id.replace('uav_', 'UAV ').toUpperCase(),
        color: colors[i],
        x: px,
        y: py,
        z,
        vx: 0,
        vy: 0,
        vz: 0,
        targetX: tx,
        targetY: ty,
        targetZ: z,
        accel: 0,
        trail: [[px, py, z]]
      };
    });
  };

  const dronesRef = useRef<DroneState[]>(initialDrones());
  const minDistanceRef = useRef<number>(10.0);
  const simTimeRef = useRef<number>(0.0);
  const animFrameIdRef = useRef<number | null>(null);

  const resetSimulation = () => {
    dronesRef.current = initialDrones();
    minDistanceRef.current = 10.0;
    setRecordedMinDistance(10.0);
    simTimeRef.current = 0.0;
  };

  useEffect(() => {
    resetSimulation();
  }, [ringRadius]);

  // Main 3D Canvas Simulation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTimestamp = performance.now();

    const renderLoop = (timestamp: number) => {
      const dtReal = (timestamp - lastTimestamp) / 1000.0;
      lastTimestamp = timestamp;
      const dt = Math.min(0.05, Math.max(0.01, dtReal * simSpeed));

      if (isPlaying) {
        simTimeRef.current += dt;
        updatePhysics(dt);
      }

      drawScene(ctx, canvas.width, canvas.height);
      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isPlaying, simSpeed, enableSorca, hasCentralObstacle, cameraAngle, cameraPitch, cameraZoom]);

  // SORCA 3D Collision Avoidance Algorithm
  const updatePhysics = (dt: number) => {
    const drones = dronesRef.current;
    const safetyRadius = 1.40;
    const combinedRadius = safetyRadius * 2.0; // 2.80m Gate G5
    const maxSpeed = 3.0;
    const maxAccel = 2.5; // m/s^2

    let frameMinDist = Infinity;

    // Check distances
    for (let i = 0; i < drones.length; i++) {
      for (let j = i + 1; j < drones.length; j++) {
        const d1 = drones[i];
        const d2 = drones[j];
        const dx = d1.x - d2.x;
        const dy = d1.y - d2.y;
        const dz = d1.z - d2.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < frameMinDist) frameMinDist = dist;
      }
    }

    if (frameMinDist < minDistanceRef.current) {
      minDistanceRef.current = frameMinDist;
      setRecordedMinDistance(frameMinDist);
    }

    // Compute SORCA safe velocities
    const nextVelocities: { vx: number; vy: number; vz: number; accel: number }[] = [];

    drones.forEach((drone) => {
      const dx = drone.targetX - drone.x;
      const dy = drone.targetY - drone.y;
      const dz = drone.targetZ - drone.z;
      const distToTarget = Math.sqrt(dx * dx + dy * dy + dz * dz);

      let prefVx = 0, prefVy = 0, prefVz = 0;
      if (distToTarget > 0.2) {
        const prefSpeed = Math.min(2.5, distToTarget * 0.8 + 0.6);
        prefVx = (dx / distToTarget) * prefSpeed;
        prefVy = (dy / distToTarget) * prefSpeed;
        prefVz = (dz / distToTarget) * prefSpeed;
      }

      let avoidVx = 0, avoidVy = 0, avoidVz = 0;

      // Avoid other swarm drones
      drones.forEach((other) => {
        if (other.id === drone.id) return;
        const ox = other.x - drone.x;
        const oy = other.y - drone.y;
        const oz = other.z - drone.z;
        const dist = Math.sqrt(ox * ox + oy * oy + oz * oz);
        if (dist < 0.01) return;

        const relVx = prefVx - other.vx;
        const relVy = prefVy - other.vy;
        const relVz = prefVz - other.vz;

        if (dist < combinedRadius + 2.5) {
          const ttc = dist / Math.max(0.1, Math.sqrt(relVx * relVx + relVy * relVy + relVz * relVz) + 1e-4);
          if (ttc < 5.0) {
            const weight = Math.max(0.0, (5.0 - ttc) / 5.0);
            const normX = -ox / dist;
            const normY = -oy / dist;
            const normZ = -oz / dist;
            const repMag = dist < combinedRadius ? (combinedRadius + 1.0 - dist) / dist : 0.8;

            avoidVx += (normX * 2.5 + normY * 1.0) * weight * repMag;
            avoidVy += (normY * 2.5 - normX * 1.0) * weight * repMag;
            avoidVz += normZ * 0.6 * weight;
          }
        }
      });

      // Avoid central obstacle if enabled
      if (hasCentralObstacle) {
        const ox = 0 - drone.x;
        const oy = 0 - drone.y;
        const distObs = Math.sqrt(ox * ox + oy * oy);
        if (distObs < 3.0) {
          avoidVx += (-ox / distObs) * 2.0;
          avoidVy += (-oy / distObs) * 2.0;
        }
      }

      let safeVx = prefVx + avoidVx;
      let safeVy = prefVy + avoidVy;
      let safeVz = prefVz + avoidVz;

      const speed = Math.sqrt(safeVx * safeVx + safeVy * safeVy + safeVz * safeVz);
      if (speed > maxSpeed) {
        safeVx = (safeVx / speed) * maxSpeed;
        safeVy = (safeVy / speed) * maxSpeed;
        safeVz = (safeVz / speed) * maxSpeed;
      }

      // Apply SORCA Acceleration Limit
      let accel = 0;
      if (enableSorca && dt > 0) {
        const ax = (safeVx - drone.vx) / dt;
        const ay = (safeVy - drone.vy) / dt;
        const az = (safeVz - drone.vz) / dt;
        accel = Math.sqrt(ax * ax + ay * ay + az * az);

        if (accel > maxAccel) {
          const scale = maxAccel / accel;
          safeVx = drone.vx + ax * scale * dt;
          safeVy = drone.vy + ay * scale * dt;
          safeVz = drone.vz + az * scale * dt;
          accel = maxAccel;
        }
      }

      nextVelocities.push({ vx: safeVx, vy: safeVy, vz: safeVz, accel });
    });

    // Update drone positions & histories
    drones.forEach((drone, idx) => {
      const nv = nextVelocities[idx];
      drone.vx = nv.vx;
      drone.vy = nv.vy;
      drone.vz = nv.vz;
      drone.accel = nv.accel;
      drone.x += drone.vx * dt;
      drone.y += drone.vy * dt;
      drone.z += drone.vz * dt;

      // Add to trail
      if (drone.trail.length > 120) drone.trail.shift();
      drone.trail.push([drone.x, drone.y, drone.z]);
    });
  };

  // 3D Isometric Projection Helpers
  const project3D = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number
  ): { sx: number; sy: number; scale: number } => {
    const cosA = Math.cos(cameraAngle);
    const sinA = Math.sin(cameraAngle);
    const cosP = Math.cos(cameraPitch);
    const sinP = Math.sin(cameraPitch);

    // Rotate yaw
    const rx = x * cosA - y * sinA;
    const ry = x * sinA + y * cosA;

    // Tilt pitch
    const rz = z * cosP - ry * sinP;
    const depth = z * sinP + ry * cosP + 28.0;

    const fov = (450 * cameraZoom) / Math.max(5.0, depth);
    const sx = w / 2 + rx * fov;
    const sy = h / 2 - rz * fov + 40;

    return { sx, sy, scale: fov / 35.0 };
  };

  // 3D Rendering on Canvas
  const drawScene = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // Clear background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, w, h);

    // Radial gradient glow background
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w / 1.5);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Draw 3D Ground Grid Lines
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)';
    ctx.lineWidth = 1;
    const gridSize = 16;
    const step = 2.0;

    for (let x = -gridSize; x <= gridSize; x += step) {
      const p1 = project3D(x, -gridSize, 0, w, h);
      const p2 = project3D(x, gridSize, 0, w, h);
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.stroke();
    }

    for (let y = -gridSize; y <= gridSize; y += step) {
      const p1 = project3D(-gridSize, y, 0, w, h);
      const p2 = project3D(gridSize, y, 0, w, h);
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.stroke();
    }

    // Draw Ring Perimeter Checkpoints
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    const ringSegments = 64;
    for (let i = 0; i <= ringSegments; i++) {
      const theta = (i / ringSegments) * Math.PI * 2;
      const pt = project3D(ringRadius * Math.cos(theta), ringRadius * Math.sin(theta), 4.0, w, h);
      if (i === 0) ctx.moveTo(pt.sx, pt.sy);
      else ctx.lineTo(pt.sx, pt.sy);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Central Crossing Target Marker (0, 0, 4.0)
    const centerPt = project3D(0, 0, 4.0, w, h);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerPt.sx, centerPt.sy, 8 * centerPt.scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.fillText('CENTRAL INTERSECTION (0, 0, 4m)', centerPt.sx + 12, centerPt.sy + 4);

    // Draw Central Obstacle Pillar if enabled
    if (hasCentralObstacle) {
      const obsBase = project3D(0, 0, 0, w, h);
      const obsTop = project3D(0, 0, 7.0, w, h);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.lineWidth = 16 * obsBase.scale;
      ctx.beginPath();
      ctx.moveTo(obsBase.sx, obsBase.sy);
      ctx.lineTo(obsTop.sx, obsTop.sy);
      ctx.stroke();
    }

    const drones = dronesRef.current;

    // Draw Inter-Drone Clearance Lines
    for (let i = 0; i < drones.length; i++) {
      for (let j = i + 1; j < drones.length; j++) {
        const d1 = drones[i];
        const d2 = drones[j];
        const dx = d1.x - d2.x;
        const dy = d1.y - d2.y;
        const dz = d1.z - d2.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < 6.0) {
          const pt1 = project3D(d1.x, d1.y, d1.z, w, h);
          const pt2 = project3D(d2.x, d2.y, d2.z, w, h);
          ctx.strokeStyle = dist < 2.80 ? '#ef4444' : '#34d399';
          ctx.lineWidth = dist < 2.80 ? 2.5 : 1.2;
          ctx.beginPath();
          ctx.moveTo(pt1.sx, pt1.sy);
          ctx.lineTo(pt2.sx, pt2.sy);
          ctx.stroke();

          // Text distance label
          const midX = (pt1.sx + pt2.sx) / 2;
          const midY = (pt1.sy + pt2.sy) / 2;
          ctx.fillStyle = dist < 2.80 ? '#ef4444' : '#34d399';
          ctx.font = 'bold 11px Inter, sans-serif';
          ctx.fillText(`${dist.toFixed(2)}m`, midX + 6, midY - 6);
        }
      }
    }

    // Draw Drone Trails & Safety Spheres
    drones.forEach((drone) => {
      // 1. Trail Ribbon
      if (drone.trail.length > 1) {
        ctx.strokeStyle = drone.color;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        drone.trail.forEach((pos, idx) => {
          const pt = project3D(pos[0], pos[1], pos[2], w, h);
          if (idx === 0) ctx.moveTo(pt.sx, pt.sy);
          else ctx.lineTo(pt.sx, pt.sy);
        });
        ctx.stroke();
      }

      // 2. Ground Shadow
      const shadow = project3D(drone.x, drone.y, 0, w, h);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(shadow.sx, shadow.sy, 10 * shadow.scale, 5 * shadow.scale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tether line from drone to shadow
      const pos3d = project3D(drone.x, drone.y, drone.z, w, h);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pos3d.sx, pos3d.sy);
      ctx.lineTo(shadow.sx, shadow.sy);
      ctx.stroke();

      // 3. 3D Safety Bubble (r = 1.40m)
      ctx.fillStyle = `${drone.color}22`;
      ctx.strokeStyle = drone.color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(pos3d.sx, pos3d.sy, 22 * pos3d.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 4. Quadcopter Core Body
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(pos3d.sx, pos3d.sy, 6 * pos3d.scale, 0, Math.PI * 2);
      ctx.fill();

      // 5. Velocity Vector Arrow
      if (Math.abs(drone.vx) > 0.1 || Math.abs(drone.vy) > 0.1) {
        const arrowTip = project3D(drone.x + drone.vx * 0.8, drone.y + drone.vy * 0.8, drone.z + drone.vz * 0.8, w, h);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(pos3d.sx, pos3d.sy);
        ctx.lineTo(arrowTip.sx, arrowTip.sy);
        ctx.stroke();
      }

      // 6. Drone Name Badge
      ctx.fillStyle = drone.color;
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText(drone.name, pos3d.sx + 14, pos3d.sy - 8);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(`Alt: ${drone.z.toFixed(1)}m | Accel: ${drone.accel.toFixed(1)} m/s²`, pos3d.sx + 14, pos3d.sy + 6);
    });
  };

  // Mouse Drag to Rotate 3D Camera
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    setCameraAngle((prev) => prev + dx * 0.008);
    setCameraPitch((prev) => Math.max(0.1, Math.min(1.2, prev + dy * 0.005)));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const isGateG5Passed = recordedMinDistance >= 2.80;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: '#f8fafc' }}>
      
      {/* Top Header & Gate G5 Status Banner */}
      <div style={{ backgroundColor: '#090d16', borderRadius: '16px', padding: '16px 24px', border: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', padding: '10px', borderRadius: '10px' }}>
            <Compass style={{ color: '#38bdf8' }} size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Subsystem A: SORCA 3D Swarm Ring Crossing Arena
            </h2>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
              Industry-Grade 5-UAV Collision Avoidance under Bounded Acceleration (Gate G5: Clearance ≥ 2.80m)
            </div>
          </div>
        </div>

        {/* Gate G5 Verification Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: isGateG5Passed ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: `1px solid ${isGateG5Passed ? 'rgba(52, 211, 153, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, padding: '8px 16px', borderRadius: '10px' }}>
            <ShieldCheck style={{ color: isGateG5Passed ? '#34d399' : '#ef4444' }} size={18} />
            <div>
              <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Gate G5 Status</div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: isGateG5Passed ? '#34d399' : '#ef4444' }}>
                {isGateG5Passed ? 'GATE G5 PASSED' : 'GATE G5 BREACH'} ({recordedMinDistance.toFixed(2)}m ≥ 2.80m)
              </div>
            </div>
          </div>

          <button
            onClick={resetSimulation}
            style={{
              backgroundColor: '#0f172a',
              color: '#38bdf8',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RotateCcw size={14} /> Reset Arena
          </button>
        </div>

      </div>

      {/* Main Simulation Viewport & Side Panel Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
        
        {/* 3D Canvas Interactive Arena */}
        <div style={{ position: 'relative', height: '540px', backgroundColor: '#020617', borderRadius: '16px', overflow: 'hidden', border: '1.5px solid #1e293b', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7)' }}>
          
          <canvas
            ref={canvasRef}
            width={860}
            height={540}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ width: '100%', height: '100%', cursor: 'grab' }}
          />

          {/* Top-Left Viewport Badges */}
          <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', border: '1px solid #334155', padding: '4px 10px', borderRadius: '6px', color: '#38bdf8' }}>
              3D ISOMETRIC (Click & Drag to Rotate)
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', border: '1px solid #334155', padding: '4px 10px', borderRadius: '6px', color: '#cbd5e1' }}>
              Radius: {ringRadius.toFixed(1)}m
            </span>
          </div>

          {/* Bottom Floating Play/Pause Toolbar */}
          <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(9, 13, 22, 0.90)', backdropFilter: 'blur(10px)', border: '1px solid #334155', padding: '6px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                backgroundColor: isPlaying ? '#334155' : '#38bdf8',
                color: isPlaying ? '#ffffff' : '#0f172a',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />} {isPlaying ? 'Pause' : 'Resume'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#94a3b8' }}>
              <span>Speed:</span>
              {[0.5, 1.0, 2.0].map((s) => (
                <button
                  key={s}
                  onClick={() => setSimSpeed(s)}
                  style={{
                    backgroundColor: simSpeed === s ? '#38bdf8' : 'transparent',
                    color: simSpeed === s ? '#0f172a' : '#cbd5e1',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '10px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Configuration & Telemetry Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Dynamic Inter-Drone Pairwise Clearance */}
          <div style={{ backgroundColor: '#090d16', borderRadius: '16px', padding: '20px', border: '1px solid #1e293b' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 14px 0', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck style={{ color: '#34d399' }} size={18} />
              Inter-Drone Clearance Matrix
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {dronesRef.current.map((d1, i) => {
                const otherDrones = dronesRef.current.filter((d2) => d2.id !== d1.id);
                const dists = otherDrones.map((d2) => {
                  const dx = d1.x - d2.x;
                  const dy = d1.y - d2.y;
                  const dz = d1.z - d2.z;
                  return Math.sqrt(dx * dx + dy * dy + dz * dz);
                });
                const minD = Math.min(...dists);
                const isSafe = minD >= 2.80;

                return (
                  <div key={d1.id} style={{ backgroundColor: '#0f172a', borderRadius: '8px', padding: '8px 12px', border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: d1.color }}>{d1.name}</span>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: isSafe ? '#34d399' : '#ef4444' }}>
                        Min: {minD.toFixed(2)} m
                      </span>
                    </div>
                    {/* Visual Clearance Bar */}
                    <div style={{ width: '100%', height: '6px', backgroundColor: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (minD / 6.0) * 100)}%`, height: '100%', backgroundColor: isSafe ? '#34d399' : '#ef4444' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SORCA Algorithm & Obstacle Controls */}
          <div style={{ backgroundColor: '#090d16', borderRadius: '16px', padding: '20px', border: '1px solid #1e293b' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 14px 0', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders style={{ color: '#38bdf8' }} size={18} />
              GNC Algorithm Configuration
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Ring Diameter Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span style={{ color: '#94a3b8' }}>Ring Radius:</span>
                  <strong style={{ color: '#38bdf8' }}>{ringRadius.toFixed(1)} m</strong>
                </div>
                <input
                  type="range"
                  min="6"
                  max="18"
                  step="1"
                  value={ringRadius}
                  onChange={(e) => setRingRadius(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#38bdf8' }}
                />
              </div>

              {/* Toggle SORCA Acceleration Bounding */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a', padding: '10px 12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>SORCA Acceleration Limits</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>Smooth $a \le 2.50\text{ m/s}^2$ (Springer 2025)</div>
                </div>
                <button
                  onClick={() => setEnableSorca(!enableSorca)}
                  style={{
                    backgroundColor: enableSorca ? '#34d399' : '#334155',
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {enableSorca ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              {/* Toggle Central Obstacle Pillar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a', padding: '10px 12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>Central Hazard Pillar</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>Topology-Guided Obstacle Avoidance</div>
                </div>
                <button
                  onClick={() => setHasCentralObstacle(!hasCentralObstacle)}
                  style={{
                    backgroundColor: hasCentralObstacle ? '#ef4444' : '#334155',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {hasCentralObstacle ? 'ACTIVE' : 'OFF'}
                </button>
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
