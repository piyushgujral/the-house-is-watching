/* THE HOUSE IS WATCHING — Engine 32: Deception & Party Hunt Director v1
 * Major encounter chunk: adaptive party-splitting pressure, synchronized survivor pings,
 * false teammate apparitions, hiding-aware search cues, and host-authoritative deception events.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.player||!g.coop||!g.partyNetwork)return setTimeout(boot,240);
 if(g.__engine32)return;g.__engine32=true;
 const net=g.partyNetwork.net, S=()=>g.scene.scale&&g.scene.scale.x||1;
 const D={pressure:0,split:0,lastEvent:0,lastPing:0,lastBroadcast:0,eventSeq:0,decoyUntil:0,decoys:new Map(),pings:new Map(),searchTarget:null};
 const ray=new T.Raycaster();
 const ui=document.createElement('div');ui.id='deception-hud';ui.style.cssText='position:fixed;right:14px;top:118px;width:min(290px,calc(100vw - 28px));padding:9px 11px;background:rgba(4,4,6,.78);border:1px solid rgba(220,195,170,.2);font:700 10px/1.45 monospace;letter-spacing:1px;color:#ded2c5;z-index:121;pointer-events:none;display:none';ui.innerHTML='<div id="dh-title">HOUSE SIGNAL</div><div id="dh-detail" style="opacity:.7;margin-top:3px"></div>';document.body.appendChild(ui);
 function show(title,detail,ms){ui.style.display='block';ui.querySelector('#dh-title').textContent=title;ui.querySelector('#dh-detail').textContent=detail||'';if(ms)setTimeout(()=>{if(performance.now()-D.lastEvent>ms)ui.style.display='none'},ms)}
 function members(){return Array.from(g.coop.members.values()).filter(m=>m.state!=='DEAD');}
 function pos(m){if(!m)return null;if(m.id==='local')return g.player;return m.object&&m.object.visible?m.object.position:null;}
 function dist(a,b){return Math.hypot(a.x-b.x,a.z-b.z)/S();}
 function room(m){return m&&m.room||'';}
 function splitScore(){const ms=members(),rooms=new Set(ms.map(room).filter(Boolean));let d=0;if(ms.length>1&&rooms.size>1)d+=.55;if(ms.length>1){const p=pos(ms[0]);for(let i=1;i<ms.length;i++){const q=pos(ms[i]);if(p&&q)d+=Math.min(.8,dist(p,q)/12)}}return Math.min(1,d);}
 function nearestHidden(){let best=null,bd=999;members().forEach(m=>{if(m.state==='HIDING'){const p=pos(m),w=g.entityGroup&&g.entityGroup.position;if(p&&w){const d=dist(p,w);if(d<bd){bd=d;best=m}}}});return best;}
 function lineClear(a,b){if(!a||!b)return false;const av=new T.Vector3(a.x,1.3*S(),a.z),bv=new T.Vector3(b.x,1.3*S(),b.z),v=bv.clone().sub(av),d=v.length();if(!d)return true;ray.set(av,v.normalize());ray.far=d-.25*S();return !ray.intersectObjects(g.scene.children,true).some(h=>!h.object.userData.watcherIgnore&&!h.object.userData.hideSpot&&h.object!==g.camera);}
 function createDecoy(id,name,x,z){
  if(D.decoys.has(id)){const d=D.decoys.get(id);d.group.position.set(x,.05*S(),z);d.until=performance.now()+6500;return d;}
  const root=new T.Group();root.position.set(x,.05*S(),z);root.userData.watcherIgnore=true;
  const mat=new T.MeshBasicMaterial({color:0x8c8177,transparent:true,opacity:.22,depthWrite:false});
  const body=new T.Mesh(new T.CapsuleGeometry(.22*S(),.8*S(),3,6),mat);body.position.y=.7*S();root.add(body);
  const head=new T.Mesh(new T.SphereGeometry(.23*S(),8,6),mat);head.position.y=1.55*S();root.add(head);
  const label=document.createElement('div');label.textContent=(name||'SURVIVOR')+'?';label.style.cssText='position:fixed;transform:translate(-50%,-50%);font:700 9px monospace;letter-spacing:1px;color:#b9aaa0;opacity:.72;pointer-events:none;z-index:119;display:none';document.body.appendChild(label);
  g.scene.add(root);const d={group:root,label,until:performance.now()+6500};D.decoys.set(id,d);return d;
 }
 function updateDecoys(){
  const now=performance.now();D.decoys.forEach((d,id)=>{if(now>d.until){g.scene.remove(d.group);d.label.remove();D.decoys.delete(id);return}const p=d.group.position.clone().project(g.camera);if(p.z<1){d.label.style.display='block';d.label.style.left=((p.x*.5+.5)*innerWidth)+'px';d.label.style.top=((-p.y*.5+.5)*innerHeight)+'px'}else d.label.style.display='none';d.group.rotation.y+=.004;});
 }
 function ping(kind,x,z,text){D.pings.set(kind,{x,z,text,until:performance.now()+4200});show(kind,text,2400);}
 function broadcast(type,data){if(net&&net.connected&&net.send)net.send({type,id:net.peerId,seq:Date.now()+Math.floor(Math.random()*1000),data});}
 function chooseDeception(){
  const ms=members();if(ms.length<2)return null;
  const split=splitScore();D.split=split;const c=g.campaign||{};const pressure=Number(c.pressure||0)+Number(g.fear||0)*.01;D.pressure=Math.min(1,pressure/100);
  if(split<.72&&D.pressure<.48)return null;
  const target=ms.reduce((a,b)=>{const ap=pos(a),bp=pos(b);const aw=g.entityGroup&&g.entityGroup.position;if(!ap||!bp||!aw)return a;return dist(bp,aw)>dist(ap,aw)?b:a});
  const tp=pos(target);if(!tp)return null;
  const roll=Math.random();
  if(roll<.34)return{kind:'FALSE_FOOTSTEPS',target:target.id,x:tp.x+(Math.random()-.5)*4*S(),z:tp.z+(Math.random()-.5)*4*S(),text:'FOOTSTEPS BEHIND YOU'};
  if(roll<.67){const other=ms.find(m=>m.id!==target.id),op=pos(other)||tp;return{kind:'FALSE_SURVIVOR',target:target.id,x:op.x+(Math.random()-.5)*2*S(),z:op.z+(Math.random()-.5)*2*S(),name:other&&other.name||'SURVIVOR',text:'DID YOU SEE THEM?'}}
  return{kind:'HOUSE_PING',target:target.id,x:tp.x,z:tp.z,text:'YOUR TEAMMATE IS NOT WHERE YOU THINK'};
 }
 function execute(ev){if(!ev)return;D.lastEvent=performance.now();D.eventSeq++;if(ev.kind==='FALSE_SURVIVOR'){createDecoy('event-'+D.eventSeq,ev.name,ev.x,ev.z);ping('FALSE SIGNAL',ev.x,ev.z,ev.text);}else if(ev.kind==='FALSE_FOOTSTEPS'){ping('FOOTSTEPS',ev.x,ev.z,ev.text);g.fear=Math.min(100,Number(g.fear||0)+6);}else{ping('HOUSE SIGNAL',ev.x,ev.z,ev.text);g.fear=Math.min(100,Number(g.fear||0)+4);}D.decoyUntil=performance.now()+6500;}
 const oldApply=g.partyNetwork.apply;
 g.partyNetwork.apply=function(packet){
  if(packet&&packet.type==='DECEPTION_EVENT'&&packet.id!==net.peerId)execute(packet.data);
  if(packet&&packet.type==='SURVIVOR_PING'&&packet.id!==net.peerId){const p=packet.data||{};ping(p.kind||'TEAM PING',p.x||0,p.z||0,p.text||'A teammate moved.');}
  if(oldApply)oldApply(packet);
 };
 const oldUpdate=g.updatePlayer.bind(g);
 g.updatePlayer=function(dt){
  oldUpdate(dt);if(this.state!=='PLAYING')return;
  updateDecoys();
  if(net&&net.connected){
   D.lastBroadcast-=dt;D.lastPing-=dt;
   if(net.role==='host'&&D.lastBroadcast<=0){D.lastBroadcast=3.2;const ev=chooseDeception();if(ev)execute(ev),broadcast('DECEPTION_EVENT',ev);}
   if(D.lastPing<=0){D.lastPing=1.4;const h=nearestHidden();if(h){const p=pos(h);if(p&&lineClear(g.entityGroup&&g.entityGroup.position,p)){broadcast('SURVIVOR_PING',{kind:'HIDDEN_SURVIVOR',x:p.x,z:p.z,text:'THE HOUSE FOUND A HIDING PLACE'});}}}
  }
  const h=nearestHidden();if(h){D.searchTarget=h.id;show('THE HOUSE IS LISTENING','A hidden survivor has disturbed the house.',900);}else D.searchTarget=null;
 };
 const oldEntity=g.updateEntity.bind(g);
 g.updateEntity=function(dt){
  oldEntity(dt);
  if(!g.entityGroup||!D.searchTarget||!net||!net.connected||net.role!=='host')return;
  const m=g.coop.members.get(D.searchTarget),p=pos(m);if(!m||!p)return;
  const w=g.entityGroup.position,d=dist(p,w);if(d<9){g.entity.state='SEARCH';if(g.entity.speed<2.0)g.entity.speed=2.0;}
 };
 g.houseDeceptionDirector={state:D,execute,ping,chooseDeception,createDecoy};
}
boot();
})();
