/* THE HOUSE IS WATCHING — Engine 19: Living House Atmosphere */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;if(!g||!T||!g.scene||!g.player)return setTimeout(boot,100);if(g.__engine19)return;g.__engine19=true;
 const s={t:0,next:7+Math.random()*6,lastRoom:'',shake:0};g.livingHouse=s;
 const style=document.createElement('style');style.textContent='.house-warning{position:fixed;left:50%;top:21%;transform:translateX(-50%);font:700 14px/1.2 monospace;letter-spacing:4px;color:#ddd;opacity:0;pointer-events:none;text-shadow:0 0 8px #000;z-index:36;transition:opacity .18s}.house-warning.on{opacity:.85}';document.head.appendChild(style);const msg=document.createElement('div');msg.className='house-warning';document.body.appendChild(msg);s.msg=msg;
 function warn(text,dur){msg.textContent=text;msg.classList.add('on');clearTimeout(s.to);s.to=setTimeout(()=>msg.classList.remove('on'),dur||1300);}
 function nearestRoom(){const x=g.player.x,z=g.player.z; if(z>7)return 'ENTRY';if(z>0)return 'HALL';if(z>-7)return x<0?'BEDROOM':'STUDY';if(z>-13)return 'RITUAL';return 'BACK';}
 const oldPlayer=g.updatePlayer.bind(g);
 g.updatePlayer=function(dt){oldPlayer(dt);if(this.state!=='PLAYING')return;s.t+=dt;const room=nearestRoom();if(room!==s.lastRoom){if(s.lastRoom&&Math.random()<.65){warn('THE HOUSE NOTICED YOU',900);if(this.audio&&this.audio.creak)this.audio.creak();this.fear=Math.min(100,this.fear+1.5);}s.lastRoom=room;}
   // Camera micro-movement near danger makes the environment feel physical.
   const ent=this.entityGroup;if(ent){const d=Math.hypot(this.player.x-ent.position.x,this.player.z-ent.position.z);s.shake=d<4&&this.entity&&(this.entity.state==='CHASE'||this.entity.state==='HUNTING')?Math.min(.035,(4-d)*.012):Math.max(0,s.shake-dt*.2);if(s.shake>0){this.camera.position.x+=Math.sin(s.t*31)*s.shake;this.camera.position.y+=Math.cos(s.t*37)*s.shake*.6;}}
 };
 const oldLoop=g.loop.bind(g);
 g.loop=function(){if(this.state==='PLAYING'&&s.t>s.next){s.next=s.t+9+Math.random()*12;const d=this.entityGroup?Math.hypot(this.player.x-this.entityGroup.position.x,this.player.z-this.entityGroup.position.z):99;if(d>5){const r=Math.random();if(r<.4){warn('FOOTSTEPS BEHIND YOU',1100);this.audio&&this.audio.footstep&&this.audio.footstep();setTimeout(()=>this.audio&&this.audio.footstep&&this.audio.footstep(),160);}else if(r<.72){warn('SOMETHING MOVED',950);this.audio&&this.audio.creak&&this.audio.creak();}else{warn('DO NOT LOOK BACK',1100);this.audio&&this.audio.whisper&&this.audio.whisper();}this.fear=Math.min(100,this.fear+1.2);}}
   oldLoop.apply(this,arguments);
 };
}
boot();
})();