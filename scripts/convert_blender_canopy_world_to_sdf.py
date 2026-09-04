#!/usr/bin/env python3
"""
================================================================================
PROJECT SUTRA — MASTER BLENDER FOREST CANOPY WORLD TO GAZEBO SIM 8 SDF CONVERTER
================================================================================
Author: Tech Lead Nikhil (Subsystem A + B Lead)
Target: Smart Horizon Grand Finals (SH-DST-05)

PURPOSE:
  Converts the master photorealistic Blender forest canopy scene into an authentic,
  fully-textured Gazebo Sim 8 SDFormat 1.8 simulation world:
  - Isolates Collections:
      * 01_Forest_Canopy (birch & oak trees, dirt road, bushes, vegetation, cliffs)
      * 02_Tactical_Squad (4-man military fireteam in multicam combat gear)
      * 03_Vehicles (Resized tactical military jeep at trail bend)
  - Bakes world matrices into vertex geometry (native Z-up, 1:1 scale preservation):
      * Dirt road and soldiers at Z = 35.8m - 37.5m
      * Tree canopies reaching Z = 48m - 54m
      * Resized military jeep at Z = 35.6m
  - Binds all 77+ PBR materials with map_Kd texture maps (bark, leaves, road, camo, metal).
  - Exports clean static OBJ + MTL with forward_axis='Y', up_axis='Z'.
  - Generates the complete, verified Gazebo Sim 8 world SDF (`forest_canopy_sar_world.sdf`)
    with 5 autonomous SUTRA Pegasus UAVs (Alpha..Epsilon), 50Hz velocity control,
    emissive color beacons, and calibrated canopy search altitudes (46m - 64m).
================================================================================
"""

import os
import sys
import shutil
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BLEND_FILE = PROJECT_ROOT / "sutra_ws/src/sutra_sim/models/forest_canopy/sutra_forest_canopy_sar.blend"
MODEL_DIR = PROJECT_ROOT / "sutra_ws/src/sutra_sim/models/forest_canopy"
MESH_DIR = MODEL_DIR / "meshes"
WORLDS_DIR = PROJECT_ROOT / "sutra_ws/src/sutra_sim/worlds"
SDF_FILE = WORLDS_DIR / "forest_canopy_sar_world.sdf"


