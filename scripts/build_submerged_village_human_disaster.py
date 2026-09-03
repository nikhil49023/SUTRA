#!/usr/bin/env python3
"""
================================================================================
PROJECT SUTRA — MASTER SUBMERGED VILLAGE & DROWNING SURVIVORS DISASTER WORLD
================================================================================
Focus: Authentic village_corse.glb hillside village, properly oriented right-side up,
       with lower roads and houses submerged under realistic turbulent floodwater.
       Populated with drowning victims in water, floating survivors, wall clingers,
       and rooftop survivors.
STRICT SCOPE: Village, Water, and People ONLY. Zero choppers/drones/vehicles.
================================================================================
"""

import os
import sys
import math
import random
import bpy
import bmesh
import mathutils

random.seed(42)

# Paths
DOWNLOADS = "/home/nikhil/Downloads"
PROJECT_ROOT = "/home/nikhil/Desktop/Project SUTRA"
DESKTOP_WORLD = "/home/nikhil/Desktop/3D world"

VILLAGE_GLB = os.path.join(DOWNLOADS, "village_corse.glb")
MAN_GLB     = os.path.join(DOWNLOADS, "man.glb")

OUT_BLEND_SUTRA = os.path.join(PROJECT_ROOT, "sutra_ws/src/sutra_sim/assets/submerged_village_flood_world.blend")
OUT_BLEND_DESK  = os.path.join(DESKTOP_WORLD, "submerged_village_flood_world.blend")
OUT_RENDER_PNG  = os.path.join(DESKTOP_WORLD, "submerged_village_flood_render.png")

# Calibrated elevation for realistic house & road submergence
FLOOD_Z = 37.8

print("=" * 80)
print("🌊 BUILDING COMPLETE SUBMERGED VILLAGE & DROWNING SURVIVORS DISASTER WORLD")
print("=" * 80)

# ------------------------------------------------------------------------------
# 1. SCENE CLEANUP & ENGINE SETUP
# ------------------------------------------------------------------------------
print("🧹 [1/7] Initializing clean Blender scene...")
bpy.ops.wm.read_factory_settings(use_empty=True)

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
scene.render.use_motion_blur = False
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'High Contrast'
scene.view_settings.exposure = 0.30
scene.view_settings.gamma = 1.0

# Collections
col_village   = bpy.data.collections.new("01_Submerged_Village")
col_water     = bpy.data.collections.new("02_Turbulent_Floodwater")
col_drowning  = bpy.data.collections.new("03_Drowning_Victims")
col_rooftop   = bpy.data.collections.new("04_Rooftop_Survivors")
col_cams      = bpy.data.collections.new("05_Cinematic_Cameras")

for c in [col_village, col_water, col_drowning, col_rooftop, col_cams]:
    scene.collection.children.link(c)

# ------------------------------------------------------------------------------
# 2. STORM LIGHTING & ATMOSPHERE
# ------------------------------------------------------------------------------
print("⛈️ [2/7] Configuring disaster storm lighting & atmosphere...")
world = bpy.data.worlds.new("Storm_World")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes['Background']
bg.inputs['Color'].default_value = (0.24, 0.30, 0.38, 1.0)
bg.inputs['Strength'].default_value = 1.1

# Sun break light (softened angle to avoid harsh specular washout)
sun_d = bpy.data.lights.new(name="Sun_Break", type='SUN')
sun_d.energy = 4.0
sun_d.color = (1.0, 0.96, 0.90)
sun_d.angle = math.radians(6.0)
sun_obj = bpy.data.objects.new(name="Sun_Break", object_data=sun_d)
col_cams.objects.link(sun_obj)
sun_obj.location = (25.0, 40.0, 120.0)
sun_obj.rotation_euler = (math.radians(52.0), math.radians(15.0), math.radians(-45.0))

# Ambient fill
fill_d = bpy.data.lights.new(name="Storm_Sky_Fill", type='AREA')
fill_d.energy = 240.0
fill_d.size = 200.0
fill_d.color = (0.60, 0.70, 0.82)
fill_obj = bpy.data.objects.new(name="Storm_Sky_Fill", object_data=fill_d)
col_cams.objects.link(fill_obj)
fill_obj.location = (25.0, 30.0, 80.0)

# ------------------------------------------------------------------------------
# 3. IMPORT VILLAGE & FLIP RIGHT-SIDE UP
# ------------------------------------------------------------------------------
print("🏘️ [3/7] Ingesting village_corse.glb with 180° upright orientation...")
if not os.path.exists(VILLAGE_GLB):
    raise FileNotFoundError(f"Missing village asset: {VILLAGE_GLB}")

