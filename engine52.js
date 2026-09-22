/* THE HOUSE IS WATCHING — Engine 52: Adaptive Nightmare Director v1
 * Major gameplay layer: turns the house into a reactive simulation rather than a
 * sequence of static objectives. It tracks player habits, fear, pressure, Watcher
 * confidence, communication and repeated rooms, then schedules readable world events.
 * All effects are reversible and defensive: missing optional systems are ignored.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame;
 if(!g||!g.scene||!g.player||!g.campaign)return setTimeout(boot,500);
 if(g.__engine52)return;g.__engine52=true;
 const C=g.campaign, now=()=>performance.now();
 const planner=g.watcherHuntPlanner||null;
 const comms=g.survivorCommsDirector||null;
 const deception=g.communicationDeceptionDirector||null;
 const extraction=g.endgameExtractionDirector||null;
 const net=g.partyNetwork&&g.partyNetwork.net;
 const state={
  version:1,nightmare:0,heat:0,phase:'CALM',events:[],active:null,
  lastEvent:0,lastBroadcast:0,nextEvent:8,seed:Math.random()*9999,
  rooms:{},stats:{blackouts:0,footsteps:0,falseTrails:0,calmWindows:0,nearMisses:0},
  history:[],habit:{running:0,lightOff:0,hall:0,entry:0,bedroom:0,study:0,ritual:0,back:0}
 };
 const ui=document.createElement('div');ui.id='adaptive-nightmare-hud';
 ui.style.cssText='position:fixed;top:202px;left:50%;transform:translateX(-50%);padding:6px 10px;background:rgba(5,3,5,.86);border:1px solid rgba(205,180,165,.24);color:#d9cbc4;font:700 8px monospace;letter-spacing:1px;z-index:130;pointer-events:none;display:none';
 ui.innerHTML='<span id="and-title">HOUSE STATE</span><span id="and-detail" style="opacity:.65;margin-left:8px"></span>';
 document.body.appendChild(ui);
 function show(a,b,ms){
  ui.style.display='block';ui.querySelector('#and-title').textContent=a;
  ui.querySelector('#and-detail').textContent=b||'';
  clearTimeout(show.timer);show.timer=setTimeout(()=>ui.style.display='none',ms||2200);
 }
 function scale(){return g.scene.scale&&g.scene.scale.x||1;}
 function roomAt(){
  const x=(g.player.x||0)/scale(),z=(g.player.z||0)/scale();
  if(z>7)return'ENTRY';if(z>0)return'HALL';if(z>-7)return x<0?'BEDROOM':'STUDY';if(z>-13)return'RITUAL';return'BACK';
 }
 function watcher(){
  return g.watcher||g.watcherMonster||g.watcherEntity||g.entityGroup||null;
 }
 function watcherDistance(){
  const w=watcher();if(!w||!w.position)return 99;
  return Math.hypot(w.position.x-g.player.x,w.position.z-g.player.z)/scale();
 }
 function pressure(){
  const fear=Math.max(0,Math.min(1,(Number(g.fear)||0)/100));
  const campaign=Math.max(0,Math.min(1,(Number(C.pressure)||0)/100));
  const watcherState=(g.getWatcherDirectorState&&g.getWatcherDirectorState())||{};
  const conf=Math.max(0,Math.min(1,Number(watcherState.confidence)||0));
  const comm=(comms&&comms.state)?Math.min(.2,(comms.state.signals||[]).length*.012):0;
  const dec=(deception&&deception.state)?Math.min(.12,(deception.state.decoys||0)*.015):0;
  const end=(extraction&&extraction.state&&extraction.state.phase==='AWAKE')?.25:0;
  return Math.max(0,Math.min(1,fear*.35+campaign*.22+conf*.25+comm+dec+end));
 }
 function rememberRoom(){
  const r=roomAt();state.habit[r]=(state.habit[r]||0)+.5;
  if(g.running)state.habit.running+=1;
  if(!g.flashlightOn)state.habit.lightOff+=.25;
 }
 function compute(){
  const p=pressure();state.heat=p;
  state.nightmare=Math.max(0,Math.min(100,p*100));
  state.phase=p>.82?'NIGHTMARE':p>.58?'AGITATED':p>.3?'UNEASY':'CALM';
  return p;
 }
 function rand(){
  state.seed=(state.seed*9301+49297)%233280;return state.seed/233280;
 }
 function canRun(){return g.state==='PLAYING'&&now()-state.lastEvent>6500;}
 function record(type,room,details){
  const e={id:Math.floor(now()),type,room,time:now(),details:details||{},pressure:state.heat};
  state.events.push(e);state.history.push(e);if(state.events.length>30)state.events.shift();if(state.history.length>80)state.history.shift();
  state.lastEvent=now();state.active=e;
 }
 function flicker(ms){
  const until=(g.clock&&g.clock.elapsedTime||0)+(ms/1000);
  g.flickerUntil=Math.max(Number(g.flickerUntil)||0,until);
 }
 function footstepBurst(room){
  record('FOOTSTEPS',room,{count:2+Math.floor(rand()*3)});
  state.stats.footsteps++;
  show('FOOTSTEPS',room+' / NOT YOURS',2100);
  if(g.audio&&g.audio.footstep){g.audio.footstep();setTimeout(()=>g.audio.footstep&&g.audio.footstep(),260+Math.random()*350);}
  if(g.fear!=null)g.fear=Math.min(100,g.fear+1.2);
 }
 function blackout(room){
  record('BLACKOUT',room,{duration:2.4});
  state.stats.blackouts++;
  const old=[];
  g.scene.traverse(o=>{if(o.isPointLight&&o.userData&&o.userData.base!=null){old.push([o,o.userData.base]);o.intensity=0;}});
  flicker(2400);
  show('POWER FLINCH',room+' / LIGHTS OUT',2400);
  setTimeout(()=>old.forEach(x=>{if(x[0]&&x[0].userData)x[0].intensity=x[1];}),2350);
  if(g.audio&&g.audio.sting)g.audio.sting();
 }
 function falseTrail(room){
  record('FALSE_TRAIL',room,{});
  state.stats.falseTrails++;
  if(planner&&planner.state){planner.state.goalRoom=room;planner.state.mode='SEARCH';}
  show('SOMETHING MOVED',room+' / CHECKING THE WRONG PLACE',2300);
  if(g.audio&&g.audio.footstep){g.audio.footstep();setTimeout(()=>g.audio.footstep&&g.audio.footstep(),400);}
 }
 function calmWindow(){
  record('CALM_WINDOW',roomAt(),{duration:4});
  state.stats.calmWindows++;
  show('THE HOUSE PAUSED','BREATHE. MOVE QUIETLY.',2600);
  if(g.fear!=null)g.fear=Math.max(0,g.fear-4);
  if(C.pressure!=null)C.pressure=Math.max(0,C.pressure-5);
 }
 function watcherNudge(){
  const w=watcher();if(!w||!w.position||!planner||!planner.rooms)return;
  const rooms=Object.keys(planner.rooms);if(!rooms.length)return;
  const current=roomAt();let candidates=rooms.filter(r=>r!==current);
  const target=candidates[Math.floor(rand()*candidates.length)]||current;
  const R=planner.rooms[target];if(!R)return;
  if(g.majorDirector&&g.majorDirector.state==='HUNTING')return;
  w.position.set(R.x*scale(),0,R.z*scale());
  if(g.entity)g.entity.state='STALK';
  record('WATCHER_SHIFT',target,{});
  show('SOMETHING IS WATCHING',target,2200);
 }
 function chooseEvent(p){
  const r=roomAt();
  const late=(Number(C.stage)||0)>=4;
  const end=extraction&&extraction.state&&extraction.state.phase==='AWAKE';
  const repeated=(state.habit[r]||0)>8;
  const candidates=[];
  if(p>.36)candidates.push(['FOOTSTEPS',2.0]);
  if(p>.48)candidates.push(['FALSE_TRAIL',1.7]);
  if(p>.58)candidates.push(['BLACKOUT',1.35]);
  if(p>.7)candidates.push(['WATCHER_SHIFT',late?1.5:.8]);
  if(p<.28)candidates.push(['CALM_WINDOW',1.1]);
  if(repeated)candidates.push(['FALSE_TRAIL',1.8]);
  if(end)candidates.push(['FOOTSTEPS',2.3],['BLACKOUT',1.5]);
  if(!candidates.length)return null;
  const total=candidates.reduce((s,x)=>s+x[1],0);let n=rand()*total;
  for(const c of candidates){n-=c[1];if(n<=0)return c[0];}
  return candidates[candidates.length-1][0];
 }
 function execute(type){
  const r=roomAt();
  if(type==='FOOTSTEPS')footstepBurst(r);
  else if(type==='BLACKOUT')blackout(r);
  else if(type==='FALSE_TRAIL')falseTrail(r);
  else if(type==='CALM_WINDOW')calmWindow();
  else if(type==='WATCHER_SHIFT')watcherNudge();
 }
 function schedule(){
  const p=compute();
  if(!canRun())return;
  state.nextEvent-=.9;
  if(state.nextEvent>0)return;
  const type=chooseEvent(p);
  state.nextEvent=Math.max(5,13-p*7+rand()*7);
  if(type)execute(type);
 }
 function outcomeLearning(){
  if(!state.active)return;
  const e=state.active;
  if(now()-e.time<3000)return;
  if(e.type==='FOOTSTEPS'&&watcherDistance()<5)state.stats.nearMisses++;
  state.active=null;
 }
 function broadcast(){
  if(!net||!net.connected||net.role!=='host'||!net.send)return;
  try{net.send({type:'adaptive_nightmare_state',version:++state.version,nightmare:+state.nightmare.toFixed(1),heat:+state.heat.toFixed(3),phase:state.phase,active:state.active,stats:state.stats,rooms:state.habit});state.lastBroadcast=now();}catch(e){}
 }
 function remote(m){
  if(!m)return;
  state.nightmare=Number(m.nightmare)||0;state.heat=Number(m.heat)||0;state.phase=m.phase||state.phase;
  state.active=m.active||null;state.stats=m.stats||state.stats;state.habit=m.rooms||state.habit;
 }
 if(net&&net.on)net.on('adaptive_nightmare_state',remote);
 const oldPlayer=g.updatePlayer&&g.updatePlayer.bind(g);
 if(oldPlayer&&!g.__engine52PlayerWrapped){
  g.__engine52PlayerWrapped=true;
  g.updatePlayer=function(dt){oldPlayer(dt);if(g.state==='PLAYING')rememberRoom();};
 }
 setInterval(()=>{if(g.state==='PLAYING'){compute();outcomeLearning();schedule();}},900);
 setInterval(()=>{if(g.state==='PLAYING'&&(!net||!net.connected||net.role==='host'))broadcast();},1800);
 g.adaptiveNightmareDirector={state,compute,schedule,execute,remote,pressure};
 show('ADAPTIVE HOUSE','The house now reacts to how you play.',3200);
}
boot();
})();