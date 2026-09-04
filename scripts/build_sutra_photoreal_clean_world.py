#!/usr/bin/env python3
"""
=============================================================================
Project SUTRA — Pure Hyper-Realistic Himalayan Disaster World
Track SH-DST-05 | Clean Airspace (Zero Static Swarms) for SITL Spawning
=============================================================================
"""
import bpy
import bmesh
import math
import random
import os
import json
import time

random.seed(42)

# Reset scene
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = 120
scene.render.fps = 24

# Setup Cycles GPU
scene.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type = 'CUDA'
prefs.get_devices()
for d in prefs.devices:
    d.use = True

scene.cycles.device = 'GPU'
scene.cycles.samples = 64
scene.cycles.use_denoising = True
scene.cycles.denoiser = 'OPENIMAGEDENOISE'

# ----------------------------------------------------------------------
# 1. Sky & Monsoon Atmospheric Environment
# ----------------------------------------------------------------------
world = bpy.data.worlds.new("SUTRA_Monsoon_Disaster_Sky")
scene.world = world
world.use_nodes = True
wn = world.node_tree.nodes
wl = world.node_tree.links
wn.clear()

w_out = wn.new('ShaderNodeOutputWorld')
w_sky = wn.new('ShaderNodeTexSky')
w_sky.sky_type = 'MULTIPLE_SCATTERING'
w_sky.sun_elevation = math.radians(28.0)
w_sky.sun_rotation = math.radians(65.0)
w_sky.altitude = 1800.0  # Himalayan elevation
w_sky.air_density = 1.15
w_sky.aerosol_density = 2.5  # High monsoon haze/moisture
w_sky.ozone_density = 2.0

# Atmospheric color tint (overcast cool monsoon daylight)
w_bg = wn.new('ShaderNodeBackground')
w_bg.inputs['Strength'].default_value = 1.0
wl.new(w_sky.outputs['Color'], w_bg.inputs['Color'])
wl.new(w_bg.outputs['Background'], w_out.inputs['Surface'])

# Sun directional fill
sun_data = bpy.data.lights.new(name="Himalayan_Sun", type='SUN')
sun_data.energy = 5.5
sun_data.angle = math.radians(12.0)  # Soft overcast shadows
sun_data.color = (0.94, 0.96, 1.0)
sun_obj = bpy.data.objects.new(name="Himalayan_Sun", object_data=sun_data)
scene.collection.objects.link(sun_obj)
sun_obj.rotation_euler = (math.radians(48), math.radians(16), math.radians(-32))

