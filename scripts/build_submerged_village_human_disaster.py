#!/usr/bin/env python3
"""
================================================================================
PROJECT SUTRA — PURE SUBMERGED VILLAGE & DROWNING SURVIVORS DISASTER WORLD
================================================================================
Author: SUTRA Autonomous Multi-Drone Swarm Architecture
Focus: PURE VILLAGE & PEOPLE ONLY — Submerged Houses, Drowning Victims,
       Rooftop Survivors, Flooded Alleys, and Raging Floodwaters.
NO Choppers, NO Drones, NO Military Vehicles.
================================================================================
"""

import os
import sys
import math
import random
import bpy
import bmesh

random.seed(1337)

# Paths
DOWNLOADS = "/home/nikhil/Downloads"
PROJECT_ROOT = "/home/nikhil/Desktop/Project SUTRA"
DESKTOP_WORLD = "/home/nikhil/Desktop/3D world"

VILLAGE_GLB = os.path.join(DOWNLOADS, "village_corse.glb")
MAN_GLB     = os.path.join(DOWNLOADS, "man.glb")
FBX_MAN     = "/tmp/indian_man/source/indian man in tshirt.fbx"
FBX_WOMAN   = "/tmp/indian_woman/source/avatar/model.fbx"

OUT_BLEND_SUTRA = os.path.join(PROJECT_ROOT, "sutra_ws/src/sutra_sim/assets/submerged_village_flood_world.blend")
OUT_BLEND_DESK  = os.path.join(DESKTOP_WORLD, "submerged_village_flood_world.blend")
OUT_RENDER_PNG  = os.path.join(DESKTOP_WORLD, "submerged_village_flood_render.png")

FLOOD_Z = 8.5   # Water level in meters: submerges lower village streets & ground floors!

print("=" * 80)
print("🌊 BUILDING PURE SUBMERGED VILLAGE & DROWNING SURVIVORS WORLD (BLENDER)")
print("=" * 80)

# ------------------------------------------------------------------------------
# 1. SCENE CLEANUP & SETUP
# ------------------------------------------------------------------------------
print("🧹 [1/8] Clearing scene & setting up cinematic environment...")
if bpy.context.object and bpy.context.object.mode != 'OBJECT':
    bpy.ops.object.mode_set(mode='OBJECT')

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=True)

for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
for m in list(bpy.data.materials): bpy.data.materials.remove(m)
for t in list(bpy.data.textures): bpy.data.textures.remove(t)
for c in list(bpy.data.cameras): bpy.data.cameras.remove(c)
for l in list(bpy.data.lights): bpy.data.lights.remove(l)

scene = bpy.context.scene
scene.name = "Submerged_Village_Disaster"
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1.0
scene.unit_settings.length_unit = 'METERS'

scene.frame_start = 1
scene.frame_end = 250
scene.render.fps = 30
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080

scene.render.engine = 'BLENDER_EEVEE'
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'High Contrast'
scene.view_settings.exposure = 0.95
scene.view_settings.gamma = 1.0

# Collections
col_village   = bpy.data.collections.new("01_Submerged_Village")
col_water     = bpy.data.collections.new("02_Flood_Water_Surge")
col_drowning  = bpy.data.collections.new("03_Drowning_Victims_In_Water")
col_clinging  = bpy.data.collections.new("04_Survivors_Clinging_To_Walls")
col_rooftop   = bpy.data.collections.new("05_Rooftop_Survivors")
col_wading    = bpy.data.collections.new("06_People_Wading_Through_Alleys")
col_lighting  = bpy.data.collections.new("07_Atmospheric_Lighting_And_Cams")
col_templates = bpy.data.collections.new("00_Templates_Hidden")

for c in [col_village, col_water, col_drowning, col_clinging, col_rooftop, col_wading, col_lighting, col_templates]:
    bpy.context.scene.collection.children.link(c)

col_templates.hide_render = True
col_templates.hide_viewport = True

# ------------------------------------------------------------------------------
# 2. DRAMATIC TEMPESTUOUS STORM ATMOSPHERE & LIGHTING
# ------------------------------------------------------------------------------
print("⛈️ [2/8] Creating dramatic storm clouds, monsoon sky dome & wet lighting...")
world = bpy.data.worlds.new("Monsoon_Storm_World")
world.use_nodes = True
scene.world = world
wnodes = world.node_tree.nodes
wlinks = world.node_tree.links
wnodes.clear()

