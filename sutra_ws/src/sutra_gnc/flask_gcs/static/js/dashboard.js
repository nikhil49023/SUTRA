/**
 * SUTRA Master Tactical Ground Control Station — Full Feature Frontend
 * Team Offgrid | Subsystems A, B, C, D Integration
 */

let map = null;
let currentTileLayer = null;
let tileLayers = {};
let droneMarkers = {};
let flightPathPolylines = {};
let waypointMarkers = [];
let waypointPolyline = null;
let sarTargetMarkers = [];
let plannedWaypoints = [];
let activeDroneId = "drone_alpha";
let currentFleetData = null;
let activeTab = "dashboard";

document.addEventListener("DOMContentLoaded", () => {
    initMap();
    initAttitudeCanvas();
    initTelemetryStream();
    initEventHandlers();
    runRFLOSAnalysis();
    fetchAuditLogs();
});

/* ── 1. MASTER TAB NAVIGATION ────────────────────────────────────────────── */
function switchTab(tabName) {
    activeTab = tabName;
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-view').forEach(view => view.classList.remove('active'));

    const activeBtn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.getAttribute('onclick')?.includes(tabName));
    if (activeBtn) activeBtn.classList.add('active');

    const targetView = document.getElementById(`view-${tabName}`);
    if (targetView) targetView.classList.add('active');

    if (tabName === 'dashboard') {
        setTimeout(() => map && map.invalidateSize(), 150);
    } else if (tabName === 'gis') {
        runRFLOSAnalysis();
    } else if (tabName === 'settings') {
        fetchAuditLogs();
    }
}

/* ── 2. MAP & GIS LAYERS (Leaflet GIS) ────────────────────────────────────── */
function initMap() {
    const origin = [37.774929, -122.419416];

    map = L.map('tactical-map', {
        center: origin,
        zoom: 17,
        zoomControl: false,
        attributionControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Multi-Layer Tile Definitions
    tileLayers = {
        dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 20, subdomains: 'abcd' }),
        satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }),
        terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17 }),
        street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 })
    };

    currentTileLayer = tileLayers.dark;
    currentTileLayer.addTo(map);

    // Geofence Circle (500m Safety Perimeter)
    L.circle(origin, {
        radius: 500,
        color: '#ef4444',
        weight: 1.5,
        dashArray: '6, 6',
        fillColor: '#ef4444',
        fillOpacity: 0.03
    }).addTo(map);

    // Waypoint Polyline Layer
    waypointPolyline = L.polyline([], { color: '#00f2fe', weight: 2.5, dashArray: '4, 4' }).addTo(map);

    // Map Click -> Add Waypoint
    map.on('click', (e) => {
        addWaypoint(e.latlng.lat, e.latlng.lng, 20.0);
    });
}

function setMapLayer(layerKey) {
    if (tileLayers[layerKey] && currentTileLayer !== tileLayers[layerKey]) {
        map.removeLayer(currentTileLayer);
        currentTileLayer = tileLayers[layerKey];
        currentTileLayer.addTo(map);
    }
}

function createDroneIcon(droneId, headingDeg, isSelected) {
    const color = isSelected ? '#00f2fe' : '#3b82f6';
    const borderColor = isSelected ? '#1de9b6' : '#60a5fa';
    const label = droneId.replace('drone_', '').toUpperCase();

    const svgHtml = `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
            <div style="transform: rotate(${headingDeg}deg); transition: transform 0.1s linear;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="${color}" stroke="${borderColor}" stroke-width="1.5">
                    <polygon points="12,2 22,21 12,17 2,21" />
                </svg>
            </div>
            <span style="position: absolute; bottom: -12px; font-size: 8px; font-weight: 800; color: #fff; background: rgba(0,0,0,0.85); padding: 1px 3px; border-radius: 2px; border: 1px solid ${borderColor};">
                ${label}
            </span>
        </div>
    `;

    return L.divIcon({
        className: 'custom-drone-icon',
        html: svgHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
    });
}

