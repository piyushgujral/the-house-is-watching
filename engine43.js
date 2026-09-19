/* THE HOUSE IS WATCHING — Engine 43: Full Watcher Decision Loop v1
 * Fuses perception, evidence, behavior and counterplay into one adaptive host-side loop.
 * The director scores intent, commits a tactic, measures the outcome and changes strategy.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.player||!g.watcherHuntPlanner||!g.watcherPerception||!g.watcherEvidenceFusion||!g.watcherBehaviorModel||!g.watcherCounterplay)return setTimeout(boot,450);
 if(g.__engine43)return;g.__engine43=true;
 const planner=g.watcherHuntPlanner,perception=g.watcherPerception,fusion=g.watcherEvidenceFusion,behavior=g.watcherBehaviorModel;
 const net=g.partyNetwork&&g.partyNetwork.net,R=planner.rooms;
 const state={decisionId:0,lastDecision:0,lastBroadcast:0,active:null,outcomes:[],memory:{},version:1};
 const hud=document.createElement('div');hud.id='watcher-decision-hud';hud.style.cssText='position:fixed;top:350px;left:50%;transform:translateX(-50%);padding:8px 13px;background:rgba(5,4,6,.93);border:1px solid rgba(205,180,150,.32);color:#d9cdc2;font:700 9px/1.35 monospace;letter-spacing:1.15px;z-index:127;pointer-events:none;display:none;text-align:center;max-width:88vw';hud.innerHTML='<span id="wd-title">WATCHER DIRECTOR</span><span id="wd-detail" style="opacity:.72;margin-left:8px"></span>';document.body.appendChild(hud);
 function show(a,b,ms){hud.style.display='block';hud.querySelector('#wd-title').textContent=a;hud.querySelector('#wd-detail').textContent=b||'';clearTimeout(show.timer);show.timer=setTimeout(()=>hud.style.display='none',ms||2100);}
 const now=()=>performance.now(),S=()=>g.scene.scale&&g.scene.scale.x||1;
 function roomAt(x,z){let best='HALL',bd=1e9,s=S();Object.keys(R).forEach(k=>{const d=Math.hypot(x/s-R[k].x,z/s-R[k].z);if(d<bd){bd=d;best=k;}});return best;}
 function dist(a,b){return Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z)/S();}
 function members(){const a=[];if(g.player)a.push({id:'local',object:g.player,state:g.state==='PLAYING'?'ALIVE':'DEAD',name:'YOU'});if(g.coop&&g.coop.members)for(const m of g.coop.members.values())if(m.object&&m.state!=='DEAD')a.push(m);return a;}
 function target(){const pick=behavior.chooseTacticalTarget&&behavior.chooseTacticalTarget();return pick&&pick.member?pick.member:null;}
 function evidenceScore(room){const c=fusion.state&&fusion.state.cases&&fusion.state.cases[room];return c?Number(c.confidence)||0:0;}
 function predictedRoom(id,room){const t=perception.state&&perception.state.tracks&&perception.state.tracks[id];return t&&t.predictedRoom&&t.predictedRoom!==room?t.predictedRoom:null;}
 function profile(id,name){return behavior.profile?behavior.profile(id,name):{style:'UNKNOWN',repeatedRoutes:0,hides:0,lights:0,runs:0,separations:0};}
 function memory(id){return state.memory[id]||(state.memory[id]={success:0,fail:0,byAction:{},lastAction:'NONE',lastRoom:null,lastAt:0});}
 function actionValue(action,m,room,p){
  const h=memory(m.id),prev=h.byAction[action]||{success:0,fail:0};let v=0;
  v+=(prev.success-prev.fail)*1.8+evidenceScore(room)*2.2;
  if(predictedRoom(m.id,room))v+=2.5;
  if(p.repeatedRoutes>=3&&(action==='INTERCEPT'||action==='BREAK_ROUTE'))v+=3.2;
  if(p.hides>=4&&(action==='SEARCH'||action==='BAIT_SEARCH'))v+=2.4;
  if(p.lights>=5&&(action==='AMBUSH'||action==='DARKNESS_BAIT'))v+=2.4;
  if(p.separations>=4&&action==='ISOLATE')v+=2.6;
  if(h.lastAction===action)v-=2.8;
  return v;
 }
 function chooseAction(m){
  const p=profile(m.id,m.name),room=roomAt(m.object.position.x,m.object.position.z),h=memory(m.id);
  const candidates=['PRESS','INTERCEPT','SEARCH','AMBUSH','ISOLATE','VERIFY_TRAIL','BREAK_ROUTE','FALSE_ROUTE'];
  const scored=candidates.map(action=>({action,score:actionValue(action,m,room,p)})).sort((a,b)=>b.score-a.score);let best=scored[0];
  if(p.style==='HIDER'&&best.score<3)best={action:h.fail>1?'BAIT_SEARCH':'SEARCH',score:best.score+3};
  if(p.style==='RUSHER'&&p.repeatedRoutes>=3)best={action:'INTERCEPT',score:best.score+3};
  if(p.style==='LIGHT-DEPENDENT')best={action:h.byAction.AMBUSH&&h.byAction.AMBUSH.fail>1?'DARKNESS_BAIT':'AMBUSH',score:best.score+2};
  if(p.style==='LONE-WOLF')best={action:'ISOLATE',score:best.score+2};
  if(p.style==='HABITUAL'&&p.repeatedRoutes>=4)best={action:h.byAction.BREAK_ROUTE&&h.byAction.BREAK_ROUTE.success>1?'FALSE_ROUTE':'BREAK_ROUTE',score:best.score+3};
  return {action:best.action,score:best.score,room,p};
 }
 function applyAction(m,choice){
  const action=choice.action,room=choice.room;planner.state.targetId=m.id;planner.state.goalRoom=room;
  if(action==='INTERCEPT'||action==='BREAK_ROUTE'||action==='FALSE_ROUTE')planner.state.mode='INTERCEPT';
  else if(action==='AMBUSH'||action==='DARKNESS_BAIT')planner.state.mode='AMBUSH';
  else if(action==='SEARCH'||action==='BAIT_SEARCH'||action==='VERIFY_TRAIL')planner.state.mode='SEARCH';
  else if(action==='ISOLATE')planner.state.mode='HUNT';
  if((action==='BREAK_ROUTE'||action==='FALSE_ROUTE'||action==='ISOLATE')&&g.houseLayoutDirector){try{const typ=action==='BREAK_ROUTE'?'CLOSE_ROUTE':action==='FALSE_ROUTE'?'FALSE_SAFE':'FUNNEL';g.houseLayoutDirector.applyMutation&&g.houseLayoutDirector.applyMutation(typ,room,6000);}catch(e){}}
  const h=memory(m.id);h.lastAction=action;h.lastRoom=room;h.lastAt=now();
  state.active={id:m.id,name:m.name,action,room,mode:planner.state.mode,score:+choice.score.toFixed(2),started:now(),startDistance:dist(m.object,g.entityGroup||g.entity)};
  show(action==='VERIFY_TRAIL'?'IT CHECKS THE TRUTH':'WATCHER DECISION',action+' / '+room+' / '+choice.p.style,2200);
 }
 function evaluate(){
  const a=state.active;if(!a)return;const m=members().find(x=>x.id===a.id);if(!m||!m.object)return;
  const d=dist(m.object,g.entityGroup||g.entity),h=memory(a.id),age=now()-a.started;let result=null;
  if(m.state==='DOWNED'||m.state==='DEAD')result='SUCCESS';
  else if(d<3.2)result='SUCCESS';
  else if(a.action==='SEARCH'||a.action==='BAIT_SEARCH'||a.action==='VERIFY_TRAIL'){
   const room=roomAt(m.object.position.x,m.object.position.z),ev=evidenceScore(room);if(ev<.18&&age>5000)result='FAIL';
  } else if(age>8500&&d>a.startDistance*0.82)result='FAIL';
  if(!result)return;
  const bucket=h.byAction[a.action]||(h.byAction[a.action]={success:0,fail:0});bucket[result==='SUCCESS'?'success':'fail']++;
  if(result==='SUCCESS')h.success++;else h.fail++;
  state.outcomes.push({id:a.id,action:a.action,result,room:a.room,time:now()});if(state.outcomes.length>20)state.outcomes.shift();
  show(result==='SUCCESS'?'HUNT CONFIRMED':'TRAIL GOES COLD',a.action+' / '+result,1800);state.active=null;
 }
 function decide(){
  const auth=!net||!net.connected||net.role==='host';if(!auth)return;evaluate();
  if(state.active||now()-state.lastDecision<3600)return;const m=target();if(!m)return;const c=chooseAction(m);applyAction(m,c);state.lastDecision=now();state.decisionId++;
 }
 function broadcast(){if(!net||!net.connected||net.role!=='host'||!net.send)return;try{net.send({type:'watcher_decision',version:++state.decisionId,active:state.active,outcomes:state.outcomes.slice(-10),memory:Object.fromEntries(Object.entries(state.memory).map(([id,h])=>[id,{...h,byAction:{...h.byAction}}]))});}catch(e){}}
 function remote(msg){if(!msg)return;state.active=msg.active||null;state.outcomes=msg.outcomes||[];state.memory=msg.memory||{};}
 if(net&&net.on)net.on('watcher_decision',remote);
 const oldDecide=planner.decide;planner.decide=function(){oldDecide();decide();};
 setInterval(()=>{if(g.state==='PLAYING'&&(!net||!net.connected||net.role==='host'))decide();},900);
 setInterval(()=>{if(g.state==='PLAYING'&&(!net||!net.connected||net.role==='host')&&now()-state.lastBroadcast>1600){broadcast();state.lastBroadcast=now();}},1600);
 g.watcherDecisionDirector={state,decide,evaluate,chooseAction,applyAction,remote};
 show('FULL DECISION LOOP','Perception, evidence, behavior and counterplay now learn from outcomes.',3000);
}
boot();
})();
