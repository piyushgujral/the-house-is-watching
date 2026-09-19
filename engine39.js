/* THE HOUSE IS WATCHING — Engine 39: Evidence & Investigation Director v1
 * Converts movement, light, door, hiding and route activity into persistent evidence nodes.
 * The host owns evidence decay/investigation selection; clients receive compact snapshots.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.player||!g.partyNetwork||!g.watcherHuntPlanner||!g.watcherPerception)return setTimeout(boot,400);
 if(g.__engine39)return;g.__engine39=true;
 const planner=g.watcherHuntPlanner, perception=g.watcherPerception, R=planner.rooms, ED=planner.edges;
 const net=g.partyNetwork.net;
 const state={evidence:{},active:null,lastBroadcast:0,lastInvestigation:0,lastTick:0,serial:0};
 const hud=document.createElement('div');hud.id='watcher-evidence-hud';hud.style.cssText='position:fixed;top:214px;left:50%;transform:translateX(-50%);padding:7px 11px;background:rgba(3,3,5,.84);border:1px solid rgba(190,175,155,.24);color:#c9bfb5;font:700 9px/1.35 monospace;letter-spacing:1px;z-index:123;pointer-events:none;display:none;text-align:center';hud.innerHTML='<span id="we-title">INVESTIGATION</span><span id="we-detail" style="opacity:.72;margin-left:8px"></span>';document.body.appendChild(hud);
 function show(a,b,ms){hud.style.display='block';hud.querySelector('#we-title').textContent=a;hud.querySelector('#we-detail').textContent=b||'';clearTimeout(show.timer);show.timer=setTimeout(()=>hud.style.display='none',ms||1600);}
 const scale=()=>g.scene.scale&&g.scene.scale.x||1;
 function roomAt(x,z){let best='HALL',bd=1e9,s=scale();Object.keys(R).forEach(k=>{const d=Math.hypot(x/s-R[k].x,z/s-R[k].z);if(d<bd){bd=d;best=k;}});return best;}
 function ensure(room){return state.evidence[room]||(state.evidence[room]={room,footsteps:0,lights:0,doors:0,hiding:0,route:0,score:0,last:0,source:'unknown'});}
 function add(room,type,amount,source){const e=ensure(room);if(type==='footsteps')e.footsteps+=amount;if(type==='lights')e.lights+=amount;if(type==='doors')e.doors+=amount;if(type==='hiding')e.hiding+=amount;if(type==='route')e.route+=amount;e.score=Math.min(100,e.score+amount*10);e.last=performance.now();e.source=source||e.source;state.serial++;}
 function observeEvidence(){
  const now=performance.now();
  const members=[];if(g.player)members.push({id:'local',object:g.player});if(g.coop&&g.coop.members)for(const m of g.coop.members.values())if(m.id!=='local'&&m.object&&m.state!=='DEAD')members.push(m);
  for(const m of members){const o=m.object,u=o.userData||{},room=roomAt(o.position.x,o.position.z),track=perception.state.tracks[m.id];
   const speed=track?Math.hypot(track.velocity.x,track.velocity.z)/scale():0;
   if(speed>.55&&now-(u.__evFoot||0)>1200){add(room,'footsteps',1,'movement');u.__evFoot=now;}
   const lit=Number(u.flashlightActive||u.lightOn||u.flashlight||0)>0;
   if(lit&&now-(u.__evLight||0)>2500){add(room,'lights',1,'flashlight');u.__evLight=now;}
   const hiding=!!u.isHiding;
   if(hiding&&!u.__evHide){add(room,'hiding',2,'hiding place');u.__evHide=true;}
   if(!hiding)u.__evHide=false;
   const route=track&&track.room===room?track.predictedRoom:room;
   if(route&&route!==room&&now-(u.__evRoute||0)>3500){add(route,'route',1,'predicted route');u.__evRoute=now;}
  }
  // Read interaction traces exposed by existing engines without coupling to their internals.
  const ev=g.houseEvents||g.interactionEvents||[];
  if(Array.isArray(ev))for(const x of ev.slice(-8)){const r=x.room||x.roomId;if(r&&x.type&&/door|open|close/i.test(String(x.type)))add(r,'doors',1,'door interaction');}
 }
 function decay(){const now=performance.now();Object.values(state.evidence).forEach(e=>{if(now-e.last>8000)e.score=Math.max(0,e.score-.65);e.footsteps*=.996;e.lights*=.994;e.doors*=.997;e.route*=.996;e.hiding*=.998;});}
 function strongest(){let best=null,bs=0;Object.values(state.evidence).forEach(e=>{if(e.score>bs){bs=e.score;best=e;}});return best;}
 function pathNext(from,to){if(from===to)return to;const q=[from],prev={[from]:null};while(q.length){const n=q.shift();for(const k of (ED[n]||[])){if(prev[k]!==undefined)continue;prev[k]=n;if(k===to){let c=k;while(prev[c]&&prev[c]!==from)c=prev[c];return c;}q.push(k);}}return (ED[from]||[])[0]||to;}
 function investigate(){
  if(!planner.state||planner.state.mode==='HUNT')return;
  const e=strongest();if(!e||e.score<14)return;
  const target=planner.state.goalRoom||planner.state.currentRoom||'HALL',next=pathNext(target,e.room);
  planner.state.mode='SEARCH';planner.state.goalRoom=e.room;planner.state.waypoint={x:(R[next].x+(Math.random()-.5)*.8)*scale(),y:(g.entityGroup||g.entity).position.y,z:(R[next].z+(Math.random()-.5)*.8)*scale()};state.active={room:e.room,source:e.source,score:e.score,started:performance.now()};state.lastInvestigation=performance.now();
  show('THE WATCHER INVESTIGATES',e.room,2200);
 }
 function broadcast(){if(!net||!net.connected||net.role!=='host'||!net.send)return;const compact=Object.values(state.evidence).map(e=>({room:e.room,score:+e.score.toFixed(1),footsteps:+e.footsteps.toFixed(1),lights:+e.lights.toFixed(1),doors:+e.doors.toFixed(1),hiding:+e.hiding.toFixed(1),route:+e.route.toFixed(1),source:e.source}));try{net.send({type:'watcher_evidence',version:++state.serial,evidence:compact,active:state.active});}catch(e){}}
 function applyRemote(msg){if(!msg||!Array.isArray(msg.evidence))return;state.evidence={};for(const e of msg.evidence)state.evidence[e.room]=e;if(msg.active)state.active=msg.active;}
 if(net&&net.on)net.on('watcher_evidence',applyRemote);
 const oldDecide=planner.decide;
 planner.decide=function(){const r=oldDecide();const now=performance.now();if((!net||!net.connected||net.role==='host')&&now-state.lastInvestigation>5000)investigate();return r;};
 const oldUpdate=g.updateEntity.bind(g);
 g.updateEntity=function(dt){oldUpdate(dt);if(this.state!=='PLAYING')return;const now=performance.now();const auth=!net||!net.connected||net.role==='host';if(auth){if(now-state.lastTick>900){observeEvidence();decay();state.lastTick=now;}if(now-state.lastBroadcast>1100){broadcast();state.lastBroadcast=now;}}};
 g.watcherEvidence={state,add,investigate,strongest,applyRemote};
}
boot();
})();
