/* THE HOUSE IS WATCHING — Engine 34: Persistent House Memory & Route Mutation Director v1
 * Major gameplay chunk: the house remembers visited rooms, party separation and repeated
 * routes, then changes lighting, signage, safe-room confidence and Watcher pressure over time.
 * Host-authoritative memory decisions are synchronized so co-op players share one evolving house.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.player||!g.coop||!g.partyNetwork)return setTimeout(boot,240);
 if(g.__engine34)return;g.__engine34=true;
 const net=g.partyNetwork.net;
 const S=()=>g.scene.scale&&g.scene.scale.x||1;
 const rooms=['ENTRY','HALL','BEDROOM','STUDY','RITUAL','BACK'];
 const M={rooms:{},route:[],fear:0,lastRoom:'',lastMutation:0,mutationCooldown:0,seq:0,active:null};
 rooms.forEach(r=>M.rooms[r]={visits:0,pressure:0,lit:true,marked:false,lastSeen:0});
 const hud=document.createElement('div');hud.id='house-memory-hud';hud.style.cssText='position:fixed;top:86px;left:50%;transform:translateX(-50%);padding:7px 12px;background:rgba(2,2,4,.78);border:1px solid rgba(200,180,155,.22);color:#d8cbbd;font:700 10px/1.35 monospace;letter-spacing:1px;z-index:121;pointer-events:none;display:none;text-align:center';hud.innerHTML='<span id="hm-title">HOUSE MEMORY</span><span id="hm-detail" style="opacity:.7;margin-left:8px"></span>';document.body.appendChild(hud);
 function notify(t,d,ms){hud.style.display='block';hud.querySelector('#hm-title').textContent=t;hud.querySelector('#hm-detail').textContent=d||'';if(ms)setTimeout(()=>{if(performance.now()-M.lastMutation>ms)hud.style.display='none'},ms);}
 function send(data){if(net&&net.connected&&net.role==='host'&&net.send){M.seq++;net.send({type:'HOUSE_MEMORY_MUTATION',id:net.peerId,seq:Date.now()+M.seq,data:data});}}
 function room(){return g.livingHouse&&g.livingHouse.currentRoom||g.roomDirector&&g.roomDirector.currentRoom||'';}
 function norm(r){r=String(r||'').toUpperCase();return rooms.indexOf(r)>=0?r:'HALL';}
 function members(){return Array.from(g.coop.members.values()).filter(m=>m.state!=='DEAD');}
 function pos(m){return m&&m.id==='local'?g.player:m&&m.object&&m.object.visible?m.object.position:null;}
 function d(a,b){return a&&b?Math.hypot(a.x-b.x,a.z-b.z)/S():999;}
 function remember(r,dt){
  r=norm(r);const x=M.rooms[r];x.visits++;x.lastSeen=performance.now();x.pressure=Math.min(1,x.pressure+.11);M.lastRoom=r;M.route.push(r);if(M.route.length>12)M.route.shift();
  for(const k of rooms)if(k!==r)M.rooms[k].pressure=Math.max(0,M.rooms[k].pressure-dt*.018);
  const repeats=M.route.filter(v=>v===r).length;M.fear=Math.min(1,M.fear+(repeats>=3?.025:.006));
 }
 function routeScore(){if(M.route.length<4)return 0;const r=M.route.slice(-6);let same=0;for(let i=1;i<r.length;i++)if(r[i]===r[i-1])same++;return same/5;}
 function partySplit(){const ms=members();if(ms.length<2)return 0;let far=0;for(let i=0;i<ms.length;i++)for(let j=i+1;j<ms.length;j++)far=Math.max(far,d(pos(ms[i]),pos(ms[j])));return Math.min(1,far/12);}
 function pickMutation(){
  const r=norm(room()),split=partySplit(),score=routeScore(),stage=Number(g.campaign&&g.campaign.stage||0);
  if(M.mutationCooldown>0||performance.now()-M.lastMutation<12000)return null;
  const pressure=M.rooms[r].pressure;
  if(pressure<.35&&M.fear<.35&&split<.45&&score<.45)return null;
  const roll=Math.random();
  if(score>.62&&roll<.34)return{kind:'MEMORY_MARK',room:r,text:'THE HOUSE REMEMBERED THIS ROUTE'};
  if(split>.68&&roll<.62)return{kind:'ISOLATE',room:r,text:'SOMEONE IS WALKING WHERE NO ONE SHOULD BE'};
  if(stage>=3&&pressure>.58&&roll<.78)return{kind:'ROOM_DARKEN',room:r,text:'THIS ROOM DOES NOT WANT LIGHT'};
  return{kind:'WATCHER_MEMORY',room:r,text:'THE WATCHER REMEMBERED YOUR PATTERN'};
 }
 function findLights(){
  const out=[];g.scene.traverse(o=>{if(o&&o.isLight&&o!==g.flashlight&&o!==g.tempLight)out.push(o)});return out;
 }
 function roomFactor(r){const x=M.rooms[norm(r)];return x?x.pressure:0;}
 function darkenRoom(r){
  const lights=findLights(),factor=Math.max(.18,1-roomFactor(r)*.72);let changed=0;
  lights.forEach((l)=>{if(l.userData&&l.userData.houseMemoryLocked)return;const near=Math.hypot((l.position.x/S())-g.player.x,(l.position.z/S())-g.player.z);if(near<9){if(l.userData.houseMemoryBase==null)l.userData.houseMemoryBase=l.intensity;l.intensity=Math.max(.08,l.userData.houseMemoryBase*factor);changed++;}});
  setTimeout(()=>lights.forEach(l=>{if(l.userData&&l.userData.houseMemoryBase!=null)l.intensity=l.userData.houseMemoryBase}),2600);
  return changed;
 }
 function memoryMark(r){
  const x=M.rooms[r];x.marked=true;
  const el=document.getElementById('objective-text');if(el){const old=el.textContent;el.textContent='THE HOUSE REMEMBERS '+r;setTimeout(()=>{if(el.textContent==='THE HOUSE REMEMBERS '+r)el.textContent=old},3600);}
  if(g.fear!=null)g.fear=Math.min(100,Number(g.fear)+5);
 }
 function isolate(){
  const split=partySplit();if(split<.5)return;
  if(g.fear!=null)g.fear=Math.min(100,Number(g.fear)+7);
  if(g.entity&&g.entity.state==='STALK')g.entity.state='HUNTING';
  notify('HOUSE MEMORY','THE HOUSE HAS SEEN THE PARTY SPLIT',3400);
 }
 function watcherMemory(){
  if(g.entity&&Number(g.phase||0)>=4){g.entity.state=partySplit()>.55?'HUNTING':'STALK';}
  if(g.fear!=null)g.fear=Math.min(100,Number(g.fear)+6);
 }
 function apply(ev,remote){
  if(!ev)return;M.lastMutation=performance.now();M.mutationCooldown=9;M.active=ev;const r=norm(ev.room);M.rooms[r].pressure=Math.min(1,M.rooms[r].pressure+.18);
  if(ev.kind==='MEMORY_MARK')memoryMark(r);
  else if(ev.kind==='ISOLATE')isolate();
  else if(ev.kind==='ROOM_DARKEN')darkenRoom(r);
  else if(ev.kind==='WATCHER_MEMORY')watcherMemory();
  notify('HOUSE MEMORY',ev.text,3300);
  if(!remote&&g.adaptiveHouseDirector&&g.adaptiveHouseDirector.state)g.adaptiveHouseDirector.state.heat=Math.min(1,(g.adaptiveHouseDirector.state.heat||0)+.06);
 }
 const oldApply=g.partyNetwork.apply;
 g.partyNetwork.apply=function(packet){if(packet&&packet.type==='HOUSE_MEMORY_MUTATION'&&packet.id!==net.peerId)apply(packet.data,true);if(oldApply)oldApply(packet);};
 const oldUpdate=g.updatePlayer.bind(g);
 g.updatePlayer=function(dt){
  oldUpdate(dt);if(this.state!=='PLAYING')return;
  const r=room();if(r&&r!==M.lastRoom)remember(r,dt);else if(r)M.rooms[norm(r)].pressure=Math.min(1,M.rooms[norm(r)].pressure+dt*.012);
  M.mutationCooldown=Math.max(0,M.mutationCooldown-dt);
  if(net&&net.connected&&net.role==='host'){
   const ev=pickMutation();if(ev){apply(ev,false);send(ev);}
  }
 };
 const oldEntity=g.updateEntity.bind(g);
 g.updateEntity=function(dt){
  oldEntity(dt);if(!g.entity)return;
  const r=norm(room()),p=roomFactor(r),split=partySplit();
  if(Number(g.phase||0)>=4&&p>.72&&split>.55&&g.entity.state==='STALK')g.entity.state='HUNTING';
 };
 g.houseMemoryDirector={state:M,apply,remember,pickMutation,roomPressure:roomFactor};
}
boot();
})();
