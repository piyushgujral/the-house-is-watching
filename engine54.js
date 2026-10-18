/* THE HOUSE IS WATCHING — Engine 54: Interactive Door & Threshold Director v1
 * Gives Engine 53's architectural doors a player-facing interaction contract.
 * E / tap interaction opens and closes nearby doors, locked thresholds read campaign
 * progression, and door state is optionally replicated by the party host.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame;
 if(!g||!g.scene||!g.player||!g.houseEnvironmentDirector)return setTimeout(boot,500);
 if(g.__engine54)return;g.__engine54=true;
 const env=g.houseEnvironmentDirector,doors=env.doors||{},campaign=g.campaign||{},net=g.partyNetwork&&g.partyNetwork.net;
 const state={version:1,nearby:null,lastInteract:0,interactions:0,lockedAttempts:0,lastPrompt:0,remoteVersion:0};
 const now=()=>performance.now();
 const playerPos=()=>({x:Number(g.player.x)||0,z:Number(g.player.z)||0});
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 function worldDoorPos(d){
  const p=d.group&&d.group.position;
  if(p)return{x:p.x,z:p.z};
  return{x:0,z:0};
 }
 function requiredKey(name){
  const C=g.campaign||campaign,flags=C.flags||{};
  if(name==='HALL_RITUAL')return !!(flags.key||Number(C.stage)>=3);
  if(name==='RITUAL_BACK')return Number(flags.seals||0)>=3||!!C.completed||Number(C.stage)>=5;
  return true;
 }
 function doorLabel(name,d){
  if(!requiredKey(name))return name==='HALL_RITUAL'?'LOCKED — MASTER KEY REQUIRED':'SEALED — BREAK ALL THREE SEALS';
  return d.open>.55?'CLOSE DOOR':'OPEN DOOR';
 }
 function prompt(text){
  if(now()-state.lastPrompt<650)return;
  state.lastPrompt=now();
  if(typeof g.flashPrompt==='function')g.flashPrompt(text);
  let hud=document.getElementById('house-door-prompt');
  if(!hud){
   hud=document.createElement('div');hud.id='house-door-prompt';
   hud.style.cssText='position:fixed;left:50%;bottom:19%;transform:translateX(-50%);z-index:145;padding:10px 13px;background:rgba(5,4,5,.94);border:1px solid rgba(190,165,140,.55);color:#e8ded5;font:700 11px/1.5 monospace;letter-spacing:1px;text-align:center;pointer-events:none;display:none;max-width:90vw;white-space:pre-line';
   document.body.appendChild(hud);
  }
  hud.textContent=text;hud.style.display='block';
 }
 function refreshPrompt(){
  let hud=document.getElementById('house-door-prompt');
  if(g.state!=='PLAYING'){if(hud)hud.style.display='none';state.nearby=null;return;}
  const p=playerPos();let best=null,bestD=2.35;
  Object.entries(doors).forEach(([name,d])=>{
   const q=worldDoorPos(d),dist=distance(p,q);
   if(dist<bestD){best={name,d,dist};bestD=dist;}
  });
  state.nearby=best;
  if(best){
   const label=doorLabel(best.name,best.d);
   if(hud){hud.textContent='[E / USE] '+label;hud.style.display='block';}
   else prompt('[E / USE] '+label);
  }else if(hud)hud.style.display='none';
 }
 function sendState(name,d){
  if(net&&net.connected&&net.role==='host'&&net.send){
   try{net.send({type:'house_door_state',version:++state.version,name,open:d.target>.5,reason:'PLAYER'});}catch(e){}
  }
 }
 function interact(){
  const item=state.nearby;
  if(!item||g.state!=='PLAYING'||now()-state.lastInteract<350)return false;
  state.lastInteract=now();
  const {name,d}=item;
  if(!requiredKey(name)){
   state.lockedAttempts++;
   const text=name==='HALL_RITUAL'?'THE MASTER KEY IS NEEDED.':'THREE SEALS MUST BREAK BEFORE THIS WAY OPENS.';
   prompt(text);
   if(g.audio&&g.audio.creak)g.audio.creak();
   return true;
  }
  const opening=!(d.target>.5);
  d.target=opening?1:0;d.reason='PLAYER';d.lastPlayerInteraction=now();state.interactions++;
  if(opening&&g.audio&&g.audio.creak)g.audio.creak();
  if(net&&net.connected&&net.role==='host')sendState(name,d);
  prompt((opening?'DOOR OPENING':'DOOR CLOSING')+' — '+name.replace(/_/g,' '));
  return true;
 }
 window.addEventListener('keydown',e=>{
  if(e.repeat||e.code!=='KeyE'||g.state!=='PLAYING')return;
  if(state.nearby){e.preventDefault();interact();}
 },{passive:false});
 const interactBtn=document.getElementById('btn-mobile-interact');
 if(interactBtn){
  interactBtn.addEventListener('click',e=>{if(state.nearby){e.preventDefault();interact();}},true);
 }
 if(net&&net.on){
  net.on('house_door_state',m=>{
   if(!m||typeof m.name!=='string'||!doors[m.name]||Number(m.version)<=state.remoteVersion)return;
   state.remoteVersion=Number(m.version)||state.remoteVersion+1;
   doors[m.name].target=m.open?1:0;doors[m.name].reason='NETWORK';
  });
 }
 // Keep doors under the existing environment animator; do not replace its update loop.
 setInterval(refreshPrompt,120);
 g.houseDoorInteractionDirector={state,interact,requiredKey,refreshPrompt};
}
boot();
})();