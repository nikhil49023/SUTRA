#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════════════════╗
║  SUTRA — Submerged Indian Village Flood World (Subsystem C Perception Edition)  ║
║  Optimized for Naked-Eye & YOLOv8 Perception Model Survivor Identification      ║
║  Featuring: Fixed Upright Armature Rotations, High-Vis Emergency Outfits,        ║
║  Illuminated Survivor Spots, Village Clusters, Submerged Cars & Muddy Water     ║
╚══════════════════════════════════════════════════════════════════════════════════╝

Blender 4.2+ Python background script.
Run via:  /home/nikhil/.local/bin/blender --background --python scripts/build_submerged_flood_disaster_world.py
"""

import bpy
import math
import random
import os
import sys

random.seed(42)

# ─────────────────────────────────────────────────────────────────────────────
# PATHS & DIRECTORY SETUP
# ─────────────────────────────────────────────────────────────────────────────
PROJECT_ROOT = "/home/nikhil/Desktop/Project SUTRA"
BASE_ASSETS   = f"{PROJECT_ROOT}/custom_assets/downloaded_blender_assets"
OUT_BLEND     = f"{PROJECT_ROOT}/sutra_ws/src/sutra_sim/assets/submerged_village_flood_world.blend"
OUT_SDF       = f"{PROJECT_ROOT}/sutra_ws/src/sutra_sim/worlds/submerged_village_flood_master.sdf"
RENDER_DIR    = "/tmp"

MODEL_VILLAGE  = os.path.join(BASE_ASSETS, "village_1/source/extracted/LAND_krepost.obj")
MODEL_RUIN     = os.path.join(BASE_ASSETS, "forest_house_ruin/source/extracted/forest-ruin.fbx")
MODEL_MAN_DJ   = os.path.join(BASE_ASSETS, "indian_man_dj/source/Indian Man- Music DJ.fbx")
MODEL_MAN_TS   = os.path.join(BASE_ASSETS, "indian_man_tshirt/source/indian man in tshirt.fbx")
MODEL_WOMAN    = os.path.join(BASE_ASSETS, "indian_women/source/extracted/avatar/model.fbx")
MODEL_CARS     = os.path.join(BASE_ASSETS, "post_apoc_cars/source/extracted/display.FBX")

# ─────────────────────────────────────────────────────────────────────────────
# SCENE PURGE & SETUP
# ─────────────────────────────────────────────────────────────────────────────
print("🌊 [1/9] Purging scene & configuring Cycles GPU engine...")
bpy.ops.wm.read_factory_settings(use_empty=True)

scene = bpy.context.scene
scene.name = "Submerged_Village_Flood_World"
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1.0
scene.unit_settings.length_unit = 'METERS'

# Cycles Engine Setup
scene.render.engine = 'CYCLES'
scene.cycles.samples = 128
scene.cycles.use_denoising = True
scene.cycles.device = 'GPU'
try:
    bpy.context.preferences.addons['cycles'].preferences.compute_device_type = 'CUDA'
    for dev in bpy.context.preferences.addons['cycles'].preferences.devices:
        dev.use = True
    print("⚡ CUDA GPU Acceleration enabled for Cycles!")
except Exception as e:
    print("ℹ️ Fallback to CPU Cycles:", e)

scene.render.resolution_x = 1920
scene.render.resolution_y = 1080

# ─────────────────────────────────────────────────────────────────────────────
# 2. LIGHTING & ENVIRONMENT (SUNLIGHT + HIGHLIGHT SPOTLIGHTS)
# ─────────────────────────────────────────────────────────────────────────────
print("🌩️ [2/9] Constructing High-Visibility Atmospheric Lighting & Sky...")
world = bpy.data.worlds.new("Disaster_Sky_World")
world.use_nodes = True
scene.world = world
w_nodes = world.node_tree.nodes
w_links = world.node_tree.links
w_nodes.clear()

w_out = w_nodes.new('ShaderNodeOutputWorld')
w_bg  = w_nodes.new('ShaderNodeBackground')
w_bg.inputs['Color'].default_value = (0.22, 0.28, 0.35, 1.0)  # Bright daylight storm sky
w_bg.inputs['Strength'].default_value = 2.0
w_links.new(w_bg.outputs['Background'], w_out.inputs['Surface'])

# Sunlight (High Intensity Golden Daylight)
sun_data = bpy.data.lights.new(name="Sun_Disaster", type='SUN')
sun_data.energy = 7.5
sun_data.color = (1.0, 0.95, 0.85)
sun_data.angle = math.radians(1.5)

sun_obj = bpy.data.objects.new(name="Sun_Disaster", object_data=sun_data)
bpy.context.collection.objects.link(sun_obj)
sun_obj.location = (50.0, 50.0, 100.0)
sun_obj.rotation_euler = (math.radians(35.0), math.radians(15.0), math.radians(120.0))

# ─────────────────────────────────────────────────────────────────────────────
# 3. EXPANSIVE 200m x 200m TERRAIN MESH
# ─────────────────────────────────────────────────────────────────────────────
print("🏔️ [3/9] Synthesizing 200m x 200m Flooded District Terrain Mesh...")
bpy.ops.mesh.primitive_grid_add(x_subdivisions=200, y_subdivisions=200, size=200.0, location=(0, 0, 0))
terrain_obj = bpy.context.active_object
terrain_obj.name = "Terrain_Mud_District"

import bmesh
bm = bmesh.new()
bm.from_mesh(terrain_obj.data)
for v in bm.verts:
    hill = 2.5 * math.sin(v.co.x / 25.0) + 1.8 * math.cos(v.co.y / 30.0)
    gorge = -2.2 * math.exp(-((v.co.x + 10.0)**2) / 1200.0)
    v.co.z = hill + gorge + random.uniform(-0.10, 0.10)
bm.to_mesh(terrain_obj.data)
bm.free()

# Terrain Mud Material
mat_mud = bpy.data.materials.new("PBR_Mud_Terrain")
mat_mud.use_nodes = True
nodes_mud = mat_mud.node_tree.nodes
nodes_mud.clear()

out_m = nodes_mud.new('ShaderNodeOutputMaterial')
bsdf_m = nodes_mud.new('ShaderNodeBsdfPrincipled')
bsdf_m.inputs['Base Color'].default_value = (0.22, 0.16, 0.10, 1.0)
bsdf_m.inputs['Roughness'].default_value = 0.40
mat_mud.node_tree.links.new(bsdf_m.outputs['BSDF'], out_m.inputs['Surface'])
terrain_obj.data.materials.append(mat_mud)

# ─────────────────────────────────────────────────────────────────────────────
# 4. ULTRA-NATURAL WATER ENGINE (200m x 200m WATER SURFACE)
# ─────────────────────────────────────────────────────────────────────────────
print("🌊 [4/9] Building Animated Water Surface Engine...")
bpy.ops.mesh.primitive_grid_add(x_subdivisions=150, y_subdivisions=150, size=200.0, location=(0, 0, 1.15))
water_obj = bpy.context.active_object
water_obj.name = "Water_Flood_Surface"

mod_disp = water_obj.modifiers.new(name="Water_Wave_Displace", type='DISPLACE')
tex_wave = bpy.data.textures.new("Water_Noise_Tex", type='CLOUDS')
tex_wave.noise_scale = 1.5
mod_disp.texture = tex_wave
mod_disp.strength = 0.12

mat_water = bpy.data.materials.new("PBR_Flood_Water_Volume")
mat_water.use_nodes = True
nodes_w = mat_water.node_tree.nodes
links_w = mat_water.node_tree.links
nodes_w.clear()

out_w    = nodes_w.new('ShaderNodeOutputMaterial')
glass_w  = nodes_w.new('ShaderNodeBsdfGlass')
vol_w    = nodes_w.new('ShaderNodeVolumeAbsorption')

glass_w.inputs['Color'].default_value = (0.75, 0.88, 0.82, 1.0)
glass_w.inputs['Roughness'].default_value = 0.05
glass_w.inputs['IOR'].default_value = 1.333

vol_w.inputs['Color'].default_value = (0.15, 0.25, 0.20, 1.0)
vol_w.inputs['Density'].default_value = 0.12

links_w.new(glass_w.outputs['BSDF'], out_w.inputs['Surface'])
links_w.new(vol_w.outputs['Volume'], out_w.inputs['Volume'])

water_obj.data.materials.append(mat_water)

# ─────────────────────────────────────────────────────────────────────────────
# 5. IMPORTING 3D STRUCTURES
# ─────────────────────────────────────────────────────────────────────────────
print("🏗️ [5/9] Importing Village Structures & Damaged Ruins...")

def import_mesh(filepath):
    before_objs = set(bpy.data.objects)
    if filepath.endswith('.obj'):
        if hasattr(bpy.ops.wm, 'obj_import'):
            bpy.ops.wm.obj_import(filepath=filepath)
        else:
            bpy.ops.import_scene.obj(filepath=filepath)
    elif filepath.lower().endswith('.fbx'):
        bpy.ops.import_scene.fbx(filepath=filepath)
    after_objs = set(bpy.data.objects)
    return list(after_objs - before_objs)

# Village Buildings
village_objs = import_mesh(MODEL_VILLAGE)
if village_objs:
    main_v = village_objs[0]
    main_v.name = "Village_House_Cluster_1"
    main_v.location = (-15.0, 10.0, -0.2)
    main_v.rotation_euler = (0, 0, math.radians(15.0))
    
    for i, pos in enumerate([
        (25.0, -15.0, -0.1, 45.0),
        (-35.0, -25.0, -0.3, -30.0),
        (10.0, -40.0, -0.2, 90.0),
        (-20.0, 45.0, 0.0, 180.0)
    ]):
        v_dup = main_v.copy()
        v_dup.data = main_v.data.copy()
        v_dup.name = f"Village_House_Cluster_{i+2}"
        v_dup.location = (pos[0], pos[1], pos[2])
        v_dup.rotation_euler = (0, 0, math.radians(pos[3]))
        bpy.context.collection.objects.link(v_dup)

# Forest House Ruin
ruin_objs = import_mesh(MODEL_RUIN)
if ruin_objs:
    main_r = ruin_objs[0]
    main_r.name = "Damaged_Forest_Ruin_1"
    main_r.location = (18.0, 22.0, -0.4)
    main_r.rotation_euler = (0, 0, math.radians(35.0))
    main_r.scale = (0.85, 0.85, 0.85)

# Cars
car_objs = import_mesh(MODEL_CARS)
if car_objs:
    car = car_objs[0]
    car.name = "Submerged_Civilian_Car_1"
    car.location = (-12.0, -8.0, 0.4)
    car.rotation_euler = (math.radians(14.0), math.radians(-10.0), math.radians(75.0))

# ─────────────────────────────────────────────────────────────────────────────
# 6. HIGH-VISIBILITY SURVIVOR MATERIALS & UPRIGHT CHARACTER POSITIONS
# ─────────────────────────────────────────────────────────────────────────────
print("🧍 [6/9] Creating High-Vis Emergency SAR Outfits & Upright Character Armatures...")

def make_hivis_mat(name, color_rgb, emission_strength=0.25):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    out = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (color_rgb[0], color_rgb[1], color_rgb[2], 1.0)
    bsdf.inputs['Roughness'].default_value = 0.25
    if 'Emission Color' in bsdf.inputs:
        bsdf.inputs['Emission Color'].default_value = (color_rgb[0], color_rgb[1], color_rgb[2], 1.0)
        bsdf.inputs['Emission Strength'].default_value = emission_strength
    mat.node_tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat

mat_orange_lifejacket = make_hivis_mat("HighVis_Safety_Orange", (1.0, 0.22, 0.0), emission_strength=0.30)
mat_red_rescue      = make_hivis_mat("HighVis_Rescue_Red", (0.95, 0.05, 0.05), emission_strength=0.30)
mat_yellow_saree     = make_hivis_mat("HighVis_Yellow_Saree", (1.0, 0.85, 0.0), emission_strength=0.35)

def apply_hivis_to_character(objs, mat):
    for o in objs:
        if o.type == 'MESH' and ('outfit' in o.name.lower() or 'top' in o.name.lower() or 'body' in o.name.lower()):
            o.data.materials.clear()
            o.data.materials.append(mat)

def add_spotlight_over_survivor(name, location, target_loc):
    spot_data = bpy.data.lights.new(name=f"Spot_{name}", type='SPOT')
    spot_data.energy = 850.0  # High intensity focus light
    spot_data.spot_size = math.radians(45.0)
    spot_data.color = (1.0, 0.98, 0.90)
    spot_obj = bpy.data.objects.new(name=f"Spot_{name}", object_data=spot_data)
    bpy.context.collection.objects.link(spot_obj)
    spot_obj.location = location
    
    # Point at target
    dx = target_loc[0] - location[0]
    dy = target_loc[1] - location[1]
    dz = target_loc[2] - location[2]
    pitch = math.atan2(-dz, math.sqrt(dx**2 + dy**2))
    yaw = math.atan2(dy, dx)
    spot_obj.rotation_euler = (pitch, 0, yaw)

# A. Survivor 1 (Male T-shirt - High Vis Orange Life Vest)
man_ts_objs = import_mesh(MODEL_MAN_TS)
if man_ts_objs:
    armature1 = [o for o in man_ts_objs if o.type == 'ARMATURE'][0]
    armature1.name = "Survivor_1_Wading_Male"
    armature1.rotation_euler = (0, 0, math.radians(110.0))
    armature1.location = (2.0, 5.0, 0.85) # Standing upright, Z=0.85m -> upper chest & head exposed above Z=1.15m water
    apply_hivis_to_character(man_ts_objs, mat_orange_lifejacket)
    add_spotlight_over_survivor("Survivor1", (2.0, 5.0, 15.0), (2.0, 5.0, 1.2))
    print("✅ Survivor #1 (Male Wading - High-Vis Orange) Upright at (2.0, 5.0, 0.85)")

# B. Survivor 2 (Male DJ - High Vis Rescue Red Jacket on Rooftop)
man_dj_objs = import_mesh(MODEL_MAN_DJ)
if man_dj_objs:
    armature2 = [o for o in man_dj_objs if o.type == 'ARMATURE'][0]
    armature2.name = "Survivor_2_Rooftop_Male"
    armature2.rotation_euler = (0, 0, math.radians(200.0))
    armature2.location = (-15.0, 12.0, 3.85) # Standing upright on central village roof
    apply_hivis_to_character(man_dj_objs, mat_red_rescue)
    add_spotlight_over_survivor("Survivor2", (-15.0, 12.0, 18.0), (-15.0, 12.0, 4.0))
    print("✅ Survivor #2 (Male Rooftop - High-Vis Red) Upright at (-15.0, 12.0, 3.85)")

# C. Survivor 3 (Female Saree - High Vis Yellow Saree in Ruin Window)
woman_objs = import_mesh(MODEL_WOMAN)
if woman_objs:
    armature3 = [o for o in woman_objs if o.type == 'ARMATURE'][0]
    armature3.name = "Survivor_3_Ruin_Female"
    armature3.rotation_euler = (0, 0, math.radians(65.0))
    armature3.location = (18.5, 21.0, 2.45) # Standing upright in ruin balcony window
    apply_hivis_to_character(woman_objs, mat_yellow_saree)
    add_spotlight_over_survivor("Survivor3", (18.5, 21.0, 16.0), (18.5, 21.0, 3.0))
    print("✅ Survivor #3 (Female Ruin - High-Vis Yellow Saree) Upright at (18.5, 21.0, 2.45)")

# ─────────────────────────────────────────────────────────────────────────────
# 7. INFLATABLE RESCUE RAFT & FLOATING DEBRIS
# ─────────────────────────────────────────────────────────────────────────────
print("🚣 [7/9] Adding Bright Inflatable Rescue Raft & Floating Debris...")

# Bright Safety Orange Rescue Boat/Raft
bpy.ops.mesh.primitive_torus_add(major_radius=2.2, minor_radius=0.5, location=(-2.0, 12.0, 1.15))
raft = bpy.context.active_object
raft.name = "Inflatable_Rescue_Raft"
raft.data.materials.append(mat_orange_lifejacket)

# Submerged Trees & Floating Barrels
for i in range(12):
    angle = random.uniform(0, 2 * math.pi)
    dist  = random.uniform(10, 80)
    tx = dist * math.cos(angle)
    ty = dist * math.sin(angle)
    bpy.ops.mesh.primitive_cylinder_add(radius=random.uniform(0.3, 0.6), depth=random.uniform(4.0, 8.0), location=(tx, ty, 0.8))
    tree_trunk = bpy.context.active_object
    tree_trunk.name = f"Submerged_Tree_Trunk_{i+1}"
    tree_trunk.rotation_euler = (math.radians(random.uniform(15, 60)), math.radians(random.uniform(0, 45)), random.uniform(0, 6.28))

# ─────────────────────────────────────────────────────────────────────────────
# 8. PERCEPTION-OPTIMIZED CAMERAS & RENDERING
# ─────────────────────────────────────────────────────────────────────────────
print("📸 [8/9] Configuring Subsystem C Perception Cameras & Rendering Previews...")

# Camera 1: Drone Aerial SAR POV (Targeting Rooftop & Wading Survivors)
cam_sar_data = bpy.data.cameras.new("Cam_Drone_SAR_Data")
cam_sar_data.lens = 35.0
cam_sar_obj = bpy.data.objects.new("Camera_Drone_SAR", cam_sar_data)
bpy.context.collection.objects.link(cam_sar_obj)
cam_sar_obj.location = (-10.0, -12.0, 22.0)
cam_sar_obj.rotation_euler = (math.radians(45.0), math.radians(0.0), math.radians(-15.0))

# Camera 2: Rooftop Survivor Close-up POV (Subsystem C YOLO Bounding Box Test)
cam_roof_data = bpy.data.cameras.new("Cam_Rooftop_Survivor_Data")
cam_roof_data.lens = 85.0
cam_roof_obj = bpy.data.objects.new("Camera_Rooftop_Survivor", cam_roof_data)
bpy.context.collection.objects.link(cam_roof_obj)
cam_roof_obj.location = (-15.0, 0.0, 6.5)
cam_roof_obj.rotation_euler = (math.radians(72.0), math.radians(0.0), math.radians(0.0))

# Camera 3: Wading Survivor Close-up POV
cam_wading_data = bpy.data.cameras.new("Cam_Wading_Survivor_Data")
cam_wading_data.lens = 50.0
cam_wading_obj = bpy.data.objects.new("Camera_Wading_Survivor", cam_wading_data)
bpy.context.collection.objects.link(cam_wading_obj)
cam_wading_obj.location = (2.0, -5.0, 3.2)
cam_wading_obj.rotation_euler = (math.radians(75.0), math.radians(0.0), math.radians(0.0))

# Set active camera to Drone Aerial SAR
scene.camera = cam_sar_obj

# ─────────────────────────────────────────────────────────────────────────────
# 9. SAVE MASTER BLEND & EXECUTE RENDERS
# ─────────────────────────────────────────────────────────────────────────────
print("💾 [9/9] Saving Master Blender File & Rendering Perception Images...")

os.makedirs(os.path.dirname(OUT_BLEND), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)
print(f"💾 Master Blender File Saved: {OUT_BLEND}")

# Render Drone Aerial SAR View
scene.render.filepath = os.path.join(RENDER_DIR, "submerged_flood_world_drone_sar.png")
bpy.ops.render.render(write_still=True)
print(f"🖼️ Drone Aerial SAR Perception Render Saved: {scene.render.filepath}")

# Render Rooftop Survivor Focus View
scene.camera = cam_roof_obj
scene.render.filepath = os.path.join(RENDER_DIR, "submerged_flood_world_rooftop_survivor.png")
bpy.ops.render.render(write_still=True)
print(f"🖼️ Rooftop Survivor Perception Render Saved: {scene.render.filepath}")

print("✨ [SUCCESS] Subsystem C Perception-Ready Submerged Village Flood World Completed Successfully!")
