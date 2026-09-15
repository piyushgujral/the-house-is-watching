/* THE HOUSE IS WATCHING — WATCHER V4
 * Cinematic creature presentation layer. Keeps engine22 AI authoritative.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.entityGroup||!g.watcherVisual)return setTimeout(boot,100);
 if(g.__watcherV4)return;g.__watcherV4=true;
 const root=g.watcherVisual,U=root.userData,baseTick=U.tickAnimation;
 const state={phase:'IDLE',t:0,attack:0,wasHunting:false,lastDistance:99,flash:0,hitPulse:0,baseScale:new T.Vector3(1,1,1),basePosition:new T.Vector3()};
 state.baseScale.copy(root.scale);state.basePosition.copy(root.position);U.watcherV4=state;
 U.tickAnimation=function(time,dt,mode){
  if(baseTick)baseTick(time,dt,mode);
  const p=g.player,w=g.entityGroup;if(!p||!w)return;
  state.t+=dt;
  const d=Math.hypot(p.x-w.position.x,p.z-w.position.z);state.lastDistance=d;
  const hunting=mode==='HUNTING'||mode==='CHASE',stalking=mode==='STALK'||mode==='INVESTIGATE'||mode==='SEARCH';
  if(hunting&&!state.wasHunting){state.phase='WINDUP';state.attack=0;state.hitPulse=0;}
  if(!hunting&&state.wasHunting){state.phase='IDLE';state.attack=0;}
  state.wasHunting=hunting;
  if(hunting){
   state.attack=Math.min(1,state.attack+dt*(d<3.1?2.2:.65));root.rotation.x=Math.sin(time*8)*.012;
   if(d<3.1){state.phase='ATTACK';const pulse=Math.max(0,1-Math.abs(Math.sin(time*5.5)));state.flash=Math.min(1,state.flash+dt*3.4);state.hitPulse=Math.max(state.hitPulse,pulse);}
   else{state.phase='CHASE';}
  }else if(stalking){state.attack=Math.max(0,state.attack-dt*1.4);root.rotation.x=Math.sin(time*.8)*.008;}
  else{state.attack=Math.max(0,state.attack-dt*2);root.rotation.x=0;}
  state.flash=Math.max(0,state.flash-dt*2.2);state.hitPulse=Math.max(0,state.hitPulse-dt*4);
  const pulse=state.hitPulse,lean=state.attack*.035;
  root.position.copy(state.basePosition);root.position.y-=lean+pulse*.12;root.position.z-=pulse*.22;
  const sc=.92+state.attack*(hunting? .11:.035)+pulse*.04;root.scale.copy(state.baseScale).multiplyScalar(sc);
  U.attackIntensity=state.flash;U.hitPulse=pulse;
 };
 const style=document.createElement('style');style.textContent='.watcher-attack-flash{position:fixed;inset:0;pointer-events:none;z-index:999;background:radial-gradient(circle,rgba(255,255,255,.08),rgba(70,0,0,.24) 55%,rgba(0,0,0,0) 78%);opacity:0;mix-blend-mode:screen}.watcher-threat-vignette{position:fixed;inset:0;pointer-events:none;z-index:998;box-shadow:inset 0 0 0 rgba(80,0,0,0);opacity:0}.watcher-threat-vignette.on{opacity:1}';document.head.appendChild(style);
 const fx=document.createElement('div');fx.className='watcher-attack-flash';document.body.appendChild(fx);const vig=document.createElement('div');vig.className='watcher-threat-vignette';document.body.appendChild(vig);g.watcherAttackFX=fx;
 const oldHUD=g.updateHUD?g.updateHUD.bind(g):null;if(oldHUD)g.updateHUD=function(){oldHUD();if(this.state!=='PLAYING')return;const a=root.userData.attackIntensity||0;fx.style.opacity=String(Math.min(.82,a));const close=Math.max(0,Math.min(1,(3.8-(root.userData.watcherV4?.lastDistance||99))/3.8));vig.style.boxShadow='inset 0 0 '+Math.round(90*close)+'px rgba(70,0,0,'+(close*.7)+')';};
}
boot();
})();