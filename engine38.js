/* THE HOUSE IS WATCHING — Engine 38: Watcher Perception & Prediction v1
 * Builds a lightweight host-authoritative perception memory from sightings, noise,
 * flashlight use and movement direction, then predicts likely survivor destinations.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.player||!g.partyNetwork||!g.watcherHuntPlanner)return setTimeout(boot,400);
 if(g.__engine38)return;g.__engine38=true;
 const net=g.partyNetwork.net, planner=g.watcherHuntPlanner, R=planner.rooms, ED=planner.edges;
 const state={tracks:{},events:[],lastBroadcast:0,lastTick:0};
 const hud=document.createElement('div');hud.id='watcher-perception-hud';hud.style.cssText='position:fixed;top:185px;left:50%;transform:translateX(-50%);padding:6px 10px;background:rgba(3,3,5,.8);border:1px solid rgba(180,165,150,.2);color:#bdb2a8;font:700 9px/1.3 monospace;letter-spacing:1px;z-index:122;pointer-events:none;display:none;text-align:center';hud.innerHTML='<span id="wp-title">PERCEPTION</span><span id="wp-detail" style="opacity:.72;margin-left:7px"></span>';document.body.appendChild(hud);
 function show(a,b,ms){hud.style.display='block';hud.querySelector('#wp-title').textContent=a;hud.querySelector('#wp-detail').textContent=b||'';setTimeout(()=>{hud.style.display='none'},ms);}
 const scale=()=>g.scene.scale&&g.scene.scale.x||1;
 function roomAt(x,z){let best='HALL',bd=1e9,s=scale();Object.keys(R).forEach(k=>{const d=Math.hypot(x/s-R[k].x,z/s-R[k].z);if(d<bd){bd=d;best=k;}});return best;}
 function pos(o){return{x:o.position.x,y:o.position.y,z:o.position.z};}
 function members(){const a=[];if(g.player)a.push({id:'local',object:g.player,state:g.state==='PLAYING'?'ALIVE':'DEAD'});if(g.coop.members)for(const m of g.coop.members.values())if(m.id!=='local'&&m.object&&m.state!=='DEAD')a.push(m);return a;}
 function trackFor(m){return state.tracks[m.id]||(state.tracks[m.id]={id:m.id,room:roomAt(m.object.position.x,m.object.position.z),last:pos(m.object),velocity:{x:0,z:0},lastSeen:0,confidence:0,noise:0,light:0,hidden:false,predictedRoom:null,predictedAt:0});}
 function observe(m,now){
  const t=trackFor(m),p=pos(m.object),dt=Math.max(.05,(now-t.lastSeen||100)/1000);t.velocity={x:(p.x-t.last.x)/dt,z:(p.z-t.last.z)/dt};t.room=roomAt(p.x,p.z);t.last=p;t.lastSeen=now;
  const u=m.object.userData||{};t.hidden=!!u.isHiding;t.noise=Math.max(0,Number(u.lastNoise||0));t.light=Number(u.flashlightActive||u.lightOn||u.flashlight||0)?1:0;t.confidence=Math.min(1,t.confidence+.08);
  const speed=Math.hypot(t.velocity.x,t.velocity.z)/scale();
  if(speed>.35) t.noise=Math.min(1,t.noise+Math.min(.35,speed*.03));
  return t;
 }
 function nextRoom(from,dx,dz,target){const n=ED[from]||[];if(!n.length)return target;let best=n[0],bs=-1e9;for(const k of n){const vx=R[k].x-R[from].x,vz=R[k].z-R[from].z,mag=Math.hypot(vx,vz)||1,dir=(vx*dx+vz*dz)/(mag*(Math.hypot(dx,dz)||1));const heat=(g.reactiveInterior&&g.reactiveInterior.state&&g.reactiveInterior.state.rooms&&g.reactiveInterior.state.rooms[k]&&g.reactiveInterior.state.rooms[k].heat)||0;const score=dir*2+Number(heat)*.4+(k===target?2:0);if(score>bs){bs=score;best=k;}}return best;}
 function predict(t){if(t.hidden){t.predictedRoom=t.room;return t.room;}const dx=t.velocity.x,dz=t.velocity.z;if(Math.hypot(dx,dz)<.18*scale()){t.predictedRoom=t.room;return t.room;}let r=t.room;for(let i=0;i<2;i++)r=nextRoom(r,dx,dz,r);t.predictedRoom=r;t.predictedAt=performance.now();return r;}
 function recordEvent(type,t){state.events.push({type,id:t.id,room:t.room,predicted:t.predictedRoom,time:performance.now()});if(state.events.length>30)state.events.shift();}
 function broadcast(){if(!net||!net.connected||net.role!=='host'||!net.send)return;const compact=Object.values(state.tracks).map(t=>({id:t.id,room:t.room,predictedRoom:t.predictedRoom,confidence:+t.confidence.toFixed(2),hidden:t.hidden,noise:+t.noise.toFixed(2),light:t.light}));try{net.send({type:'watcher_perception',version:Date.now(),tracks:compact});}catch(e){}}
 function applyRemote(msg){if(!msg||!Array.isArray(msg.tracks))return;for(const x of msg.tracks){const t=state.tracks[x.id]||{id:x.id};Object.assign(t,{room:x.room,predictedRoom:x.predictedRoom,confidence:x.confidence,hidden:x.hidden,noise:x.noise,light:x.light});state.tracks[x.id]=t;}}
 if(net&&net.on)net.on('watcher_perception',applyRemote);
 const oldDecide=planner.decide;
 planner.decide=function(){
  const result=oldDecide();
  const targetId=planner.state.targetId,t=targetId&&state.tracks[targetId];
  if(t&&t.predictedRoom&&!t.hidden&&planner.state.mode!=='SEARCH'){
   const current=planner.state.goalRoom;
   if(t.predictedRoom!==t.room&&Math.random()<.72){planner.state.goalRoom=t.predictedRoom;planner.state.waypoint={x:(R[t.predictedRoom].x+(Math.random()-.5)*1.1)*scale(),y:(g.entityGroup||g.entity).position.y,z:(R[t.predictedRoom].z+(Math.random()-.5)*1.1)*scale()};show('THE WATCHER PREDICTED',t.predictedRoom,1800);}
  }
  return result;
 };
 const oldUpdate=g.updateEntity.bind(g);
 g.updateEntity=function(dt){
  oldUpdate(dt);if(this.state!=='PLAYING')return;const now=performance.now();const authoritative=!net||!net.connected||net.role==='host';
  if(authoritative){for(const m of members()){const before=trackFor(m),prevRoom=before.room,t=observe(m,now);predict(t);if(t.room!==prevRoom)recordEvent('ROOM',t);if(t.noise>.65)recordEvent('NOISE',t);if(t.light)recordEvent('LIGHT',t);}if(now-state.lastBroadcast>700){broadcast();state.lastBroadcast=now;}}
  for(const id of Object.keys(state.tracks))if(now-state.tracks[id].lastSeen>12000)delete state.tracks[id];
 };
 setInterval(()=>{if(g.state!=='PLAYING')return;const id=planner.state.targetId,t=id&&state.tracks[id];if(t&&t.predictedRoom&&t.predictedRoom!==t.room&&!t.hidden)show('PREDICTED ROUTE',t.predictedRoom,1200);},2600);
 g.watcherPerception={state,predict,observe,applyRemote};
}
boot();
})();
