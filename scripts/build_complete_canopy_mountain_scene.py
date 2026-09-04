#!/usr/bin/env python3
"""
Project SUTRA — Master Mountain & Forest Canopy Scene Composer
=============================================================
Assembles the clean, photorealistic forest canopy environment with tactical soldiers:
- `update_dirt_road_through_forest.glb` (Master forest canopy, birch & oak trees, dirt road, cliffs, grass)
- `private_military_contractor.glb` (Textured military soldiers in tactical camo, 1.82m / 6ft tall w.r.t trees, armatures hidden)
- `hexa_copter_ar-e800_drone.glb` (SUTRA Hexacopter surveying overhead)

Saves master scene to:
`sutra_ws/src/sutra_sim/models/forest_canopy/sutra_forest_canopy_sar.blend`
and exports Gazebo Sim 8 OBJ mesh to:
`sutra_ws/src/sutra_sim/models/forest_canopy/meshes/forest_canopy_world.obj`
"""

import bpy
import math
from pathlib import Path

DOWNLOADS = Path("/home/nikhil/Downloads")
OUTPUT_BLEND = Path("/home/nikhil/Desktop/Project SUTRA/sutra_ws/src/sutra_sim/models/forest_canopy/sutra_forest_canopy_sar.blend")
OUTPUT_OBJ = Path("/home/nikhil/Desktop/Project SUTRA/sutra_ws/src/sutra_sim/models/forest_canopy/meshes/forest_canopy_world.obj")

# 1. Reset scene
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# 2. Forest Canopy Environment
print("🌲 [1/3] Importing Master Forest Canopy (update_dirt_road_through_forest.glb)...")
bpy.ops.import_scene.gltf(filepath=str(DOWNLOADS / "update_dirt_road_through_forest.glb"))
for o in bpy.data.objects:
    if o.parent is None:
        o.scale = (0.25, 0.25, 0.25)
        o.location = (0, 0, 0)

# 3. Add Multiple Military Soldiers (6-Man Tactical Infantry Squad)
print("🪖 [2/5] Deploying 6-Man Military Tactical Squad along the forest trail...")

squad_roster = [
    {
        "id": "Soldier_1_Pointman",
        "role": "Forward Scout / Pointman",
        "pos": (8.20, 7.65, 37.34),
        "rot_z": math.radians(-38),
    },
    {
        "id": "Soldier_2_SquadLeader",
        "role": "Squad Leader",
        "pos": (5.77, 4.96, 36.92),
        "rot_z": math.radians(-42),
    },
    {
        "id": "Soldier_3_Rifleman_Right",
        "role": "Rifleman 1 (Flank Right)",
        "pos": (3.33, 3.12, 36.62),
        "rot_z": math.radians(-30),
    },
    {
        "id": "Soldier_4_Automatic_Support",
        "role": "Automatic Rifleman (Flank Left)",
        "pos": (0.75, 3.33, 36.52),
        "rot_z": math.radians(-50),
    },
    {
        "id": "Soldier_5_Grenadier",
        "role": "Grenadier / Mid Guard",
        "pos": (-1.81, 5.38, 36.28),
        "rot_z": math.radians(-65),
    },
    {
        "id": "Soldier_6_RearOverwatch",
        "role": "Rear Guard / Tail Overwatch",
        "pos": (-4.17, 9.13, 35.79),
        "rot_z": math.radians(115),  # Facing backward guarding rear approach
    },
]

def spawn_soldier(soldier_info):
    name_id = soldier_info["id"]
    pos = soldier_info["pos"]
    rot_z = soldier_info["rot_z"]
    
    before = set(o.name for o in bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(DOWNLOADS / "private_military_contractor.glb"))
    new_names = set(o.name for o in bpy.data.objects) - before
    
    # Clean and configure newly imported objects
    for name in new_names:
        o = bpy.data.objects.get(name)
        if not o:
            continue
        
        # Remove stray icosphere meshes
        if "Icosphere" in name:
            bpy.data.objects.remove(o, do_unlink=True)
            continue
            
        # Hide armature bones so they never obstruct the 3D viewport
        if o.type == "ARMATURE":
            o.name = f"{name_id}_Armature"
            o.hide_viewport = True
            o.hide_render = True
            o.display_type = "WIRE"
            o.show_in_front = False
            
    # Scale 0.80x produces exact 1.82m (5.98 ft ~ 6ft) soldier w.r.t trees
    for name in new_names:
        o = bpy.data.objects.get(name)
        if o and o.parent is None:
            o.name = f"{name_id}_Root"
            o.scale = (0.80, 0.80, 0.80)
            o.location = pos
            o.rotation_euler = (0, 0, rot_z)
            
    print(f"  ✓ Deployed {soldier_info['role']} ({name_id}) at {pos}")

for soldier in squad_roster:
    spawn_soldier(soldier)

# 4. Add Tactical Military Insertion Vehicle
print("🚙 [3/5] Deploying Tactical Military Vehicle at trail insertion point...")
before = set(o.name for o in bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(DOWNLOADS / "military_jeep.glb"))
new_names = set(o.name for o in bpy.data.objects) - before
for name in new_names:
    o = bpy.data.objects.get(name)
    if o and o.parent is None:
        o.name = "Tactical_Military_Jeep"
        o.scale = (1.0, 1.0, 1.0)
        o.location = (-7.5, 12.0, 35.3)
        o.rotation_euler = (0, 0, math.radians(45))

# 5. SUTRA Hexacopter Airborne Reconnaissance
print("🚁 [4/5] Positioning SUTRA Hexacopter surveying overhead...")
before = set(o.name for o in bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(DOWNLOADS / "hexa_copter_ar-e800_drone.glb"))
new_names = set(o.name for o in bpy.data.objects) - before
for name in new_names:
    o = bpy.data.objects.get(name)
    if o and o.parent is None:
        o.name = "SUTRA_Hexacopter_UAV01"
        o.scale = (0.75, 0.75, 0.75)
        o.location = (4.0, 5.0, 75.0)
        o.rotation_euler = (math.radians(-12), math.radians(6), math.radians(45))

# Atmospheric Mountain Lighting
bpy.ops.object.light_add(type="SUN", location=(35, 35, 120))
sun = bpy.context.active_object
sun.name = "MountainSun"
sun.data.energy = 4.5
sun.rotation_euler = (math.radians(50), math.radians(25), math.radians(65))

# Cinematic Camera framed looking along the dirt road showing squad
bpy.ops.object.camera_add(location=(14.5, 13.0, 42.0), rotation=(math.radians(68), math.radians(0), math.radians(145)))
cam = bpy.context.active_object
cam.name = "Patrol_Trail_Camera"
scene.camera = cam

# Set 3D Viewport Shading to MATERIAL / TEXTURED
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == 'VIEW_3D':
            for space in area.spaces:
                if space.type == 'VIEW_3D':
                    space.shading.type = 'MATERIAL'

# Deselect everything cleanly
bpy.ops.object.select_all(action='DESELECT')

# Pack all external textures so the .blend is 100% self-contained
print("📦 Packing all textures into self-contained .blend...")
bpy.ops.file.pack_all()

# Save master .blend file
OUTPUT_BLEND.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND))
print(f"✅ Saved clean master forest canopy world with tactical soldiers to: {OUTPUT_BLEND}")

# Export OBJ for Gazebo Sim
OUTPUT_OBJ.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.obj_export(filepath=str(OUTPUT_OBJ))
print(f"✅ Exported Gazebo OBJ mesh to: {OUTPUT_OBJ}")
