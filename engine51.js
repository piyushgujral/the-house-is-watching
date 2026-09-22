/* THE HOUSE IS WATCHING — Engine 51: Endgame Extraction Director v1
 * Converts the final objective into a readable, escalating extraction sequence.
 * Host-authoritative and compatible with the existing campaign, Watcher planner,
 * fairness, team rescue, communication and objective-pressure systems.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame;
 if(!g||!g.scene||!g.player||!g.campaign||!g.watcherHuntPlanner)return setTimeout(boot,500);
 if(g.__engine51)return; g.__engine51=true;
 const C=g.campaign, planner=g.watcherHuntPlanner;
 const objective=g.objectivePressureDirector||null;
 const team=g.survivorTeamDirector||null;
 const fairness=g.survivorCounterplayDirector||null;
 const comms=g.survivorCommsDirector||null;
 const net=g.partyNetwork&&g.partyNetwork.net;
 const now=()=>performance.now();
 const state={
  version:1,phase:'LOCKED',timer:0,started:0,lastTick:0,lastBroadcast:0,
  extractionProgress:0,pressure:0,escapeWindow:null,teamReady:false,
  lastNotice:0,history:[],completed:false
 };
 const hud=document.createElement('div');
 hud.id='endgame-extraction-director';
 hud.style.cssText='position:fixed;top:148px;left:50%;transform:translateX(-50%);padding:8px 12px;background:rgba(7,4,5,.94);border:1px solid rgba(185,150,130,.38);color:#e1d6cf;font:700 9px/1.35 monospace;letter-spacing:1px;z-index:131;pointer-events:none;display:none;text-align:center;max-width:92vw';
 hud.innerHTML='<span id="eed-title">EXTRACTION</span><span id="eed-detail" style="opacity:.72;margin-left:8px"></span>';
 document.body.appendChild(hud);
 const bar=document.createElement('div');
 bar.id='extraction-progress';
 bar.style.cssText='position:fixed;top:178px;left:50%;transform:translateX(-50%);width:min(280px,70vw);height:3px;background:rgba(210,190,180,.14);z-index:131;display:none;pointer-events:none';
 bar.innerHTML='<div id="extraction-progress-fill" style="width:0%;height:100%;background:rgba(220,190,170,.8);transition:width .2s linear"></div>';
 document.body.appendChild(bar);
 function show(a,b,ms){
  hud.style.display='block'; hud.querySelector('#eed-title').textContent=a;
  hud.querySelector('#eed-detail').textContent=b||'';
  clearTimeout(show.timer); show.timer=setTimeout(()=>hud.style.display='none',ms||2400);
 }
 function roomAt(){
  const x=g.player.x||0,z=g.player.z||0;
  if(z>7)return'ENTRY'; if(z>0)return'HALL'; if(z>-7)return x<0?'BEDROOM':'STUDY'; if(z>-13)return'RITUAL'; return'BACK';
 }
 function watcherDistance(){
  const w=g.watcher||g.watcherMonster||g.watcherEntity||g.entityGroup||g.entity;
  if(!w||!w.position)return 99;
  return Math.hypot(w.position.x-g.player.x,w.position.z-g.player.z)/(g.scene.scale&&g.scene.scale.x||1);
 }
 function host(){
  return !net||!net.connected||net.role==='host';
 }
 function seals(){
  return Number((C.flags&&C.flags.seals)||((g.houseEndgame&&g.houseEndgame.seals)||0));
 }
 function progress(){
  return Math.max(0,Math.min(1,Number(state.extractionProgress)||0));
 }
 function partyReady(){
  if(!g.coop||!g.coop.members)return true;
  const ms=[{id:'local',state:g.state==='PLAYING'?'ALIVE':'DEAD'}];
  for(const m of g.coop.members.values())if(m.state!=='DEAD')ms.push(m);
  return ms.some(m=>m.state==='ALIVE');
 }
 function enterEndgame(){
  if(state.phase!=='LOCKED')return;
  state.phase='AWAKE';state.started=now();state.timer=0;
  C.stage=Math.max(Number(C.stage)||0,5);
  C.completed=false;
  if(objective&&objective.state)objective.state.pace='FAST';
  g.objectivePace='FAST';g.objectivePaceMultiplier=1.2;
  if(g.entity)g.entity.state='CHASE';
  if(g.entity)g.entity.speed=Math.max(Number(g.entity.speed)||0,3.1);
  show('THE HOUSE IS OPEN','GET TO THE FRONT DOOR.',3600);
  if(g.audio&&g.audio.sting)g.audio.sting();
 }
 function chooseWindow(){
  if(!fairness||!fairness.applyWindow)return;
  const d=watcherDistance();
  if(d<5)return;
  if(state.escapeWindow&&state.escapeWindow.expires>now())return;
  const type=state.timer>14?'ESCAPE_WINDOW':'SAFE_ROUTE';
  const expires=now()+(type==='ESCAPE_WINDOW'?5200:4200);
  state.escapeWindow={type,room:'ENTRY',started:now(),expires};
  fairness.applyWindow({type,targetId:'local',room:'ENTRY',started:now(),expires,reason:'EXTRACTION'});
 }
 function updateExtraction(dt){
  if(state.phase==='LOCKED')return;
  state.timer=(now()-state.started)/1000;
  const atDoor=roomAt()==='ENTRY'&&(Math.abs(g.player.z||0)>11.8);
  const d=watcherDistance();
  const windowActive=state.escapeWindow&&state.escapeWindow.expires>now();
  let rate=0;
  if(atDoor&&windowActive)rate=0.34;
  else if(atDoor&&d>8)rate=0.14;
  else if(atDoor)rate=0.04;
  if(g.running)rate*=1.15;
  state.extractionProgress=Math.min(1,state.extractionProgress+dt*rate);
  if(bar.style.display!=='block')bar.style.display='block';
  document.getElementById('extraction-progress-fill').style.width=Math.round(progress()*100)+'%';
  if(progress()>=1&&!state.completed){
   state.completed=true;state.phase='ESCAPED';C.completed=true;C.stage=6;
   show('YOU ESCAPED','THE HOUSE REMEMBERS THE OTHERS.',5000);
   if(g.win)g.win();
  }
 }
 function applyPressure(){
  if(state.phase==='LOCKED')return;
  const d=watcherDistance(), p=Math.max(0,Math.min(1,1-(d/14)));
  const comm=(comms&&comms.state&&Array.isArray(comms.state.signals))?Math.min(.3,comms.state.signals.length*.02):0;
  state.pressure=Math.min(1,p*.6+comm+.25);
  if(planner&&planner.state){
   const current=roomAt();
   if(state.phase==='AWAKE'){
    planner.state.goalRoom=d<7?current:'ENTRY';
    planner.state.mode=d<7?'HUNT':'INTERCEPT';
   }
  }
  if(state.pressure>.82&&now()-state.lastNotice>8000){
   state.lastNotice=now();
   show('THE HOUSE IS CLOSING','KEEP MOVING.',2200);
   if(g.fear!=null)g.fear=Math.min(100,g.fear+3);
  }
 }
 function tick(){
  if(g.state!=='PLAYING')return;
  if(seals()>=3&&state.phase==='LOCKED')enterEndgame();
  if(state.phase==='ESCAPED')return;
  if(!host())return;
  if(state.phase==='AWAKE'){
   applyPressure();
   if(state.timer>3)chooseWindow();
   updateExtraction(.25);
   if(state.timer>0&&state.timer<4&&now()-state.lastNotice>9000){
    state.lastNotice=now();show('EXTRACTION OPEN','THE FRONT DOOR IS YOUR ONLY WAY OUT.',2800);
   }
  }
 }
 function remote(m){
  if(!m)return;
  state.phase=m.phase||state.phase;state.timer=Number(m.timer)||0;
  state.extractionProgress=Number(m.extractionProgress)||0;
  state.pressure=Number(m.pressure)||0;state.escapeWindow=m.escapeWindow||null;
  state.completed=!!m.completed;
  bar.style.display=state.phase==='AWAKE'?'block':'none';
 }
 function broadcast(){
  if(!net||!net.connected||net.role!=='host'||!net.send)return;
  try{net.send({type:'endgame_extraction_state',version:++state.version,phase:state.phase,timer:state.timer,extractionProgress:state.extractionProgress,pressure:state.pressure,escapeWindow:state.escapeWindow,completed:state.completed});state.lastBroadcast=now();}catch(e){}
 }
 if(net&&net.on)net.on('endgame_extraction_state',remote);
 setInterval(()=>{if(g.state==='PLAYING')tick();},250);
 setInterval(()=>{if(g.state==='PLAYING'&&host())broadcast();},1200);
 g.endgameExtractionDirector={state,enterEndgame,chooseWindow,updateExtraction,applyPressure,tick,remote};
 show('EXTRACTION DIRECTOR','The final escape now has a pressure phase.',3200);
}
boot();
})();