#!/usr/bin/env python3
"""
Project SUTRA — Master Mountain & Forest Canopy Scene Composer
=============================================================
Combines ALL latest downloaded Sketchfab 3D assets from ~/Downloads:
1. `snowy_mountain_-_terrain.glb` (Mountain peaks & ridges)
2. `the_landscape_is_a_forest_in_the_mountains.glb` (Mountain forest landscape)
3. `a_forest_3_with_a_road_at_night_for_game.glb` (Dense forest road corridor)
4. `more_trees.glb` (High-detail photorealistic pine trees)
5. `forest_house_ruin.glb` (Tactical ruin search zone)
6. `small_rocks.glb` (Ground debris)
7. `man.glb` (Concealed survivor character with orange SOS tarp)
8. `hexa_copter_ar-e800_drone.glb` (SUTRA Hexacopter surveying from 8m altitude)

Saves master scene to:
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
        r.rotation_euler = rot
        r.scale = scale
    print(f"✅ Imported {path.name}: {len(new_objs)} objects, {len(roots)} roots at {loc}")
    return new_objs

print("🏔️ [1/11] Importing Mountain Top Ridges (snowy_mountain_-_terrain.glb)...")
import_glb(
    DOWNLOADS / "snowy_mountain_-_terrain.glb", 
    "MountainPeaks", 
    loc=(0.0, 120.0, -10.0), 
    scale=(8.0, 8.0, 6.0)
)

print("🌲 [2/11] Importing Mountain Forest Landscape (the_landscape_is_a_forest_in_the_mountains.glb)...")
import_glb(
    DOWNLOADS / "the_landscape_is_a_forest_in_the_mountains.glb", 
    "ForestLandscape", 
    loc=(0.0, 0.0, -2.0), 
    scale=(1.0, 1.0, 1.0)
)

print("🛣️ [3/11] Importing Ultra-HD Forest Dirt Road (update_dirt_road_through_forest.glb)...")
import_glb(
    DOWNLOADS / "update_dirt_road_through_forest.glb", 
    "DirtRoadHD", 
    loc=(0.0, 0.0, 0.0), 
    scale=(0.25, 0.25, 0.25)
)

print("🌲 [4/11] Importing Forest Road Corridor (a_forest_3_with_a_road_at_night_for_game.glb)...")
import_glb(
    DOWNLOADS / "a_forest_3_with_a_road_at_night_for_game.glb", 
    "ForestRoadWest", 
    loc=(-25.0, -20.0, 1.0), 
    scale=(1.2, 1.2, 1.2)
)

print("🌲 [5/11] Importing Detailed Pine Trees (more_trees.glb)...")
import_glb(
    DOWNLOADS / "more_trees.glb", 
    "DetailedTrees", 
    loc=(25.0, 10.0, 2.0), 
    scale=(0.012, 0.012, 0.012)
)

print("🏚️ [6/11] Importing Forest House Ruin (forest_house_ruin.glb)...")
import_glb(
    DOWNLOADS / "forest_house_ruin.glb", 
    "ForestRuin", 
    loc=(18.0, 22.0, 0.5), 
    scale=(0.85, 0.85, 0.85)
)

print("🚙 [7/11] Importing NDRF Tactical SAR Jeep (military_jeep.glb)...")
import_glb(
    DOWNLOADS / "military_jeep.glb", 
    "TacticalJeep", 
    loc=(-6.0, -12.0, 0.4), 
    rot=(0.0, 0.0, math.radians(25)), 
    scale=(0.8, 0.8, 0.8)
)

print("🪖 [8/11] Importing Tactical Operative Survivor (private_military_contractor.glb)...")
import_glb(
    DOWNLOADS / "private_military_contractor.glb", 
    "TacticalContractor", 
    loc=(16.0, 20.0, 0.4), 
    rot=(0.0, 0.0, math.radians(-40)), 
    scale=(1.0, 1.0, 1.0)
)

print("🪨 [9/11] Importing Ground Rocks (small_rocks.glb)...")
import_glb(
    DOWNLOADS / "small_rocks.glb", 
    "GroundRocks", 
    loc=(8.0, 12.0, 0.3), 
    scale=(2.5, 2.5, 2.5)
)

print("🧑 [10/11] Importing Civilian Survivor & SOS Tarp (man.glb)...")
import_glb(
    DOWNLOADS / "man.glb", 
    "CivilianSurvivor", 
    loc=(19.0, 21.0, 0.5), 
    rot=(math.pi / 2, 0, 0.4), 
    scale=(0.018, 0.018, 0.018)
)

# Create Orange Thermal Rescue Tarp
bpy.ops.mesh.primitive_plane_add(size=3.2, location=(18.5, 21.0, 0.52))
tarp_obj = bpy.context.active_object
tarp_obj.name = "SOS_Orange_Survival_Tarp"
tarp_mat = bpy.data.materials.new(name="Orange_Tarp_Thermal")
bsdf = tarp_mat.node_tree.nodes.get("Principled BSDF")
if bsdf:
    bsdf.inputs["Base Color"].default_value = (0.96, 0.36, 0.02, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.35
tarp_obj.data.materials.append(tarp_mat)

print("🚁 [11/11] Importing SUTRA Hexacopter Airborne (hexa_copter_ar-e800_drone.glb)...")
import_glb(
    DOWNLOADS / "hexa_copter_ar-e800_drone.glb", 
    "SutraHexacopter", 
    loc=(-8.0, -10.0, 8.5), 
    rot=(math.radians(-10), math.radians(5), math.radians(45)), 
    scale=(0.75, 0.75, 0.75)
)

# Atmospheric Lighting & Sun Setup
print("☀️ Setting up mountain sun and atmospheric lighting...")
bpy.ops.object.light_add(type='SUN', location=(40, 50, 80))
sun = bpy.context.active_object
sun.name = "MountainSun"
sun.data.energy = 4.0
sun.rotation_euler = (math.radians(50), math.radians(25), math.radians(65))

# Pack all external textures so the .blend is 100% self-contained
print("📦 Packing all textures into self-contained .blend...")
bpy.ops.file.pack_all()

# Save master .blend file
OUTPUT_BLEND.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND))
print(f"✅ Saved full mountain & forest canopy world to: {OUTPUT_BLEND}")

# Export OBJ for Gazebo Sim
OUTPUT_OBJ.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.obj_export(filepath=str(OUTPUT_OBJ))
print(f"✅ Exported Gazebo OBJ mesh to: {OUTPUT_OBJ}")
