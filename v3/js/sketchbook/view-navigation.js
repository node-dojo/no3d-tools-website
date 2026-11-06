const ZOOM_LIMITS={frames:{min:1,max:4},three:{min:.65,max:6}};
export function viewLimits(mode){return ZOOM_LIMITS[mode]||ZOOM_LIMITS.frames;}
export function panLimits(view,zoom,mode){
  const side=Math.min(view.width,view.height)*zoom;
  if(mode==='three')return {x:side/(2*view.width)+.35,y:side/(2*view.height)+.35};
  return {x:Math.max(0,(side-view.width)/(2*view.width)),y:Math.max(0,(side-view.height)/(2*view.height))};
}
export function isFitView(state){return Math.abs(state.zoom-1)<.05&&Math.hypot(state.panX,state.panY)<.025;}
