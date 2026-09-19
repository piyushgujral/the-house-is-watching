/* THE HOUSE IS WATCHING — Engine 41: Player Behavior Model v1
 * Builds persistent per-survivor behavioral profiles from movement, hiding, light use,
 * route repetition, separation and prior Watcher encounters. Host owns the profiles.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.player||!g.coop||!g.partyNetwork||!g.watcherHuntPlanner)return setTimeout(boot,400);
 if(g.__engine41)return;g.__engine41=true;
 const planner=g.watcherHuntPlanner,net=g.partyNetwork.net,R=planner.rooms;
 const state={profiles:{},lastBroadcast:0,lastTick:0,serial:0,active:null,version:1};
 const hud=document.createElement('div');hud.id='watcher-behavior-hud';hud.style.cssText='position:fixed;top:278px;left:50%;transform:translateX(-50%);padding:7px 12px;background:rgba(3,3,5,.9);border:1px solid rgba(210,190,165,.28);color:#d1c5b9;font:700 9px/1.35 monospace;letter-spacing:1px;z-index:125;pointer-events:none;display:none;text-align:center;max-width:84vw';hud.innerHTML='<span id="wb-title">BEHAVIOR</span><span id="wb-detail" style="opacity:.72;margin-left:8px"></span>';document.body.appendChild(hud);
 function show(a,b,ms){hud.style.display='block';hud.querySelector('#wb-title').textContent=a;hud.querySelector('#wb-detail').textContent=b||'';clearTimeout(show.timer);show.timer=setTimeout(()=>hud.style.display='none',ms||1900);}
 const now=()=>performance.now(),S=()=>g.scene.scale&&g.scene.scale.x||1;
 function roomAt(x,z){let best='HALL',bd=1e9,s=S();Object.keys(R).forEach(k=>{const d=Math.hypot(x/s-R[k].x,z/s-R[k].z);if(d<bd){bd=d;best=k;}});return best;}
 function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
 function members(){const out=[];if(g.player)out.push({id:'local',object:g.player,state:g.state==='PLAYING'?'ALIVE':'DEAD',name:'YOU'});if(g.coop&&g.coop.members)for(const m of g.coop.members.values())if(m.id!=='local'&&m.object&&m.state!=='DEAD')out.push(m);return out;}
 function profile(id,name){return state.profiles[id]||(state.profiles[id]={id,name:name||id,steps:0,runs:0,hides:0,lights:0,separations:0,repeatedRoutes:0,encounters:0,lastRoom:null,routeHistory:[],lastSeen:0,style:'UNKNOWN',confidence:0.2});}
 function observe(){
  const ms=members(),nowT=now();
  ms.forEach(m=>{
   const p=profile(m.id,m.name),o=m.object,u=o.userData||{},room=roomAt(o.position.x,o.position.z),track=g.watcherPerception&&g.watcherPerception.state.tracks[m.id];
   const speed=track?Math.hypot(track.velocity.x,track.velocity.z)/S():0;
   if(speed>.8){p.steps+=1;if(speed>1.35)p.runs+=1;}
   if(u.isHiding){p.hides+=1;}
   if(Number(u.flashlightActive||u.lightOn||u.flashlight||0)>0)p.lights+=1;
   if(track&&track.room&&track.predictedRoom&&track.predictedRoom!==track.room)p.routeHistory.push(track.room+'>'+track.predictedRoom);
   if(p.routeHistory.length>24)p.routeHistory.splice(0,p.routeHistory.length-24);
   const freq={};p.routeHistory.forEach(x=>freq[x]=(freq[x]||0)+1);p.repeatedRoutes=Math.max(0,...Object.values(freq));
   const others=ms.filter(x=>x.id!==m.id);if(others.some(x=>Math.hypot(x.object.position.x-o.position.x,x.object.position.z-o.position.z)/S()>9))p.separations+=1;
   p.lastRoom=room;p.lastSeen=nowT;p.style=classify(p);p.confidence=clamp(.2+Math.min(.7,(p.steps+p.runs+p.hides+p.lights)/180),.2,.95);
  });
 }
 function classify(p){
  const total=Math.max(1,p.steps+p.runs+p.hides+p.lights);
  const run=p.runs/total,hide=p.hides/total,light=p.lights/total,split=p.separations/Math.max(1,total/5);
  if(hide>.34)return 'HIDER';
  if(run>.24)return 'RUSHER';
  if(light>.3)return 'LIGHT-DEPENDENT';
  if(split>.45)return 'LONE-WOLF';
  if(p.repeatedRoutes>=4)return 'HABITUAL';
  return 'EXPLORER';
 }
 function tacticScore(m){
  const p=profile(m.id,m.name),o=m.object,room=roomAt(o.position.x,o.position.z),dist=Math.hypot(o.position.x-(g.entityGroup||g.entity).position.x,o.position.z-(g.entityGroup||g.entity).position.z)/S();
  const fusion=g.watcherEvidenceFusion&&g.watcherEvidenceFusion.state.cases[room];
  let score=8/(1+dist*.3);
  if(p.style==='HIDER')score+=p.hides*.035+(fusion?fusion.confidence*.035:0);
  if(p.style==='RUSHER')score+=p.runs*.025+(planner.state.mode==='PATROL'?1:0);
  if(p.style==='LIGHT-DEPENDENT')score+=p.lights*.02+(fusion?fusion.confidence*.02:0);
  if(p.style==='LONE-WOLF')score+=p.separations*.03;
  if(p.style==='HABITUAL')score+=p.repeatedRoutes*1.2;
  if(m.state==='DOWNED')score+=5;
  if(o.userData&&o.userData.isHiding)score+=3;
  return score;
 }
 function chooseTacticalTarget(){let best=null,score=-Infinity;members().forEach(m=>{if(m.state==='DEAD')return;const s=tacticScore(m);if(s>score){score=s;best=m;}});return {member:best,score};}
 function applyTactic(){
  if(!planner.decide)return;
  const pick=chooseTacticalTarget();if(!pick.member)return;
  const p=profile(pick.member.id,pick.member.name),o=pick.member.object,room=roomAt(o.position.x,o.position.z);
  const old=planner.state.targetId;
  planner.state.targetId=pick.member.id;
  if(p.style==='HIDER'&&o.userData&&o.userData.isHiding){planner.state.mode='SEARCH';planner.state.goalRoom=room;show('THE WATCHER REMEMBERS',p.name+' HIDES IN '+room,2200);}
  else if(p.style==='RUSHER'){planner.state.mode='INTERCEPT';planner.state.goalRoom=room;show('IT LEARNED YOUR ROUTE',p.name+' / RUSHER',1900);}
  else if(p.style==='LIGHT-DEPENDENT'){planner.state.mode='AMBUSH';planner.state.goalRoom=room;show('THE DARKNESS KNOWS',p.name+' / LIGHT-DEPENDENT',1900);}
  else if(p.style==='LONE-WOLF'){planner.state.mode='HUNT';planner.state.goalRoom=room;show('YOU ARE ALONE',p.name+' / LONE-WOLF',1900);}
  else if(p.style==='HABITUAL'){planner.state.mode='INTERCEPT';planner.state.goalRoom=room;show('THE HOUSE LEARNED',p.name+' / HABITUAL ROUTE',1900);}
  state.active={id:pick.member.id,style:p.style,score:+pick.score.toFixed(2),changed:old!==pick.member.id,time:now()};
 }
 function broadcast(){if(!net||!net.connected||net.role!=='host'||!net.send)return;const profiles=Object.values(state.profiles).map(p=>({id:p.id,name:p.name,steps:p.steps,runs:p.runs,hides:p.hides,lights:p.lights,separations:p.separations,repeatedRoutes:p.repeatedRoutes,lastRoom:p.lastRoom,style:p.style,confidence:+p.confidence.toFixed(2)}));try{net.send({type:'watcher_behavior',version:++state.serial,profiles,active:state.active});}catch(e){}}
 function applyRemote(msg){if(!msg||!Array.isArray(msg.profiles))return;state.profiles={};msg.profiles.forEach(p=>state.profiles[p.id]=p);state.active=msg.active||null;}
 if(net&&net.on)net.on('watcher_behavior',applyRemote);
 const oldChoose=planner.chooseTarget;
 planner.chooseTarget=function(){const auth=!net||!net.connected||net.role==='host';if(auth){const pick=chooseTacticalTarget();if(pick.member)return pick;}return oldChoose();};
 const oldDecide=planner.decide;
 planner.decide=function(){oldDecide();const auth=!net||!net.connected||net.role==='host';if(auth)applyTactic();};
 setInterval(()=>{if(g.state==='PLAYING'&&(!net||!net.connected||net.role==='host')){observe();if(now()-state.lastTick>1800){applyTactic();state.lastTick=now();}}},1100);
 setInterval(()=>{if(g.state==='PLAYING'&&(!net||!net.connected||net.role==='host')&&now()-state.lastBroadcast>1400){broadcast();state.lastBroadcast=now();}},1400);
 g.watcherBehaviorModel={state,profile,observe,classify,chooseTacticalTarget,applyTactic,applyRemote};
 show('BEHAVIOR MODEL','The Watcher now learns individual survivors.',2600);
}
boot();
})();
