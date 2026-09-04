#!/usr/bin/env python3
"""
================================================================================
PROJECT SUTRA — MASTER PHOTOREALISTIC HIMALAYAN DISASTER WORLD
================================================================================
"""

import os
import sys
import math
import time
import json
import bpy

BLEND_IN = "/home/nikhil/Desktop/3D world/submerged_village_flood_world.blend"
OUT_DIR = "/home/nikhil/Desktop/Project SUTRA/docs/media"
os.makedirs(OUT_DIR, exist_ok=True)

print(f"[*] Loading Photogrammetric Master Scene: {BLEND_IN}...")
bpy.ops.wm.open_mainfile(filepath=BLEND_IN)
scene = bpy.context.scene

# 1. Clean Airspace Invariant: Purge ANY cones, frustums, or drones
for o in list(scene.objects):
    name_lower = o.name.lower()
    if any(k in name_lower for k in ["drone", "swarm", "frustum", "sensor_cone", "camera_cone"]) or ("cone" in name_lower and "roof" not in name_lower):
        bpy.data.objects.remove(o, do_unlink=True)

# Remove all unrealistic T-pose floating mannequins from the water
for o in list(scene.objects):
    if any(k in o.name.lower() for k in ["drowning", "floating_victim", "wading_survivor", "clinging", "man"]):
        bpy.data.objects.remove(o, do_unlink=True)

print("[+] Airspace and water surface purged of placeholder mannequins.")

# 2. Configure Cycles GPU (OptiX / CUDA)
scene.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
for dev_type in ['OPTIX', 'CUDA']:
    try:
        prefs.compute_device_type = dev_type
        prefs.get_devices()
        usable = [d for d in prefs.devices if d.type == dev_type]
        if usable:
            for d in prefs.devices:
                d.use = (d.type == dev_type)
            print(f"[+] Cycles GPU using {dev_type}: {[d.name for d in usable]}")
            break
    except Exception as e:
        pass

scene.cycles.device = 'GPU'
scene.cycles.samples = 128
scene.cycles.use_denoising = True
scene.cycles.denoiser = 'OPENIMAGEDENOISE'

# 3. Atmospheric Physical Sky & Soft Sun
world = bpy.data.worlds.new("SUTRA_Himalayan_Physical_Sky")
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

w_sky.sun_elevation = math.radians(24.0)
w_sky.sun_rotation = math.radians(70.0)
w_sky.altitude = 2200.0
w_sky.air_density = 1.05
if hasattr(w_sky, 'dust_density'):
    w_sky.dust_density = 1.2
elif hasattr(w_sky, 'aerosol_density'):
    w_sky.aerosol_density = 1.2
w_sky.ozone_density = 2.0

w_bg = wnodes.new('ShaderNodeBackground')
w_bg.inputs['Strength'].default_value = 1.0
wlinks.new(w_sky.outputs['Color'], w_bg.inputs['Color'])
wlinks.new(w_bg.outputs['Background'], w_out.inputs['Surface'])

# Direct Sunlight Lamp
for o in list(scene.objects):
    if o.type == 'LIGHT':
        bpy.data.objects.remove(o, do_unlink=True)

sun_data = bpy.data.lights.new(name="Monsoon_Sun", type='SUN')
sun_data.energy = 3.8
sun_data.angle = math.radians(8.0)
sun_data.color = (1.0, 0.97, 0.92)
sun_obj = bpy.data.objects.new(name="Monsoon_Sun", object_data=sun_data)
scene.collection.objects.link(sun_obj)
sun_obj.rotation_euler = (math.radians(52), math.radians(16), math.radians(-42))

