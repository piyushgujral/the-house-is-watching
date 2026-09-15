/* THE HOUSE IS WATCHING — Engine 23: Dynamic House Events
 * Adds readable, replayable environmental reactions without external assets.
 * Works as a late-loaded extension over the existing runtime.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.player)return setTimeout(boot,120);
 if(g.__engine23)return;g.__engine23=true;
 const E={t:0,next:6+Math.random()*7,active:0,lastRoom:'',eventCount:0,lamps:[],originalIntensities:[]};g.houseEvents=E;
 g.scene.traverse(o=>{if(o.isLight&&o.userData&&typeof o.userData.base==='number'){E.lamps.push(o);E.originalIntensities.push(o.userData.base);}});
 const ui=document.createElement('div');ui.id='house-event-caption';ui.style.cssText='position:fixed;left:50%;top:28%;transform:translate(-50%,-50%);font:700 13px/1.3 monospace;letter-spacing:3px;color:#e8e2da;text-align:center;text-shadow:0 0 10px #000;opacity:0;pointer-events:none;z-index:40;transition:opacity .12s';document.body.appendChild(ui);E.ui=ui;
 function caption(text){ui.textContent=text;ui.style.opacity='.88';clearTimeout(E.captionTimer);E.captionTimer=setTimeout(()=>ui.style.opacity='0',1200);}
 function room(){const x=g.player.x,z=g.player.z;if(z>7)return'ENTRY';if(z>0)return'HALL';if(z>-7)return x<0?'BEDROOM':'STUDY';if(z>-13)return'RITUAL';return'BACK';}
 function nearestDistance(){const w=g.entityGroup;if(!w)return 99;return Math.hypot(g.player.x-w.position.x,g.player.z-w.position.z);}
 function flicker(duration=1.2){
  E.active=duration;
  E.lamps.forEach(l=>{l.userData.eventBase=l.userData.base;l.userData.eventSeed=Math.random()*10;});
 }
 function setLights(dt){
  E.lamps.forEach(l=>{if(E.active>0){const phase=g.clock.elapsedTime*19+(l.userData.eventSeed||0);const drop=Math.sin(phase)>0.42?(Math.random()<.55?.12:1):0;l.intensity=l.userData.eventBase*drop;}else{l.intensity=l.userData.base;}});
 }
 function event(){
  if(g.state!=='PLAYING')return;
  E.eventCount++;E.active=0;
  const d=nearestDistance(), r=room(), roll=Math.random();
  if(roll<.28){caption('THE LIGHTS ARE LISTENING');flicker(.9+Math.random()*1.2);g.audio&&g.audio.creak&&g.audio.creak();g.fear=Math.min(100,g.fear+1.5);}
  else if(roll<.52){caption('FOOTSTEPS — NOT YOURS');g.audio&&g.audio.footstep&&g.audio.footstep();setTimeout(()=>g.audio&&g.audio.footstep&&g.audio.footstep(),190);g.fear=Math.min(100,g.fear+2);}
  else if(roll<.74){caption(r==='RITUAL'?'THE ROOM FEELS CLOSER':'SOMETHING MOVED');g.audio&&g.audio.creak&&g.audio.creak();g.fear=Math.min(100,g.fear+2.2);}
  else if(roll<.9&&d>7){caption('DON\'T TURN AROUND');g.audio&&g.audio.whisper&&g.audio.whisper();g.fear=Math.min(100,g.fear+2.8);}
  else if(g.majorDirectorReady){caption('THE HOUSE REMEMBERS');g.majorDirector.confidence=Math.min(1,g.majorDirector.confidence+.12);g.majorDirector.lastHeard={x:g.player.x,z:g.player.z};}
 }
 const oldPlayer=g.updatePlayer.bind(g);
 g.updatePlayer=function(dt){oldPlayer(dt);if(this.state!=='PLAYING')return;E.t+=dt;E.next-=dt;E.active=Math.max(0,E.active-dt);setLights(dt);const r=room();if(r!==E.lastRoom){E.lastRoom=r;if(Math.random()<.42){caption('THE HOUSE NOTICED YOU');this.audio&&this.audio.creak&&this.audio.creak();}}
  if(E.next<=0){E.next=10+Math.random()*15;const pressure=(this.campaign&&this.campaign.pressure)||0;const conf=(this.majorDirector&&this.majorDirector.confidence)||0;if(pressure>25||conf>.22||this.fear>35)event();}
  if(this.flashlightOn===false&&this.fear>55&&Math.random()<dt*.025){caption('DARKNESS IS NOT EMPTY');this.audio&&this.audio.whisper&&this.audio.whisper();}
 };
 const oldRestart=g.restart?g.restart.bind(g):null;
 if(oldRestart)g.restart=function(){E.t=0;E.next=5+Math.random()*5;E.active=0;E.lastRoom='';if(oldRestart)oldRestart();};
 g.getHouseEventState=()=>({events:E.eventCount,nextIn:Math.max(0,E.next),room:E.lastRoom});
}
boot();
})();