/* ── 3. REAL-TIME TELEMETRY (SSE STREAM) ─────────────────────────────────── */
function initTelemetryStream() {
    const evtSource = new EventSource('/api/telemetry/stream');

    evtSource.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            currentFleetData = data;
            updateMasterDashboard(data);
        } catch (err) {
            console.error("SSE error:", err);
        }
    };
}

function updateMasterDashboard(data) {
    const drones = data.drones || {};
    const selectedDrone = drones[activeDroneId] || Object.values(drones)[0];

    // 1. Dashboard View Updates
    updateFleetSidebar(drones);
    updateMapDrones(drones);
    updateDetections(data.detections || []);
    if (selectedDrone) {
        updateGauges(selectedDrone);
        drawArtificialHorizon(selectedDrone.pitch || 0, selectedDrone.roll || 0, selectedDrone.yaw || 0);
    }

    // 2. Swarm Matrix Table
    updateSwarmMatrix(drones);

    // 3. MAVLink Inspector View
    if (data.mavlink && activeTab === 'comms') {
        const view = document.getElementById('mavlink-packet-view');
        if (view) view.textContent = JSON.stringify(data.mavlink, null, 2);
    }

    // 4. AI SAR Table & Threat Index
    if (data.threat_info) {
        document.getElementById('threat-score-val').textContent = `${data.threat_info.threat_level} (${data.threat_info.threat_score})`;
        document.getElementById('threat-survivors-val').textContent = `${data.threat_info.survivors_located} LOCATED`;
        document.getElementById('threat-hazards-val').textContent = `${data.threat_info.critical_targets} ACTIVE`;
    }

    // 5. Operator Badge
    if (data.operator) {
        document.getElementById('top-operator-callsign').textContent = `${data.operator.callsign} (${data.operator.role})`;
    }
}

function updateFleetSidebar(drones) {
    for (const [dId, drone] of Object.entries(drones)) {
        const card = document.getElementById(`card-${dId}`);
        if (!card) continue;

        const badge = card.querySelector('.status-badge');
        if (badge) {
            badge.textContent = drone.mode;
            badge.className = `status-badge ${drone.armed ? 'status-armed' : 'status-disarmed'} ${drone.mode === 'RTL' ? 'status-rtl' : ''} ${drone.mode === 'EMERGENCY' ? 'status-emergency' : ''}`;
        }

        const statAlt = card.querySelector('.stat-alt');
        const statSpd = card.querySelector('.stat-spd');
        const statBat = card.querySelector('.stat-bat');

        if (statAlt) statAlt.textContent = `${drone.alt_agl.toFixed(1)}m`;
        if (statSpd) statSpd.textContent = `${drone.ground_speed.toFixed(1)}m/s`;
        if (statBat) statBat.textContent = `${drone.battery_pct.toFixed(0)}%`;
    }
}

function updateMapDrones(drones) {
    for (const [dId, drone] of Object.entries(drones)) {
        const pos = [drone.lat, drone.lon];
        const isSelected = (dId === activeDroneId);

        if (!droneMarkers[dId]) {
            droneMarkers[dId] = L.marker(pos, { icon: createDroneIcon(dId, drone.heading || 0, isSelected) }).addTo(map);
            droneMarkers[dId].on('click', () => selectDrone(dId));
            flightPathPolylines[dId] = L.polyline([pos], { color: isSelected ? '#00f2fe' : '#475569', weight: 1.5, opacity: 0.7 }).addTo(map);
        } else {
            droneMarkers[dId].setLatLng(pos);
            droneMarkers[dId].setIcon(createDroneIcon(dId, drone.heading || 0, isSelected));

            const latlngs = flightPathPolylines[dId].getLatLngs();
            latlngs.push(pos);
            if (latlngs.length > 60) latlngs.shift();
            flightPathPolylines[dId].setLatLngs(latlngs);
            flightPathPolylines[dId].setStyle({ color: isSelected ? '#00f2fe' : '#475569' });
        }
    }
}

