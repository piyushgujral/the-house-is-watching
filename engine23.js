/* THE HOUSE IS WATCHING — Engine 23: World, Puzzle & Finale Overhaul
 * Cohesive gameplay chunk: environmental landmarks, a real puzzle chain,
 * usable house seals, extraction feedback and final-chase synchronization.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.player||!g.interactables)return setTimeout(boot,120);
 if(g.__engine23World)return;g.__engine23World=true;
 const S=g.scene.scale&&g.scene.scale.x||1,root=new T.Group();root.name='WorldOverhaul';g.scene.add(root);
 const wood=new T.MeshStandardMaterial({color:0x241713,roughness:.9}),wood2=new T.MeshStandardMaterial({color:0x39211a,roughness:.86}),metal=new T.MeshStandardMaterial({color:0x806238,metalness:.7,roughness:.35}),paper=new T.MeshStandardMaterial({color:0xa99d87,roughness:1}),dark=new T.MeshStandardMaterial({color:0x09090c,roughness:1}),blood=new T.MeshStandardMaterial({color:0x3d1014,roughness:.9});
 const box=(x,y,z,w,h,d,m=wood)=>{const q=new T.Mesh(new T.BoxGeometry(w*S,h*S,d*S),m);q.position.set(x*S,y*S,z*S);root.add(q);return q;};
 const cyl=(x,y,z,r,h,m=wood)=>{const q=new T.Mesh(new T.CylinderGeometry(r*S,r*S,h*S,10),m);q.position.set(x*S,y*S,z*S);root.add(q);return q;};
 // ROOM DRESSING
 box(-7.8,.42,6.1,2.5,.6,.85,wood2);for(const x of[-8.7,-7.8,-6.9])cyl(x,.92,6.1,.08,.85,metal);
 box(7.2,.48,-4.8,3,.58,1,wood2);for(let i=0;i<5;i++)box(5.9+i*.62,1.45,-5.25,.48,1.7,.16,dark);
 box(-7.1,.28,-4.2,2.9,.45,1.8,wood2);for(const x of[-8.2,-6])for(const z of[-4.8,-3.6])cyl(x,.7,z,.07,.8,metal);
 box(0,.42,-10.9,3.3,.7,1.1,dark);for(const x of[-1.1,0,1.1]){cyl(x,.92,-10.9,.075,.35,metal);const l=new T.PointLight(0xff6f38,.18,2.8*S);l.position.set(x*S,1.15*S,-10.9*S);root.add(l);}
 for(const x of[-9.3,-8.1,-6.9,6.9,8.1,9.3])box(x,.45,-14.1,.8,.9,.7,wood2);
 function frame(x,y,z,rot){const a=box(x,y,z,1.5,1.9,.08,dark);a.rotation.y=rot;const b=box(x,y,z-.045*Math.cos(rot),1.25,1.62,.025,paper);b.rotation.y=rot;return a;}
 frame(-11.82,1.7,2.9,Math.PI/2);frame(11.82,1.7,1.2,-Math.PI/2);frame(-11.82,1.7,-8.7,Math.PI/2);frame(11.82,1.7,-8.8,-Math.PI/2);
 for(let i=0;i<9;i++){const z=4.5-i*1.55;const q=box(-11.77,.7,z,.035,.035,.55,blood);q.rotation.y=(i%2?-.32:.24);}
 for(let i=0;i<6;i++){const q=box((i-2.5)*.38,.012,-8.1-i*.48,.045,.012,.7,blood);q.rotation.y=.12+(i%2)*.08;}
 const clock=new T.Mesh(new T.CylinderGeometry(.72*S,.72*S,.12*S,32),dark);clock.position.set(0,2.05*S,3.05*S);clock.rotation.x=Math.PI/2;root.add(clock);for(let i=0;i<12;i++){const a=i*Math.PI/6;const t=box(Math.sin(a)*.52,2.05+Math.cos(a)*.52,2.96,.035,.13,.025,metal);t.rotation.z=-a;}
 function sign(text,x,y,z,rot=0){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#100d0c';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#5d1a20';ctx.lineWidth=4;ctx.strokeRect(3,3,506,122);ctx.fillStyle='#d1c2aa';ctx.font='bold 27px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,64);const m=new T.MeshBasicMaterial({map:new T.CanvasTexture(c),transparent:true});const q=new T.Mesh(new T.PlaneGeometry(3*S,.75*S),m);q.position.set(x*S,y*S,z*S);q.rotation.y=rot;root.add(q);}
 sign('THE HOUSE REMEMBERS',0,2.15,14.76);sign('DO NOT TRUST THE VOICE',-3.8,2.05,6.75);sign('IT WAS HERE FIRST',3.8,2.05,-11.78,Math.PI);
 // ROUTE BREADCRUMBS APPEAR ONLY AFTER THE DOLL.
 const breadcrumbs=[];for(let i=0;i<7;i++){const z=10.5-i*2.7;const q=box(0,.018,z,.16,.012,.75,metal);q.userData.breadcrumb=true;q.visible=false;breadcrumbs.push(q);}
 // UI CAPTION
 const caption=document.createElement('div');caption.id='world-event-caption';caption.style.cssText='position:fixed;left:50%;top:31%;transform:translate(-50%,-50%);font:700 14px/1.4 monospace;letter-spacing:3px;color:#e7dfd3;text-align:center;text-shadow:0 0 12px #000;opacity:0;pointer-events:none;z-index:50;transition:opacity .15s';document.body.appendChild(caption);
 const say=text=>{caption.textContent=text;caption.style.opacity='.92';clearTimeout(say.timer);say.timer=setTimeout(()=>caption.style.opacity='0',1500);};
 // PUZZLE 1 — STUDY SAFE. The player must inspect the safe before the master key becomes usable.
 let safeSolved=false;
 const safeGroup=new T.Group();safeGroup.position.set(7*S,1.05*S,-4.0*S);safeGroup.name='StudySafe';
 const safeBody=new T.Mesh(new T.BoxGeometry(1.35*S,.9*S,.35*S),dark);safeGroup.add(safeBody);
 const dial=new T.Mesh(new T.CylinderGeometry(.23*S,.23*S,.08*S,16),metal);dial.rotation.x=Math.PI/2;dial.position.set(0,0,-.22*S);safeGroup.add(dial);g.scene.add(safeGroup);
 function addInteraction(id,label,pos,action){const group=new T.Group();group.position.set(pos[0]*S,pos[1]*S,pos[2]*S);const body=new T.Mesh(new T.BoxGeometry(.36*S,.5*S,.36*S),new T.MeshStandardMaterial({color:0x8b6b39,emissive:0x281707,emissiveIntensity:.15}));body.position.y=.12*S;group.add(body);const ring=new T.Mesh(new T.TorusGeometry(.3*S,.018*S,6,16),new T.MeshBasicMaterial({color:0xc9b38a,transparent:true,opacity:.32}));ring.rotation.x=Math.PI/2;group.add(ring);g.scene.add(group);g.interactables.push({id,label,group,body,action,removed:false});return group;}
 const safeInteraction=addInteraction('StudySafe','INSPECT SAFE',[7,1,-4.65],()=>{
  if(g.campaign&&g.campaign.stage<2){say('THE SAFE HAS NO POWER');return;}
  if(safeSolved){say('THE SAFE IS EMPTY');return;}
  safeSolved=true;dial.rotation.z=Math.PI*.75;say('THE SAFE OPENS — A KEY WAS WAITING');g.audio&&g.audio.click&&g.audio.click();g.fear=Math.min(100,g.fear+2);
  const key=g.interactables.find(o=>o.id==='Key');if(key){key.removed=false;key.group.visible=true;key.body.material.emissiveIntensity=.45;}
  if(g.campaign)g.campaign.safeSolved=true;
  if(g.updateObjective)g.updateObjective('TAKE THE MASTER KEY. THEN ENTER THE RITUAL ROOM.');
 });
 // Hide the key until the safe is solved. Existing campaign wrappers still validate the stage.
 const keyObj=g.interactables.find(o=>o.id==='Key');if(keyObj){keyObj.removed=true;keyObj.group.visible=false;}
 // PUZZLE 2 — RITUAL LATCH. A visible gate communicates why the Doll cannot simply be collected early.
 const latch=addInteraction('RitualLatch','UNLOCK RITUAL LATCH',[0,1,-7.55],()=>{
  if(!g.inventory.includes('Key')){say('THE LATCH NEEDS THE MASTER KEY');return;}
  latch.userData.unlocked=true;latch.visible=false;say('THE RITUAL ROOM UNLOCKED');g.audio&&g.audio.click&&g.audio.click();
  const doll=g.interactables.find(o=>o.id==='Doll');if(doll){doll.removed=false;doll.group.visible=true;}
  if(g.campaign)g.campaign.ritualUnlocked=true;
  if(g.updateObjective)g.updateObjective('ENTER THE RITUAL ROOM. TAKE THE WATCHER DOLL.');
 });
 // Doll remains visually present but is guarded by the campaign collect layer; latch gives a clear route.
 // PUZZLE 3 — THREE HOUSE SEALS. Engine 18 created visual seals but did not create usable interaction records.
 // This layer supplies the missing playable interaction records and performs the state transition itself.
 const sealCoords={Seal1:[-10,-10],Seal2:[0,-3],Seal3:[10,-10]};
 function breakSeal(id){
  const e=g.houseEndgame;if(!e||!e.started||e.finished){say('THE SEALS ARE DORMANT');return;}
  const item=g.interactables.find(o=>o.id===id);if(!item||item.removed)return;
  item.removed=true;item.group.visible=false;
  const visual=(g.scene.children||[]).find(o=>o.userData&&o.userData.houseSeal&&o.position.x/S()===sealCoords[id][0]);
  if(visual)visual.visible=false;
  e.seals=(e.seals||0)+1;if(g.memory)g.memory.seals=e.seals;g.fear=Math.min(100,g.fear+8);g.audio&&g.audio.sting&&g.audio.sting();
  if(e.seals<3){say('HOUSE SEAL BROKEN — '+e.seals+'/3');if(g.entity){g.entity.state='HUNTING';g.entity.speed=2.6+e.seals*.35;}if(g.updateObjective)g.updateObjective('HOUSE SEALS BROKEN: '+e.seals+'/3 — FIND THE NEXT ONE.');}
  else{e.finished=true;g.phase=6;if(g.entity){g.entity.state='CHASE';g.entity.speed=3.7;}say('ALL THREE SEALS BROKE. RUN!');if(g.updateObjective)g.updateObjective('THE HOUSE IS OPEN. RUN TO THE FRONT DOOR.');}
 }
 Object.keys(sealCoords).forEach(id=>addInteraction(id,'BREAK HOUSE SEAL',sealCoords[id].concat([1.05]),()=>breakSeal(id)));
 // Keep seal interaction records dormant until the Doll activates the hunt.
 const sealInteractions=g.interactables.filter(o=>/^Seal[123]$/.test(o.id));sealInteractions.forEach(o=>{o.group.visible=false;o.removed=true;});
 let elapsed=0,nextEvent=7+Math.random()*6,lastRoom='',oldPlayer=g.updatePlayer.bind(g);
 g.updatePlayer=function(dt){
  oldPlayer(dt);if(this.state!=='PLAYING')return;elapsed+=dt;nextEvent-=dt;
  const p=this.player,sc=S,x=p.x/sc,z=p.z/sc,r=z>7?'ENTRY':z>0?'HALL':z>-7?(x<0?'BEDROOM':'STUDY'):z>-13?'RITUAL':'BACK';
  if(r!==lastRoom){lastRoom=r;if(g.campaign&&g.campaign.stage>=2&&Math.random()<.55){const lines={ENTRY:'THE FRONT DOOR IS CLOSER THAN IT FEELS',HALL:'THE HOUSE HEARD THAT',BEDROOM:'SOMEONE SLEPT HERE RECENTLY',STUDY:'THE PAPERS ARE STILL WARM',RITUAL:'THE AIR IS HOLDING ITS BREATH',BACK:'THERE IS NOWHERE LEFT TO HIDE'};say(lines[r]);}}
  const active=!!(g.campaign&&g.campaign.flags&&g.campaign.flags.doll);breadcrumbs.forEach((b,i)=>{b.visible=active;b.material.opacity=.45+Math.sin(elapsed*2+i)*.18;b.material.transparent=true;});
  if(g.houseEndgame&&g.houseEndgame.started&&!g.houseEndgame.finished)sealInteractions.forEach(o=>{o.removed=false;o.group.visible=true;});
  if(nextEvent<=0){nextEvent=11+Math.random()*16;const d=g.entityGroup?Math.hypot(p.x-g.entityGroup.position.x,p.z-g.entityGroup.position.z)/sc:99;const pressure=(g.campaign&&g.campaign.pressure)||0;if(d>6&&(pressure>20||g.fear>30)){const a=['FOOTSTEPS IN THE NEXT ROOM','THE HOUSE JUST MOVED','DO NOT TURN AROUND','SOMETHING IS WATCHING FROM THE DARK'];say(a[Math.floor(Math.random()*a.length)]);g.audio&&g.audio.creak&&g.audio.creak();g.fear=Math.min(100,g.fear+1.6);}}
 };
 // FINAL CHASE always wins the authority battle against earlier AI wrappers.
 const oldEntity=g.updateEntity.bind(g);g.updateEntity=function(dt){oldEntity(dt);if(this.state!=='PLAYING')return;const final=this.phase>=6||(this.houseEndgame&&this.houseEndgame.finished);if(final&&this.entity){this.entity.state='CHASE';this.entity.speed=3.7;}};
 const oldEscape=g.escape.bind(g);let escaping=false;g.escape=function(){if(escaping)return;const final=(g.houseEndgame&&g.houseEndgame.finished)||(this.campaign&&this.campaign.flags&&this.campaign.flags.seals>=3);if(!final){oldEscape();return;}escaping=true;say('THE DOOR IS OPEN. RUN.');setTimeout(()=>{if(this.state==='PLAYING'&&this.win)this.win();escaping=false;},650);};
 g.worldOverhaul={root,caption,say,landmarks:root,safeSolved:()=>safeSolved};
}
boot();
})();