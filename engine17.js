/* THE HOUSE IS WATCHING — Engine 17: Watcher Presence System.
 * Presence animation targets the authoritative visible Watcher V2 visual.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.entityGroup||!g.player||!g.scene){setTimeout(boot,80);return;}
 if(g.__engine17)return;g.__engine17=true;
 const root=g.watcherVisual||g.entityGroup;
 const state={phase:Math.random()*Math.PI*2,encounter:0,vanishCooldown:7+Math.random()*5,lastDistance:99,pulse:0,eyeMeshes:[],bodyMeshes:[]};
 g.watcherPresence=state;
 root.traverse(o=>{if(!o.isMesh)return;const n=(o.name||'').toLowerCase();if(n.indexOf('head')>=0)state.head=o;if(o.material&&o.material.emissive&&o.material.color){const c=o.material.color.getHex();if(c===0xe8f4ef||c===0xd9ffff)state.eyeMeshes.push(o);}});
 const style=document.createElement('style');style.textContent='.watcher-presence{position:fixed;inset:0;pointer-events:none;z-index:34;opacity:0;transition:opacity .18s;background:radial-gradient(circle at 50% 50%,transparent 42%,rgba(120,180,180,.10) 100%)}';document.head.appendChild(style);
 const overlay=document.createElement('div');overlay.className='watcher-presence';document.body.appendChild(overlay);state.overlay=overlay;
 function dist(){return Math.hypot(g.player.x-root.position.x,g.player.z-root.position.z);}
 function facePlayer(dt){const dx=g.player.x-root.position.x,dz=g.player.z-root.position.z;if(Math.abs(dx)+Math.abs(dz)<.01)return;const desired=Math.atan2(dx,dz);let delta=desired-root.rotation.y;while(delta>Math.PI)delta-=Math.PI*2;while(delta<-Math.PI)delta+=Math.PI*2;root.rotation.y+=delta*Math.min(1,dt*2.2);}
 function setEyes(intensity){for(const e of state.eyeMeshes){const m=e.material;if(m&&m.emissiveIntensity!==undefined)m.emissiveIntensity=intensity;}}
 const oldEntity=g.updateEntity.bind(g);
 g.updateEntity=function(dt){
  oldEntity(dt);if(this.state!=='PLAYING')return;
  state.phase+=dt;state.vanishCooldown-=dt;const d=dist(),close=Math.max(0,1-Math.min(d,10)/10),chase=this.entity.state==='CHASE'||this.entity.state==='HUNTING';
  const breath=Math.sin(state.phase*(chase?5.5:1.7))*(chase?.028:.014);
  root.position.y=-.78+breath;
  root.rotation.z+=(Math.sin(state.phase*(chase?4.5:1.25))*(chase?.035:.012)-root.rotation.z)*Math.min(1,dt*4);
  if(!chase)facePlayer(dt*.65);
  setEyes(Math.min(3.4,.35+close*2.2+(chase?.65:0)));
  state.pulse=Math.max(0,state.pulse-dt*1.8);
  if(d<6&&(this.entity.state==='STALK'||this.entity.state==='HUNTING'||this.entity.state==='CHASE'))state.pulse=Math.max(state.pulse,close*.8);
  if(state.vanishCooldown<=0&&d>6&&d<13&&this.entity.state==='STALK'&&Math.random()<dt*.012){
   state.vanishCooldown=12+Math.random()*10;state.encounter++;root.visible=false;setEyes(0);
   setTimeout(()=>{if(g.state!=='PLAYING')return;const angle=Math.random()*Math.PI*2,r=7+Math.random()*4,b=g.watcherBounds||{minX:-19,maxX:19,minZ:-24,maxZ:24};root.position.x=Math.max(b.minX+1,Math.min(b.maxX-1,g.player.x+Math.cos(angle)*r));root.position.z=Math.max(b.minZ+1,Math.min(b.maxZ-1,g.player.z+Math.sin(angle)*r));root.position.y=-.78;root.visible=true;if(g.audio&&g.audio.whisper)g.audio.whisper();},900+Math.random()*700);
  }
  state.lastDistance=d;overlay.style.opacity=String(Math.min(.48,state.pulse*.42));
 };
 g.getWatcherSnapshot=function(){return{x:root.position.x,y:root.position.y,z:root.position.z,state:this.entity?this.entity.state:'OBSERVE',distance:Math.hypot(this.player.x-root.position.x,this.player.z-root.position.z),visible:root.visible};};
}
boot();
})();