function updateGauges(drone) {
    document.getElementById('val-alt-agl').textContent = `${drone.alt_agl.toFixed(1)} m`;
    document.getElementById('val-gnd-spd').textContent = `${drone.ground_speed.toFixed(1)} m/s`;
    document.getElementById('val-battery-pct').textContent = `${drone.battery_pct.toFixed(1)} %`;
    document.getElementById('val-climb-rate').textContent = `${drone.climb_rate.toFixed(1)} m/s`;
    document.getElementById('val-satellites').textContent = `${drone.satellites} Sats`;
    document.getElementById('val-link-lat').textContent = `${drone.link_latency_ms.toFixed(0)} ms (${drone.link_quality.toFixed(0)}%)`;

    document.getElementById('readout-pitch').textContent = `${drone.pitch.toFixed(1)}°`;
    document.getElementById('readout-roll').textContent = `${drone.roll.toFixed(1)}°`;
    document.getElementById('readout-heading').textContent = `${drone.heading.toFixed(0)}°`;

    document.getElementById('status-banner-text').textContent = drone.status_message || `${drone.mode} ACTIVE`;
}

function updateDetections(detections) {
    const camBox = document.getElementById('camera-stream-box');
    const badge = document.getElementById('sar-detection-count');
    if (badge) badge.textContent = `${detections.length} TARGETS`;

    // Clear bounding boxes
    camBox.querySelectorAll('.cam-bbox').forEach(b => b.remove());

    // Clear map beacons
    sarTargetMarkers.forEach(m => map.removeLayer(m));
    sarTargetMarkers = [];

    const aiTableBody = document.getElementById('ai-sar-table-body');
    if (aiTableBody) aiTableBody.innerHTML = "";

    detections.forEach(d => {
        const iconColor = d.type === 'SURVIVOR' ? '#10b981' : (d.type === 'FIRE_HAZARD' ? '#ef4444' : '#f59e0b');

        // 1. Map Marker
        const marker = L.circleMarker([d.lat, d.lon], { radius: 8, color: iconColor, fillColor: iconColor, fillOpacity: 0.8, weight: 2 }).addTo(map);
        marker.bindPopup(`<b>${d.label}</b><br>Confidence: ${(d.confidence * 100).toFixed(0)}%<br>Range: ${d.distance_m}m`);
        sarTargetMarkers.push(marker);

        // 2. Camera overlay
        if (d.bbox && d.bbox.length === 4) {
            const bboxDiv = document.createElement('div');
            bboxDiv.className = 'cam-bbox';
            bboxDiv.style.left = `${d.bbox[0] * 100}%`;
            bboxDiv.style.top = `${d.bbox[1] * 100}%`;
            bboxDiv.style.width = `${d.bbox[2] * 100}%`;
            bboxDiv.style.height = `${d.bbox[3] * 100}%`;
            bboxDiv.style.borderColor = iconColor;
            bboxDiv.textContent = `${d.type} ${(d.confidence * 100).toFixed(0)}%`;
            camBox.appendChild(bboxDiv);
        }

        // 3. AI Table Row
        if (aiTableBody) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><b>${d.target_id}</b></td>
                <td>${d.label}</td>
                <td style="color: #10b981;">${(d.confidence * 100).toFixed(0)}%</td>
                <td><span class="status-badge" style="background: rgba(239, 68, 68, 0.2); color: ${iconColor};">${d.priority}</span></td>
                <td style="font-family: monospace;">${d.lat.toFixed(5)}, ${d.lon.toFixed(5)}</td>
            `;
            aiTableBody.appendChild(tr);
        }
    });
}

function updateSwarmMatrix(drones) {
    const tbody = document.getElementById('swarm-matrix-body');
    if (!tbody) return;
    tbody.innerHTML = "";

    for (const [dId, drone] of Object.entries(drones)) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><b>${drone.name}</b></td>
            <td><span class="status-badge ${drone.armed ? 'status-armed' : 'status-disarmed'}">${drone.mode}</span></td>
            <td>${drone.alt_agl.toFixed(1)} m</td>
            <td>${drone.ground_speed.toFixed(1)} m/s</td>
            <td>${drone.battery_pct.toFixed(0)}% (${drone.battery_voltage.toFixed(1)}V)</td>
            <td style="color: #10b981;">${drone.link_latency_ms.toFixed(0)}ms</td>
        `;
        tbody.appendChild(tr);
    }
}

/* ── 4. PRIMARY FLIGHT DISPLAY (PFD Artificial Horizon) ──────────────────── */
function initAttitudeCanvas() {
    const canvas = document.getElementById('pfd-canvas');
    if (!canvas) return;
    canvas.width = 190;
    canvas.height = 130;
    drawArtificialHorizon(0, 0, 0);
}

function drawArtificialHorizon(pitchDeg, rollDeg, headingDeg) {
    const canvas = document.getElementById('pfd-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    ctx.translate(cx, cy);
    const rollRad = (rollDeg * Math.PI) / 180;
    ctx.rotate(rollRad);

    const pitchOffset = pitchDeg * 2.0;

    // Sky
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-w * 2, -h * 2 + pitchOffset, w * 4, h * 2);

    // Ground
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-w * 2, pitchOffset, w * 4, h * 2);

    // Horizon Line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w * 2, pitchOffset);
    ctx.lineTo(w * 2, pitchOffset);
    ctx.stroke();

    // Pitch Ladder Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    for (let p = -40; p <= 40; p += 10) {
        if (p === 0) continue;
        const y = pitchOffset - p * 2.0;
        const barWidth = Math.abs(p) % 20 === 0 ? 28 : 14;
        ctx.beginPath();
        ctx.moveTo(-barWidth, y);
        ctx.lineTo(barWidth, y);
        ctx.stroke();
        ctx.fillText(`${p}°`, barWidth + 3, y + 3);
    }

    ctx.restore();

    // Reticle
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 26, cy); ctx.lineTo(cx - 8, cy); ctx.lineTo(cx - 8, cy + 5);
    ctx.moveTo(cx + 26, cy); ctx.lineTo(cx + 8, cy); ctx.lineTo(cx + 8, cy + 5);
    ctx.moveTo(cx - 2, cy); ctx.lineTo(cx + 2, cy);
    ctx.stroke();
}

