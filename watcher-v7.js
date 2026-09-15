/* THE HOUSE IS WATCHING — WATCHER V7 */
(function(){'use strict';
function boot(){const g=window.houseGame,T=window.THREE;if(!g||!T||!g.watcherVisual||!g.entityGroup)return setTimeout(boot,120);if(g.__watcherV7)return;g.__watcherV7=true;
 const r=g.watcherVisual,u=r.userData,base=u.tickAnimation,s={mode:'IDLE',t:0,attack:0,freeze:0,head:0,basePos:new T.Vector3(),baseScale:new T.Vector3()};s.basePos.copy(r.position);s.baseScale.copy(r.scale);u.watcherV7=s;
 const head=[];r.traverse(o=>{if(o.isObject3D&&/head|skull/i.test(o.name||''))head.push(o);});
 const old=base;u.tickAnimation=function(time,dt,mode){if(old)old(time,dt,mode);const p=g.player,w=g.entityGroup;if(!p||!w)return;const dx=p.x-w.position.x,dz=p.z-w.position.z,d=Math.hypot(dx,dz),hunt=mode==='HUNTING'||mode==='CHASE',stalk=mode==='STALK'||mode==='INVESTIGATE'||mode==='SEARCH';
  s.t+=dt;s.mode=hunt?'HUNT':stalk?'STALK':(mode||'IDLE');if(hunt)s.attack=Math.min(1,s.attack+dt*(d<3.5?1.9:.55));else s.attack=Math.max(0,s.attack-dt*1.5);
  const light=!!(g.flashlightOn||g.flashlight||g.isFlashlightOn||g.lightOn);const exposed=light&&d<8&&stalk;s.freeze=Math.max(0,s.freeze-dt*1.4);if(exposed)s.freeze=Math.min(1,s.freeze+dt*2.5);
  const close=Math.max(0,Math.min(1,(4-d)/4)),lunge=hunt&&d<2.35?Math.pow(Math.min(1,(2.35-d)/2.35),2):0;
  const targetRot=Math.atan2(dx,dz);let delta=targetRot-r.rotation.y;delta=Math.atan2(Math.sin(delta),Math.cos(delta));r.rotation.y+=delta*Math.min(1,dt*(1.8+close*3));
  r.position.copy(s.basePos);r.position.y-=lunge*.14;r.position.z-=lunge*.3;r.scale.copy(s.baseScale).multiplyScalar(.94+s.attack*.055+lunge*.065);
  r.rotation.x=(hunt?-.025*s.attack:0)-lunge*.04+Math.sin(time*.9)*.004;
  head.forEach((h,i)=>{h.rotation.y=Math.sin(delta)*.22*(1-s.freeze*.65);h.rotation.x=-delta*.06*(1-s.freeze*.5);});
  u.watcherThreat=Math.max(u.watcherThreat||0,close*.55+s.attack*.45);u.flashlightReaction=Math.max(u.flashlightReaction||0,exposed?.85:0);u.watcherLunge=lunge;u.attackIntensity=Math.max(u.attackIntensity||0,s.attack*.35+lunge);u.hitPulse=Math.max(u.hitPulse||0,lunge);
 };
 const st=document.createElement('style');st.textContent='.watcher-v7-stare{position:fixed;inset:0;pointer-events:none;z-index:995;opacity:0;background:radial-gradient(ellipse at 50% 45%,rgba(255,210,170,.055),transparent 32%,rgba(0,0,0,.18) 100%);mix-blend-mode:screen}';document.head.appendChild(st);const fx=document.createElement('div');fx.className='watcher-v7-stare';document.body.appendChild(fx);
 const hud=g.updateHUD?g.updateHUD.bind(g):null;if(hud)g.updateHUD=function(){hud();if(this.state!=='PLAYING')return;const q=r.userData.watcherV7||s;fx.style.opacity=String(Math.min(.38,(q.watcherThreat||0)*.22+(q.flashlightReaction||0)*.18));};
}boot();})();