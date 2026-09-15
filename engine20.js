/* THE HOUSE IS WATCHING — Engine 20: Encounter Director */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;if(!g||!T||!g.scene||!g.player||!g.entityGroup)return setTimeout(boot,100);if(g.__engine20)return;g.__engine20=true;
 const s={t:0,next:10+Math.random()*8,last:-99,active:false};g.encounterDirector=s;
 const style=document.createElement('style');style.textContent='.cinematic-warning{position:fixed;left:50%;top:32%;transform:translate(-50%,-50%);font:800 16px/1.2 monospace;letter-spacing:5px;color:#eee;text-shadow:0 0 12px #000,0 0 24px #000;opacity:0;pointer-events:none;z-index:38;transition:opacity .12s}.cinematic-warning.on{opacity:.92}.cinematic-letterbox{position:fixed;left:0;right:0;height:0;background:#000;z-index:37;pointer-events:none;transition:height .25s}.cinematic-letterbox.top{top:0}.cinematic-letterbox.bottom{bottom:0}';document.head.appendChild(style);
 const text=document.createElement('div');text.className='cinematic-warning';document.body.appendChild(text);const top=document.createElement('div');top.className='cinematic-letterbox top';const bot=document.createElement('div');bot.className='cinematic-letterbox bottom';document.body.append(top,bot);s.text=text;s.top=top;s.bot=bot;
 function say(v,d){text.textContent=v;text.classList.add('on');clearTimeout(s.say);s.say=setTimeout(()=>text.classList.remove('on'),d||1400);}
 function playerFacing(){const cam=g.camera,dir=new T.Vector3();cam.getWorldDirection(dir);const to=new T.Vector3(g.entityGroup.position.x-g.player.x,0,g.entityGroup.position.z-g.player.z).normalize();return dir.x*to.x+dir.z*to.z;}
 function teleportBehind(r){const a=g.look?g.look.yaw:0;const dist=7.5;const x=g.player.x-Math.sin(a)*dist,z=g.player.z+Math.cos(a)*dist;const b=g.watcherBounds||{minX:-18,maxX:18,minZ:-22,maxZ:22};g.entityGroup.position.set(Math.max(b.minX+1,Math.min(b.maxX-1,x)),0,Math.max(b.minZ+1,Math.min(b.maxZ-1,z)));}
 const oldUpdate=g.updatePlayer.bind(g);
 g.updatePlayer=function(dt){oldUpdate(dt);if(this.state!=='PLAYING')return;s.t+=dt;const e=this.entityGroup;if(!e)return;const d=Math.hypot(this.player.x-e.position.x,this.player.z-e.position.z);if(this.entity&&this.entity.state==='CHASE')s.active=true;else if(d>5)s.active=false;};
 const oldLoop=g.loop.bind(g);
 g.loop=function(){
   if(this.state==='PLAYING'&&s.t>s.next&&this.entity){
     s.next=s.t+14+Math.random()*18;
     const d=Math.hypot(this.player.x-this.entityGroup.position.x,this.player.z-this.entityGroup.position.z);
     const fear=this.fear||0;
     if(d>8&&fear>28&&this.entity.state!=='CHASE'&&this.entity.state!=='HUNTING'){
       const r=Math.random();
       if(r<.34){
         teleportBehind(this);say('BEHIND YOU',900);this.entity.state='STALK';this.entity.speed=2.05;this.audio&&this.audio.whisper&&this.audio.whisper();
       }else if(r<.67){
         const oldYaw=this.camera.rotation.y;this.camera.rotation.y+=Math.PI;setTimeout(()=>{if(this.state==='PLAYING')this.camera.rotation.y=oldYaw;},180);say('DON’T TURN AROUND',850);this.audio&&this.audio.sting&&this.audio.sting();
       }else{
         say('IT KNOWS YOU ARE AFRAID',1100);this.audio&&this.audio.heartbeat&&this.audio.heartbeat(.8);this.fear=Math.min(100,this.fear+5);
       }
       s.last=s.t;
     }
   }
   oldLoop.apply(this,arguments);
 };
}
boot();
})();