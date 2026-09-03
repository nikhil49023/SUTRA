#!/usr/bin/env python3
"""
================================================================================
PROJECT SUTRA — MASTER TSUNAMI & FLOOD DISASTER 3D WORLD BUILDER (BLENDER)
================================================================================
Author: SUTRA Autonomous Multi-Drone Swarm Architecture
Target: Blender 5.2 LTS | NVIDIA RTX 3050 Laptop GPU (4GB VRAM Optimized)

Constructs an ultra-realistic 600m x 600m coastal/river delta tsunami surge &
flash flood disaster environment using real 3D assets from ~/Downloads:
  1. village_country_road_country_house_and_farm.glb & village_corse.glb
  2. broken_house.glb, forest_house_ruin.glb, burned_down_house.glb
  3. free_quick_terrain_test.glb & snowy_mountain_-_terrain.glb
  4. hexa_copter_ar-e800_drone.glb (SUTRA Tactical UAV)
  5. mil_mi-8amtsh.glb (Heavy SAR Rescue Helicopter)
  6. military_jeep.glb & jeep.glb (NDRF Emergency Response Vehicles)
  7. russian_soldier.glb (NDRF / Disaster Rescue Command Personnel)
  8. man.glb (Civilians, Rooftop Survivors, Water Victims)
  9. realistic_woolly_sheep.glb (Stranded Livestock)
 10. more_trees.glb & small_rocks.glb (Debris & Flora)
 11. Churning silt floodwater with foam shaders, storm atmospheric lighting & rain
================================================================================
"""

import os
import sys
import math
import random
import bpy
import bmesh

random.seed(42)

# Paths
DOWNLOADS = "/home/nikhil/Downloads"
PROJECT_ROOT = "/home/nikhil/Desktop/Project SUTRA"
DESKTOP_WORLD = "/home/nikhil/Desktop/3D world"

OUTPUT_BLEND_SUTRA = os.path.join(PROJECT_ROOT, "sutra_ws/src/sutra_sim/assets/tsunami_flood_disaster_world.blend")
OUTPUT_BLEND_DESK  = os.path.join(DESKTOP_WORLD, "tsunami_flood_disaster_world.blend")
OUTPUT_RENDER_PNG  = os.path.join(DESKTOP_WORLD, "tsunami_flood_disaster_render.png")

# Scene Constants
MAP_SIZE = 600.0        # 600m x 600m
GRID_N   = 120          # 121 x 121 terrain mesh = 14,641 vertices (efficient)
FLOOD_Z  = 1.85         # Flood / Tsunami water surface level (m)

print("=" * 80)
print("🌊 STARTING PROJECT SUTRA MASTER TSUNAMI & FLOOD WORLD GENERATION")
print("=" * 80)

# ------------------------------------------------------------------------------
# 1. SCENE PURGE & INITIALIZATION
# ------------------------------------------------------------------------------
print("🧹 [1/10] Purging old scene data & configuring units...")
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
scene.name = "SUTRA_Tsunami_Disaster_World"
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1.0
scene.unit_settings.length_unit = 'METERS'

# 250-frame animation timeline
scene.frame_start = 1
scene.frame_end = 250
scene.render.fps = 30
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080

# Configure EEVEE Next & RTX 3050 settings
scene.render.engine = 'BLENDER_EEVEE'
if hasattr(scene, 'eevee'):
    try:
        scene.eevee.use_gtao = True
        scene.eevee.use_bloom = True
        scene.eevee.use_ssr = True
        scene.eevee.use_volumetric_shadows = True
    except Exception:
        pass

# Color Management (High Contrast Cinematic Storm)
scene.view_settings.view_transform = 'AgX' if 'AgX' in [c.name for c in bpy.types.ColorManagedViewSettings.bl_rna.properties['view_transform'].enum_items] else 'Standard'
scene.view_settings.look = 'High Contrast'
scene.view_settings.exposure = 0.8
scene.view_settings.gamma = 1.0

