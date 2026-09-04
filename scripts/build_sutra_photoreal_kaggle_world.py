#!/usr/bin/env python3
"""
================================================================================
PROJECT SUTRA — AUTONOMOUS MULTI-DRONE SWARM SYSTEM (TRACK SH-DST-05)
MASTER PHOTOREALISTIC HIMALAYAN DISASTER WORLD BUILDER (CLEAN AIRSPACE)
================================================================================
Constructs a physically accurate 3D disaster simulation world based on:
1. Real Copernicus 30m Satellite Digital Elevation Model (Kedarnath Valley)
2. Satellite Orthophoto texture mapping & 2K PBR rock/soil normal maps
3. Authentic Himalayan Kath-Kuni stone-and-timber architecture & debris ruins
4. Breached mountain highway with mudslide boulder fan
5. Dynamic turbulent floodwater with volumetric silt absorption
6. High-visibility rooftop survivor beacon & NDRF swift-water rescue craft
7. 100% CLEAN AIRSPACE (0 drones, 0 sensor frustums) ready for PX4/Gazebo SITL
================================================================================
"""

import os
import sys
import time
import math
import json
import random
import shutil
import bpy
import bmesh
import numpy as np

# Set deterministic seed
random.seed(42)
np.random.seed(42)

# Determine asset paths (Kaggle or local)
def resolve_asset_dir():
    kaggle_dir = "/kaggle/input/sutra-disaster-gis-assets"
    local_staging = "/tmp/sutra-disaster-gis-assets"
    local_desktop = "/home/nikhil/Desktop/3D world"
    if os.path.exists(kaggle_dir):
        return kaggle_dir
    elif os.path.exists(local_staging):
        return local_staging
    return local_desktop

ASSET_DIR = resolve_asset_dir()
print(f"[*] SUTRA World Builder using Asset Directory: {ASSET_DIR}")

# Output Directory
OUT_DIR = "/kaggle/working" if os.path.exists("/kaggle/working") else "/home/nikhil/Desktop/Project SUTRA/docs/media"
os.makedirs(OUT_DIR, exist_ok=True)

# ----------------------------------------------------------------------
# 1. Reset Scene & Configure Cycles GPU
# ----------------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = 120
scene.render.fps = 24

scene.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences

# Try OptiX first, fallback to CUDA
for dev_type in ['OPTIX', 'CUDA']:
    try:
        prefs.compute_device_type = dev_type
        prefs.get_devices()
        usable_devices = [d for d in prefs.devices if d.type == dev_type]
        if usable_devices:
            for d in prefs.devices:
                d.use = (d.type == dev_type)
            print(f"[+] Cycles using {dev_type}: {[d.name for d in usable_devices]}")
            break
    except Exception as e:
        print(f"[-] {dev_type} setup note: {e}")

scene.cycles.device = 'GPU'
scene.cycles.samples = 128
scene.cycles.use_denoising = True
scene.cycles.denoiser = 'OPENIMAGEDENOISE'

# ----------------------------------------------------------------------
# 2. Physical Monsoon Atmospheric Lighting
# ----------------------------------------------------------------------
world = bpy.data.worlds.new("SUTRA_Himalayan_Atmosphere")
scene.world = world
world.use_nodes = True
wnodes = world.node_tree.nodes
wlinks = world.node_tree.links
wnodes.clear()

w_out = wnodes.new('ShaderNodeOutputWorld')
w_sky = wnodes.new('ShaderNodeTexSky')
try:
    w_sky.sky_type = 'MULTIPLE_SCATTERING'
except:
    try:
        w_sky.sky_type = 'NISHITA'
    except:
        pass

w_sky.sun_elevation = math.radians(22.0)
w_sky.sun_rotation = math.radians(55.0)
w_sky.altitude = 2200.0
w_sky.air_density = 1.05
if hasattr(w_sky, 'dust_density'):
    w_sky.dust_density = 1.8
elif hasattr(w_sky, 'aerosol_density'):
    w_sky.aerosol_density = 1.8
w_sky.ozone_density = 2.0

w_bg = wnodes.new('ShaderNodeBackground')
w_bg.inputs['Strength'].default_value = 1.15
wlinks.new(w_sky.outputs['Color'], w_bg.inputs['Color'])
wlinks.new(w_bg.outputs['Background'], w_out.inputs['Surface'])