# 4. Realistic Murky Floodwater (Opaque silt + wave ripple)
water_obj = scene.objects.get("FloodWater_Surface")
if water_obj:
    mat_water = bpy.data.materials.new(name="SUTRA_Murky_Floodwater_PBR")
    mat_water.use_nodes = True
    fwnodes = mat_water.node_tree.nodes
    fwlinks = mat_water.node_tree.links
    fwnodes.clear()

    fw_out = fwnodes.new('ShaderNodeOutputMaterial')
    fw_bsdf = fwnodes.new('ShaderNodeBsdfPrincipled')
    # Natural muddy river color
    fw_bsdf.inputs['Base Color'].default_value = (0.24, 0.22, 0.18, 1.0)
    fw_bsdf.inputs['Roughness'].default_value = 0.18
    if 'Specular IOR Level' in fw_bsdf.inputs:
        fw_bsdf.inputs['Specular IOR Level'].default_value = 0.65
    elif 'Specular' in fw_bsdf.inputs:
        fw_bsdf.inputs['Specular'].default_value = 0.65
    if 'Transmission Weight' in fw_bsdf.inputs:
        fw_bsdf.inputs['Transmission Weight'].default_value = 0.0
    elif 'Transmission' in fw_bsdf.inputs:
        fw_bsdf.inputs['Transmission'].default_value = 0.0

    # Natural wave ripples
    fw_tex = fwnodes.new('ShaderNodeTexWave')
    fw_tex.inputs['Scale'].default_value = 4.5
    fw_tex.inputs['Distortion'].default_value = 5.0
    fw_bump = fwnodes.new('ShaderNodeBump')
    fw_bump.inputs['Strength'].default_value = 0.14
    fwlinks.new(fw_tex.outputs['Color'], fw_bump.inputs['Height'])
    fwlinks.new(fw_bump.outputs['Normal'], fw_bsdf.inputs['Normal'])
    fwlinks.new(fw_bsdf.outputs['BSDF'], fw_out.inputs['Surface'])

    water_obj.data.materials.clear()
    water_obj.data.materials.append(mat_water)

# 5. International Orange SOS Emergency Tarp on Main Mansion Rooftop
survivor_base = scene.objects.get("Rooftop_Survivor_Mansion")
if survivor_base:
    s_loc = survivor_base.location
    print(f"[+] Placing SOS Emergency Tarp on {survivor_base.name} at {s_loc}...")
    
    mat_tarp = bpy.data.materials.new(name="NDRF_Orange_Tarp")
    mat_tarp.use_nodes = True
    mat_tarp.node_tree.nodes.get("Principled BSDF").inputs['Base Color'].default_value = (1.0, 0.28, 0.0, 1.0)
    mat_tarp.node_tree.nodes.get("Principled BSDF").inputs['Roughness'].default_value = 0.35
    
    mat_white = bpy.data.materials.new(name="SOS_White_Text")
    mat_white.use_nodes = True
    mat_white.node_tree.nodes.get("Principled BSDF").inputs['Base Color'].default_value = (0.95, 0.95, 0.95, 1.0)
    
    # Tarp plane
    bpy.ops.mesh.primitive_plane_add(size=4.5, location=(s_loc.x, s_loc.y, s_loc.z + 0.15))
    tarp = bpy.context.active_object
    tarp.name = "SOS_Emergency_Rescue_Tarp"
    tarp.scale = (1.2, 0.9, 1.0)
    tarp.data.materials.append(mat_tarp)
    
    # S1
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(s_loc.x - 1.3, s_loc.y, s_loc.z + 0.22))
    s1 = bpy.context.active_object
    s1.name = "SOS_S1"
    s1.scale = (0.6, 1.5, 0.05)
    s1.data.materials.append(mat_white)
    # O
    bpy.ops.mesh.primitive_cylinder_add(radius=0.65, depth=0.05, location=(s_loc.x, s_loc.y, s_loc.z + 0.22))
    o = bpy.context.active_object
    o.name = "SOS_O"
    o.data.materials.append(mat_white)
    # S2
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(s_loc.x + 1.3, s_loc.y, s_loc.z + 0.22))
    s2 = bpy.context.active_object
    s2.name = "SOS_S2"
    s2.scale = (0.6, 1.5, 0.05)
    s2.data.materials.append(mat_white)

# 6. NDRF Swift-Water Rescue Vessel in River Current
mat_orange = bpy.data.materials.new(name="NDRF_HiVis_Orange")
mat_orange.use_nodes = True
mat_orange.node_tree.nodes.get("Principled BSDF").inputs['Base Color'].default_value = (1.0, 0.32, 0.02, 1.0)

