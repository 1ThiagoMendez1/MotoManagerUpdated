export type ScrollGeometry={left:number;top:number;scrollLeft:number;scrollTop:number;width:number;height:number;viewportHeight:number};
export function normalizeClick(clientX:number,clientY:number,geometry:ScrollGeometry){
  return {x:Math.min(1,Math.max(0,(clientX-geometry.left+geometry.scrollLeft)/geometry.width)),
    y:Math.min(1,Math.max(0,(clientY-geometry.top+geometry.scrollTop)/geometry.height))};
}
export function measuredDepth(geometry:ScrollGeometry){
  return Math.min(100,Math.max(0,100*(geometry.scrollTop+geometry.viewportHeight)/geometry.height));
}