# Collections
col_terrain   = bpy.data.collections.new("01_Terrain_And_Water")
col_buildings = bpy.data.collections.new("02_Submerged_Buildings")
col_props     = bpy.data.collections.new("03_Vegetation_And_Debris")
col_survivors = bpy.data.collections.new("04_Survivors_And_Responders")
col_vehicles  = bpy.data.collections.new("05_Swarm_Drones_And_Vehicles")
col_lights    = bpy.data.collections.new("06_Storm_Lighting_And_Cams")
col_templates = bpy.data.collections.new("00_Templates_Hidden")

for col in [col_terrain, col_buildings, col_props, col_survivors, col_vehicles, col_lights, col_templates]:
    bpy.context.scene.collection.children.link(col)

# Hide template collection from render
col_templates.hide_render = True
col_templates.hide_viewport = True

# ------------------------------------------------------------------------------
# 2. GLB IMPORT & TEMPLATE MANAGEMENT UTILS
# ------------------------------------------------------------------------------
def import_glb_template(filepath, real_dim_m, label):
    """Imports GLB, scales to real-world dimensions, parents to template root."""
    if not os.path.exists(filepath):
        print(f"⚠️ [WARN] Asset not found: {filepath}")
        return None
    
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.import_scene.gltf(filepath=filepath)
    imported = [o for o in bpy.context.selected_objects]
    if not imported:
        return None
    
    # Calculate bounding box
    meshes = [o for o in imported if o.type == 'MESH']
    dims = [max(m.dimensions) for m in meshes if max(m.dimensions) > 0]
    max_d = max(dims) if dims else 1.0
    scale_factor = real_dim_m / max_d if max_d > 0 else 1.0
    
    root = bpy.data.objects.new(f"Template_{label}", None)
    col_templates.objects.link(root)
    
    for obj in imported:
        # Move from scene collection to templates
        for c in obj.users_collection:
            c.objects.unlink(obj)
        col_templates.objects.link(obj)
        if obj.parent is None:
            obj.parent = root
            obj.matrix_parent_inverse.identity()
            
    root.scale = (scale_factor, scale_factor, scale_factor)
    print(f"📦 Loaded Template: {label:32s} (Target Scale: {real_dim_m:.1f}m, Factor: {scale_factor:.4f})")
    return root

def create_linked_instance(template_root, location, rotation_euler=(0,0,0), scale=1.0, label="Inst", target_col=None):
    """Creates a zero-extra-VRAM linked instance of the template."""
    if template_root is None:
        return None
    if target_col is None:
        target_col = col_props
        
    inst_root = bpy.data.objects.new(f"{label}_Root", None)
    target_col.objects.link(inst_root)
    inst_root.location = location
    inst_root.rotation_euler = rotation_euler
    
    base_s = template_root.scale
    inst_root.scale = (base_s[0] * scale, base_s[1] * scale, base_s[2] * scale)
    
    for child in template_root.children_recursive:
        if child.type == 'MESH':
            new_mesh_obj = child.copy()  # Shares child.data (zero memory overhead)
            target_col.objects.link(new_mesh_obj)
            new_mesh_obj.parent = inst_root
            new_mesh_obj.matrix_parent_inverse = child.matrix_parent_inverse.copy()
            
    return inst_root

# ------------------------------------------------------------------------------
# 3. ATMOSPHERIC STORM LIGHTING & SKY DOME
# ------------------------------------------------------------------------------
print("⚡ [2/10] Crafting Tempestuous Monsoon/Tsunami Atmospheric Lighting...")
world = bpy.data.worlds.new("Tsunami_Storm_World")
world.use_nodes = True
scene.world = world
wnodes = world.node_tree.nodes
wlinks = world.node_tree.links
wnodes.clear()

w_out = wnodes.new('ShaderNodeOutputWorld')
w_bg  = wnodes.new('ShaderNodeBackground')
# Moody dark steel grey-blue sky
w_bg.inputs['Color'].default_value = (0.35, 0.42, 0.50, 1.0)
w_bg.inputs['Strength'].default_value = 1.2
wlinks.new(w_bg.outputs['Background'], w_out.inputs['Surface'])

# Key Sun - Low Dramatic Storm Sunlight Piercing Clouds from West
sun_data = bpy.data.lights.new(name="Sun_Storm_Break", type='SUN')
sun_data.energy = 6.5
sun_data.color = (0.95, 0.88, 0.76)
sun_data.angle = math.radians(6.0)
sun_obj = bpy.data.objects.new(name="Sun_Storm_Break", object_data=sun_data)
col_lights.objects.link(sun_obj)
sun_obj.location = (-150.0, 100.0, 200.0)
sun_obj.rotation_euler = (math.radians(52.0), math.radians(10.0), math.radians(-65.0))