# Direct Sunlight Lamp
sun_data = bpy.data.lights.new(name="Monsoon_Sun", type='SUN')
sun_data.energy = 4.2
sun_data.angle = math.radians(6.5)
sun_data.color = (1.0, 0.96, 0.91)
sun_obj = bpy.data.objects.new(name="Monsoon_Sun", object_data=sun_data)
scene.collection.objects.link(sun_obj)
sun_obj.rotation_euler = (math.radians(52), math.radians(16), math.radians(-42))

# ----------------------------------------------------------------------
# 3. PBR Material Helper Functions
# ----------------------------------------------------------------------
def get_asset_file(filename):
    candidates = [
        os.path.join(ASSET_DIR, filename),
        os.path.join(ASSET_DIR, "gis_data", filename),
        os.path.join(ASSET_DIR, "assets", "input_refs", filename),
        os.path.join(ASSET_DIR, "textures", filename),
        os.path.join("/home/nikhil/Desktop/3D world/gis_data", filename),
        os.path.join("/home/nikhil/Desktop/3D world/textures", filename),
        os.path.join("/home/nikhil/Desktop/3D world/assets/input_refs", filename),
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return None

def create_pbr_mat(name, base_color=(0.5, 0.5, 0.5, 1.0), roughness=0.5, specular=0.5, normal_tex=None, roughness_tex=None):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    
    bsdf.inputs['Base Color'].default_value = base_color
    bsdf.inputs['Roughness'].default_value = roughness
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = specular
    elif 'Specular' in bsdf.inputs:
        bsdf.inputs['Specular'].default_value = specular
        
    if normal_tex and os.path.exists(normal_tex):
        try:
            img = bpy.data.images.load(normal_tex)
            img.colorspace_settings.name = 'Non-Color'
            t_node = nodes.new('ShaderNodeTexImage')
            t_node.image = img
            norm_map = nodes.new('ShaderNodeNormalMap')
            norm_map.inputs['Strength'].default_value = 0.85
            links.new(t_node.outputs['Color'], norm_map.inputs['Color'])
            links.new(norm_map.outputs['Normal'], bsdf.inputs['Normal'])
        except Exception as e:
            print(f"[-] Note loading normal map {normal_tex}: {e}")
            
    if roughness_tex and os.path.exists(roughness_tex):
        try:
            r_img = bpy.data.images.load(roughness_tex)
            r_img.colorspace_settings.name = 'Non-Color'
            r_node = nodes.new('ShaderNodeTexImage')
            r_node.image = r_img
            links.new(r_node.outputs['Color'], bsdf.inputs['Roughness'])
        except Exception as e:
            pass

    return mat

norm_gl_path = get_asset_file("Ground108_2K-PNG_NormalGL.png")
rough_path = get_asset_file("Ground108_2K-PNG_Roughness.png")
color_path = get_asset_file("Ground108_2K-PNG_Color.png")
ortho_path = get_asset_file("kedarnath_satellite_ortho.png")

mat_granite = create_pbr_mat("Granite_Cliff", (0.34, 0.32, 0.30, 1.0), roughness=0.85, normal_tex=norm_gl_path, roughness_tex=rough_path)
mat_mud_silt = create_pbr_mat("Wet_Mud_Silt", (0.24, 0.18, 0.12, 1.0), roughness=0.45, specular=0.7, normal_tex=norm_gl_path)
mat_timber = create_pbr_mat("Himalayan_Cedar_Timber", (0.35, 0.22, 0.12, 1.0), roughness=0.6)
mat_slate = create_pbr_mat("Slate_Gable_Roof", (0.18, 0.19, 0.21, 1.0), roughness=0.55)
mat_asphalt = create_pbr_mat("Mountain_Highway", (0.14, 0.14, 0.15, 1.0), roughness=0.7, normal_tex=norm_gl_path)
mat_orange_sar = create_pbr_mat("NDRF_HiVis_Orange", (1.0, 0.30, 0.02, 1.0), roughness=0.35, specular=0.8)
mat_tarp = create_pbr_mat("SOS_Emergency_Tarp", (1.0, 0.28, 0.0, 1.0), roughness=0.3)
mat_white = create_pbr_mat("White_Marking", (0.95, 0.95, 0.95, 1.0), roughness=0.4)

# ----------------------------------------------------------------------
# 4. Volumetric Muddy Floodwater Material
# ----------------------------------------------------------------------
mat_floodwater = bpy.data.materials.new(name="Turbulent_Floodwater")
mat_floodwater.use_nodes = True
fwnodes = mat_floodwater.node_tree.nodes
fwlinks = mat_floodwater.node_tree.links
fwnodes.clear()

fw_out = fwnodes.new('ShaderNodeOutputMaterial')
fw_bsdf = fwnodes.new('ShaderNodeBsdfPrincipled')
fw_bsdf.inputs['Base Color'].default_value = (0.28, 0.25, 0.19, 1.0)
fw_bsdf.inputs['Roughness'].default_value = 0.08
if 'Transmission Weight' in fw_bsdf.inputs:
    fw_bsdf.inputs['Transmission Weight'].default_value = 0.92
elif 'Transmission' in fw_bsdf.inputs:
    fw_bsdf.inputs['Transmission'].default_value = 0.92
if 'IOR' in fw_bsdf.inputs:
    fw_bsdf.inputs['IOR'].default_value = 1.333

fw_abs = fwnodes.new('ShaderNodeVolumeAbsorption')
fw_abs.inputs['Color'].default_value = (0.45, 0.36, 0.24, 1.0)
fw_abs.inputs['Density'].default_value = 0.14

fw_tex = fwnodes.new('ShaderNodeTexWave')
fw_tex.inputs['Scale'].default_value = 2.4
fw_tex.inputs['Distortion'].default_value = 5.2
fw_bump = fwnodes.new('ShaderNodeBump')
fw_bump.inputs['Strength'].default_value = 0.18
fwlinks.new(fw_tex.outputs['Color'], fw_bump.inputs['Height'])
fwlinks.new(fw_bump.outputs['Normal'], fw_bsdf.inputs['Normal'])

fwlinks.new(fw_bsdf.outputs['BSDF'], fw_out.inputs['Surface'])
fwlinks.new(fw_abs.outputs['Volume'], fw_out.inputs['Volume'])

# ----------------------------------------------------------------------
# 5. Geographically Authentic Copernicus GIS Elevation Terrain
# ----------------------------------------------------------------------
print("[*] Generating Copernicus GIS Elevation Terrain Mesh...")
elev_file = get_asset_file("kedarnath_elevation_200x200.npy")

GRID_SIZE = 220.0
SEGS_X = 160
SEGS_Y = 160

def resample_2d(arr, target_h, target_w):
    orig_h, orig_w = arr.shape
    y_idx = np.linspace(0, orig_h - 1, target_h)
    x_idx = np.linspace(0, orig_w - 1, target_w)
    y0 = np.floor(y_idx).astype(int)
    y1 = np.minimum(y0 + 1, orig_h - 1)
    x0 = np.floor(x_idx).astype(int)
    x1 = np.minimum(x0 + 1, orig_w - 1)
    dy = (y_idx - y0)[:, None]
    dx = (x_idx - x0)[None, :]
    top = arr[y0[:, None], x0[None, :]] * (1 - dx) + arr[y0[:, None], x1[None, :]] * dx
    bot = arr[y1[:, None], x0[None, :]] * (1 - dx) + arr[y1[:, None], x1[None, :]] * dx
    return top * (1 - dy) + bot * dy

if elev_file and os.path.exists(elev_file):
    print(f"[+] Loading Copernicus 30m DEM from {elev_file}...")
    raw_elev = np.load(elev_file)
    elev_grid = resample_2d(raw_elev, SEGS_Y + 1, SEGS_X + 1)
    min_e, max_e = np.min(elev_grid), np.max(elev_grid)
    elev_norm = (elev_grid - min_e) / (max_e - min_e + 1e-6)
    elev_scaled = (elev_norm - 0.45) * 32.0
else:
    print("[-] Elevation file not found, synthesizing mountain canyon...")
    elev_scaled = np.zeros((SEGS_Y + 1, SEGS_X + 1))
    for j in range(SEGS_Y + 1):
        y_val = -GRID_SIZE / 2 + j * (GRID_SIZE / SEGS_Y)
        for i in range(SEGS_X + 1):
            x_val = -GRID_SIZE / 2 + i * (GRID_SIZE / SEGS_X)
            dist_c = abs(y_val + 8.0 * math.sin(x_val * 0.028))
            river = -7.5 * math.exp(-0.5 * (dist_c / 14.0)**2)
            canyon = 0.09 * (dist_c ** 1.32)
            terraces = 2.8 * math.sin(dist_c * 0.20)
            elev_scaled[j, i] = river + canyon + terraces

# Carve Mandakini River Bed
for j in range(SEGS_Y + 1):
    y_val = -GRID_SIZE / 2 + j * (GRID_SIZE / SEGS_Y)
    for i in range(SEGS_X + 1):
        x_val = -GRID_SIZE / 2 + i * (GRID_SIZE / SEGS_X)
        dist_river = abs(y_val + 9.0 * math.sin(x_val * 0.025))
        canyon_dip = -6.5 * math.exp(-0.5 * (dist_river / 16.0)**2)
        elev_scaled[j, i] = min(elev_scaled[j, i], elev_scaled[j, i] + canyon_dip)

mesh_terrain = bpy.data.meshes.new("Copernicus_Himalayan_Valley")
obj_terrain = bpy.data.objects.new("Himalayan_Disaster_Valley", mesh_terrain)
scene.collection.objects.link(obj_terrain)

bm = bmesh.new()
uv_layer = bm.loops.layers.uv.new("UVMap")

for j in range(SEGS_Y + 1):
    y = -GRID_SIZE / 2 + j * (GRID_SIZE / SEGS_Y)
    for i in range(SEGS_X + 1):
        x = -GRID_SIZE / 2 + i * (GRID_SIZE / SEGS_X)
        z = float(elev_scaled[j, i])
        bm.verts.new((x, y, z))

bm.verts.ensure_lookup_table()

for j in range(SEGS_Y):
    for i in range(SEGS_X):
        v1 = bm.verts[j * (SEGS_X + 1) + i]
        v2 = bm.verts[j * (SEGS_X + 1) + i + 1]
        v3 = bm.verts[(j + 1) * (SEGS_X + 1) + i + 1]
        v4 = bm.verts[(j + 1) * (SEGS_X + 1) + i]
        f = bm.faces.new((v1, v2, v3, v4))
        f.loops[0][uv_layer].uv = (i / SEGS_X, j / SEGS_Y)
        f.loops[1][uv_layer].uv = ((i + 1) / SEGS_X, j / SEGS_Y)
        f.loops[2][uv_layer].uv = ((i + 1) / SEGS_X, (j + 1) / SEGS_Y)
        f.loops[3][uv_layer].uv = (i / SEGS_X, (j + 1) / SEGS_Y)

for f in bm.faces:
    f.smooth = True

bm.to_mesh(mesh_terrain)
bm.free()

# Setup Photoreal Terrain Shader
mat_terrain = bpy.data.materials.new(name="Terrain_Satellite_PBR")
mat_terrain.use_nodes = True
tnodes = mat_terrain.node_tree.nodes
tlinks = mat_terrain.node_tree.links
tbsdf = tnodes.get("Principled BSDF")

if ortho_path and os.path.exists(ortho_path):
    try:
        ortho_img = bpy.data.images.load(ortho_path)
        t_ortho = tnodes.new('ShaderNodeTexImage')
        t_ortho.image = ortho_img
        tlinks.new(t_ortho.outputs['Color'], tbsdf.inputs['Base Color'])
        print(f"[+] Loaded Satellite Ortho Texture: {ortho_path}")
    except Exception as e:
        tbsdf.inputs['Base Color'].default_value = (0.35, 0.32, 0.28, 1.0)
else:
    tbsdf.inputs['Base Color'].default_value = (0.35, 0.32, 0.28, 1.0)

tbsdf.inputs['Roughness'].default_value = 0.85
if norm_gl_path and os.path.exists(norm_gl_path):
    try:
        norm_img = bpy.data.images.load(norm_gl_path)
        norm_img.colorspace_settings.name = 'Non-Color'
        t_norm = tnodes.new('ShaderNodeTexImage')
        t_norm.image = norm_img
        t_coord = tnodes.new('ShaderNodeTexCoord')
        t_map = tnodes.new('ShaderNodeMapping')
        t_map.inputs['Scale'].default_value = (24.0, 24.0, 1.0)
        tlinks.new(t_coord.outputs['UV'], t_map.inputs['Vector'])
        tlinks.new(t_map.outputs['Vector'], t_norm.inputs['Vector'])
        n_node = tnodes.new('ShaderNodeNormalMap')
        n_node.inputs['Strength'].default_value = 0.95
        tlinks.new(t_norm.outputs['Color'], n_node.inputs['Color'])
        tlinks.new(n_node.outputs['Normal'], tbsdf.inputs['Normal'])
    except Exception as e:
        pass

mesh_terrain.materials.append(mat_terrain)

# ----------------------------------------------------------------------
# 6. Dynamic Floodwater Surface Plane
# ----------------------------------------------------------------------
print("[*] Generating Turbulent Floodwater Plane...")
FLOOD_WATER_LEVEL = 2.40

bpy.ops.mesh.primitive_plane_add(size=250.0, location=(0, 0, FLOOD_WATER_LEVEL))
obj_water = bpy.context.active_object
obj_water.name = "Mandakini_Torrent_Floodwater"
obj_water.data.materials.append(mat_floodwater)

# ----------------------------------------------------------------------
# 7. Authentic Himalayan Kath-Kuni Architecture & Ruins
# ----------------------------------------------------------------------
print("[*] Constructing Himalayan Kath-Kuni Village & Mudslide Ruins...")

house_tex_path = get_asset_file("01_himalayan_house.png")
mat_house_wall = mat_granite
if house_tex_path and os.path.exists(house_tex_path):
    mat_house_wall = bpy.data.materials.new(name="KathKuni_Photo_Texture")
    mat_house_wall.use_nodes = True
    h_nodes = mat_house_wall.node_tree.nodes
    h_links = mat_house_wall.node_tree.links
    h_bsdf = h_nodes.get("Principled BSDF")
    try:
        h_img = bpy.data.images.load(house_tex_path)
        h_tex = h_nodes.new('ShaderNodeTexImage')
        h_tex.image = h_img
        h_links.new(h_tex.outputs['Color'], h_bsdf.inputs['Base Color'])
    except:
        pass
    h_bsdf.inputs['Roughness'].default_value = 0.75

settlement_nodes = [
    {"loc": (-25.0, 18.0, 4.2), "scale": (9.0, 7.5, 5.5), "rot": 0.12, "state": "intact"},
    {"loc": (-8.0, 15.0, 3.1), "scale": (10.0, 8.0, 6.0), "rot": -0.18, "state": "survivor_base"},
    {"loc": (14.0, 19.0, 4.5), "scale": (8.5, 7.0, 5.0), "rot": 0.25, "state": "intact"},
    {"loc": (36.0, 22.0, 5.8), "scale": (9.5, 7.5, 5.2), "rot": -0.08, "state": "intact"},
    {"loc": (-45.0, 24.0, 6.5), "scale": (8.0, 6.5, 4.8), "rot": 0.30, "state": "intact"},
    {"loc": (-18.0, -18.0, 3.4), "scale": (8.8, 7.2, 5.0), "rot": -0.15, "state": "partially_submerged"},
    {"loc": (5.0, -22.0, 4.0), "scale": (9.2, 7.8, 5.4), "rot": 0.10, "state": "intact"},
    {"loc": (28.0, -25.0, 5.2), "scale": (8.5, 7.0, 4.9), "rot": -0.22, "state": "intact"},
    {"loc": (-2.0, 8.0, 2.6), "scale": (7.5, 6.0, 3.2), "rot": 0.45, "state": "collapsed_ruin"},
    {"loc": (18.0, -12.0, 2.5), "scale": (8.0, 6.5, 2.8), "rot": -0.35, "state": "collapsed_ruin"},
]

for idx, b in enumerate(settlement_nodes):
    bx, by, bz = b["loc"]
    sx, sy, sz = b["scale"]
    rot_z = b["rot"]
    state = b["state"]
    
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(bx, by, bz + sz * 0.5))
    house = bpy.context.active_object
    house.name = f"KathKuni_Building_{idx+1}"
    house.scale = (sx, sy, sz)
    house.rotation_euler[2] = rot_z
    house.data.materials.append(mat_house_wall)
    
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(bx, by, bz + sz * 0.85))
    balcony = bpy.context.active_object
    balcony.name = f"Building_{idx+1}_Balcony"
    balcony.scale = (sx * 1.08, sy * 1.08, 0.7)
    balcony.rotation_euler[2] = rot_z
    balcony.data.materials.append(mat_timber)
    
    if state != "collapsed_ruin":
        bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=sx * 0.78, depth=2.4, location=(bx, by, bz + sz + 1.2))
        roof = bpy.context.active_object
        roof.name = f"Building_{idx+1}_SlateRoof"
        roof.scale = (1.0, sy / sx, 1.0)
        roof.rotation_euler[2] = rot_z + math.radians(45)
        roof.data.materials.append(mat_slate)
    else:
        for f_idx in range(6):
            rx = bx + random.uniform(-sx * 0.5, sx * 0.5)
            ry = by + random.uniform(-sy * 0.5, sy * 0.5)
            rz = bz + random.uniform(0.2, 1.4)
            bpy.ops.mesh.primitive_cylinder_add(radius=0.18, depth=random.uniform(2.5, 5.0), location=(rx, ry, rz))
            beam = bpy.context.active_object
            beam.name = f"Ruin_{idx+1}_FallenBeam_{f_idx+1}"
            beam.rotation_euler = (random.uniform(-0.5, 0.5), random.uniform(-0.8, 0.8), random.uniform(-3.14, 3.14))
            beam.data.materials.append(mat_timber)

