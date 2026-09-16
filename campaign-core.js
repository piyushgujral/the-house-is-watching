/* THE HOUSE IS WATCHING — Campaign Core v2
 * Cohesive mission director: progression gates, physical room landmarks,
 * puzzle-state validation, seal-hunt synchronization and final extraction.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.interactables||!g.player)return setTimeout(boot,100);
 if(g.__campaignCoreV2)return;g.__campaignCoreV2=true;
 const ui=id=>document.getElementById(id),S=()=>g.scene.scale&&g.scene.scale.x||1,P=()=>g.player;
 const C=g.campaign={version:2,stage:0,started:false,completed:false,flags:{fuse:false,power:false,key:false,doll:false,seals:0},time:0,pressure:0,lastRoom:null,roomVisits:{},eventCooldown:5,interactionLock:0};
 const msg=t=>{if(g.flashPrompt)g.flashPrompt(t);};
 const objective=t=>{if(g.updateObjective)g.updateObjective(t);else if(ui('objective-text'))ui('objective-text').textContent=t;};
 const room=()=>{const x=P().x/S(),z=P().z/S();if(z>7)return'ENTRY';if(z>0)return'HALL';if(z>-7)return x<0?'BEDROOM':'STUDY';if(z>-13)return'RITUAL';return'BACK';};
 const find=id=>g.interactables.find(o=>o.id===id);
 function setStage(n,text){C.stage=n;objective(text);}
 function setVisible(id,v){const o=find(id);if(o&&o.group)o.group.visible=v;o&&(o.removed=!v);}
 function stageText(){
  const t=['ENTER THE HOUSE. FIND THE FUSE.','INSTALL THE FUSE. RESTORE POWER AT THE GENERATOR.','SEARCH THE STUDY. FIND THE MASTER KEY.','UNLOCK THE RITUAL ROOM. FIND THE WATCHER DOLL.','THE DOLL WOKE IT. BREAK THREE HOUSE SEALS.','SEALS BROKEN. REACH THE FRONT DOOR.','RUN. THE HOUSE HAS OPENED THE WAY.'];
  objective(t[Math.min(C.stage,6)]);
 }
 function unlockVisuals(){
  // Subtle procedural indicators; no external assets and cheap on mobile.
  const root=new T.Group();root.name='CampaignLandmarks';g.scene.add(root);C.landmarks=root;
  const scale=S();
  const wood=new T.MeshStandardMaterial({color:0x2a1714,roughness:.9});
  const brass=new T.MeshStandardMaterial({color:0x8b6937,metalness:.55,roughness:.4});
  function box(x,y,z,w,h,d,m=wood){const q=new T.Mesh(new T.BoxGeometry(w*scale,h*scale,d*scale),m);q.position.set(x*scale,y*scale,z*scale);root.add(q);return q;}
  // Entry notice board / spatial landmark.
  box(0,1.55,7.15,3.4,2.2,.12);for(let i=0;i<3;i++)box(-1.05+i*1.05,1.55,7.06,.82,1.35,.03,brass);
  // Study desk and ritual plinth visually reinforce the objectives.
  box(7,0.45,-4.8,2.7,.55,.9);box(7,1.1,-4.8,.12,.65,.12,brass);
  box(0,.5,-11.0,3.0,.55,1.1);for(let i=0;i<3;i++)box(-.8+i*.8,.88,-11.0,.12,.45,.12,brass);
  // Three overhead beams act as landmarks for the seal route.
  [[-10,-10],[0,-3],[10,-10]].forEach(([x,z])=>{box(x,2.75,z,2.2,.12,.12,brass);});
 }
 unlockVisuals();
 // Start state: only the fuse is an active objective. Existing interactables remain visible,
 // but invalid items are rejected before the underlying collector can fire.
 setVisible('Fuse',true);
 function reject(text){C.interactionLock=.35;msg(text);if(g.audio&&g.audio.creak)g.audio.creak();}
 const baseCollect=g.collect.bind(g);
 g.collect=function(id){
  if(g.state!=='PLAYING'||C.interactionLock>0)return;
  if(id==='Fuse'){
   if(C.flags.fuse)return;
   baseCollect(id);C.flags.fuse=true;setStage(1,'INSTALL THE FUSE. RESTORE POWER AT THE GENERATOR.');msg('THE FUSE FITS. NOW FIND THE GENERATOR.');return;
  }
  if(id==='Key'){
   if(C.stage<2){reject('THE STUDY IS NOT READY. RESTORE POWER FIRST.');return;}
   if(C.flags.key)return;
   baseCollect(id);C.flags.key=true;setStage(3,'UNLOCK THE RITUAL ROOM. FIND THE WATCHER DOLL.');msg('THE MASTER KEY IS COLD. VERY COLD.');return;
  }
  if(id==='Doll'){
   if(C.stage<3){reject('THE RITUAL ROOM IS STILL SEALED.');return;}
   if(C.flags.doll)return;
   baseCollect(id);C.flags.doll=true;setStage(4,'THE DOLL WOKE IT. BREAK THREE HOUSE SEALS.');msg('IT KNOWS YOU ARE HERE.');return;
  }
  baseCollect(id);
 };
 // Generator is the power puzzle. The original generator routine performs the actual game-side state;
 // this wrapper only permits it at the correct campaign moment and advances the mission.
 const baseGenerator=g.generator&&g.generator.bind(g);
 if(baseGenerator)g.generator=function(){
  if(C.stage!==1){reject(C.stage<1?'THE GENERATOR HAS NO POWER.':'THE GENERATOR IS ALREADY RUNNING.');return;}
  baseGenerator();C.flags.power=true;setStage(2,'SEARCH THE STUDY. FIND THE MASTER KEY.');msg('POWER RESTORED. SOMETHING MOVED UPSTAIRS.');
 };
 // Synchronize Engine 18's seal hunt with this campaign director. This fixes the old
 // stage/phase mismatch where the front door could remain blocked after the third seal.
 const baseInteract=g.interactNow&&g.interactNow.bind(g);
 if(baseInteract)g.interactNow=function(){
  if(C.interactionLock>0)return;
  const before=g.houseEndgame&&g.houseEndgame.seals||0;
  baseInteract();
  const after=g.houseEndgame&&g.houseEndgame.seals||0;
  if(after!==before){C.flags.seals=after;if(after<3){setStage(4,'SEALS BROKEN: '+after+'/3 — THE HOUSE IS ANGRY.');}else{C.completed=true;C.flags.seals=3;setStage(5,'SEALS BROKEN. REACH THE FRONT DOOR.');msg('THE LOCKS RELEASED. RUN!');}}
 };
 // Final extraction is explicit: no hidden dependency on an older phase number.
 const baseEscape=g.escape.bind(g);
 g.escape=function(){
  const finished=(g.houseEndgame&&g.houseEndgame.finished)||C.flags.seals>=3;
  if(C.stage<4){reject('THE FRONT DOOR WILL NOT OPEN YET.');return;}
  if(!finished){reject('THE HOUSE IS STILL SEALED. BREAK ALL THREE SEALS.');return;}
  C.completed=true;C.stage=6;objective('ESCAPE THE HOUSE.');
  if(g.win)g.win();else baseEscape();
 };
 // Campaign pressure: rooms become more reactive as the player repeats routes.
 const basePlayer=g.updatePlayer.bind(g);
 g.updatePlayer=function(dt){
  basePlayer(dt);if(g.state!=='PLAYING')return;C.started=true;C.time+=dt;C.interactionLock=Math.max(0,C.interactionLock-dt);
  const r=room();C.roomVisits[r]=(C.roomVisits[r]||0)+dt;
  if(r!==C.lastRoom){
   C.lastRoom=r;
   if(C.roomVisits[r]>12){C.pressure=Math.min(100,C.pressure+6);if(C.stage>=2)msg('THE HOUSE REMEMBERS THIS ROUTE.');}
  }
  if(g.running)C.pressure=Math.min(100,C.pressure+dt*1.25);else C.pressure=Math.max(0,C.pressure-dt*.06);
  C.eventCooldown-=dt;
  if(C.eventCooldown<=0&&C.stage>=2&&C.pressure>28){
   C.eventCooldown=10+Math.random()*12;
   const d=g.entityGroup?Math.hypot(P().x-g.entityGroup.position.x,P().z-g.entityGroup.position.z)/S():99;
   if(d>6){
    const events=['FOOTSTEPS ABOVE YOU','THE HOUSE JUST BREATHED','SOMETHING MOVED IN THE NEXT ROOM'];
    msg(events[Math.floor(Math.random()*events.length)]);g.audio&&g.audio.footstep&&g.audio.footstep();g.fear=Math.min(100,g.fear+1.2);
   }
  }
 };
 // Keep progression synchronized even when Engine 18 / Engine 22 mutate phase directly.
 const baseEntity=g.updateEntity.bind(g);
 g.updateEntity=function(dt){
  baseEntity(dt);if(g.state!=='PLAYING')return;
  const seals=g.houseEndgame&&g.houseEndgame.seals||0;
  if(seals>C.flags.seals){C.flags.seals=seals;if(seals>=3){C.completed=true;C.stage=5;stageText();}}
  if(g.phase>=6&&seals>=3&&C.stage<5){C.completed=true;C.stage=5;stageText();}
 };
 stageText();
 g.getCampaignState=()=>({version:C.version,stage:C.stage,time:C.time,room:C.lastRoom,pressure:C.pressure,completed:C.completed,flags:{...C.flags},roomVisits:{...C.roomVisits}});
}
boot();
})();