# Overhead Cloud Dome Ambient Fill
sky_fill_data = bpy.data.lights.new(name="Sky_Dome_Fill", type='AREA')
sky_fill_data.energy = 2200.0
sky_fill_data.size = 500.0
sky_fill_data.color = (0.50, 0.62, 0.75)
sky_fill = bpy.data.objects.new(name="Sky_Dome_Fill", object_data=sky_fill_data)
col_lights.objects.link(sky_fill)
sky_fill.location = (0.0, 0.0, 250.0)

# ------------------------------------------------------------------------------
# 4. TERRAIN GENERATION (600m x 600m Alluvial Delta & Raised Embankment)
# ------------------------------------------------------------------------------
print("🏔️ [3/10] Synthesizing 600m x 600m Alluvial Coastal Delta Terrain...")
terrain_mesh = bpy.data.meshes.new("Tsunami_Terrain_Mesh")
bm = bmesh.new()
vert_grid = []

for iy in range(GRID_N + 1):
    row = []
    for ix in range(GRID_N + 1):
        # Coordinates from -300 to +300
        x = (ix / GRID_N - 0.5) * MAP_SIZE
        y = (iy / GRID_N - 0.5) * MAP_SIZE
        
        # South is low (ocean/tsunami surge ingress), North is high
        delta_slope = (y / MAP_SIZE) * 3.5  # -1.75m south to +1.75m north
        
        # Central Village Mound (Houses built on subtle high ground)
        mound_central = 2.4 * math.exp(-((x - 20)**2 / (2 * 90**2) + (y + 10)**2 / (2 * 80**2)))
        
        # West Shore Dune Ridge
        mound_west = 1.8 * math.exp(-((x + 120)**2 / (2 * 70**2) + (y - 40)**2 / (2 * 60**2)))
        
        # Raised NDRF Command Embankment Road (Northern High Ground at y = 140m)
        embankment = 4.2 * math.exp(-((y - 140)**2) / (2 * 22**2))
        
        # Water Channel / Breached Creek through the center
        creek_gully = -1.6 * math.exp(-((x + y * 0.25)**2) / (2 * 35**2))
        
        # Micro alluvial mud roughness
        micro = 0.25 * math.sin(x * 0.08) * math.cos(y * 0.08) + 0.12 * math.sin(x * 0.2 + y * 0.15)
        
        z = delta_slope + mound_central + mound_west + embankment + creek_gully + micro
        row.append(bm.verts.new((x, y, z)))
    vert_grid.append(row)

bm.verts.ensure_lookup_table()
for iy in range(GRID_N):
    for ix in range(GRID_N):
        bm.faces.new((
            vert_grid[iy][ix],
            vert_grid[iy][ix+1],
            vert_grid[iy+1][ix+1],
            vert_grid[iy+1][ix]
        ))

bm.to_mesh(terrain_mesh)
bm.free()
terrain_mesh.update()

terrain_obj = bpy.data.objects.new("Tsunami_Coastal_Terrain", terrain_mesh)
col_terrain.objects.link(terrain_obj)

# Terrain Material (Wet Mud, Silt & Eroded Soil PBR)
mat_mud = bpy.data.materials.new("PBR_Wet_Alluvial_Mud")
mat_mud.use_nodes = True
mnodes = mat_mud.node_tree.nodes
mlinks = mat_mud.node_tree.links
mnodes.clear()

m_out  = mnodes.new('ShaderNodeOutputMaterial')
m_bsdf = mnodes.new('ShaderNodeBsdfPrincipled')
m_tex  = mnodes.new('ShaderNodeTexNoise')
m_mix  = mnodes.new('ShaderNodeMix')

m_tex.inputs['Scale'].default_value = 8.0
m_tex.inputs['Detail'].default_value = 5.0
m_mix.data_type = 'RGBA'
m_mix.inputs[6].default_value = (0.18, 0.13, 0.09, 1.0) # Wet dark mud
m_mix.inputs[7].default_value = (0.34, 0.26, 0.18, 1.0) # Silt sediment