bpy.ops.import_scene.gltf(filepath=VILLAGE_GLB)
village_root = [o for o in scene.collection.objects if o.parent is None and o.type == 'EMPTY'][0]
village_root.scale = (0.35, 0.35, 0.35)
# Photogrammetry scan orientation fix: rotate 180 deg on X
village_root.rotation_euler.x = math.radians(180.0)
bpy.context.view_layer.update()

for obj in scene.collection.objects:
    if obj != sun_obj and obj != fill_obj and obj != village_root:
        for c in obj.users_collection: c.objects.unlink(obj)
        col_village.objects.link(obj)

for c in village_root.users_collection: c.objects.unlink(village_root)
col_village.objects.link(village_root)
print("✅ Village model oriented upright and scaled!")

# ------------------------------------------------------------------------------
# 4. TURBULENT SILT FLOODWATER (Z = 37.8m)
# ------------------------------------------------------------------------------
print(f"🌊 [4/7] Generating turbulent floodwater plane at Z = {FLOOD_Z}m...")
w_data = bpy.data.meshes.new('FloodWaterMesh')
bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=80, y_segments=80, size=350.0)
bm.to_mesh(w_data)
bm.free()

water_obj = bpy.data.objects.new('FloodWater_Surface', w_data)
col_water.objects.link(water_obj)
water_obj.location = (25.5, 42.0, FLOOD_Z)

# Wave Displacement Modifier for realistic river current
mod_wave = water_obj.modifiers.new(name="Wave_Current", type='DISPLACE')
tex_w = bpy.data.textures.new("Flood_Ripples", type='CLOUDS')
tex_w.noise_scale = 1.4
mod_wave.texture = tex_w
mod_wave.strength = 0.12

# Realistic Opaque Silt Floodwater Shader (softened roughness to prevent blowout)
mat_water = bpy.data.materials.new('Murky_Floodwater')
mat_water.use_nodes = True
wnodes = mat_water.node_tree.nodes
wlinks = mat_water.node_tree.links
wnodes.clear()

w_out  = wnodes.new('ShaderNodeOutputMaterial')
w_bsdf = wnodes.new('ShaderNodeBsdfPrincipled')
w_wave = wnodes.new('ShaderNodeTexWave')
w_bump = wnodes.new('ShaderNodeBump')
w_mix  = wnodes.new('ShaderNodeMix')

w_wave.wave_type = 'BANDS'
w_wave.inputs['Scale'].default_value = 3.5
w_wave.inputs['Distortion'].default_value = 6.0
w_wave.inputs['Detail'].default_value = 3.0

w_bump.inputs['Strength'].default_value = 0.30
wlinks.new(w_wave.outputs['Color'], w_bump.inputs['Height'])
wlinks.new(w_bump.outputs['Normal'], w_bsdf.inputs['Normal'])

w_mix.data_type = 'RGBA'
w_mix.inputs[6].default_value = (0.10, 0.14, 0.12, 1.0) # Murky deep storm silt
w_mix.inputs[7].default_value = (0.50, 0.55, 0.52, 1.0) # Subdued foam crests
wlinks.new(w_wave.outputs['Fac'], w_mix.inputs['Factor'])
wlinks.new(w_mix.outputs[2], w_bsdf.inputs['Base Color'])

w_bsdf.inputs['Roughness'].default_value = 0.22 # Soft natural water sheen
w_bsdf.inputs['IOR'].default_value = 1.333
wlinks.new(w_bsdf.outputs['BSDF'], w_out.inputs['Surface'])
water_obj.data.materials.append(mat_water)

# Water flow keyframes
for f in range(1, 251):
    scene.frame_set(f)
    water_obj.location.y = 42.0 + (f / 250.0) * 8.0
    water_obj.keyframe_insert(data_path="location", frame=f)

# ------------------------------------------------------------------------------
# 5. PREPARE 1.80m HUMAN MODEL
# ------------------------------------------------------------------------------
print("🧍 [5/7] Preparing 1.80m Human Models...")
bpy.ops.import_scene.gltf(filepath=MAN_GLB)
man_meshes = [o for o in scene.collection.objects if o.type == 'MESH' and o.name.startswith('man_')]

bpy.ops.object.select_all(action='DESELECT')
for m in man_meshes:
    m.select_set(True)
bpy.context.view_layer.objects.active = man_meshes[0]
bpy.ops.object.join()