/* ── 5. GIS TERRAIN ELEVATION & RF FRESNEL CANVAS ─────────────────────────── */
async function runRFLOSAnalysis() {
    try {
        const resp = await fetch('/api/gis/rf_los');
        const data = await resp.json();

        // Update indicators
        document.getElementById('rf-dist-val').textContent = `${data.total_distance_m} m`;
        document.getElementById('rf-rssi-val').textContent = `${data.estimated_rssi_dbm} dBm`;
        document.getElementById('rf-loss-val').textContent = `${data.path_loss_db} dB`;
        document.getElementById('rf-fresnel-val').textContent = `${data.min_fresnel_clearance_m > 0 ? '+' : ''}${data.min_fresnel_clearance_m} m`;

        const pill = document.getElementById('rf-los-status-pill');
        if (data.is_los_clear) {
            pill.textContent = "LOS CLEAR ✅";
            pill.style.color = "#10b981";
            pill.style.borderColor = "#10b981";
        } else {
            pill.textContent = "LOS BLOCKED ⚠️";
            pill.style.color = "#ef4444";
            pill.style.borderColor = "#ef4444";
        }

        drawRFElevationCanvas(data.profile || []);
    } catch (err) {
        console.error("RF LOS error:", err);
    }
}

function drawRFElevationCanvas(profile) {
    const canvas = document.getElementById('rf-elevation-canvas');
    if (!canvas || !profile.length) return;
    canvas.width = canvas.clientWidth || 360;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const maxAlt = 100.0;
    const minAlt = 20.0;
    const scaleY = (alt) => h - ((alt - minAlt) / (maxAlt - minAlt)) * (h - 20) - 10;
    const scaleX = (idx) => (idx / (profile.length - 1)) * (w - 30) + 15;

    // 1. Terrain Fill
    ctx.beginPath();
    ctx.moveTo(scaleX(0), h);
    profile.forEach((pt, i) => ctx.lineTo(scaleX(i), scaleY(pt.terrain_alt_msl)));
    ctx.lineTo(scaleX(profile.length - 1), h);
    ctx.closePath();
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.stroke();

    // 2. Direct RF Beam Line
    ctx.beginPath();
    profile.forEach((pt, i) => {
        const x = scaleX(i);
        const y = scaleY(pt.beam_alt_msl);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3. Fresnel Zone Upper & Lower Curves
    ctx.beginPath();
    profile.forEach((pt, i) => {
        const x = scaleX(i);
        const y = scaleY(pt.beam_alt_msl + pt.fresnel_radius_m);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    profile.slice().reverse().forEach((pt, i) => {
        const origIdx = profile.length - 1 - i;
        const x = scaleX(origIdx);
        const y = scaleY(pt.beam_alt_msl - pt.fresnel_radius_m);
        ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 242, 254, 0.1)';
    ctx.fill();

    // Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '8px monospace';
    ctx.fillText("GCS Origin (45m)", 10, h - 6);
    ctx.fillText("UAV Target (150m MSL)", w - 100, 14);
}

/* ── 6. MISSION PLANNER & WAYPOINTS ──────────────────────────────────────── */
function addWaypoint(lat, lon, alt = 20.0) {
    const wpIdx = plannedWaypoints.length + 1;
    const wp = { lat, lon, alt, speed: 5.0, index: wpIdx };
    plannedWaypoints.push(wp);

    const marker = L.circleMarker([lat, lon], { radius: 6, color: '#00f2fe', fillColor: '#00f2fe', fillOpacity: 0.9 }).addTo(map);
    marker.bindTooltip(`WP ${wpIdx} (${alt}m)`, { permanent: true, direction: 'top', offset: [0, -8] });
    waypointMarkers.push(marker);

    const path = plannedWaypoints.map(w => [w.lat, w.lon]);
    waypointPolyline.setLatLngs(path);

    document.getElementById('wp-counter').textContent = `${plannedWaypoints.length} WPs`;
    renderWaypointTable();
}

function clearWaypoints() {
    plannedWaypoints = [];
    waypointMarkers.forEach(m => map.removeLayer(m));
    waypointMarkers = [];
    waypointPolyline.setLatLngs([]);
    document.getElementById('wp-counter').textContent = `0 WPs`;
    renderWaypointTable();
}

function renderWaypointTable() {
    const tbody = document.getElementById('waypoint-table-body');
    if (!tbody) return;
    if (plannedWaypoints.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748b;">No waypoints added. Click on the map to add points.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";
    plannedWaypoints.forEach((wp, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><b>${i + 1}</b></td>
            <td>${wp.lat.toFixed(6)}</td>
            <td>${wp.lon.toFixed(6)}</td>
            <td><input type="number" value="${wp.alt}" style="width: 50px; background: #050811; color: #a5f3fc; border: 1px solid #334155; padding: 2px 4px; font-size: 9px;" onchange="plannedWaypoints[${i}].alt = parseFloat(this.value)"></td>
            <td>${wp.speed} m/s</td>
            <td><button onclick="removeWaypoint(${i})" style="background: transparent; border: none; color: #ef4444; cursor: pointer;">✖</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function removeWaypoint(idx) {
    if (waypointMarkers[idx]) map.removeLayer(waypointMarkers[idx]);
    waypointMarkers.splice(idx, 1);
    plannedWaypoints.splice(idx, 1);
    waypointPolyline.setLatLngs(plannedWaypoints.map(w => [w.lat, w.lon]));
    document.getElementById('wp-counter').textContent = `${plannedWaypoints.length} WPs`;
    renderWaypointTable();
}

async function validateMission() {
    try {
        const resp = await fetch('/api/mission/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ waypoints: plannedWaypoints })
        });
        const rep = await resp.json();
        const box = document.getElementById('validation-report-box');
        box.style.display = 'block';

        if (rep.valid) {
            box.style.borderColor = '#10b981';
            box.innerHTML = `
                <b style="color: #10b981;">✅ PRE-FLIGHT VALIDATION PASSED</b><br>
                Distance: ${rep.total_distance_m}m | Est. Time: ${Math.round(rep.est_flight_time_sec)}s | Battery Draw: ${rep.est_battery_consumed_pct}% | Reserve at RTL: <b>${rep.est_battery_remaining_pct}%</b>
            `;
            document.getElementById('plan-total-dist').textContent = `${rep.total_distance_m} m`;
            document.getElementById('plan-est-time').textContent = `${Math.round(rep.est_flight_time_sec)}s`;
            document.getElementById('plan-bat-consumed').textContent = `${rep.est_battery_consumed_pct} %`;
            document.getElementById('plan-bat-reserve').textContent = `${rep.est_battery_remaining_pct} %`;
        } else {
            box.style.borderColor = '#ef4444';
            box.innerHTML = `<b style="color: #ef4444;">❌ VALIDATION ERROR:</b> ${rep.error}`;
        }
    } catch (err) {
        console.error(err);
    }
}

async function uploadWaypoints() {
    if (plannedWaypoints.length === 0) {
        alert("Click on the map to add waypoints first!");
        return;
    }

    try {
        const resp = await fetch('/api/waypoints', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ drone_id: activeDroneId, waypoints: plannedWaypoints, auto_start: true })
        });
        const res = await resp.json();
        alert(res.message || res.error);
    } catch (err) {
        console.error(err);
    }
}

async function exportQGCPlan() {
    try {
        const resp = await fetch('/api/mavlink/export_plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ waypoints: plannedWaypoints })
        });
        const blob = await resp.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "sutra_mission.plan";
        a.click();
    } catch (err) {
        console.error(err);
    }
}

async function importQGCPlan() {
    const text = document.getElementById('qgc-plan-import-text').value;
    try {
        const resp = await fetch('/api/mavlink/import_plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan_json: text })
        });
        const res = await resp.json();
        if (res.success && res.waypoints) {
            clearWaypoints();
            res.waypoints.forEach(wp => addWaypoint(wp.lat, wp.lon, wp.alt));
            alert(`Imported ${res.count} waypoints from QGroundControl plan!`);
        }
    } catch (err) {
        alert("Invalid QGC .plan JSON syntax.");
    }
}

/* ── 7. BLACKBOX FLIGHT REPLAY CONTROLS ──────────────────────────────────── */
async function controlReplay(action) {
    try {
        const resp = await fetch('/api/replay/control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
        });
        const res = await resp.json();
        console.log("Replay action:", res);
    } catch (err) {
        console.error(err);
    }
}

async function setReplaySpeed(spd) {
    document.getElementById('replay-speed-val').textContent = `${spd}x`;
    fetch('/api/replay/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'speed', speed: spd })
    });
}

function seekReplay(e) {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const total = 500; // estimated keyframes
    const targetFrame = Math.floor(pct * total);

    document.getElementById('replay-timeline-fill').style.width = `${pct * 100}%`;
    document.getElementById('replay-frame-cur').textContent = targetFrame;

    fetch('/api/replay/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seek', frame_idx: targetFrame })
    });
}