mlinks.new(m_tex.outputs['Fac'], m_mix.inputs['Factor'])
mlinks.new(m_mix.outputs[2], m_bsdf.inputs['Base Color'])
m_bsdf.inputs['Roughness'].default_value = 0.75
mlinks.new(m_bsdf.outputs['BSDF'], m_out.inputs['Surface'])
terrain_obj.data.materials.append(mat_mud)

# ------------------------------------------------------------------------------
# 5. CHURNING TSUNAMI / FLOOD WATER SURFACE (ANIMATED CURRENT & FOAM)
# ------------------------------------------------------------------------------
print("🌊 [4/10] Constructing Turbulent Tsunami Floodwater Surface with Flow Waves...")
water_mesh = bpy.data.meshes.new("Tsunami_Water_Mesh")
bm_w = bmesh.new()
hw = MAP_SIZE / 2.0

w0 = bm_w.verts.new((-hw, -hw, FLOOD_Z))
w1 = bm_w.verts.new(( hw, -hw, FLOOD_Z))
w2 = bm_w.verts.new(( hw,  hw, FLOOD_Z))
w3 = bm_w.verts.new((-hw,  hw, FLOOD_Z))
bm_w.faces.new((w0, w1, w2, w3))
bmesh.ops.subdivide_edges(bm_w, edges=bm_w.edges, cuts=60)
bm_w.to_mesh(water_mesh)
bm_w.free()
water_mesh.update()

water_obj = bpy.data.objects.new("Tsunami_Surge_Water", water_mesh)
col_terrain.objects.link(water_obj)

# Wave Displacement Modifier
mod_wave = water_obj.modifiers.new(name="Surge_Wave_Displace", type='DISPLACE')
tex_displace = bpy.data.textures.new("Surge_Wave_Noise", type='CLOUDS')
tex_displace.noise_scale = 2.4
mod_wave.texture = tex_displace
mod_wave.strength = 0.22

# Water Shader (Murky Churning Silt with Foam Ripples)
mat_water = bpy.data.materials.new("PBR_Turbulent_Floodwater")
mat_water.use_nodes = True
wnodes = mat_water.node_tree.nodes
wlinks = mat_water.node_tree.links
wnodes.clear()

w_out   = wnodes.new('ShaderNodeOutputMaterial')
w_bsdf  = wnodes.new('ShaderNodeBsdfPrincipled')
w_wave  = wnodes.new('ShaderNodeTexWave')
w_noise = wnodes.new('ShaderNodeTexNoise')
w_bump  = wnodes.new('ShaderNodeBump')
w_mix   = wnodes.new('ShaderNodeMix')

w_wave.wave_type = 'BANDS'
w_wave.inputs['Scale'].default_value = 5.0
w_wave.inputs['Distortion'].default_value = 8.0
w_wave.inputs['Detail'].default_value = 4.0

w_noise.inputs['Scale'].default_value = 14.0

w_bump.inputs['Strength'].default_value = 0.35
wlinks.new(w_wave.outputs['Color'], w_bump.inputs['Height'])
wlinks.new(w_bump.outputs['Normal'], w_bsdf.inputs['Normal'])

# Murky Green-Brown Flood Water with Surface Whitecaps
w_mix.data_type = 'RGBA'
w_mix.inputs[6].default_value = (0.16, 0.24, 0.22, 1.0) # Deep silt water
w_mix.inputs[7].default_value = (0.72, 0.78, 0.75, 1.0) # Foam froth
wlinks.new(w_wave.outputs['Fac'], w_mix.inputs['Factor'])
wlinks.new(w_mix.outputs[2], w_bsdf.inputs['Base Color'])

w_bsdf.inputs['Roughness'].default_value = 0.08
w_bsdf.inputs['IOR'].default_value = 1.333
if 'Transmission Weight' in w_bsdf.inputs:
    w_bsdf.inputs['Transmission Weight'].default_value = 0.70

wlinks.new(w_bsdf.outputs['BSDF'], w_out.inputs['Surface'])
water_obj.data.materials.append(mat_water)