mat_dark = bpy.data.materials.new(name="NDRF_Dark_Trim")
mat_dark.use_nodes = True
mat_dark.node_tree.nodes.get("Principled BSDF").inputs['Base Color'].default_value = (0.12, 0.12, 0.14, 1.0)

b_x, b_y, b_z = 24.0, 2.0, 38.05
bpy.ops.mesh.primitive_torus_add(major_radius=2.6, minor_radius=0.55, location=(b_x, b_y, b_z))
dinghy = bpy.context.active_object
dinghy.name = "NDRF_Search_and_Rescue_Boat"
dinghy.scale = (1.0, 0.62, 0.68)
dinghy.rotation_euler = (math.radians(3.0), math.radians(-2.0), math.radians(28.0))
dinghy.data.materials.append(mat_orange)

bpy.ops.mesh.primitive_cube_add(size=1.0, location=(b_x, b_y, b_z - 0.15))
deck = bpy.context.active_object
deck.name = "NDRF_Boat_Deck"
deck.scale = (4.2, 1.8, 0.15)
deck.rotation_euler[2] = math.radians(28.0)
deck.data.materials.append(mat_dark)

# 7. 4 Master Reconnaissance Camera Views
for o in list(scene.objects):
    if o.type == 'CAMERA':
        bpy.data.objects.remove(o, do_unlink=True)

cameras = [
    {
        "name": "CAM_HERO_OVERVIEW",
        "loc": (18.0, -22.0, 45.3),
        "rot": (1.4759, 0.0, -0.1060),
        "focal": 26.0,
        "out": os.path.join(OUT_DIR, "sutra_photoreal_overview.png")
    },
    {
        "name": "CAM_RESCUE_FOCUS",
        "loc": (20.5, 19.5, 46.0),
        "rot": (math.radians(55.0), 0.0, math.radians(0.0)),
        "focal": 45.0,
        "out": os.path.join(OUT_DIR, "sutra_photoreal_rescue_focus.png")
    },
    {
        "name": "CAM_NDRF_GROUND",
        "loc": (29.0, -4.0, 39.5),
        "rot": (math.radians(82.0), 0.0, math.radians(-48.0)),
        "focal": 32.0,
        "out": os.path.join(OUT_DIR, "sutra_photoreal_ndrf_ground.png")
    },
    {
        "name": "CAM_GIS_ORTHO",
        "loc": (25.0, 25.0, 115.0),
        "rot": (0.0, 0.0, 0.0),
        "focal": 50.0,
        "out": os.path.join(OUT_DIR, "sutra_photoreal_gis_ortho.png")
    }
]

scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100

render_times = {}

for cam_info in cameras:
    cam_data = bpy.data.cameras.new(cam_info["name"])
    cam_data.lens = cam_info["focal"]
    cam_data.clip_end = 1000.0
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

# 8. Save Upgraded Master World
blend_out = "/home/nikhil/Desktop/3D world/sutra_photoreal_master_world.blend"
bpy.ops.wm.save_as_mainfile(filepath=blend_out)
print(f"[+] Saved Master Photoreal World: {blend_out}")

total_verts = sum(len(o.data.vertices) for o in scene.objects if o.type == 'MESH')
total_faces = sum(len(o.data.polygons) for o in scene.objects if o.type == 'MESH')
total_objs = len(scene.objects)

benchmarks = {
    "world_name": "SUTRA_Photoreal_Himalayan_Disaster_World",
    "description": "1.5M vertex photogrammetric Himalayan hillside village with physical Nishita atmospheric lighting, opaque silt floodwater, and clean airspace.",
    "samples_per_pixel": scene.cycles.samples,
    "denoiser": scene.cycles.denoiser,
    "total_objects": total_objs,
    "total_vertices": total_verts,
    "total_faces": total_faces,
    "render_times_seconds": render_times
}

with open(os.path.join(OUT_DIR, "BENCHMARKS.json"), "w") as f:
    json.dump(benchmarks, f, indent=2)

print("=" * 80)
print(f"  PHOTOREAL WORLD COMPLETE | {total_verts:,} Vertices | {total_faces:,} Faces")
print("=" * 80)