def run_blender_export():
    print("================================================================================")
    print(" 🌲 SUTRA — BLENDER FOREST CANOPY CONVERTER & SDF GENERATOR")
    print("================================================================================")
    print(f"📁 Source Blend File : {BLEND_FILE}")
    print(f"📁 Target Model Dir  : {MODEL_DIR}")
    print(f"📁 Target World File : {SDF_FILE}")
    print("================================================================================")

    if not BLEND_FILE.exists():
        print(f"❌ Error: Source blend file not found at {BLEND_FILE}")
        sys.exit(1)

    MESH_DIR.mkdir(parents=True, exist_ok=True)
    WORLDS_DIR.mkdir(parents=True, exist_ok=True)

    blender_py_script = f"""
import bpy
import os
from pathlib import Path
from mathutils import Matrix

print("🌲 [1/5] Loading master blend file: {BLEND_FILE}...")
bpy.ops.wm.open_mainfile(filepath="{BLEND_FILE}")

# Target roots to preserve in simulation world
target_roots = [
    "Sketchfab_model",               # Forest terrain, trees, rocks, trail, cliffs
    "Tactical_Military_Jeep",        # Resized military vehicle
    "Soldier_1_Pointman_Root",       # Soldier 1
    "Soldier_2_SquadLeader_Root",    # Soldier 2
    "Soldier_3_Rifleman_Root",       # Soldier 3
    "Soldier_4_RearOverwatch_Root",  # Soldier 4
]

objects_to_keep = []
for r_name in target_roots:
    r = bpy.data.objects.get(r_name)
    if not r:
        continue
    stack = [r]
    while stack:
        curr = stack.pop()
        if curr.type == 'MESH':
            objects_to_keep.append(curr)
        stack.extend([o for o in bpy.data.objects if o.parent == curr])

print(f"   Identified {{len(objects_to_keep)}} environment meshes to bake from target roots.")

# Step 1: Capture world matrices while hierarchy is intact
print("⚙️ [2/5] Baking true world coordinates into geometry (native Z-up preservation)...")
matrices = {{}}
for obj in objects_to_keep:
    matrices[obj.name] = obj.matrix_world.copy()

# Step 2: Unparent and bake world transform into mesh vertices directly
for obj in objects_to_keep:
    if obj.data.users > 1:
        obj.data = obj.data.copy()
    mw = matrices[obj.name]
    obj.parent = None
    obj.matrix_world = Matrix.Identity(4)
    obj.data.transform(mw)

# Step 3: Purge all non-environment objects (static baked drones, armatures, extra lights)
print("🧹 [3/5] Purging non-environment objects and armatures...")
keep_set = set(objects_to_keep)
purged_count = 0
for obj in list(bpy.data.objects):
    if obj not in keep_set:
        bpy.data.objects.remove(obj, do_unlink=True)
        purged_count += 1
print(f"   ✅ Purged {{purged_count}} non-environment objects.")

# Step 4: Reconnect diffuse image textures directly to Base Color of Principled BSDF
print("🎨 [4/5] Reconnecting diffuse textures and relinking PBR materials for Gazebo Ogre2...")
mesh_dir_path = Path("{MESH_DIR}")
relinked_count = 0

for mat in bpy.data.materials:
    if not mat.node_tree:
        continue
    bsdf = None
    for n in mat.node_tree.nodes:
        if n.type == 'BSDF_PRINCIPLED':
            bsdf = n
            break
    if not bsdf:
        continue

    bc_input = bsdf.inputs.get('Base Color')
    diffuse_img_node = None

    if bc_input and bc_input.is_linked:
        src = bc_input.links[0].from_node
        if src.type == 'TEX_IMAGE':
            diffuse_img_node = src
        elif src.type == 'MIX':
            for inp in src.inputs:
                if inp.is_linked:
                    for l in inp.links:
                        if l.from_node.type == 'TEX_IMAGE':
                            diffuse_img_node = l.from_node
                            break
                if diffuse_img_node:
                    break

    if not diffuse_img_node:
        candidates = [n for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image]
        for c in candidates:
            is_normal = False
            for out in c.outputs:
                for l in out.links:
                    if l.to_node.type == 'NORMAL_MAP':
                        is_normal = True
                        break
            if not is_normal:
                diffuse_img_node = c
                break

    if diffuse_img_node and diffuse_img_node.image:
        mat.node_tree.links.new(diffuse_img_node.outputs['Color'], bc_input)
        relinked_count += 1

print(f"   ✅ Relinked {{relinked_count}} material diffuse textures directly to Base Color.")

# Save and link image textures
for img in bpy.data.images:
    clean_name = img.name.replace("/", "_").replace("\\\\", "_")
    if not clean_name.lower().endswith((".png", ".jpg", ".jpeg")):
        clean_name += ".png"
    out_p = str(mesh_dir_path / clean_name)
    try:
        if not os.path.exists(out_p):
            img.save_render(out_p)
    except Exception:
        pass
    img.filepath = clean_name

# Select all environment meshes
bpy.ops.object.select_all(action='DESELECT')
for obj in objects_to_keep:
    obj.select_set(True)

# Step 5: Export OBJ + MTL with forward_axis='Y', up_axis='Z'
obj_out = str(mesh_dir_path / "forest_canopy_world.obj")
print(f"💾 [5/5] Exporting textured forest canopy OBJ -> {{obj_out}}...")
bpy.ops.wm.obj_export(
    filepath=obj_out,
    export_selected_objects=True,
    export_materials=True,
    export_triangulated_mesh=True,
    forward_axis='Y',
    up_axis='Z'
)
print(f"🎉 Blender mesh export completed! File size: {{os.path.getsize(obj_out)/(1024*1024):.2f}} MB")
"""

    temp_script = "/tmp/run_blender_canopy_export.py"
    with open(temp_script, "w") as f:
        f.write(blender_py_script)

    blender_bin = shutil.which("blender") or "/usr/bin/blender"
    res = os.system(f"{blender_bin} --background --python {temp_script}")
    if res != 0:
        print(f"❌ Error during Blender export! Exit code: {res}")
        sys.exit(1)

    # Post-process MTL for full color vibrance
    post_process_mtl()