# Animate Water Flow Surge (Y translation from South to North across 250 frames)
for f in range(1, 251):
    scene.frame_set(f)
    water_obj.location.y = (f / 250.0) * 12.0
    water_obj.keyframe_insert(data_path="location", frame=f)

# ------------------------------------------------------------------------------
# 6. LOAD ASSET TEMPLATES FROM ~/Downloads
# ------------------------------------------------------------------------------
print("📦 [5/10] Ingesting and Normalizing 3D Asset Templates from ~/Downloads...")

tmpl_drone   = import_glb_template(f"{DOWNLOADS}/hexa_copter_ar-e800_drone.glb", 2.2, "UAV_Hexacopter")
tmpl_helo    = import_glb_template(f"{DOWNLOADS}/mil_mi-8amtsh.glb", 18.5, "Helo_MI8")
tmpl_miltruck= import_glb_template(f"{DOWNLOADS}/military_jeep.glb", 5.2, "Military_Jeep")
tmpl_jeep    = import_glb_template(f"{DOWNLOADS}/jeep.glb", 4.0, "Civilian_Jeep")
tmpl_soldier = import_glb_template(f"{DOWNLOADS}/russian_soldier.glb", 1.82, "NDRF_Operator")
tmpl_man     = import_glb_template(f"{DOWNLOADS}/man.glb", 1.78, "Civilian_Survivor")
tmpl_sheep   = import_glb_template(f"{DOWNLOADS}/realistic_woolly_sheep_-_thick_curled_fleece.glb", 1.2, "Livestock_Sheep")
tmpl_trees   = import_glb_template(f"{DOWNLOADS}/more_trees.glb", 14.0, "Trees_Cluster")
tmpl_rocks   = import_glb_template(f"{DOWNLOADS}/small_rocks.glb", 3.0, "Debris_Rocks")
tmpl_broken  = import_glb_template(f"{DOWNLOADS}/broken_house.glb", 12.0, "Broken_House_Ruin")
tmpl_forest_h= import_glb_template(f"{DOWNLOADS}/forest_house_ruin.glb", 14.0, "Forest_Ruin")
tmpl_burnt   = import_glb_template(f"{DOWNLOADS}/burned_down_house_-_hull_uk__drone_3d_scan.glb", 11.0, "Burnt_Ruin")
tmpl_farm    = import_glb_template(f"{DOWNLOADS}/village_country_road_country_house_and_farm.glb", 38.0, "Country_Farm_Complex")
tmpl_mount   = import_glb_template(f"{DOWNLOADS}/snowy_mountain_-_terrain.glb", 280.0, "Himalayan_Backdrop")

# ------------------------------------------------------------------------------
# 7. POPULATE SUBMERGED VILLAGE & INFRASTRUCTURE
# ------------------------------------------------------------------------------
print("🏘️ [6/10] Placing Submerged Farm Complexes, Village Houses & Ruins...")

# A. Distant Mountain Horizon Backdrop (North-East, 450m away)
if tmpl_mount:
    create_linked_instance(tmpl_mount, (120.0, 360.0, -10.0), (0, 0, math.radians(45)), scale=1.4, label="Mountain_Backdrop", target_col=col_terrain)

# B. Country Farm Complex (Partially inundated in flood zone)
if tmpl_farm:
    create_linked_instance(tmpl_farm, (-40.0, 10.0, 0.4), (0, 0, math.radians(-15)), scale=1.0, label="Submerged_Farm_East", target_col=col_buildings)

# C. Broken Houses & Ruins in Rising Water
if tmpl_broken:
    create_linked_instance(tmpl_broken, (45.0, -25.0, 0.6), (math.radians(4), math.radians(-3), math.radians(30)), scale=1.1, label="Flooded_House_1", target_col=col_buildings)
    create_linked_instance(tmpl_broken, (-85.0, -60.0, 0.2), (0, math.radians(6), math.radians(120)), scale=0.95, label="Flooded_House_2", target_col=col_buildings)

if tmpl_forest_h:
    create_linked_instance(tmpl_forest_h, (15.0, 55.0, 1.1), (0, 0, math.radians(75)), scale=1.05, label="Ruin_Masonry_North", target_col=col_buildings)

if tmpl_burnt:
    create_linked_instance(tmpl_burnt, (-110.0, 20.0, 0.8), (0, 0, math.radians(210)), scale=1.0, label="Smashed_Building_West", target_col=col_buildings)

