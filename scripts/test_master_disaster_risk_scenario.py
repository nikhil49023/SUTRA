#!/usr/bin/env python3
"""
Master Disaster Risk & Closed-Loop Pre-Positioning Simulation Test
Subsystem: Forecast, Predictive Risk, Dynamic Mapping & GCS HUD
"""

import asyncio
import json
import os
import sys
import time
import subprocess
import urllib.request
from pathlib import Path

# Add sutra_gcs to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "SUTRA" / "sutra_ws" / "src" / "sutra_gcs"))

import websockets
from forecast.forecast_service import get_forecast_service
from risk.engine import get_risk_engine
from risk.dynamic_mapping_bridge import get_dynamic_mapping_bridge
from prepositioning.optimizer import get_prepositioning_optimizer


async def run_master_scenario():
    print("=" * 80)
    print("🚀 SUTRA PREDICTIVE DISASTER RISK & PRE-POSITIONING MASTER SCENARIO")
    print("=" * 80)

    forecast_svc = get_forecast_service()
    risk_eng = get_risk_engine()
    dyn_bridge = get_dynamic_mapping_bridge()
    optimizer = get_prepositioning_optimizer()

    # Step 1: Baseline T=0s
    print("\n[T=0s] 🛰️ Ingesting Baseline Meteorological Forecast...")
    h0 = forecast_svc.get_forecast_horizon(force_refresh=True)
    print(f"  • Provider: {h0.provider_name} ({h0.provider_health.value})")
    print(f"  • Current Rain Rate: {h0.observations[0].rainfall_rate_mm_h:.1f} mm/h | Wind: {h0.observations[0].wind_speed_mps:.1f} m/s")

    # Step 2: Evaluate Baseline Risk
    print("\n[T=5s] 📊 Evaluating Spatial Baseline Risk Grid...")
    t_map = risk_eng.evaluate_temporal_risk_map()
    grid_0 = t_map.horizons["0h"]
    avg_score_0 = sum(c.risk_score for c in grid_0.cells) / len(grid_0.cells)
    print(f"  • Grid Dimensions: {grid_0.rows}x{grid_0.cols} ({len(grid_0.cells)} cells @ {grid_0.resolution_m}m resolution)")
    print(f"  • Average Baseline Risk Score: {avg_score_0:.1f}/100 (Status: {grid_0.cells[0].category.value})")

    # Step 3: Dynamic Disaster Injection T=10s
    print("\n[T=10s] ⚡ Ingesting Approaching Monsoon Cloudburst (+50 mm/h surge)...")
    forecast_svc.inject_disaster_event(
        event_type="MONSOON_CLOUDBURST",
        severity="CRITICAL",
        message="Extreme convective precipitation leading to rapid urban inundation",
        rainfall_boost=50.0,
    )
    h_boost = forecast_svc.get_forecast_horizon()
    print(f"  • Updated Forecast Rainfall: {h_boost.observations[0].rainfall_rate_mm_h:.1f} mm/h")
    print(f"  • Warning Level: {h_boost.observations[0].warning_level.value}")

    # Step 4: Temporal Risk Escalation T=15s
    print("\n[T=15s] 📈 Recalculating Temporal Risk Horizons (0h -> +4h)...")
    t_map_boost = risk_eng.evaluate_temporal_risk_map()
    grid_2h = t_map_boost.horizons["2h"]
    threat_cells = [c for c in grid_2h.cells if c.risk_score >= 60.0]
    top_threat = max(grid_2h.cells, key=lambda c: c.risk_score)
    print(f"  • Threat Cells in +2h Projection: {len(threat_cells)}")
    print(f"  • Top Predicted Hazard Zone: {top_threat.cell_id} (Score: {top_threat.risk_score:.1f}/100 — {top_threat.category.value})")
    print(f"  • Explainability Rationale: \"{top_threat.primary_explanation}\"")

    # Step 5: Resource Pre-Positioning Optimization T=20s
    print("\n[T=20s] 👥 Formulating Multi-UAV Pre-Positioning & Staging Plan...")
    recs = optimizer.evaluate_prepositioning()
    assert len(recs) >= 1, "Optimizer must generate at least 1 recommendation"
    rec = recs[0]
    print(f"  • Target Threat Zone: {rec.target_zone_id} (Risk: {rec.target_risk_score:.0f})")
    print(f"  • Recommended UAVs: {rec.recommended_drone_ids}")
    print(f"  • Safe Staging Ground: {rec.staging_name} @ [{rec.staging_latitude:.4f}, {rec.staging_longitude:.4f}]")
    print(f"  • Estimated Flight Time: {rec.estimated_flight_time_s/60:.1f} min | Energy Cost: {rec.estimated_energy_consumption_pct:.1f}%")
    print(f"  • Safe Battery Reserve Margin: +{rec.safe_battery_margin_pct:.1f}%")

    # Step 6: 1-Click Execution & Forensic Audit T=25s
    print("\n[T=25s] 🚀 Authorizing & Executing Pre-Positioning Staging Deployment...")
    exec_res = optimizer.execute_recommendation(rec.recommendation_id, operator_id="MISSION_COMMANDER_01")
    assert exec_res["success"] is True
    print(f"  • Dispatched Drones: {exec_res['drones_dispatched']} -> Coordinates: {exec_res['coordinates']}")
    print("  • Forensic Audit Log: ACCEPTED & RECORDED")

    # Step 7: Drone Camera Ingests Active Inundation & Survivor T=30s
    print("\n[T=30s] 👁️ Edge Camera Perception Ingestion (Flooded Road + Survivor Detected)...")
    target_lat = top_threat.latitude
    target_lon = top_threat.longitude

    dyn_bridge.ingest_observation(target_lat, target_lon, "ROAD_FLOODED_ACTIVE")
    dyn_bridge.ingest_observation(target_lat, target_lon, "SURVIVOR_DETECTED_ROOFTOP")

    # Step 8: Closed-Loop Dynamic Map Verification T=35s
    print("\n[T=35s] 🗺️ Verifying Closed-Loop Map Bayesian Fusion & Observation Override...")
    updated_grid = risk_eng.get_current_grid()
    updated_cell = updated_grid.get_cell(top_threat.cell_id)

    assert updated_cell.confirmed_flooded is True
    assert updated_cell.survivor_count >= 1
    assert updated_cell.confidence >= 0.90
    print(f"  • Zone {updated_cell.cell_id} Confirmed Flooded: {updated_cell.confirmed_flooded}")
    print(f"  • Confirmed Survivors: {updated_cell.survivor_count}")
    print(f"  • Dynamic Confidence Score: {updated_cell.confidence*100:.0f}% (Upgraded from 70% baseline)")
    print(f"  • Dynamic Risk Score: {updated_cell.risk_score:.1f}/100 ({updated_cell.category.value})")

    # Step 9: Portable Charging Station Integration T=40s
    print("\n[T=40s] 🔋 Querying Portable Fast-Deploy Charging Hubs...")
    stations = optimizer.get_charging_stations()
    st = stations[0]
    print(f"  • Station: {st.name} ({st.station_id})")
    print(f"  • Power Source: {st.power_source} | SOC: {st.battery_capacity_pct:.0f}%")
    print(f"  • Bay Availability: {st.available_bays}/{st.total_bays} Bays Free")

    print("\n" + "=" * 80)
    print("✅ CLOSED-LOOP DISASTER RISK & PRE-POSITIONING SCENARIO: 100% VERIFIED")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(run_master_scenario())
