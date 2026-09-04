#!/usr/bin/env python3
"""
build_sutra_grand_finals_master_world.py
=============================================================================
Project SUTRA — Grand Finals Master Disaster Digital Twin
Smart Horizon 2026 Grand Finale | Track SH-DST-05 | Evaluation 2

Features:
  1. Photogrammetric 144MB Hillside Submerged Village (village_corse.glb)
  2. Dynamic Monsoon Floodwater Plane with Wave Bump & Turbidity at Z = 1.0m
  3. 5-UAV SUTRA Hexacopter Swarm (Hexa-X) using high-poly hexa_copter_ar-e800_drone.glb
  4. 3D Volumetric Sensor Cones (Translucent Glowing Amber FLIR & Cyan LiDAR)
  5. 17 Human Survivors in High-Visibility SAR Orange across 5 rescue clusters:
     - Cluster 1: Central Village Rooftop (5 survivors + Bright Orange SOS Tarp)
     - Cluster 2: Submerged Shoreline Terrace (4 survivors)
     - Cluster 3: Villa Balcony Refugees (3 survivors)
     - Cluster 4: Floating Debris / Water Victims (3 survivors in water)
     - Cluster 5: Upper Hillside Path (2 survivors)
  6. Deployed NDRF Rescue Boat navigating floodwaters toward survivors
  7. 4 Master Cinematic & Tactical Camera Angles (Overview, FLIR POV, Water POV, GIS Ortho)
  8. Cycles OptiX GPU Accelerated Rendering (Standard View Transform, Exposure 1.4)
  9. Multi-format export: .blend, 1080p renders, OpenUSD (.usdc) for Isaac Sim
=============================================================================
"""

import os
import sys
import math
import random
import bpy
import bmesh

random.seed(42)

# ── Paths ──────────────────────────────────────────────────────────────────────
PROJECT_ROOT  = "/home/nikhil/Desktop/Project SUTRA"
BASE_3D       = "/home/nikhil/Desktop/3D world"
USER_ASSETS   = os.path.join(BASE_3D, "assets", "user_downloads")
SKETCHFAB     = os.path.join(BASE_3D, "assets", "sketchfab")
GLB_VILLAGE   = "/home/nikhil/Downloads/village_corse.glb"
GLB_DRONE     = os.path.join(USER_ASSETS, "hexa_copter_ar-e800_drone.glb")
GLB_MAN       = os.path.join(USER_ASSETS, "man.glb")
GLB_LUMBER    = os.path.join(SKETCHFAB, "waste_construction_lumber.glb")

OUT_BLEND_3D  = os.path.join(BASE_3D, "sutra_hyperreal_monsoon_flood.blend")
OUT_BLEND_SIM = os.path.join(PROJECT_ROOT, "sutra_ws", "src", "sutra_sim", "assets", "submerged_village_flood_world.blend")
OUT_USD       = os.path.join(BASE_3D, "sutra_hyperreal_monsoon_flood.usdc")

# Stills output paths
OUT_OVERVIEW  = os.path.join(BASE_3D, "sutra_hyperreal_overview.png")
OUT_FLIR_POV  = os.path.join(BASE_3D, "sutra_hyperreal_flir_pov.png")
OUT_WATER_POV = os.path.join(BASE_3D, "sutra_hyperreal_ndrf_ground.png")
OUT_GIS_ORTHO = os.path.join(BASE_3D, "sutra_hyperreal_gis_ortho.png")

FLOOD_Z       = 1.00  # Flood water elevation matching village_corse water line