# ----------------------------------------------------------------------
# 8. Breached Mountain Highway & Landslide Debris Fan
# ----------------------------------------------------------------------
print("[*] Adding Breached Mountain Highway & Mudslide Debris...")

bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, -11.0, 3.25))
road = bpy.context.active_object
road.name = "Himalayan_Highway_Breached_Section"
road.scale = (140.0, 5.2, 0.35)
road.data.materials.append(mat_asphalt)

for b_idx in range(16):
    bx = 4.0 + random.uniform(-18.0, 18.0)
    by = -11.0 + random.uniform(-4.5, 4.5)
    bz = 3.5 + random.uniform(0.0, 0.8)
    r_size = random.uniform(0.7, 2.2)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r_size, location=(bx, by, bz))
    boulder = bpy.context.active_object
    boulder.name = f"Landslide_Boulder_{b_idx+1}"
    boulder.scale = (1.0, random.uniform(0.7, 1.3), random.uniform(0.5, 0.9))
    boulder.data.materials.append(mat_granite)

# ----------------------------------------------------------------------
# 9. Ground Truth SAR Target: Rooftop Survivors & SOS Emergency Tarp
# ----------------------------------------------------------------------
print("[*] Placing Ground Truth SAR Survivors & SOS Emergency Tarp...")