function exportFlightLog() {
    window.location.href = '/api/replay/export';
}

/* ── 8. SECURITY RBAC & AUDIT LOGS ───────────────────────────────────────── */
async function switchRole(callsign, role) {
    try {
        const resp = await fetch('/api/security/switch_user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callsign, role })
        });
        const res = await resp.json();
        if (res.user) {
            document.getElementById('top-operator-callsign').textContent = `${res.user.callsign} (${res.user.role})`;
            alert(`Operator switched to ${res.user.callsign} [${res.user.role}]`);
            fetchAuditLogs();
        }
    } catch (err) {
        console.error(err);
    }
}

async function fetchAuditLogs() {
    try {
        const resp = await fetch('/api/security/audit_logs');
        const data = await resp.json();
        const tbody = document.getElementById('audit-log-body');
        if (!tbody) return;
        tbody.innerHTML = "";
        (data.logs || []).forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="color: #94a3b8;">${log.timestamp}</td>
                <td><b>${log.operator}</b></td>
                <td><span class="status-badge" style="background: rgba(0, 242, 254, 0.15); color: #00f2fe;">${log.role}</span></td>
                <td style="color: #facc15;">${log.action}</td>
                <td>${log.details}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
    }
}

/* ── 9. QUICK COMMANDS & FORMATIONS ──────────────────────────────────────── */
function selectDrone(droneId) {
    activeDroneId = droneId;
    document.querySelectorAll('.drone-card').forEach(c => c.classList.remove('active'));
    const activeCard = document.getElementById(`card-${droneId}`);
    if (activeCard) activeCard.classList.add('active');

    fetch('/api/select_drone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drone_id: droneId })
    });
}