# ══════════════════════════════════════════════════════════════════════════════
#  1. SCENE PURGE & HARDWARE SETUP
# ══════════════════════════════════════════════════════════════════════════════

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.name = "SUTRA_Grand_Finals_Disaster_World"
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0
    scene.unit_settings.length_unit = 'METERS'

    # Configure Cycles Engine & GPU Acceleration
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    scene.cycles.preview_samples = 16

    # Configure OptiX / CUDA GPU devices
    cprefs = bpy.context.preferences.addons.get('cycles')
    if cprefs:
        cprefs = cprefs.preferences
        for dt in ('OPTIX', 'CUDA'):
            try:
                cprefs.compute_device_type = dt
                for d in cprefs.devices:
                    if 'CPU' in d.name:
                        d.use = False
                    else:
                        d.use = True
                scene.cycles.device = 'GPU'
                print(f"⚡ [GPU] Enabled {dt} acceleration on {cprefs.devices[0].name}")
                break
            except Exception:
                pass

    # Exposure settings for vibrant daylight
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.exposure = 1.4
    scene.view_settings.gamma = 1.0
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    print("✅ [SUTRA] Clean factory scene & GPU Cycles engine initialized.")


def build_atmosphere():
    scene = bpy.context.scene
    world = bpy.data.worlds.new("Monsoon_Disaster_Sky")
    world.use_nodes = True
    scene.world = world
    wn = world.node_tree.nodes
    wl = world.node_tree.links
    wn.clear()

    w_out = wn.new('ShaderNodeOutputWorld')
    w_bg = wn.new('ShaderNodeBackground')
    w_bg.inputs['Color'].default_value = (0.45, 0.62, 0.88, 1.0)  # Bright sky blue
    w_bg.inputs['Strength'].default_value = 4.5
    wl.new(w_bg.outputs['Background'], w_out.inputs['Surface'])

    # Key daylight sun
    sun_data = bpy.data.lights.new(name="Sun_Daylight", type='SUN')
    sun_data.energy = 22.0
    sun_data.color = (1.0, 0.98, 0.94)
    sun_data.angle = math.radians(2.5)
    sun_obj = bpy.data.objects.new("Sun_Daylight", sun_data)
    bpy.context.collection.objects.link(sun_obj)
    sun_obj.location = (0.0, 0.0, 120.0)
    sun_obj.rotation_euler = (math.radians(35.0), math.radians(15.0), math.radians(45.0))

    # Ambient Fill light
    fill_data = bpy.data.lights.new(name="Fill_Sky", type='SUN')
    fill_data.energy = 10.0
    fill_data.color = (0.82, 0.90, 1.0)
    fill_obj = bpy.data.objects.new("Fill_Sky", fill_data)
    bpy.context.collection.objects.link(fill_obj)
    fill_obj.location = (0.0, 0.0, 100.0)
    fill_obj.rotation_euler = (math.radians(60.0), 0.0, math.radians(-135.0))
    print("☀️ [SUTRA] Daylight lighting & atmospheric sky configured.")


# ══════════════════════════════════════════════════════════════════════════════
#  2. MASTER PHOTOGRAMMETRIC VILLAGE (village_corse.glb)
# ══════════════════════════════════════════════════════════════════════════════

def import_master_village():
    print("🏘️ [SUTRA] Loading Photogrammetric Master Village (village_corse.glb)...")
    if not os.path.exists(GLB_VILLAGE):
        print(f"⚠️ [WARN] {GLB_VILLAGE} missing!")
        return None

    before_objs = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=GLB_VILLAGE)
    new_objs = list(set(bpy.data.objects) - before_objs)

    # Scale and place village exactly as verified in submerged_village_flood_world
    for obj in new_objs:
        if obj.parent is None:
            obj.location = (0.0, 0.0, 0.0)
            obj.scale = (0.35, 0.35, 0.35)

    print(f"✅ [SUTRA] Photogrammetric Village imported: {len(new_objs)} objects at scale 0.35.")


# ══════════════════════════════════════════════════════════════════════════════
#  3. FLOODWATER SURFACE WITH DYNAMIC RIPPLES
# ══════════════════════════════════════════════════════════════════════════════