surv_roof_loc = (-8.0, 15.0, 9.12)

# Orange SOS Tarp
bpy.ops.mesh.primitive_plane_add(size=4.5, location=(surv_roof_loc[0], surv_roof_loc[1], surv_roof_loc[2] + 0.05))
tarp = bpy.context.active_object
tarp.name = "SOS_Emergency_Rescue_Tarp"
tarp.scale = (1.2, 0.9, 1.0)
tarp.data.materials.append(mat_tarp)

# White SOS Marker
def add_sos_marker(parent_loc):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(parent_loc[0] - 1.4, parent_loc[1], parent_loc[2] + 0.08))
    s1 = bpy.context.active_object
    s1.name = "SOS_Letter_S1"
    s1.scale = (0.7, 1.6, 0.05)
    s1.data.materials.append(mat_white)
    
    bpy.ops.mesh.primitive_cylinder_add(radius=0.7, depth=0.05, location=(parent_loc[0], parent_loc[1], parent_loc[2] + 0.08))
    o = bpy.context.active_object
    o.name = "SOS_Letter_O"
    o.data.materials.append(mat_white)
    
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(parent_loc[0] + 1.4, parent_loc[1], parent_loc[2] + 0.08))
    s2 = bpy.context.active_object
    s2.name = "SOS_Letter_S2"
    s2.scale = (0.7, 1.6, 0.05)
    s2.data.materials.append(mat_white)

