#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════════════════╗
║  SUTRA — Blender 3D Disaster World to Gazebo Sim 8 SDF Converter                ║
║  Converts the 200m x 200m Master Submerged Village Flood World into Gazebo       ║
║  Harmonic / Garden SDF world & 3D mesh assets.                                   ║
╚══════════════════════════════════════════════════════════════════════════════════╝

Run via: python3 scripts/export_blender_to_gazebo_world.py
"""

import os
import sys
import time
import subprocess

PROJECT_ROOT = "/home/nikhil/Desktop/Project SUTRA"
BLEND_FILE   = f"{PROJECT_ROOT}/sutra_ws/src/sutra_sim/assets/submerged_village_flood_world.blend"
BLENDER_BIN  = "/home/nikhil/.local/bin/blender"

MODEL_DIR    = f"{PROJECT_ROOT}/sutra_ws/src/sutra_sim/models/submerged_village_flood"
MESH_DIR     = f"{MODEL_DIR}/meshes"
WORLDS_DIR   = f"{PROJECT_ROOT}/sutra_ws/src/sutra_sim/worlds"
SDF_FILE     = f"{WORLDS_DIR}/submerged_village_flood_world.sdf"

os.makedirs(MESH_DIR, exist_ok=True)
os.makedirs(WORLDS_DIR, exist_ok=True)

# ANSI Colors
G="\033[92m"; R="\033[91m"; Y="\033[93m"; C="\033[96m"
M="\033[95m"; BD="\033[1m"; RST="\033[0m"

print(f"""
{BD}{M}╔═══════════════════════════════════════════════════════════════════════╗
║   🌊 SUTRA — Blender 3D World to Gazebo Sim 8 SDF Converter           ║
║   Exporting Submerged Indian Village Assets to Gazebo Harmonic / Garden║
╚═══════════════════════════════════════════════════════════════════════╝{RST}
""")

# ── STEP 1: EXPORT BLENDER SCENE MESHES ──────────────────────────────────────
print(f"{C}▶ [1/3] Exporting 3D Disaster World Meshes from Blender...{RST}")

export_script = f"""
import bpy, os

BLEND_PATH = "{BLEND_FILE}"
MESH_DIR   = "{MESH_DIR}"

bpy.ops.wm.open_mainfile(filepath=BLEND_PATH)

# Unpack all packed textures to the meshes directory
for img in bpy.data.images:
    if img.packed_file:
        img_name = os.path.basename(img.filepath) if img.filepath else f"{{img.name}}.png"
        if not img_name.endswith(('.jpg', '.png', '.tga', '.jpeg')):
            img_name += '.png'
        out_img_path = os.path.join(MESH_DIR, img_name)
        try:
            img.save_render(out_img_path)
        except Exception:
            pass

# Select all visible objects and export DAE and OBJ
bpy.ops.object.select_all(action='SELECT')

dae_out = os.path.join(MESH_DIR, "submerged_village.dae")
bpy.ops.wm.collada_export(
    filepath=dae_out,
    selected=True,
    include_children=True,
    triangulate=True
)
print(f"✅ Exported Master Scene DAE -> {{dae_out}}")

# Create URL-encoded texture file aliases for Gazebo material parser
import urllib.parse, shutil
for f in os.listdir(MESH_DIR):
    if ' ' in f:
        url_encoded = f.replace(' ', '%20')
        src = os.path.join(MESH_DIR, f)
        dst = os.path.join(MESH_DIR, url_encoded)
        if not os.path.exists(dst):
            shutil.copy2(src, dst)
            print(f"✅ Created URL-encoded texture alias: {{url_encoded}}")

obj_out = os.path.join(MESH_DIR, "submerged_village.obj")
bpy.ops.wm.obj_export(
    filepath=obj_out,
    export_selected_objects=True,
    export_materials=True,
    export_triangulated_mesh=True
)

print(f"✅ Exported Master Scene OBJ -> {{obj_out}}")
"""

export_py = "/tmp/export_gazebo_meshes.py"
with open(export_py, "w") as f:
    f.write(export_script)

t0 = time.time()
subprocess.run([BLENDER_BIN, "--background", "--python", export_py], check=True)
print(f"{G}✅ Blender Mesh Export Completed in {time.time()-t0:.2f}s!{RST}")

# ── STEP 2: CREATE GAZEBO MODEL CONFIG & SDF ─────────────────────────────────
print(f"\n{C}▶ [2/3] Creating Gazebo Model Configuration & Spec...{RST}")

model_config = """<?xml version="1.0"?>
<model>
  <name>submerged_village_flood</name>
  <version>1.0</version>
  <sdf version="1.8">model.sdf</sdf>
  <author>
    <name>Project SUTRA Tech Architect</name>
    <email>sutra@drone-swarm.ai</email>
  </author>
  <description>
    Master 200m x 200m Submerged Indian Village Flood Disaster World with submerged buildings, high-vis SAR survivors, and dynamic flood water plane.
  </description>