def build_flood_water():
    # 220m x 220m water grid at Z = FLOOD_Z
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=150, y_subdivisions=150, size=220.0, location=(0, 0, FLOOD_Z))
    water_obj = bpy.context.active_object
    water_obj.name = "Monsoon_Flood_Water_Surface"

    # Translucent realistic water shader
    mat_w = bpy.data.materials.new("PBR_Monsoon_Floodwater")
    mat_w.use_nodes = True
    wn = mat_w.node_tree.nodes
    wl = mat_w.node_tree.links
    wn.clear()

    out = wn.new('ShaderNodeOutputMaterial')
    bsdf = wn.new('ShaderNodeBsdfPrincipled')
    tc = wn.new('ShaderNodeTexCoord')
    map_node = wn.new('ShaderNodeMapping')
    noise = wn.new('ShaderNodeTexNoise')
    bump = wn.new('ShaderNodeBump')

    bsdf.inputs['Base Color'].default_value = (0.18, 0.42, 0.45, 0.85)
    bsdf.inputs['Roughness'].default_value = 0.05
    if 'Transmission Weight' in bsdf.inputs:
        bsdf.inputs['Transmission Weight'].default_value = 0.85
    for spec_key in ('Specular', 'Specular IOR Level'):
        if spec_key in bsdf.inputs:
            bsdf.inputs[spec_key].default_value = 0.45
            break

    noise.inputs['Scale'].default_value = 8.0
    noise.inputs['Detail'].default_value = 4.0
    bump.inputs['Strength'].default_value = 0.18
    bump.inputs['Distance'].default_value = 0.25

    wl.new(tc.outputs['Generated'], map_node.inputs['Vector'])
    wl.new(map_node.outputs['Vector'], noise.inputs['Vector'])
    wl.new(noise.outputs['Fac'], bump.inputs['Height'])
    wl.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    wl.new(bsdf.outputs['BSDF'], out.inputs['Surface'])

    water_obj.data.materials.append(mat_w)
    print("🌊 [SUTRA] Monsoon floodwater surface constructed at Z = 1.0m.")
    return water_obj


# ══════════════════════════════════════════════════════════════════════════════
#  4. SUTRA HEXACOPTER SWARM (Hexa-X) & SENSOR CONES
# ══════════════════════════════════════════════════════════════════════════════

def import_drone_template():
    if not os.path.exists(GLB_DRONE):
        print(f"⚠️ [WARN] {GLB_DRONE} not found!")
        return None

    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.import_scene.gltf(filepath=GLB_DRONE)
    imported = list(bpy.context.selected_objects)
    if not imported:
        return None

    meshes = [o for o in imported if o.type == 'MESH']
    dims = [max(m.dimensions) for m in meshes if max(m.dimensions) > 0]
    max_d = max(dims) if dims else 1.8
    target_dim = 1.4  # 1.4m hexacopter span
    sf = target_dim / max_d if max_d > 0 else 1.0

    root = bpy.data.objects.new("Hexacopter_Template", None)
    bpy.context.collection.objects.link(root)
    for o in imported:
        if o.parent is None:
            o.parent = root
            o.matrix_parent_inverse.identity()
    root.scale = (sf, sf, sf)
    root.location = (0, 0, -500)
    print(f"🚁 [TEMPLATE] SUTRA Hexacopter scaled to {target_dim}m span.")
    return root