w_out = wnodes.new('ShaderNodeOutputWorld')
w_bg  = wnodes.new('ShaderNodeBackground')
w_bg.inputs['Color'].default_value = (0.32, 0.38, 0.45, 1.0) # Dark monsoon overcast
w_bg.inputs['Strength'].default_value = 1.4
wlinks.new(w_bg.outputs['Background'], w_out.inputs['Surface'])

# Low Angled Sunlight piercing storm clouds from West
sun_data = bpy.data.lights.new(name="Sun_Storm_Break", type='SUN')
sun_data.energy = 5.8
sun_data.color = (0.96, 0.92, 0.82)
sun_data.angle = math.radians(4.0)
sun_obj = bpy.data.objects.new(name="Sun_Storm_Break", object_data=sun_data)
col_lighting.objects.link(sun_obj)
sun_obj.location = (-120.0, 80.0, 180.0)
sun_obj.rotation_euler = (math.radians(50.0), math.radians(12.0), math.radians(-70.0))

# Sky Ambient Fill
fill_data = bpy.data.lights.new(name="Sky_Ambient_Fill", type='AREA')
fill_data.energy = 1800.0
fill_data.size = 400.0
fill_data.color = (0.55, 0.65, 0.75)
fill_obj = bpy.data.objects.new(name="Sky_Ambient_Fill", object_data=fill_data)
col_lighting.objects.link(fill_obj)
fill_obj.location = (0.0, 0.0, 220.0)

# ------------------------------------------------------------------------------
# 3. IMPORT & CENTER THE EXACT MASTER VILLAGE ASSET (village_corse.glb)
# ------------------------------------------------------------------------------
print("🏘️ [3/8] Importing and perfectly centering the Master Village asset (village_corse.glb)...")
if not os.path.exists(VILLAGE_GLB):
    raise FileNotFoundError(f"Missing master village asset: {VILLAGE_GLB}")

bpy.ops.object.select_all(action='DESELECT')
bpy.ops.import_scene.gltf(filepath=VILLAGE_GLB)
imported_village = list(bpy.context.selected_objects)

# Center the village at (0, 0)
# From previous analysis: X center = 72.9, Y center = -5.9
OFFSET_X = -72.9
OFFSET_Y = 5.9

village_root = bpy.data.objects.new("Master_Village_Root", None)
col_village.objects.link(village_root)
village_root.location = (OFFSET_X, OFFSET_Y, 0.0)

for obj in imported_village:
    # Link to village collection
    for c in obj.users_collection:
        c.objects.unlink(obj)
    col_village.objects.link(obj)
    if obj.parent is None:
        obj.parent = village_root
        obj.matrix_parent_inverse.identity()

print(f"✅ Master Village Asset integrated ({len(imported_village)} objects) centered at (0, 0)!")

# ------------------------------------------------------------------------------
# 4. CONSTRUCT SUBMERGED FLOOD WATER PLANE (RAGING CURRENT & SILT SHADER)
# ------------------------------------------------------------------------------
print(f"🌊 [4/8] Generating turbulent floodwater plane at Z = {FLOOD_Z}m (Submerging Houses)...")
WATER_SIZE = 550.0
water_mesh = bpy.data.meshes.new("Flood_Water_Mesh")
bm_w = bmesh.new()
hw = WATER_SIZE / 2.0

v0 = bm_w.verts.new((-hw, -hw, FLOOD_Z))
v1 = bm_w.verts.new(( hw, -hw, FLOOD_Z))
v2 = bm_w.verts.new(( hw,  hw, FLOOD_Z))
v3 = bm_w.verts.new((-hw,  hw, FLOOD_Z))
bm_w.faces.new((v0, v1, v2, v3))
bmesh.ops.subdivide_edges(bm_w, edges=bm_w.edges, cuts=64)
bm_w.to_mesh(water_mesh)
bm_w.free()
water_mesh.update()

water_obj = bpy.data.objects.new("Submerged_Flood_Water", water_mesh)
col_water.objects.link(water_obj)

