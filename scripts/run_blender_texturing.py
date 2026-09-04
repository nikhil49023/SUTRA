
import bpy
import bmesh
import math
from pathlib import Path

blend_path = "/home/nikhil/Desktop/Project SUTRA/docs/media/sutra_himalayan_disaster_world.blend"
textures_dir = Path("/home/nikhil/Desktop/Project SUTRA/sutra_ws/src/sutra_sim/models/himalayan_disaster_valley/materials/textures")
meshes_dir = Path("/home/nikhil/Desktop/Project SUTRA/sutra_ws/src/sutra_sim/models/himalayan_disaster_valley/meshes")

print("🎨 Loading Blender scene...")
bpy.ops.wm.read_factory_settings(use_empty=True)

# Import the existing valley mesh
obj_in = meshes_dir / "himalayan_disaster_valley.obj"
bpy.ops.wm.obj_import(filepath=str(obj_in))

# Materials definition
def create_pbr_mat(name, color, tex_path=None, roughness=0.6, specular=0.4):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    
    if bsdf:
        bsdf.inputs['Base Color'].default_value = color
        bsdf.inputs['Roughness'].default_value = roughness
        if 'Specular IOR Level' in bsdf.inputs:
            bsdf.inputs['Specular IOR Level'].default_value = specular
        elif 'Specular' in bsdf.inputs:
            bsdf.inputs['Specular'].default_value = specular
            
        if tex_path and Path(tex_path).exists():
            tex_node = nodes.new('ShaderNodeTexImage')
            tex_node.image = bpy.data.images.load(str(tex_path))
            links.new(tex_node.outputs['Color'], bsdf.inputs['Base Color'])
    return mat

mat_cliff = create_pbr_mat("CliffGranite", (0.35, 0.32, 0.30, 1.0), textures_dir / "cliff_diff.jpg", roughness=0.85)
mat_mud = create_pbr_mat("AlluvialMud", (0.28, 0.20, 0.12, 1.0), textures_dir / "mud_diff.jpg", roughness=0.90)
mat_water = create_pbr_mat("FloodTorrent", (0.18, 0.28, 0.35, 1.0), roughness=0.15, specular=0.95)
mat_orange = create_pbr_mat("HiVis_Rescue_Orange", (1.0, 0.28, 0.02, 1.0), roughness=0.4, specular=0.5)
mat_roof = create_pbr_mat("SlateRoof", (0.20, 0.22, 0.25, 1.0), roughness=0.7)
mat_wood = create_pbr_mat("TimberShed", (0.38, 0.24, 0.14, 1.0), roughness=0.8)

# Select all imported mesh objects
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH':
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        
        # Add materials to object
        obj.data.materials.clear()
        obj.data.materials.append(mat_mud)
        obj.data.materials.append(mat_cliff)
        obj.data.materials.append(mat_water)
        obj.data.materials.append(mat_orange)
        obj.data.materials.append(mat_roof)
        
        # Assign materials based on vertex geometry
        bpy.ops.object.mode_set(mode='EDIT')
        bm = bmesh.from_edit_mesh(obj.data)
        bm.faces.ensure_lookup_table()
        
        for f in bm.faces:
            center_z = f.calc_center_median().z
            center_x = f.calc_center_median().x
            normal_z = f.normal.z
            
            # Water in riverbed (Z <= 2.5)
            if center_z < 2.5 and abs(normal_z) > 0.6:
                f.material_index = 2  # FloodWater
            # Steep canyon walls (normal_z < 0.65 or Z > 12)
            elif normal_z < 0.65 or center_z > 12.0:
                f.material_index = 1  # CliffGranite
            else:
                f.material_index = 0  # AlluvialMud
                
        bmesh.update_edit_mesh(obj.data)
        
        # Smart UV Unwrap
        bpy.ops.uv.smart_project(angle_limit=66.0, island_margin=0.02)
        bpy.ops.object.mode_set(mode='OBJECT')
        bpy.ops.object.shade_smooth()

# Save enhanced blend
bpy.ops.wm.save_as_mainfile(filepath=blend_path)
print("✅ Saved enhanced .blend with PBR materials and UV unwrapping!")

# Export OBJ with MTL and UVs
obj_out = meshes_dir / "himalayan_disaster_valley.obj"
bpy.ops.wm.obj_export(
    filepath=str(obj_out),
    export_materials=True,
    export_normals=True,
    export_uv=True,
    export_colors=True,
    path_mode='RELATIVE'
)
print("✅ Exported OBJ with full MTL and UV coordinates!")

# Render cinematic 1080p preview
cam_data = bpy.data.cameras.new('RenderCam')
cam_obj = bpy.data.objects.new('RenderCam', cam_data)
bpy.context.scene.collection.objects.link(cam_obj)
bpy.context.scene.camera = cam_obj
cam_obj.location = (0, -75, 42)
cam_obj.rotation_euler = (math.radians(65), 0, 0)

light_data = bpy.data.lights.new(name='Sun', type='SUN')
light_data.energy = 4.5
light_obj = bpy.data.objects.new(name='Sun', object_data=light_data)
bpy.context.scene.collection.objects.link(light_obj)
light_obj.rotation_euler = (math.radians(45), math.radians(30), 0)

bpy.context.scene.render.resolution_x = 1280
bpy.context.scene.render.resolution_y = 720
bpy.context.scene.render.filepath = '/home/nikhil/Desktop/Project SUTRA/docs/media/himalayan_disaster_textured_preview.png'
bpy.ops.render.render(write_still=True)
print("✅ Rendered himalayan_disaster_textured_preview.png!")