def build_sensor_cone(location, target_z, radius=4.5, color_rgba=(1.0, 0.55, 0.05, 0.25),
                      label="Sensor_Cone"):
    me = bpy.data.meshes.new(f"{label}_Mesh")
    bm = bmesh.new()

    x, y, z_top = location
    dz = target_z - z_top
    apex = bm.verts.new((0.0, 0.0, 0.0))

    num_pts = 20
    bottom_verts = []
    for i in range(num_pts):
        ang = (2 * math.pi * i) / num_pts
        bx = radius * math.cos(ang)
        by = radius * math.sin(ang)
        bottom_verts.append(bm.verts.new((bx, by, dz)))

    for i in range(num_pts):
        v1 = bottom_verts[i]
        v2 = bottom_verts[(i + 1) % num_pts]
        bm.faces.new((apex, v1, v2))
    bm.to_mesh(me); bm.free()

    cone = bpy.data.objects.new(label, me)
    cone.location = location
    bpy.context.collection.objects.link(cone)

    mat = bpy.data.materials.new(f"{label}_Mat")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    out = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = color_rgba
    bsdf.inputs['Roughness'].default_value = 0.1
    if 'Transmission Weight' in bsdf.inputs:
        bsdf.inputs['Transmission Weight'].default_value = 0.85
    if 'Alpha' in bsdf.inputs:
        bsdf.inputs['Alpha'].default_value = 0.35
    for em_key in ('Emission Color', 'Emission'):
        if em_key in bsdf.inputs:
            bsdf.inputs[em_key].default_value = (color_rgba[0], color_rgba[1], color_rgba[2], 1.0)
            break
    if 'Emission Strength' in bsdf.inputs:
        bsdf.inputs['Emission Strength'].default_value = 2.5
    mat.node_tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    cone.data.materials.append(mat)
    return cone


def deploy_hexacopter_swarm(drone_tpl):
    # Tactical SAR formation hovering directly over the flooded village and survivor clusters
    SWARM = [
        # label,         x,     y,     z,   yaw, pitch, roll, cone_type, cone_rgba, target_z
        ("UAV_1_Alpha",  -6.0,  -2.0, 18.0,   25,    -5,    2, "FLIR",  (1.0, 0.45, 0.05, 0.25), 8.5),
        ("UAV_2_Beta",    6.0, -10.0, 19.5,   55,    -6,   -2, "LiDAR", (0.05, 0.85, 1.0, 0.22), FLOOD_Z),
        ("UAV_3_Gamma",   0.0, -20.0, 28.0,   15,    -2,    0, None,    None, None),
        ("UAV_4_Delta",  14.0,   4.0, 22.0,  -35,    -4,    3, "LiDAR", (0.05, 0.85, 1.0, 0.20), FLOOD_Z),
        ("UAV_5_Epsilon",-16.0,   8.0, 24.0,  105,    -5,   -1, "FLIR",  (1.0, 0.45, 0.05, 0.22), 10.0),
    ]

    for label, x, y, z, yaw, pitch, roll, ctype, crgba, tz in SWARM:
        inst = bpy.data.objects.new(f"SUTRA_{label}", None)
        bpy.context.collection.objects.link(inst)
        inst.location = (x, y, z)
        inst.rotation_euler = (math.radians(pitch), math.radians(roll), math.radians(yaw))
        if drone_tpl:
            inst.scale = drone_tpl.scale
            for child in drone_tpl.children_recursive:
                if child.type == 'MESH':
                    nc = child.copy()
                    bpy.context.collection.objects.link(nc)
                    nc.parent = inst
                    nc.matrix_parent_inverse = child.matrix_parent_inverse.copy()

        # Add 3D Volumetric Sensor Cone
        if ctype and crgba and tz is not None:
            build_sensor_cone(
                location=(x, y, z - 0.20),
                target_z=tz,
                radius=5.5 if ctype == "FLIR" else 7.5,
                color_rgba=crgba,
                label=f"SensorCone_{label}_{ctype}"
            )

    print(f"🚁 [SUTRA] 5-UAV Hexacopter Swarm deployed in formation with active 3D sensor cones.")


# ══════════════════════════════════════════════════════════════════════════════
#  5. 17 HUMAN SURVIVORS IN HIGH-VISIBILITY SAR ORANGE
# ══════════════════════════════════════════════════════════════════════════════