# Wave Displacement
mod_disp = water_obj.modifiers.new(name="Flood_Current_Displace", type='DISPLACE')
tex_w = bpy.data.textures.new("Flood_Ripples_Noise", type='CLOUDS')
tex_w.noise_scale = 2.2
mod_disp.texture = tex_w
mod_disp.strength = 0.26

# Realistic Murky Floodwater Shader with Foam Edge Highlights
mat_water = bpy.data.materials.new("PBR_Murky_Floodwater")
mat_water.use_nodes = True
mnodes = mat_water.node_tree.nodes
mlinks = mat_water.node_tree.links
mnodes.clear()

m_out  = mnodes.new('ShaderNodeOutputMaterial')
m_bsdf = mnodes.new('ShaderNodeBsdfPrincipled')
m_wave = mnodes.new('ShaderNodeTexWave')
m_bump = mnodes.new('ShaderNodeBump')
m_mix  = mnodes.new('ShaderNodeMix')

m_wave.wave_type = 'BANDS'
m_wave.inputs['Scale'].default_value = 6.0
m_wave.inputs['Distortion'].default_value = 9.0
m_wave.inputs['Detail'].default_value = 4.5

m_bump.inputs['Strength'].default_value = 0.40
mlinks.new(m_wave.outputs['Color'], m_bump.inputs['Height'])
mlinks.new(m_bump.outputs['Normal'], m_bsdf.inputs['Normal'])

m_mix.data_type = 'RGBA'
m_mix.inputs[6].default_value = (0.22, 0.28, 0.24, 1.0) # Murky silt brown-green water
m_mix.inputs[7].default_value = (0.80, 0.84, 0.82, 1.0) # Churning foam whitecaps
mlinks.new(m_wave.outputs['Fac'], m_mix.inputs['Factor'])
mlinks.new(m_mix.outputs[2], m_bsdf.inputs['Base Color'])

m_bsdf.inputs['Roughness'].default_value = 0.06
m_bsdf.inputs['IOR'].default_value = 1.333
if 'Transmission Weight' in m_bsdf.inputs:
    m_bsdf.inputs['Transmission Weight'].default_value = 0.65

mlinks.new(m_bsdf.outputs['BSDF'], m_out.inputs['Surface'])
water_obj.data.materials.append(mat_water)

# Animate water current flow
for f in range(1, 251):
    scene.frame_set(f)
    water_obj.location.y = (f / 250.0) * 14.0
    water_obj.keyframe_insert(data_path="location", frame=f)

# ------------------------------------------------------------------------------
# 5. PREPARE HUMAN CHARACTER TEMPLATES (MEN & WOMEN)
# ------------------------------------------------------------------------------
print("🧍 [5/8] Ingesting Human Character Templates (Men, Women & Diverse Survivors)...")

def create_template_from_glb(filepath, target_height_m, label):
    if not os.path.exists(filepath):
        return None
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.import_scene.gltf(filepath=filepath)
    objs = list(bpy.context.selected_objects)
    if not objs:
        return None
    
    meshes = [o for o in objs if o.type == 'MESH']
    dims = [max(m.dimensions) for m in meshes if max(m.dimensions) > 0]
    max_d = max(dims) if dims else 1.0
    sf = target_height_m / max_d if max_d > 0 else 1.0
    
    root = bpy.data.objects.new(f"Template_{label}", None)
    col_templates.objects.link(root)
    for o in objs:
        for c in o.users_collection: c.objects.unlink(o)
        col_templates.objects.link(o)
        if o.parent is None:
            o.parent = root
            o.matrix_parent_inverse.identity()
    root.scale = (sf, sf, sf)
    return root

def create_template_from_fbx(filepath, target_height_m, label):
    if not os.path.exists(filepath):
        return None
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.import_scene.fbx(filepath=filepath)
    objs = list(bpy.context.selected_objects)
    if not objs:
        return None
    
    meshes = [o for o in objs if o.type == 'MESH']
    dims = [max(m.dimensions) for m in meshes if max(m.dimensions) > 0]
    max_d = max(dims) if dims else 1.0
    sf = target_height_m / max_d if max_d > 0 else 1.0
    
    root = bpy.data.objects.new(f"Template_{label}", None)
    col_templates.objects.link(root)
    for o in objs:
        for c in o.users_collection: c.objects.unlink(o)
        col_templates.objects.link(o)
        if o.parent is None:
            o.parent = root
            o.matrix_parent_inverse.identity()
    root.scale = (sf, sf, sf)
    return root

