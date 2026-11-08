"""Export a book from a disposable Blender process; never save the source.

blender -b --factory-startup --disable-autoexec SOURCE.blend --python this.py --
  --book 'SPIKE PLANTER book' --bakes page-bake-manifest.json --expected-pages 27 --output TEMP_DIR
Then run package-sketchbook.mjs TEMP_DIR VERSIONED_ASSET_DIR.
"""
import argparse, collections, hashlib, json, sys
from pathlib import Path
import bpy
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parent))
sys.dont_write_bytecode=True
from sketchbook_decal_projection import project_decals

args=argparse.ArgumentParser()
args.add_argument('--book',required=True)
args.add_argument('--bakes',required=True,type=Path)
args.add_argument('--expected-pages',required=True,type=int)
args.add_argument('--output',required=True,type=Path)
args=args.parse_args(sys.argv[sys.argv.index('--')+1:])
out=args.output;out.mkdir(parents=True,exist_ok=True);(out/'textures').mkdir(exist_ok=True)
bpy.context.window.scene=bpy.data.scenes['Scene']
book=bpy.data.objects[args.book];modifier=next(m for m in book.modifiers if m.type=='NODES')
book.animation_data_clear()
trees=list(bpy.data.node_groups)+[m.node_tree for m in bpy.data.materials if m.node_tree]
before={t.as_pointer():[(n.as_pointer(),n.name,n.label)for n in t.nodes]for t in trees}
for node in modifier.node_group.nodes:
    if node.bl_idname=='GeometryNodeGroup' and 'Level' in node.inputs:node.inputs['Level'].default_value=0
sticker=bpy.data.objects.get('backcover stickers')
if sticker:
    decimate=sticker.modifiers.new('Decimate','DECIMATE');decimate.ratio=.08
bakes=json.loads(args.bakes.read_text());boards={b['material']:b for b in bakes['boards']}
materials={};geometry={};samples={};factors=[];page_ids={}

def texture(image, size=2048):
    # Deterministic web derivatives; the full-resolution source is untouched.
    source=Path(bpy.path.abspath(image.filepath))
    digest=hashlib.sha256(source.read_bytes() if source.is_file() else image.packed_file.data).hexdigest()[:16]
    target=out/'textures'/f'{digest}.png'
    if not target.exists():
        copy=image.copy();w,h=copy.size;scale=min(1,size/max(w,h))
        copy.scale(round(w*scale),round(h*scale));copy.filepath_raw=str(target);copy.file_format='PNG';copy.save()
        bpy.data.images.remove(copy)
    return 'textures/'+target.name

def material_info(mat):
    if mat.name in materials:return materials[mat.name]
    info={'name':mat.name,'color':[1,1,1],'roughness':.9}
    if mat.name in boards:
        board=boards[mat.name]
        img=bpy.data.images.load(board['texture'],check_existing=True)
        remap=next(n for n in mat.node_tree.nodes if n.bl_idname=='ShaderNodeVectorMath' and n.operation=='MULTIPLY_ADD')
        info.update(texture=texture(img),artwork=True,paper=[.92,.90,.85],extension='CLIP',
                    spread=board['order']+1,mapping={'scale':list(remap.inputs[1].default_value),'translation':list(remap.inputs[2].default_value),'rotation':[0,0,0]})
    else:
        tex=mat.node_tree.nodes.get('Image Texture.001') if mat.node_tree else None
        if not tex or tex.bl_idname!='ShaderNodeTexImage' or not tex.image:
            tex=next((n for n in mat.node_tree.nodes if n.bl_idname=='ShaderNodeTexImage' and n.image and n.outputs[0].is_linked),None) if mat.node_tree else None
        if tex:
            info.update(texture=texture(tex.image),extension=tex.extension)
            vector=tex.inputs['Vector']
            if vector.links and vector.links[0].from_node.bl_idname=='ShaderNodeMapping':
                n=vector.links[0].from_node;scale=n.inputs['Scale'].default_value[:]
                if n.inputs['Scale'].links:
                    val=n.inputs['Scale'].links[0].from_socket.default_value;scale=[val]*3 if isinstance(val,(float,int)) else list(val)
                info['mapping']={'scale':list(scale),'translation':list(n.inputs['Location'].default_value),'rotation':list(n.inputs['Rotation'].default_value)}
        else:info['color']=[.88,.86,.81]
    materials[mat.name]=info;return info

