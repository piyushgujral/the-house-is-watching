/* THE HOUSE IS WATCHING — Engine 37: Intelligent Watcher Hunt Planner v1
 * Major gameplay chunk: unifies room heat, mutated routes, party separation, hiding and recent
 * behavior into a single pursuit/search planner. Host/solo Watcher selects targets and waypoints
 * from a scored room graph instead of blindly following the nearest player.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.player||!g.coop||!g.partyNetwork)return setTimeout(boot,300);
 if(g.__engine37)return;g.__engine37=true;
 const net=g.partyNetwork.net,S=()=>g.scene.scale&&g.scene.scale.x||1;
 const ROOM={ENTRY:{x:0,z:12},HALL:{x:0,z:2},BEDROOM:{x:-7,z:-2},STUDY:{x:7,z:-2},RITUAL:{x:0,z:-7},BACK:{x:0,z:-12}};
 const EDGES={ENTRY:['HALL'],HALL:['ENTRY','BEDROOM','STUDY'],BEDROOM:['HALL','RITUAL'],STUDY:['HALL','RITUAL'],RITUAL:['BEDROOM','STUDY','BACK'],BACK:['RITUAL']};
 const state={mode:'PATROL',targetId:null,targetRoom:'HALL',goalRoom:'HALL',waypoint:null,lastSeen:null,lastNoise:null,lastDecision:0,decisionCooldown:0,confidence:0,history:[],version:0};
 const hud=document.createElement('div');hud.id='watcher-director-hud';hud.style.cssText='position:fixed;top:158px;left:50%;transform:translateX(-50%);padding:7px 11px;background:rgba(3,3,5,.82);border:1px solid rgba(190,170,150,.22);color:#cfc2b6;font:700 9px/1.35 monospace;letter-spacing:1.15px;z-index:121;pointer-events:none;display:none;text-align:center';hud.innerHTML='<span id="wd-title">WATCHER</span><span id="wd-detail" style="opacity:.7;margin-left:8px"></span>';document.body.appendChild(hud);
 function notify(a,b,ms){hud.style.display='block';hud.querySelector('#wd-title').textContent=a;hud.querySelector('#wd-detail').textContent=b||'';setTimeout(()=>{if(performance.now()-state.lastDecision>=ms)hud.style.display='none'},ms)}
 function world(v){return Number(v)*S()}
 function roomAt(x,z){let best='HALL',bd=Infinity;Object.keys(ROOM).forEach(k=>{const r=ROOM[k],d=Math.hypot(x/S()-r.x,z/S()-r.z);if(d<bd){bd=d;best=k}});return best}
 function members(){const out=[];if(g.player){out.push({id:'local',object:g.player,state:g.state==='PLAYING'?'ALIVE':'DEAD',local:true,name:'YOU'});}for(const m of g.coop.members.values()){if(m.id==='local'||m.state==='DEAD'||!m.object)continue;out.push({id:m.id,object:m.object,state:m.state||'ALIVE',local:false,name:m.name||m.id});}return out}
 function distance(a,b){return Math.hypot(a.x-b.x,a.z-b.z)/S()}
 function hidden(m){return !!(m.object&&m.object.userData&&m.object.userData.isHiding)}
 function layoutCost(a,b){const layout=g.dynamicHouseLayout&&g.dynamicHouseLayout.state;if(!layout||!layout.mutation)return 0;const ev=layout.mutation,blocked=ev.blocked;if(ev.kind!=='CLOSE_ROUTE'&&ev.kind!=='FUNNEL')return 0;const r=(g.dynamicHouseLayout.routes||[]).find(x=>x.id===blocked);if(!r)return 0;const pa=ROOM[a],pb=ROOM[b];const ar=Math.hypot(pa.x-r.x,pa.z-r.z),br=Math.hypot(pb.x-r.x,pb.z-r.z);return ar<4&&br<4?2.2:0}
 function roomHeat(k){const ri=g.reactiveInterior&&g.reactiveInterior.state&&g.reactiveInterior.state.rooms&&g.reactiveInterior.state.rooms[k];const hm=g.houseMemoryDirector&&g.houseMemoryDirector.state&&g.houseMemoryDirector.state.rooms&&g.houseMemoryDirector.state.rooms[k];return Math.min(1,Number(ri&&ri.heat||0)*.6+Number(hm&&hm.pressure||0)*.4)}
 function shortest(from,to){if(from===to)return [from];const q=[from],prev={};prev[from]=null;while(q.length){const n=q.shift();for(const x of (EDGES[n]||[])){if(prev[x]!==undefined)continue;prev[x]=n;if(x===to){const p=[];let c=x;while(c){p.unshift(c);c=prev[c];}return p;}q.push(x);}}return [from,to]}
 function scoreTarget(m){
  const p=m.object.position,r=roomAt(p.x,p.z),d=distance(g.entityGroup||g.entity||g.player,m.object);
  const heat=roomHeat(r),sep=members().filter(x=>x.id!==m.id).reduce((v,x)=>Math.max(v,distance(m.object.position,x.object.position)),0);
  const down=m.state==='DOWNED'?1:0,hide=hidden(m)?-.55:0,noise=m.object.userData&&Number(m.object.userData.lastNoise||0);const recent=state.history.filter(x=>x===m.id).length;
  return 8/(1+d*.32)+heat*2.8+Math.min(2,sep*.12)+down*4+noise+hide-recent*.35;
 }
 function chooseTarget(){let best=null,score=-Infinity;for(const m of members()){if(m.state==='DEAD')continue;const s=scoreTarget(m);if(s>score){score=s;best=m;}}return{member:best,score};}
 function pickGoal(target){
  const tr=roomAt(target.object.position.x,target.object.position.z),er=roomAt((g.entityGroup||g.entity).position.x,(g.entityGroup||g.entity).position.z);
  if(hidden(target)){state.mode='SEARCH';state.targetRoom=tr;const path=shortest(er,tr);return path[Math.min(1,path.length-1)]||tr;}
  const split=members().filter(m=>m.id!==target.id).some(m=>distance(target.object.position,m.object.position)>9);
  if(split&&roomHeat(tr)<.65){const alternatives=Object.keys(ROOM).filter(k=>k!==tr&&EDGES[tr].includes(k));if(alternatives.length){alternatives.sort((a,b)=>roomHeat(b)-roomHeat(a));if(roomHeat(alternatives[0])>roomHeat(tr)+.12){state.mode='AMBUSH';return alternatives[0];}}}
  state.mode=distance((g.entityGroup||g.entity).position,target.object.position)<5?'HUNT':'INTERCEPT';
  const path=shortest(er,tr);return path[Math.min(1,path.length-1)]||tr;
 }
 function waypointFor(room,target){const r=ROOM[room],jitter=target?Math.min(1.5,distance((g.entityGroup||g.entity).position,target.object.position)*.04):.6;return{x:world(r.x+(Math.random()-.5)*jitter),y:(g.entityGroup||g.entity).position.y,z:world(r.z+(Math.random()-.5)*jitter)}}
 function hasLOS(a,b){const from=new T.Vector3(a.x,a.y+1.2*S(),a.z),to=new T.Vector3(b.x,b.y+1*S(),b.z),dir=to.clone().sub(from),len=dir.length();if(!len)return true;dir.normalize();const ray=new T.Raycaster(from,dir,0,Math.max(0,len-.2*S()));const hits=ray.intersectObjects(g.scene.children,true);return !hits.some(h=>h.object&&h.object.visible&&h.object!==g.entityGroup&&h.object!==g.entity&&h.object.userData&&h.object.userData.houseObstacle)}
 function decide(){
  const ent=g.entityGroup||g.entity;if(!ent)return;
  const pick=chooseTarget();if(!pick.member){state.mode='PATROL';state.goalRoom='HALL';state.waypoint=waypointFor('HALL');return;}
  const target=pick.member,state.confidence=Math.max(0,Math.min(1,pick.score/10));state.targetId=target.id;state.targetRoom=roomAt(target.object.position.x,target.object.position.z);state.goalRoom=pickGoal(target);state.waypoint=waypointFor(state.goalRoom,target);state.history.push(target.id);if(state.history.length>10)state.history.shift();state.lastDecision=performance.now();state.version++;
  const los=hasLOS(ent.position,target.object.position);if(los&&!hidden(target)){state.lastSeen={x:target.object.position.x,y:target.object.position.y,z:target.object.position.z,time:performance.now(),room:state.targetRoom};state.mode='HUNT';}
  else if(hidden(target)){state.mode='SEARCH';notify('THE WATCHER IS SEARCHING',state.targetRoom+' IS NOT SAFE',2800);}
  else if(state.mode==='AMBUSH'){notify('IT CHANGED COURSE',state.goalRoom+' IS IN ITS PATH',2500);}
 }
 function steer(dt){
  const ent=g.entityGroup||g.entity;if(!ent||!state.waypoint)return;
  if(net&&net.connected&&net.role!=='host')return;
  const dx=state.waypoint.x-ent.position.x,dz=state.waypoint.z-ent.position.z,d=Math.hypot(dx,dz);if(d<.7*S()){const target=members().find(m=>m.id===state.targetId);if(target){state.goalRoom=pickGoal(target);state.waypoint=waypointFor(state.goalRoom,target);}else{state.waypoint=waypointFor(Object.keys(ROOM)[Math.floor(Math.random()*Object.keys(ROOM).length)]); }return;}
  const speed=state.mode==='AMBUSH'?2.7:state.mode==='SEARCH'?2.35:state.mode==='HUNT'?3.15:1.45;ent.position.x+=dx/d*speed*S()*dt;ent.position.z+=dz/d*speed*S()*dt;
  const ang=Math.atan2(dx,dz);ent.rotation.y+=(ang-ent.rotation.y)*Math.min(1,dt*5);
 }
 const oldUpdate=g.updateEntity.bind(g);
 g.updateEntity=function(dt){
  oldUpdate(dt);if(this.state!=='PLAYING')return;
  const authoritative=!net||!net.connected||net.role==='host';if(!authoritative)return;
  if(performance.now()-state.lastDecision>1200)decide();
  steer(dt);
  const target=members().find(m=>m.id===state.targetId);if(target&&target.state==='DOWNED'&&distance((g.entityGroup||g.entity).position,target.object.position)<1.3){if(g.coop.down)g.coop.down(target.id);}
 };
 setInterval(()=>{if(g.state==='PLAYING'&&state.mode==='SEARCH'&&state.lastSeen&&performance.now()-state.lastSeen.time>9000){state.lastSeen=null;state.mode='PATROL';state.goalRoom='HALL';state.waypoint=waypointFor('HALL');}},1800);
 g.watcherHuntPlanner={state,rooms:ROOM,edges:EDGES,chooseTarget,decide};
}
boot();
})();