tmpl_man1 = create_template_from_glb(MAN_GLB, 1.80, "Man_Casual")
tmpl_man2 = create_template_from_fbx(FBX_MAN, 1.78, "Indian_Man_Tshirt")
tmpl_wom  = create_template_from_fbx(FBX_WOMAN, 1.68, "Indian_Woman")

all_templates = [t for t in [tmpl_man1, tmpl_man2, tmpl_wom] if t is not None]
if not all_templates:
    raise RuntimeError("No human character models found!")

def spawn_person(location, rotation_euler, scale=1.0, label="Survivor", target_col=col_rooftop, template=None):
    if template is None:
        template = random.choice(all_templates)
    
    inst = bpy.data.objects.new(f"{label}_Root", None)
    target_col.objects.link(inst)
    inst.location = location
    inst.rotation_euler = rotation_euler
    
    bs = template.scale
    inst.scale = (bs[0] * scale, bs[1] * scale, bs[2] * scale)
    
    for child in template.children_recursive:
        if child.type == 'MESH':
            new_mesh = child.copy()
            target_col.objects.link(new_mesh)
            new_mesh.parent = inst
            new_mesh.matrix_parent_inverse = child.matrix_parent_inverse.copy()
    return inst

# ------------------------------------------------------------------------------
# 6. SPAWN DROWNING VICTIMS IN RAGING FLOODWATER
# ------------------------------------------------------------------------------
print("🌊 [6/8] Placing DROWNING VICTIMS struggling in the flood current...")

# People submerged in water with water line at chin/neck/chest (Z = FLOOD_Z - 1.25m to FLOOD_Z - 1.45m)
# Tilted back, flailing arms up, struggling against the flood current
drowning_coords = [
    # (x, y, z_offset_from_water, rot_x, rot_y, rot_z, name)
    (-25.0, -15.0, -1.35, math.radians(25), math.radians(15), math.radians(45), "Drowning_Victim_Alley_1"),
    (-18.0, -32.0, -1.40, math.radians(35), math.radians(-20), math.radians(110), "Drowning_Victim_Square_2"),
    (5.0,   -45.0, -1.42, math.radians(15), math.radians(25), math.radians(-65), "Drowning_Victim_LowerStreet_3"),
    (28.0,  -22.0, -1.38, math.radians(40), math.radians(-10), math.radians(175), "Drowning_Victim_EastAlley_4"),
    (-42.0, -5.0,  -1.35, math.radians(30), math.radians(30), math.radians(-30), "Drowning_Victim_WestBreach_5"),
    (12.0,  -10.0, -1.40, math.radians(20), math.radians(-15), math.radians(85), "Drowning_Victim_Courtyard_6"),
    (-35.0, -55.0, -1.45, math.radians(45), math.radians(10), math.radians(130), "Drowning_Victim_RushingCurrent_7"),
    (42.0,  -60.0, -1.40, math.radians(25), math.radians(-25), math.radians(-120), "Drowning_Victim_SouthEdge_8"),
    (-8.0,  -70.0, -1.42, math.radians(35), math.radians(15), math.radians(15), "Drowning_Victim_Torrent_9"),
    (18.0,  -38.0, -1.38, math.radians(30), math.radians(-30), math.radians(200), "Drowning_Victim_SubmergedGate_10"),
]

for dx, dy, dz_off, rx, ry, rz, dname in drowning_coords:
    loc = (dx, dy, FLOOD_Z + dz_off)
    rot = (rx, ry, rz)
    p = spawn_person(loc, rot, scale=random.uniform(0.95, 1.05), label=dname, target_col=col_drowning)
    
    # Animate drowning struggle / bobbing in flood water
    freq = random.uniform(0.18, 0.28)
    phase = random.uniform(0, math.pi * 2)
    for f in range(1, 251):
        scene.frame_set(f)
        p.location.z = loc[2] + 0.08 * math.sin(f * freq + phase)
        p.rotation_euler.x = rx + math.radians(5.0 * math.sin(f * freq * 1.3))
        p.keyframe_insert(data_path="location", frame=f)
        p.keyframe_insert(data_path="rotation_euler", frame=f)