add_sos_marker(surv_roof_loc)

# Survivors
survivor_offsets = [(-1.2, -0.8), (1.1, -0.7), (-0.9, 1.0), (1.2, 0.9)]
for s_idx, (ox, oy) in enumerate(survivor_offsets):
    sx = surv_roof_loc[0] + ox
    sy = surv_roof_loc[1] + oy
    sz = surv_roof_loc[2] + 0.85
    bpy.ops.mesh.primitive_cylinder_add(radius=0.24, depth=1.45, location=(sx, sy, sz))
    surv_body = bpy.context.active_object
    surv_body.name = f"SAR_Survivor_{s_idx+1}_Body"
    surv_body.data.materials.append(mat_orange_sar)
    
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.15, location=(sx, sy, sz + 0.85))
    surv_head = bpy.context.active_object
    surv_head.name = f"SAR_Survivor_{s_idx+1}_Head"
    surv_head.data.materials.append(mat_timber)

# ----------------------------------------------------------------------
# 10. NDRF Search & Rescue Boat & River Driftwood
# ----------------------------------------------------------------------
print("[*] Placing NDRF Swift-Water Rescue Vessel & River Debris...")

bpy.ops.mesh.primitive_torus_add(major_radius=2.6, minor_radius=0.55, location=(10.0, -4.0, FLOOD_WATER_LEVEL + 0.25))
dinghy = bpy.context.active_object
dinghy.name = "NDRF_Search_and_Rescue_Boat"
dinghy.scale = (1.0, 0.62, 0.68)
dinghy.rotation_euler = (math.radians(3.0), math.radians(-2.0), math.radians(32.0))
dinghy.data.materials.append(mat_orange_sar)

