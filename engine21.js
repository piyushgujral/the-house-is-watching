/* THE HOUSE IS WATCHING — Engine 21: Adaptive House Memory
 * Turns repeated player behavior into gameplay consequences.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame;if(!g||!g.player||!g.scene)return setTimeout(boot,100);if(g.__engine21)return;g.__engine21=true;
 const s={lastX:g.player.x,lastZ:g.player.z,t:0,next:2,route:[],lastCell:'',visits:{},notice:0};g.adaptiveMemory=s;
 const style=document.createElement('style');style.textContent='.memory-warning{position:fixed;left:50%;bottom:23%;transform:translateX(-50%);font:700 13px/1.2 monospace;letter-spacing:3px;color:#ddd;text-shadow:0 0 9px #000;opacity:0;pointer-events:none;z-index:39;transition:opacity .2s}.memory-warning.on{opacity:.9}';document.head.appendChild(style);
 const msg=document.createElement('div');msg.className='memory-warning';document.body.appendChild(msg);s.msg=msg;
 function warn(t){msg.textContent=t;msg.classList.add('on');clearTimeout(s.to);s.to=setTimeout(()=>msg.classList.remove('on'),1200);}
 function cell(){return Math.round(g.player.x/3)+'|'+Math.round(g.player.z/3);}
 function dist(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
 const oldPlayer=g.updatePlayer.bind(g);
 g.updatePlayer=function(dt){oldPlayer(dt);if(this.state!=='PLAYING')return;s.t+=dt;if(s.t<s.next)return;s.next=s.t+.45;const c=cell();if(c!==s.lastCell){s.route.push(c);if(s.route.length>18)s.route.shift();s.visits[c]=(s.visits[c]||0)+1;s.lastCell=c;
   // Repeated routes are now remembered by the house.
   if(s.visits[c]>=3&&this.entity&&this.entity.state!=='CHASE'&&this.entity.state!=='HUNTING'&&Math.random()<.18){
     const angle=Math.atan2(this.player.z-this.entityGroup.position.z,this.player.x-this.entityGroup.position.x)+Math.PI;
     const x=this.player.x+Math.cos(angle)*5.5,z=this.player.z+Math.sin(angle)*5.5;
     this.entityGroup.position.x=x;this.entityGroup.position.z=z;this.entity.state='STALK';this.entity.seen=0;this.fear=Math.min(100,this.fear+4);warn('THE HOUSE REMEMBERED YOUR ROUTE');
     if(this.audio&&this.audio.whisper)this.audio.whisper();
   }
 }};
 const oldLoop=g.loop.bind(g);
 g.loop=function(){
   if(this.state==='PLAYING'&&this.entity&&s.t>4){
     const e=this.entityGroup,d=dist(this.player,e);const recent=s.route.slice(-6);let repeat=0;
     if(recent.length>=4){const tail=recent.slice(-3).join(',');for(let i=0;i<recent.length-3;i++)if(recent.slice(i,i+3).join(',')===tail)repeat++;}
     if(repeat>0&&d>6&&this.entity.state==='OBSERVE'&&Math.random()<.003){this.entity.state='STALK';this.entity.seen=0;warn('IT IS WAITING AHEAD');}
   }
   oldLoop.apply(this,arguments);
 };
}
boot();
})();