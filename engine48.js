/* THE HOUSE IS WATCHING — Engine 48: Communication-Aware Watcher Response v1
 * The Watcher listens to survivor communication patterns without receiving
 * direct player coordinates. It learns coordination habits, distinguishes
 * credible signals from likely deception, and can investigate or intercept
 * communication-driven movement.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame;
 if(!g||!g.scene||!g.watcherDecisionDirector||!g.survivorCommsDirector||!g.watcherHuntPlanner)return setTimeout(boot,500);
 if(g.__engine48)return;g.__engine48=true;
 const director=g.watcherDecisionDirector,comms=g.survivorCommsDirector,planner=g.watcherHuntPlanner;
 const net=g.partyNetwork&&g.partyNetwork.net;
 const now=()=>performance.now();
 const state={version:1,events:[],rooms:{},profiles:{},lastResponse:0,lastBroadcast:0,active:null,deception:0,coordination:0};
 const hud=document.createElement('div');hud.id='watcher-comms-response';hud.style.cssText='position:fixed;top:382px;left:50%;transform:translateX(-50%);padding:8px 13px;background:rgba(6,4,5,.94);border:1px solid rgba(185,165,155,.35);color:#d9cdc7;font:700 9px/1.35 monospace;letter-spacing:1.1px;z-index:128;pointer-events:none;display:none;text-align:center;max-width:88vw';hud.innerHTML='<span id="wcr-title">HOUSE LISTENS</span><span id="wcr-detail" style="opacity:.72;margin-left:8px"></span>';document.body.appendChild(hud);
 function show(a,b,ms){hud.style.display='block';hud.querySelector('#wcr-title').textContent=a;hud.querySelector('#wcr-detail').textContent=b||'';clearTimeout(show.timer);show.timer=setTimeout(()=>hud.style.display='none',ms||2200);}
 function room(r){return planner.rooms&&planner.rooms[r]?planner.rooms[r]:null;}
 function remember(e){state.events.push(e);if(state.events.length>40)state.events.shift();const r=e.room;if(r){const x=state.rooms[r]||(state.rooms[r]={signals:0,watcher:0,evidence:0,rescue:0,regroup:0,objective:0,last:0,confidence:0});x.signals++;x[e.kind]=(x[e.kind]||0)+1;x.last=e.time;x.confidence=Math.min(1,(x.confidence||0)*.72+e.weight*.28);}}
 function ingest(){
  const signals=(comms.state&&comms.state.signals)||[];
  const seen=new Set(state.events.map(e=>e.signalId));
  signals.forEach(s=>{
   if(seen.has(s.id)||s.expires<=now())return;
   const type=String(s.type||'SIGNAL');
   const kind=type==='WATCHER_SIGHTING'?'watcher':type==='EVIDENCE'?'evidence':type==='RESCUE'?'rescue':type==='REGROUP'?'regroup':type==='OBJECTIVE'?'objective':'signal';
   const weight=type==='DANGER'?1.05:type==='WATCHER_SIGHTING'?.9:type==='RESCUE'?.85:type==='REGROUP'?.8:type==='EVIDENCE'?.72:.55;
   remember({signalId:s.id,room:s.room,kind,type,weight,time:now(),from:s.from});
  });
 }
 function analyze(){
  const recent=state.events.filter(e=>now()-e.time<14000);
  const regroup=recent.filter(e=>e.kind==='regroup').length;
  const rescue=recent.filter(e=>e.kind==='rescue').length;
  const objective=recent.filter(e=>e.kind==='objective').length;
  const danger=recent.filter(e=>e.type==='DANGER').length;
  const rooms={};recent.forEach(e=>{if(e.room)rooms[e.room]=(rooms[e.room]||0)+1;});
  const unique=Object.keys(rooms).length;
  state.coordination=Math.min(1,(regroup*0.18+rescue*0.22+objective*0.1+Math.max(0,unique-1)*0.08));
  const sameRoom=Object.values(rooms).sort((a,b)=>b-a)[0]||0;
  state.deception=Math.min(1,Math.max(0,(sameRoom>=3?0.18:0)+(danger>=3?0.22:0)+(unique>=3&&regroup>=2?0.18:0)));
  if(state.coordination>.58)show('HOUSE HEARD YOU','Coordination pattern detected.',1800);
 }
 function strongestCommunicationRoom(){
  const candidates=Object.entries(state.rooms).filter(([r,x])=>now()-x.last<12000&&room(r));
  candidates.sort((a,b)=>{const A=a[1],B=b[1];return (B.confidence+B.signals*.08)-(A.confidence+A.signals*.08);});
  return candidates[0]?candidates[0][0]:null;
 }
 function chooseResponse(){
  const targetRoom=strongestCommunicationRoom();if(!targetRoom)return null;
  const r=state.rooms[targetRoom];
  if(state.deception>.55&&r.regroup>=1)return {mode:'FALSE_SIGNAL_CHECK',room:targetRoom,score:.72};
  if(r.rescue>=1)return {mode:'RESCUE_INTERCEPT',room:targetRoom,score:.86};
  if(r.regroup>=1&&state.coordination>.4)return {mode:'REGROUP_PRESSURE',room:targetRoom,score:.8};
  if(r.objective>=1)return {mode:'OBJECTIVE_WATCH',room:targetRoom,score:.7};
  return {mode:'COMMUNICATION_SEARCH',room:targetRoom,score:.62};
 }
 function applyResponse(c){
  if(!c||now()-state.lastResponse<4200)return;
  const R=room(c.room);if(!R)return;
  if(c.mode==='RESCUE_INTERCEPT'||c.mode==='REGROUP_PRESSURE')planner.state.goalRoom=c.room,planner.state.mode='INTERCEPT';
  else planner.state.goalRoom=c.room,planner.state.mode='SEARCH';
  if(g.houseLayoutDirector&&state.coordination>.62){try{g.houseLayoutDirector.applyMutation&&g.houseLayoutDirector.applyMutation('FUNNEL',c.room,4800);}catch(e){}}
  state.active={...c,started:now()};state.lastResponse=now();
  show(c.mode.replace(/_/g,' '),c.room,2300);
 }
 function outcomeLearning(){
  if(!state.active)return;
  const age=now()-state.active.started;if(age<3600)return;
  const a=state.active,key=a.room,p=state.profiles[key]||(state.profiles[key]={success:0,fail:0});
  const active=director.state&&director.state.active;if(active&&active.room===key)return;
  if(age>8000)p.fail++,state.active=null;else if(age>4500)p.success++,state.active=null;
 }
 function tick(){if(g.state!=='PLAYING')return;ingest();analyze();outcomeLearning();const c=chooseResponse();if(c)applyResponse(c);}
 function broadcast(){if(!net||!net.connected||net.role!=='host'||!net.send)return;try{net.send({type:'watcher_comms_response',version:++state.version,active:state.active,coordination:+state.coordination.toFixed(3),deception:+state.deception.toFixed(3),rooms:Object.fromEntries(Object.entries(state.rooms).map(([r,x])=>[r,{...x}]))});state.lastBroadcast=now();}catch(e){}}
 function remote(m){if(!m)return;state.active=m.active||null;state.coordination=Number(m.coordination)||0;state.deception=Number(m.deception)||0;state.rooms=m.rooms||state.rooms;}
 if(net&&net.on)net.on('watcher_comms_response',remote);
 setInterval(tick,850);setInterval(()=>{if(g.state==='PLAYING'&&(!net||!net.connected||net.role==='host')&&now()-state.lastBroadcast>1800)broadcast();},1800);
 g.watcherCommunicationResponse={state,ingest,analyze,chooseResponse,applyResponse,remote};
 show('HOUSE LISTENS','The Watcher can now infer coordination from survivor signals.',3000);
}
boot();
})();
