
import bpy, os

target_base = '/home/siva/Documents/DRONE_CONTROL/sutra_ws/src/sutra_sim/models'

export_specs = [
    {
        'blender_name': 'Rooftop_Survivor_Mansion',
        'model_name': 'human_waving_victim',
        'obj_name': 'human_waving.obj',
        'align_z': 'feet'
    },
    {
        'blender_name': 'Survivor_Mansion_Flag_Signaler',
        'model_name': 'human_flag_signaler',
        'obj_name': 'human_flag.obj',
        'align_z': 'feet'
    },
    {
        'blender_name': 'Water_Survivor_Treading_1',
        'model_name': 'human_water_survivor',
        'obj_name': 'human_water_survivor.obj',
        'align_z': 'waist'
    },
    {
        'blender_name': 'Survivor_East_Guide_Pointing',
        'model_name': 'human_east_guide',
        'obj_name': 'human_east_guide.obj',
        'align_z': 'feet'
    },
    {
        'blender_name': 'Survivor_Balcony_Calling_Boat',
        'model_name': 'human_balcony_caller',
        'obj_name': 'human_balcony_caller.obj',
        'align_z': 'feet'
    }
]

for spec in export_specs:
    obj = bpy.data.objects.get(spec['blender_name'])
    if not obj:
        print(f"Warning: {spec['blender_name']} not found!")
        continue

    bpy.context.view_layer.objects.active = obj
    depsgraph = bpy.context.evaluated_depsgraph_get()
    eval_obj = obj.evaluated_get(depsgraph)
    mesh = bpy.data.meshes.new_from_object(eval_obj)

    new_obj = bpy.data.objects.new(spec['model_name'], mesh)
    bpy.context.scene.collection.objects.link(new_obj)

    verts = [v.co for v in mesh.vertices]
    min_x, max_x = min(v.x for v in verts), max(v.x for v in verts)
    min_y, max_y = min(v.y for v in verts), max(v.y for v in verts)
    min_z, max_z = min(v.z for v in verts), max(v.z for v in verts)

    cx = (min_x + max_x) / 2.0
    cy = (min_y + max_y) / 2.0
    
    if spec['align_z'] == 'feet':
        cz = min_z
    else: # waist/waterline
        cz = min_z + (max_z - min_z) * 0.40

    for v in mesh.vertices:
        v.co.x -= cx
        v.co.y -= cy
        v.co.z -= cz

    # Link materials
    for slot in obj.material_slots:
        if slot.material:
            new_obj.data.materials.append(slot.material)

    bpy.ops.object.select_all(action='DESELECT')
    new_obj.select_set(True)
    bpy.context.view_layer.objects.active = new_obj

    model_dir = os.path.join(target_base, spec['model_name'], 'meshes')
    os.makedirs(model_dir, exist_ok=True)
    out_obj = os.path.join(model_dir, spec['obj_name'])

    bpy.ops.wm.obj_export(
        filepath=out_obj,
        export_selected_objects=True,
        forward_axis='Y',
        up_axis='Z',
        export_materials=True
    )
    print(f"Exported {spec['model_name']} -> {out_obj} ({os.path.getsize(out_obj)} bytes)")