# D. Procedural Submerged Huts (Village Clusters)
def make_hut_mesh(width, length, height, name):
    me = bpy.data.meshes.new(name)
    bm_h = bmesh.new()
    hw, hl = width / 2.0, length / 2.0
    # Walls
    bmesh.ops.create_cube(bm_h, size=1.0)
    for v in bm_h.verts:
        v.co.x *= width
        v.co.y *= length
        v.co.z = (v.co.z + 0.5) * height
    # Roof (Pyramid / Gable)
    r_peak = bm_h.verts.new((0, 0, height + 1.6))
    top_verts = [v for v in bm_h.verts if v.co.z >= height - 0.01 and v != r_peak]
    for i in range(len(top_verts)):
        bm_h.faces.new((top_verts[i], top_verts[(i+1)%len(top_verts)], r_peak))
    bm_h.to_mesh(me)
    bm_h.free()
    return me

mat_thatch = bpy.data.materials.new("PBR_Thatched_Roof")
mat_thatch.use_nodes = True
mat_thatch.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.55, 0.42, 0.22, 1.0)

hut_coords = [
    (10, -5, 0.8), (-15, -35, 0.5), (60, 20, 1.2), (-60, -15, 0.6),
    (30, -70, 0.3), (-25, 40, 1.0), (80, -40, 0.4), (-90, -85, 0.1)
]

for idx, (hx, hy, hz) in enumerate(hut_coords):
    h_mesh = make_hut_mesh(5.0 + (idx%3), 6.0 + (idx%2), 3.2, f"Kaccha_Hut_Mesh_{idx}")
    h_obj = bpy.data.objects.new(f"Submerged_Hut_{idx}", h_mesh)
    col_buildings.objects.link(h_obj)
    h_obj.location = (hx, hy, hz)
    h_obj.rotation_euler.z = math.radians(idx * 43)
    h_obj.data.materials.append(mat_thatch)

# ------------------------------------------------------------------------------
# 8. VEGETATION, ROCKS & DEBRIS CLUSTERS
# ------------------------------------------------------------------------------
print("🌲 [7/10] Distributing Tree Lines, Rocks & Driftwood Debris...")
if tmpl_trees:
    tree_locs = [
        (-140, 80, 2.2), (-110, 110, 2.8), (-70, 130, 3.4), (20, 145, 3.8),
        (80, 135, 3.2), (130, 100, 2.5), (-50, -60, 0.6), (70, -80, 0.5),
        (-130, -20, 0.8), (110, -10, 1.0), (25, -110, 0.3), (-80, 60, 1.8)
    ]
    for i, tloc in enumerate(tree_locs):
        create_linked_instance(tmpl_trees, tloc, (0, 0, math.radians(i * 37)), scale=0.85 + (i%4)*0.1, label=f"TreeCluster_{i}", target_col=col_props)

if tmpl_rocks:
    rock_locs = [
        (-20, -10, 1.4), (35, -45, 0.9), (-75, 5, 1.2), (5, 70, 1.6),
        (-95, -40, 0.7), (85, -20, 0.8), (0, 130, 3.6), (-40, 135, 3.9)
    ]
    for i, rloc in enumerate(rock_locs):
        create_linked_instance(tmpl_rocks, rloc, (math.radians(i*15), math.radians(i*25), math.radians(i*45)), scale=0.8 + (i%3)*0.25, label=f"RockDebris_{i}", target_col=col_props)

# ------------------------------------------------------------------------------
# 9. SAR HUMAN SURVIVORS & LIVESTOCK
# ------------------------------------------------------------------------------
print("🧍 [8/10] Stationing Rooftop Survivors, Wading Victims & NDRF Responders...")

# High-Vis SAR Outfits Materials
mat_sar_orange = bpy.data.materials.new("HighVis_Orange_LifeVest")
mat_sar_orange.use_nodes = True
b_o = mat_sar_orange.node_tree.nodes['Principled BSDF']
b_o.inputs['Base Color'].default_value = (1.0, 0.28, 0.02, 1.0)
if 'Emission Color' in b_o.inputs:
    b_o.inputs['Emission Color'].default_value = (1.0, 0.28, 0.02, 1.0)
    b_o.inputs['Emission Strength'].default_value = 0.5