# ----------------------------------------------------------------------
# 2. Advanced Procedural PBR Shaders
# ----------------------------------------------------------------------
def create_procedural_rock():
    mat = bpy.data.materials.new(name="PBR_Granite_Cliff")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    m_out = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    
    tex_coord = nodes.new('ShaderNodeTexCoord')
    noise1 = nodes.new('ShaderNodeTexNoise')
    noise1.inputs['Scale'].default_value = 8.0
    noise1.inputs['Detail'].default_value = 12.0
    noise1.inputs['Roughness'].default_value = 0.65

    noise2 = nodes.new('ShaderNodeTexNoise')
    noise2.inputs['Scale'].default_value = 2.5
    noise2.inputs['Detail'].default_value = 6.0

    cr = nodes.new('ShaderNodeValToRGB')
    cr.color_ramp.elements[0].position = 0.25
    cr.color_ramp.elements[0].color = (0.18, 0.17, 0.16, 1.0)  # Dark slate
    cr.color_ramp.elements[1].position = 0.75
    cr.color_ramp.elements[1].color = (0.42, 0.39, 0.36, 1.0)  # Weathered granite

    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.45

    links.new(tex_coord.outputs['Object'], noise1.inputs['Vector'])
    links.new(noise1.outputs['Fac'], cr.inputs['Fac'])
    links.new(cr.outputs['Color'], bsdf.inputs['Base Color'])
    
    links.new(tex_coord.outputs['Object'], noise2.inputs['Vector'])
    links.new(noise2.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    
    bsdf.inputs['Roughness'].default_value = 0.85
    links.new(bsdf.outputs['BSDF'], m_out.inputs['Surface'])
    return mat

def create_procedural_mud():
    mat = bpy.data.materials.new(name="PBR_Wet_Alluvial_Mud")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    m_out = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    
    tc = nodes.new('ShaderNodeTexCoord')
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 14.0
    noise.inputs['Detail'].default_value = 8.0
    
    cr = nodes.new('ShaderNodeValToRGB')
    cr.color_ramp.elements[0].position = 0.3
    cr.color_ramp.elements[0].color = (0.11, 0.08, 0.05, 1.0)  # Deep wet silt
    cr.color_ramp.elements[1].position = 0.8
    cr.color_ramp.elements[1].color = (0.24, 0.18, 0.12, 1.0)  # Alluvial clay

    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.25

    links.new(tc.outputs['Object'], noise.inputs['Vector'])
    links.new(noise.outputs['Fac'], cr.inputs['Fac'])
    links.new(cr.outputs['Color'], bsdf.inputs['Base Color'])
    links.new(noise.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    
    bsdf.inputs['Roughness'].default_value = 0.28  # Wet glistening mud
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.65
    links.new(bsdf.outputs['BSDF'], m_out.inputs['Surface'])
    return mat

def create_photoreal_water():
    mat = bpy.data.materials.new(name="PBR_Turbid_Floodwater")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    m_out = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    
    bsdf.inputs['Base Color'].default_value = (0.20, 0.18, 0.14, 1.0)
    bsdf.inputs['Roughness'].default_value = 0.06
    if 'Transmission Weight' in bsdf.inputs:
        bsdf.inputs['Transmission Weight'].default_value = 0.88
    elif 'Transmission' in bsdf.inputs:
        bsdf.inputs['Transmission'].default_value = 0.88
    if 'IOR' in bsdf.inputs:
        bsdf.inputs['IOR'].default_value = 1.333

    # Volumetric turbidity
    v_abs = nodes.new('ShaderNodeVolumeAbsorption')
    v_abs.inputs['Color'].default_value = (0.32, 0.25, 0.16, 1.0)
    v_abs.inputs['Density'].default_value = 0.18

    # Fast river wave displacement
    wave = nodes.new('ShaderNodeTexWave')
    wave.inputs['Scale'].default_value = 2.4
    wave.inputs['Distortion'].default_value = 6.0
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.18

    links.new(wave.outputs['Color'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])

    links.new(bsdf.outputs['BSDF'], m_out.inputs['Surface'])
    links.new(v_abs.outputs['Volume'], m_out.inputs['Volume'])
    return mat

mat_rock = create_procedural_rock()
mat_mud = create_procedural_mud()
mat_water = create_photoreal_water()

# Additional Architectural Materials
def simple_pbr(name, col, rough=0.5, spec=0.5):
    m = bpy.data.materials.new(name=name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    if b:
        b.inputs['Base Color'].default_value = col
        b.inputs['Roughness'].default_value = rough
        if 'Specular IOR Level' in b.inputs:
            b.inputs['Specular IOR Level'].default_value = spec
    return m

mat_timber = simple_pbr("DeodarCedar", (0.26, 0.15, 0.08, 1.0), rough=0.55)
mat_roof = simple_pbr("SlateShingles", (0.16, 0.17, 0.18, 1.0), rough=0.45)
mat_stone_wall = simple_pbr("KathKuniStoneWall", (0.34, 0.32, 0.29, 1.0), rough=0.80)
mat_asphalt = simple_pbr("WetHighway", (0.10, 0.10, 0.11, 1.0), rough=0.35, spec=0.7)
mat_orange = simple_pbr("NDRF_Safety_Orange", (1.0, 0.28, 0.0, 1.0), rough=0.35)

# ----------------------------------------------------------------------
# 3. High-Fidelity Himalayan River Valley Terrain
# ----------------------------------------------------------------------
print("🏔️ Generating Detailed Himalayan Disaster Valley...")
mesh_t = bpy.data.meshes.new("HimalayanTerrain")
obj_t = bpy.data.objects.new("Himalayan_Disaster_Valley", mesh_t)
scene.collection.objects.link(obj_t)

bm = bmesh.new()
GW, GH = 180, 180
NX, NY = 120, 120

for j in range(NY + 1):
    y = -GH/2 + j * (GH / NY)
    for i in range(NX + 1):
        x = -GW/2 + i * (GW / NX)
        
        # Sinuous glacial gorge cutting through center
        river_curve = 8.5 * math.sin(x * 0.035) + 3.0 * math.cos(x * 0.07)
        dist_river = abs(y - river_curve)
        river_depth = -6.5 * math.exp(-0.5 * (dist_river / 12.0)**2)
        
        # Eroded banks, terraces, and towering peaks
        terraces = 2.8 * math.sin(dist_river * 0.28)
        mountain_flanks = 0.075 * (dist_river ** 1.38)
        rugged_spurs = 7.5 * math.sin(x * 0.042) * math.cos(y * 0.032)
        crags = 1.2 * math.sin(x * 0.25) * math.sin(y * 0.22)
        
        z = river_depth + mountain_flanks + terraces + rugged_spurs + crags
        bm.verts.new((x, y, z))

bm.verts.ensure_lookup_table()
for j in range(NY):
    for i in range(NX):
        v1 = bm.verts[j * (NX + 1) + i]
        v2 = bm.verts[j * (NX + 1) + i + 1]
        v3 = bm.verts[(j + 1) * (NX + 1) + i + 1]
        v4 = bm.verts[(j + 1) * (NX + 1) + i]
        bm.faces.new((v1, v2, v3, v4))

bm.to_mesh(mesh_t)
bm.free()
mesh_t.materials.append(mat_mud)
mesh_t.materials.append(mat_rock)

# Floodwater Body
bpy.ops.mesh.primitive_plane_add(size=200.0, location=(0, 0, 2.70))
water_body = bpy.context.active_object
water_body.name = "Raging_Floodwater_Surface"
water_body.data.materials.append(mat_water)

# ----------------------------------------------------------------------
# 4. Realistic Kath-Kuni Village (Multi-Tier Architecture)
# ----------------------------------------------------------------------
print("🏘️ Constructing Authentic Kath-Kuni Himalayan Hamlet...")
houses = [
    (-14.0, 7.0, 1.8), (4.0, 10.0, 2.2), (-32.0, 14.0, 3.5), (22.0, 15.0, 3.8),
    (-7.0, -11.0, 1.5), (17.0, -15.0, 2.0), (-26.0, -17.0, 3.2), (36.0, -19.0, 3.6),
    (-45.0, 18.0, 4.8), (48.0, 22.0, 5.0)
]

for idx, (hx, hy, hz) in enumerate(houses):
    sx = random.uniform(7.0, 9.5)
    sy = random.uniform(6.0, 8.0)
    sz = random.uniform(4.0, 5.5)
    rot_z = random.uniform(-0.35, 0.35)

    # 1. Lower Submerged Stone Level
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(hx, hy, hz + sz * 0.25))
    base_story = bpy.context.active_object
    base_story.name = f"House_{idx+1}_StoneBase"
    base_story.scale = (sx, sy, sz * 0.5)
    base_story.rotation_euler[2] = rot_z
    base_story.data.materials.append(mat_stone_wall)

    # 2. Upper Timber-Framed Living Level
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(hx, hy, hz + sz * 0.75 + 0.1))
    upper_story = bpy.context.active_object
    upper_story.name = f"House_{idx+1}_TimberUpper"
    upper_story.scale = (sx * 1.05, sy * 1.05, sz * 0.5)
    upper_story.rotation_euler[2] = rot_z
    upper_story.data.materials.append(mat_timber)

    # 3. Cantilevered Balcony Gallery
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(hx, hy + sy * 0.55, hz + sz * 0.65))
    balcony = bpy.context.active_object
    balcony.name = f"House_{idx+1}_Balcony"
    balcony.scale = (sx * 0.9, 1.2, 0.9)
    balcony.rotation_euler[2] = rot_z
    balcony.data.materials.append(mat_timber)

    # 4. Authentic Double-Sloped Slate Roof with Ridge
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=sx*0.72, depth=2.4, location=(hx, hy, hz + sz + 1.2))
    roof = bpy.context.active_object
    roof.name = f"House_{idx+1}_SlateRoof"
    roof.scale = (1.0, sy / sx, 1.0)
    roof.rotation_euler[2] = rot_z + math.radians(45)
    roof.data.materials.append(mat_roof)

