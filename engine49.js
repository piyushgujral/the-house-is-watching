/* THE HOUSE IS WATCHING — Engine 49: Communication Deception & Counter-Deception v1
 * Survivors can intentionally create misleading communication patterns. The Watcher
 * learns signal reliability by sender/type/room, verifies suspicious claims, and
 * exploits credible coordination without ever receiving direct survivor coordinates.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame;
 if(!g||!g.scene||!g.survivorCommsDirector||!g.watcherCommunicationResponse||!g.watcherHuntPlanner)return setTimeout(boot,500);
 if(g.__engine49)return;g.__engine49=true;
 const comms=g.survivorCommsDirector,resp=g.watcherCommunicationResponse,planner=g.watcherHuntPlanner;
 const net=g.partyNetwork&&g.partyNetwork.net;
 const now=()=>performance.now();
 const state={version:1,claims:[],trust:{},rooms:{},active:null,lastBroadcast:0,lastAction:0,decoys:0,verified:0,exploits:0};
 const hud=document.createElement('div');hud.id='comm-counter-deception';hud.style.cssText='position:fixed;top:412px;left:50%;transform:translateX(-50%);padding:8px 12px;background:rgba(4,3,5,.95);border:1px solid rgba(214,194,178,.38);color:#ded4ce;font:700 9px/1.35 monospace;letter-spacing:1px;z-index:129;pointer-events:none;display:none;text-align:center;max-width:90vw';hud.innerHTML='<span id="ccd-title">SIGNAL DOUBT</span><span id="ccd-detail" style="opacity:.72;margin-left:8px"></span>';document.body.appendChild(hud);
 function show(a,b,ms){hud.style.display='block';hud.querySelector('#ccd-title').textContent=a;hud.querySelector('#ccd-detail').textContent=b||'';clearTimeout(show.timer);show.timer=setTimeout(()=>hud.style.display='none',ms||2300);}
 function key(sender,type){return String(sender||'UNKNOWN')+'|'+String(type||'SIGNAL');}
 function trustFor(sender,type){const k=key(sender,type);return state.trust[k]||(state.trust[k]={score:.55,uses:0,good:0,bad:0,last:0});}
 function room(r){return planner.rooms&&planner.rooms[r]?planner.rooms[r]:null;}
 function remember(c){
  if(!c||!c.id||state.claims.some(x=>x.id===c.id))return;
  state.claims.push(c);if(state.claims.length>60)state.claims.splice(0,state.claims.length-60);
  const t=trustFor(c.from,c.type);t.uses++;t.last=c.time;
  const r=c.room;if(r){const x=state.rooms[r]||(state.rooms[r]={signals:0,decoys:0,rescues:0,regroups:0,objective:0,last:0});x.signals++;if(c.type==='DECOY'||c.type==='MISLEAD')x.decoys++;if(c.type==='RESCUE')x.rescues++;if(c.type==='REGROUP')x.regroups++;if(c.type==='OBJECTIVE')x.objective++;x.last=c.time;}
 }
 function ingest(){
  const list=(comms.state&&comms.state.signals)||[];
  list.forEach(s=>remember({id:'local:'+s.id,signalId:s.id,type:String(s.type||'SIGNAL'),room:s.room,from:s.from||'UNKNOWN',time:Number(s.created)||now(),expires:s.expires,confidence:Number(s.meta&&s.meta.confidence)||.55,source:'comms'}));
 }
 function ingestRemote(m){
  (m&&m.signals||[]).forEach(s=>remember({id:'net:'+s.id,signalId:s.id,type:String(s.type||'SIGNAL'),room:s.room,from:s.from||'UNKNOWN',time:Number(s.created)||now(),expires:s.expires,confidence:Number(s.meta&&s.meta.confidence)||.55,source:'network'}));
 }
 function decay(){
  const t=now();state.claims=state.claims.filter(c=>!c.expires||c.expires>t-2000);
  Object.values(state.trust).forEach(x=>{if(t-x.last>9000)x.score+=(.55-x.score)*.035;x.score=Math.max(.15,Math.min(.9,x.score));});
 }
 function analyzeRoom(r){
  const recent=state.claims.filter(c=>c.room===r&&now()-c.time<10000);if(!recent.length)return null;
  const same=recent.filter(c=>c.type==='DECOY'||c.type==='MISLEAD').length;
  const rescue=recent.filter(c=>c.type==='RESCUE').length;
  const regroup=recent.filter(c=>c.type==='REGROUP').length;
  const objective=recent.filter(c=>c.type==='OBJECTIVE').length;
  const reliability=recent.reduce((sum,c)=>sum+trustFor(c.from,c.type).score,0)/recent.length;
  const repetition=Math.min(1,Math.max(0,recent.length-1)/4);
  const contradiction=(same>=1?Math.min(1,.25+same*.18):0)+(rescue&&objective&&recent.some(c=>c.type==='DANGER')?.12:0);
  const doubt=Math.min(1,contradiction*.65+repetition*.25+(1-reliability)*.35);
  const opportunity=Math.min(1,reliability*.55+(rescue*.18)+(regroup*.16)+(objective*.1));
  return {room:r,recentCount:recent.length,reliability,doubt,opportunity,decoys:same,rescue,regroup,objective};
 }
 function choose(){
  const candidates=Object.keys(state.rooms).map(analyzeRoom).filter(Boolean).filter(x=>room(x.room));
  candidates.sort((a,b)=>(b.doubt*.72+b.opportunity*.38+b.rescue*.18)-(a.doubt*.72+a.opportunity*.38+a.rescue*.18));
  const c=candidates[0];if(!c)return null;
  if(c.doubt>.62)return {mode:'VERIFY_SIGNAL',room:c.room,score:c.doubt,reason:'low signal reliability'};
  if(c.opportunity>.72&&c.rescue>0)return {mode:'EXPLOIT_RESCUE',room:c.room,score:c.opportunity,reason:'credible rescue coordination'};
  if(c.opportunity>.68&&c.regroup>0)return {mode:'PRESS_REGROUP',room:c.room,score:c.opportunity,reason:'credible regroup pattern'};
  if(c.opportunity>.62&&c.objective>0)return {mode:'WATCH_OBJECTIVE',room:c.room,score:c.opportunity,reason:'credible objective claim'};
  return null;
 }
 function apply(a){
  if(!a||now()-state.lastAction<5200)return;const r=room(a.room);if(!r)return;
  if(a.mode==='VERIFY_SIGNAL'){planner.state.goalRoom=a.room;planner.state.mode='SEARCH';state.verified++;show('SIGNAL DOUBT','The Watcher is checking '+a.room,2200);}
  else {planner.state.goalRoom=a.room;planner.state.mode='INTERCEPT';if(a.mode==='EXPLOIT_RESCUE')state.exploits++;show(a.mode.replace(/_/g,' '),a.room,2200);}
  state.active={...a,started:now()};state.lastAction=now();
 }
 function learn(){
  if(!state.active)return;const a=state.active;if(now()-a.started<3800)return;
  const recent=state.claims.filter(c=>c.room===a.room&&now()-c.time<16000);const useful=recent.length>=2;
  recent.forEach(c=>{const t=trustFor(c.from,c.type);if(a.mode==='VERIFY_SIGNAL'){if(useful){t.bad++;t.score-=.035;}else{t.good++;t.score+=.055;}}else if(a.mode.indexOf('EXPLOIT')===0){if(useful){t.good++;t.score+=.045;}else{t.bad++;t.score-=.025;}}t.score=Math.max(.15,Math.min(.9,t.score));});state.active=null;
 }
 function sendDecoy(){
  if(g.state!=='PLAYING'||!comms.ping)return;const r=comms.roomAt(g.player||{position:{x:0,z:0}});const s=comms.ping('DECOY',r,{source:'PLAYER',deception:true});state.decoys++;show('FALSE LEAD',r,2600);
  if(net&&net.connected&&net.send)try{net.send({type:'survivor_deception_signal',signal:s});}catch(e){}
 }
 function remoteDeception(m){if(m&&m.signal)remember({id:'decoy:'+m.signal.id,signalId:m.signal.id,type:'DECOY',room:m.signal.room,from:m.signal.from||'UNKNOWN',time:now(),expires:m.signal.expires,confidence:.25,source:'network'});}
 function broadcast(){if(!net||!net.connected||net.role!=='host'||!net.send)return;try{net.send({type:'watcher_deception_state',version:++state.version,active:state.active,trust:state.trust,rooms:state.rooms,verified:state.verified,exploits:state.exploits});state.lastBroadcast=now();}catch(e){}}
 function remote(m){if(!m)return;state.active=m.active||null;state.trust=m.trust||state.trust;state.rooms=m.rooms||state.rooms;state.verified=Number(m.verified)||state.verified;state.exploits=Number(m.exploits)||state.exploits;}
 if(net&&net.on){net.on('survivor_comms',ingestRemote);net.on('survivor_deception_signal',remoteDeception);net.on('watcher_deception_state',remote);}
 const decoy=document.createElement('button');decoy.id='btn-comms-decoy';decoy.textContent='FALSE LEAD';decoy.style.cssText='position:fixed;right:18px;bottom:232px;z-index:133;display:none;padding:8px 10px;background:rgba(20,12,12,.9);border:1px solid rgba(190,140,125,.42);color:#dfc9c0;font:700 9px monospace;pointer-events:auto;touch-action:manipulation';decoy.onclick=sendDecoy;document.body.appendChild(decoy);
 function mobile(){return matchMedia('(pointer:coarse)').matches||innerWidth<760;}function resize(){decoy.style.display=mobile()?'block':'none';}window.addEventListener('resize',resize);resize();
 window.addEventListener('keydown',e=>{if(e.code==='KeyB'&&g.state==='PLAYING'){e.preventDefault();sendDecoy();}},{passive:false});
 setInterval(()=>{if(g.state!=='PLAYING')return;ingest();decay();const a=choose();if(a)apply(a);learn();},900);
 setInterval(()=>{if(g.state==='PLAYING'&&(!net||!net.connected||net.role==='host')&&now()-state.lastBroadcast>1900)broadcast();},1900);
 g.communicationDeceptionDirector={state,sendDecoy,ingest,choose,apply,learn,remote};
 show('COUNTER-DECEPTION','False leads are possible. The Watcher can learn whom to trust.',3200);
}
boot();
})();
