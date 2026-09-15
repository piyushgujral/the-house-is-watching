/* THE HOUSE IS WATCHING — WATCHER V4
 * Cinematic creature presentation: locomotion, stalking posture, attack wind-up,
 * hitbox-safe jumpscare presentation and distance-based visual/audio pressure.
 * No external assets; Three.js r128 compatible.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.entityGroup||!g.watcherVisual)return setTimeout(boot,100);
 if(g.__watcherV4)return;g.__watcherV4=true;
 const root=g.watcherVisual;
 const state={phase:'IDLE',t:0,attack:0,wasHunting:false,lastDistance:99,flash:0};
 root.userData.watcherV4=state;
 const find=(name)=>{let r=null;root.traverse(o=>{if(!r&&o.name===name)r=o});return r};
 // Give the creature a stable animation clock without replacing the AI.
 const originalTick=root.userData.tickAnimation;
 root.userData.tickAnimation=function(time,dt,mode){
   if(originalTick)originalTick(time,dt,mode);
   state.t+=dt;
   const p=g.player,w=g.entityGroup;
   if(!p||!w)return;
   const dx=p.x-w.position.x,dz=p.z-w.position.z,d=Math.hypot(dx,dz);
   state.lastDistance=d;
   const hunting=mode==='HUNTING'||mode==='CHASE';
   const stalking=mode==='STALK'||mode==='INVESTIGATE'||mode==='SEARCH';
   if(hunting&&!state.wasHunting){state.phase='WINDUP';state.attack=0;}
   if(!hunting&&state.wasHunting)state.phase='IDLE';
   state.wasHunting=hunting;
   if(hunting){
     state.attack=Math.min(1,state.attack+dt*(d<3?1.8:.55));
     // Forward lean and predatory gait.
     root.rotation.x=Math.sin(time*8)*.012;
     root.position.y-=Math.max(0,3.4-d)*.025;
     if(d<2.7){
       state.phase='ATTACK';
       const pulse=Math.max(0,1-Math.abs(Math.sin(time*5.5)));
       root.scale.setScalar(.94+state.attack*.09+pulse*.035);
       if(g.audio&&g.audio.heartbeat)g.audio.heartbeat(Math.min(1,(3-d)/3));
       state.flash=Math.min(1,state.flash+dt*3);
     }else{state.phase='CHASE';root.scale.setScalar(.94+state.attack*.04);}
   }else if(stalking){
     root.scale.setScalar(.92+Math.sin(time*1.7)*.012);
     root.rotation.x=Math.sin(time*.8)*.008;
   }else{
     root.scale.setScalar(.92+Math.sin(time*1.1)*.008);
     root.rotation.x=0;
   }
   state.flash=Math.max(0,state.flash-dt*2.2);
   // The monster becomes visually unstable only during a close encounter.
   root.userData.attackIntensity=state.flash;
 };
 // Add a lightweight fullscreen attack flash. It is intentionally subtle.
 const style=document.createElement('style');style.textContent='.watcher-attack-flash{position:fixed;inset:0;pointer-events:none;z-index:999;background:radial-gradient(circle,rgba(255,255,255,.10),rgba(80,0,0,.18) 55%,rgba(0,0,0,.0));opacity:0;mix-blend-mode:screen}.watcher-attack-flash.on{opacity:1}';document.head.appendChild(style);
 const fx=document.createElement('div');fx.className='watcher-attack-flash';document.body.appendChild(fx);g.watcherAttackFX=fx;
 const oldHUD=g.updateHUD?g.updateHUD.bind(g):null;
 if(oldHUD){g.updateHUD=function(){oldHUD();if(this.state!=='PLAYING')return;const a=root.userData.attackIntensity||0;fx.className=a>.08?'watcher-attack-flash on':'watcher-attack-flash';fx.style.opacity=String(Math.min(.72,a));};}
}
boot();
})();