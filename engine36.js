/* THE HOUSE IS WATCHING — Engine 36: Reactive Interior State Director v1
 * Major gameplay chunk: room memory now changes the interior itself. Persistent room states
 * drive local lighting, cover, visual dressing, route confidence and Watcher navigation.
 * Host chooses mutations and clients reproduce the same state deterministically.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.player||!g.partyNetwork||!g.houseMemoryDirector)return setTimeout(boot,300);
 if(g.__engine36)return;g.__engine36=true;
 const net=g.partyNetwork.net,S=()=>g.scene.scale&&g.scene.scale.x||1;
 const ROOMS={
  ENTRY:{x:0,z:12,light:.95,cover:0},HALL:{x:0,z:2,light:.72,cover:.1},BEDROOM:{x:-7,z:-2,light:.55,cover:.3},
  STUDY:{x:7,z:-2,light:.6,cover:.25},RITUAL:{x:0,z:-7,light:.42,cover:.45},BACK:{x:0,z:-12,light:.3,cover:.55}
 };
 const state={version:0,rooms:{},active:null,lastMutation:0,cooldown:0,history:[]};
 Object.keys(ROOMS).forEach(k=>state.rooms[k]={heat:0,visits:0,lights:1,cover:ROOMS[k].cover,disturbed:0,confidence:1});
 const root=new T.Group();root.name='ReactiveInteriorState';g.scene.add(root);
 const roomVisuals=new Map(), coverVisuals=new Map(), lightVisuals=[];
 const hud=document.createElement('div');hud.id='reactive-interior-hud';hud.style.cssText='position:fixed;top:92px;left:50%;transform:translateX(-50%);padding:8px 13px;background:rgba(3,3,5,.88);border:1px solid rgba(170,145,125,.3);color:#d7c7b9;font:700 10px/1.35 monospace;letter-spacing:1.15px;z-index:124;pointer-events:none;display:none;text-align:center';hud.innerHTML='<span id="ris-title">ROOM STATE</span><span id="ris-detail" style="opacity:.72;margin-left:8px"></span>';document.body.appendChild(hud);
 function notify(a,b,ms){state.lastMutation=performance.now();hud.style.display='block';hud.querySelector('#ris-title').textContent=a;hud.querySelector('#ris-detail').textContent=b||'';setTimeout(()=>{if(performance.now()-state.lastMutation>=ms)hud.style.display='none'},ms)}
 function world(v){return Number(v)*S()}
 function roomAt(x,z){let best='HALL',bd=Infinity;Object.keys(ROOMS).forEach(k=>{const r=ROOMS[k],d=Math.hypot(x/S()-r.x,z/S()-r.z);if(d<bd){bd=d;best=k}});return best}
 function makeRoomState(k){
  const r=ROOMS[k],group=new T.Group();group.position.set(world(r.x),0,world(r.z));
  const marker=new T.Mesh(new T.CylinderGeometry(.18*S(),.18*S(),.03*S(),10),new T.MeshStandardMaterial({color:0x30231c,transparent:true,opacity:0}));marker.position.y=.04*S();group.add(marker);
  const dust=new T.Group();for(let i=0;i<5;i++){const m=new T.Mesh(new T.BoxGeometry(.08*S(),.02*S(),.3*S()),new T.MeshStandardMaterial({color:0x1c1512,transparent:true,opacity:0}));m.position.set((i-2)*.65*S(),.03*S(),((i%2)-.5)*1.2*S());dust.add(m)}group.add(dust);
  root.add(group);roomVisuals.set(k,{group,marker,dust});
 }
 Object.keys(ROOMS).forEach(makeRoomState);
 function makeCover(k){
  const r=ROOMS[k],group=new T.Group();group.position.set(world(r.x),0,world(r.z));
  const mat=new T.MeshStandardMaterial({color:0x171311,roughness:.95});
  const a=new T.Mesh(new T.BoxGeometry(1.8*S(),1.1*S(),.55*S()),mat);a.position.set(-2*S(),.55*S(),0);group.add(a);
  const b=a.clone();b.position.x=2*S();group.add(b);root.add(group);coverVisuals.set(k,group);group.visible=false;
 }
 Object.keys(ROOMS).forEach(k=>makeCover(k));
 function applyRoom(k,rs){
  const v=roomVisuals.get(k),c=coverVisuals.get(k);if(!v)return;
  const intensity=Math.max(.05,Math.min(1,ROOMS[k].light*(.25+.75*rs.lights)));
  v.marker.material.opacity=Math.min(.45,rs.heat*.5);v.dust.visible=rs.disturbed>.35;
  for(const child of v.dust.children)child.material.opacity=Math.min(.32,rs.disturbed*.4);
  if(c)c.visible=rs.cover>.62;
  roomVisuals.get(k).group.userData.reactiveIntensity=intensity;
 }
 function applyAll(){Object.keys(state.rooms).forEach(k=>applyRoom(k,state.rooms[k]));lightVisuals.forEach(l=>{const k=l.userData.room,rs=state.rooms[k];if(rs)l.intensity=l.userData.base*Math.max(.18,rs.lights)});}
 function captureLights(){
  if(lightVisuals.length)return;
  g.scene.traverse(o=>{if(o.isLight&&o.type==='PointLight'&&o!==g.tempLight){const k=roomAt(o.position.x,o.position.z);o.userData.room=k;o.userData.base=o.intensity;lightVisuals.push(o)}});
  applyAll();
 }
 function derive(){
  const hm=g.houseMemoryDirector.state,rooms=hm&&hm.rooms||{};
  Object.keys(state.rooms).forEach(k=>{
   const src=rooms[k]||rooms[k.toLowerCase()]||null,rs=state.rooms[k];
   if(src){rs.heat=Math.min(1,Number(src.pressure||src.heat||0));rs.visits=Number(src.visits||rs.visits||0)}
   rs.confidence=Math.max(.08,1-rs.heat*.7-rs.disturbed*.2);
  });
 }
 function partySplit(){const ms=Array.from(g.coop&&g.coop.members?g.coop.members.values():[]).filter(m=>m.state!=='DEAD');if(ms.length<2)return 0;let far=0;for(let i=0;i<ms.length;i++)for(let j=i+1;j<ms.length;j++){const a=ms[i].object?.position,b=ms[j].object?.position;if(a&&b)far=Math.max(far,Math.hypot(a.x-b.x,a.z-b.z)/S())}return Math.min(1,far/14)}
 function choose(){
  if(state.cooldown>0||performance.now()-state.lastMutation<15000)return null;
  derive();let best=null,score=0;Object.keys(state.rooms).forEach(k=>{const r=state.rooms[k],s=r.heat*.7+r.visits/18+r.disturbed*.35;if(s>score){score=s;best=k}});
  const split=partySplit();if(!best||score<.62)return null;
  const roll=Math.random(),kind=split>.68&&roll<.35?'BLACKOUT':roll<.65?'DISTURB_COVER':'SHIFT_LIGHT';
  state.version++;return{version:state.version,room:best,kind,split,seed:Math.floor(Math.random()*1000000)};
 }
 function apply(ev,remote){
  if(!ev||!ROOMS[ev.room])return;
  if(Number(ev.version)<state.version)return;
  state.version=Number(ev.version);state.active=ev;state.lastMutation=performance.now();state.cooldown=16;
  const rs=state.rooms[ev.room];
  if(ev.kind==='BLACKOUT'){rs.lights=.18;rs.disturbed=1;notify('THE ROOM WENT DARK',ev.room+' REMEMBERS YOU',4700)}
  if(ev.kind==='SHIFT_LIGHT'){rs.lights=.28;rs.disturbed=Math.min(1,rs.disturbed+.4);notify('THE LIGHT CHANGED',ev.room+' FEELS DIFFERENT',3900)}
  if(ev.kind==='DISTURB_COVER'){rs.cover=Math.min(1,rs.cover+.55);rs.disturbed=1;notify('SOMETHING MOVED',ev.room+' HAS NEW SHADOWS',4300)}
  state.history.push(ev.room+':'+ev.kind);if(state.history.length>12)state.history.shift();applyAll();
  if(g.fear!=null)g.fear=Math.min(100,Number(g.fear)+(ev.kind==='BLACKOUT'?7:4));
 }
 function send(ev){if(net&&net.connected&&net.role==='host'&&net.send)net.send({type:'ROOM_STATE',id:net.peerId,seq:Date.now(),data:ev});}
 const oldApply=g.partyNetwork.apply;
 g.partyNetwork.apply=function(packet){if(packet&&packet.type==='ROOM_STATE'&&packet.id!==net.peerId)apply(packet.data,true);if(oldApply)oldApply(packet)};
 const oldUpdate=g.updatePlayer.bind(g),last={x:g.player.x,z:g.player.z};
 g.updatePlayer=function(dt){
  last.x=this.player.x;last.z=this.player.z;oldUpdate(dt);if(this.state!=='PLAYING')return;
  captureLights();
  const k=roomAt(this.player.x,this.player.z),rs=state.rooms[k];
  rs.visits+=dt*.12;rs.heat=Math.min(1,rs.heat+dt*(g.isRunning?.05:.018));rs.disturbed=Math.max(0,rs.disturbed-dt*.012);
  rs.confidence=Math.max(.05,1-rs.heat*.65-rs.disturbed*.2);
  state.cooldown=Math.max(0,state.cooldown-dt);
  if(net&&net.connected&&net.role==='host'){const ev=choose();if(ev){apply(ev,false);send(ev)}}
  applyAll();
 };
 const oldEntity=g.updateEntity.bind(g);
 g.updateEntity=function(dt){
  oldEntity(dt);const e=g.entity||g.entityGroup;if(!e)return;
  const k=roomAt(e.position.x,e.position.z),rs=state.rooms[k];
  if(!rs)return;
  const p=g.player.position, targetRoom=roomAt(p.x,p.z);
  if(k!==targetRoom&&state.rooms[targetRoom].heat>rs.heat+.18){
   const target=ROOMS[targetRoom],dx=world(target.x)-e.position.x,dz=world(target.z)-e.position.z,d=Math.hypot(dx,dz);
   if(d>0.1){e.position.x+=dx/d*Math.min(dt*.45*S(),d);e.position.z+=dz/d*Math.min(dt*.45*S(),d)}
  }
  if(state.active&&state.active.kind==='BLACKOUT'&&state.active.room===k&&g.multiplayerWatcher&&g.multiplayerWatcher.state)g.multiplayerWatcher.state.searchBias=.35;
 };
 setInterval(()=>{let changed=false;Object.keys(state.rooms).forEach(k=>{const rs=state.rooms[k];if(rs.lights<1){rs.lights=Math.min(1,rs.lights+.035);changed=true}if(rs.cover>ROOMS[k].cover){rs.cover=Math.max(ROOMS[k].cover,rs.cover-.018);changed=true}if(rs.disturbed>0){rs.disturbed=Math.max(0,rs.disturbed-.02);changed=true}});if(changed)applyAll();if(state.active&&performance.now()-state.lastMutation>21000){state.active=null;applyAll()}},1000);
 g.reactiveInterior={state,rooms:ROOMS,apply,roomAt};
 captureLights();
}
boot();
})();
