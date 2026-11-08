"""Seat cover decals on the animated cover instead of letting relief pierce pages.

Used inside Blender's Python, only on export arrays. Binding is calculated on
the open cover; barycentric weights follow those same triangles in every pose.
"""
import numpy as np
from mathutils.bvhtree import BVHTree

def project_decals(parts, poses, opening_sample):
    cover=next(key for key in parts if key.startswith('cover'))
    triangles=np.array(parts[cover]['indices'],dtype=np.int32).reshape(-1,3)
    surface=poses[cover][opening_sample]
    tree=BVHTree.FromPolygons(surface.tolist(),triangles.tolist(),all_triangles=True)
    cover_poses=np.asarray(poses[cover])
    for key in parts:
        if not key.startswith('stickers'):continue
        original=np.asarray(poses[key][opening_sample]);bound=[];weights=[]
        uv=np.asarray(parts[key]['uv']).reshape(-1,2)
        faces=np.asarray(parts[key]['indices']).reshape(-1,3)
        # Sparse decal triangles need enough vertices to follow the curved paper.
        # Otherwise their flat interiors cut through it between projected corners.
        points=list(original);coords=list(uv);edges={};refined=[];pending=faces.tolist()
        while pending:
            face=pending.pop()
            lengths=[np.linalg.norm(points[face[i]][:2]-points[face[(i+1)%3]][:2]) for i in range(3)]
            longest=int(np.argmax(lengths))
            if lengths[longest]<=.03:
                refined.append(face);continue
            a,b,c=[face[(longest+i)%3] for i in range(3)]
            edge=tuple(sorted((a,b)))
            if edge not in edges:
                edges[edge]=len(points);points.append((points[a]+points[b])*.5);coords.append((coords[a]+coords[b])*.5)
            mid=edges[edge];pending.extend([(a,mid,c),(mid,b,c)])
        original=np.asarray(points);uv=np.asarray(coords);faces=np.asarray(refined)
        parts[key]['uv']=uv.ravel().tolist();parts[key]['indices']=faces.ravel().tolist()
        for point in original:
            hit,_,index,_=tree.ray_cast((float(point[0]),float(point[1]),float(surface[:,2].max()+1)),(0,0,-1))
            if hit is None:raise RuntimeError('Decal falls outside cover: '+key)
            triangle=triangles[index];a,b,c=surface[triangle]
            v0=b-a;v1=c-a;v2=np.asarray(hit)-a
            d00=np.dot(v0,v0);d01=np.dot(v0,v1);d11=np.dot(v1,v1)
            d20=np.dot(v2,v0);d21=np.dot(v2,v1);denom=d00*d11-d01*d01
            v=(d11*d20-d01*d21)/denom;w=(d00*d21-d01*d20)/denom
            bound.append(triangle);weights.append([1-v-w,v,w])
        corners=cover_poses[:,np.asarray(bound)]
        normals=np.cross(corners[:,:,1]-corners[:,:,0],corners[:,:,2]-corners[:,:,0])
        # Keep the offset on the interior-facing side in every animated pose.
        sign=np.where(normals[opening_sample,:,2]<0,-1,1)
        normals*=sign[None,:,None]
        normals/=np.maximum(np.linalg.norm(normals,axis=2,keepdims=True),1e-12)
        # Separate stacked sticker base/ink without retaining the source relief.
        offset=.00008 if 'base' in key else .00018
        poses[key]=((corners*np.asarray(weights)[None,:,:,None]).sum(axis=2)+normals*offset).astype(np.float32)