bpy.ops.mesh.primitive_cube_add(size=1.0, location=(10.0, -4.0, FLOOD_WATER_LEVEL + 0.05))
b_floor = bpy.context.active_object
b_floor.name = "NDRF_Boat_Deck"
b_floor.scale = (4.2, 1.8, 0.15)
b_floor.rotation_euler[2] = math.radians(32.0)
b_floor.data.materials.append(mat_slate)

bpy.ops.mesh.primitive_cube_add(size=1.0, location=(12.2, -2.6, FLOOD_WATER_LEVEL + 0.6))
motor = bpy.context.active_object
motor.name = "NDRF_Outboard_Engine"
motor.scale = (0.5, 0.6, 0.9)
motor.rotation_euler[2] = math.radians(32.0)
motor.data.materials.append(mat_slate)

for l_idx in range(10):
    lx = random.uniform(-45.0, 45.0)
    ly = random.uniform(-7.0, 7.0)
    lz = FLOOD_WATER_LEVEL + 0.12
    l_len = random.uniform(3.5, 7.0)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.22, depth=l_len, location=(lx, ly, lz))
    log_obj = bpy.context.active_object
    log_obj.name = f"River_Driftwood_Log_{l_idx+1}"
    log_obj.rotation_euler = (math.radians(90.0), 0.0, random.uniform(-0.5, 0.5))
    log_obj.data.materials.append(mat_timber)

