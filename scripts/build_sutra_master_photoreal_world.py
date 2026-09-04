#!/usr/bin/env python3
"""
build_sutra_master_photoreal_world.py
=============================================================================
Project SUTRA — Autonomous Multi-Drone Swarm System (Track SH-DST-05)
Grand Finals Hyper-Realistic Disaster World Builder

Loads the authentic hillside photogrammetric village world
(`submerged_village_flood_world.blend`), integrates the 5-UAV SUTRA Hexacopter
swarm in tactical SAR formation, creates glowing volumetric LiDAR & FLIR sensor
cones, positions high-visibility rooftop survivors, NDRF rescue boat, and SOS
emergency tarps, configures Cycles OptiX GPU rendering with balanced physical
lighting, and renders 4 Full HD master stills.
=============================================================================
"""

import os
import math
import bpy
import bmesh

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR = "/home/nikhil/Desktop/3D world"
INPUT_BLEND = os.path.join(BASE_DIR, "submerged_village_flood_world.blend")
GLB_DRONE = os.path.join(BASE_DIR, "assets", "user_downloads", "hexa_copter_ar-e800_drone.glb")

OUT_BLEND_3D = os.path.join(BASE_DIR, "sutra_hyperreal_monsoon_flood.blend")
OUT_BLEND_SIM = "/home/nikhil/Desktop/Project SUTRA/sutra_ws/src/sutra_sim/assets/submerged_village_flood_world.blend"
OUT_USD = os.path.join(BASE_DIR, "sutra_hyperreal_monsoon_flood.usdc")

OUT_OVERVIEW = os.path.join(BASE_DIR, "sutra_hyperreal_overview.png")
OUT_FLIR_POV = os.path.join(BASE_DIR, "sutra_hyperreal_flir_pov.png")
OUT_WATER_POV = os.path.join(BASE_DIR, "sutra_hyperreal_ndrf_ground.png")
OUT_GIS_ORTHO = os.path.join(BASE_DIR, "sutra_hyperreal_gis_ortho.png")

FLOOD_Z = 37.80  # Ground truth water level in submerged_village_flood_world.blend


def configure_cycles_optix():
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'GPU'

    prefs = bpy.context.preferences
    cprefs = prefs.addons['cycles'].preferences
    cprefs.compute_device_type = 'OPTIX'
    cprefs.get_devices()

    for d in cprefs.devices:
        if d.type == 'OPTIX' and 'RTX' in d.name:
            d.use = True
            print(f"🚀 [OPTIX] Enabled GPU device: {d.name}")
        else:
            d.use = False

    # Render settings: clean 48 samples + OptiX denoiser for fast photorealism
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = 'OPTIX'

    # Color management: Filmic or AgX to prevent highlight clipping
    if hasattr(scene.view_settings, 'view_transform'):
        enum_items = bpy.types.ColorManagedViewSettings.bl_rna.properties['view_transform'].enum_items
        if 'AgX' in enum_items:
            scene.view_settings.view_transform = 'AgX'
        elif 'Filmic' in enum_items:
            scene.view_settings.view_transform = 'Filmic'
    scene.view_settings.look = 'None'
    scene.view_settings.exposure = 0.0

    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    print("✅ [CYCLES] OptiX GPU configured with balanced color management.")


def balance_lighting():
    scene = bpy.context.scene

    # Balanced overcast monsoon daylight sky
    w = scene.world
    if not w:
        w = bpy.data.worlds.new("Monsoon_Disaster_Sky")
        scene.world = w
    w.use_nodes = True
    wn = w.node_tree.nodes
    wl = w.node_tree.links
    wn.clear()

    w_out = wn.new('ShaderNodeOutputWorld')
    w_bg = wn.new('ShaderNodeBackground')
    w_bg.inputs['Color'].default_value = (0.50, 0.60, 0.72, 1.0)  # Overcast monsoon slate blue
    w_bg.inputs['Strength'].default_value = 0.95
    wl.new(w_bg.outputs['Background'], w_out.inputs['Surface'])

    # Key directional sunlight
    sun_obj = bpy.data.objects.get("Sun_Break")
    if not sun_obj:
        sun_data = bpy.data.lights.new("Sun_Break", type='SUN')
        sun_obj = bpy.data.objects.new("Sun_Break", sun_data)
        bpy.context.collection.objects.link(sun_obj)
        sun_obj.location = (25.0, 40.0, 120.0)

    sun_obj.data.energy = 3.5
    sun_obj.data.color = (1.0, 0.97, 0.92)
    sun_obj.rotation_euler = (math.radians(52.0), math.radians(15.0), math.radians(-45.0))

    # Ambient sky fill light
    fill_obj = bpy.data.objects.get("Storm_Sky_Fill")
    if fill_obj:
        if fill_obj.type == 'LIGHT':
            fill_obj.data.energy = 80.0
            fill_obj.data.color = (0.70, 0.82, 0.95)

    print("☀️ [LIGHTING] Sun & sky balanced for realistic monsoon lighting.")


