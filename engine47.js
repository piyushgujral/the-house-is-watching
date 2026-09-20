/* THE HOUSE IS WATCHING — Engine 47: Survivor Communication UI & Interaction Layer v1
 * Converts Engine 46's limited-information communication state into usable
 * PC/mobile contextual pings, directional room signals, acknowledgement and expiry.
 * Host-authoritative transport remains in Engine 46; this layer is presentation/input.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame;
 if(!g||!g.survivorCommsDirector||!g.scene)return setTimeout(boot,500);
 if(g.__engine47)return;g.__engine47=true;
 const comms=g.survivorCommsDirector;
 const planner=g.watcherHuntPlanner;
 const now=()=>performance.now();
 const scale=()=>g.scene.scale&&g.scene.scale.x||1;
 const root=document.createElement('div');root.id='survivor-comms-ui';root.style.cssText='position:fixed;inset:0;z-index:132;pointer-events:none;font:700 10px/1.3 monospace;letter-spacing:1px;color:#e7eef0;';
 root.innerHTML='<div id="sc-feed" style="position:absolute;top:148px;left:18px;width:min(270px,72vw);display:flex;flex-direction:column;gap:5px"></div><div id="sc-ping-wheel" style="position:absolute;bottom:112px;left:50%;transform:translateX(-50%);display:none;gap:5px;pointer-events:auto"></div><div id="sc-radial" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);display:none;min-width:180px;text-align:center;padding:12px;background:rgba(3,4,5,.94);border:1px solid rgba(220,230,235,.32)"></div>';
 document.body.appendChild(root);
 const feed=root.querySelector('#sc-feed'),wheel=root.querySelector('#sc-ping-wheel'),radial=root.querySelector('#sc-radial');
 const choices=[['DANGER','DANGER'],['WATCHER_SIGHTING','WATCHER'],['EVIDENCE','EVIDENCE'],['RESCUE','RESCUE'],['REGROUP','REGROUP'],['OBJECTIVE','OBJECTIVE']];
 let wheelOpen=false,lastFeed='',lastAck=0;
 function isPlaying(){return g.state==='PLAYING';}
 function roomAtPlayer(){return comms.roomAt(g.player||{position:{x:0,z:0}});}
 function addFeed(s){
  const key=s.id+':'+s.type;if(key===lastFeed)return;lastFeed=key;
  const el=document.createElement('div');el.style.cssText='padding:6px 8px;background:rgba(3,4,5,.84);border-left:2px solid rgba(220,230,235,.55);opacity:.92;max-width:260px';
  const label=(s.type||'SIGNAL').replace(/_/g,' ');const from=s.from&&s.from!=='YOU'?' / '+s.from:'';el.textContent=label+'  '+s.room+from;feed.prepend(el);
  while(feed.children.length>4)feed.lastChild.remove();setTimeout(()=>{el.style.opacity='.35';},2200);setTimeout(()=>el.remove(),6500);
 }
 function nearestSignals(){
  const list=(comms.state.signals||[]).filter(s=>s.expires>now()).slice(-8).reverse();return list;
 }
 function refresh(){
  nearestSignals().forEach(addFeed);
  if(!wheelOpen){const active=nearestSignals()[0];if(active&&active.created>now()-900)showDirection(active);}
 }
 function showDirection(s){
  if(!g.player||!planner||!planner.rooms||!planner.rooms[s.room])return;
  const r=planner.rooms[s.room],p=g.player,sc=scale();const dx=r.x-(p.position.x/sc),dz=r.z-(p.position.z/sc);let dir=Math.atan2(dx,-dz)*180/Math.PI;if(dir<0)dir+=360;
  const labels=['N','NE','E','SE','S','SW','W','NW'];const sector=Math.round(dir/45)%8;const distance=Math.round(Math.hypot(dx,dz));
  radial.style.display='block';radial.textContent='◈ '+(s.type||'SIGNAL').replace(/_/g,' ')+'  '+labels[sector]+'  '+distance+'m';clearTimeout(showDirection.timer);showDirection.timer=setTimeout(()=>{radial.style.display='none';},1800);
 }
 function send(type){
  if(!isPlaying()||!comms.ping)return;
  const room=roomAtPlayer();const s=comms.ping(type,room,{source:'PLAYER',ack:false});if(s)addFeed(s);closeWheel();
 }
 function openWheel(){if(!isPlaying())return;wheelOpen=true;wheel.innerHTML='';wheel.style.display='flex';choices.forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.textContent=(i+1)+' '+c[1];b.style.cssText='background:rgba(3,4,5,.96);color:#e7eef0;border:1px solid rgba(220,230,235,.35);padding:8px 9px;font:700 9px monospace;min-width:58px;touch-action:manipulation';b.onclick=()=>send(c[0]);wheel.appendChild(b);});}
 function closeWheel(){wheelOpen=false;wheel.style.display='none';}
 function toggle(){wheelOpen?closeWheel():openWheel();}
 function key(e){if(!isPlaying())return;if(e.code==='KeyG'){e.preventDefault();toggle();}if(wheelOpen&&/^Digit[1-6]$/.test(e.code)){e.preventDefault();send(choices[Number(e.code.slice(-1))-1][0]);}if(e.code==='Escape')closeWheel();}
 window.addEventListener('keydown',key,{passive:false});
 function mobile(){return matchMedia('(pointer:coarse)').matches||innerWidth<760;}
 const mobileBtn=document.createElement('button');mobileBtn.id='btn-comms';mobileBtn.textContent='COMMS';mobileBtn.style.cssText='position:fixed;right:18px;bottom:154px;z-index:133;display:none;padding:10px 13px;background:rgba(3,4,5,.86);border:1px solid rgba(220,230,235,.4);color:#e7eef0;font:700 10px monospace;pointer-events:auto;touch-action:manipulation';mobileBtn.onclick=toggle;document.body.appendChild(mobileBtn);
 function resize(){mobileBtn.style.display=mobile()?'block':'none';}
 window.addEventListener('resize',resize);resize();
 const ack=document.createElement('button');ack.id='btn-comms-ack';ack.textContent='ACK';ack.style.cssText='position:fixed;right:18px;bottom:196px;z-index:133;display:none;padding:8px 12px;background:rgba(3,4,5,.86);border:1px solid rgba(220,230,235,.3);color:#e7eef0;font:700 9px monospace;pointer-events:auto;touch-action:manipulation';ack.onclick=()=>{lastAck=now();ack.style.display='none';const s=nearestSignals()[0];if(s){s.ack=true;comms.state.signals=comms.state.signals.filter(x=>x.id!==s.id||x.expires>now());}};document.body.appendChild(ack);
 setInterval(()=>{if(!isPlaying())return;refresh();const s=nearestSignals()[0];if(s&&s.from!=='YOU'&&now()-lastAck>4000)ack.style.display=mobile()?'block':'none';else ack.style.display='none';},500);
 g.survivorCommsUI={openWheel,closeWheel,send,refresh,showDirection};
}
boot();
})();