# ----------------------------------------------------------------------
# 11. CLEAN AIRSPACE INVARIANT VERIFICATION
# ----------------------------------------------------------------------
airspace_violators = [o for o in scene.objects if "drone" in o.name.lower() or "swarm" in o.name.lower() or "frustum" in o.name.lower() or ("cone" in o.name.lower() and "roof" not in o.name.lower())]
for v in airspace_violators:
    bpy.data.objects.remove(v, do_unlink=True)
print(f"[+] Clean Airspace Invariant Verified: Removed {len(airspace_violators)} aerial objects. Airspace 100% open for simulation.")

# ----------------------------------------------------------------------
# 12. Master Reconnaissance Cameras & Cycles Rendering
# ----------------------------------------------------------------------
print("[*] Configuring 4 Master Reconnaissance Viewpoints...")

cameras = [
    {
        "name": "CAM_HERO_OVERVIEW",
        "loc": (-52.0, -42.0, 42.0),
        "rot": (math.radians(58.0), 0.0, math.radians(-48.0)),
        "focal": 35.0,
        "out": os.path.join(OUT_DIR, "sutra_kaggle_overview.png"),
        "alt_out": os.path.join(OUT_DIR, "sutra_kaggle_world_overview.png")
    },
    {
        "name": "CAM_RESCUE_FOCUS",
        "loc": (-4.0, 6.0, 16.5),
        "rot": (math.radians(38.0), 0.0, math.radians(-32.0)),
        "focal": 52.0,
        "out": os.path.join(OUT_DIR, "sutra_kaggle_rescue_focus.png"),
        "alt_out": os.path.join(OUT_DIR, "sutra_kaggle_world_rescue_focus.png")
    },
    {
        "name": "CAM_NDRF_GROUND",
        "loc": (18.0, -12.0, 4.8),
        "rot": (math.radians(76.0), 0.0, math.radians(45.0)),
        "focal": 32.0,
        "out": os.path.join(OUT_DIR, "sutra_kaggle_ndrf_ground.png"),
        "alt_out": os.path.join(OUT_DIR, "sutra_kaggle_world_ndrf_ground.png")
    },
    {
        "name": "CAM_GIS_ORTHO",
        "loc": (0.0, 0.0, 115.0),
        "rot": (0.0, 0.0, 0.0),
        "focal": 50.0,
        "out": os.path.join(OUT_DIR, "sutra_kaggle_gis_ortho.png"),
        "alt_out": os.path.join(OUT_DIR, "sutra_kaggle_world_gis_ortho.png")
    }
]

scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100

render_times = {}

for cam_info in cameras:
    cam_data = bpy.data.cameras.new(cam_info["name"])
    cam_data.lens = cam_info["focal"]
    cam_data.clip_end = 500.0
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
    print(f"  [+] Rendered {cam_info['name']} in {dt:.2f}s")
    
    # Save duplicate with alternative name
    try:
        shutil.copyfile(cam_info["out"], cam_info["alt_out"])
    except:
        pass

# ----------------------------------------------------------------------
# 13. Save Master 3D Scene & SimReady Exports
# ----------------------------------------------------------------------
print("[*] Saving Master Photorealistic 3D Scene & SimReady Exports...")

try:
    bpy.ops.file.pack_all()
    print("[+] Successfully packed all PBR textures into .blend file!")
except Exception as e:
    print(f"[-] Pack note: {e}")

blend_out = os.path.join(OUT_DIR, "sutra_master_kaggle_disaster_world.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_out)
print(f"[+] Saved Blender Master Scene: {blend_out} ({os.path.getsize(blend_out)/(1024**2):.2f} MB)")

try:
    usd_out = os.path.join(OUT_DIR, "sutra_master_kaggle_disaster_world.usdc")
    bpy.ops.wm.usd_export(filepath=usd_out, export_materials=True)
    print(f"[+] Exported NVIDIA Isaac Sim USD: {usd_out} ({os.path.getsize(usd_out)/(1024**2):.2f} MB)")
except Exception as e:
    print(f"[-] Isaac Sim USD note: {e}")

total_verts = sum(len(o.data.vertices) for o in scene.objects if o.type == 'MESH')
total_faces = sum(len(o.data.polygons) for o in scene.objects if o.type == 'MESH')
total_objs = len(scene.objects)

benchmarks = {
    "world_name": "SUTRA_Copernicus_Himalayan_Disaster_World",
    "description": "Geographically authentic Kedarnath flood valley with Copernicus 30m DEM, Kath-Kuni architecture, turbulent floodwater, and clean airspace.",
    "samples_per_pixel": scene.cycles.samples,
    "denoiser": scene.cycles.denoiser,
    "total_objects": total_objs,
    "total_vertices": total_verts,
    "total_faces": total_faces,
    "render_times_seconds": render_times
}

bench_path = os.path.join(OUT_DIR, "BENCHMARKS.json")
with open(bench_path, "w") as f:
    json.dump(benchmarks, f, indent=2)

print("=" * 80)
print(f"  SUTRA MASTER WORLD GENERATION COMPLETE | {total_verts:,} Verts | {total_faces:,} Faces")
print("=" * 80)
