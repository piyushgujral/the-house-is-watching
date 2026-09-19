/* THE HOUSE IS WATCHING — Engine 40: Evidence Fusion & Investigation Memory v1
 * Fuses heterogeneous clues into confidence-weighted investigations.
 * The host owns truth, memory and investigation state; clients receive compact snapshots.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.player||!g.partyNetwork||!g.watcherHuntPlanner||!g.watcherEvidence)return setTimeout(boot,450);
 if(g.__engine40)return;g.__engine40=true;
 const ev=g.watcherEvidence, planner=g.watcherHuntPlanner, R=planner.rooms, ED=planner.edges;
 const net=g.partyNetwork.net;
 const state={
  cases:{}, investigated:{}, active:null, lastBroadcast:0, lastTick:0, serial:0,
  thresholds:{investigate:20,verify:38,hunt:68,abandon:10}, version:1
 };
 const hud=document.createElement('div');
 hud.id='watcher-fusion-hud';
 hud.style.cssText='position:fixed;top:246px;left:50%;transform:translateX(-50%);padding:7px 12px;background:rgba(3,3,5,.88);border:1px solid rgba(210,190,165,.26);color:#d1c5b9;font:700 9px/1.35 monospace;letter-spacing:1px;z-index:124;pointer-events:none;display:none;text-align:center;max-width:82vw';
 hud.innerHTML='<span id="wf-title">EVIDENCE FUSION</span><span id="wf-detail" style="opacity:.72;margin-left:8px"></span>';
 document.body.appendChild(hud);
 function show(a,b,ms){hud.style.display='block';hud.querySelector('#wf-title').textContent=a;hud.querySelector('#wf-detail').textContent=b||'';clearTimeout(show.timer);show.timer=setTimeout(()=>hud.style.display='none',ms||1800);}
 const now=()=>performance.now(), scale=()=>g.scene.scale&&g.scene.scale.x||1;
 function roomAt(x,z){let best='HALL',bd=1e9,s=scale();Object.keys(R).forEach(k=>{const d=Math.hypot(x/s-R[k].x,z/s-R[k].z);if(d<bd){bd=d;best=k;}});return best;}
 function ensure(room){
  return state.cases[room]||(state.cases[room]={room,signals:{},confidence:0,contradiction:0,firstSeen:now(),lastSeen:0,lastInvestigated:0,investigations:0,status:'UNVERIFIED',sourceCount:0});
 }
 function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
 const weights={footsteps:1.0,lights:.9,doors:.85,hiding:1.2,route:1.1};
 function sourceAge(e,type){const raw=ev.state.evidence[e.room];if(!raw)return 99999;const n=now();const intensity=Number(raw[type]||0);return intensity>0?Math.max(0,(n-(raw.last||n)))/1000:99999;}
 function fuseRoom(room,raw){
  const c=ensure(room),n=now();
  const inputs=['footsteps','lights','doors','hiding','route'];
  let total=0,active=0,strong=0;
  inputs.forEach(k=>{const v=Number(raw[k]||0),age=sourceAge(c,k);const freshness=clamp(1-age/18,.05,1);const contribution=Math.min(22,v*weights[k]*freshness);if(v>.25)active++;if(contribution>8)strong++;total+=contribution;});
  const repeatPenalty=(c.investigations>0?Math.min(10,c.investigations*2):0);
  const memoryBonus=state.investigated[room]?4:0;
  c.sourceCount=active;
  c.contradiction=active>=3&&strong===0?Math.min(20,c.contradiction+.7):Math.max(0,c.contradiction-.3);
  c.confidence=clamp(total+Math.min(12,active*3)-c.contradiction-repeatPenalty+memoryBonus,0,100);
  c.lastSeen=raw.last||n;
  if(c.confidence>=state.thresholds.hunt)c.status='CONFIRMED';
  else if(c.confidence>=state.thresholds.verify)c.status='LIKELY';
  else if(c.confidence>=state.thresholds.investigate)c.status='SUSPECTED';
  else c.status='WEAK';
 }
 function fuse(){Object.values(ev.state.evidence||{}).forEach(raw=>fuseRoom(raw.room,raw));}
 function pathNext(from,to){
  if(from===to)return to;
  const q=[from],prev={};prev[from]=null;
  while(q.length){const n=q.shift();for(const k of (ED[n]||[])){if(Object.prototype.hasOwnProperty.call(prev,k))continue;prev[k]=n;if(k===to){let c=k;while(prev[c]&&prev[c]!==from)c=prev[c];return c;}q.push(k);}}
  return (ED[from]||[])[0]||to;
 }
 function bestCase(){
  let best=null,score=-1;
  Object.values(state.cases).forEach(c=>{
   const age=(now()-c.lastSeen)/1000;
   const freshness=clamp(1-age/22,.05,1);
   const revisit=state.investigated[c.room]?0.7:1;
   const value=c.confidence*freshness*revisit;
   if(value>score){score=value;best=c;}
  });
  return best;
 }
 function markInvestigated(room){
  const c=ensure(room);c.lastInvestigated=now();c.investigations++;state.investigated[room]=(state.investigated[room]||0)+1;state.serial++;
 }
 function setWaypoint(room){
  const from=planner.state.currentRoom||'HALL',next=pathNext(from,room),p=R[next]||R.HALL;
  const y=g.entityGroup&&g.entityGroup.position?g.entityGroup.position.y:(g.entity&&g.entity.position?g.entity.position.y:0);
  planner.state.waypoint={x:(p.x+(Math.random()-.5)*.65)*scale(),y,z:(p.z+(Math.random()-.5)*.65)*scale()};
  planner.state.goalRoom=room;
 }
 function beginInvestigation(c,mode){
  if(!c)return false;
  const current=planner.state.currentRoom||'HALL';
  setWaypoint(c.room);
  planner.state.mode=mode==='HUNT'?'HUNT':'SEARCH';
  state.active={room:c.room,mode,confidence:+c.confidence.toFixed(1),started:now(),sources:c.sourceCount};
  markInvestigated(c.room);
  show(mode==='HUNT'?'THE WATCHER HAS PROOF':'THE WATCHER IS CHECKING',c.room+' / '+c.status,2300);
  return true;
 }
 function resolveActive(){
  if(!state.active)return;
  const a=state.active,c=state.cases[a.room];if(!c){state.active=null;return;}
  const age=(now()-c.lastSeen)/1000;
  const atRoom=(planner.state.currentRoom===a.room);
  if(c.confidence>=state.thresholds.hunt&&age<10){a.mode='HUNT';planner.state.mode='HUNT';return;}
  if(atRoom&&age<4){
   c.confidence=clamp(c.confidence-18,0,100);
   c.contradiction=clamp(c.contradiction+4,0,20);
   c.status=c.confidence>=state.thresholds.verify?'LIKELY':'WEAK';
   a.mode='VERIFY';
   show('THE WATCHER CHECKS',a.room,1200);
   return;
  }
  if(age>14||c.confidence<state.thresholds.abandon){
   state.active=null;
   if(planner.state.mode==='SEARCH')planner.state.mode='PATROL';
   show('THE TRAIL GOES COLD','The house keeps the memory.',1500);
  }
 }
 function directorTick(){
  const connected=net&&net.connected,auth=!connected||net.role==='host';
  if(!auth)return;
  fuse();resolveActive();
  const active=state.active;
  if(!active){
   const c=bestCase();
   if(c&&c.confidence>=state.thresholds.investigate&&now()-c.lastInvestigated>4500)beginInvestigation(c,c.confidence>=state.thresholds.hunt?'HUNT':'SEARCH');
  }else{
   const c=state.cases[active.room];
   if(c&&c.confidence>=state.thresholds.hunt&&active.mode!=='HUNT'){active.mode='HUNT';planner.state.mode='HUNT';show('EVIDENCE CONFIRMED',active.room,1600);}
  }
 }
 function broadcast(){
  if(!net||!net.connected||net.role!=='host'||!net.send)return;
  const cases=Object.values(state.cases).map(c=>({room:c.room,confidence:+c.confidence.toFixed(1),contradiction:+c.contradiction.toFixed(1),status:c.status,sourceCount:c.sourceCount,lastInvestigated:+c.lastInvestigated,investigations:c.investigations}));
  try{net.send({type:'watcher_fusion',version:++state.serial,cases,investigated:state.investigated,active:state.active});}catch(e){}
 }
 function applyRemote(msg){
  if(!msg||!Array.isArray(msg.cases))return;
  state.cases={};msg.cases.forEach(c=>state.cases[c.room]=c);
  state.investigated=msg.investigated||{};state.active=msg.active||null;
 }
 if(net&&net.on)net.on('watcher_fusion',applyRemote);
 // Let Engine 39 continue collecting raw clues; Engine 40 owns interpretation and memory.
 setInterval(()=>{if(g.state==='PLAYING'){directorTick();}},850);
 setInterval(()=>{const auth=!net||!net.connected||net.role==='host';if(auth&&g.state==='PLAYING'&&now()-state.lastBroadcast>1200){broadcast();state.lastBroadcast=now();}},1200);
 g.watcherEvidenceFusion={state,fuse,bestCase,beginInvestigation,resolveActive,applyRemote};
 show('EVIDENCE FUSION','Multiple clues now share one memory.',2600);
}
boot();
})();
