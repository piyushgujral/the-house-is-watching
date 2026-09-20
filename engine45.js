/* THE HOUSE IS WATCHING — Engine 45: Survivor Team Coordination & Rescue Director v1
 * Turns co-op survivors into a coordinated risk/reward team. Host-authoritative.
 * Creates rescue, regroup, distraction and objective-support plans from live party state.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame;
 if(!g||!g.scene||!g.player||!g.watcherDecisionDirector||!g.survivorCounterplayDirector||!g.watcherHuntPlanner)return setTimeout(boot,500);
 if(g.__engine45)return;g.__engine45=true;
 const planner=g.watcherHuntPlanner,decision=g.watcherDecisionDirector,fair=g.survivorCounterplayDirector;
 const net=g.partyNetwork&&g.partyNetwork.net;
 const now=()=>performance.now(),scale=()=>g.scene.scale&&g.scene.scale.x||1;
 const state={version:1,planId:0,active:null,history:[],lastPlan:0,teamRisk:0,cohesion:0,rescueCount:0,stats:{rescues:0,distractions:0,regroups:0,failedRescues:0}};
 const hud=document.createElement('div');hud.id='survivor-team-director-hud';hud.style.cssText='position:fixed;bottom:154px;left:50%;transform:translateX(-50%);padding:9px 14px;background:rgba(4,5,6,.94);border:1px solid rgba(170,195,210,.35);color:#d9e1e5;font:700 9px/1.4 monospace;letter-spacing:1px;z-index:129;pointer-events:none;display:none;text-align:center;max-width:92vw';hud.innerHTML='<span id="std-title">TEAM DIRECTOR</span><span id="std-detail" style="opacity:.72;margin-left:8px"></span>';document.body.appendChild(hud);
 function show(a,b,ms){hud.style.display='block';hud.querySelector('#std-title').textContent=a;hud.querySelector('#std-detail').textContent=b||'';clearTimeout(show.timer);show.timer=setTimeout(()=>hud.style.display='none',ms||2400);}
 function members(){const a=[];if(g.player)a.push({id:'local',object:g.player,state:g.state==='PLAYING'?'ALIVE':'DEAD',name:'YOU'});if(g.coop&&g.coop.members)for(const m of g.coop.members.values())if(m.object)a.push(m);return a.filter(m=>m.state!=='DEAD');}
 function dist(a,b){return Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z)/scale();}
 function watcher(){return g.watcher||g.watcherMonster||g.watcherEntity||null;}
 function room(m){const R=planner.rooms||{},s=scale();let best='HALL',bd=1e9;Object.keys(R).forEach(k=>{const r=R[k],d=Math.hypot(m.object.position.x/s-r.x,m.object.position.z/s-r.z);if(d<bd){bd=d;best=k;}});return best;}
 function build(){
  const ms=members(),w=watcher(),down=ms.filter(m=>m.state==='DOWNED'),alive=ms.filter(m=>m.state!=='DOWNED');
  if(!ms.length)return null;
  let pairs=0,near=0,threat=0;
  for(let i=0;i<alive.length;i++)for(let j=i+1;j<alive.length;j++){const d=dist(alive[i].object,alive[j].object);if(d<7)near++;pairs++;}
  for(const m of ms){const wd=w?dist(m.object,w):99;if(wd<8)threat+=Math.max(0,1-(wd/8));}
  const cohesion=pairs?near/pairs:1,stateRisk=Math.min(1,(threat/Math.max(1,ms.length))+.18*down.length+(fair.state.dominance||0)*.35);
  state.cohesion=cohesion;state.teamRisk=stateRisk;
  if(down.length){
   const target=down[0],helpers=alive.filter(m=>m.id!==target.id).sort((a,b)=>dist(a.object,target.object)-dist(b.object,target.object));
   if(!helpers.length)return null;
   const helper=helpers[0],d=dist(helper.object,target.object),wd=w?dist(helper.object,w):99;
   if(wd<5&&d<10)return {type:'DISTRACT_RESCUE',target,helper,room:room(target),score:3+stateRisk};
   if(d<14)return {type:'DIRECT_RESCUE',target,helper,room:room(target),score:4+(wd>9?2:0)};
   return {type:'REGROUP_RESCUE',target,helper,room:room(target),score:3};
  }
  if(stateRisk>.72&&cohesion<.5){
   const lead=alive.sort((a,b)=>dist(a.object,b.object)-dist(b.object,a.object))[0];
   return {type:'REGROUP',target:lead,helper:null,room:room(lead),score:4};
  }
  if(cohesion<.34){
   const lead=alive[0];return {type:'REGROUP',target:lead,helper:null,room:room(lead),score:2.5};
  }
  const objective=fair.state.objective;
  if(objective){const lead=alive.sort((a,b)=>dist(a.object,{position:{x:planner.rooms[objective.room]?.x*scale(),z:planner.rooms[objective.room]?.z*scale()}})-dist(b.object,{position:{x:planner.rooms[objective.room]?.x*scale(),z:planner.rooms[objective.room]?.z*scale()}}))[0];return {type:'OBJECTIVE_SUPPORT',target:lead,helper:null,room:objective.room,score:2};}
  return null;
 }
 function apply(p){
  if(!p)return;
  const expires=now()+((p.type==='DIRECT_RESCUE'||p.type==='DISTRACT_RESCUE')?9000:6500);
  state.active={id:++state.planId,type:p.type,targetId:p.target.id,helperId:p.helper&&p.helper.id||null,room:p.room,started:now(),expires,score:p.score};state.lastPlan=now();state.history.push({type:p.type,room:p.room,time:now()});if(state.history.length>20)state.history.shift();
  if(p.type==='DISTRACT_RESCUE'){
   state.stats.distractions++;decision.state.lastDecision=Math.max(0,decision.state.lastDecision-2600);
   if(fair.applyWindow)fair.applyWindow({type:'DISTRACTION',targetId:p.helper.id,room:p.room,started:now(),expires,reason:'RESCUE'});
   if(g.houseLayoutDirector)try{g.houseLayoutDirector.applyMutation&&g.houseLayoutDirector.applyMutation('FUNNEL',p.room,5000);}catch(e){}
  }
  if(p.type==='REGROUP'){
   state.stats.regroups++;decision.state.lastDecision=Math.max(0,decision.state.lastDecision-1600);
   if(fair.applyWindow)fair.applyWindow({type:'SAFE_ROUTE',targetId:p.target.id,room:p.room,started:now(),expires,reason:'REGROUP'});
  }
  if(p.type==='DIRECT_RESCUE'||p.type==='REGROUP_RESCUE'){
   state.rescueCount++;if(fair.applyWindow)fair.applyWindow({type:'ESCAPE_WINDOW',targetId:p.helper.id,room:p.room,started:now(),expires,reason:'RESCUE'});
  }
  show(p.type.replace('_',' '),p.room+' / '+(p.helper?('HELP '+p.helper.name):'TEAM PLAN'),2500);
 }
 function evaluate(){
  const a=state.active;if(!a)return;
  if(now()>a.expires){state.stats.failedRescues+=/RESCUE/.test(a.type)?1:0;state.active=null;return;}
  const ms=members(),target=ms.find(m=>m.id===a.targetId),helper=a.helperId&&ms.find(m=>m.id===a.helperId);
  if(/RESCUE/.test(a.type)&&target&&target.state!=='DOWNED'){state.stats.rescues++;show('RESCUE COMPLETE','Team kept moving.',1800);state.active=null;return;}
  if(a.type==='REGROUP'&&target&&helper&&dist(target.object,helper.object)<6){show('TEAM REGROUPED','Stay together.',1800);state.active=null;}
 }
 function tick(){
  const auth=!net||!net.connected||net.role==='host';if(!auth)return;
  evaluate();if(state.active||now()-state.lastPlan<4200)return;
  const p=build();if(p)apply(p);
 }
 function broadcast(){if(!net||!net.connected||net.role!=='host'||!net.send)return;try{net.send({type:'survivor_team_plan',version:++state.version,active:state.active,teamRisk:state.teamRisk,cohesion:state.cohesion,stats:state.stats,history:state.history.slice(-8)});}catch(e){}}
 function remote(m){if(!m)return;state.active=m.active||null;state.teamRisk=m.teamRisk||0;state.cohesion=m.cohesion||0;state.stats=m.stats||state.stats;state.history=m.history||[];}
 if(net&&net.on)net.on('survivor_team_plan',remote);
 setInterval(()=>{if(g.state==='PLAYING')tick();},800);
 setInterval(()=>{if(g.state==='PLAYING'&&(!net||!net.connected||net.role==='host'))broadcast();},1700);
 g.survivorTeamDirector={state,build,apply,evaluate,tick,remote};
 show('TEAM DIRECTOR','Rescue, regroup and distraction plans are now coordinated.',3000);
}
boot();
})();
