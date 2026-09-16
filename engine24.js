/* THE HOUSE IS WATCHING — Engine 24: Seal Hunt + Extraction Director
 * One cohesive gameplay layer: fixes seal coordinates, adds readable hunt UI,
 * makes the final door communicate state, and hardens the endgame transition.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.interactables)return setTimeout(boot,150);
 if(g.__engine24)return;g.__engine24=true;
 const S=()=>g.scene.scale&&g.scene.scale.x||1;
 const seals={Seal1:[-10,-10],Seal2:[0,-3],Seal3:[10,-10]};
 const names=['NORTH SEAL','HEART SEAL','SOUTH SEAL'];
 const root=new T.Group();root.name='SealHuntDirector';g.scene.add(root);
 const sealVisuals={};
 function glowSeal(id,x,z){
  const s=S(),q=new T.Group();q.name=id+'Visual';q.position.set(x*s,.05*s,z*s);
  const mat=new T.MeshStandardMaterial({color:0x54131a,emissive:0x28070b,emissiveIntensity:.65,roughness:.72});
  const ring=new T.Mesh(new T.TorusGeometry(.72*s,.09*s,8,32),mat);ring.rotation.x=Math.PI/2;q.add(ring);
  const inner=new T.Mesh(new T.CylinderGeometry(.28*s,.38*s,.08*s,8),mat);q.add(inner);
  for(let i=0;i<4;i++){const bar=new T.Mesh(new T.BoxGeometry(.07*s,.12*s,1.35*s),mat);bar.rotation.y=i*Math.PI/2;q.add(bar);}
  const beam=new T.Mesh(new T.CylinderGeometry(.035*s,.035*s,3.2*s,8),new T.MeshBasicMaterial({color:0x7d1821,transparent:true,opacity:.18}));beam.position.y=1.65*s;q.add(beam);
  const light=new T.PointLight(0x8d1d26,.35,4*s);light.position.y=.7*s;q.add(light);
  q.visible=false;root.add(q);sealVisuals[id]=q;
 }
 Object.keys(seals).forEach(id=>glowSeal(id,seals[id][0],seals[id][1]));
 // Engine 23 accidentally supplied [x,z,y] to addInteraction. Normalize every seal record
 // here, and use explicit world coordinates so the interaction target matches the visual.
 Object.keys(seals).forEach((id,i)=>{
  const item=g.interactables.find(o=>o.id===id);
  if(item){item.group.position.set(seals[id][0]*S(),1.05*S(),seals[id][1]*S());item.label='BREAK '+names[i];item.removed=true;item.group.visible=false;item.group.userData.sealId=id;}
 });
 // Endgame HUD: intentionally independent of the existing objective panel so it remains
 // visible while the objective text changes rapidly during the hunt.
 const hud=document.createElement('div');hud.id='seal-hunt-hud';hud.style.cssText='position:fixed;right:24px;top:112px;min-width:190px;padding:10px 12px;border:1px solid rgba(190,150,120,.28);background:rgba(5,4,5,.58);backdrop-filter:blur(3px);font:700 11px/1.55 monospace;letter-spacing:1.5px;color:#d7c9b8;z-index:35;pointer-events:none;opacity:0;transition:opacity .25s';
 hud.innerHTML='<div id="seal-hunt-title">HOUSE SEALS</div><div id="seal-hunt-count">0 / 3</div><div id="seal-hunt-hint" style="opacity:.65;margin-top:3px">THE HOUSE HAS OPENED A HUNT</div>';
 document.body.appendChild(hud);
 const count=hud.querySelector('#seal-hunt-count'),hint=hud.querySelector('#seal-hunt-hint');
 function huntUI(active){hud.style.opacity=active?'1':'0';}
 function refresh(){const e=g.houseEndgame;if(!e)return;const n=Math.min(3,e.seals||0);count.textContent=n+' / 3';
  if(e.finished){hint.textContent='EXTRACTION ACTIVE — REACH THE FRONT DOOR';}
  else if(n===0){hint.textContent='BREAK THE MARKS BEFORE IT FINDS YOU';}
  else{hint.textContent='NEXT SEAL — THE HOUSE IS LEARNING';}
  Object.keys(sealVisuals).forEach((id,i)=>{const v=sealVisuals[id];v.visible=!!e.started&&!e.finished&&(i>=n);});
  Object.keys(seals).forEach((id,i)=>{const item=g.interactables.find(o=>o.id===id);if(item){item.removed=!(e.started&&!e.finished&&i>=n);item.group.visible=!item.removed;}});
 }
 // Add a persistent final-door visual state to the existing Exit interaction.
 const exit=g.interactables.find(o=>o.id==='Exit');
 let exitDoor=null;
 if(exit){
  exit.group.userData.extractionDoor=true;
  exitDoor=new T.Group();exitDoor.name='ExtractionDoorState';exit.group.add(exitDoor);
  const frameMat=new T.MeshStandardMaterial({color:0x251913,roughness:.9});
  const slab=new T.Mesh(new T.BoxGeometry(2.2*S(),3.3*S(),.16*S),frameMat);slab.position.y=1.45*S;exitDoor.add(slab);
  const warning=new T.Mesh(new T.BoxGeometry(1.45*S,.13*S,.03*S),new T.MeshBasicMaterial({color:0x8a2730}));warning.position.set(0,1.35*S,-.1*S);exitDoor.add(warning);
 }
 let oldUpdatePlayer=g.updatePlayer.bind(g),oldUpdateEntity=g.updateEntity.bind(g),elapsed=0,lastStage=-1,finalStarted=false;
 function caption(text){if(g.worldOverhaul&&g.worldOverhaul.say)g.worldOverhaul.say(text);}
 g.updatePlayer=function(dt){
  oldUpdatePlayer(dt);if(this.state!=='PLAYING')return;elapsed+=dt;
  const e=this.houseEndgame,c=this.campaign;
  const active=!!(e&&e.started&&!e.finished),finished=!!(e&&e.finished);
  huntUI(active||finished);refresh();
  if(c&&c.stage!==lastStage){lastStage=c.stage;
   if(c.stage===4){caption('THE DOLL WAS A KEY. THE HOUSE WANTS THE REST.');}
   if(c.stage===5){caption('THREE MARKS. THREE ROOMS. MOVE.');}
  }
  if(exit){
   const open=finished;
   exit.group.userData.extractionOpen=open;
   if(exitDoor){exitDoor.visible=!open;exit.group.userData.prompt=open?'RUN TO EXIT':'THE FRONT DOOR IS SEALED';}
  }
  if(active){
   const n=e.seals||0;
   // Pressure rises briefly after every seal without making the chase permanently unfair.
   if(n>0&&this.entity&&this.entity.state==='HUNTING')this.entity.speed=2.6+n*.35;
  }
  if(finished&&!finalStarted){finalStarted=true;caption('THE HOUSE IS OPEN. IT KNOWS YOU ARE LEAVING.');}
 };
 g.updateEntity=function(dt){
  oldUpdateEntity(dt);if(this.state!=='PLAYING')return;
  const e=this.houseEndgame;if(e&&e.finished&&this.entity){this.entity.state='CHASE';this.entity.speed=3.7;}
 };
 // Make escape feedback depend on the real endgame flag while retaining the original win flow.
 const oldEscape=g.escape.bind(g);let escapeLock=false;
 g.escape=function(){
  const e=this.houseEndgame;
  if(!e||!e.finished){caption('THE FRONT DOOR WILL NOT OPEN YET');return;}
  if(escapeLock)return;escapeLock=true;
  caption('RUNNING OUTSIDE...');
  const door=exitDoor;if(door){door.scale.x=.08;door.position.z=-.65*S();}
  setTimeout(()=>{if(this.state==='PLAYING'&&this.win)this.win();escapeLock=false;},700);
 };
 g.sealHuntDirector={refresh,huntUI,sealVisuals,names};
 refresh();
}
boot();
})();
