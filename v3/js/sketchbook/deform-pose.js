// Same triangle accumulation and Float32 writes as computeVertexNormals,
// using contiguous arrays to avoid repeated Vector3/BufferAttribute calls.
export function deformPose(item,pose){
  const {part,positions,normals,indices,sampleOffset}=item;
  const {data,a,b,mix,count}=pose,stride=positions.length,oa=sampleOffset*count+a*stride,ob=sampleOffset*count+b*stride,inverseMix=1-mix;
  const [minX,minY,minZ]=part.min,[spanX,spanY,spanZ]=part.span;
  for(let j=0;j<stride;j+=3){
    positions[j]=minX+(data[oa+j]*inverseMix+data[ob+j]*mix)/65535*spanX;
    positions[j+1]=minY+(data[oa+j+1]*inverseMix+data[ob+j+1]*mix)/65535*spanY;
    positions[j+2]=minZ+(data[oa+j+2]*inverseMix+data[ob+j+2]*mix)/65535*spanZ;
  }
  normals.fill(0);
  for(let i=0;i<indices.length;i+=3){
    const ia=indices[i]*3,ib=indices[i+1]*3,ic=indices[i+2]*3;
    const cbx=positions[ic]-positions[ib],cby=positions[ic+1]-positions[ib+1],cbz=positions[ic+2]-positions[ib+2];
    const abx=positions[ia]-positions[ib],aby=positions[ia+1]-positions[ib+1],abz=positions[ia+2]-positions[ib+2];
    const nx=cby*abz-cbz*aby,ny=cbz*abx-cbx*abz,nz=cbx*aby-cby*abx;
    normals[ia]+=nx;normals[ia+1]+=ny;normals[ia+2]+=nz;
    normals[ib]+=nx;normals[ib+1]+=ny;normals[ib+2]+=nz;
    normals[ic]+=nx;normals[ic+1]+=ny;normals[ic+2]+=nz;
  }
  for(let i=0;i<normals.length;i+=3){
    const x=normals[i],y=normals[i+1],z=normals[i+2],inverse=1/(Math.sqrt(x*x+y*y+z*z)||1);
    normals[i]=x*inverse;normals[i+1]=y*inverse;normals[i+2]=z*inverse;
  }
}
