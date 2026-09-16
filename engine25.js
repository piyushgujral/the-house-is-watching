/* THE HOUSE IS WATCHING — Engine 25: Living House Encounter System
 * Cohesive gameplay chunk: reactive doors, blackout events, route disruption,
 * pressure feedback and a non-cosmetic Watcher encounter layer.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.player||!g.interactables)return setTimeout(boot,150);
 if(g.__engine25)return;g.__engine25=true;
 const S=()=>g.scene.scale&&g.scene.scale.x||1;
 const root=new T.Group();root.name='LivingHouseSystem';g.scene.add(root);
 const mat=new T.MeshStandardMaterial({color:0x1b1210,roughness:.88});
 const glow=new T.MeshBasicMaterial({color:0x7c2830,transparent:true,opacity:.5});
 const barriers=[];
 function block(name,x,z,w,d){
  const q=new T.Mesh(new T.BoxGeometry(w*S(),2.5*S(),d*S()),mat);q.name=name;q.position.set(x*S(),1.25*S(),z*S());q.visible=false;root.add(q);barriers.push(q);return q;
 }
 // Temporary house shifts are placed in existing doorways, never permanently blocking the route.
 const hallBlock=block('HouseShiftHall',0,1.15,3.4,.24);
 const studyBlock=block('HouseShiftStudy',3.95,-4.8,.24,3.2);
 const bedroomBlock=block('HouseShiftBedroom',-3.95,-4.8,.24,3.2);
 const warning=new T.Mesh(new T.PlaneGeometry(3.1*S(),.42*S()),glow);warning.rotation.x=-Math.PI/2;warning.position.y=.03*S();warning.visible=false;root.add(warning);
 const eventUI=document.createElement('div');eventUI.id='house-pressure-ui';eventUI.style.cssText='position:fixed;left:50%;bottom:19%;transform:translateX(-50%);font:700 12px monospace;letter-spacing:2px;color:#d9c8b5;text-shadow:0 0 10px #000;opacity:0;pointer-events:none;z-index:45;transition:opacity .2s;text-align:center';document.body.appendChild(eventUI);
 let uiTimer=0,eventTimer=14+Math.random()*8,lastRoom='',shift=0,oldUpdatePlayer=g.updatePlayer.bind(g),oldUpdateEntity=g.updateEntity.bind(g);
 function say(t){eventUI.textContent=t;eventUI.style.opacity='1';uiTimer=2.1;if(g.worldOverhaul&&g.worldOverhaul.say)g.worldOverhaul.say(t);}
 function room(p){const z=p.z/S(),x=p.x/S();return z>7?'ENTRY':z>0?'HALL':z>-7?(x<0?'BEDROOM':'STUDY'):z>-13?'RITUAL':'BACK';}
 function pressure(){return Number(g.campaign&&g.campaign.pressure||0)+Number(g.fear||0)*.35;}
 function chooseShift(r){
  const options=r==='HALL'?[hallBlock]:r==='STUDY'?[studyBlock]:r==='BEDROOM'?[bedroomBlock]:[hallBlock];
  return options[Math.floor(Math.random()*options.length)];
 }
 function runEvent(){
  if(g.state!=='PLAYING')return;
  const c=g.campaign,e=g.houseEndgame;
  if(!c||c.stage<2||!g.player)return;
  const p=g.player,r=room(p),pr=pressure();
  if(e&&e.finished)return;
  const q=Math.random();
  if(q<.45&&pr>25){
   const b=chooseShift(r);b.visible=true;shift++;
   warning.position.set(g.player.x,.025*S(),g.player.z);warning.visible=true;
   say(r==='HALL'?'THE HOUSE CLOSED A DOOR BEHIND YOU':r==='STUDY'?'THE STUDY DOES NOT WANT YOU BACK':'THE WALL MOVED');
   setTimeout(()=>{b.visible=false;warning.visible=false;},4500+Math.random()*2500);
  }else if(q<.72&&pr>18){
   const old=g.flashlight&&g.flashlight.intensity||1;
   if(g.flashlight)g.flashlight.intensity=Math.max(.35,old*.18);
   say('THE LIGHT IS NOT YOURS ANYMORE');
   setTimeout(()=>{if(g.flashlight)g.flashlight.intensity=old;},1800);
  }else{
   say(r==='RITUAL'?'SOMETHING JUST BREATHED BEHIND YOU':'THE HOUSE IS LISTENING');
   if(g.audio&&g.audio.creak)g.audio.creak();
   g.fear=Math.min(100,(g.fear||0)+2.5);
  }
 }
 g.updatePlayer=function(dt){
  oldUpdatePlayer(dt);if(this.state!=='PLAYING')return;
  eventTimer-=dt;if(uiTimer>0){uiTimer-=dt;if(uiTimer<=0)eventUI.style.opacity='0';}
  const r=room(this.player);if(r!==lastRoom){lastRoom=r;if(pressure()>22&&Math.random()<.65)say('THE HOUSE NOTICED YOU ENTER '+r);}
  if(eventTimer<=0){eventTimer=15+Math.random()*13;runEvent();}
 };
 g.updateEntity=function(dt){
  oldUpdateEntity(dt);if(this.state!=='PLAYING'||!this.entity)return;
  const e=this.houseEndgame;
  if(e&&e.finished){this.entity.state='CHASE';this.entity.speed=3.7;return;}
  const p=this.player,dx=p.x-this.entityGroup.position.x,dz=p.z-this.entityGroup.position.z,d=Math.hypot(dx,dz)/S();
  if(d<8&&pressure()>35&&this.entity.state!=='CHASE'&&Math.random()<dt*.65){this.entity.state='HUNTING';this.entity.speed=Math.max(this.entity.speed||2.5,2.9);say('IT HEARD THAT');}
  if(d>12&&this.entity.state==='HUNTING'&&Math.random()<dt*.35)this.entity.state='STALK';
 };
 g.livingHouse={runEvent,pressure,room,barriers,shiftCount:()=>shift};
}
boot();
})();
