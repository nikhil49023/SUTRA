#!/usr/bin/env python3
"""
Project SUTRA — Master Mountain & Forest Canopy Scene Composer
=============================================================
Assembles the clean, photorealistic forest canopy environment from:
- `update_dirt_road_through_forest.glb` (Ultra-HD forest canopy, birch/oak trees, dirt road, rocks, cliffs, grass)
- `hexa_copter_ar-e800_drone.glb` (SUTRA Hexacopter surveying from above the canopy)

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

# 1. Reset
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def import_glb(path, collection_name=None, loc=(0,0,0), rot=(0,0,0), scale=(1,1,1)):
    if not path.exists():
        print(f"⚠️ Not found: {path}")
        return []
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    new_objs = list(set(bpy.data.objects) - before)
    roots = [o for o in new_objs if o.parent is None]
    if collection_name:
        col = bpy.data.collections.new(collection_name)
        scene.collection.children.link(col)
        for o in new_objs:
            for c in o.users_collection:
                c.objects.unlink(o)
            col.objects.link(o)
    for r in roots:
        r.location = loc
        if rot != (0,0,0):
            r.rotation_euler = rot
        if scale != (1,1,1):
            r.scale = scale
    print(f"✅ Imported {path.name}: {len(new_objs)} objects at {loc}")
    return new_objs

print("🌲 [1/3] Importing Master Forest Canopy (update_dirt_road_through_forest.glb)...")
forest_objs = import_glb(
    DOWNLOADS / "update_dirt_road_through_forest.glb", 
    "ForestCanopy", 
    loc=(0.0, 0.0, 0.0), 
    scale=(0.25, 0.25, 0.25)
)

# Calculate forest canopy bounds in world space
mesh_objs = [o for o in forest_objs if o.type == "MESH"]
min_x = min(min(v.co.x for v in o.data.vertices) for o in mesh_objs) * 0.25
max_x = max(max(v.co.x for v in o.data.vertices) for o in mesh_objs) * 0.25
min_y = min(min(v.co.y for v in o.data.vertices) for o in mesh_objs) * 0.25
max_y = max(max(v.co.y for v in o.data.vertices) for o in mesh_objs) * 0.25
min_z = min(min(v.co.z for v in o.data.vertices) for o in mesh_objs) * 0.25
max_z = max(max(v.co.z for v in o.data.vertices) for o in mesh_objs) * 0.25

print(f"Canopy Z: {min_z:.1f} to {max_z:.1f}, Center: ({(min_x+max_x)/2:.1f}, {(min_y+max_y)/2:.1f})")

# Hexacopter placed ~8m above the top of canopy
drone_z = max_z + 8.0
drone_x = (min_x + max_x) / 2
drone_y = (min_y + max_y) / 2

print(f"🚁 [2/3] Positioning SUTRA Hexacopter at ({drone_x:.1f}, {drone_y:.1f}, {drone_z:.1f})...")
import_glb(
    DOWNLOADS / "hexa_copter_ar-e800_drone.glb", 
    "SutraHexacopter", 
    loc=(drone_x, drone_y, drone_z), 
    rot=(math.radians(-10), math.radians(5), math.radians(45)),
    scale=(0.75, 0.75, 0.75)
)

# Sun lighting
print("☀️ [3/3] Setting up atmospheric sunlight...")
bpy.ops.object.light_add(type="SUN", location=(drone_x + 30, drone_y + 30, drone_z + 40))
sun = bpy.context.active_object
sun.name = "CanopySun"
sun.data.energy = 4.5
sun.rotation_euler = (math.radians(50), math.radians(25), math.radians(65))

# Pack all external textures so the .blend is 100% self-contained
print("📦 Packing textures into self-contained .blend...")
bpy.ops.file.pack_all()

# Save master .blend file
OUTPUT_BLEND.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND))
print(f"✅ Saved clean master forest canopy world to: {OUTPUT_BLEND}")

# Export OBJ for Gazebo Sim
OUTPUT_OBJ.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.obj_export(filepath=str(OUTPUT_OBJ))
print(f"✅ Exported Gazebo OBJ mesh to: {OUTPUT_OBJ}")