# ----------------------------------------------------------------------
# 5. Mountain Highway & Disaster Mudslide Breach
# ----------------------------------------------------------------------
print("🛣️ Constructing Breached Mountain Road & Landslide...")
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -8.0, 3.05))
road = bpy.context.active_object
road.name = "Mountain_Highway_NH7"
road.scale = (140.0, 5.5, 0.3)
road.data.materials.append(mat_asphalt)

# Landslide Boulders & Fallen Silt across Highway
for b_idx in range(16):
    bx = random.uniform(-30.0, 30.0)
    by = random.uniform(-9.5, -6.5)
    bz = 3.25 + random.uniform(0.0, 0.5)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=random.uniform(0.7, 1.8), location=(bx, by, bz))
    boulder = bpy.context.active_object
    boulder.name = f"Landslide_Boulder_{b_idx+1}"
    boulder.scale = (1.0, random.uniform(0.75, 1.35), random.uniform(0.65, 0.95))
    boulder.data.materials.append(mat_rock)

# ----------------------------------------------------------------------
# 6. Humanitarian Rescue Focus: NDRF Craft, Survivors & SOS Marker
# ----------------------------------------------------------------------
print("🆘 Placing Stranded Survivors, SOS Marker & NDRF Rescue Vessel...")
# High-Visibility Survivor Rooftop
surv_pos = (-14.0, 7.0, 1.8 + 5.2)

# SOS Emergency International Orange Tarp
bpy.ops.mesh.primitive_plane_add(size=5.0, location=(surv_pos[0], surv_pos[1], surv_pos[2] + 0.15))
sos_tarp = bpy.context.active_object
sos_tarp.name = "SOS_Emergency_Thermal_Tarp"
sos_tarp.data.materials.append(mat_orange)