# Floating victims swept away horizontally by current (rotated ~85 degrees)
floating_coords = [
    (-12.0, -20.0, FLOOD_Z - 0.25, math.radians(85), math.radians(10), math.radians(15), "Floating_Victim_Swept_1"),
    (32.0,  -48.0, FLOOD_Z - 0.28, math.radians(80), math.radians(-15), math.radians(-80), "Floating_Victim_Swept_2"),
    (-50.0, -35.0, FLOOD_Z - 0.22, math.radians(88), math.radians(5), math.radians(160), "Floating_Victim_Swept_3"),
]

for fx, fy, fz, rx, ry, rz, fname in floating_coords:
    loc = (fx, fy, fz)
    rot = (rx, ry, rz)
    p = spawn_person(loc, rot, scale=random.uniform(0.95, 1.02), label=fname, target_col=col_drowning)
    
    # Animate drift with current
    for f in range(1, 251):
        scene.frame_set(f)
        p.location.y = fy + (f / 250.0) * 8.0
        p.location.z = fz + 0.04 * math.sin(f * 0.15)
        p.keyframe_insert(data_path="location", frame=f)

# ------------------------------------------------------------------------------
# 7. SPAWN SURVIVORS CLINGING TO SUBMERGED WALLS & ROOFS
# ------------------------------------------------------------------------------
print("🧗 [7/8] Placing SURVIVORS CLINGING to submerged walls, eaves & ROOFTOP SURVIVORS...")

# A. Clinging to house walls and submerged window sills (body half submerged)
clinging_coords = [
    # (x, y, z, rot_x, rot_y, rot_z, name)
    (-21.0, -11.5, FLOOD_Z - 0.65, math.radians(15), 0, math.radians(90), "Clinging_WindowSill_1"),
    (-28.0, -25.0, FLOOD_Z - 0.70, math.radians(10), 0, math.radians(0),  "Clinging_StoneWall_2"),
    (14.0,  -26.0, FLOOD_Z - 0.60, math.radians(20), 0, math.radians(-90), "Clinging_DoorArch_3"),
    (35.0,  -18.0, FLOOD_Z - 0.65, math.radians(15), 0, math.radians(180), "Clinging_BalconySupport_4"),
    (-46.0, -12.0, FLOOD_Z - 0.72, math.radians(25), 0, math.radians(45),  "Clinging_SubmergedFence_5"),
]

for cx, cy, cz, rx, ry, rz, cname in clinging_coords:
    spawn_person((cx, cy, cz), (rx, ry, rz), scale=1.0, label=cname, target_col=col_clinging)

# B. Rooftop Stranded Survivors (High on the roofs of submerged houses)
# At Z = 10m to 20m above the flood line!
rooftop_coords = [
    # (x, y, z, rot_z, name)
    (-15.0, -8.0,  11.2, math.radians(45),  "Rooftop_Survivor_Waving_1"),
    (-17.0, -6.5,  11.4, math.radians(-30), "Rooftop_Survivor_Calling_2"),
    (8.0,   -18.0, 12.8, math.radians(120), "Rooftop_Survivor_Ridge_3"),
    (22.0,  -14.0, 13.5, math.radians(200), "Rooftop_Survivor_Terrace_4"),
    (24.5,  -12.5, 13.6, math.radians(180), "Rooftop_Survivor_Terrace_5"),
    (-32.0, -18.0, 10.8, math.radians(85),  "Rooftop_Survivor_Chimney_6"),
    (-5.0,  5.0,   15.2, math.radians(-45), "UpperVillage_Terrace_Survivor_7"),
    (-3.5,  6.8,   15.3, math.radians(-60), "UpperVillage_Terrace_Survivor_8"),
    (38.0,  -5.0,  14.6, math.radians(150), "EastRooftop_Survivor_9"),
    (-48.0, 8.0,   13.9, math.radians(70),  "WestHouse_Rooftop_Survivor_10"),
]

for rx, ry, rz, rrot, rname in rooftop_coords:
    spawn_person((rx, ry, rz), (0, 0, rrot), scale=random.uniform(0.97, 1.03), label=rname, target_col=col_rooftop)

