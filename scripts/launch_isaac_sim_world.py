#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════════════════╗
║  SUTRA — NVIDIA Isaac Sim 3D World Launcher                                      ║
║  Launches the Master Submerged Village Flood World OpenUSD Stage (.usda)          ║
║  in NVIDIA Omniverse Isaac Sim with RTX Real-Time Ray Tracing.                   ║
╚══════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import sys
import subprocess

PROJECT_ROOT = "/home/nikhil/Desktop/Project SUTRA"
USD_STAGE    = f"{PROJECT_ROOT}/sutra_ws/src/sutra_sim/usd/submerged_village_flood_world.usda"
ISAAC_BIN    = "/home/nikhil/.local/bin/isaacsim"

# Check if USD Stage exists, if not generate it
if not os.path.exists(USD_STAGE):
    print("⚙️ OpenUSD Stage missing. Generating from Blender...")
    subprocess.run([sys.executable, f"{PROJECT_ROOT}/scripts/export_blender_to_isaac_sim_usd.py"], check=True)

print(f"""
╔═══════════════════════════════════════════════════════════════════════╗
║   🚀 LAUNCHING NVIDIA ISAAC SIM 3D DISASTER WORLD (RTX PHYSICS)        ║
╚═══════════════════════════════════════════════════════════════════════╝
  📁 USD Stage Path: {USD_STAGE}
  ⚡ Isaac Sim Bin:  {ISAAC_BIN}
""")

subprocess.run([ISAAC_BIN, f"--/app/file/open={USD_STAGE}"])
