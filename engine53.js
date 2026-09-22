/* THE HOUSE IS WATCHING — Engine 53: Living House Environment v1
 * Major environment pass. Builds a cohesive interior dressing/portal system around the
 * existing room graph: architectural thresholds, windows, furniture silhouettes,
 * ceiling fixtures, room ambience and reactive doors. It is additive and defensive.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.player)return setTimeout(boot,500);
 if(g.__engine53)return;g.__engine53=true;
 const scale=()=>g.scene.scale&&g.scene.scale.x||1;
 const root=new T.Group();root.name='HouseEnvironment53';g.scene.add(root);
 const rooms={
  ENTRY:{x:0,z:10,kind:'foyer',light:.8},
  HALL:{x:0,z:2,kind:'hall',light:.58},
  BEDROOM:{x:-7,z:-4,kind:'bedroom',light:.45},
  STUDY:{x:7,z:-4,kind:'study',light:.5},
  RITUAL:{x:0,z:-10,kind:'ritual',light:.28},
  BACK:{x:0,z:-15,kind:'back',light:.22}
 };
 const state={version:1,doors:{},lights:{},roomMood:{},lastMutation:0,initialized:false};
 const mats={};
 function mat(name,color,rough=.9,metal=0){
  if(mats[name])return mats[name];
  mats[name]=new T.MeshStandardMaterial({color,roughness:rough,metalness:metal});
  return mats[name];
 }
 const wood=()=>mat('oldWood',0x241c19,.94),dark=()=>mat('darkWood',0x100d0c,1),wall=()=>mat('wall',0x393432,1),brass=()=>mat('brass',0x4c4034,.6,.5),glass=()=>mat('glass',0x10181a,.25,.05),cloth=()=>mat('cloth',0x292325,1),bone=()=>mat('bone',0x75665a,.95);
 function box(name,x,y,z,w,h,d,m,rx=0,ry=0,rz=0){
  const q=new T.Mesh(new T.BoxGeometry(w*scale(),h*scale(),d*scale()),m);
  q.name=name;q.position.set(x*scale(),y*scale(),z*scale());q.rotation.set(rx,ry,rz);q.castShadow=true;q.receiveShadow=true;root.add(q);return q;
 }
 function cyl(name,x,y,z,r,h,m,rx=0){
  const q=new T.Mesh(new T.CylinderGeometry(r*scale(),r*scale(),h*scale(),10),m);
  q.name=name;q.position.set(x*scale(),y*scale(),z*scale());q.rotation.x=rx;q.castShadow=true;root.add(q);return q;
 }
 function group(name,x,z){const q=new T.Group();q.name=name;q.position.set(x*scale(),0,z*scale());root.add(q);return q;}
 function addTo(gp,mesh){gp.add(mesh);mesh.position.x/=scale();mesh.position.y/=scale();mesh.position.z/=scale();return mesh;}
 function furnitureRoom(name,r){
  const x=r.x,z=r.z;
  if(name==='ENTRY'){
   box('entry_console',-4,.65,9.1,2.4,1.3,.55,wood());
   box('entry_mirror_frame',4,1.45,8.8,1.7,2.8,.16,dark());
   box('entry_mirror',4,1.48,8.69,1.25,2.3,.04,glass());
   cyl('entry_vase',-4,.98,9.05,.18,.55,brass());
   for(let i=0;i<3;i++)box('entry_coat_'+i,5.2+i*.45,1.5,9.0,.12,1.4,.12,wood());
  }else if(name==='HALL'){
   box('hall_runner',0,.02,2,1.8,.04,9,cloth());
   for(const z2 of[-1.2,2.8,6.2]){box('hall_frame',-3.2,1.65,z2,1.3,1.5,.08,dark());box('hall_picture',-3.15,1.65,z2,1.05,1.25,.03,bone());}
   box('hall_table',3.2,.65,1.3,1.6,1.3,.5,wood());
   cyl('hall_candle',3.2,1.42,1.3,.08,.45,bone());
  }else if(name==='BEDROOM'){
   box('bed_frame',-7,.45,-5.0,3.8,.8,2.2,wood());
   box('mattress',-7,1.0,-5.0,3.5,.45,2.0,cloth());
   box('pillow',-7,1.32,-5.65,1.35,.28,.65,bone());
   box('bedside',-9.25,.55,-4.4,.7,1.1,.7,wood());
   cyl('bed_lamp',-9.25,1.45,-4.4,.16,.7,brass());
  }else if(name==='STUDY'){
   box('study_desk',7,.8,-5.0,3.2,1.6,1.0,wood());
   box('study_chair',7,1.0,-3.5,1.1,1.6,1.0,dark());
   for(let i=0;i<5;i++)box('study_book_'+i,5.45+i*.42,1.5,-5.0,.28,.65,.75,bone(),0,.08*i);
   box('study_shelf',9.0,2.0,-5.1,.55,3.8,2.4,dark());
  }else if(name==='RITUAL'){
   const rg=group('ritual_table',0,-10);addTo(rg,box('ritual_table_mesh',0,.72,0,3.0,1.4,1.5,dark()));
   for(let i=0;i<5;i++){const a=i*Math.PI*2/5;box('ritual_candle',Math.cos(a)*1.1,1.48,-10+Math.sin(a)*.55,.1,.45,.1,bone());}
   for(let i=0;i<4;i++){const a=i*Math.PI/2;box('ritual_marker',Math.cos(a)*3.0,.04,-10+Math.sin(a)*2.0,.18,.08,.75,brass(),0,a);}
  }else{
   box('back_crate_a',-3,.7,-15,1.4,1.4,1.2,wood(),0,.2);
   box('back_crate_b',3,.5,-16,1.1,1.0,1.0,dark(),0,-.18);
   box('back_shelf',5,1.6,-15,.5,3.2,3.4,dark());
   for(let i=0;i<4;i++)box('back_bottle_'+i,4.65+i*.24,2.1,-14.2,.09,.5,.09,bone());
  }
 }
 function portal(name,a,b,px,pz,rot){
  const gp=group('portal_'+name,px,pz);gp.rotation.y=rot||0;
  const frameL=box('doorframe_L_'+name,-1.35,1.65,0,.22,3.3,.32,dark());
  const frameR=box('doorframe_R_'+name,1.35,1.65,0,.22,3.3,.32,dark());
  const top=box('doorframe_top_'+name,0,3.15,0,2.9,.28,.32,dark());
  const door=box('door_'+name,0,1.52,.12,2.45,3.0,.18,wood());
  door.userData.houseDoor=true;door.userData.from=a;door.userData.to=b;door.userData.open=0;
  const knob=cyl('knob_'+name,rot===0?1.0:-1.0,1.52,-.02,.07,.12,brass(),Math.PI/2);
  [frameL,frameR,top,door,knob].forEach(m=>{m.position.x/=scale();m.position.y/=scale();m.position.z/=scale();gp.add(m);});
  state.doors[name]={group:gp,door,from:a,to:b,open:0,target:0,locked:false};
 }
 function windowUnit(name,x,z,rot,w=2.4,h=2.0){
  const gp=group('window_'+name,x,z);gp.rotation.y=rot||0;
  const frame=box('window_frame_'+name,0,1.65,0,w,.16,.18,dark());
  const pane=box('window_glass_'+name,0,1.65,.03,w-.35,h,0.06,glass());
  const mull=box('window_mullion_'+name,0,1.65,.07,.08,h,.08,brass());
  const sill=box('window_sill_'+name,0,.62,.02,w+.2,.18,.42,wood());
  [frame,pane,mull,sill].forEach(m=>{m.position.x/=scale();m.position.y/=scale();m.position.z/=scale();gp.add(m);});
 }
 function ceilingLight(name,x,z,intensity){
  const gp=group('ceiling_'+name,x,z);
  const rod=cyl('ceiling_rod_'+name,0,2.65,0,.035,.8,brass());
  const shade=cyl('ceiling_shade_'+name,0,2.25,0,.32,.35,dark());
  [rod,shade].forEach(m=>{m.position.x/=scale();m.position.y/=scale();m.position.z/=scale();gp.add(m);});
  const L=new T.PointLight(0xc8a987,intensity,10*scale(),2);L.position.set(0,1.98*scale(),0);L.castShadow=false;L.userData.houseLight=true;L.userData.base=intensity;gp.add(L);
  state.lights[name]={light:L,base:intensity};
 }
 function createArchitecture(){
  Object.entries(rooms).forEach(([name,r])=>{state.roomMood[name]=0;furnitureRoom(name,r);});
  portal('ENTRY_HALL','ENTRY','HALL',0,6.8,0);
  portal('HALL_BED','HALL','BEDROOM',-4.1,-2.0,Math.PI/2);
  portal('HALL_STUDY','HALL','STUDY',4.1,-2.0,Math.PI/2);
  portal('HALL_RITUAL','HALL','RITUAL',0,-6.6,0);
  portal('RITUAL_BACK','RITUAL','BACK',0,-12.5,0);
  windowUnit('ENTRY',-6.4,9.1,Math.PI/2,2.4,2.2);
  windowUnit('BEDROOM',-10.1,-4.3,Math.PI/2,2.2,2.0);
  windowUnit('STUDY',10.1,-4.3,-Math.PI/2,2.2,2.0);
  windowUnit('RITUAL',-4.2,-10,Math.PI/2,2.0,1.7);
  ceilingLight('ENTRY',0,9,.7);ceilingLight('HALL',0,2,.5);ceilingLight('BEDROOM',-7,-4,.42);ceilingLight('STUDY',7,-4,.48);ceilingLight('RITUAL',0,-10,.25);ceilingLight('BACK',0,-15,.18);
  state.initialized=true;
 }
 function roomOfPlayer(){
  const x=(g.player.x||0)/scale(),z=(g.player.z||0)/scale();
  if(z>7)return'ENTRY';if(z>0)return'HALL';if(z>-7)return x<0?'BEDROOM':'STUDY';if(z>-13)return'RITUAL';return'BACK';
 }
 function distance(a,b){return Math.hypot(a.x-b.x,a.z-b.z)/scale();}
 function mutateDoor(name,open,reason){
  const d=state.doors[name];if(!d)return;
  d.target=open?1:0;d.reason=reason||'HOUSE';
  if(open)g.audio&&g.audio.creak&&g.audio.creak();
 }
 function chooseDoor(room){
  const names=Object.keys(state.doors).filter(k=>state.doors[k].from===room||state.doors[k].to===room);
  if(!names.length)return null;
  return names[Math.floor(Math.random()*names.length)];
 }
 function reactiveDoors(){
  const p=roomOfPlayer(),d=distance(g.player,watcherPosition());
  const pressure=g.adaptiveNightmareDirector&&g.adaptiveNightmareDirector.state?Number(g.adaptiveNightmareDirector.state.heat)||0:0;
  const active=state.activeMutation;
  if(active&&performance.now()<active.expires)return;
  if(pressure>.72&&d>5){const n=chooseDoor(p);if(n){mutateDoor(n,false,'PRESSURE');state.activeMutation={door:n,expires:performance.now()+4500};}}
  else if(pressure<.34){const n=chooseDoor(p);if(n){mutateDoor(n,true,'CALM');state.activeMutation={door:n,expires:performance.now()+5000};}}
 }
 function watcherPosition(){const w=g.watcher||g.watcherMonster||g.watcherEntity||g.entityGroup||g.entity;return w&&w.position?w.position:{x:9999,z:9999};}
 function updateDoors(dt){
  Object.values(state.doors).forEach(d=>{
   d.open+=(d.target-d.open)*Math.min(1,dt*5);
   d.door.rotation.y=(d.open*Math.PI*.86);
   d.door.material.emissive=new T.Color(0x000000);
  });
  if(state.activeMutation&&performance.now()>=state.activeMutation.expires){const d=state.doors[state.activeMutation.door];if(d)d.target=.0;state.activeMutation=null;}
 }
 function updateLighting(){
  const p=roomOfPlayer(),heat=g.adaptiveNightmareDirector&&g.adaptiveNightmareDirector.state?Number(g.adaptiveNightmareDirector.state.heat)||0:0;
  Object.entries(state.lights).forEach(([name,o])=>{
   let target=o.base;
   if(name===p)target*=.92+Math.max(0,.18-heat*.18);
   if(heat>.78)target*=.62;
   o.light.intensity+=(target-o.light.intensity)*.08;
  });
  if(g.flickerUntil&&(g.clock&&g.clock.elapsedTime||0)<g.flickerUntil)Object.values(state.lights).forEach(o=>o.light.intensity*=Math.random()>.55?.08:1);
 }
 function pulseRoom(){
  const p=roomOfPlayer(),m=state.roomMood[p]||0;
  const heat=g.adaptiveNightmareDirector&&g.adaptiveNightmareDirector.state?Number(g.adaptiveNightmareDirector.state.heat)||0:0;
  state.roomMood[p]=Math.min(1,m*.98+heat*.02);
  if(heat>.82&&Math.random()<.035){
   const names=Object.keys(state.doors),n=names[Math.floor(Math.random()*names.length)];
   if(n){mutateDoor(n,false,'NIGHTMARE');state.activeMutation={door:n,expires:performance.now()+1800};}
  }
 }
 createArchitecture();
 setInterval(()=>{if(g.state==='PLAYING'){reactiveDoors();pulseRoom();}},900);
 function frame(){
  if(g.state==='PLAYING'){updateDoors(.05);updateLighting();}
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
 g.houseEnvironmentDirector={state,rooms,doors:state.doors,mutateDoor,roomOfPlayer};
 show();
 function show(){if(g.flashPrompt)g.flashPrompt('THE HOUSE HAS MORE ROOMS THAN YOU REMEMBER');}
}
boot();
})();