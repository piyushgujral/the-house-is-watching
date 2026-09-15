/* THE HOUSE IS WATCHING — Major Gameplay Director
 * Unified Watcher AI + room navigation + sensory investigation + adaptive house pressure.
 * Loaded late so it becomes the authoritative gameplay layer instead of stacking another micro-system.
 */
(function(){
'use strict';
const boot=()=>{
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.player||!g.entityGroup||!g.entity)return setTimeout(boot,100);
 if(g.__majorDirector)return; g.__majorDirector=true;
 const D=g.majorDirector={state:'PATROL',confidence:0,lastSeen:null,lastHeard:null,search:null,room:'ENTRY',previousRoom:'ENTRY',stateTime:0,hearingCooldown:0,teleportCooldown:12,encounterCooldown:8,routeIndex:0,stepClock:0,routeMemory:Object.create(null),rooms:Object.create(null),searchIndex:0,housePulse:0};
 const scale=()=>g.scene.scale&&g.scene.scale.x||1;
 const P=()=>g.player,W=()=>g.entityGroup,V=()=>g.watcherVisual||g.entityGroup;
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const baseRooms=[['ENTRY',0,10],['HALL',0,2],['BEDROOM',-7,-4],['STUDY',7,-4],['RITUAL',0,-10],['BACK',0,-15]];
 baseRooms.forEach((r,i)=>D.rooms[r[0]]={name:r[0],x:r[1],z:r[2],visits:0,heat:0,index:i});
 const route=baseRooms.map(r=>new T.Vector3(r[1]*scale(),0,r[2]*scale()));
 const senseRay=new T.Raycaster(),tmp=new T.Vector3(),tmp2=new T.Vector3(),forward=new T.Vector3();
 function room(){const p=P(),x=p.x/scale(),z=p.z/scale();if(z>7)return'ENTRY';if(z>0)return'HALL';if(z>-7)return x<0?'BEDROOM':'STUDY';if(z>-13)return'RITUAL';return'BACK';}
 function setState(s,reason){if(D.state===s)return;D.state=s;D.stateTime=0;D.searchIndex=0;if(reason&&g.flashPrompt)g.flashPrompt(reason);}
 function targetPoint(x,z){return tmp.set(x*scale(),0,z*scale());}
 function visibleToPlayer(){
  const w=W(),p=P(),dx=p.x-w.position.x,dz=p.z-w.position.z,d=Math.hypot(dx,dz);if(d>15*scale())return false;
  forward.set(0,0,-1);if(g.watcherVisual)forward.set(0,0,-1).applyQuaternion(V().quaternion).normalize();
  const dir=tmp2.set(dx,0,dz).normalize();if(forward.dot(dir)<.18)return false;
  const origin=tmp.set(w.position.x,1.65*scale(),w.position.z);senseRay.set(origin,dir);senseRay.far=d;
  const hits=senseRay.intersectObjects(g.scene.children,true);
  for(const h of hits){const o=h.object;if(o===V()||o.userData.watcherIgnore||o.userData.hideSpot)continue;if(o===g.camera||o===g.flashlight||o===g.flashTarget)continue;if(h.distance<d-.25)return false;}
  return true;
 }
 function hear(dt){
  if(D.hearingCooldown>0)return;
  const p=P(),w=W(),d=dist(p,w)/scale();let strength=0;
  if(g.running)strength=.9;else if(g.lastStep!==undefined&&g.lastStep<.08)strength=.32;
  if(g.flashlightOn)strength+=.05;if(d>18)strength*=.25;else if(d>12)strength*=.5;
  if(strength>.35){D.lastHeard={x:p.x,z:p.z};D.confidence=clamp(D.confidence+strength*.38,0,1);D.hearingCooldown=g.running?.45:1.2;setState('INVESTIGATE','SOMETHING HEARD YOU');}
 }
 function see(){if(!visibleToPlayer())return false;const p=P();D.lastSeen={x:p.x,z:p.z};D.confidence=clamp(D.confidence+.38,0,1);return true;}
 function blocked(from,to){
  const a=tmp.set(from.x,1.2,from.z),b=tmp2.set(to.x,1.2,to.z),dir=b.clone().sub(a),d=dir.length();if(d<.2)return false;dir.normalize();senseRay.set(a,dir);senseRay.far=d-.3;
  const hits=senseRay.intersectObjects(g.scene.children,true);return hits.some(h=>{const o=h.object;return !o.userData.watcherIgnore&&!o.userData.hideSpot&&o!==V()&&o!==g.camera&&o!==g.flashlight&&o!==g.flashTarget;});
 }
 function steer(goal,dt,speed){
  const w=W(),dx=goal.x-w.position.x,dz=goal.z-w.position.z,d=Math.hypot(dx,dz);if(d<.2)return true;let ax=dx/d,az=dz/d;
  const candidates=[[ax,az],[az,-ax],[-az,ax],[ax*.55+az*.84,az*.55-ax*.84],[ax*.55-az*.84,az*.55+ax*.84]];let best=null,bestScore=-1e9;
  for(const c of candidates){const probe=tmp.set(w.position.x+c[0]*1.25*scale(),0,w.position.z+c[1]*1.25*scale());let score=-Math.hypot(probe.x-goal.x,probe.z-goal.z);if(blocked(w.position,probe))score-=8;if(score>bestScore){bestScore=score;best=c;}}
  if(best){w.position.x+=best[0]*speed*dt;w.position.z+=best[1]*speed*dt;w.rotation.y=Math.atan2(best[0],best[1]);}
  w.position.x=clamp(w.position.x,-11.2*scale(),11.2*scale());w.position.z=clamp(w.position.z,-14.1*scale(),14.1*scale());return false;
 }
 function nearestRoute(){let best=0,bd=1e9;for(let i=0;i<route.length;i++){const d=dist(W().position,route[i]);if(d<bd){bd=d;best=i;}}return best;}
 function patrol(dt){if(D.stateTime<1)D.routeIndex=nearestRoute();const next=route[(D.routeIndex+1)%route.length];if(steer(next,dt,1.05*scale()))return setState('PATROL');if(dist(W().position,next)<1.1*scale()){D.routeIndex=(D.routeIndex+1)%route.length;D.stateTime=0;}}
 function investigate(dt){const q=D.lastSeen||D.lastHeard;if(!q){setState('PATROL');return;}const goal=tmp.set(q.x,0,q.z);steer(goal,dt,1.55*scale());if(dist(W().position,goal)<1.2*scale()){D.search={x:q.x,z:q.z};setState('SEARCH','IT IS SEARCHING');}}
 function search(dt){const s=D.search;if(!s){setState('PATROL');return;}const points=[[0,0],[1.7,0],[-1.7,0],[0,1.7],[0,-1.7],[2.6,1.2],[-2.4,-1.1]];const q=tmp.set(s.x+points[D.searchIndex%points.length][0]*scale(),0,s.z+points[D.searchIndex%points.length][1]*scale());steer(q,dt,1.15*scale());if(dist(W().position,q)<.75*scale()){D.searchIndex++;D.stateTime=0;if(D.searchIndex>=points.length){D.confidence*=.35;setState('PATROL','THE HOUSE WENT QUIET');}}if(g.isHidden&&g.isHidden()){const hd=dist(W().position,P())/scale();if(hd<5){D.confidence=clamp(D.confidence+.18,0,1);if(Math.random()<dt*.22)g.fear=Math.min(100,g.fear+1.5);}}}
 function stalk(dt){const p=P(),w=W(),dx=p.x-w.position.x,dz=p.z-w.position.z,d=Math.hypot(dx,dz)||1,sideX=-dz/d,sideZ=dx/d,offset=(Math.sin(D.stateTime*.45)>0?1:-1)*3.4*scale();const goal=tmp.set(p.x+sideX*offset-dx/d*2.2*scale(),0,p.z+sideZ*offset-dz/d*2.2*scale());steer(goal,dt,1.35*scale());if(see()||D.confidence>.78)setState('HUNTING','THE WATCHER LOCKED ON');else if(D.confidence<.12)setState('PATROL');}
 function hunting(dt){const p=P(),w=W(),d=dist(p,w)/scale();if(see())D.confidence=clamp(D.confidence+.06,0,1);else D.confidence=Math.max(0,D.confidence-.035*dt);const speed=(g.phase>=6||g.houseEndgame?.finished?3.5:2.35)*scale();steer(targetPoint(p.x/scale(),p.z/scale()),dt,speed);if(d<1.15){g.die();return;}if(D.confidence<.18&&!see()){D.lastSeen={x:p.x,z:p.z};setState('SEARCH');}}
 function observe(dt){const w=W(),p=P();D.teleportCooldown-=dt;if(see()){setState('HUNTING');return;}if(D.teleportCooldown<=0&&D.confidence<.1&&dist(w,p)/scale()>8){const idx=(nearestRoute()+2+Math.floor(Math.random()*3))%route.length,q=route[idx];w.position.copy(q);D.teleportCooldown=18;D.confidence=.08;setState('STALK','YOU HEARD SOMETHING MOVE');}patrol(dt);}
 function updateAI(dt){
  const e=g.entity;if(!e||g.state!=='PLAYING')return;D.stateTime+=dt;D.hearingCooldown=Math.max(0,D.hearingCooldown-dt);D.encounterCooldown-=dt;
  const r=room();if(r!==D.room){D.previousRoom=D.room;D.room=r;D.rooms[r].visits++;D.rooms[r].heat=Math.min(10,D.rooms[r].heat+1);if(D.rooms[r].visits>=3&&g.flashPrompt)g.flashPrompt('THE HOUSE REMEMBERS THIS ROOM');}
  if(g.isHidden&&g.isHidden()){D.confidence=Math.max(0,D.confidence-.08*dt);if(D.state==='HUNTING'||D.state==='CHASE'){D.lastSeen={x:P().x,z:P().z};setState('SEARCH','IT LOST YOU');}}
  else{if(see())D.confidence=clamp(D.confidence+.025,0,1);else D.confidence=Math.max(0,D.confidence-.018*dt);hear(dt);}
  if(g.phase>=6||g.houseEndgame?.finished){setState('HUNTING');D.confidence=1;}
  switch(D.state){case'PATROL':patrol(dt);break;case'INVESTIGATE':investigate(dt);break;case'STALK':stalk(dt);break;case'STALKING':stalk(dt);break;case'SEARCH':search(dt);break;case'HUNTING':hunting(dt);break;case'CHASE':hunting(dt);break;default:observe(dt);break;}
  e.state=D.state==='HUNTING'?'HUNTING':D.state==='CHASE'?'CHASE':D.state==='STALK'?'STALK':'OBSERVE';e.speed=D.state==='HUNTING'?2.35:D.state==='STALK'?1.35:1.05;
  const vis=V();if(vis){if(vis.position&&W())vis.position.copy(W().position);vis.position.y-=.78*scale();vis.rotation.y=W().rotation.y;if(vis.userData.tickAnimation)vis.userData.tickAnimation(g.clock.elapsedTime,dt,D.state);}
  const currentDistance=dist(P(),W())/scale();if(D.state==='HUNTING'||D.state==='CHASE')g.fear=Math.min(100,g.fear+(1.8+Math.max(0,7-currentDistance))*dt);else if(D.state==='SEARCH')g.fear=Math.min(100,g.fear+.35*dt);
 }
 g.updateEntity=updateAI;
 const oldPlayer=g.updatePlayer.bind(g);g.updatePlayer=function(dt){oldPlayer(dt);if(g.state!=='PLAYING')return;D.housePulse+=dt;const r=room();const speed=g.running?1:0;D.routeMemory[r]=(D.routeMemory[r]||0)+dt*(speed?1.8:.45);if(D.housePulse>10&&D.encounterCooldown<=0){D.housePulse=0;D.encounterCooldown=12+Math.random()*8;const heat=D.rooms[r].heat;if(heat>2&&D.confidence<.35&&Math.random()<.5){D.lastHeard={x:g.player.x,z:g.player.z};D.confidence=Math.max(D.confidence,.32);setState('INVESTIGATE','THE HOUSE COPIED YOUR FOOTSTEPS');g.audio&&g.audio.footstep&&g.audio.footstep();}}};
 g.getWatcherDirectorState=()=>({state:D.state,confidence:D.confidence,room:D.room,lastSeen:D.lastSeen,lastHeard:D.lastHeard});g.majorDirectorReady=true;
};
boot();
})();