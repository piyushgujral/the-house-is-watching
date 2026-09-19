/* THE HOUSE IS WATCHING — Engine 42: Adaptive Counterplay Director v1
 * Turns learned survivor behavior into persistent counter-tactics. Host owns decisions.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame, T=window.THREE;
 if(!g||!T||!g.scene||!g.player||!g.watcherHuntPlanner||!g.watcherBehaviorModel||!g.watcherEvidenceFusion)return setTimeout(boot,450);
 if(g.__engine42)return; g.__engine42=true;
 const planner=g.watcherHuntPlanner, behavior=g.watcherBehaviorModel, R=planner.rooms;
 const net=g.partyNetwork&&g.partyNetwork.net;
 const state={history:{},active:null,lastDecision:0,lastBroadcast:0,serial:0,version:1};
 const hud=document.createElement('div');hud.id='watcher-counterplay-hud';hud.style.cssText='position:fixed;top:314px;left:50%;transform:translateX(-50%);padding:8px 13px;background:rgba(8,5,7,.92);border:1px solid rgba(180,150,130,.3);color:#d7c8bb;font:700 9px/1.35 monospace;letter-spacing:1.2px;z-index:126;pointer-events:none;display:none;text-align:center;max-width:86vw';hud.innerHTML='<span id="wc-title">COUNTERPLAY</span><span id="wc-detail" style="opacity:.72;margin-left:8px"></span>';document.body.appendChild(hud);
 function show(a,b,ms){hud.style.display='block';hud.querySelector('#wc-title').textContent=a;hud.querySelector('#wc-detail').textContent=b||'';clearTimeout(show.timer);show.timer=setTimeout(()=>hud.style.display='none',ms||2100);}
 const now=()=>performance.now();
 function scale(){return g.scene.scale&&g.scene.scale.x||1;}
 function roomAt(x,z){let best='HALL',bd=1e9,s=scale();Object.keys(R).forEach(k=>{const d=Math.hypot(x/s-R[k].x,z/s-R[k].z);if(d<bd){bd=d;best=k;}});return best;}
 function rec(id){return state.history[id]||(state.history[id]={escapes:0,failedSearches:0,ambushes:0,intercepts:0,baits:0,breaks:0,lastStyle:'UNKNOWN',lastRoom:null,lastAction:'NONE',cooldown:0});}
 function members(){const a=[];if(g.player)a.push({id:'local',object:g.player,state:g.state==='PLAYING'?'ALIVE':'DEAD',name:'YOU'});if(g.coop&&g.coop.members)for(const m of g.coop.members.values())if(m.object&&m.state!=='DEAD')a.push(m);return a;}
 function evidence(room){const c=g.watcherEvidenceFusion&&g.watcherEvidenceFusion.state.cases[room];return c?c.confidence||0:0;}
 function chooseCounterplay(){
  const pick=behavior.chooseTacticalTarget&&behavior.chooseTacticalTarget(); if(!pick||!pick.member)return null;
  const m=pick.member,p=behavior.profile(m.id,m.name),h=rec(m.id),o=m.object,room=roomAt(o.position.x,o.position.z),fusion=evidence(room);
  let action='PRESS',score=pick.score;
  if(p.style==='RUSHER'){
   action=p.repeatedRoutes>=3?'BREAK_ROUTE':'INTERCEPT'; score+=p.repeatedRoutes*1.3;
  }else if(p.style==='HIDER'){
   action=(h.failedSearches>1||fusion<.3)?'BAIT_SEARCH':'SEARCH'; score+=p.hides*.04;
  }else if(p.style==='LIGHT-DEPENDENT'){
   action=h.ambushes>1?'DARKNESS_BAIT':'AMBUSH'; score+=p.lights*.03;
  }else if(p.style==='LONE-WOLF'){
   action='ISOLATE'; score+=p.separations*.04;
  }else if(p.style==='HABITUAL'){
   action=h.breaks>0?'FALSE_ROUTE':'BREAK_ROUTE'; score+=p.repeatedRoutes*1.6;
  }else{
   action=fusion>.65?'VERIFY_TRAIL':'PRESS'; score+=fusion*2;
  }
  if(h.cooldown>now()) return null;
  return {member:m,profile:p,history:h,room,action,score};
 }
 function mutateLayout(room,action){
  const layout=g.houseLayoutDirector;
  if(!layout)return;
  try{
   if(action==='BREAK_ROUTE'||action==='FALSE_ROUTE'){
    if(layout.state)layout.state.active={type:action==='BREAK_ROUTE'?'CLOSE_ROUTE':'FALSE_SAFE',room,expires:now()+6500};
    if(layout.applyMutation)layout.applyMutation(action==='BREAK_ROUTE'?'CLOSE_ROUTE':'FALSE_SAFE',room,6500);
   } else if(action==='ISOLATE'&&layout.state){
    layout.state.active={type:'FUNNEL',room,expires:now()+5500};
    if(layout.applyMutation)layout.applyMutation('FUNNEL',room,5500);
   }
  }catch(e){}
 }
 function execute(c){
  const p=c.profile,h=c.history;
  planner.state.targetId=c.member.id; planner.state.goalRoom=c.room;
  if(c.action==='INTERCEPT'||c.action==='BREAK_ROUTE'||c.action==='FALSE_ROUTE')planner.state.mode='INTERCEPT';
  else if(c.action==='AMBUSH'||c.action==='DARKNESS_BAIT')planner.state.mode='AMBUSH';
  else if(c.action==='SEARCH'||c.action==='BAIT_SEARCH')planner.state.mode='SEARCH';
  else if(c.action==='ISOLATE')planner.state.mode='HUNT';
  else if(c.action==='VERIFY_TRAIL')planner.state.mode='SEARCH';
  mutateLayout(c.room,c.action);
  h.lastStyle=p.style;h.lastRoom=c.room;h.lastAction=c.action;h.cooldown=now()+7000;
  if(c.action==='BREAK_ROUTE')h.breaks++;
  if(c.action==='INTERCEPT')h.intercepts++;
  if(c.action==='AMBUSH'||c.action==='DARKNESS_BAIT')h.ambushes++;
  if(c.action==='BAIT_SEARCH')h.baits++;
  state.active={id:c.member.id,name:c.member.name,style:p.style,action:c.action,room:c.room,score:+c.score.toFixed(2),time:now()};
  const text={BREAK_ROUTE:'YOUR HABIT IS BROKEN',FALSE_ROUTE:'THE SAFE WAY LIES',INTERCEPT:'IT CUT YOU OFF',AMBUSH:'THE DARKNESS WAITED',DARKNESS_BAIT:'THE LIGHT BETRAYED YOU',SEARCH:'IT REMEMBERS',BAIT_SEARCH:'IT IS SEARCHING WRONG',ISOLATE:'THE HOUSE SEPARATES YOU',VERIFY_TRAIL:'IT CHECKS THE TRAIL',PRESS:'IT IS CLOSING IN'}[c.action]||'THE WATCHER ADAPTS';
  show(text,p.style+' / '+c.room,2300);
 }
 function detectEscape(){
  const a=state.active;if(!a)return;
  const m=members().find(x=>x.id===a.id);if(!m)return;
  const d=Math.hypot(m.object.position.x-(g.entityGroup||g.entity).position.x,m.object.position.z-(g.entityGroup||g.entity).position.z)/scale();
  const h=rec(a.id);
  if(d>14&&a.action!=='PRESS'){h.escapes++;}
  if(a.action==='SEARCH'&&m.object.userData&&m.object.userData.isHiding===false)h.failedSearches++;
 }
 function broadcast(){if(!net||!net.connected||net.role!=='host'||!net.send)return;try{net.send({type:'watcher_counterplay',version:++state.serial,history:Object.fromEntries(Object.entries(state.history).map(([id,h])=>[id,{...h}])),active:state.active});}catch(e){}}
 function remote(msg){if(!msg)return;state.history=msg.history||{};state.active=msg.active||null;}
 if(net&&net.on)net.on('watcher_counterplay',remote);
 const oldDecide=planner.decide;
 planner.decide=function(){oldDecide();const auth=!net||!net.connected||net.role==='host';if(!auth)return;if(now()-state.lastDecision<4200)return;const c=chooseCounterplay();if(c){execute(c);state.lastDecision=now();}};
 setInterval(()=>{if(g.state==='PLAYING'&&(!net||!net.connected||net.role==='host')){detectEscape();}},1500);
 setInterval(()=>{if(g.state==='PLAYING'&&(!net||!net.connected||net.role==='host')&&now()-state.lastBroadcast>1600){broadcast();state.lastBroadcast=now();}},1600);
 g.watcherCounterplay={state,chooseCounterplay,execute,remote};
 show('COUNTERPLAY DIRECTOR','The Watcher now counters repeated survivor habits.',2700);
}
boot();
})();
