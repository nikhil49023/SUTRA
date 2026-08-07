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
print("🌊 [1/9] Purging scene & configuring Cycles engine with daylight exposure...")
bpy.ops.wm.read_factory_settings(use_empty=True)

scene = bpy.context.scene
scene.name = "Submerged_Village_Flood_World"
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1.0
scene.unit_settings.length_unit = 'METERS'

# Cycles Engine & Exposure Setup
scene.render.engine = 'CYCLES'
scene.cycles.samples = 64
scene.cycles.use_denoising = True

# Color Management (Bright Daylight Exposure)
scene.view_settings.view_transform = 'Standard'
scene.view_settings.exposure = 1.8
scene.view_settings.gamma = 1.0

scene.render.resolution_x = 1920
scene.render.resolution_y = 1080

# ─────────────────────────────────────────────────────────────────────────────
# 2. LIGHTING & ENVIRONMENT (HIGH POWER SUNLIGHT + AMBIENT SKY)
# ─────────────────────────────────────────────────────────────────────────────
print("🌩️ [2/9] Constructing High-Daylight Atmospheric Lighting & Sky...")
world = bpy.data.worlds.new("Disaster_Sky_World")
world.use_nodes = True
scene.world = world
w_nodes = world.node_tree.nodes
w_links = world.node_tree.links
w_nodes.clear()

w_out = w_nodes.new('ShaderNodeOutputWorld')
w_bg  = w_nodes.new('ShaderNodeBackground')
w_bg.inputs['Color'].default_value = (0.55, 0.72, 0.90, 1.0)  # Bright sky blue daylight
w_bg.inputs['Strength'].default_value = 6.0
w_links.new(w_bg.outputs['Background'], w_out.inputs['Surface'])

# Sunlight (High Intensity Golden Daylight)
sun_data = bpy.data.lights.new(name="Sun_Disaster", type='SUN')
sun_data.energy = 22.0
sun_data.color = (1.0, 0.98, 0.92)
sun_data.angle = math.radians(2.0)

sun_obj = bpy.data.objects.new(name="Sun_Disaster", object_data=sun_data)
bpy.context.collection.objects.link(sun_obj)
sun_obj.location = (0.0, 0.0, 120.0)
sun_obj.rotation_euler = (math.radians(25.0), math.radians(10.0), math.radians(45.0))

# Ambient Fill Light
fill_data = bpy.data.lights.new(name="Fill_Daylight", type='SUN')
fill_data.energy = 10.0
fill_data.color = (0.85, 0.92, 1.0)
fill_obj = bpy.data.objects.new(name="Fill_Daylight", object_data=fill_data)
bpy.context.collection.objects.link(fill_obj)
fill_obj.location = (0.0, 0.0, 100.0)
fill_obj.rotation_euler = (math.radians(65.0), math.radians(0.0), math.radians(-135.0))

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
bsdf_m.inputs['Base Color'].default_value = (0.35, 0.28, 0.20, 1.0) # Bright brown earth
bsdf_m.inputs['Roughness'].default_value = 0.50
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
mod_disp.strength = 0.10

mat_water = bpy.data.materials.new("PBR_Flood_Water_Volume")
mat_water.use_nodes = True
nodes_w = mat_water.node_tree.nodes
links_w = mat_water.node_tree.links
nodes_w.clear()

out_w    = nodes_w.new('ShaderNodeOutputMaterial')
bsdf_w   = nodes_w.new('ShaderNodeBsdfPrincipled')
bsdf_w.inputs['Base Color'].default_value = (0.20, 0.45, 0.40, 0.75) # Translucent river water
bsdf_w.inputs['Roughness'].default_value = 0.08
bsdf_w.inputs['Transmission Weight'].default_value = 0.85 if 'Transmission Weight' in bsdf_w.inputs else 0.85
links_w.new(bsdf_w.outputs['BSDF'], out_w.inputs['Surface'])

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

def make_hivis_mat(name, color_rgb, emission_strength=0.45):
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

mat_orange_lifejacket = make_hivis_mat("HighVis_Safety_Orange", (1.0, 0.25, 0.0), emission_strength=0.50)
mat_red_rescue      = make_hivis_mat("HighVis_Rescue_Red", (0.98, 0.05, 0.05), emission_strength=0.50)
mat_yellow_saree     = make_hivis_mat("HighVis_Yellow_Saree", (1.0, 0.85, 0.0), emission_strength=0.55)

def apply_hivis_to_character(objs, mat):
    for o in objs:
        if o.type == 'MESH':
            o.data.materials.clear()
            o.data.materials.append(mat)

def add_spotlight_over_survivor(name, location, target_loc):
    spot_data = bpy.data.lights.new(name=f"Spot_{name}", type='SPOT')
    spot_data.energy = 2500.0  # Studio high power spot
    spot_data.spot_size = math.radians(50.0)
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
    armature1.location = (2.0, 5.0, 0.85) # Standing upright
    apply_hivis_to_character(man_ts_objs, mat_orange_lifejacket)
    add_spotlight_over_survivor("Survivor1", (2.0, 5.0, 15.0), (2.0, 5.0, 1.2))
    print("✅ Survivor #1 (Male Wading - High-Vis Orange) Upright at (2.0, 5.0, 0.85)")

# B. Survivor 2 (Male DJ - High Vis Rescue Red Jacket on Rooftop)
man_dj_objs = import_mesh(MODEL_MAN_DJ)
if man_dj_objs:
    armature2 = [o for o in man_dj_objs if o.type == 'ARMATURE'][0]
    armature2.name = "Survivor_2_Rooftop_Male"
    armature2.rotation_euler = (0, 0, math.radians(200.0))
    armature2.location = (-15.0, 12.0, 3.85) # Standing upright on roof
    apply_hivis_to_character(man_dj_objs, mat_red_rescue)
    add_spotlight_over_survivor("Survivor2", (-15.0, 12.0, 18.0), (-15.0, 12.0, 4.0))
    print("✅ Survivor #2 (Male Rooftop - High-Vis Red) Upright at (-15.0, 12.0, 3.85)")

# C. Survivor 3 (Female Saree - High Vis Yellow Saree in Ruin Window)
woman_objs = import_mesh(MODEL_WOMAN)
if woman_objs:
    armature3 = [o for o in woman_objs if o.type == 'ARMATURE'][0]
    armature3.name = "Survivor_3_Ruin_Female"
    armature3.rotation_euler = (0, 0, math.radians(65.0))
    armature3.location = (18.5, 21.0, 2.45) # Standing upright in balcony
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
# 8. SAVE MASTER BLEND FILE
# ─────────────────────────────────────────────────────────────────────────────
print("💾 [8/9] Saving Master Blender File...")

os.makedirs(os.path.dirname(OUT_BLEND), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)
print(f"💾 Master Blender File Saved: {OUT_BLEND}")

print("✨ [SUCCESS] Subsystem C Perception-Ready Submerged Village Flood World Built Successfully!")