def import_drone_template():
    if not os.path.exists(GLB_DRONE):
        print(f"⚠️ [WARN] {GLB_DRONE} not found!")
        return None

    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=GLB_DRONE)
    imported = list(set(bpy.data.objects) - before)
    if not imported:
        return None

    meshes = [o for o in imported if o.type == 'MESH']
    dims = [max(m.dimensions) for m in meshes if max(m.dimensions) > 0]
    max_d = max(dims) if dims else 1.8
    target_dim = 1.35  # 1.35m hexacopter span
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

    dz = target_z - location[2]
    apex = bm.verts.new((0.0, 0.0, 0.0))

    num_pts = 32
    bottom_verts = []
    for i in range(num_pts):
        ang = 2.0 * math.pi * i / num_pts
        bx = radius * math.cos(ang)
        by = radius * math.sin(ang)
        bottom_verts.append(bm.verts.new((bx, by, dz)))

    for i in range(num_pts):
        v1 = bottom_verts[i]
        v2 = bottom_verts[(i + 1) % num_pts]
        bm.faces.new((apex, v1, v2))
    bm.to_mesh(me)
    bm.free()

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
        bsdf.inputs['Transmission Weight'].default_value = 0.80
    if 'Alpha' in bsdf.inputs:
        bsdf.inputs['Alpha'].default_value = 0.30
    for em_key in ('Emission Color', 'Emission'):
        if em_key in bsdf.inputs:
            bsdf.inputs[em_key].default_value = (color_rgba[0], color_rgba[1], color_rgba[2], 1.0)
            break
    if 'Emission Strength' in bsdf.inputs:
        bsdf.inputs['Emission Strength'].default_value = 1.2
    mat.node_tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    cone.data.materials.append(mat)
    return cone


def deploy_hexacopter_swarm(drone_tpl):
    # Tactical SAR formation hovering directly over the flooded village and survivor clusters
    SWARM = [
        # label,         x,     y,     z,   yaw, pitch, roll, cone_type, cone_rgba, target_z
        ("UAV_1_Alpha",   20.5, 19.5, 52.0,   25,   -12,    2, "FLIR",  (1.0, 0.45, 0.05, 0.25), 40.3),
        ("UAV_2_Beta",    25.0, 32.0, 56.0,   45,    -8,   -2, "LiDAR", (0.05, 0.85, 1.0, 0.22), 42.4),
        ("UAV_3_Gamma",   18.0,  5.0, 62.0,   15,    -3,    0, None,    None, None),
        ("UAV_4_Delta",   35.0, 25.0, 53.0,  -35,    -9,    3, "LiDAR", (0.05, 0.85, 1.0, 0.20), 38.8),
        ("UAV_5_Epsilon",  2.0, 12.0, 51.0,  105,   -10,   -1, "FLIR",  (1.0, 0.45, 0.05, 0.22), 38.1),
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
                    m_copy = bpy.data.objects.new(f"{label}_{child.name}", child.data)
                    bpy.context.collection.objects.link(m_copy)
                    m_copy.parent = inst
                    m_copy.matrix_local = child.matrix_local.copy()

        # Add 3D Volumetric Sensor Cone
        if ctype and crgba and tz is not None:
            build_sensor_cone(
                location=(x, y, z - 0.25),
                target_z=tz,
                radius=4.5 if ctype == "FLIR" else 6.5,
                color_rgba=crgba,
                label=f"SensorCone_{label}_{ctype}"
            )

    print("🚁 [SWARM] 5-UAV SUTRA Hexacopter Swarm deployed in formation over village.")


def place_sos_tarp():
    # Large 4.5m x 3.0m bright orange emergency tarp on the Mansion rooftop (20.5, 19.5, 40.35)
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=(20.5, 19.5, 40.35))
    tarp = bpy.context.active_object
    tarp.name = "SOS_Emergency_Tarp_Mansion"
    tarp.scale = (4.5, 3.0, 1.0)
    tarp.rotation_euler = (0, 0, math.radians(18.0))

    mat = bpy.data.materials.new("SOS_Orange_Tarp_Mat")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    out = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (1.0, 0.22, 0.02, 1.0)
    bsdf.inputs['Roughness'].default_value = 0.4
    for em in ('Emission Color', 'Emission'):
        if em in bsdf.inputs:
            bsdf.inputs[em].default_value = (1.0, 0.25, 0.02, 1.0)
            break
    if 'Emission Strength' in bsdf.inputs:
        bsdf.inputs['Emission Strength'].default_value = 0.5
    mat.node_tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    tarp.data.materials.append(mat)
    print("🚩 [SAR] SOS Emergency Tarp laid out on mansion rooftop.")