def read(mesh, matrix, prefix):
    mesh.calc_loop_triangles()
    local=np.empty((len(mesh.vertices),3),dtype=np.float32);mesh.vertices.foreach_get('co',local.ravel())
    transform=np.array(book.matrix_world.inverted()@matrix,dtype=np.float32)
    positions=(local@transform[:3,:3].T+transform[:3,3]-np.array([0,0,2400],dtype=np.float32))/1000
    by_material=collections.defaultdict(list)
    for tri in mesh.loop_triangles:
        mat=mesh.materials[tri.material_index] if tri.material_index<len(mesh.materials) else None
        if not mat or (prefix=='pages' and mat.name not in boards):continue
        # The cover instance also carries unrelated internal source materials.
        if prefix=='cover' and 'notebook cover' not in mat.name:continue
        by_material[mat.name].append(tri)
    for name,tris in by_material.items():
        key=f'{prefix} / {name}';uv_layer=mesh.uv_layers.get('UVMap') or mesh.uv_layers.active
        if key not in geometry:
            lookup={};orig=[];uv=[];indices=[]
            for tri in tris:
                for vi,li in zip(tri.vertices,tri.loops):
                    xy=tuple(uv_layer.data[li].uv) if uv_layer else (0,0)
                    identity=(vi,round(xy[0],6),round(xy[1],6))
                    if identity not in lookup:lookup[identity]=len(orig);orig.append(vi);uv.extend(xy)
                    indices.append(lookup[identity])
            geometry[key]={'name':key,'material':material_info(bpy.data.materials[name]),'vertexMap':np.array(orig),'uv':uv,'indices':indices,'triangles':len(tris)}
            samples[key]=[]
        g=geometry[key]
        if g['triangles']!=len(tris):raise RuntimeError('Changing topology: '+key)
        samples[key].append(positions[g['vertexMap']].copy())

count=281
for sample in range(count):
    progress=sample/(count-1)
    modifier.properties.inputs.Socket_4.value=progress;book.update_tag();bpy.context.view_layer.update()
    dg=bpy.context.evaluated_depsgraph_get();evaluated=book.evaluated_get(dg);mesh=evaluated.data
    read(mesh,book.matrix_world,'pages')
    values={};idx=mesh.attributes['page index'];fac=mesh.attributes['page flip factor']
    for face in mesh.polygons:
        mat=mesh.materials[face.material_index]
        if mat and mat.name in boards:
            key=round(idx.data[face.index].value);values[key]=fac.data[face.index].value
            page_ids[key]=boards[mat.name]['order']+1
    factors.append(values)
    for inst in dg.object_instances:
        if inst.is_instance and inst.parent and inst.parent.original==book:
            read(inst.object.data,inst.matrix_world.copy(),'stickers' if 'backcover stickers' in inst.object.name else 'cover')
    if sample%40==0:print('EXPORTED',sample,count-1,flush=True)

project_decals(geometry,samples,round(.1*(count-1)))

# Stop on the first fully open view and at the end of each leaf turn.
stops=[0,.1]
for leaf in range(0,len(page_ids),2):
    index=next(i for i,values in enumerate(factors) if values.get(leaf,0)>=.99999)
    stop=index/(count-1)
    if stop>stops[-1]+.002:stops.append(stop)
if stops[-1]<1:stops.append(1)
manifest={'version':2,'cameraFov':42.72094831643637,'sampleCount':count,'pageCount':len(page_ids),
          'pageStops':stops,'initialProgress':.1,'pageSpreads':page_ids,'parts':[],'bookOrientation':{'flat':True}}
for i,(key,g) in enumerate(geometry.items()):
    positions=np.stack(samples[key]);lo=positions.min(axis=(0,1));span=np.maximum(positions.max(axis=(0,1))-lo,1e-8)
    quantized=np.round((positions-lo)/span*65535).astype('<u2');filename=f'part-{i}.bin';(out/filename).write_bytes(quantized.tobytes())
    manifest['parts'].append({'name':key,'material':g['material'],'vertexCount':positions.shape[1],'uv':g['uv'],'indices':g['indices'],'min':lo.tolist(),'span':span.tolist(),'file':filename,'bytes':quantized.nbytes})
after={t.as_pointer():[(n.as_pointer(),n.name,n.label)for n in t.nodes]for t in trees}
assert before==after,'Source node identities changed'
assert sorted(page_ids)==list(range(args.expected_pages)),page_ids
(out/'manifest.json').write_text(json.dumps(manifest,separators=(',',':')))
(out/'export-receipt.json').write_text(json.dumps({'book':book.name,'source':bpy.data.filepath,'bakes':str(args.bakes),'pageCount':len(page_ids),'spreads':len(boards),'samples':count,'vertices':sum(p['vertexCount']for p in manifest['parts']),'nodeNamesLabelsUnchanged':True,'sourceSaved':False},indent=2))
print('EXPORT_DONE',len(manifest['parts']),stops,flush=True)
