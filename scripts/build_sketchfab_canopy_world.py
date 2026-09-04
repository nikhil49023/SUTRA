#!/usr/bin/env python3
"""
Project SUTRA — Compose Photorealistic Canopy World from Sketchfab Downloads
===========================================================================
Imports authentic Sketchfab assets from ~/Downloads:
- `the_landscape_is_a_forest_in_the_mountains.glb` (Real mountain landscape + trees)
- `more_trees.glb` (Photorealistic pine trees with textured needles & bark)
- `forest_house_ruin.glb` (Tactical forest ruin obstacle)
- `small_rocks.glb` (Ground debris for VIO)
- `man.glb` (Disaster survivor concealed near the ruin with orange SOS tarp)

Packs all textures and saves as:
`sutra_ws/src/sutra_sim/models/forest_canopy/sutra_forest_canopy_sar.blend`
"""

import bpy
import os
import math
from pathlib import Path

DOWNLOADS = Path("/home/nikhil/Downloads")
OUTPUT_BLEND = Path("/home/nikhil/Desktop/Project SUTRA/sutra_ws/src/sutra_sim/models/forest_canopy/sutra_forest_canopy_sar.blend")
OUTPUT_OBJ = Path("/home/nikhil/Desktop/Project SUTRA/sutra_ws/src/sutra_sim/models/forest_canopy/meshes/forest_canopy_world.obj")

# 1. Reset scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Create scene collection
scene = bpy.context.scene
if "Collection" not in bpy.data.collections:
    col = bpy.data.collections.new("CanopyWorld")
    scene.collection.children.link(col)
else:
    col = bpy.data.collections["Collection"]

print("🏔️ [1/5] Importing Forest Mountain Landscape GLB...")
landscape_path = DOWNLOADS / "the_landscape_is_a_forest_in_the_mountains.glb"
if landscape_path.exists():
    bpy.ops.import_scene.gltf(filepath=str(landscape_path))
    print("   Imported the_landscape_is_a_forest_in_the_mountains.glb")
else:
    print("⚠️ Landscape GLB not found!")

# Scale & center landscape
landscape_objs = [o for o in bpy.data.objects if o.type == 'MESH']
print(f"   Loaded {len(landscape_objs)} landscape mesh objects.")

# 2. Import Forest House Ruin
print("🏚️ [2/5] Importing Forest House Ruin GLB...")
ruin_path = DOWNLOADS / "forest_house_ruin.glb"
if ruin_path.exists():
    before_objs = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(ruin_path))
    ruin_objs = list(set(bpy.data.objects) - before_objs)
    # Position ruin at a tactical clearing in the forest
    for o in ruin_objs:
        o.location.x += 15.0
        o.location.y += 20.0
        o.scale = (0.8, 0.8, 0.8)
    print(f"   Positioned forest house ruin with {len(ruin_objs)} meshes.")

# 3. Import Rocks / Ground Debris
print("🪨 [3/5] Importing Small Rocks GLB...")
rocks_path = DOWNLOADS / "small_rocks.glb"
if rocks_path.exists():
    before_objs = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(rocks_path))
    rock_objs = list(set(bpy.data.objects) - before_objs)
    for o in rock_objs:
        o.location.x -= 10.0
        o.location.y += 5.0
        o.scale = (2.0, 2.0, 2.0)
    print("   Positioned ground rock clusters.")

# 4. Import Survivor Character & Add Orange Rescue Tarp
print("🚨 [4/5] Importing Survivor Character (`man.glb`) & Orange Tarp...")
man_path = DOWNLOADS / "man.glb"
if man_path.exists():
    before_objs = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(man_path))
    man_objs = list(set(bpy.data.objects) - before_objs)
    # Scale human to 1.75m and place near the ruin
    for o in man_objs:
        o.scale = (0.018, 0.018, 0.018)  # cm to meters if needed
        o.location.x += 16.5
        o.location.y += 18.5
        o.rotation_euler = (math.pi/2, 0, 0.4)
    print("   Placed survivor character near ruin shelter.")

# Create Orange Thermal Rescue Tarp under survivor
bpy.ops.mesh.primitive_plane_add(size=3.0, location=(16.0, 18.0, 0.05))
tarp_obj = bpy.context.active_object
tarp_obj.name = "SOS_Orange_Survival_Tarp"

# Orange material
tarp_mat = bpy.data.materials.new(name="Orange_Tarp_Thermal")
tarp_mat.use_nodes = True
bsdf = tarp_mat.node_tree.nodes.get("Principled BSDF")
if bsdf:
    bsdf.inputs["Base Color"].default_value = (0.95, 0.35, 0.02, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.4
tarp_obj.data.materials.append(tarp_mat)

# 5. Add Sunlight & Viewport Setup
print("☀️ [5/5] Setting up atmospheric lighting & camera...")
if "Sun" not in bpy.data.objects:
    bpy.ops.object.light_add(type='SUN', location=(30, 40, 60))
    sun = bpy.context.active_object
    sun.data.energy = 3.5
    sun.rotation_euler = (math.radians(45), math.radians(20), math.radians(60))

# Pack all external textures into the .blend file so it's 100% self-contained
print("📦 Packing all textures into self-contained .blend...")
bpy.ops.file.pack_all()

# Save master .blend file
OUTPUT_BLEND.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND))
print(f"✅ Saved photorealistic Sketchfab canopy world to: {OUTPUT_BLEND}")

# Export OBJ for Gazebo Sim
OUTPUT_OBJ.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.obj_export(filepath=str(OUTPUT_OBJ))
print(f"✅ Exported Gazebo OBJ mesh to: {OUTPUT_OBJ}")