async function sendCommand(command, droneTarget = 'selected') {
    try {
        const resp = await fetch('/api/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ drone_id: droneTarget, command })
        });
        const res = await resp.json();
        if (!res.success) alert(res.error);
    } catch (err) {
        console.error("Command error:", err);
    }
}

async function setFormation(formation) {
    if (!currentFleetData) return;
    const selected = currentFleetData.drones[activeDroneId];
    const centerLat = selected ? selected.lat : 37.774929;
    const centerLon = selected ? selected.lon : -122.419416;

    try {
        const resp = await fetch('/api/formation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ formation, center_lat: centerLat, center_lon: centerLon, altitude: 20.0 })
        });
        const res = await resp.json();
        alert(res.message);
    } catch (err) {
        console.error(err);
    }
}

async function switchCameraMode(mode) {
    try {
        const resp = await fetch('/api/camera/mode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode })
        });
        const res = await resp.json();
        alert(`Switched sensor feed to ${res.camera_mode}`);
    } catch (err) {
        console.error(err);
    }
}

async function executeNLPCommand() {
    const input = document.getElementById('nlp-input-field');
    const prompt = input.value.trim();
    if (!prompt) return;

    try {
        const resp = await fetch('/api/nlp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });
        const res = await resp.json();
        input.value = "";
        alert(res.parsed.message);
    } catch (err) {
        console.error("NLP error:", err);
    }
}

function initEventHandlers() {
    document.getElementById('btn-arm')?.addEventListener('click', () => sendCommand('arm'));
    document.getElementById('btn-disarm')?.addEventListener('click', () => sendCommand('disarm'));
    document.getElementById('btn-takeoff')?.addEventListener('click', () => sendCommand('takeoff'));
    document.getElementById('btn-land')?.addEventListener('click', () => sendCommand('land'));
    document.getElementById('btn-loiter')?.addEventListener('click', () => sendCommand('loiter'));
    document.getElementById('btn-rtl')?.addEventListener('click', () => sendCommand('rtl'));
    document.getElementById('btn-emergency-top')?.addEventListener('click', () => sendCommand('emergency', 'all'));

    document.getElementById('btn-nlp-send')?.addEventListener('click', executeNLPCommand);
    document.getElementById('nlp-input-field')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') executeNLPCommand();
    });
}
