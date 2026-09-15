/* THE HOUSE IS WATCHING — Campaign Core
 * Major playable progression layer: chained objectives, room gating, dynamic house states,
 * fail-safe interactions and a more coherent 15–25 minute run structure.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;if(!g||!T||!g.scene||!g.interactables)return setTimeout(boot,100);if(g.__campaignCore)return;g.__campaignCore=true;
 const C=g.campaign={stage:0,started:false,flags:{power:false,key:false,doll:false,seals:0},roomVisits:{},time:0,pressure:0,lastRoom:null,eventCooldown:0,originalCollect:g.collect.bind(g),originalEscape:g.escape.bind(g)};
 const ui=id=>document.getElementById(id);
 const msg=t=>{if(g.flashPrompt)g.flashPrompt(t);};
 const objective=t=>{if(g.updateObjective)g.updateObjective(t);else if(ui('objective-text'))ui('objective-text').textContent=t;};
 const s=()=>g.scene.scale&&g.scene.scale.x||1;
 const p=()=>g.player;
 const distance=(x,z)=>Math.hypot(p().x-x*s(),p().z-z*s());
 function room(){const x=p().x/s(),z=p().z/s();if(z>7)return'ENTRY';if(z>0)return'HALL';if(z>-7)return x<0?'BEDROOM':'STUDY';if(z>-13)return'RITUAL';return'BACK';}
 function hideObject(id){const o=g.interactables.find(x=>x.id===id);if(o){o.removed=true;o.group.visible=false;}}
 function showObject(id){const o=g.interactables.find(x=>x.id===id);if(o){o.removed=false;o.group.visible=true;}}
 function stageObjective(){
  if(C.stage===0)objective('ENTER THE HOUSE. FIND THE FUSE.');
  else if(C.stage===1)objective('TAKE THE FUSE TO THE GENERATOR IN THE ENTRY.');
  else if(C.stage===2)objective('SEARCH THE STUDY FOR THE MASTER KEY.');
  else if(C.stage===3)objective('ENTER THE RITUAL ROOM. FIND OUT WHAT THE HOUSE HIDES.');
  else if(C.stage===4)objective('TAKE THE WATCHER DOLL. THEN RUN.');
  else if(C.stage===5)objective('BREAK THE THREE HOUSE SEALS.');
  else if(C.stage===6)objective('REACH THE FRONT DOOR BEFORE IT CATCHES YOU.');
 }
 // Make the original collection flow authoritative, but translate it into campaign stages.
 g.collect=function(id){
  C.originalCollect(id);
  if(id==='Fuse'&&!C.flags.power){C.flags.power=true;C.stage=Math.max(C.stage,1);stageObjective();}
  if(id==='Key'&&C.flags.power){C.flags.key=true;C.stage=Math.max(C.stage,3);stageObjective();}
  if(id==='Doll'&&C.flags.key){C.flags.doll=true;C.stage=Math.max(C.stage,5);stageObjective();}
 };
 // Generator completion advances the campaign and starts controlled pressure.
 const oldGenerator=g.generator?g.generator.bind(g):null;
 if(oldGenerator)g.generator=function(){oldGenerator();if(C.flags.power&&C.stage<2){C.stage=2;stageObjective();msg('THE LIGHTS CAME BACK. SOMETHING ELSE DID TOO.');}};
 // Three-seal endgame remains compatible with the existing endgame module.
 const oldEscape=g.escape.bind(g);
 g.escape=function(){
  if(C.stage<6){msg('THE FRONT DOOR IS NOT READY.');return;}
  if(g.houseEndgame&&g.houseEndgame.finished){g.win();return;}
  if(g.majorGameplay&&g.majorGameplay.exitReady){g.win();return;}
  oldEscape();
 };
 // House pressure is driven by repeated routes, running and lingering in dangerous rooms.
 const oldPlayer=g.updatePlayer.bind(g);
 g.updatePlayer=function(dt){oldPlayer(dt);if(g.state!=='PLAYING')return;C.started=true;C.time+=dt;C.eventCooldown-=dt;const r=room();C.roomVisits[r]=(C.roomVisits[r]||0)+dt;
  if(r!==C.lastRoom){C.lastRoom=r;if((C.roomVisits[r]||0)>18){C.pressure=Math.min(100,C.pressure+7);msg('THE HOUSE NOTICED YOUR ROUTE');}}
  if(g.running)C.pressure=Math.min(100,C.pressure+dt*1.4);else C.pressure=Math.max(0,C.pressure-dt*.08);
  if(C.stage>=5&&C.eventCooldown<=0&&C.pressure>35){C.eventCooldown=9+Math.random()*8;const w=g.entityGroup;if(w){const d=Math.hypot(p().x-w.position.x,p().z-w.position.z)/s();if(d>7){msg(Math.random()<.5?'FOOTSTEPS IN THE NEXT ROOM':'THE HOUSE JUST MOVED');g.audio&&g.audio.creak&&g.audio.creak();g.fear=Math.min(100,g.fear+1.5);}}}
 };
 // Prevent impossible states if an older layer changes phase independently.
 const oldUpdateEntity=g.updateEntity.bind(g);
 g.updateEntity=function(dt){oldUpdateEntity(dt);if(g.state!=='PLAYING')return;if(C.stage>=5&&g.inventory&&g.inventory.includes('Doll')){if(C.stage<6&&g.houseEndgame&&g.houseEndgame.finished){C.stage=6;stageObjective();}}};
 stageObjective();
 g.getCampaignState=()=>({stage:C.stage,room:C.lastRoom,pressure:C.pressure,visits:C.roomVisits,flags:{...C.flags}});
}
boot();
})();