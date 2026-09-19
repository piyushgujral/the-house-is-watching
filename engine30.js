/* THE HOUSE IS WATCHING — Engine 30: Co-op Survival Director v2
 * Major gameplay chunk: reliable custom packet ordering, synchronized revive /
 * hiding state, party survival state machine, extraction coordination,
 * downed survivor markers and Watcher target/search hints.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.player||!g.coop||!g.partyNetwork)return setTimeout(boot,220);
 if(g.__engine30)return;g.__engine30=true;
 const net=g.partyNetwork.net, S=()=>g.scene.scale&&g.scene.scale.x||1;
 const state={phase:'ACTIVE',seq:0,lastTx:0,lastHeartbeat:0,lastParty:0,peerAlive:true,received:new Map(),downed:new Map(),hidden:new Set(),extraction:false};
 const markerGroup=new T.Group();markerGroup.name='CoopSurvivorMarkers';g.scene.add(markerGroup);
 const markers=new Map();
 function send(type,data){if(!net||!net.connected||!net.send)return false;state.seq++;net.send({type,id:net.peerId,seq:state.seq,data:data||{}});return true;}
 function accept(packet){if(!packet||!packet.id)return false;if(packet.id===net.peerId)return false;const k=packet.id,seq=Number(packet.seq||0),last=Number(state.received.get(k)||0);if(seq&&seq<=last)return false;if(seq)state.received.set(k,seq);return true;}
 function members(){return Array.from(g.coop.members.values());}
 function localMember(){return g.coop.members.get('local');}
 function party(){return members().filter(m=>m.state!=='DEAD');}
 function allDown(){const p=party();return p.length>0&&p.every(m=>m.state==='DOWNED');}
 function allAtExit(){const e=g.houseEndgame;if(!e||!e.finished)return false;const ex=g.exit||{x:0,z:14.5};return party().filter(m=>m.state!=='DOWNED').every(m=>{const o=m.id==='local'?g.player:m.object&&m.object.position;return o&&Math.hypot(o.x-ex.x,o.z-ex.z)<3.0*S();});}
 function say(text){if(g.worldOverhaul&&g.worldOverhaul.say)g.worldOverhaul.say(text);else if(g.flashPrompt)g.flashPrompt(text);}
 function markerFor(m){let x=markers.get(m.id);if(x)return x;const root=new T.Group();const beam=new T.Mesh(new T.CylinderGeometry(.025*S(),.06*S(),1.3*S(),6),new T.MeshBasicMaterial({color:0xb88b73,transparent:true,opacity:.72}));beam.position.y=.7*S();root.add(beam);const ring=new T.Mesh(new T.TorusGeometry(.24*S(),.025*S(),6,18),new T.MeshBasicMaterial({color:0xb88b73,transparent:true,opacity:.75}));ring.rotation.x=Math.PI/2;root.add(ring);root.visible=false;markerGroup.add(root);markers.set(m.id,root);return root;}
 function updateMarkers(){
  const seen=new Set();members().forEach(m=>{if(m.id==='local'||m.state!=='DOWNED')return;const p=m.object&&m.object.position;if(!p)return;const x=markerFor(m);x.position.copy(p);x.visible=true;seen.add(m.id);});markers.forEach((x,id)=>{if(!seen.has(id))x.visible=false;});
 }
 function syncLocalState(){
  const m=localMember();if(!m)return;
  const hiding=!!(g.isHiding||g.hidden||g.playerHidden||g.hideState);
  if(hiding)m.state='HIDING';else if(m.state==='HIDING')m.state='ALIVE';
  m.room=g.currentRoom||m.room||'';
  return {name:m.name||'SURVIVOR',state:m.state||'ALIVE',room:m.room||'',x:g.player.x,z:g.player.z,rotation:g.camera&&g.camera.rotation?g.camera.rotation.y:0,hidden:hiding,health:m.health||100};
 }
 function partyState(){
  if(state.phase==='VICTORY'||state.phase==='WIPE')return state.phase;
  if(allDown())return 'WIPE';
  if(g.houseEndgame&&g.houseEndgame.finished)return 'EXTRACTION';
  return 'ACTIVE';
 }
 function applyPartyState(p){
  if(!p)return;const old=state.phase;state.phase=p.phase||old;state.extraction=state.phase==='EXTRACTION';
  if(state.phase!==old){if(state.phase==='EXTRACTION')say('THE HOUSE IS OPEN. EVERYONE TO THE FRONT DOOR.');if(state.phase==='WIPE')say('THE HOUSE TOOK THE ENTIRE PARTY.');if(state.phase==='VICTORY')say('THE PARTY ESCAPED.');}
 }
 function revive(target){if(!target||!g.coop)return false;const m=g.coop.members.get(target);if(!m||m.state!=='DOWNED')return false;const ok=g.coop.revive(target);if(ok!==false){send('REVIVE',{target});say('SURVIVOR REVIVED');return true;}return false;}
 function tryRevive(){
  const m=g.coop.nearbyDowned&&g.coop.nearbyDowned();
  if(!m)return false;
  return revive(m.id);
 }
 function extractionCheck(){
  if(state.phase!=='EXTRACTION')return;
  if(allAtExit()&&net&&net.connected){if(net.role==='host'){state.phase='VICTORY';send('PARTY_PHASE',{phase:'VICTORY'});if(g.win)g.win();}}
 }
 function hostDirector(dt){
  if(!net||!net.connected||net.role!=='host')return;
  const desired=partyState();
  if(desired!==state.phase){state.phase=desired;send('PARTY_PHASE',{phase:desired});if(desired==='EXTRACTION')say('RUN. THE FRONT DOOR IS OPEN.');if(desired==='WIPE')say('NO ONE IS LEFT.');if(desired==='VICTORY'&&g.win)g.win();}
  state.lastParty-=dt;if(state.lastParty<=0){state.lastParty=.5;send('PARTY_STATE',{phase:state.phase,extraction:state.extraction,seals:g.houseEndgame&&g.houseEndgame.seals||0});}
 }
 function watcherHints(){
  if(!g.multiplayerWatcher)return;
  const m=localMember();if(!m)return;
  if(m.state==='HIDING'&&g.multiplayerWatcher.state){g.multiplayerWatcher.state.mode='SEARCH';}
 }
 const oldApply=g.partyNetwork.apply;
 g.partyNetwork.apply=function(packet){
  if(!accept(packet))return;
  if(packet.type==='PARTY_PHASE')applyPartyState(packet.data);
  else if(packet.type==='PARTY_STATE')applyPartyState(packet.data);
  else if(packet.type==='REVIVE'&&packet.data&&packet.data.target)g.coop.revive(packet.data.target);
  else if(packet.type==='HIDE_STATE'&&packet.data){const m=g.coop.members.get(packet.data.id);if(m)m.state=packet.data.hidden?'HIDING':(m.state==='HIDING'?'ALIVE':m.state);}
  else if(packet.type==='DOWN'&&packet.data&&packet.data.target)g.coop.down(packet.data.target);
  if(oldApply)oldApply(packet);
  updateMarkers();
 };
 const oldInteract=g.interactNow&&g.interactNow.bind(g);
 if(oldInteract)g.interactNow=function(){
  const before=state.phase;const result=oldInteract();
  const m=g.coop.nearbyDowned&&g.coop.nearbyDowned();
  if(m)revive(m.id);
  const after=state.phase;if(after!==before)send('PARTY_PHASE',{phase:after});
  return result;
 };
 const oldUpdate=g.updatePlayer.bind(g);
 g.updatePlayer=function(dt){
  oldUpdate(dt);if(this.state!=='PLAYING')return;
  const local=syncLocalState();
  if(net&&net.connected){
   state.lastTx-=dt;state.lastHeartbeat-=dt;
   if(state.lastTx<=0){state.lastTx=.12;send('SURVIVOR_STATE',local);}
   if(state.lastHeartbeat<=0){state.lastHeartbeat=2;send('PARTY_HEARTBEAT',{t:Date.now(),phase:state.phase});}
  }
  hostDirector(dt);watcherHints();extractionCheck();updateMarkers();
 };
 const oldDie=g.die&&g.die.bind(g);
 if(oldDie)g.die=function(){
  const r=oldDie.apply(this,arguments);const m=localMember();if(m)m.state='DEAD';if(net&&net.connected)send('DOWN',{target:'local'});return r;
 };
 g.coopSurvivalDirector={state,send,revive,tryRevive,partyState,applyPartyState,updateMarkers};
}
boot();
})();