# High-Visibility Survivors (Waving & Signaling)
for s_idx in range(4):
    sx = surv_pos[0] + random.uniform(-1.2, 1.2)
    sy = surv_pos[1] + random.uniform(-1.2, 1.2)
    sz = surv_pos[2] + 0.9
    bpy.ops.mesh.primitive_cylinder_add(radius=0.22, depth=1.6, location=(sx, sy, sz))
    survivor = bpy.context.active_object
    survivor.name = f"Stranded_Survivor_{s_idx+1}"
    survivor.data.materials.append(mat_orange)

# NDRF Motorized Rescue Boat
bpy.ops.mesh.primitive_torus_add(major_radius=2.5, minor_radius=0.55, location=(6.5, -3.2, 2.70))
dinghy = bpy.context.active_object
dinghy.name = "NDRF_Inflatable_Rescue_Dinghy"
dinghy.scale = (1.0, 0.62, 0.72)
dinghy.rotation_euler = (math.radians(3.5), math.radians(-2.5), math.radians(32.0))
dinghy.data.materials.append(mat_orange)

# Floating Driftwood & Washout Debris in Current
for l_idx in range(10):
    lx = random.uniform(-45.0, 45.0)
    ly = random.uniform(-4.0, 4.0)
    lz = 2.65
    bpy.ops.mesh.primitive_cylinder_add(radius=0.28, depth=random.uniform(4.0, 7.5), location=(lx, ly, lz))
    log_obj = bpy.context.active_object
    log_obj.name = f"Washout_Timber_Log_{l_idx+1}"
    log_obj.rotation_euler = (math.radians(90), 0.0, random.uniform(-0.35, 0.35))
    log_obj.data.materials.append(mat_timber)

# ----------------------------------------------------------------------
# 7. Strategic Cinematic Cameras (Clean Airspace)
# ----------------------------------------------------------------------
print("📸 Configuring 4 Reconnaissance Cameras...")
cameras = [
    {
        "name": "CAM_HERO_OVERVIEW",
        "loc": (-45.0, -35.0, 36.0),
        "rot": (math.radians(60.0), 0.0, math.radians(-45.0)),
        "out": "/home/nikhil/Desktop/Project SUTRA/docs/media/sutra_kaggle_world_overview.png",
        "focal": 35.0
    },
    {
        "name": "CAM_RESCUE_FOCUS",
        "loc": (-10.0, 0.0, 14.0),
        "rot": (math.radians(42.0), 0.0, math.radians(-55.0)),
        "out": "/home/nikhil/Desktop/Project SUTRA/docs/media/sutra_kaggle_world_rescue_focus.png",
        "focal": 55.0
    },
    {
        "name": "CAM_NDRF_GROUND",
        "loc": (18.0, -12.0, 4.5),
        "rot": (math.radians(78.0), 0.0, math.radians(45.0)),
        "out": "/home/nikhil/Desktop/Project SUTRA/docs/media/sutra_kaggle_world_ndrf_ground.png",
        "focal": 32.0
    },
    {
        "name": "CAM_GIS_ORTHO",
        "loc": (0.0, 0.0, 105.0),
        "rot": (0.0, 0.0, 0.0),
        "out": "/home/nikhil/Desktop/Project SUTRA/docs/media/sutra_kaggle_world_gis_ortho.png",
        "focal": 50.0
    }
]

scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100

render_times = {}

for cam_info in cameras:
    cam_data = bpy.data.cameras.new(cam_info["name"])
    cam_data.lens = cam_info["focal"]
    cam_obj = bpy.data.objects.new(cam_info["name"], cam_data)
    scene.collection.objects.link(cam_obj)
    cam_obj.location = cam_info["loc"]
    cam_obj.rotation_euler = cam_info["rot"]
    
    scene.camera = cam_obj
    scene.render.filepath = cam_info["out"]
    
    print(f"  Rendering {cam_info['name']} -> {cam_info['out']}...")
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    dt = time.time() - t0
    render_times[cam_info["name"]] = round(dt, 2)
    print(f"  Rendered in {dt:.2f}s")

# Save Master Scene & SimReady Exports
blend_out = "/home/nikhil/Desktop/Project SUTRA/sutra_ws/src/sutra_sim/assets/sutra_master_kaggle_disaster_world.blend"
bpy.ops.wm.save_as_mainfile(filepath=blend_out)
print(f"Saved Blender Master Scene: {blend_out}")

try:
    usd_out = "/home/nikhil/Desktop/Project SUTRA/sutra_ws/src/sutra_sim/assets/sutra_master_kaggle_disaster_world.usdc"
    bpy.ops.wm.usd_export(filepath=usd_out, export_materials=True)
    print(f"Exported Isaac Sim USD: {usd_out}")
except Exception as e:
    print(f"Notice (USD export): {e}")

print("World Generation Complete!")