</model>
"""

with open(f"{MODEL_DIR}/model.config", "w") as f:
    f.write(model_config)

model_sdf = """<?xml version="1.0" ?>
<sdf version="1.8">
  <model name="submerged_village_flood">
    <static>true</static>
    <link name="link">
      <collision name="collision">
        <geometry>
          <mesh>
            <uri>model://submerged_village_flood/meshes/submerged_village.dae</uri>
            <scale>1 1 1</scale>
          </mesh>
        </geometry>
      </collision>
      <visual name="visual">
        <geometry>
          <mesh>
            <uri>model://submerged_village_flood/meshes/submerged_village.dae</uri>
            <scale>1 1 1</scale>
          </mesh>
        </geometry>
        <material>
          <ambient>0.9 0.9 0.9 1.0</ambient>
          <diffuse>0.9 0.9 0.9 1.0</diffuse>
          <specular>0.3 0.3 0.3 1.0</specular>
        </material>
      </visual>
    </link>
  </model>
</sdf>
"""

with open(f"{MODEL_DIR}/model.sdf", "w") as f:
    f.write(model_sdf)

print(f"{G}✅ Gazebo Model Config & Spec Created in {MODEL_DIR}{RST}")

# ── STEP 3: CREATE MASTER GAZEBO SIM 8 SDF WORLD ─────────────────────────────
print(f"\n{C}▶ [3/3] Generating Master Gazebo Sim 8 SDF World File...{RST}")

master_sdf_world = """<?xml version="1.0" ?>
<sdf version="1.8">
  <world name="submerged_village_flood_world">
    
    <!-- ── Physics Engine Settings (500Hz Solver / RTF 1.00) ──────────────── -->
    <physics name="500hz_physics" type="ignored">
      <max_step_size>0.002</max_step_size>
      <real_time_factor>1.0</real_time_factor>
      <real_time_update_rate>500</real_time_update_rate>
    </physics>

    <!-- ── Atmosphere & Lighting Settings ─────────────────────────────────── -->
    <atmosphere type="adiabatic"/>
    <scene>
      <ambient>1.0 1.0 1.0 1.0</ambient>
      <background>0.5 0.7 0.9 1.0</background>
      <shadows>true</shadows>
      <grid>false</grid>
    </scene>

    <!-- ── High-Intensity Primary Sun Light ─────────────────────────────────── -->
    <light type="directional" name="sun">
      <cast_shadows>true</cast_shadows>
      <pose>0 0 200 0 0 0</pose>
      <diffuse>1.0 1.0 1.0 1</diffuse>
      <specular>0.5 0.5 0.5 1</specular>
      <direction>-0.2 0.2 -1.0</direction>
      <attenuation>
        <range>1000</range>
        <constant>0.9</constant>
        <linear>0.01</linear>
        <quadratic>0.001</quadratic>
      </attenuation>
    </light>

    <!-- ── Secondary Ambient Fill Light (Eliminates Dark Shadows) ───────────── -->
    <light type="directional" name="fill_light">
      <cast_shadows>false</cast_shadows>
      <pose>0 0 150 0 0 0</pose>
      <diffuse>0.8 0.85 0.9 1</diffuse>
      <specular>0.1 0.1 0.1 1</specular>
      <direction>0.2 -0.2 -1.0</direction>
    </light>

    <!-- ── Ground & Water Surface Base ─────────────────────────────────────── -->
    <include>
      <uri>https://fuel.gazebosim.org/1.0/OpenRobotics/models/Ground Plane</uri>
    </include>

    <!-- ── Master Submerged Village Flood World Model ─────────────────────── -->
    <include>
      <name>submerged_village_disaster</name>
      <uri>model://submerged_village_flood</uri>
      <pose>0 0 0 0 0 0</pose>
    </include>

    <!-- ── 5-UAV Swarm Spawn Points ─────────────────────────────────────────── -->
    <!-- UAV Alpha (Leader) -->
    <frame name="uav_alpha_spawn">
      <pose>-15 5 12 0 0 0</pose>
    </frame>
    <!-- UAV Beta (Recon West) -->
    <frame name="uav_beta_spawn">
      <pose>2 -1 9 0 0 0</pose>
    </frame>
    <!-- UAV Gamma (Recon East) -->
    <frame name="uav_gamma_spawn">
      <pose>18.5 14 9.5 0 0 0</pose>
    </frame>
    <!-- UAV Delta (Recon North) -->
    <frame name="uav_delta_spawn">
      <pose>0 25 15 0 0 0</pose>
    </frame>
    <!-- UAV Epsilon (Recon South) -->
    <frame name="uav_epsilon_spawn">
      <pose>-20 -20 15 0 0 0</pose>
    </frame>

  </world>
</sdf>
"""

with open(SDF_FILE, "w") as f:
    f.write(master_sdf_world)

print(f"{G}✅ Master Gazebo Sim 8 World File Generated -> {SDF_FILE}{RST}")

print(f"""
{BD}{G}╔═══════════════════════════════════════════════════════════════════════╗
║   ✨ BLENDER TO GAZEBO SIM 8 WORLD CONVERSION COMPLETE                ║
╚═══════════════════════════════════════════════════════════════════════╝{RST}
  📁 Gazebo World File:    {BD}{SDF_FILE}{RST}
  📁 Gazebo Model Dir:     {BD}{MODEL_DIR}{RST}
  🛸 Multi-UAV Spawns:     {BD}5 Active Spawn Frames (Alpha, Beta, Gamma, Delta, Epsilon){RST}
""")
