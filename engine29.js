/* THE HOUSE IS WATCHING — Engine 29: Multiplayer Watcher Director
 * Major encounter chunk: host-authoritative multi-target Watcher AI, remote
 * survivor threat selection, shared monster state replication and client
 * interpolation. Solo behavior remains on Engine 22.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.player||!g.coop||!g.partyNetwork)return setTimeout(boot,220);
 if(g.__engine29)return;g.__engine29=true;
 const net=g.partyNetwork.net,S=()=>g.scene.scale&&g.scene.scale.x||1;
 const D={targetId:'local',targetScore:0,mode:'OBSERVE',lastBroadcast:0,lastPacket:0,remoteTarget:null};
 const ray=new T.Raycaster(),a=new T.Vector3(),b=new T.Vector3(),dir=new T.Vector3();
 function members(){return Array.from(g.coop.members.values()).filter(m=>m.state!=='DEAD');}
 function posOf(m){if(m.id==='local')return g.player;return m.object&&m.object.visible?m.object.position:null;}
 function distance(m){const p=posOf(m),w=g.entityGroup&&g.entityGroup.position;if(!p||!w)return 999;return Math.hypot(p.x-w.x,p.z-w.z)/S();}
 function visible(m){
  const p=posOf(m),w=g.entityGroup&&g.entityGroup.position;if(!p||!w)return false;
  const d=distance(m);if(d>17)return false;
  const eye=w.clone();eye.y+=1.45*S();dir.set(p.x-w.x,0,p.z-w.z).normalize();ray.set(eye,dir);ray.far=d*S();
  const hits=ray.intersectObjects(g.scene.children,true);
  return !hits.some(h=>{const o=h.object;return !o.userData.watcherIgnore&&!o.userData.hideSpot&&o!==g.camera&&o!==g.flashlight&&o!==g.flashTarget&&h.distance<d*S()-.25;});
 }
 function score(m){
  const d=distance(m);if(d>=999)return -999;
  let s=Math.max(0,24-d);
  if(visible(m))s+=10;
  if(m.state==='DOWNED')s+=8;
  s+=Number(m.noise||0)*.05;
  if(m.id==='local'&&g.running)s+=3;
  if(m.room&&g.majorDirector&&m.room===g.majorDirector.room)s+=2;
  return s;
 }
 function choose(){
  let best=null,bs=-999;
  members().forEach(m=>{const s=score(m);if(s>bs){bs=s;best=m;}});
  if(!best)best=g.coop.members.get('local');
  D.targetId=best&&best.id||'local';D.targetScore=bs;return best;
 }
 function moveHost(dt,target){
  const w=g.entityGroup;if(!w||!target)return;
  const p=posOf(target);if(!p)return;
  const d=distance(target),final=g.houseEndgame&&g.houseEndgame.finished||g.phase>=6;
  D.mode=final?'CHASE':(visible(target)?'HUNTING':'STALK');
  const speed=(final?3.7:D.mode==='HUNTING'?2.65:D.mode==='STALK'?1.35:1.05)*S();
  const dx=p.x-w.position.x,dz=p.z-w.position.z,len=Math.hypot(dx,dz)||1;
  let x=dx/len,z=dz/len;
  // Five cheap steering probes prevent the multiplayer director from blindly walking through walls.
  const candidates=[[x,z],[z,-x],[-z,x],[x*.72+z*.69,z*.72-x*.69],[x*.72-z*.69,z*.72+x*.69]];
  let best=candidates[0],bestScore=-1e9;
  for(const c of candidates){
   const probe=a.set(w.position.x+c[0]*1.1*S(),1.1*S(),w.position.z+c[1]*1.1*S());
   const pd=Math.hypot(probe.x-p.x,probe.z-p.z);
   ray.set(w.position.clone().setY(1.1*S()),probe.clone().sub(w.position).setY(0).normalize());ray.far=1.1*S();
   const blocked=ray.intersectObjects(g.scene.children,true).some(h=>!h.object.userData.watcherIgnore&&!h.object.userData.hideSpot);
   const sc=-pd-(blocked?6:0);if(sc>bestScore){bestScore=sc;best=c;}
  }
  w.position.x+=best[0]*speed*dt;w.position.z+=best[1]*speed*dt;
  w.position.x=Math.max(-11.2*S(),Math.min(11.2*S(),w.position.x));
  w.position.z=Math.max(-14.1*S(),Math.min(14.1*S(),w.position.z));
  w.rotation.y=Math.atan2(best[0],best[1]);
  if(d<1.15&&!target.object){g.die();}
  if(d<1.15&&target.id==='local')g.die();
 }
 function watcherPacket(){
  const w=g.entityGroup,e=g.entity;
  return {x:w.position.x,z:w.position.z,rotation:w.rotation.y,mode:e&&e.state||D.mode,target:D.targetId,score:D.targetScore};
 }
 function applyRemote(p){
  if(!p||!g.entityGroup)return;
  D.lastPacket=performance.now();D.remoteTarget=p.target;D.mode=p.mode||'OBSERVE';
  const w=g.entityGroup;
  const alpha=Math.min(1,.32);
  w.position.x+=(Number(p.x)-w.position.x)*alpha;
  w.position.z+=(Number(p.z)-w.position.z)*alpha;
  w.rotation.y+=(Number(p.rotation)-w.rotation.y)*alpha;
  if(g.entity)g.entity.state=p.mode==='CHASE'?'CHASE':p.mode==='HUNTING'?'HUNTING':p.mode==='STALK'?'STALK':'OBSERVE';
 }
 const oldApply=g.partyNetwork.apply;
 g.partyNetwork.apply=function(packet){
  if(packet&&packet.type==='WATCHER_STATE')applyRemote(packet.data);
  if(oldApply)oldApply(packet);
 };
 const oldUpdate=g.updateEntity.bind(g);
 g.updateEntity=function(dt){
  if(!net||!net.connected){oldUpdate(dt);return;}
  if(net.role==='host'){
   const target=choose();
   moveHost(dt,target);
   if(g.entity){g.entity.state=D.mode;g.entity.targetId=D.targetId;g.entity.speed=D.mode==='CHASE'?3.7:D.mode==='HUNTING'?2.65:D.mode==='STALK'?1.35:1.05;}
   if(g.watcherVisual){g.watcherVisual.position.copy(g.entityGroup.position);g.watcherVisual.position.y-=.78*S();g.watcherVisual.rotation.y=g.entityGroup.rotation.y;if(g.watcherVisual.userData.tickAnimation)g.watcherVisual.userData.tickAnimation(g.clock.elapsedTime,dt,D.mode);}
   D.lastBroadcast-=dt;
   if(D.lastBroadcast<=0){D.lastBroadcast=.12;if(net.send)net.send({type:'WATCHER_STATE',id:net.peerId,seq:Date.now(),data:watcherPacket()});}
   if(target&&target.id!=='local'&&distance(target)<1.15){target.state='DOWNED';if(g.coop.down)g.coop.down(target.id);if(net.send)net.send({type:'DOWN',id:net.peerId,seq:Date.now(),data:{target:target.id}});}
  }else{
   if(performance.now()-D.lastPacket>5000&&g.entity)g.entity.state='OBSERVE';if(g.watcherVisual&&g.watcherVisual.userData.tickAnimation)g.watcherVisual.userData.tickAnimation(g.clock.elapsedTime,dt,D.mode);
  }
 };
 g.multiplayerWatcher={state:D,choose,score,applyRemote};
}
boot();
})();