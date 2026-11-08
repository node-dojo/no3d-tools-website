import * as THREE from '../../vendor/sketchbook-three/three.module.js';
import {tiltTarget,stepSpring,limitTilt,createPullTilt} from './soft-tilt.js';
import {createPoseStore} from './pose-store.js';
import {deformPose} from './deform-pose.js';
import {createViewMotion} from './view-motion.js';
import {bookNavigation} from './books.js?v=product-books-1';
export async function createThreeRenderer(canvas,rootManifest,{onStatus=()=>{},onError=()=>{},signal,initialProgress,fetcher=fetch}={}){
  const manifestURL=rootManifest.three.manifest;
  const base=manifestURL.slice(0,manifestURL.lastIndexOf('/')+1);
  const response=await fetcher(manifestURL,{signal});if(!response.ok)throw new Error('The sketchbook is unavailable.');
  const manifest=await response.json();
  signal?.throwIfAborted();
  const navigation=bookNavigation(initialProgress===undefined ? manifest : {...manifest,initialProgress},rootManifest);
  onStatus('Preparing 3D graphics…');
  // Keep the last frame visible while the demand-driven renderer is idle.
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
  const scene=new THREE.Scene();
  const pivot=new THREE.Group(),book=new THREE.Group();pivot.add(book);scene.add(pivot);
  const camera=new THREE.PerspectiveCamera(manifest.cameraFov,1,.1,10);
  scene.add(new THREE.HemisphereLight(0xffffff,0x888888,1.45));
  const light=new THREE.DirectionalLight(0xffffff,2.0);light.position.set(-2,3,4);scene.add(light);
  const loader=new THREE.TextureLoader(),textures=new Map(),items=[];
  let state={progress:navigation.initialProgress,zoom:1,panX:0,panY:0},width=1,height=1,raf=0,lastProgress=-1,destroyed=false,drawTimes=[],active=false;
  const viewMotion=createViewMotion(state);let justActivated=false;
  let pointer={x:0,y:0},pitch={value:0,velocity:0},yaw={value:0,velocity:0},lastDraw=0,runtimeError=null;
  const pull=createPullTilt();let motionTilt={pitch:0,yaw:0,moving:false},deformTimes=[],renderTimes=[];
  let resolveFirstDraw,rejectFirstDraw;
  const firstDraw=new Promise((resolve,reject)=>{resolveFirstDraw=resolve;rejectFirstDraw=reject;});
  firstDraw.catch(()=>{});
  const waitingDraws=new Set();
  function rejectDraws(error){for(const pending of waitingDraws)pending.reject(error);waitingDraws.clear();}
  function fail(error){if(runtimeError||destroyed)return;runtimeError=error;rejectFirstDraw(error);rejectDraws(error);onError(error);}
  function contextLost(event){event.preventDefault();fail(new Error('3D graphics were interrupted. Tap Retry to reload the book.'));}
  canvas.addEventListener('webglcontextlost',contextLost);
  renderer.debug.onShaderError=()=>{throw new Error('The 3D shader could not compile on this browser.');};
  const poses=createPoseStore(manifest,base,{onChange:requestDraw,onError:fail,fetcher});
  async function textureFor(info){
    if(!info.texture)return null;
    if(!textures.has(info.texture))textures.set(info.texture,(async()=>{
      const response=await fetcher(base+info.texture,{signal});
      if(!response.ok)throw new Error('A sketchbook page could not load.');
      const url=URL.createObjectURL(await response.blob());
      let t;
      try{t=await loader.loadAsync(url);}finally{URL.revokeObjectURL(url);}
      t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=info.extension==='CLIP'?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;
    })());
    return textures.get(info.texture);
  }
  let loadedTextures=0;
  onStatus('Loading the first view…');
  const loading=Promise.all([poses.ready(state.progress*(manifest.sampleCount-1)),Promise.all(manifest.parts.map(async (part,index)=>{
    const texture=await textureFor(part.material);
    if(destroyed)throw new Error('Viewer closed.');
    onStatus(`Loading page textures… ${++loadedTextures} / ${manifest.parts.length}`);
    const positions=new Float32Array(part.vertexCount*3),normals=new Float32Array(positions.length),uv=new Float32Array(part.uv),mapping=part.material.mapping;
    if(mapping){
      const angle=mapping.rotation[2],cos=Math.cos(angle),sin=Math.sin(angle);
      for(let i=0;i<uv.length;i+=2){const x=uv[i]*mapping.scale[0],y=uv[i+1]*mapping.scale[1];uv[i]=x*cos-y*sin+mapping.translation[0];uv[i+1]=x*sin+y*cos+mapping.translation[1];}
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));geometry.setIndex(part.indices);
    geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3).setUsage(THREE.DynamicDrawUsage));
    const color=new THREE.Color().setRGB(...(part.material.color||[.8,.8,.8]));
    const material=new THREE.MeshStandardMaterial({map:texture,color,roughness:part.material.roughness||.9,metalness:0,side:THREE.DoubleSide,alphaTest:part.name.startsWith('stickers')?.15:0});
    if(texture && part.material.artwork){
      // Ink alpha blends onto opaque paper; it never cuts holes in the sheet.
      const paper=part.material.paper || [.92,.90,.85];
      material.onBeforeCompile=shader=>{
        shader.uniforms.paperColor={value:new THREE.Color().setRGB(...paper)};
        shader.fragmentShader='uniform vec3 paperColor;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
          vec4 ink = texture2D(map, vMapUv);
          float inside = step(0.0,vMapUv.x)*step(vMapUv.x,1.0)*step(0.0,vMapUv.y)*step(vMapUv.y,1.0);
          float grain = fract(sin(dot(floor(vMapUv*2048.0),vec2(12.9898,78.233)))*43758.5453);
          vec3 paper = paperColor * (0.985 + 0.015*grain);
          diffuseColor.rgb *= gl_FrontFacing ? mix(paper, ink.rgb, ink.a*inside) : paper;
          diffuseColor.a = 1.0;
        `);
      };
      material.customProgramCacheKey=()=> 'opaque-paper-artwork-v1';
    } else if(texture&&part.material.extension==='CLIP'){
      material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','if (any(lessThan(vMapUv, vec2(0.0))) || any(greaterThan(vMapUv, vec2(1.0)))) discard;\n#include <map_fragment>');};
      material.customProgramCacheKey=()=> 'clip-image-boundaries';
    } else if(part.name.startsWith('pages')){
      material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nif (!gl_FrontFacing) diffuseColor.rgb = vec3(1.0);');};
      material.customProgramCacheKey=()=> 'paper-backface';
    }
    const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;book.add(mesh);
    const sampleOffset=manifest.parts.slice(0,index).reduce((n,p)=>n+p.vertexCount*3,0);
    const item={part,geometry,material,mesh,sampleOffset,positions,normals,indices:geometry.index.array};items.push(item);return item;
  }))]);
  let loadTimeout,abortLoad;
  const aborted=new Promise((_,reject)=>{abortLoad=()=>reject(new DOMException('Book changed.','AbortError'));signal?.addEventListener('abort',abortLoad,{once:true});if(signal?.aborted)abortLoad();});
  try{await Promise.race([loading,aborted,new Promise((_,reject)=>{loadTimeout=setTimeout(()=>reject(new Error('The first view took too long to load. Tap Retry.')),30000);})]);}
  catch(error){destroyed=true;poses.destroy();canvas.removeEventListener('webglcontextlost',contextLost);for(const i of items){i.geometry.dispose();i.material.dispose();}for(const p of textures.values())p.then(t=>t.dispose()).catch(()=>{});renderer.dispose();renderer.forceContextLoss();throw error;}
  finally{clearTimeout(loadTimeout);signal?.removeEventListener('abort',abortLoad);}
  onStatus('Drawing the sketchbook…');
  // Rotate around the middle of the cover, not the camera-space origin.
  const cover=items.find(i=>i.part.name.startsWith('cover'))||items[0],bounds=new THREE.Box3(),point=new THREE.Vector3();
  const initialPose=poses.get(state.progress*(manifest.sampleCount-1));
  const offset=cover.sampleOffset*initialPose.count+initialPose.a*cover.positions.length;
  for(let i=0;i<cover.positions.length;i+=3){
    point.set(...[0,1,2].map(axis=>cover.part.min[axis]+initialPose.data[offset+i+axis]/65535*cover.part.span[axis]));bounds.expandByPoint(point);
  }
  bounds.getCenter(pivot.position);book.position.copy(pivot.position).negate();
  const motionQuery=matchMedia('(prefers-reduced-motion:reduce)');
  const sampleCount=manifest.sampleCount;
  function resetTilt(){pointer={x:0,y:0};pitch={value:0,velocity:0};yaw={value:0,velocity:0};pull.reset();motionTilt={pitch:0,yaw:0,moving:false};pivot.rotation.set(0,0,0);lastDraw=0;}
  function onMotionPreference(){resetTilt();viewMotion.reset(state);requestDraw();}
  motionQuery.addEventListener('change',onMotionPreference);
  function draw(now){
    raf=0;if(destroyed||!active||runtimeError)return;
    try{drawFrame(now);}catch(error){fail(error);}
  }
  function drawFrame(now){
    const frame=state.progress*(sampleCount-1),pose=poses.get(frame);
    if(!pose&&lastProgress<0)return;
    const dt=lastDraw?Math.min((now-lastDraw)/1000,.05):1/60;lastDraw=now;
    const displayed=viewMotion.step(dt,motionQuery.matches);
    const target=motionQuery.matches?{pitch:0,yaw:0}:tiltTarget(pointer.x,pointer.y,displayed.zoom);
    pitch=stepSpring(pitch.value,pitch.velocity,target.pitch,dt);yaw=stepSpring(yaw.value,yaw.velocity,target.yaw,dt);
    const pointerMoving=Math.abs(pitch.value-target.pitch)+Math.abs(yaw.value-target.yaw)+Math.abs(pitch.velocity)+Math.abs(yaw.velocity)>.00005;
    if(!pointerMoving){pitch={value:target.pitch,velocity:0};yaw={value:target.yaw,velocity:0};}
    motionTilt=motionQuery.matches?{pitch:0,yaw:0,moving:false}:pull.step(dt);
    const moving=pointerMoving||motionTilt.moving||displayed.moving;if(!moving)lastDraw=0;
    const combined=limitTilt(pitch.value+motionTilt.pitch,yaw.value+motionTilt.yaw);
    pivot.rotation.set(combined.pitch,combined.yaw,0,'YXZ');
    // Keep zoom/pan/tilt responsive while a distant pose chunk is downloading.
    if(pose&&state.progress!==lastProgress){
      const started=performance.now();
      for(const item of items){
        deformPose(item,pose);
        item.geometry.attributes.position.needsUpdate=true;item.geometry.attributes.normal.needsUpdate=true;
      }
      deformTimes.push(performance.now()-started);if(deformTimes.length>120)deformTimes.shift();
      lastProgress=state.progress;
    }
    renderer.setViewport(0,0,width,height);renderer.clear();
    const side=Math.min(width,height)*displayed.zoom;
    renderer.setViewport((width-side)/2+displayed.panX*width,(height-side)/2-displayed.panY*height,side,side);
    const renderStarted=performance.now();renderer.autoClear=false;renderer.render(scene,camera);
    renderTimes.push(performance.now()-renderStarted);if(renderTimes.length>120)renderTimes.shift();
    if(renderer.getContext().isContextLost())throw new Error('3D graphics were interrupted. Tap Retry to reload the book.');
    resolveFirstDraw();
    if(lastProgress===state.progress){for(const pending of waitingDraws)pending.resolve();waitingDraws.clear();}
    drawTimes.push(now);drawTimes=drawTimes.filter(t=>now-t<1000);
    canvas.dataset.tiltPitch=(combined.pitch*180/Math.PI).toFixed(3);canvas.dataset.tiltYaw=(combined.yaw*180/Math.PI).toFixed(3);
    if(moving)requestDraw();
  }
  function requestDraw(){if(!raf&&!destroyed&&active)raf=requestAnimationFrame(draw);}
  return {
    navigation,
    ready:firstDraw,
    whenDrawn(){
      if(runtimeError||destroyed)return Promise.reject(runtimeError||new DOMException('Viewer closed.','AbortError'));
      return new Promise((resolve,reject)=>{waitingDraws.add({resolve,reject});requestDraw();});
    },
    upperEdge(viewWidth, viewHeight) {
      if (lastProgress < 0) return null;
      book.updateWorldMatrix(true, false);
      const projection = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(book.matrixWorld);
      const elements = projection.elements;
      let upper = -Infinity;
      for (const {positions} of items) {
        for (let i=0; i<positions.length; i+=3) {
          const x=positions[i], y=positions[i+1], z=positions[i+2];
          const w=elements[3]*x + elements[7]*y + elements[11]*z + elements[15];
          upper=Math.max(upper,(elements[1]*x + elements[5]*y + elements[9]*z + elements[13])/w);
        }
      }
      const shown = viewMotion.get();
      return viewHeight*(.5+shown.panY) - upper*Math.min(viewWidth,viewHeight)*shown.zoom/2;
    },
    setState(next){state={...state,...next};viewMotion.setTarget(state);if(justActivated){viewMotion.reset(state);justActivated=false;}requestDraw();},
    setPointer(x,y){pointer={x,y};requestDraw();},
    reactToMotion(motion){if(motionQuery.matches||!active)return;pull.push({...motion,zoom:viewMotion.get().zoom});requestDraw();},
    captureView(){const {zoom,panX,panY}=viewMotion.get();const current={zoom,panX,panY};state={...state,...current};viewMotion.reset(current);requestDraw();return current;},
    offscreenDirection(view) {
      if (lastProgress < 0) return null;
      book.updateWorldMatrix(true, false);
      const e = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(book.matrixWorld).elements;
      let left=Infinity, right=-Infinity, top=Infinity, bottom=-Infinity;
      const side=Math.min(width,height)*view.zoom;
      // Only measured on release, so inspection adds no per-frame geometry work.
      for (const {positions} of items) for (let i=0;i<positions.length;i+=3) {
        const x=positions[i], y=positions[i+1], z=positions[i+2];
        const w=e[3]*x+e[7]*y+e[11]*z+e[15];
        const px=width*(.5+view.panX)+(e[0]*x+e[4]*y+e[8]*z+e[12])/w*side/2;
        const py=height*(.5+view.panY)-(e[1]*x+e[5]*y+e[9]*z+e[13])/w*side/2;
        left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py);
      }
      if (right < width*.12) return {x:-1};
      if (left > width*.88) return {x:1};
      if (bottom < height*.12) return {y:-1};
      if (top > height*.88) return {y:1};
      return null;
    },
    setActive(value){active=value;justActivated=value;if(!value){cancelAnimationFrame(raf);raf=0;resetTilt();viewMotion.reset(state);}else requestDraw();},
    resize(w,h,pixelRatio=1){width=w;height=h;renderer.setPixelRatio(Math.min(pixelRatio,2));renderer.setSize(w,h,false);requestDraw();},
    getStats(){const average=values=>values.reduce((a,b)=>a+b,0)/Math.max(1,values.length),shown=viewMotion.get();return {renderer:'Baked 3D deformation',samples:sampleCount,vertices:items.reduce((n,i)=>n+i.part.vertexCount,0),...poses.getStats(),decodedMemoryMB:poses.getStats().poseMemoryMB+items.reduce((n,i)=>n+i.positions.byteLength+i.normals.byteLength,0)/1048576,drawsPerSecond:drawTimes.filter(t=>performance.now()-t<1000).length,deformationMs:average(deformTimes),renderSubmitMs:average(renderTimes),displayedProgress:lastProgress,viewZoom:shown.zoom,viewPanX:shown.panX,viewPanY:shown.panY,viewFollowing:shown.moving,tiltDegrees:Math.hypot(pivot.rotation.x,pivot.rotation.y)*180/Math.PI,pullTiltDegrees:Math.hypot(motionTilt.pitch,motionTilt.yaw)*180/Math.PI,detail:'Air-damped pan/zoom · reactive tilt · exact rig geometry and normals',geometryMemoryOnly:true};},
    destroy(){destroyed=true;const error=new DOMException('Viewer closed.','AbortError');rejectFirstDraw(error);rejectDraws(error);poses.destroy();cancelAnimationFrame(raf);canvas.removeEventListener('webglcontextlost',contextLost);motionQuery.removeEventListener('change',onMotionPreference);for(const i of items){i.geometry.dispose();i.material.dispose();}for(const p of textures.values())p.then(t=>t.dispose()).catch(()=>{});renderer.dispose();renderer.forceContextLoss();}
  };
}