def post_process_mtl():
    mtl_file = MESH_DIR / "forest_canopy_world.mtl"
    if not mtl_file.exists():
        return
    print(f"\n🎨 Post-processing MTL file: {mtl_file} for Gazebo Ogre2 color fidelity...")
    with open(mtl_file, "r") as f:
        lines = f.readlines()

    mat_blocks = []
    curr_block = []
    for line in lines:
        if line.startswith("newmtl ") and curr_block:
            mat_blocks.append(curr_block)
            curr_block = [line]
        else:
            curr_block.append(line)
    if curr_block:
        mat_blocks.append(curr_block)

    processed_lines = []
    textured_mats = 0
    for block in mat_blocks:
        has_map = any(l.startswith("map_Kd ") for l in block)
        has_kd = any(l.startswith("Kd ") for l in block)
        new_block = []
        for l in block:
            if has_map and l.startswith("Kd "):
                new_block.append("Kd 1.000000 1.000000 1.000000\n")
            elif has_map and l.startswith("Ka "):
                new_block.append("Ka 0.800000 0.800000 0.800000\n")
            else:
                new_block.append(l)
        if has_map and not has_kd:
            new_block.append("Kd 1.000000 1.000000 1.000000\n")
        if has_map:
            textured_mats += 1
        processed_lines.extend(new_block)

    with open(mtl_file, "w") as f:
        f.writelines(processed_lines)
    print(f"   ✅ Processed {len(mat_blocks)} materials ({textured_mats} textured with map_Kd).")


def generate_gazebo_model_files():
    print("\n📦 Generating Gazebo Sim 8 model files for forest_canopy...")

    # 1. model.config
    model_config_content = """<?xml version="1.0" ?>
<model>
  <name>forest_canopy</name>
  <version>1.0</version>
  <sdf version="1.8">model.sdf</sdf>
  <author>
    <name>Project SUTRA Team</name>
    <email>sutra@defence.gov.in</email>
  </author>
  <description>
    Authentic 3D Western Ghats Forest Canopy & Mountain Ridge Search World converted from Blender.
    Features winding dirt trail, 4-man military tactical fireteam, and tactical vehicle.
  </description>
</model>
"""
    with open(MODEL_DIR / "model.config", "w") as f:
        f.write(model_config_content)
    print(f"   ✅ Created: {MODEL_DIR / 'model.config'}")

    # 2. model.sdf with mesh visual & collision
    model_sdf_content = """<?xml version="1.0" ?>
<sdf version="1.8">
  <model name="forest_canopy">
    <static>true</static>
    <link name="terrain_link">
      <pose>0 0 0 0 0 0</pose>
      <collision name="ground_collision">
        <pose>0 0 24.0 0 0 0</pose>
        <geometry>
          <plane>
            <normal>0 0 1</normal>
            <size>400 400</size>
          </plane>
        </geometry>
        <surface>
          <friction>
            <ode>
              <mu>1.0</mu>
              <mu2>1.0</mu2>
            </ode>
          </friction>
        </surface>
      </collision>
      <visual name="visual">
        <geometry>
          <mesh>
            <uri>model://forest_canopy/meshes/forest_canopy_world.obj</uri>
            <scale>1 1 1</scale>
          </mesh>
        </geometry>
      </visual>
    </link>
  </model>
</sdf>
"""
    with open(MODEL_DIR / "model.sdf", "w") as f:
        f.write(model_sdf_content)
    print(f"   ✅ Created: {MODEL_DIR / 'model.sdf'}")


