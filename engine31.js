/* THE HOUSE IS WATCHING — Engine 31: Co-op Session Resilience v1
 * Major multiplayer chunk: authoritative snapshots, peer liveness, reconnect-safe
 * state restoration, host-loss detection, stale snapshot rejection and party recovery UI.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.player||!g.coop||!g.partyNetwork)return setTimeout(boot,220);
 if(g.__engine31)return;g.__engine31=true;
 const net=g.partyNetwork.net, S=()=>g.scene.scale&&g.scene.scale.x||1;
 const state={snapshotSeq:0,lastSnapshotTx:0,lastPeerRx:0,lastPresenceTx:0,connectedAt:0,sessionState:'SOLO',hostAlive:true,recoveryShown:false};
 const peers=new Map();
 const ui=document.createElement('div');ui.id='session-resilience-hud';ui.style.cssText='position:fixed;left:50%;top:72px;transform:translateX(-50%);min-width:220px;max-width:calc(100vw - 28px);padding:8px 12px;background:rgba(4,4,6,.86);border:1px solid rgba(220,195,170,.25);font:700 10px/1.45 monospace;letter-spacing:1px;color:#ddd0c0;text-align:center;z-index:120;pointer-events:none;display:none';ui.innerHTML='<div id="sr-title">PARTY LINK</div><div id="sr-detail" style="opacity:.68;margin-top:2px"></div>';document.body.appendChild(ui);
 function show(title,detail,ms){ui.style.display='block';ui.querySelector('#sr-title').textContent=title;ui.querySelector('#sr-detail').textContent=detail||'';if(ms)setTimeout(()=>{if(state.sessionState==='CONNECTED')ui.style.display='none';},ms);}
 function send(type,data){if(!net||!net.connected||!net.send)return false;state.snapshotSeq++;net.send({type,id:net.peerId,seq:state.snapshotSeq,data:data||{}});return true;}
 function campaign(){return g.campaign||{};}
 function snapshot(){const c=campaign(),e=g.houseEndgame,members=Array.from(g.coop.members.values()).map(m=>({id:m.id,name:m.name||'SURVIVOR',state:m.state||'ALIVE',health:Number(m.health||100),room:m.room||'',x:Number(m.object&&m.object.position.x||0),z:Number(m.object&&m.object.position.z||0)}));return{version:1,seq:state.snapshotSeq,stage:Number(c.stage||0),flags:Object.assign({},c.flags||{}),seals:Number(e&&e.seals||0),pressure:Number(c.pressure||0),phase:Number(g.phase||0),finished:!!(e&&e.finished),members};}
 function applySnapshot(s){if(!s||s.version!==1)return;if(Number(s.seq||0)<state.snapshotSeq)return;state.snapshotSeq=Number(s.seq||state.snapshotSeq);const c=campaign();if(Number(s.stage||0)>Number(c.stage||0)){c.stage=Number(s.stage||0);c.flags=Object.assign({},c.flags||{},s.flags||{});}if(g.houseEndgame&&Number(s.seals||0)>Number(g.houseEndgame.seals||0))g.houseEndgame.seals=Number(s.seals);if(c)c.pressure=Math.max(Number(c.pressure||0),Number(s.pressure||0));if(Number(s.phase||0)>Number(g.phase||0))g.phase=Number(s.phase);if(g.houseEndgame&&s.finished)g.houseEndgame.finished=true;(s.members||[]).forEach(m=>{if(!m.id||m.id==='local')return;const cur=g.coop.members.get(m.id);if(cur){cur.state=m.state||cur.state;cur.health=m.health||cur.health;cur.room=m.room||cur.room;}});state.lastPeerRx=performance.now();state.hostAlive=true;}
 function partyPresence(){return{role:net&&net.role||'solo',id:net&&net.peerId||'',t:Date.now(),phase:g.coopSurvivalDirector&&g.coopSurvivalDirector.state?g.coopSurvivalDirector.state.phase:'ACTIVE'};}
 const oldApply=g.partyNetwork.apply;
 g.partyNetwork.apply=function(packet){
  if(packet&&packet.type==='SESSION_SNAPSHOT'){if(packet.id!==net.peerId){state.lastPeerRx=performance.now();if(net.role==='join')state.hostAlive=true;applySnapshot(packet.data);show('PARTY SYNCED','Authoritative house state restored.',900);}}
  else if(packet&&packet.type==='PARTY_HEARTBEAT'){if(packet.id!==net.peerId){state.lastPeerRx=performance.now();state.hostAlive=true;}}
  else if(packet&&packet.type==='SESSION_PRESENCE'){if(packet.id!==net.peerId){peers.set(packet.id,{at:performance.now(),role:packet.data&&packet.data.role||'peer'});state.lastPeerRx=performance.now();}}
  if(oldApply)oldApply(packet);
 };
 const oldUpdate=g.updatePlayer.bind(g);
 g.updatePlayer=function(dt){
  oldUpdate(dt);if(this.state!=='PLAYING')return;
  if(!net||!net.connected)return;
  if(!state.connectedAt)state.connectedAt=performance.now();
  state.lastSnapshotTx-=dt;state.lastPresenceTx-=dt;
  if(state.lastPresenceTx<=0){state.lastPresenceTx=2;send('SESSION_PRESENCE',partyPresence());}
  if(net.role==='host'&&state.lastSnapshotTx<=0){state.lastSnapshotTx=.8;send('SESSION_SNAPSHOT',snapshot());}
  if(net.role==='join'&&state.lastPeerRx&&performance.now()-state.lastPeerRx>7000){
   if(state.hostAlive){state.hostAlive=false;show('HOST LINK LOST','The house is still running locally. Reconnect the host session to restore party authority.');}
  }
  if(net.role==='host'&&net.lastRx&&performance.now()-net.lastRx>12000){
   show('SURVIVOR LINK LOST','The other survivor has disconnected. The house will continue for the remaining survivor.');
  }
 };
 const oldOpen=g.partyNetwork.openChannel;
 g.partyNetwork.openChannel=function(ch){const r=oldOpen?oldOpen(ch):undefined;ch.addEventListener('open',()=>{state.sessionState='CONNECTED';state.connectedAt=performance.now();state.lastPeerRx=performance.now();state.hostAlive=true;show('PARTY LINK ESTABLISHED','Synchronizing house memory…',1600);setTimeout(()=>send('SESSION_PRESENCE',partyPresence()),80);setTimeout(()=>{if(net.role==='host')send('SESSION_SNAPSHOT',snapshot());},180);});ch.addEventListener('close',()=>{state.sessionState='SOLO';state.hostAlive=false;show('PARTY LINK CLOSED','Reconnect through HOUSE PARTY to restore co-op.');});return r;};
 g.coopSessionResilience={state,peers,snapshot,applySnapshot,send,show};
}
boot();
})();
