/* THE HOUSE IS WATCHING — Engine 55: Searchable Props & Environmental Clues v1
 * Adds small, readable exploration rewards without replacing the campaign's core items.
 * Searchable drawers/cabinets reveal one-time clues, and their drawers animate locally.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE,env=g&&g.houseEnvironmentDirector;
 if(!g||!T||!g.scene||!g.player||!env)return setTimeout(boot,500);
 if(g.__engine55)return;g.__engine55=true;
 const S=()=>g.scene.scale&&g.scene.scale.x||1,sc=S(),now=()=>performance.now();
 const state={version:1,found:[],searches:0,cluesRead:0,nearby:null,lastUse:0,notes:[]};
 const wood=new T.MeshStandardMaterial({color:0x241713,roughness:.95});
 const dark=new T.MeshStandardMaterial({color:0x100d0c,roughness:1});
 const brass=new T.MeshStandardMaterial({color:0x77603c,metalness:.45,roughness:.55});
 const paper=new T.MeshStandardMaterial({color:0x8b7b61,roughness:1});
 const props=[];
 function meshBox(parent,name,x,y,z,w,h,d,material){
  const m=new T.Mesh(new T.BoxGeometry(w*sc,h*sc,d*sc),material);m.name=name;
  m.position.set(x*sc,y*sc,z*sc);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
 }
 function searchable(id,label,room,x,z,clue){
  const root=new T.Group();root.name='searchable_'+id;root.position.set(x*sc,0,z*sc);g.scene.add(root);
  const body=meshBox(root,id+'_cabinet',0,.55,0,1.15,1.1,.65,wood);
  meshBox(root,id+'_top',0,1.12,0,1.28,.12,.72,dark);
  const drawer=meshBox(root,id+'_drawer',0,.72,.36,.82,.28,.12,dark);
  const knob=meshBox(root,id+'_handle',0,.72,.44,.16,.06,.06,brass);
  const note=meshBox(root,id+'_note',0,.88,.22,.36,.03,.22,paper);note.visible=false;
  props.push({id,label,room,x,z,clue,root,drawer,knob,note,open:0,target:0,found:false});
 }
 searchable('entry_drawer','ENTRY CONSOLE DRAWER','ENTRY',-4,9.1,
  'THE HOUSE REMEMBERS THE FIRST FOOTSTEP. QUIET MOVEMENT DELAYS ITS ATTENTION.');
 searchable('study_cabinet','STUDY CABINET','STUDY',9,-5.2,
  'THE MASTER KEY WAS NEVER A KEY TO THE FRONT DOOR. IT OPENS THE WAY BELOW.');
 searchable('bedside_drawer','BEDSIDE DRAWER','BEDROOM',-9.25,-4.4,
  'IF THE FOOTSTEPS STOP, DO NOT ASSUME THE HALLWAY IS EMPTY.');
 searchable('back_crate','BACK ROOM CRATE','BACK',-3,-15,
  'THREE SEALS. THREE ROOMS. THE LAST SOUND YOU HEAR MAY BE YOUR OWN.');
 function roomOfPlayer(){
  const x=(Number(g.player.x)||0)/sc,z=(Number(g.player.z)||0)/sc;
  if(z>7)return'ENTRY';if(z>0)return'HALL';if(z>-7)return x<0?'BEDROOM':'STUDY';if(z>-13)return'RITUAL';return'BACK';
 }
 function playerPos(){return{x:(Number(g.player.x)||0)/sc,z:(Number(g.player.z)||0)/sc};}
 function nearest(){
  const p=playerPos();let best=null,dist=1.85;
  props.forEach(o=>{const d=Math.hypot(p.x-o.x,p.z-o.z);if(d<dist){dist=d;best=o;}});
  return best?{prop:best,distance:dist}:null;
 }
 function ui(){
  let el=document.getElementById('house-search-prompt');
  if(!el){el=document.createElement('div');el.id='house-search-prompt';el.style.cssText='position:fixed;left:50%;bottom:25%;transform:translateX(-50%);z-index:146;max-width:88vw;padding:9px 13px;background:rgba(5,4,5,.94);border:1px solid rgba(174,150,121,.5);color:#e8ded5;font:700 10px/1.5 monospace;letter-spacing:1px;text-align:center;white-space:pre-line;pointer-events:none;display:none';document.body.appendChild(el);}return el;
 }
 function say(text){
  const el=ui();el.textContent=text;el.style.display='block';
  clearTimeout(say.timer);say.timer=setTimeout(()=>{if(!state.nearby)el.style.display='none';},2600);
  if(g.flashPrompt)g.flashPrompt(text);
 }
 function interact(){
  const o=state.nearby;if(!o||g.state!=='PLAYING'||now()-state.lastUse<300)return false;
  state.lastUse=now();
  if(o.found){say('THE DRAWER IS EMPTY. THE MESSAGE WILL NOT CHANGE.');return true;}
  o.target=o.target>.5?0:1;state.searches++;
  if(!o.found){
   o.found=true;o.note.visible=true;state.found.push(o.id);state.cluesRead++;state.notes.push({id:o.id,text:o.clue,time:now()});
   if(g.campaign){g.campaign.pressure=Math.max(0,(Number(g.campaign.pressure)||0)-2.5);}
   say('FOUND: '+o.clue);
   if(g.audio&&g.audio.creak)g.audio.creak();
  }
  return true;
 }
 function refresh(){
  const el=ui();
  if(g.state!=='PLAYING'){state.nearby=null;el.style.display='none';return;}
  const n=nearest();state.nearby=n&&n.prop;
  if(!n){el.style.display='none';return;}
  el.textContent='[E / USE] '+(n.prop.found?'EXAMINE '+n.prop.label+' — EMPTY':'SEARCH '+n.prop.label);
  el.style.display='block';
 }
 window.addEventListener('keydown',e=>{
  if(e.repeat||e.code!=='KeyE'||g.state!=='PLAYING'||!state.nearby)return;
  e.preventDefault();e.stopImmediatePropagation();interact();
 },{capture:true});
 const btn=document.getElementById('btn-mobile-interact');
 if(btn)btn.addEventListener('click',e=>{
  if(!state.nearby)return;e.preventDefault();e.stopImmediatePropagation();interact();
 },{capture:true});
 function animate(){
  if(g.state==='PLAYING'){
   props.forEach(o=>{
    o.open+=(o.target-o.open)*.22;
    o.drawer.position.z=(.36+o.open*.42)*sc;
    o.knob.position.z=(.44+o.open*.42)*sc;
    o.note.position.z=(.22+o.open*.28)*sc;
   });
  }
  requestAnimationFrame(animate);
 }
 setInterval(refresh,120);requestAnimationFrame(animate);
 g.houseSearchDirector={state,props,interact,refresh,roomOfPlayer};
}
boot();
})();