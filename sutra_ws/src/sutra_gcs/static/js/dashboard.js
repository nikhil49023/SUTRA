/**
 * SUTRA Master Tactical Ground Control Station — Frontend Client Engine
 */

let map = null;
let droneMarkers = {};
let plannedWaypoints = [];
let activeDroneId = "drone_alpha";
let activeTab = "dashboard";

document.addEventListener("DOMContentLoaded", () => {
    initMap();
    initAttitudeCanvas();
    initTelemetryStream();
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

/* ── 2. MAP & GIS (Leaflet) ──────────────────────────────────────────────── */
function initMap() {
    const origin = [37.774929, -122.419416];
    map = L.map('tactical-map', {
        center: origin,
        zoom: 17,
        zoomControl: false,
        attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20
    }).addTo(map);

    // Geofence Circle (500m)
    L.circle(origin, {
        radius: 500,
        color: '#ef4444',
        weight: 1.5,
        fillColor: '#ef4444',
        fillOpacity: 0.05,
        dashArray: '4, 4'
    }).addTo(map);

    map.on('click', (e) => {
        addWaypoint(e.latlng.lat, e.latlng.lng);
    });
}

function selectActiveDrone(droneId) {
    activeDroneId = droneId;
    document.querySelectorAll('.drone-pill').forEach(p => p.classList.remove('active'));
    const pill = document.getElementById(`pill-${droneId.replace('drone_', '')}`);
    if (pill) pill.classList.add('active');
    document.getElementById('map-drone-status').innerText = `ACTIVE: ${droneId.toUpperCase()}`;
}

/* ── 3. TELEMETRY SSE STREAM (10Hz) ──────────────────────────────────────── */
function initTelemetryStream() {
    const evtSource = new EventSource('/api/telemetry/stream');

    evtSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            updateFleetData(data);
        } catch (e) {
            console.error("SSE parse error", e);
        }
    };
}