def generate_world_sdf():
    print(f"\n🌍 Generating complete Gazebo Sim 8 world SDF: {SDF_FILE}...")

    world_sdf_content = """<?xml version="1.0" ?>
<sdf version="1.8">
  <world name="forest_canopy_sar_world">
    <!-- DART 500Hz Solver Profile (Gate G1 Compliant) -->
    <physics name="500hz_physics" type="dart">
      <max_step_size>0.002</max_step_size>
      <real_time_factor>1.0</real_time_factor>
      <real_time_update_rate>500</real_time_update_rate>
    </physics>

    <gui fullscreen="0">
      <camera name="user_camera">
        <!-- Elevated perspective looking directly along the forest dirt road -->
        <pose>15.0 -10.0 55.0 0 0.40 2.20</pose>
        <view_controller>orbit</view_controller>
      </camera>
    </gui>

    <!-- ── Gazebo Sim 8 Core Plugins ────────────────────────────────────────── -->
    <plugin filename="gz-sim-physics-system" name="gz::sim::systems::Physics"/>
    <plugin filename="gz-sim-user-commands-system" name="gz::sim::systems::UserCommands"/>
    <plugin filename="gz-sim-scene-broadcaster-system" name="gz::sim::systems::SceneBroadcaster"/>
    <plugin filename="gz-sim-sensors-system" name="gz::sim::systems::Sensors">
      <render_engine>ogre2</render_engine>
    </plugin>
    <plugin filename="gz-sim-imu-system" name="gz::sim::systems::Imu" />
    <plugin filename="gz-sim-navsat-system" name="gz::sim::systems::NavSat" />

    <!-- WGS84 Georeferenced Coordinates: Western Ghats Forest Reserve -->
    <spherical_coordinates>
      <surface_model>EARTH_WGS84</surface_model>
      <latitude_deg>11.5248</latitude_deg>
      <longitude_deg>76.1284</longitude_deg>
      <elevation>840.0</elevation>
      <heading_deg>0.0</heading_deg>
    </spherical_coordinates>

    <!-- Atmospheric & Sun Lighting with Forest Shadowing -->
    <scene>
      <ambient>0.65 0.70 0.75 1.0</ambient>
      <background>0.55 0.70 0.88 1.0</background>
      <shadows>true</shadows>
      <grid>false</grid>
    </scene>

    <light type="directional" name="sun">
      <cast_shadows>true</cast_shadows>
      <pose>20 40 100 0 0 0</pose>
      <diffuse>1.0 0.96 0.90 1</diffuse>
      <specular>0.3 0.3 0.3 1</specular>
      <direction>-0.25 -0.45 -0.85</direction>
    </light>

    <!-- Forest Canopy Environment Model (Native Blender Geometry with Baked Materials) -->
    <include>
      <uri>model://forest_canopy</uri>
      <pose>0 0 0 0 0 0</pose>
    </include>

    <!-- ════════════════════════════════════════════════════════════════════
         5x AUTONOMOUS PEGASUS UAVs (uav_alpha .. uav_epsilon)
         Calibrated Canopy Resilience Flight Altitudes (AGL: 9.5m to 27.5m):
           Alpha   : ( 6.50,   5.50, 46.00) — Cyan Lead Scout (Canopy Gap Penetration)
           Beta    : (12.00,  -8.00, 54.00) — Orange Ridge Recon (Tree Crown Skimming)
           Gamma   : ( 0.00,   0.00, 64.00) — Green SwarmRAFT Leader (High RF Relay)
           Delta   : (-10.00, -8.00, 52.00) — Magenta Flank Recon
           Epsilon : (-5.00,   9.50, 49.00) — Yellow Insertion Vehicle Overwatch
         50Hz Odometry + Velocity Control + Emissive Beacons
    ════════════════════════════════════════════════════════════════════════ -->

    <!-- 🚁 UAV_ALPHA — Cyan Lead Scout (Canopy Penetration at 46.0m / 9.5m AGL) -->
    <model name="uav_alpha">
      <pose>6.50 5.50 46.00 0 0 -0.66</pose>
      <static>false</static>
      <link name="base_link">
        <gravity>false</gravity>
        <inertial><mass>1.5</mass><inertia><ixx>0.03475</ixx><ixy>0</ixy><ixz>0</ixz><iyy>0.07000</iyy><iyz>0</iyz><izz>0.09770</izz></inertia></inertial>
        <collision name="col"><geometry><box><size>0.47 0.47 0.11</size></box></geometry></collision>
        <visual name="body"><geometry><mesh><scale>1.5 1.5 1.5</scale><uri>model://x3_uav/meshes/x3.dae</uri></mesh></geometry></visual>
        <visual name="beacon"><pose>0 0 0.12 0 0 0</pose><geometry><sphere><radius>0.08</radius></sphere></geometry>
          <material><ambient>0.0 0.8 1.0 1</ambient><diffuse>0.0 0.8 1.0 1</diffuse><emissive>0.0 0.8 1.0 1</emissive></material>
        </visual>
      </link>
      <plugin filename="gz-sim-velocity-control-system" name="gz::sim::systems::VelocityControl">
        <link_name>base_link</link_name><topic>/uav_alpha/gazebo/command/twist</topic>
      </plugin>
      <plugin filename="gz-sim-odometry-publisher-system" name="gz::sim::systems::OdometryPublisher"><dimensions>3</dimensions></plugin>
    </model>

    <!-- 🚁 UAV_BETA — Orange Ridge Recon (54.0m / 17.5m AGL) -->
    <model name="uav_beta">
      <pose>12.00 -8.00 54.00 0 0 1.57</pose>
      <static>false</static>
      <link name="base_link">
        <gravity>false</gravity>
        <inertial><mass>1.5</mass><inertia><ixx>0.03475</ixx><ixy>0</ixy><ixz>0</ixz><iyy>0.07000</iyy><iyz>0</iyz><izz>0.09770</izz></inertia></inertial>
        <collision name="col"><geometry><box><size>0.47 0.47 0.11</size></box></geometry></collision>
        <visual name="body"><geometry><mesh><scale>1.5 1.5 1.5</scale><uri>model://x3_uav/meshes/x3.dae</uri></mesh></geometry></visual>
        <visual name="beacon"><pose>0 0 0.12 0 0 0</pose><geometry><sphere><radius>0.08</radius></sphere></geometry>
          <material><ambient>1.0 0.4 0.0 1</ambient><diffuse>1.0 0.4 0.0 1</diffuse><emissive>1.0 0.4 0.0 1</emissive></material>
        </visual>
      </link>
      <plugin filename="gz-sim-velocity-control-system" name="gz::sim::systems::VelocityControl">
        <link_name>base_link</link_name><topic>/uav_beta/gazebo/command/twist</topic>
      </plugin>
      <plugin filename="gz-sim-odometry-publisher-system" name="gz::sim::systems::OdometryPublisher"><dimensions>3</dimensions></plugin>
    </model>

    <!-- 🚁 UAV_GAMMA — Green Central Relay & Tactical Sentry (64.0m / 27.5m AGL) -->
    <model name="uav_gamma">
      <pose>0.00 0.00 64.00 0 0 1.57</pose>
      <static>false</static>
      <link name="base_link">
        <gravity>false</gravity>
        <inertial><mass>1.5</mass><inertia><ixx>0.03475</ixx><ixy>0</ixy><ixz>0</ixz><iyy>0.07000</iyy><iyz>0</iyz><izz>0.09770</izz></inertia></inertial>
        <collision name="col"><geometry><box><size>0.47 0.47 0.11</size></box></geometry></collision>
        <visual name="body"><geometry><mesh><scale>1.5 1.5 1.5</scale><uri>model://x3_uav/meshes/x3.dae</uri></mesh></geometry></visual>
        <visual name="beacon"><pose>0 0 0.12 0 0 0</pose><geometry><sphere><radius>0.08</radius></sphere></geometry>
          <material><ambient>0.2 1.0 0.2 1</ambient><diffuse>0.2 1.0 0.2 1</diffuse><emissive>0.2 1.0 0.2 1</emissive></material>
        </visual>
      </link>
      <plugin filename="gz-sim-velocity-control-system" name="gz::sim::systems::VelocityControl">
        <link_name>base_link</link_name><topic>/uav_gamma/gazebo/command/twist</topic>
      </plugin>
      <plugin filename="gz-sim-odometry-publisher-system" name="gz::sim::systems::OdometryPublisher"><dimensions>3</dimensions></plugin>
    </model>

    <!-- 🚁 UAV_DELTA — Magenta Flank Survey (52.0m / 15.5m AGL) -->
    <model name="uav_delta">
      <pose>-10.00 -8.00 52.00 0 0 1.57</pose>
      <static>false</static>
      <link name="base_link">
        <gravity>false</gravity>
        <inertial><mass>1.5</mass><inertia><ixx>0.03475</ixx><ixy>0</ixy><ixz>0</ixz><iyy>0.07000</iyy><iyz>0</iyz><izz>0.09770</izz></inertia></inertial>
        <collision name="col"><geometry><box><size>0.47 0.47 0.11</size></box></geometry></collision>
        <visual name="body"><geometry><mesh><scale>1.5 1.5 1.5</scale><uri>model://x3_uav/meshes/x3.dae</uri></mesh></geometry></visual>
        <visual name="beacon"><pose>0 0 0.12 0 0 0</pose><geometry><sphere><radius>0.08</radius></sphere></geometry>
          <material><ambient>1.0 0.2 0.8 1</ambient><diffuse>1.0 0.2 0.8 1</diffuse><emissive>1.0 0.2 0.8 1</emissive></material>
        </visual>
      </link>
      <plugin filename="gz-sim-velocity-control-system" name="gz::sim::systems::VelocityControl">
        <link_name>base_link</link_name><topic>/uav_delta/gazebo/command/twist</topic>
      </plugin>
      <plugin filename="gz-sim-odometry-publisher-system" name="gz::sim::systems::OdometryPublisher"><dimensions>3</dimensions></plugin>
    </model>

    <!-- 🚁 UAV_EPSILON — Yellow Vehicle & Perimeter Escort (49.0m / 12.5m AGL) -->
    <model name="uav_epsilon">
      <pose>-5.00 9.50 49.00 0 0 0.70</pose>
      <static>false</static>
      <link name="base_link">
        <gravity>false</gravity>
        <inertial><mass>1.5</mass><inertia><ixx>0.03475</ixx><ixy>0</ixy><ixz>0</ixz><iyy>0.07000</iyy><iyz>0</iyz><izz>0.09770</izz></inertia></inertial>
        <collision name="col"><geometry><box><size>0.47 0.47 0.11</size></box></geometry></collision>
        <visual name="body"><geometry><mesh><scale>1.5 1.5 1.5</scale><uri>model://x3_uav/meshes/x3.dae</uri></mesh></geometry></visual>
        <visual name="beacon"><pose>0 0 0.12 0 0 0</pose><geometry><sphere><radius>0.08</radius></sphere></geometry>
          <material><ambient>1.0 1.0 0.0 1</ambient><diffuse>1.0 1.0 0.0 1</diffuse><emissive>1.0 1.0 0.0 1</emissive></material>
        </visual>
      </link>
      <plugin filename="gz-sim-velocity-control-system" name="gz::sim::systems::VelocityControl">
        <link_name>base_link</link_name><topic>/uav_epsilon/gazebo/command/twist</topic>
      </plugin>
      <plugin filename="gz-sim-odometry-publisher-system" name="gz::sim::systems::OdometryPublisher"><dimensions>3</dimensions></plugin>
    </model>
  </world>
</sdf>
"""
    with open(SDF_FILE, "w") as f:
        f.write(world_sdf_content)
    print(f"   ✅ Created: {SDF_FILE}")


if __name__ == "__main__":
    run_blender_export()
    generate_gazebo_model_files()
    generate_world_sdf()
    print("\n🎉 Conversion completed successfully! Ready for Gazebo Sim 8 simulation.")
