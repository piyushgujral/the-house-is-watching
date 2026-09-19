/* THE HOUSE IS WATCHING — Engine 33: Adaptive House Encounter Director v1
 * Major horror/gameplay chunk: learns party separation and recent behavior, then
 * creates synchronized route pressure, light failures, false objectives and
 * Watcher ambush windows. Host-authoritative so all co-op clients experience the
 * same house decisions while solo play remains compatible.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.player||!g.partyNetwork||!g.coop)return setTimeout(boot,240);
 if(g.__engine33)return;g.__engine33=true;
 const net=g.partyNetwork.net;
 const S=()=>g.scene.scale&&g.scene.scale.x||1;
 const D={heat:0,split:0,running:0,repeated:0,lastRoom:'',lastEvent:0,eventSeq:0,eventCooldown:0,active:null,history:[]};
 const originalObjective=()=>document.getElementById('objective-text');
 const originalFlash=g.flashlight;
 const ui=document.createElement('div');
 ui.id='adaptive-house-hud';
 ui.style.cssText='position:fixed;left:50%;bottom:104px;transform:translateX(-50%);max-width:calc(100vw - 30px);padding:9px 14px;background:rgba(3,3,5,.84);border:1px solid rgba(190,175,155,.25);font:700 10px/1.4 monospace;letter-spacing:1px;color:#ddd1c4;text-align:center;z-index:122;pointer-events:none;display:none';
 ui.innerHTML='<div id="ah-title">THE HOUSE</div><div id="ah-detail" style="opacity:.72;margin-top:2px"></div>';
 document.body.appendChild(ui);
 function notify(title,detail,ms){ui.style.display='block';ui.querySelector('#ah-title').textContent=title;ui.querySelector('#ah-detail').textContent=detail||'';if(ms)setTimeout(()=>{if(performance.now()-D.lastEvent>ms)ui.style.display='none'},ms);}
 function send(type,data){if(net&&net.connected&&net.send)net.send({type,id:net.peerId,seq:Date.now()+D.eventSeq,data});}
 function members(){return Array.from(g.coop.members.values()).filter(m=>m.state!=='DEAD');}
 function pof(m){return m&&m.id==='local'?g.player:(m&&m.object&&m.object.visible?m.object.position:null);}
 function dist(a,b){return a&&b?Math.hypot(a.x-b.x,a.z-b.z)/S():999;}
 function currentRoom(){return g.livingHouse&&g.livingHouse.currentRoom||g.roomDirector&&g.roomDirector.currentRoom||'';}
 function calculateHeat(dt){
  const ms=members(),w=g.entityGroup&&g.entityGroup.position;
  if(ms.length>1){let far=0;for(let i=0;i<ms.length;i++)for(let j=i+1;j<ms.length;j++)far=Math.max(far,dist(pof(ms[i]),pof(ms[j])));D.split=Math.min(1,far/13);}
  const running=g.sprinting||g.isRunning||g.player&&g.player.userData&&g.player.userData.running;
  D.running=Math.min(1,D.running+(running?dt*.12:-dt*.035));
  const repeated=g.recentRooms&&Array.isArray(g.recentRooms)?g.recentRooms.length:0;
  D.repeated=Math.min(1,repeated/6);
  const fear=Math.min(1,Number(g.fear||0)/100);
  D.heat=Math.min(1,.28*D.split+.22*D.running+.16*D.repeated+.34*fear+.12*(w?Math.max(0,1-dist(g.player,w)/12):0));
 }
 function eventAllowed(){return net&&net.connected&&net.role==='host'&&performance.now()-D.lastEvent>9000&&D.eventCooldown<=0;}
 function choose(){
  const ms=members();if(!ms.length||D.heat<.43)return null;
  const isolated=ms.reduce((a,b)=>dist(pof(b),g.entityGroup&&g.entityGroup.position)>dist(pof(a),g.entityGroup&&g.entityGroup.position)?b:a,ms[0]);
  const p=pof(isolated)||g.player;
  const stage=Number(g.campaign&&g.campaign.stage||0);
  const r=Math.random();
  if(D.split>.72&&r<.3)return{kind:'ROUTE_WARNING',target:isolated.id,x:p.x,z:p.z,text:'THE HOUSE SEALED A ROUTE BEHIND YOU'};
  if(D.heat>.72&&r<.58)return{kind:'LIGHT_FAILURE',target:isolated.id,text:'THE LIGHTS HAVE NOT FORGOTTEN YOU'};
  if(stage>=4&&r<.82)return{kind:'FALSE_OBJECTIVE',target:isolated.id,text:'THE HOUSE SHOWED YOU A WAY OUT'};
  return{kind:'WATCHER_AMBUSH',target:isolated.id,x:p.x,z:p.z,text:'IT LEARNED WHERE YOU RUN'};
 }
 function objectiveText(text,restore){const el=originalObjective();if(!el)return;const old=el.textContent;el.textContent=text;setTimeout(()=>{if(el.textContent===text)el.textContent=restore||old},4200);}
 function lightFailure(ms){
  const fl=g.flashlight||originalFlash;if(!fl)return;
  const was=fl.intensity;fl.intensity=Math.min(was,.18);setTimeout(()=>{if(fl)fl.intensity=was},ms||2200);
  document.body.style.filter='brightness(.62)';setTimeout(()=>{document.body.style.filter=''},ms||2200);
 }
 function routePressure(){
  const barriers=g.houseBarriers||g.livingHouse&&g.livingHouse.barriers;
  if(barriers&&typeof barriers.trigger==='function'){try{barriers.trigger()}catch(e){}}
  const doors=g.doors||g.houseDoors;
  if(doors&&typeof doors.reactiveClose==='function'){try{doors.reactiveClose()}catch(e){}}
 }
 function ambush(){
  if(!g.entityGroup)return;
  const w=g.entityGroup.position,p=g.player,dx=p.x-w.x,dz=p.z-w.z,len=Math.hypot(dx,dz)||1;
  const nx=p.x+dx/len*5*S(),nz=p.z+dz/len*5*S();
  if(Number(g.phase||0)>=6){g.entityGroup.position.set(nx,g.entityGroup.position.y,nz);}
  if(g.fear!=null)g.fear=Math.min(100,Number(g.fear)+9);
  if(g.entity)g.entity.state='HUNTING';
 }
 function execute(ev,remote){
  if(!ev)return;D.lastEvent=performance.now();D.eventSeq++;D.active=ev;D.history.push(ev.kind);if(D.history.length>8)D.history.shift();
  if(ev.kind==='ROUTE_WARNING'){routePressure();objectiveText(ev.text);notify('HOUSE MEMORY',ev.text,3600);if(g.fear!=null)g.fear=Math.min(100,Number(g.fear)+5);}
  else if(ev.kind==='LIGHT_FAILURE'){lightFailure(2500);notify('LIGHT FAILURE',ev.text,3000);if(g.fear!=null)g.fear=Math.min(100,Number(g.fear)+7);}
  else if(ev.kind==='FALSE_OBJECTIVE'){objectiveText(ev.text);notify('FALSE MEMORY',ev.text,3800);if(g.fear!=null)g.fear=Math.min(100,Number(g.fear)+6);}
  else if(ev.kind==='WATCHER_AMBUSH'){if(!remote)ambush();notify('THE WATCHER LEARNED',ev.text,3600);if(g.fear!=null)g.fear=Math.min(100,Number(g.fear)+8);}
 }
 const oldApply=g.partyNetwork.apply;
 g.partyNetwork.apply=function(packet){
  if(packet&&packet.type==='HOUSE_ADAPTIVE_EVENT'&&packet.id!==net.peerId)execute(packet.data,true);
  if(oldApply)oldApply(packet);
 };
 const oldUpdate=g.updatePlayer.bind(g);
 g.updatePlayer=function(dt){
  oldUpdate(dt);if(this.state!=='PLAYING')return;
  calculateHeat(dt);
  D.eventCooldown=Math.max(0,D.eventCooldown-dt);
  const r=currentRoom();if(r&&r!==D.lastRoom){D.lastRoom=r;D.repeated=Math.min(1,D.repeated+.08);}
  if(eventAllowed()){
   const ev=choose();
   if(ev){execute(ev,false);send('HOUSE_ADAPTIVE_EVENT',ev);D.eventCooldown=8;}
  }
 };
 const oldEntity=g.updateEntity.bind(g);
 g.updateEntity=function(dt){
  oldEntity(dt);
  if(!g.entity||!g.entityGroup)return;
  if(D.heat>.78&&D.split>.62&&Number(g.phase||0)>=4&&g.entity.state==='STALK')g.entity.state='HUNTING';
 };
 g.adaptiveHouseDirector={state:D,choose,execute,calculateHeat};
}
boot();
})();