def make_sar_materials():
    mats = {}
    for name, rgb in [
        ("SAR_HighVis_Orange", (1.0, 0.30, 0.02)),
        ("SAR_HighVis_Red",    (0.95, 0.05, 0.05)),
        ("SAR_HighVis_Yellow", (1.0, 0.88, 0.05)),
    ]:
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        nodes = m.node_tree.nodes
        nodes.clear()
        out = nodes.new('ShaderNodeOutputMaterial')
        bsdf = nodes.new('ShaderNodeBsdfPrincipled')
        bsdf.inputs['Base Color'].default_value = (rgb[0], rgb[1], rgb[2], 1.0)
        bsdf.inputs['Roughness'].default_value = 0.3
        for em in ('Emission Color', 'Emission'):
            if em in bsdf.inputs:
                bsdf.inputs[em].default_value = (rgb[0], rgb[1], rgb[2], 1.0)
                break
        if 'Emission Strength' in bsdf.inputs:
            bsdf.inputs['Emission Strength'].default_value = 1.0
        m.node_tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
        mats[name] = m
    return mats


def import_man_template():
    if not os.path.exists(GLB_MAN):
        print(f"⚠️ [WARN] {GLB_MAN} not found!")
        return None

    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.import_scene.gltf(filepath=GLB_MAN)
    imported = list(bpy.context.selected_objects)
    if not imported:
        return None

    meshes = [o for o in imported if o.type == 'MESH']
    dims = [max(m.dimensions) for m in meshes if max(m.dimensions) > 0]
    max_d = max(dims) if dims else 1.75
    target_dim = 1.75
    sf = target_dim / max_d if max_d > 0 else 1.0

    root = bpy.data.objects.new("Survivor_Template", None)
    bpy.context.collection.objects.link(root)
    for o in imported:
        if o.parent is None:
            o.parent = root
            o.matrix_parent_inverse.identity()
    root.scale = (sf, sf, sf)
    root.location = (0, 0, -500)
    return root