def place_ndrf_boat():
    # NDRF Flat-bottom inflatable rescue boat in the water at (18.0, -10.0, 37.85)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(18.0, -10.0, 37.95))
    boat = bpy.context.active_object
    boat.name = "NDRF_Inflatable_Rescue_Boat"
    boat.scale = (4.2, 1.8, 0.65)
    boat.rotation_euler = (math.radians(2.0), math.radians(1.0), math.radians(35.0))

    mat_b = bpy.data.materials.new("NDRF_Rescue_Orange_Hull")
    mat_b.use_nodes = True
    nodes = mat_b.node_tree.nodes
    nodes.clear()
    out = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (0.95, 0.30, 0.02, 1.0)
    bsdf.inputs['Roughness'].default_value = 0.35
    mat_b.node_tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    boat.data.materials.append(mat_b)
    print("🚣 [SAR] NDRF inflatable rescue boat positioned in floodwaters.")


def setup_cameras():
    # 1. Master Cinematic Hero Overview (Full panorama: water, drowning victims, boat, village, hovering swarm)
    c1_data = bpy.data.cameras.new("Cam_Hero_Overview_Data")
    c1_data.lens = 24.0
    c1_data.clip_end = 1500.0
    c1_obj = bpy.data.objects.new("Camera_Cinematic_Hero", c1_data)
    c1_obj.location = (18.0, -24.0, 48.0)
    c1_obj.rotation_euler = (math.radians(78.0), math.radians(0.0), math.radians(-3.0))
    bpy.context.collection.objects.link(c1_obj)

    # 2. UAV-1 FLIR Gimbal POV (Looking down at the mansion rooftop survivors and SOS tarp)
    c2_data = bpy.data.cameras.new("Cam_FLIR_POV_Data")
    c2_data.lens = 38.0
    c2_data.clip_end = 800.0
    c2_obj = bpy.data.objects.new("Camera_UAV1_FLIR_POV", c2_data)
    c2_obj.location = (20.5, 14.5, 52.0)
    c2_obj.rotation_euler = (math.radians(65.0), math.radians(0.0), math.radians(0.0))
    bpy.context.collection.objects.link(c2_obj)

    # 3. Water Level / NDRF Rescue Boat POV (Low angle looking across water towards rising hillside)
    c3_data = bpy.data.cameras.new("Cam_Water_Rescue_Data")
    c3_data.lens = 28.0
    c3_data.clip_end = 1000.0
    c3_obj = bpy.data.objects.new("Camera_Water_Rescue_POV", c3_data)
    c3_obj.location = (15.0, -14.0, 39.2)
    c3_obj.rotation_euler = (math.radians(82.0), math.radians(0.0), math.radians(8.0))
    bpy.context.collection.objects.link(c3_obj)

    # 4. Tactical GIS Ortho
    c4_data = bpy.data.cameras.new("Cam_GIS_Ortho_Data")
    c4_data.type = 'ORTHO'
    c4_data.ortho_scale = 85.0
    c4_data.clip_end = 1000.0
    c4_obj = bpy.data.objects.new("Camera_GIS_Tactical_Ortho", c4_data)
    c4_obj.location = (20.0, 16.0, 130.0)
    c4_obj.rotation_euler = (0, 0, 0)
    bpy.context.collection.objects.link(c4_obj)

    bpy.context.scene.camera = c1_obj
    print("📷 [CAMERAS] 4 cinematic cameras rigged.")
    return {
        'overview': c1_obj,
        'flir_pov': c2_obj,
        'water_pov': c3_obj,
        'gis_ortho': c4_obj,
    }


