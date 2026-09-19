/* THE HOUSE IS WATCHING — Engine 44: Survivor Counter-AI & Fairness Director v1
 * Creates readable counterplay windows when the Watcher becomes dominant.
 * Host-authoritative: adjusts pressure, escape windows and objective alternatives without disabling the AI.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.player||!g.watcherDecisionDirector||!g.watcherHuntPlanner)return setTimeout(boot,500);
 if(g.__engine44)return;g.__engine44=true;
 const net=g.partyNetwork&&g.partyNetwork.net,planner=g.watcherHuntPlanner,director=g.watcherDecisionDirector;
 const state={version:1,pressure:0,dominance:0,lastTick:0,lastWindow:0,window:null,history:[],player:{escape:0,closeCalls:0,successfulBreaks:0},objective:null};
 const hud=document.createElement('div');hud.id='survivor-counterplay-hud';hud.style.cssText='position:fixed;bottom:116px;left:50%;transform:translateX(-50%);padding:9px 14px;background:rgba(4,5,6,.92);border:1px solid rgba(170,205,185,.34);color:#d8e1db;font:700 9px/1.4 monospace;letter-spacing:1px;z-index:128;pointer-events:none;display:none;text-align:center;max-width:90vw';hud.innerHTML='<span id="sc-title">SURVIVOR WINDOW</span><span id="sc-detail" style="opacity:.72;margin-left:8px"></span>';document.body.appendChild(hud);
 function show(a,b,ms){hud.style.display='block';hud.querySelector('#sc-title').textContent=a;hud.querySelector('#sc-detail').textContent=b||'';clearTimeout(show.timer);show.timer=setTimeout(()=>hud.style.display='none',ms||2600);}
 const now=()=>performance.now(),S=()=>g.scene.scale&&g.scene.scale.x||1;
 function members(){const a=[];if(g.player)a.push({id:'local',object:g.player,state:g.state==='PLAYING'?'ALIVE':'DEAD',name:'YOU'});if(g.coop&&g.coop.members)for(const m of g.coop.members.values())if(m.object&&m.state!=='DEAD')a.push(m);return a;}
 function roomAt(x,z){const R=planner.rooms||{},s=S();let best='HALL',bd=1e9;Object.keys(R).forEach(k=>{const d=Math.hypot(x/s-R[k].x,z/s-R[k].z);if(d<bd){bd=d;best=k;}});return best;}
 function distToWatcher(m){const w=g.watcher||g.watcherMonster||g.watcherEntity;if(!w||!w.position||!m.object)return 999;return Math.hypot(w.position.x-m.object.position.x,w.position.z-m.object.position.z)/S();}
 function activeDecision(){return director.state&&director.state.active;}
 function calculate(){
  const a=activeDecision(),ms=members();let threat=0,close=0;
  if(a)threat+=2.5;
  for(const m of ms){const d=distToWatcher(m);if(d<9)close++;if(d<5)threat+=2;if(m.state==='DOWNED')threat+=1.5;}
  const failures=(director.state&&director.state.outcomes||[]).filter(x=>x.result==='SUCCESS').length;
  const recent=(director.state&&director.state.outcomes||[]).filter(x=>now()-x.time<18000);
  const successes=recent.filter(x=>x.result==='SUCCESS').length;
  const pressure=Math.min(10,threat+successes*.8-failures*.15);
  state.pressure=pressure;state.dominance=Math.max(0,Math.min(1,pressure/8));
  return {pressure,dominance:state.dominance,close,active:a};
 }
 function chooseWindow(info){
  if(info.dominance<.55||now()-state.lastWindow<9000)return null;
  const ms=members().filter(m=>m.state!=='DEAD');if(!ms.length)return null;
  const target=ms.sort((a,b)=>distToWatcher(b)-distToWatcher(a))[0],room=roomAt(target.object.position.x,target.object.position.z);
  const types=['ESCAPE_WINDOW','SAFE_ROUTE','DISTRACTION','OBJECTIVE_WINDOW'];
  const type=types[Math.floor(now()/9000)%types.length];
  const duration=type==='OBJECTIVE_WINDOW'?8500:6000;
  return {type,targetId:target.id,room,started:now(),expires:now()+duration,reason:info.dominance>0.82?'HIGH_PRESSURE':'SUSTAINED_PRESSURE'};
 }
 function applyWindow(w){
  if(!w)return;
  state.window=w;state.lastWindow=now();
  if(w.type==='ESCAPE_WINDOW'){
   state.player.escape=now()+w.expires-w.started;
   if(g.player)g.player.__counterplayGraceUntil=w.expires;
  }
  if(w.type==='SAFE_ROUTE'&&g.houseLayoutDirector){try{g.houseLayoutDirector.applyMutation&&g.houseLayoutDirector.applyMutation('FALSE_SAFE',w.room,Math.min(8500,w.expires-now()));}catch(e){}}
  if(w.type==='DISTRACTION'&&g.watcherDecisionDirector&&g.watcherDecisionDirector.state){g.watcherDecisionDirector.state.lastDecision=Math.max(0,g.watcherDecisionDirector.state.lastDecision-2200);}
  if(w.type==='OBJECTIVE_WINDOW')state.objective={room:w.room,expires:w.expires};
  state.history.push({type:w.type,room:w.room,time:now()});if(state.history.length>16)state.history.shift();
  show('COUNTERPLAY WINDOW',w.type.replace('_',' ')+' / '+w.room,2400);
 }
 function expire(){if(state.window&&now()>state.window.expires){state.window=null;show('WINDOW CLOSED','The house is watching again.',1400);}if(state.objective&&now()>state.objective.expires)state.objective=null;}
 function fairnessTick(){
  const auth=!net||!net.connected||net.role==='host';if(!auth)return;
  expire();const info=calculate();
  if(!state.window){const w=chooseWindow(info);if(w)applyWindow(w);}
  // Grace only softens the final hit; it does not disable pursuit or movement.
  if(g.player&&g.player.__counterplayGraceUntil&&now()>g.player.__counterplayGraceUntil)delete g.player.__counterplayGraceUntil;
 }
 function broadcast(){if(!net||!net.connected||net.role!=='host'||!net.send)return;try{net.send({type:'survivor_counterplay',version:++state.version,pressure:state.pressure,dominance:state.dominance,window:state.window,history:state.history.slice(-8),objective:state.objective});}catch(e){}}
 function remote(msg){if(!msg)return;state.pressure=msg.pressure||0;state.dominance=msg.dominance||0;state.window=msg.window||null;state.history=msg.history||[];state.objective=msg.objective||null;}
 if(net&&net.on)net.on('survivor_counterplay',remote);
 // Preserve a readable last-known escape opportunity after successful breaks.
 const oldDecide=director.decide;director.decide=function(){oldDecide();const a=director.state&&director.state.active;if(a&&a.action==='BREAK_ROUTE')state.player.successfulBreaks++;};
 setInterval(()=>{if(g.state==='PLAYING')fairnessTick();},900);
 setInterval(()=>{if(g.state==='PLAYING'&&(!net||!net.connected||net.role==='host'))broadcast();},1800);
 g.survivorCounterplayDirector={state,fairnessTick,applyWindow,remote,calculate};
 show('FAIRNESS DIRECTOR','Readable escape windows will appear when pressure becomes excessive.',3000);
}
boot();
})();