def place_survivors(man_tpl, sar_mats):
    # ── Bright Orange Emergency "SOS" Tarp on Central Rooftop ────────────────
    me_tarp = bpy.data.meshes.new("SOS_Tarp_Mesh")
    bm_t = bmesh.new()
    tw, td = 5.0, 3.5
    v0 = bm_t.verts.new((-tw/2, -td/2, 8.52))
    v1 = bm_t.verts.new(( tw/2, -td/2, 8.52))
    v2 = bm_t.verts.new(( tw/2,  td/2, 8.52))
    v3 = bm_t.verts.new((-tw/2,  td/2, 8.52))
    bm_t.faces.new((v0, v1, v2, v3))
    bm_t.to_mesh(me_tarp); bm_t.free()

    sos_tarp = bpy.data.objects.new("SOS_Emergency_Tarp_C1", me_tarp)
    sos_tarp.location = (-6.0, -2.0, 0.0)
    sos_tarp.data.materials.append(sar_mats["SAR_HighVis_Orange"])
    bpy.context.collection.objects.link(sos_tarp)

    def spawn_survivor(loc, rot_euler, scale, label, mat):
        inst = bpy.data.objects.new(label, None)
        bpy.context.collection.objects.link(inst)
        inst.location = loc
        inst.rotation_euler = rot_euler
        if man_tpl:
            inst.scale = (man_tpl.scale[0] * scale, man_tpl.scale[1] * scale, man_tpl.scale[2] * scale)
            for child in man_tpl.children_recursive:
                if child.type == 'MESH':
                    nc = child.copy()
                    bpy.context.collection.objects.link(nc)
                    nc.parent = inst
                    nc.matrix_parent_inverse = child.matrix_parent_inverse.copy()
                    nc.data.materials.clear()
                    nc.data.materials.append(mat)
        return inst

    # Cluster 1: Central Village Rooftop (5 survivors on SOS tarp)
    c1_pts = [
        ((-7.2, -2.8, 8.55), (0, 0, math.radians(45)),   1.0, "C1_Survivor_Waving_1"),
        ((-5.0, -2.5, 8.55), (0, 0, math.radians(-30)),  1.0, "C1_Survivor_Signaling_2"),
        ((-6.5, -1.2, 8.55), (0, 0, math.radians(110)),  1.0, "C1_Survivor_Seated_3"),
        ((-4.8, -1.0, 8.55), (0, 0, math.radians(-80)),  0.8, "C1_Survivor_Child_4"),
        ((-6.0, -2.0, 8.55), (0, 0, math.radians(180)),  1.0, "C1_Survivor_Center_5"),
    ]
    for loc, rot, s, lbl in c1_pts:
        spawn_survivor(loc, rot, s, lbl, sar_mats["SAR_HighVis_Orange"])

    # Cluster 2: Submerged Shoreline Terrace (4 survivors)
    c2_pts = [
        ((-14.0, -10.0, 1.45), (0, 0, math.radians(25)),  1.0, "C2_Survivor_1"),
        ((-12.5,  -9.5, 1.45), (0, 0, math.radians(-45)), 1.0, "C2_Survivor_2"),
        ((-13.5,  -8.5, 1.45), (0, 0, math.radians(90)),  1.0, "C2_Survivor_3"),
        ((-11.8, -10.2, 1.45), (0, 0, math.radians(160)), 1.0, "C2_Survivor_4"),
    ]
    for loc, rot, s, lbl in c2_pts:
        spawn_survivor(loc, rot, s, lbl, sar_mats["SAR_HighVis_Yellow"])

    # Cluster 3: Villa Balcony Refugees (3 survivors)
    c3_pts = [
        ((4.5, 8.0, 6.20), (0, 0, math.radians(-15)), 1.0, "C3_Survivor_1"),
        ((5.8, 8.5, 6.20), (0, 0, math.radians(50)),  1.0, "C3_Survivor_2"),
        ((5.0, 9.2, 6.20), (0, 0, math.radians(130)), 1.0, "C3_Survivor_3"),
    ]
    for loc, rot, s, lbl in c3_pts:
        spawn_survivor(loc, rot, s, lbl, sar_mats["SAR_HighVis_Red"])

    # Cluster 4: Floating Debris / Water Victims (3 survivors in water)
    c4_pts = [
        ((-2.0, -14.0, FLOOD_Z + 0.15), (math.radians(70), 0, math.radians(45)),  1.0, "C4_Water_Victim_1"),
        (( 3.0, -16.0, FLOOD_Z + 0.10), (math.radians(-75), 0, math.radians(-30)), 1.0, "C4_Water_Victim_2"),
        ((-5.0, -18.0, FLOOD_Z + 0.12), (math.radians(65), 0, math.radians(120)), 1.0, "C4_Water_Victim_3"),
    ]
    for loc, rot, s, lbl in c4_pts:
        spawn_survivor(loc, rot, s, lbl, sar_mats["SAR_HighVis_Orange"])

    # Cluster 5: Upper Hillside Path (2 survivors)
    c5_pts = [
        ((12.0, 15.0, 12.40), (0, 0, math.radians(-60)), 1.0, "C5_Survivor_1"),
        ((13.5, 16.2, 12.40), (0, 0, math.radians(45)),  1.0, "C5_Survivor_2"),
    ]
    for loc, rot, s, lbl in c5_pts:
        spawn_survivor(loc, rot, s, lbl, sar_mats["SAR_HighVis_Yellow"])

    print("🧍 [SUTRA] Placed 17 human survivors in 5 rescue clusters with bright SAR attire & SOS tarp.")


# ══════════════════════════════════════════════════════════════════════════════
#  6. NDRF RESCUE CRAFT
# ══════════════════════════════════════════════════════════════════════════════

