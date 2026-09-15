/* THE HOUSE IS WATCHING — WATCHER V6
 * Encounter director: flashlight reaction, silhouette behavior and safe attack telegraphing.
 */
(function(){'use strict';
function boot(){const g=window.houseGame,T=window.THREE;if(!g||!T||!g.watcherVisual||!g.entityGroup)return setTimeout(boot,150);if(g.__watcherV6)return;g.__watcherV6=true;
 const r=g.watcherVisual,u=r.userData,s={seen:0,glow:0,encounter:0,lastMode:'',cooldown:0};u.watcherV6=s;
 const style=document.createElement('style');style.textContent='.watcher-v6-eyes{position:fixed;inset:0;pointer-events:none;z-index:997;background:radial-gradient(circle at 50% 50%,rgba(255,210,170,.08),transparent 34%);opacity:0;mix-blend-mode:screen}.watcher-v6-label{position:fixed;left:50%;bottom:18%;transform:translateX(-50%);font:700 11px Arial,sans-serif;letter-spacing:3px;color:rgba(255,235,210,.78);text-shadow:0 0 12px #000;opacity:0;pointer-events:none;z-index:996}';document.head.appendChild(style);
 const fx=document.createElement('div');fx.className='watcher-v6-eyes';document.body.appendChild(fx);const label=document.createElement('div');label.className='watcher-v6-label';label.textContent='THE WATCHER SEES YOU';document.body.appendChild(label);
 function flashlightOn(){return !!(g.flashlightOn||g.flashlight||g.isFlashlightOn||g.lightOn);}
 const old=u.tickAnimation;u.tickAnimation=function(time,dt,mode){if(old)old(time,dt,mode);const p=g.player,w=g.entityGroup;if(!p||!w)return;const dx=p.x-w.position.x,dz=p.z-w.position.z,d=Math.hypot(dx,dz);s.cooldown=Math.max(0,s.cooldown-dt);const hunt=mode==='HUNTING'||mode==='CHASE',stalk=mode==='STALK'||mode==='INVESTIGATE'||mode==='SEARCH';
  if(hunt)s.encounter=Math.min(1,s.encounter+dt*.9);else s.encounter=Math.max(0,s.encounter-dt*.45);
  if(stalk&&d<7)s.seen=Math.min(1,s.seen+dt*1.6);else s.seen=Math.max(0,s.seen-dt*.8);
  const flash=flashlightOn()&&d<8;s.glow=Math.max(s.glow-dt*1.8,(flash&&stalk)?.75:0);
  if(flash&&stalk&&s.cooldown<=0){s.cooldown=2.8;s.encounter=Math.min(1,s.encounter+.18);}
  const threat=Math.max(s.encounter,s.seen*.65);fx.style.opacity=String(Math.min(.42,threat*.35+s.glow*.18));label.style.opacity=String(s.glow>.55?.7:0);
  if(s.glow>.55&&r.userData.eyeLight){r.userData.eyeLight.intensity=1.8;}
  r.userData.watcherThreat=threat;r.userData.flashlightReaction=s.glow;
 };
}boot();})();