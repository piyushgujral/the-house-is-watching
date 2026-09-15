/* THE HOUSE IS WATCHING — Engine 18: Living House / Seal Hunt
 * Extends the existing vertical slice without replacing its core engine.
 * After the Doll wakes the house, players must break three house seals before
 * the front door will open. The Watcher escalates as seals are broken.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.interactables)return setTimeout(boot,100);
 if(g.__engine18)return;g.__engine18=true;
 const state={seals:0,started:false,finished:false,eventTimer:5+Math.random()*5,nextEvent:0};
 g.houseEndgame=state;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const mat=new T.MeshStandardMaterial({color:0x3a1717,emissive:0x220404,emissiveIntensity:.35,roughness:.72});
 const glow=new T.MeshBasicMaterial({color:0xb51f2b});
 const seals=[];
 function addSeal(id,x,z){
   const group=new T.Group();group.position.set(x,1.05,z);group.visible=false;group.userData.houseSeal=true;
   const base=new T.Mesh(new T.CylinderGeometry(.22,.27,.12,8),mat);base.rotation.z=.08;group.add(base);
   const ring=new T.Mesh(new T.TorusGeometry(.3,.025,6,16),glow);ring.rotation.x=Math.PI/2;group.add(ring);
   const mark=new T.Mesh(new T.BoxGeometry(.035,.32,.025),glow);mark.rotation.z=.75;group.add(mark);const mark2=mark.clone();mark2.rotation.z=-.75;group.add(mark2);
   g.scene.add(group);seals.push({id,group,used:false});
   g.interactables.push({id,label:'BREAK HOUSE SEAL',group,body:base,removed:false,action:function(){breakSeal(id);}});
 }
 addSeal('Seal1',-10,-10);addSeal('Seal2',10,-10);addSeal('Seal3',0,-3);
 function activate(){
   state.started=true;state.seals=0;
   seals.forEach(s=>{s.used=false;s.group.visible=true;});
   g.updateObjective('BREAK THE THREE HOUSE SEALS. DO NOT LET IT CORNER YOU.');
   if(g.audio&&g.audio.sting)g.audio.sting();
   state.eventTimer=3;
 }
 function breakSeal(id){
   if(!state.started||state.finished)return;
   const s=seals.find(v=>v.id===id),o=g.interactables.find(v=>v.id===id);if(!s||s.used)return;
   s.used=true;s.group.visible=false;if(o){o.removed=true;o.current=null;}
   state.seals++;g.memory.seals=state.seals;
   g.fear=clamp(g.fear+8,0,100);
   if(g.audio&&g.audio.sting)g.audio.sting();
   if(state.seals<3){g.updateObjective('SEALS BROKEN: '+state.seals+'/3 — THE HOUSE IS ANGRY.');if(g.entity){g.entity.state='HUNTING';g.entity.speed=2.25+state.seals*.35;}}
   else {state.finished=true;g.phase=6;g.updateObjective('THE HOUSE IS OPEN. RUN TO THE FRONT DOOR.');if(g.entity){g.entity.state='CHASE';g.entity.speed=3.7;}g.audio&&g.audio.sting&&g.audio.sting();}
 }
 // The Doll still uses the original inventory/gameplay rules, but its aftermath
 // becomes a seal hunt instead of an immediate unavoidable death run.
 const oldCollect=g.collect.bind(g);
 g.collect=function(id){oldCollect(id);if(id==='Doll'&&this.inventory.includes('Doll')){if(this.entity){this.entity.state='STALK';this.entity.speed=2.25;}activate();}};
 const oldEscape=g.escape.bind(g);
 g.escape=function(){
   if(state.started&&!state.finished){this.flashPrompt('THE FRONT DOOR IS SEALED');if(this.audio&&this.audio.creak)this.audio.creak();return;}
   oldEscape();
 };
 function houseEvent(){
   if(g.state!=='PLAYING'||!state.started||state.finished)return;
   const p=g.player,e=g.entityGroup;if(!p||!e)return;
   const d=Math.hypot(p.x-e.position.x,p.z-e.position.z);
   if(d<4.5)return;
   const r=Math.random();
   if(r<.34&&g.audio&&g.audio.creak){g.audio.creak();g.flashPrompt('A DOOR SLAMMED SOMEWHERE BEHIND YOU');}
   else if(r<.68&&g.audio&&g.audio.footstep){g.audio.footstep();g.audio.footstep();g.flashPrompt('FOOTSTEPS — BUT YOU ARE ALONE');}
   else {if(g.audio&&g.audio.whisper)g.audio.whisper();g.flashPrompt('THE HOUSE WHISPERED YOUR NAME');}
   g.fear=clamp(g.fear+2.5,0,100);
 }
 const oldUpdate=g.updateHUD&&g.updateHUD.bind(g);
 if(oldUpdate)g.updateHUD=function(){oldUpdate();if(this.state!=='PLAYING'||!state.started)return;const el=document.getElementById('objective-text');if(el&&state.started&&!state.finished){el.dataset.seals=String(state.seals);}};
 const oldLoop=g.loop.bind(g);
 g.loop=function(){
   if(this.state==='PLAYING'&&state.started&&!state.finished){
     state.eventTimer-=this.clock.getDelta?0:0;
     // Clock timing is owned by the core loop; use elapsed time checkpoints.
     const now=this.clock.elapsedTime;
     if(now>state.nextEvent){state.nextEvent=now+8+Math.random()*9;houseEvent();}
     seals.forEach((s,i)=>{if(s.group.visible){const q=1+Math.sin(now*3+i)*.12;s.group.scale.set(q,q,q);s.group.rotation.y=now*.35;}});
   }
   oldLoop.apply(this,arguments);
 };
}
boot();
})();