def place_rescue_craft():
    me = bpy.data.meshes.new("Rescue_Boat_Mesh")
    bm = bmesh.new()
    BW, BL, HH, TW = 1.8, 5.5, 0.65, 2.3
    HL = BL / 2.0
    bv = [
        bm.verts.new((-BW/2, -HL, 0.0)),
        bm.verts.new(( BW/2, -HL, 0.0)),
        bm.verts.new(( BW/2,  HL, 0.0)),
        bm.verts.new((-BW/2,  HL, 0.0)),
        bm.verts.new((-TW/2, -HL, HH)),
        bm.verts.new(( TW/2, -HL, HH)),
        bm.verts.new(( TW/2,  HL, HH)),
        bm.verts.new((-TW/2,  HL, HH)),
    ]
    for f in [
        (bv[0], bv[1], bv[2], bv[3]),
        (bv[0], bv[1], bv[5], bv[4]),
        (bv[1], bv[2], bv[6], bv[5]),
        (bv[2], bv[3], bv[7], bv[6]),
        (bv[3], bv[0], bv[4], bv[7]),
    ]:
        bm.faces.new(f)
    bm.to_mesh(me); bm.free()

    boat = bpy.data.objects.new("NDRF_Rescue_Dinghy", me)
    boat.location = (5.0, -10.0, FLOOD_Z + 0.05)
    boat.rotation_euler = (0, 0, math.radians(48))
    bpy.context.collection.objects.link(boat)

    mat_b = bpy.data.materials.new("NDRF_Rescue_Orange")
    mat_b.use_nodes = True
    nodes = mat_b.node_tree.nodes
    nodes.clear()
    out = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (0.95, 0.32, 0.04, 1.0)
    bsdf.inputs['Roughness'].default_value = 0.35
    mat_b.node_tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    boat.data.materials.append(mat_b)
    print("🚣 [SUTRA] NDRF rescue boat positioned in floodwater.")


# ══════════════════════════════════════════════════════════════════════════════
#  7. CAMERAS & RENDER SETUP
# ══════════════════════════════════════════════════════════════════════════════

def setup_cameras():
    # 1. Master Cinematic Overview Camera (Exact verified framing looking North-East towards village & swarm)
    c1_data = bpy.data.cameras.new("Cam_Overview_Data")
    c1_data.lens = 22.0
    c1_data.clip_end = 2500.0
    c1_obj = bpy.data.objects.new("Camera_Cinematic_Overview", c1_data)
    c1_obj.location = (-15.0, -28.0, 34.0)
    c1_obj.rotation_euler = (math.radians(56.0), math.radians(0.0), math.radians(-28.0))
    bpy.context.collection.objects.link(c1_obj)

    # 2. UAV-1 FLIR Gimbal POV (Pitched down looking directly at the orange SOS tarp)
    c2_data = bpy.data.cameras.new("Cam_FLIR_Data")
    c2_data.lens = 45.0
    c2_data.clip_end = 1000.0
    c2_obj = bpy.data.objects.new("Camera_UAV1_FLIR_POV", c2_data)
    c2_obj.location = (-6.0, -5.0, 18.0)
    c2_obj.rotation_euler = (math.radians(45.0), math.radians(0.0), math.radians(0.0))
    bpy.context.collection.objects.link(c2_obj)

    # 3. Water Level / Rescue Boat POV
    c3_data = bpy.data.cameras.new("Cam_Water_Data")
    c3_data.lens = 30.0
    c3_data.clip_end = 1500.0
    c3_obj = bpy.data.objects.new("Camera_Water_Rescue_POV", c3_data)
    c3_obj.location = (8.0, -14.0, 2.2)
    c3_obj.rotation_euler = (math.radians(78.0), math.radians(0.0), math.radians(-42.0))
    bpy.context.collection.objects.link(c3_obj)

    # 4. Tactical GIS Ortho
    c4_data = bpy.data.cameras.new("Cam_GIS_Data")
    c4_data.type = 'ORTHO'
    c4_data.ortho_scale = 130.0
    c4_data.clip_end = 1000.0
    c4_obj = bpy.data.objects.new("Camera_GIS_Tactical_Ortho", c4_data)
    c4_obj.location = (0.0, 10.0, 150.0)
    c4_obj.rotation_euler = (0, 0, 0)
    bpy.context.collection.objects.link(c4_obj)

    # Default scene camera
    bpy.context.scene.camera = c1_obj

    print("📷 [SUTRA] 4 Cameras rigged.")
    return {
        'overview': c1_obj,
        'flir_pov': c2_obj,
        'water_pov': c3_obj,
        'gis_ortho': c4_obj,
    }


