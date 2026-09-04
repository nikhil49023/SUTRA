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

# 3. Add Military Soldiers (Sized to ~1.82m / 6ft, armatures hidden)
def add_soldier(loc, rot_z):
    before = set(o.name for o in bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(DOWNLOADS / "private_military_contractor.glb"))
    new_names = set(o.name for o in bpy.data.objects) - before
    
    # Hide all armatures and remove stray icosphere
    for name in new_names:
        o = bpy.data.objects.get(name)
        if o:
            if "Icosphere" in name:
                bpy.data.objects.remove(o, do_unlink=True)
            elif o.type == "ARMATURE":
                o.hide_viewport = True
                o.hide_render = True
                o.display_type = "WIRE"
                
    # Root transform to 1.82m (6ft) human scale w.r.t 16-26m trees
    for name in new_names:
        o = bpy.data.objects.get(name)
        if o and o.parent is None:
            o.scale = (0.80, 0.80, 0.80)
            o.location = loc
            o.rotation_euler = (0, 0, rot_z)

print("🪖 [2/3] Adding Soldier 1 (Pointman patrolling dirt road)...")
add_soldier((4.43, 3.73, 36.63), math.radians(-35))

print("🪖 Adding Soldier 2 (Rifleman in tactical trail overwatch)...")
add_soldier((-2.50, -4.00, 36.15), math.radians(-25))

# 4. SUTRA Hexacopter Airborne Reconnaissance
print("🚁 [3/3] Positioning SUTRA Hexacopter surveying overhead...")
before = set(o.name for o in bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(DOWNLOADS / "hexa_copter_ar-e800_drone.glb"))
new_names = set(o.name for o in bpy.data.objects) - before
for name in new_names:
    o = bpy.data.objects.get(name)
    if o and o.parent is None:
        o.scale = (0.75, 0.75, 0.75)
        o.location = (5.5, 5.0, 95.4)
        o.rotation_euler = (math.radians(-12), math.radians(6), math.radians(45))

# Atmospheric Sunlight
bpy.ops.object.light_add(type="SUN", location=(35, 35, 120))
sun = bpy.context.active_object
sun.name = "MountainSun"
sun.data.energy = 4.5
sun.rotation_euler = (math.radians(50), math.radians(25), math.radians(65))

# Deselect everything so no bone or mesh outlines block view
for o in bpy.data.objects:
    o.select_set(False)

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