man_master = bpy.context.active_object
man_master.name = 'Human_Master_Template'
bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
scale_fac = 1.80 / max(man_master.dimensions)
man_master.scale = (scale_fac, scale_fac, scale_fac)
bpy.ops.object.transform_apply(scale=True, location=False, rotation=True)

# High-Vis Orange Material
mat_orange = bpy.data.materials.new('HiVis_Rescue_Orange')
mat_orange.use_nodes = True
bsdf_o = mat_orange.node_tree.nodes['Principled BSDF']
bsdf_o.inputs['Base Color'].default_value = (1.0, 0.28, 0.02, 1.0)

def spawn_person(loc, rot, label, col=col_drowning, wear_orange=False):
    inst = man_master.copy()
    inst.name = label
    col.objects.link(inst)
    inst.location = loc
    inst.rotation_euler = rot
    if wear_orange:
        inst.data = man_master.data.copy()
        inst.data.materials.clear()
        inst.data.materials.append(mat_orange)
    return inst

# ------------------------------------------------------------------------------
# 6. POPULATE DROWNING VICTIMS & ROOFTOP SURVIVORS
# ------------------------------------------------------------------------------
print("🌊 [6/7] Populating drowning victims and planted rooftop survivors...")

# A. DROWNING VICTIMS IN FLOOD WATER
drowning_list = [
    # Foreground water (directly in front of hero camera)
    (14.0, -10.0, -1.25, math.radians(35), 0, math.radians(20), True, "Drowning_Foreground_HiVis_1"),
    (22.0, -8.0,  -1.35, math.radians(45), math.radians(15), math.radians(-35), False, "Drowning_Foreground_Civilian_2"),
    (9.0,  -9.0,  -0.25, math.radians(86), 0, math.radians(65), True, "Floating_Victim_Swept_Away_3"),
    (28.0, -6.0,  -1.30, math.radians(40), math.radians(-10), math.radians(-10), False, "Drowning_Victim_Gasping_4"),
    
    # Mid-river flooded current
    (17.0, -1.0, -1.28, math.radians(30), math.radians(-20), math.radians(100), True, "Drowning_Mid_River_5"),
    (24.0, 2.0,  -1.32, math.radians(38), math.radians(12), math.radians(40), False, "Drowning_Near_Submerged_Road_6"),
    (6.0,  -3.0, -0.90, math.radians(20), 0, math.radians(-25), False, "Wading_Survivor_WaistDeep_7"),
    (31.0, 0.0,  -1.20, math.radians(32), 0, math.radians(50), True, "Drowning_East_Bank_8"),

    # Clinging to submerged house & mansion stone walls
    (41.5, 7.5, -0.65, math.radians(25), 0, math.radians(175), True, "Clinging_Submerged_House_Roof_9"),
    (39.0, 4.0, -0.75, math.radians(20), 0, math.radians(160), False, "Clinging_House_Eaves_10"),
    (18.5, 8.5, -0.55, math.radians(20), 0, math.radians(0), True, "Clinging_White_Mansion_Wall_11"),
    (2.5,  2.5, -0.60, math.radians(15), 0, math.radians(-45), False, "Clinging_West_House_Step_12"),
]

for dx, dy, dz_off, rx, ry, rz, is_orange, dlabel in drowning_list:
    p = spawn_person(
        (dx, dy, FLOOD_Z + dz_off),
        (rx, ry, rz),
        dlabel,
        col=col_drowning,
        wear_orange=is_orange
    )
    # Animate drowning struggle bobbing motion
    freq = random.uniform(0.18, 0.28)
    phase = random.uniform(0, math.pi * 2)
    for f in range(1, 251):
        scene.frame_set(f)
        p.location.z = (FLOOD_Z + dz_off) + 0.08 * math.sin(f * freq + phase)
        p.rotation_euler.x = rx + math.radians(3.5 * math.sin(f * freq * 1.2))
        p.keyframe_insert(data_path="location", frame=f)
        p.keyframe_insert(data_path="rotation_euler", frame=f)

# B. ROOFTOP SURVIVORS (Firmly planted directly on measured roof tiles)
rooftop_list = [
    # (x, y, z_planted, rot_z, orange, name)
    (20.5, 19.5, 40.31, math.radians(45),  True,  "Rooftop_Survivor_Mansion"),
    (25.0, 32.0, 42.43, math.radians(-65), False, "Rooftop_Survivor_Mid_Ridge"),
    (35.0, 25.0, 38.77, math.radians(110), True,  "Rooftop_Survivor_East_Slope"),
    (15.0, 35.0, 45.96, math.radians(15),  False, "Rooftop_Survivor_Upper_Terrace"),
    (2.0,  12.0, 38.05, math.radians(-40), True,  "Rooftop_Survivor_West_House"),
]

