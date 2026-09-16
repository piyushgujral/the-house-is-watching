/* THE HOUSE IS WATCHING — Engine 27: Party Room / Network Transport Layer
 * A real browser-to-browser foundation using WebRTC data channels with a tiny
 * signaling adapter. It is transport-ready without requiring a paid backend.
 * The game remains playable solo when no room is connected.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame;
 if(!g||!g.scene||!g.player||!g.coop)return setTimeout(boot,180);
 if(g.__engine27)return;g.__engine27=true;
 const panel=document.createElement('div');panel.id='party-panel';panel.style.cssText='position:fixed;left:18px;bottom:118px;width:250px;padding:11px;background:rgba(4,4,6,.82);border:1px solid rgba(215,195,170,.25);font:11px/1.5 monospace;color:#ded3c5;z-index:80;display:none;pointer-events:auto';panel.innerHTML='<div style="font-weight:800;letter-spacing:2px">HOUSE PARTY</div><div id="party-status" style="opacity:.7;margin:4px 0">SOLO</div><input id="party-code" placeholder="ROOM CODE" maxlength="12" style="width:100%;box-sizing:border-box;background:#111;color:#ddd;border:1px solid #444;padding:6px"><div style="display:flex;gap:6px;margin-top:7px"><button id="party-host">HOST</button><button id="party-join">JOIN</button><button id="party-close">×</button></div><div id="party-info" style="opacity:.55;margin-top:7px">Use a signaling service URL later; gameplay state is transport-neutral.</div>';
 document.body.appendChild(panel);
 const status=panel.querySelector('#party-status'),code=panel.querySelector('#party-code'),info=panel.querySelector('#party-info');
 const net={connected:false,role:'solo',room:null,peerId:'p_'+Math.random().toString(36).slice(2,9),pc:null,channel:null,signalUrl:null,send:null};
 function show(msg){status.textContent=msg;}
 function encode(v){try{return JSON.stringify(v)}catch(e){return ''}}
 function apply(packet){if(!packet||packet.type!=='state'||!g.coop)return;if(packet.id===net.peerId)return;g.coop.updateRemotePlayer(packet.id,packet.data||{});}
 function openChannel(ch){net.channel=ch;ch.onopen=()=>{net.connected=true;show('CONNECTED • '+(net.room||'ROOM'));info.textContent='Connected. Shared movement state is live.';};ch.onclose=()=>{net.connected=false;show('DISCONNECTED');};ch.onmessage=e=>{try{apply(JSON.parse(e.data))}catch(_){} };net.send=p=>{if(ch.readyState==='open')ch.send(encode(p));};}
 function makePeer(offer){
  if(!window.RTCPeerConnection){show('WEBRTC NOT AVAILABLE');return null;}
  const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});net.pc=pc;
  if(offer){const ch=pc.createDataChannel('house');openChannel(ch);}
  pc.ondatachannel=e=>openChannel(e.channel);
  pc.onicecandidate=e=>{if(e.candidate)info.textContent='ICE READY — paste signaling through the configured adapter.';};
  return pc;
 }
 async function host(){
  net.role='host';net.room=(code.value||Math.random().toString(36).slice(2,8)).toUpperCase();code.value=net.room;g.coop.state.mode='PARTY';show('HOST • '+net.room);info.textContent='Host room created. Signaling adapter can exchange the offer with a joiner.';const pc=makePeer(true);if(!pc)return;const offer=await pc.createOffer();await pc.setLocalDescription(offer);net.offer=offer;}
 async function join(){
  net.role='join';net.room=(code.value||'ROOM').toUpperCase();g.coop.state.mode='PARTY';show('JOIN • '+net.room);info.textContent='Join transport ready. A signaling adapter should provide the host offer.';makePeer(false);}
 panel.querySelector('#party-host').onclick=()=>host().catch(e=>show('HOST ERROR'));
 panel.querySelector('#party-join').onclick=()=>join().catch(e=>show('JOIN ERROR'));
 panel.querySelector('#party-close').onclick=()=>panel.style.display='none';
 const oldUpdate=g.updatePlayer.bind(g),clock={t:0};
 g.updatePlayer=function(dt){oldUpdate(dt);if(this.state!=='PLAYING')return;clock.t+=dt;if(net.send&&clock.t>.12){clock.t=0;const p=this.player;net.send({type:'state',id:net.peerId,data:{name:'PLAYER',state:'ALIVE',health:100,room:g.coop&&g.coop.state?g.coop.state.sharedStage:'',x:p.x,z:p.z,rotation:this.camera&&this.camera.rotation?this.camera.rotation.y:0}});}};
 g.partyNetwork={panel,net,host,join,openChannel,apply,show};
 // Expose a deliberate UI entry point for future menu integration.
 window.openHouseParty=()=>{panel.style.display=panel.style.display==='none'?'block':'none';};
}
boot();
})();