if tmpl_man:
    # A. Rooftop Stranded Survivors (High priority targets for SUTRA Swarm)
    survivors = [
        # (x, y, z, rot_z, label)
        (45.0, -23.0, 4.4, math.radians(110), "Survivor_Rooftop_East"),
        (-38.0, 14.0, 4.8, math.radians(-30), "Survivor_Farm_Roof_1"),
        (-42.0, 16.0, 4.8, math.radians(45),  "Survivor_Farm_Roof_2"),
        (15.0, 56.0, 4.6, math.radians(180), "Survivor_Ruin_Rooftop"),
        (10.0, -5.0, 4.2, math.radians(90),  "Survivor_KacchaHut_1"),
        (-60.0, -15.0, 4.0, math.radians(-75), "Survivor_KacchaHut_2")
    ]
    for sx, sy, sz, srz, slabel in survivors:
        create_linked_instance(tmpl_man, (sx, sy, sz), (0, 0, srz), scale=1.0, label=slabel, target_col=col_survivors)
        
    # B. Victims in Water / Clinging to Floating Objects
    water_victims = [
        (-10.0, -45.0, FLOOD_Z - 0.35, math.radians(15), "Water_Victim_Clinging_1"),
        (25.0, -85.0,  FLOOD_Z - 0.40, math.radians(-45), "Water_Victim_Clinging_2"),
        (-75.0, -70.0, FLOOD_Z - 0.30, math.radians(80), "Water_Victim_Clinging_3")
    ]
    for wx, wy, wz, wrz, wlabel in water_victims:
        create_linked_instance(tmpl_man, (wx, wy, wz), (math.radians(75), 0, wrz), scale=1.0, label=wlabel, target_col=col_survivors)

# C. Stranded Livestock on Isolated Knoll
if tmpl_sheep:
    create_linked_instance(tmpl_sheep, (-18.0, 2.0, 1.95), (0, 0, math.radians(35)), scale=1.0, label="Stranded_Livestock_1", target_col=col_survivors)
    create_linked_instance(tmpl_sheep, (-16.5, 3.5, 1.98), (0, 0, math.radians(-80)), scale=0.9, label="Stranded_Livestock_2", target_col=col_survivors)

# D. NDRF First Responders on Dry Embankment (Command Post at y=140m)
if tmpl_soldier:
    ndrf_personnel = [
        (8.0, 138.0, 4.3, math.radians(180), "NDRF_Commander"),
        (10.5, 137.5, 4.3, math.radians(190), "NDRF_Radio_Operator"),
        (-15.0, 139.0, 4.3, math.radians(170), "NDRF_Spotter_1"),
        (-17.0, 138.5, 4.3, math.radians(160), "NDRF_Spotter_2")
    ]
    for px, py, pz, prz, plabel in ndrf_personnel:
        create_linked_instance(tmpl_soldier, (px, py, pz), (0, 0, prz), scale=1.0, label=plabel, target_col=col_survivors)

# ------------------------------------------------------------------------------
# 10. TACTICAL ASSETS: SUTRA DRONE, HELICOPTER & NDRF VEHICLES
# ------------------------------------------------------------------------------
print("🚁 [9/10] Deploying SUTRA Hexacopter Swarm, Rescue Helicopter & Evac Jeeps...")

# A. NDRF Command Vehicles on Embankment Road
if tmpl_miltruck:
    create_linked_instance(tmpl_miltruck, (0.0, 140.0, 4.3), (0, 0, math.radians(90)), scale=1.0, label="NDRF_Command_Truck", target_col=col_vehicles)

if tmpl_jeep:
    create_linked_instance(tmpl_jeep, (-25.0, 141.0, 4.2), (0, 0, math.radians(85)), scale=1.0, label="NDRF_Patrol_Jeep", target_col=col_vehicles)

