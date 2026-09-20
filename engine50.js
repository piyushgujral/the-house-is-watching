/* THE HOUSE IS WATCHING — Engine 50: Objective / Progression Pressure Director v1
 * Turns campaign progression into a living risk economy. Objective milestones increase
 * Watcher attention, but survivors can choose FAST or QUIET pacing. The director reads
 * campaign progress, team coordination, communication/deception activity and repeated
 * routes, then biases the existing Watcher planner without granting player coordinates.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame;
 if(!g||!g.scene||!g.player||!g.campaign||!g.watcherHuntPlanner)return setTimeout(boot,500);
 if(g.__engine50)return;g.__engine50=true;
 const campaign=g.campaign, planner=g.watcherHuntPlanner;
 const comms=g.survivorCommsDirector||null;
 const deception=g.communicationDeceptionDirector||null;
 const team=g.survivorTeamDirector||null;
 const fairness=g.survivorFairnessDirector||null;
 const net=g.partyNetwork&&g.partyNetwork.net;
 const now=()=>performance.now();
 const ui=id=>document.getElementById(id);
 const state={
  version:1,pace:'QUIET',stage:-1,progress:0,objectiveRisk:0,teamRisk:0,attention:0,
  speedPressure:0,repeatPressure:0,commPressure:0,escapePressure:0,
  lastMilestone:-1,lastAction:0,lastBroadcast:0,lastNotice:0,history:[],active:null
 };
 const hud=document.createElement('div');
 hud.id='objective-pressure-director';
 hud.style.cssText='position:fixed;top:106px;left:50%;transform:translateX(-50%);padding:7px 11px;background:rgba(4,3,5,.9);border:1px solid rgba(210,190,174,.28);color:#ded4ce;font:700 9px/1.3 monospace;letter-spacing:1px;z-index:126;pointer-events:none;display:none;text-align:center;max-width:92vw';
 hud.innerHTML='<span id="opd-title">PACE: QUIET</span><span id="opd-detail" style="opacity:.7;margin-left:8px"></span>';
 document.body.appendChild(hud);
 const paceBtn=document.createElement('button');
 paceBtn.id='btn-objective-pace';paceBtn.textContent='PACE: QUIET';
 paceBtn.style.cssText='position:fixed;right:18px;bottom:292px;z-index:133;display:none;padding:8px 10px;background:rgba(12,10,12,.92);border:1px solid rgba(190,170,150,.38);color:#ded4ce;font:700 9px monospace;letter-spacing:1px;pointer-events:auto;touch-action:manipulation';
 document.body.appendChild(paceBtn);
 function show(title,detail,ms){
  hud.style.display='block';hud.querySelector('#opd-title').textContent=title;hud.querySelector('#opd-detail').textContent=detail||'';
  clearTimeout(show.timer);show.timer=setTimeout(()=>hud.style.display='none',ms||2200);
 }
 function mobile(){return matchMedia('(pointer:coarse)').matches||innerWidth<760;}
 function refreshButton(){paceBtn.style.display=mobile()?'block':'none';paceBtn.textContent='PACE: '+state.pace;}
 function roomOfPlayer(){
  if(!g.player)return null;
  const x=g.player.x||0,z=g.player.z||0;
  if(z>7)return'ENTRY';if(z>0)return'HALL';if(z>-7)return x<0?'BEDROOM':'STUDY';if(z>-13)return'RITUAL';return'BACK';
 }
 function progressOf(){
  const f=campaign.flags||{};
  if(campaign.completed||campaign.stage>=6)return 1;
  if(campaign.stage>=5)return .92;
  if(campaign.stage>=4)return .78+Math.min(.12,(Number(f.seals)||0)/3*.12);
  if(campaign.stage>=3)return .58;
  if(campaign.stage>=2)return .42;
  if(campaign.stage>=1)return .2;
  return .04;
 }
 function teamActivity(){
  let risk=0;
  if(team&&team.state){risk+=Math.min(1,(Number(team.state.risk)||0)/100)*.45;risk+=Math.min(1,(Number(team.state.cohesion)||0)/100)*.1;}
  if(comms&&comms.state&&Array.isArray(comms.state.signals)){
   const t=now();const recent=comms.state.signals.filter(s=>!s.expires||s.expires>t-9000);
   risk+=Math.min(.28,recent.length*.035);
   risk+=Math.min(.16,recent.filter(s=>s.type==='OBJECTIVE'||s.type==='RESCUE').length*.06);
  }
  if(deception&&deception.state){risk+=Math.min(.12,(Number(deception.state.decoys)||0)*.015);}
  return Math.min(1,risk);
 }
 function repeatedRoute(){
  const visits=campaign.roomVisits||{};let max=0;
  Object.keys(visits).forEach(k=>{max=Math.max(max,Math.min(1,Number(visits[k]||0)/35));});
  return max;
 }
 function compute(){
  const p=progressOf();
  const speed=state.pace==='FAST'?Math.min(1,Math.max(0,(g.running?0.7:.18)))+.18:Math.min(.22,Math.max(0,(g.running?.16:0)));
  const repeat=repeatedRoute();
  const teamRisk=teamActivity();
  const stageJump=Math.max(0,Number(campaign.stage||0)-state.stage);
  state.progress=p;state.teamRisk=teamRisk;state.speedPressure=Math.min(1,speed);state.repeatPressure=repeat;
  state.commPressure=Math.min(1,teamRisk*.75+(deception&&deception.state?Math.min(.25,(deception.state.decoys||0)*.025):0));
  state.escapePressure=p>.9?Math.min(1,(p-.9)*10):0;
  state.objectiveRisk=Math.min(1,p*.42+stageJump*.28+repeat*.18+teamRisk*.22);
  const paceBias=state.pace==='FAST'?.18:-.08;
  state.attention=Math.max(0,Math.min(1,state.objectiveRisk+paceBias+state.speedPressure*.18));
 }
 function tacticForStage(){
  const s=Number(campaign.stage||0);
  if(campaign.completed||s>=6)return 'ESCAPE_PRESSURE';
  if(s>=4)return state.pace==='FAST'?'SEAL_INTERCEPT':'SEAL_VERIFY';
  if(s===3)return state.pace==='FAST'?'RITUAL_INTERCEPT':'RITUAL_SEARCH';
  if(s===2)return state.pace==='FAST'?'STUDY_INTERCEPT':'STUDY_SEARCH';
  if(s===1)return state.pace==='FAST'?'GENERATOR_PRESS':'GENERATOR_WATCH';
  return state.pace==='FAST'?'ENTRY_PRESS':'ENTRY_OBSERVE';
 }
 function applyPlanner(){
  if(now()-state.lastAction<2600)return;
  const tactic=tacticForStage();
  if(state.attention<.28&&!g.running)return;
  const roomMap=planner.rooms||{};
  const preferred={
   ENTRY:'ENTRY',HALL:'HALL',STUDY:'STUDY',RITUAL:'RITUAL',BACK:'BACK',
   GENERATOR:'HALL',SEAL:'RITUAL',ESCAPE:'ENTRY'
  };
  const target=campaign.lastRoom||roomOfPlayer();
  let goal=preferred[target]||target;
  if(campaign.stage>=4)goal='RITUAL';
  if(campaign.stage>=5)goal='ENTRY';
  if(!roomMap[goal])goal=target;
  if(!roomMap[goal])return;
  if(state.attention>.72){planner.state.goalRoom=goal;planner.state.mode='INTERCEPT';}
  else if(state.attention>.5){planner.state.goalRoom=goal;planner.state.mode='INVESTIGATE';}
  else if(state.attention>.34&&state.pace==='FAST'){planner.state.goalRoom=goal;planner.state.mode='SEARCH';}
  state.active={tactic,goal,attention:state.attention,started:now()};state.lastAction=now();
 }
 function togglePace(force){
  state.pace=force||((state.pace==='QUIET')?'FAST':'QUIET');
  g.objectivePace=state.pace;
  g.objectivePaceMultiplier=state.pace==='FAST'?1.2:.82;
  refreshButton();
  show('PACE: '+state.pace,state.pace==='FAST'?'Faster progress. Louder consequences.':'Lower attention. Take the long way.',2600);
  if(net&&net.connected&&net.send)try{net.send({type:'objective_pace',pace:state.pace});}catch(e){}
 }
 paceBtn.onclick=()=>togglePace();
 window.addEventListener('resize',refreshButton);refreshButton();
 window.addEventListener('keydown',e=>{if(e.code==='KeyQ'&&g.state==='PLAYING'){e.preventDefault();togglePace();}},{passive:false});
 function milestone(){
  const s=Number(campaign.stage||0);
  if(s===state.lastMilestone)return;
  if(state.lastMilestone>=0){
   const names=['HOUSE ENTERED','POWER RESTORED','MASTER KEY FOUND','RITUAL ROOM OPEN','SEAL HUNT','EXTRACTION OPEN','ESCAPE'];
   const name=names[Math.min(s,names.length-1)];show('OBJECTIVE SHIFT',name+' — THE HOUSE IS AWAKE',3200);
   if(g.fear!=null)g.fear=Math.min(100,g.fear+(s>=4?4.5:2));
   state.history.push({stage:s,time:now(),pace:state.pace,attention:state.attention});
   if(state.history.length>12)state.history.shift();
  }
  state.lastMilestone=s;state.stage=s;
 }
 function broadcast(){
  if(!net||!net.connected||net.role!=='host'||!net.send)return;
  if(now()-state.lastBroadcast<1900)return;
  try{net.send({type:'objective_pressure_state',version:++state.version,stage:campaign.stage,progress:state.progress,pace:state.pace,attention:state.attention,objectiveRisk:state.objectiveRisk,teamRisk:state.teamRisk,active:state.active});state.lastBroadcast=now();}catch(e){}
 }
 function remote(m){if(!m)return;state.stage=Number(m.stage);state.progress=Number(m.progress)||0;state.pace=m.pace==='FAST'?'FAST':'QUIET';state.attention=Number(m.attention)||0;state.objectiveRisk=Number(m.objectiveRisk)||0;state.teamRisk=Number(m.teamRisk)||0;refreshButton();}
 if(net&&net.on)net.on('objective_pressure_state',remote);
 function update(dt){
  if(g.state!=='PLAYING')return;
  compute();milestone();applyPlanner();
  if(state.attention>.82&&now()-state.lastNotice>9000){state.lastNotice=now();show('THE HOUSE KNOWS','Objective progress has drawn attention.',2400);if(g.audio&&g.audio.creak)g.audio.creak();}
  if(state.pace==='FAST'&&g.running){campaign.pressure=Math.min(100,(campaign.pressure||0)+dt*1.8);if(g.fear!=null)g.fear=Math.min(100,g.fear+dt*.16);}
  if(state.pace==='QUIET'&&!g.running){campaign.pressure=Math.max(0,(campaign.pressure||0)-dt*.11);}
 }
 setInterval(()=>{if(g.state==='PLAYING')update(.9);},900);
 setInterval(()=>{if(g.state==='PLAYING')broadcast();},1900);
 g.objectivePressureDirector={state,togglePace,compute,update,progressOf,tacticForStage};
 g.objectivePace='QUIET';g.objectivePaceMultiplier=.82;
 show('OBJECTIVE DIRECTOR','Choose Q / PACE to trade speed for attention.',3000);
}
boot();
})();
