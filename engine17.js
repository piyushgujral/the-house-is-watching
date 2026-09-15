/* THE HOUSE IS WATCHING — Engine 17 V2: Watcher Presence System */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.entityGroup||!g.player||!g.scene)return setTimeout(boot,80);
 if(g.__engine17)return;g.__engine17=true;
 const state={phase:Math.random()*6.28,encounter:0,vanishCooldown:8,lastDistance:99,pulse:0,overlay:null};g.watcherPresence=state;
 const style=document.createElement('style');style.textContent='.watcher-presence{position:fixed;inset:0;pointer-events:none;z-index:34;opacity:0;transition:opacity .12s;background:radial-gradient(circle at 50% 50%,transparent 43%,rgba(120,180,180,.11) 100%)}';document.head.appendChild(style);
 const overlay=document.createElement('div');overlay.className='watcher-presence';document.body.appendChild(overlay);state.overlay=overlay;
 function visual(){return g.watcherVisual||g.entityGroup;}
 function dist(){const r=visual();return Math.hypot(g.player.x-r.position.x,g.player.z-r.position.z);}
 function facePlayer(dt,r){const dx=g.player.x-r.position.x,dz=g.player.z-r.position.z;if(Math.abs(dx)+Math.abs(dz)<.01)return;let want=Math.atan2(dx,dz),delta=want-r.rotation.y;while(delta>Math.PI)delta-=Math.PI*2;while(delta<-Math.PI)delta+=Math.PI*2;r.rotation.y+=delta*Math.min(1,dt*2.4);}
 const oldEntity=g.updateEntity.bind(g);
 g.updateEntity=function(dt){
   oldEntity(dt);if(this.state!=='PLAYING')return;
   const r=visual();if(!r)return;
   state.phase+=dt;const d=dist(),close=Math.max(0,1-Math.min(d,10)/10),ent=this.entity&&this.entity.state||'OBSERVE';const hunting=ent==='CHASE'||ent==='HUNTING';
   // Preserve the authoritative monster position but add physical presence motion.
   const breath=Math.sin(state.phase*(hunting?5.2:1.65))*(hunting?.018:.009);
   r.scale.y=1+breath;r.rotation.z+=(Math.sin(state.phase*(hunting?4.5:1.1))*(hunting?.045:.018)-r.rotation.z)*Math.min(1,dt*3);
   if(!hunting)facePlayer(dt*.7,r);
   if(r.userData&&typeof r.userData.tickAnimation==='function')r.userData.tickAnimation(state.phase,dt,ent);
   state.pulse=Math.max(0,state.pulse-dt*1.7);
   if(d<6&&(ent==='STALK'||ent==='HUNTING'||ent==='CHASE'))state.pulse=Math.max(state.pulse,close*.9);
   // Make the visible creature subtly fade at medium distance, but never during chase.
   if(!hunting&&d>14)r.visible=false;else r.visible=true;
   overlay.style.opacity=String(Math.min(.52,state.pulse*.48));state.lastDistance=d;
 };
 g.getWatcherSnapshot=function(){const r=visual();return{x:r.position.x,y:r.position.y,z:r.position.z,state:this.entity?this.entity.state:'OBSERVE',distance:dist(),visible:r.visible};};
}
boot();
})();