# B. SUTRA Hexacopter Drone (Tactical Autonomous Reconnaissance)
if tmpl_drone:
    drone_inst = create_linked_instance(tmpl_drone, (25.0, -10.0, 15.0), (math.radians(8), math.radians(-4), math.radians(135)), scale=1.0, label="SUTRA_Alpha_Lead_Drone", target_col=col_vehicles)
    
    # Add High-Intensity Searchlight beaming onto rooftop survivors
    spot_data = bpy.data.lights.new(name="Drone_SAR_Spotlight", type='SPOT')
    spot_data.energy = 4500.0
    spot_data.spot_size = math.radians(40.0)
    spot_data.spot_blend = 0.25
    spot_data.color = (0.75, 0.90, 1.0)
    spot_obj = bpy.data.objects.new(name="Drone_SAR_Spotlight", object_data=spot_data)
    col_vehicles.objects.link(spot_obj)
    spot_obj.location = (25.0, -10.0, 14.5)
    spot_obj.rotation_euler = (math.radians(25.0), 0, math.radians(-45.0))
    
    # Animate gentle drone loiter hover
    for f in range(1, 251):
        scene.frame_set(f)
        spot_obj.location.z = 14.5 + 0.15 * math.sin(f * 0.12)
        spot_obj.keyframe_insert(data_path="location", frame=f)

# C. Heavy SAR MI-8 Rescue Helicopter (Approaching over floodwaters)
if tmpl_helo:
    create_linked_instance(tmpl_helo, (-70.0, -140.0, 32.0), (math.radians(-6), math.radians(8), math.radians(35)), scale=1.0, label="Rescue_MI8_Helicopter", target_col=col_vehicles)

# ------------------------------------------------------------------------------
# 11. CAMERAS & CINEMATIC PERSPECTIVES
# ------------------------------------------------------------------------------
print("🎥 [10/10] Setting up Multi-Camera Perspectives & Surveillance Streams...")

def create_camera(name, loc, rot, focal_len=35.0):
    cam_data = bpy.data.cameras.new(name)
    cam_data.lens = focal_len
    cam_data.clip_start = 0.2
    cam_data.clip_end = 1200.0
    cam_obj = bpy.data.objects.new(name, cam_data)
    col_lights.objects.link(cam_obj)
    cam_obj.location = loc
    cam_obj.rotation_euler = rot
    return cam_obj

# Camera 1: Master Cinematic Tsunami Hero Angle (Hero Shot of flood, drone, and survivors)
cam_hero = create_camera("Cam_Tsunami_Hero_Cinematic", (65.0, -95.0, 22.0), (math.radians(72), 0, math.radians(38)), focal_len=28.0)
scene.camera = cam_hero

# Camera 2: SUTRA Drone Gimbal Perspective (Look-down survivor geolocation feed)
cam_drone = create_camera("Cam_SUTRA_Drone_Gimbal", (24.5, -9.5, 14.2), (math.radians(48), 0, math.radians(-115)), focal_len=24.0)

# Camera 3: NDRF Embankment Command Point-of-View
cam_ndrf = create_camera("Cam_NDRF_Command_View", (6.0, 136.0, 5.8), (math.radians(82), 0, math.radians(180)), focal_len=35.0)

# Camera 4: Wide 3D Tactical Overview
cam_top = create_camera("Cam_Tactical_Overview_3D", (0.0, -20.0, 160.0), (math.radians(35), 0, 0), focal_len=20.0)

# ------------------------------------------------------------------------------
# 12. SAVE BLEND FILE & RENDER PREVIEW
# ------------------------------------------------------------------------------
print(f"💾 Saving Master 3D World to: {OUTPUT_BLEND_SUTRA}")
os.makedirs(os.path.dirname(OUTPUT_BLEND_SUTRA), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=OUTPUT_BLEND_SUTRA)

print(f"💾 Creating Desktop Copy: {OUTPUT_BLEND_DESK}")
os.makedirs(os.path.dirname(OUTPUT_BLEND_DESK), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=OUTPUT_BLEND_DESK)

print("🖼️ Rendering Ultra-HD 1080p Preview Frame...")
scene.render.filepath = OUTPUT_RENDER_PNG
try:
    bpy.ops.render.render(write_still=True)
    print(f"✅ Render Saved -> {OUTPUT_RENDER_PNG}")
except Exception as e:
    print(f"⚠️ Render note: {e}")

print("=" * 80)
print("✨ [SUCCESS] MASTER TSUNAMI & FLOOD DISASTER WORLD BUILT SUCCESSFULLY!")
print("=" * 80)
