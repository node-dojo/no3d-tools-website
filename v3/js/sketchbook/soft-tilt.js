const POINTER_LIMIT=4*Math.PI/180,COMBINED_LIMIT=5*Math.PI/180;

// A circular limit keeps diagonal movement within the same four-degree cone.
export function tiltTarget(x,y,zoom=1){
  const radius=Math.max(1,Math.hypot(x,y));
  const strength=POINTER_LIMIT/Math.max(1,zoom);
  return {pitch:-y/radius*strength,yaw:x/radius*strength};
}

// Exact critically damped spring step: stable across changing refresh rates.
export function stepSpring(value,velocity,target,seconds,frequency=12){
  const offset=value-target,decay=Math.exp(-frequency*seconds);
  const term=velocity+frequency*offset;
  return {value:target+(offset+term*seconds)*decay,velocity:(velocity-frequency*term*seconds)*decay};
}

export function limitTilt(pitch,yaw,limit=COMBINED_LIMIT){
  const scale=Math.min(1,limit/(Math.hypot(pitch,yaw)||1));return {pitch:pitch*scale,yaw:yaw*scale};
}

// The rotational response trails the gesture slightly, then settles through air.
export function createPullTilt(){
  const limit=3.25*Math.PI/180;
  let pitch={value:0,velocity:0},yaw={value:0,velocity:0};
  return {
    push({panX=0,panY=0,zoomDelta=0,anchorX=0,anchorY=0,zoom=1}){
      const strength=1/Math.sqrt(Math.max(1,zoom)),clamp=value=>Math.max(-1.5,Math.min(1.5,value));
      pitch.velocity=clamp(pitch.velocity+(-panY*15.5+zoomDelta*7*(.35-anchorY*.75))*strength);
      yaw.velocity=clamp(yaw.velocity+(-panX*15.5-zoomDelta*7*anchorX*.75)*strength);
    },
    step(seconds){
      pitch=stepSpring(pitch.value,pitch.velocity,0,seconds,11);yaw=stepSpring(yaw.value,yaw.velocity,0,seconds,11);
      const angle=Math.hypot(pitch.value,yaw.value);
      if(angle>limit){
        const scale=limit/angle;pitch.value*=scale;yaw.value*=scale;
        const outward=(pitch.value*pitch.velocity+yaw.value*yaw.velocity)/(limit*limit);
        if(outward>0){pitch.velocity-=outward*pitch.value;yaw.velocity-=outward*yaw.value;}
      }
      const moving=Math.abs(pitch.value)+Math.abs(yaw.value)+Math.abs(pitch.velocity)+Math.abs(yaw.velocity)>.00005;
      if(!moving){pitch={value:0,velocity:0};yaw={value:0,velocity:0};}
      return {pitch:pitch.value,yaw:yaw.value,moving};
    },
    reset(){pitch={value:0,velocity:0};yaw={value:0,velocity:0};}
  };
}