def export_simulation_assets():
    if hasattr(bpy.ops.wm, 'usd_export'):
        try:
            bpy.ops.wm.usd_export(filepath=OUT_USD, selected_objects_only=False,
                                 export_materials=True, use_instancing=True)
            print(f"🌐 [SIM READY] OpenUSD Stage exported -> {OUT_USD}")
        except Exception as e:
            print(f"⚠️ [USD EXPORT] Note: {e}")


# ══════════════════════════════════════════════════════════════════════════════
#  8. MAIN EXECUTION PIPELINE
# ══════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 80)
    print("  PROJECT SUTRA — GRAND FINALS MASTER DISASTER DIGITAL TWIN")
    print("  Track SH-DST-05 | Evaluation 2 (Day 2 - 02:00 PM IST)")
    print("=" * 80)

    reset_scene()
    build_atmosphere()
    import_master_village()
    build_flood_water()

    drone_tpl = import_drone_template()
    deploy_hexacopter_swarm(drone_tpl)

    sar_mats = make_sar_materials()
    man_tpl = import_man_template()
    place_survivors(man_tpl, sar_mats)
    place_rescue_craft()

    cams = setup_cameras()

    # Save to both production blend locations with active camera set
    bpy.context.scene.camera = cams['overview']
    os.makedirs(os.path.dirname(OUT_BLEND_3D), exist_ok=True)
    os.makedirs(os.path.dirname(OUT_BLEND_SIM), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND_3D)
    bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND_SIM)
    print(f"💾 [SUTRA] Master World saved -> {OUT_BLEND_3D}")
    print(f"💾 [SUTRA] Sim World saved    -> {OUT_BLEND_SIM}")

    # Render Camera 1: Cinematic Overview
    print("\n📸 [RENDER 1/4] Rendering Cinematic Overview (Cycles OptiX)...")
    bpy.context.scene.camera = cams['overview']
    bpy.context.scene.render.filepath = OUT_OVERVIEW
    bpy.ops.render.render(write_still=True)
    print(f"✅ Render saved -> {OUT_OVERVIEW}")

    # Render Camera 2: UAV-1 FLIR Gimbal POV
    print("\n📸 [RENDER 2/4] Rendering UAV-1 FLIR POV (Cycles OptiX)...")
    bpy.context.scene.camera = cams['flir_pov']
    bpy.context.scene.render.filepath = OUT_FLIR_POV
    bpy.ops.render.render(write_still=True)
    print(f"✅ Render saved -> {OUT_FLIR_POV}")

    # Render Camera 3: Water Level Rescue POV
    print("\n📸 [RENDER 3/4] Rendering Water Rescue POV (Cycles OptiX)...")
    bpy.context.scene.camera = cams['water_pov']
    bpy.context.scene.render.filepath = OUT_WATER_POV
    bpy.ops.render.render(write_still=True)
    print(f"✅ Render saved -> {OUT_WATER_POV}")

    # Render Camera 4: Tactical GIS Ortho
    print("\n📸 [RENDER 4/4] Rendering Tactical GIS Ortho (Cycles OptiX)...")
    bpy.context.scene.camera = cams['gis_ortho']
    bpy.context.scene.render.filepath = OUT_GIS_ORTHO
    bpy.ops.render.render(write_still=True)
    print(f"✅ Render saved -> {OUT_GIS_ORTHO}")

    # Export OpenUSD for Isaac Sim
    print("\n🌐 Exporting NVIDIA Isaac Sim OpenUSD Stage...")
    export_simulation_assets()

    print("\n" + "=" * 80)
    print("  ✨ [COMPLETE] SUTRA GRAND FINALS DISASTER WORLD SUCCESSFULLY BUILT!")
    print("=" * 80)


if __name__ == "__main__":
    main()
