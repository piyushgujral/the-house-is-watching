/* THE HOUSE IS WATCHING — Engine 46: Survivor Communication & Shared Information Director v1
 * Limited-information co-op communication: danger pings, Watcher sightings,
 * evidence sharing, rescue signals and objective ownership. Host-authoritative.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame;
 if(!g||!g.scene||!g.player||!g.survivorTeamDirector||!g.watcherHuntPlanner)return setTimeout(boot,500);
 if(g.__engine46)return;g.__engine46=true;
 const team=g.survivorTeamDirector, planner=g.watcherHuntPlanner;
 const net=g.partyNetwork&&g.partyNetwork.net;
 const now=()=>performance.now(), scale=()=>g.scene.scale&&g.scene.scale.x||1;
 const state={version:1,nextId:1,signals:[],lastBroadcast:0,lastLocalDanger:0,lastWatcherRoom:null,sharedEvidence:[],objectiveOwner:null};
 const hud=document.createElement('div');hud.id='survivor-comms-hud';hud.style.cssText='position:fixed;top:112px;left:50%;transform:translateX(-50%);padding:8px 13px;background:rgba(3,4,5,.94);border:1px solid rgba(205,215,220,.32);color:#dce4e8;font:700 9px/1.4 monospace;letter-spacing:1px;z-index:131;pointer-events:none;display:none;text-align:center;max-width:90vw';hud.innerHTML='<span id="sc-title">TEAM COMMS</span><span id="sc-detail" style="opacity:.72;margin-left:8px"></span>';document.body.appendChild(hud);
 function show(a,b,ms){hud.style.display='block';hud.querySelector('#sc-title').textContent=a;hud.querySelector('#sc-detail').textContent=b||'';clearTimeout(show.timer);show.timer=setTimeout(()=>hud.style.display='none',ms||2200);}
 function roomAt(obj){const R=planner.rooms||{},s=scale();let best='HALL',bd=1e9;Object.keys(R).forEach(k=>{const r=R[k],d=Math.hypot(obj.position.x/s-r.x,obj.position.z/s-r.z);if(d<bd){bd=d;best=k;}});return best;}
 function watcher(){return g.watcher||g.watcherMonster||g.watcherEntity||null;}
 function members(){const a=[];if(g.player)a.push({id:'local',object:g.player,state:g.state==='PLAYING'?'ALIVE':'DEAD',name:'YOU'});if(g.coop&&g.coop.members)for(const m of g.coop.members.values())if(m.object)a.push(m);return a.filter(m=>m.state!=='DEAD');}
 function addSignal(type,room,from,ttl,meta){
  const s={id:state.nextId++,type,room,from:from||'YOU',created:now(),expires:now()+(ttl||7000),meta:meta||{}};
  state.signals.push(s);if(state.signals.length>32)state.signals.splice(0,state.signals.length-32);return s;
 }
 function ping(type,room,meta){const s=addSignal(type,room,'YOU',6500,meta);show(type.replace(/_/g,' '),room,2200);return s;}
 function cleanup(){const t=now();state.signals=state.signals.filter(s=>s.expires>t);state.sharedEvidence=state.sharedEvidence.filter(s=>s.expires>t);}
 function danger(){const w=watcher(),p=g.player;if(!w||!p)return 0;const d=Math.hypot((p.position.x-w.position.x)/scale(),(p.position.z-w.position.z)/scale());return Math.max(0,1-d/14);}
 function detectWatcher(){
  const p=g.player,w=watcher();if(!p||!w)return;
  const r=roomAt(w),d=danger();
  if(r!==state.lastWatcherRoom){state.lastWatcherRoom=r;if(d>.38){addSignal('WATCHER_SIGHTING',r,'HOUSE',6500,{confidence:d});show('WATCHER SIGHTING',r,2600);}}
  if(d>.82&&now()-state.lastLocalDanger>3000){state.lastLocalDanger=now();ping('DANGER',roomAt(p),{confidence:d});}
 }
 function shareEvidence(){
  const e=g.watcherEvidence&&g.watcherEvidence.state;
  if(!e)return;
  const rooms=e.rooms||e.evidence||{};
  Object.keys(rooms).forEach(r=>{const x=rooms[r];if(!x)return;const score=Number(x.confidence||x.score||x.heat||0);if(score>.62&&!state.sharedEvidence.some(s=>s.room===r)){state.sharedEvidence.push({room:r,confidence:score,expires:now()+10000});addSignal('EVIDENCE',r,'HOUSE',9000,{confidence:score});show('EVIDENCE SHARED',r,1800);}});
 }
 function objective(){
  const o=team.state&&team.state.objective;if(!o||!o.room)return;
  if(state.objectiveOwner&&state.objectiveOwner.room===o.room)return;
  const ms=members().filter(m=>m.state!=='DOWNED');if(!ms.length)return;
  const target={position:{x:(planner.rooms[o.room]?.x||0)*scale(),z:(planner.rooms[o.room]?.z||0)*scale()}};
  ms.sort((a,b)=>Math.hypot(a.object.position.x-target.position.x,a.object.position.z-target.position.z)-Math.hypot(b.object.position.x-target.position.x,b.object.position.z-target.position.z));
  state.objectiveOwner={room:o.room,owner:ms[0].id,expires:now()+12000};addSignal('OBJECTIVE',o.room,ms[0].name||ms[0].id,11000,{owner:ms[0].id});show('OBJECTIVE OWNER',ms[0].name||ms[0].id+' / '+o.room,2200);
 }
 function rescue(){const a=team.state&&team.state.active;if(!a||!/RESCUE/.test(a.type))return;if(!state.signals.some(s=>s.type==='RESCUE'&&s.room===a.room))addSignal('RESCUE',a.room,'TEAM',Math.max(3000,a.expires-now()),{target:a.targetId,helper:a.helperId});}
 function broadcast(){
  if(!net||!net.connected||net.role!=='host'||!net.send)return;
  cleanup();try{net.send({type:'survivor_comms',version:++state.version,signals:state.signals.slice(-18),evidence:state.sharedEvidence.slice(-10),objectiveOwner:state.objectiveOwner});state.lastBroadcast=now();}catch(e){}
 }
 function remote(m){if(!m)return;const incoming=(m.signals||[]).filter(s=>s.expires>now());incoming.forEach(s=>{if(!state.signals.some(x=>x.id===s.id)){state.signals.push(s);if(s.from!=='YOU')show(s.type.replace(/_/g,' '),s.room,1800);}});state.sharedEvidence=m.evidence||state.sharedEvidence;state.objectiveOwner=m.objectiveOwner||state.objectiveOwner;cleanup();}
 function tick(){if(g.state!=='PLAYING')return;cleanup();detectWatcher();shareEvidence();objective();rescue();}
 if(net&&net.on)net.on('survivor_comms',remote);
 setInterval(tick,650);setInterval(()=>{if(g.state==='PLAYING'&&(!net||!net.connected||net.role==='host'))broadcast();},1500);
 g.survivorCommsDirector={state,ping,addSignal,remote,cleanup,roomAt};
 show('TEAM COMMS','Shared danger, sightings, evidence and rescue signals enabled.',3000);
}
boot();
})();
