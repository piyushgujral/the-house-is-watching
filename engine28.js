/* THE HOUSE IS WATCHING — Engine 28: Co-op Director / Shared House State
 * Major gameplay chunk: network event replication, party-wide objective sync,
 * revive actions, shared house pressure, synchronized endgame and party HUD.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.player||!g.coop||!g.partyNetwork)return setTimeout(boot,220);
 if(g.__engine28)return;g.__engine28=true;
 const net=g.partyNetwork.net, S=()=>g.scene.scale&&g.scene.scale.x||1;
 const ui=document.createElement('div');ui.id='party-director-hud';ui.style.cssText='position:fixed;right:14px;top:112px;min-width:190px;max-width:250px;padding:9px 11px;background:rgba(4,4,6,.68);border:1px solid rgba(220,195,170,.22);font:700 10px/1.55 monospace;letter-spacing:1px;color:#ddd0c0;z-index:35;pointer-events:none;display:none';
 ui.innerHTML='<div style="font-size:9px;opacity:.5;letter-spacing:2px">PARTY SIGNAL</div><div id="pd-state">SOLO</div><div id="pd-objective" style="margin-top:5px"></div><div id="pd-members"></div>';
 document.body.appendChild(ui);
 const state={host:false,seq:0,lastShared:0,lastEvent:0,housePressure:0,lastStage:-1,lastSeals:-1,partyWon:false,partyLost:false};
 const eventHistory=new Map();
 let oldUpdate=g.updatePlayer.bind(g),oldEntity=g.updateEntity.bind(g),oldInteract=g.interactNow&&g.interactNow.bind(g),oldWin=g.win&&g.win.bind(g),oldDie=g.die&&g.die.bind(g);
 function say(t){if(g.worldOverhaul&&g.worldOverhaul.say)g.worldOverhaul.say(t);else if(g.flashPrompt)g.flashPrompt(t);}
 function send(type,data){if(!net||!net.connected||!net.send)return false;state.seq++;net.send({type,id:net.peerId,seq:state.seq,data:data||{}});return true;}
 function campaign(){return g.campaign||{};}
 function snapshot(){const c=campaign(),e=g.houseEndgame;return{stage:c.stage||0,flags:Object.assign({},c.flags||{}),seals:e&&e.seals||0,pressure:Number(c.pressure||0),phase:g.phase||0,finished:!!(e&&e.finished),time:Number(c.time||0)};}
 function objectiveFrom(s){if(s.stage>=6)return'RUN TO THE FRONT DOOR';if(s.seals>=3)return'REACH THE FRONT DOOR';if(s.stage===4)return'BREAK THE THREE HOUSE SEALS';if(s.stage===3)return'FIND THE WATCHER DOLL';if(s.stage===2)return'FIND THE MASTER KEY';if(s.stage===1)return'RESTORE POWER';return'FIND THE FUSE';}
 function applySnapshot(snap){
  if(!snap)return;
  const c=campaign();
  if((snap.stage||0)>=(c.stage||0)){c.stage=snap.stage||0;c.flags=Object.assign({},c.flags||{},snap.flags||{});}
  if(g.houseEndgame&&Number(snap.seals||0)>Number(g.houseEndgame.seals||0)){g.houseEndgame.seals=snap.seals;}
  state.housePressure=Math.max(state.housePressure,Number(snap.pressure||0));
  if(c) c.pressure=Math.max(Number(c.pressure||0),state.housePressure);
  if(g.phase<Number(snap.phase||0))g.phase=snap.phase;
  state.partyWon=state.partyWon||!!snap.finished;
 }
 function event(type,payload){
  const key=(type+':'+(payload&&payload.id||payload&&payload.n||'0'));
  if(eventHistory.has(key))return;
  eventHistory.set(key,performance.now());
  if(eventHistory.size>80){const first=eventHistory.keys().next().value;eventHistory.delete(first);}
  if(type==='HOUSE_EVENT'){say(payload.text||'THE HOUSE IS WATCHING');g.fear=Math.min(100,(g.fear||0)+Number(payload.fear||1));}
  if(type==='SEAL_BREAK'&&g.houseEndgame){g.houseEndgame.seals=Math.max(g.houseEndgame.seals,payload.seals||0);}
  if(type==='REVIVE'&&payload.target)g.coop.revive(payload.target);
  if(type==='DOWN'&&payload.target)g.coop.down(payload.target);
 }
 function hostAuthority(){
  if(!net||!net.connected)return false;
  return net.role==='host';
 }
 function maybeHouseEvent(dt){
  if(!hostAuthority()||g.state!=='PLAYING'||!campaign().stage||campaign().stage<2)return;
  state.lastEvent-=dt;
  if(state.lastEvent>0)return;
  state.lastEvent=18+Math.random()*16;
  const c=campaign(),e=g.houseEndgame,pressure=Number(c.pressure||0)+Number(g.fear||0)*.2;
  if(e&&e.finished)return;
  if(Math.random()>.58||pressure<22)return;
  const texts=['FOOTSTEPS ABOVE YOU','THE HOUSE JUST BREATHED','THE DOOR BEHIND YOU MOVED','SOMETHING IS WATCHING THE HALL'];
  const p={id:Math.floor(Math.random()*999999),text:texts[Math.floor(Math.random()*texts.length)],fear:pressure>45?2.5:1.2};
  send('HOUSE_EVENT',p);event('HOUSE_EVENT',p);
 }
 function partyRules(){
  const vals=Array.from(g.coop.members.values());
  if(!vals.length)return;
  const alive=vals.filter(m=>m.state!=='DEAD').length;
  state.partyLost=vals.length>1&&alive===0;
  state.partyWon=state.partyWon||!!(g.houseEndgame&&g.houseEndgame.finished);
  if(state.partyLost){ui.style.display='block';say('THE HOUSE TOOK EVERYONE');}
 }
 function render(){
  const c=campaign(),e=g.houseEndgame;
  ui.style.display=(net&&net.connected)||g.coop.members.size>1?'block':'none';
  ui.querySelector('#pd-state').textContent=net&&net.connected?'CONNECTED • '+(net.role||'PEER'):'PARTY READY';
  ui.querySelector('#pd-objective').textContent=(e&&e.started?'SEALS '+(e.seals||0)+'/3 • ':'')+objectiveFrom({stage:c.stage||0,seals:e&&e.seals||0});
  ui.querySelector('#pd-members').innerHTML=Array.from(g.coop.members.values()).map(m=>m.name+' • '+m.state).join('<br>');
 }
 if(oldInteract)g.interactNow=function(){
  const before=g.houseEndgame&&g.houseEndgame.seals||0;
  const r=oldInteract();
  const after=g.houseEndgame&&g.houseEndgame.seals||0;
  if(net&&net.connected&&after>before)send('SEAL_BREAK',{id:Date.now(),seals:after});
  render();return r;
 };
 if(oldDie)g.die=function(){const r=oldDie.apply(this,arguments);if(net&&net.connected)send('DOWN',{target:'local'});return r;};
 if(oldWin)g.win=function(){state.partyWon=true;if(net&&net.connected)send('PARTY_WIN',{stage:6});return oldWin.apply(this,arguments);};
 g.updatePlayer=function(dt){
  oldUpdate(dt);if(this.state!=='PLAYING')return;
  maybeHouseEvent(dt);partyRules();render();
  state.lastShared-=dt;
  if(net&&net.connected&&state.lastShared<=0){state.lastShared=.25;const snap=snapshot();if(snap.stage!==state.lastStage||snap.seals!==state.lastSeals||Math.abs(snap.pressure-state.housePressure)>4){state.lastStage=snap.stage;state.lastSeals=snap.seals;state.housePressure=snap.pressure;send('CAMPAIGN_SYNC',snap);}}
  if(state.partyLost&&g.deathScreen&&!g.deathScreen.classList.contains('hidden')){}
 };
 g.updateEntity=function(dt){
  oldEntity(dt);if(this.state!=='PLAYING')return;
  if(net&&net.connected&&net.role==='host'&&g.houseEndgame&&g.houseEndgame.finished)this.entity.speed=3.7;
 };
 const oldApply=g.partyNetwork.apply;
 g.partyNetwork.apply=function(packet){
  if(!packet)return;
  if(packet.type==='CAMPAIGN_SYNC')applySnapshot(packet.data);
  else if(packet.type==='HOUSE_EVENT'||packet.type==='SEAL_BREAK'||packet.type==='REVIVE'||packet.type==='DOWN')event(packet.type,packet.data||{});
  else if(packet.type==='PARTY_WIN'){state.partyWon=true;say('EVERYONE — RUN FOR THE DOOR');}
  if(oldApply)oldApply(packet);
  render();
 };
 g.coopPartyDirector={state,send,event,applySnapshot,render};
 render();
}
boot();
})();