# C. People Wading through shallow flooded alleys (Waist-deep at Z = FLOOD_Z - 0.85m)
wading_coords = [
    (-8.0,  -2.0, FLOOD_Z - 0.85, math.radians(-20), "Wading_Alley_1"),
    (-6.5,  1.5,  FLOOD_Z - 0.80, math.radians(-15), "Wading_Alley_2"),
    (16.0,  2.0,  FLOOD_Z - 0.75, math.radians(60),  "Wading_Stairway_3"),
    (-26.0, 8.0,  FLOOD_Z - 0.70, math.radians(140), "Wading_Courtyard_4"),
    (2.0,   8.5,  FLOOD_Z - 0.65, math.radians(0),   "Wading_EscapePath_5"),
]

for wx, wy, wz, wrot, wname in wading_coords:
    spawn_person((wx, wy, wz), (0, 0, wrot), scale=1.0, label=wname, target_col=col_wading)

# ------------------------------------------------------------------------------
# 8. CAMERAS (DRAMATIC CINEMATIC ANGLES OF SUBMERGED VILLAGE & DROWNING PEOPLE)
# ------------------------------------------------------------------------------
print("🎥 [8/8] Establishing Dramatic Close-up & Cinematic Camera Angles...")

def add_camera(name, loc, rot, lens=35.0):
    cam_data = bpy.data.cameras.new(name)
    cam_data.lens = lens
    cam_data.clip_start = 0.1
    cam_data.clip_end = 800.0
    cam_obj = bpy.data.objects.new(name, cam_data)
    col_lighting.objects.link(cam_obj)
    cam_obj.location = loc
    cam_obj.rotation_euler = rot
    return cam_obj

# Camera 1 (Default Active): Eye-level with drowning victims looking past rushing water at submerged village houses
cam_drowning = add_camera(
    "Cam_01_Drowning_WaterLevel_POV",
    (-22.0, -38.0, FLOOD_Z + 0.75),   # Just 75cm above the water surface!
    (math.radians(82.0), math.radians(0.0), math.radians(28.0)),
    lens=24.0
)
scene.camera = cam_drowning

# Camera 2: Looking straight down a flooded alley with half-submerged houses & people wading/drowning
cam_alley = add_camera(
    "Cam_02_Flooded_Village_Alley",
    (-14.0, -48.0, FLOOD_Z + 2.8),
    (math.radians(78.0), math.radians(0.0), math.radians(12.0)),
    lens=32.0
)

# Camera 3: Looking from a high rooftop down at submerged houses & trapped survivors
cam_rooftop = add_camera(
    "Cam_03_Rooftop_Survivor_Lookdown",
    (-12.0, -2.0, 18.5),
    (math.radians(62.0), math.radians(0.0), math.radians(-145.0)),
    lens=28.0
)

# Camera 4: Wide Cinematic Master View of the Submerged Village
cam_master = add_camera(
    "Cam_04_Master_Submerged_Village_Wide",
    (45.0, -85.0, 24.0),
    (math.radians(70.0), math.radians(0.0), math.radians(35.0)),
    lens=24.0
)

# ------------------------------------------------------------------------------
# SAVE & RENDER
# ------------------------------------------------------------------------------
print(f"💾 Saving to SUTRA Assets: {OUT_BLEND_SUTRA}")
os.makedirs(os.path.dirname(OUT_BLEND_SUTRA), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND_SUTRA)

print(f"💾 Saving to Desktop 3D World: {OUT_BLEND_DESK}")
os.makedirs(os.path.dirname(OUT_BLEND_DESK), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND_DESK)

print("🖼️ Rendering High-Fidelity 1080p Preview Frame from Cam_01_Drowning_WaterLevel_POV...")
scene.render.filepath = OUT_RENDER_PNG
try:
    bpy.ops.render.render(write_still=True)
    print(f"✅ Render Completed -> {OUT_RENDER_PNG}")
except Exception as e:
    print(f"⚠️ Render note: {e}")

print("=" * 80)
print("✨ [SUCCESS] PURE SUBMERGED VILLAGE & DROWNING SURVIVORS WORLD COMPLETED!")
print("=" * 80)
