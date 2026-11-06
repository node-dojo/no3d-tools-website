import {stepSpring} from './soft-tilt.js';
import {viewLimits} from './view-navigation.js';

// Equal springs on scale and translation keep a fixed zoom focal point aligned.
// At a steady drag, frequency 26 gives about 77 ms of positional follow-through.
export function createViewMotion(initial){
  const keys=['zoom','panX','panY'],frequency=26,limits=viewLimits('three');
  let target={},axes={},moving=false;
  function reset(next){for(const key of keys){target[key]=next[key];axes[key]={value:next[key],velocity:0};}moving=false;}
  function get(){return {zoom:axes.zoom.value,panX:axes.panX.value,panY:axes.panY.value,moving};}
  reset(initial);
  return {
    get,reset,
    setTarget(next){for(const key of keys)target[key]=next[key];},
    step(seconds,immediate=false){
      if(immediate){reset(target);return get();}
      let error=0,speed=0;
      for(const key of keys){axes[key]=stepSpring(axes[key].value,axes[key].velocity,target[key],seconds,frequency);error+=Math.abs(axes[key].value-target[key]);speed+=Math.abs(axes[key].velocity);}
      // Fast reversals can carry a little residual velocity into the zoom limit.
      const bounded=Math.max(limits.min,Math.min(limits.max,axes.zoom.value));
      if(bounded!==axes.zoom.value)axes.zoom={value:bounded,velocity:0};
      moving=error>.00001||speed>.0001;
      if(!moving)reset(target);
      return get();
    }
  };
}