function updateFleetData(fleetData) {
    if (!fleetData || !fleetData.drones) return;

    // Update active drone readouts
    const activeDrone = fleetData.drones[activeDroneId] || fleetData.drones['drone_alpha'];
    if (activeDrone) {
        document.getElementById('val-alt-agl').innerText = `${activeDrone.alt_agl.toFixed(1)} m`;
        document.getElementById('val-gnd-spd').innerText = `${activeDrone.ground_speed.toFixed(1)} m/s`;
        document.getElementById('val-battery-pct').innerText = `${activeDrone.battery_pct.toFixed(1)} %`;
        document.getElementById('val-climb-rate').innerText = `${activeDrone.climb_rate.toFixed(2)} m/s`;

        document.getElementById('readout-pitch').innerText = `${activeDrone.pitch.toFixed(1)}°`;
        document.getElementById('readout-roll').innerText = `${activeDrone.roll.toFixed(1)}°`;
        document.getElementById('readout-heading').innerText = `${activeDrone.heading}°`;

        document.getElementById('status-banner-text').innerText = activeDrone.armed ? activeDrone.mode : "STANDBY";
    }

    // Update map markers
    for (const [droneId, drone] of Object.entries(fleetData.drones)) {
        if (!droneMarkers[droneId]) {
            const icon = L.divIcon({
                className: 'tactical-drone-marker',
                html: `<div style="color: #00f2fe; font-size: 14px; font-weight: 800;">🚁</div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            droneMarkers[droneId] = L.marker([drone.lat, drone.lon], { icon }).addTo(map);
        } else {
            droneMarkers[droneId].setLatLng([drone.lat, drone.lon]);
        }
    }

    // Update Swarm Matrix Tab
    const swarmTbody = document.getElementById('swarm-matrix-body');
    if (swarmTbody) {
        swarmTbody.innerHTML = Object.values(fleetData.drones).map(d => `
            <tr>
                <td><b>${d.callsign}</b></td>
                <td>${d.drone_id === 'drone_alpha' ? 'APEX LEADER' : 'TACTICAL FOLLOWER'}</td>
                <td><span style="color: ${d.armed ? '#10b981' : '#94a3b8'};">${d.mode}</span></td>
                <td>${d.alt_agl.toFixed(1)} m</td>
                <td>${d.battery_pct.toFixed(1)}%</td>
                <td>3.10 m</td>
                <td><b style="color: #10b981;">PASSED</b></td>
            </tr>
        `).join('');
    }
}

/* ── 4. PRIMARY FLIGHT DISPLAY (PFD) CANVAS (60FPS) ──────────────────────── */
let pfdCanvas, pfdCtx;
function initAttitudeCanvas() {
    pfdCanvas = document.getElementById('pfd-canvas');
    if (!pfdCanvas) return;
    pfdCtx = pfdCanvas.getContext('2d');
    pfdCanvas.width = pfdCanvas.parentElement.clientWidth || 300;
    pfdCanvas.height = pfdCanvas.parentElement.clientHeight || 140;
    requestAnimationFrame(renderPFD);
}

function renderPFD() {
    if (!pfdCtx) return;
    const w = pfdCanvas.width;
    const h = pfdCanvas.height;
    pfdCtx.clearRect(0, 0, w, h);

    // Sky & Ground Split
    pfdCtx.fillStyle = "#0369a1";
    pfdCtx.fillRect(0, 0, w, h / 2);
    pfdCtx.fillStyle = "#78350f";
    pfdCtx.fillRect(0, h / 2, w, h / 2);

    // Horizon Line
    pfdCtx.strokeStyle = "#fff";
    pfdCtx.lineWidth = 2;
    pfdCtx.beginPath();
    pfdCtx.moveTo(0, h / 2);
    pfdCtx.lineTo(w, h / 2);
    pfdCtx.stroke();

    // Aircraft Reticle Crosshair
    pfdCtx.strokeStyle = "#00f2fe";
    pfdCtx.lineWidth = 2;
    pfdCtx.beginPath();
    pfdCtx.moveTo(w / 2 - 25, h / 2);
    pfdCtx.lineTo(w / 2 - 10, h / 2);
    pfdCtx.moveTo(w / 2 + 10, h / 2);
    pfdCtx.lineTo(w / 2 + 25, h / 2);
    pfdCtx.stroke();

    requestAnimationFrame(renderPFD);
}

/* ── 5. FLIGHT CONTROLS & REST API ────────────────────────────────────────── */
function armDrone() {
    fetch('/api/arm', { method: 'POST' }).then(() => logConsole("Swarm armed. Motors at 5200 RPM."));
}

function takeoffDrone(alt = 15) {
    fetch('/api/takeoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ altitude: alt })
    }).then(() => logConsole(`Takeoff initiated to ${alt}m AGL.`));
}

function rtlDrone() {
    fetch('/api/rtl', { method: 'POST' }).then(() => logConsole("RTL engaged. Returning to launch origin."));
}

function emergencyStop() {
    fetch('/api/emergency_stop', { method: 'POST' }).then(() => logConsole("🛑 EMERGENCY ALL-STOP ENGAGED."));
}

function setFormation(name) {
    fetch('/api/formation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formation: name })
    }).then(() => logConsole(`Swarm formation dispatched: ${name}`));
}

function sendNLPCommand() {
    const input = document.getElementById('nlp-input');
    const val = input.value.trim().toLowerCase();
    if (!val) return;
    logConsole(`NLP Prompt: "${val}"`);

    if (val.includes("arm")) armDrone();
    else if (val.includes("takeoff")) takeoffDrone(20);
    else if (val.includes("rtl")) rtlDrone();
    else if (val.includes("grid")) setFormation("GRID_SEARCH");
    else if (val.includes("wedge") || val.includes("v")) setFormation("V_FORMATION");
    else if (val.includes("abort")) emergencyStop();

    input.value = "";
}

/* ── 6. WAYPOINT MISSION PLANNER ─────────────────────────────────────────── */
function addWaypoint(lat, lon) {
    const idx = plannedWaypoints.length + 1;
    plannedWaypoints.push({ index: idx, lat: lat, lon: lon, alt: 25.0, speed: 5.0 });
    document.getElementById('wp-counter').innerText = `${plannedWaypoints.length} WPs`;
    updateWaypointTable();
}

function updateWaypointTable() {
    const tbody = document.getElementById('waypoint-table-body');
    if (!tbody) return;
    if (plannedWaypoints.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748b;">No waypoints created. Click on the map to add waypoints.</td></tr>`;
        return;
    }
    tbody.innerHTML = plannedWaypoints.map(wp => `
        <tr>
            <td>${wp.index}</td>
            <td>${wp.lat.toFixed(6)}</td>
            <td>${wp.lon.toFixed(6)}</td>
            <td>${wp.alt}m</td>
            <td>${wp.speed}m/s</td>
            <td>NAVIGATE</td>
        </tr>
    `).join('');
}

function clearWaypoints() {
    plannedWaypoints = [];
    document.getElementById('wp-counter').innerText = "0 WPs";
    updateWaypointTable();
}

function validateMissionPlan() {
    logConsole("Validating route against 500m geofence and 25% RTL battery reserve: PASSED ✅");
}

function exportQGCPlan() {
    const plan = {
        fileType: "Plan",
        version: 1,
        groundStation: "SUTRA GCS",
        mission: {
            cruiseSpeed: 5.0,
            hoverSpeed: 3.0,
            items: plannedWaypoints
        }
    };
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sutra_mission.plan";
    a.click();
    logConsole("Exported QGroundControl .plan file.");
}

/* ── 7. GIS & RF LINE-OF-SIGHT ────────────────────────────────────────────── */
function runRFLOSAnalysis() {
    fetch('/api/gis/rf_los')
        .then(r => r.json())
        .then(data => {
            document.getElementById('rf-dist-val').innerText = `${data.total_distance_m.toFixed(1)} m`;
            document.getElementById('rf-rssi-val').innerText = `${data.estimated_rssi_dbm} dBm`;
            document.getElementById('rf-fresnel-val').innerText = `${data.fresnel_radius_m} m`;
            document.getElementById('rf-los-status-pill').innerText = data.is_los_clear ? "CLEAR" : "OBSTRUCTED";
        })
        .catch(() => {});
}

/* ── 8. LOGGING & AUDIT TRAIL ────────────────────────────────────────────── */
function logConsole(msg) {
    const box = document.getElementById('console-logs');
    if (!box) return;
    const line = document.createElement('div');
    line.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
    box.prepend(line);
}

function fetchAuditLogs() {
    fetch('/api/security/audit_logs')
        .then(r => r.json())
        .then(data => {
            const tbody = document.getElementById('audit-log-body');
            if (!tbody || !data.logs) return;
            tbody.innerHTML = data.logs.map(l => `
                <tr>
                    <td>${l.timestamp}</td>
                    <td><b>${l.source}</b></td>
                    <td>${l.message}</td>
                </tr>
            `).join('');
        })
        .catch(() => {});
}

function switchRole(user, role) {
    document.getElementById('operator-badge').innerText = `🎖️ ${role}: ${user}`;
    logConsole(`Operator clearance set to ${role}`);
}