for rx, ry, rz, rrot, is_orange, rlabel in rooftop_list:
    spawn_person((rx, ry, rz), (0, 0, rrot), rlabel, col=col_rooftop, wear_orange=is_orange)

scene.collection.objects.unlink(man_master)

# Floating wooden debris planks
mat_wood = bpy.data.materials.new("Driftwood")
mat_wood.use_nodes = True
mat_wood.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.22, 0.15, 0.08, 1.0)

for idx, (px, py) in enumerate([(14.0, -9.0), (22.0, -6.0), (27.0, -3.0)]):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(px, py, FLOOD_Z + 0.05))
    plank = bpy.context.active_object
    plank.name = f"Floating_Debris_Plank_{idx}"
    plank.scale = (2.0, 0.5, 0.09)
    plank.rotation_euler.z = math.radians(idx * 45 + 15)
    plank.data.materials.append(mat_wood)
    col_water.objects.link(plank)
    scene.collection.objects.unlink(plank)

# ------------------------------------------------------------------------------
# 7. CAMERAS & VIEWPORT
# ------------------------------------------------------------------------------
print("🎥 [7/7] Setting up cinematic cameras...")

def add_cam(name, loc, target, lens=28.0):
    cam_d = bpy.data.cameras.new(name)
    cam_d.lens = lens
    cam_d.clip_start = 0.1
    cam_d.clip_end = 800.0
    cam_obj = bpy.data.objects.new(name, cam_d)
    col_cams.objects.link(cam_obj)
    cam_obj.location = mathutils.Vector(loc)
    direction = mathutils.Vector(target) - mathutils.Vector(loc)
    cam_obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    return cam_obj

# Camera 1 (Master Hero): Overlooking flooded road & lower village with drowning people
cam_hero = add_cam(
    "Cam_01_Master_Submerged_Village_Hero",
    (18.0, -22.0, FLOOD_Z + 7.5),
    (23.0, 25.0, FLOOD_Z + 3.0),
    lens=26.0
)
scene.camera = cam_hero

# Camera 2: Close Water-Level Drowning POV
add_cam(
    "Cam_02_Close_Water_Drowning_POV",
    (18.0, -13.0, FLOOD_Z + 1.2),
    (20.0, 10.0, FLOOD_Z + 2.0),
    lens=32.0
)

# Camera 3: Submerged House & Wall Clingers
add_cam(
    "Cam_03_Submerged_House_Clingers",
    (35.0, -6.0, FLOOD_Z + 3.5),
    (41.0, 7.0, FLOOD_Z + 0.5),
    lens=35.0
)

# Camera 4: Rooftop Lookdown at Flood Surge
add_cam(
    "Cam_04_Rooftop_Survivor_Lookdown",
    (20.5, 19.5, 42.0),
    (18.0, -10.0, FLOOD_Z),
    lens=24.0
)

# Configure Viewport to start in Camera View & Material Preview
for win in bpy.context.window_manager.windows:
    for area in win.screen.areas:
        if area.type == 'VIEW_3D':
            for space in area.spaces:
                if space.type == 'VIEW_3D':
                    space.region_3d.view_perspective = 'CAMERA'
                    space.shading.type = 'MATERIAL'

# Save files
print(f"💾 Saving to SUTRA Assets: {OUT_BLEND_SUTRA}")
os.makedirs(os.path.dirname(OUT_BLEND_SUTRA), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND_SUTRA)

print(f"💾 Saving to Desktop 3D World: {OUT_BLEND_DESK}")
os.makedirs(os.path.dirname(OUT_BLEND_DESK), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND_DESK)

# Render Final 1080p Image
print("🖼️ Rendering Ultra-HD 1080p Final Disaster Frame...")
scene.render.filepath = OUT_RENDER_PNG
try:
    bpy.ops.render.render(write_still=True)
    print(f"✅ Master Disaster Render Saved -> {OUT_RENDER_PNG}")
except Exception as e:
    print(f"⚠️ Render notice: {e}")

print("=" * 80)
print("✨ [SUCCESS] MASTER SUBMERGED VILLAGE & DROWNING DISASTER WORLD READY!")
print("=" * 80)
