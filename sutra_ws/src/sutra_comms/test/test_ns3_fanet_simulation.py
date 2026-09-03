#!/usr/bin/env python3
"""
Test Suite: NS-3 Discrete-Event FANET Swarm Simulation (Gate G2)
Lead Architect: Nikhil (Tech Architect & Subsystem B Lead)
"""

import os
import subprocess
import xml.etree.ElementTree as ET
import pytest

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.."))
NS3_SCRIPT = os.path.join(WORKSPACE_ROOT, "scripts/run_ns3_fanet_sim.sh")
TRACE_XML = os.path.join(WORKSPACE_ROOT, "sutra_ws/src/sutra_comms/ns3/sutra_swarm_trace.xml")
FLOW_XML = os.path.join(WORKSPACE_ROOT, "sutra_ws/src/sutra_comms/ns3/sutra_flow_stats.xml")


def test_ns3_fanet_simulation_execution():
    """Verify NS-3 discrete-event FANET simulation compiles, executes, and meets Gate G2."""
    assert os.path.exists(NS3_SCRIPT), f"Runner script missing: {NS3_SCRIPT}"

    result = subprocess.run(
        ["bash", NS3_SCRIPT],
        capture_output=True,
        text=True,
        cwd=WORKSPACE_ROOT,
        timeout=30
    )

    assert result.returncode == 0, f"NS-3 simulation failed: {result.stderr}"
    stdout = result.stdout

    # Assert Gate G2 Compliance output
    assert "GATE G2 FULLY SATISFIED" in stdout
    assert "Network Packet Delivery (PDR): 100.00 %" in stdout or "Network Packet Delivery (PDR): 9" in stdout
    assert "Exported NetAnim Trace File" in stdout
    assert "Exported FlowMonitor Stats" in stdout

    # Verify generated XML artifact files exist and are non-empty
    assert os.path.exists(TRACE_XML), f"NetAnim trace XML not generated: {TRACE_XML}"
    assert os.path.getsize(TRACE_XML) > 1000, "NetAnim trace XML is empty or too small"

    assert os.path.exists(FLOW_XML), f"FlowMonitor stats XML not generated: {FLOW_XML}"
    assert os.path.getsize(FLOW_XML) > 1000, "FlowMonitor XML is empty or too small"

    # Validate XML parsing
    tree = ET.parse(FLOW_XML)
    root = tree.getroot()
    assert root.tag == "FlowMonitor"