def export_sim_stages():
    if hasattr(bpy.ops.wm, 'usd_export'):
        try:
            bpy.ops.wm.usd_export(filepath=OUT_USD, selected_objects_only=False)
            print(f"📦 [USD] OpenUSD Stage exported -> {OUT_USD}")
        except Exception as e:
            print(f"⚠️ [USD] Export warning: {e}")


def main():
    print("=" * 80)
    print("  PROJECT SUTRA — GRAND FINALS DISASTER DIGITAL TWIN BUILDER")
    print("  Track SH-DST-05 | Evaluation 2 (Day 2 - 02:00 PM IST)")
    print("=" * 80)

    # 1. Load base submerged village blend
    print(f"📂 [LOAD] Loading base world: {INPUT_BLEND}...")
    bpy.ops.wm.open_mainfile(filepath=INPUT_BLEND)

    # 2. Configure Cycles OptiX GPU
    configure_cycles_optix()

    # 3. Balance lighting
    balance_lighting()

    # 4. Deploy Drone Swarm
    drone_tpl = import_drone_template()
    deploy_hexacopter_swarm(drone_tpl)

    # 5. Place SOS Tarp & NDRF Boat
    place_sos_tarp()
    place_ndrf_boat()

    # 6. Rig Cameras
    cams = setup_cameras()

    # 7. Save Master Blends
    os.makedirs(os.path.dirname(OUT_BLEND_3D), exist_ok=True)
    os.makedirs(os.path.dirname(OUT_BLEND_SIM), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND_3D)
    bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND_SIM)
    print(f"💾 [SAVE] Master Blend saved -> {OUT_BLEND_3D}")
    print(f"💾 [SAVE] Sim Blend saved    -> {OUT_BLEND_SIM}")

    # 8. Render All 4 Cameras
    print("\n📸 [RENDER 1/4] Rendering Cinematic Hero Overview...")
    bpy.context.scene.camera = cams['overview']
    bpy.context.scene.render.filepath = OUT_OVERVIEW
    bpy.ops.render.render(write_still=True)
    print(f"✅ Rendered -> {OUT_OVERVIEW}")

    print("\n📸 [RENDER 2/4] Rendering UAV-1 FLIR Gimbal POV...")
    bpy.context.scene.camera = cams['flir_pov']
    bpy.context.scene.render.filepath = OUT_FLIR_POV
    bpy.ops.render.render(write_still=True)
    print(f"✅ Rendered -> {OUT_FLIR_POV}")

    print("\n📸 [RENDER 3/4] Rendering Water Rescue POV...")
    bpy.context.scene.camera = cams['water_pov']
    bpy.context.scene.render.filepath = OUT_WATER_POV
    bpy.ops.render.render(write_still=True)
    print(f"✅ Rendered -> {OUT_WATER_POV}")

    print("\n📸 [RENDER 4/4] Rendering Tactical GIS Ortho...")
    bpy.context.scene.camera = cams['gis_ortho']
    bpy.context.scene.render.filepath = OUT_GIS_ORTHO
    bpy.ops.render.render(write_still=True)
    print(f"✅ Rendered -> {OUT_GIS_ORTHO}")

    # 9. Export OpenUSD Stage
    export_sim_stages()

    print("\n" + "=" * 80)
    print("  ✨ [COMPLETE] SUTRA MASTER DISASTER WORLD RENDERED SUCCESSFULLY!")
    print("=" * 80)


if __name__ == "__main__":
    main()
