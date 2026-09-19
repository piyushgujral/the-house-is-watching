/* THE HOUSE IS WATCHING — Engine 35: Dynamic House Layout Director v1
 * Major gameplay chunk: accumulated house memory now mutates traversal. Host chooses route mutations,
 * co-op clients receive the same layout state, doorways can become blocked, false-safe routes appear,
 * and the Watcher is encouraged toward the route the house wants the party to take.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.player||!g.partyNetwork||!g.houseMemoryDirector)return setTimeout(boot,260);
 if(g.__engine35)return;g.__engine35=true;
 const net=g.partyNetwork.net,S=()=>g.scene.scale&&g.scene.scale.x||1;
 const ROUTES=[
  {id:'HALL_STUDY',x:3.95,z:1.5,label:'STUDY PASSAGE'},
  {id:'HALL_BEDROOM',x:-3.95,z:1.5,label:'BEDROOM PASSAGE'},
  {id:'LOWER_STUDY',x:3.95,z:-5,label:'LOWER STUDY PASSAGE'},
  {id:'LOWER_BEDROOM',x:-3.95,z:-5,label:'LOWER BEDROOM PASSAGE'}
 ];
 const state={mutation:null,version:0,lastChange:0,cooldown:0,history:[],falseRoute:null};
 const root=new T.Group();root.name='DynamicHouseLayout';g.scene.add(root);
 const visuals=new Map();
 const hud=document.createElement('div');hud.id='layout-director-hud';hud.style.cssText='position:fixed;top:124px;left:50%;transform:translateX(-50%);padding:8px 13px;background:rgba(3,3,5,.84);border:1px solid rgba(190,170,150,.28);color:#ddd0c3;font:700 10px/1.35 monospace;letter-spacing:1.2px;z-index:122;pointer-events:none;display:none;text-align:center';hud.innerHTML='<span id="ld-title">HOUSE LAYOUT</span><span id="ld-detail" style="opacity:.72;margin-left:8px"></span>';document.body.appendChild(hud);
 function notify(a,b,ms){hud.style.display='block';hud.querySelector('#ld-title').textContent=a;hud.querySelector('#ld-detail').textContent=b||'';setTimeout(()=>{if(performance.now()-state.lastChange>=ms)hud.style.display='none'},ms);}
 function normX(v){return Number(v)*S();}
 function routeById(id){return ROUTES.find(r=>r.id===id)||ROUTES[0];}
 function routeDistance(p,r){return Math.hypot(p.x/S()-r.x,p.z/S()-r.z);}
 function makeDoorVisual(r){
  const group=new T.Group();group.position.set(normX(r.x),1.45*S(),normX(r.z));
  const frame=new T.Mesh(new T.BoxGeometry(.32*S(),2.8*S(),.24*S()),new T.MeshStandardMaterial({color:0x17100d,roughness:.9}));
  const lintel=frame.clone();lintel.scale.set(4.1,1,1);lintel.position.y=1.28*S();group.add(frame,lintel);
  const seal=new T.Mesh(new T.BoxGeometry(1.05*S(),2.1*S(),.12*S()),new T.MeshStandardMaterial({color:0x120d0d,transparent:true,opacity:0}));seal.position.z=.08*S();group.add(seal);
  const text=document.createElement('div');text.style.cssText='position:fixed;display:none;padding:4px 7px;background:rgba(8,5,5,.88);border:1px solid rgba(160,120,100,.28);color:#cbb8a9;font:700 9px monospace;letter-spacing:1px;pointer-events:none;z-index:120';text.textContent='ROUTE SEALED';document.body.appendChild(text);
  root.add(group);visuals.set(r.id,{group,seal,text,route:r});
 }
 ROUTES.forEach(makeDoorVisual);
 function setDoor(id,closed){const v=visuals.get(id);if(!v)return;v.seal.material.opacity=closed?.86:0;v.seal.material.color.setHex(closed?0x241313:0x120d0d);v.group.visible=true;}
 function createFalseRoute(r){
  if(state.falseRoute){state.falseRoute.remove();state.falseRoute=null;}
  const g2=new T.Group();g2.position.set(normX(r.x),0,normX(r.z));
  const sign=new T.Mesh(new T.BoxGeometry(1.5*S(),.55*S(),.08*S()),new T.MeshStandardMaterial({color:0x2a211c,roughness:.95}));sign.position.y=2.05*S();g2.add(sign);
  const glow=new T.PointLight(0x6d5b4c,1.2,4*S());glow.position.y=1.7*S();g2.add(glow);
  root.add(g2);state.falseRoute=g2;
 }
 function clearFalse(){if(state.falseRoute){state.falseRoute.parent&&state.falseRoute.parent.remove(state.falseRoute);state.falseRoute=null;}}
 function apply(ev,remote){
  if(!ev)return;
  state.version=Math.max(state.version,Number(ev.version||0));state.mutation=ev;state.lastChange=performance.now();state.cooldown=18;
  ROUTES.forEach(r=>setDoor(r.id,false));clearFalse();
  const blocked=routeById(ev.blocked||ROUTES[0].id);if(ev.kind==='CLOSE_ROUTE'){setDoor(blocked.id,true);notify('THE HOUSE MOVED',''+blocked.label+' IS SEALED',4300);}
  if(ev.kind==='FALSE_SAFE'){createFalseRoute(routeById(ev.decoy||blocked.id));notify('FALSE ROUTE','THE HOUSE IS SHOWING A WAY OUT',4600);}
  if(ev.kind==='FUNNEL'){setDoor(blocked.id,true);notify('ROUTE PRESSURE','THE HOUSE WANTS YOU TO MOVE',4300);}
  if(g.fear!=null)g.fear=Math.min(100,Number(g.fear)+(ev.kind==='CLOSE_ROUTE'?4:6));
  const obj=document.getElementById('objective-text');if(obj&&ev.kind==='FALSE_SAFE'){const old=obj.textContent;obj.textContent='THE HOUSE IS SHOWING YOU A WAY';setTimeout(()=>{if(obj.textContent==='THE HOUSE IS SHOWING YOU A WAY')obj.textContent=old},4300);}
 }
 function send(ev){if(net&&net.connected&&net.role==='host'&&net.send)net.send({type:'HOUSE_LAYOUT',id:net.peerId,seq:Date.now(),data:ev});}
 function pick(){
  if(state.cooldown>0||performance.now()-state.lastChange<14000)return null;
  const hm=g.houseMemoryDirector.state, heat=Number(g.adaptiveHouseDirector&&g.adaptiveHouseDirector.state&&g.adaptiveHouseDirector.state.heat||0), split=(()=>{const ms=Array.from(g.coop.members.values()).filter(m=>m.state!=='DEAD');if(ms.length<2)return 0;let far=0;for(let i=0;i<ms.length;i++)for(let j=i+1;j<ms.length;j++){const a=ms[i].object?.position,b=ms[j].object?.position;if(a&&b)far=Math.max(far,Math.hypot(a.x-b.x,a.z-b.z)/S());}return Math.min(1,far/12);})();
  const pressure=hm&&hm.rooms&&hm.rooms[hm.lastRoom]?hm.rooms[hm.lastRoom].pressure:0;
  if(pressure<.55&&heat<.55&&split<.55)return null;
  const pool=ROUTES.filter(r=>!state.history.slice(-2).includes(r.id));if(!pool.length)return null;
  const blocked=pool[Math.floor(Math.random()*pool.length)], roll=Math.random();
  const decoy=pool.find(r=>r.id!==blocked.id)||blocked;
  const kind=split>.7&&roll<.45?'FUNNEL':roll<.72?'CLOSE_ROUTE':'FALSE_SAFE';
  state.history.push(blocked.id);if(state.history.length>8)state.history.shift();state.version++;
  return{kind,blocked:blocked.id,decoy:decoy.id,version:state.version,room:hm&&hm.lastRoom||'HALL'};
 }
 const oldApply=g.partyNetwork.apply;
 g.partyNetwork.apply=function(packet){if(packet&&packet.type==='HOUSE_LAYOUT'&&packet.id!==net.peerId)apply(packet.data,true);if(oldApply)oldApply(packet);};
 const oldUpdate=g.updatePlayer.bind(g),prev={x:g.player.x,z:g.player.z};
 g.updatePlayer=function(dt){
  prev.x=this.player.x;prev.z=this.player.z;oldUpdate(dt);if(this.state!=='PLAYING')return;
  const ev=state.mutation;if(ev&&ev.kind!=='FALSE_SAFE'){
   const r=routeById(ev.blocked),p=this.player;const before={x:prev.x,z:prev.z},after={x:p.x,z:p.z};
   const bx=r.x,bz=r.z,near=Math.hypot(after.x/S()-bx,after.z/S()-bz)<1.05;
   const crossed=Math.hypot(before.x/S()-bx,before.z/S()-bz)>1.0&&near;
   if(crossed){
    const dx=after.x/S()-bx,dz=after.z/S()-bz;if(Math.abs(dx)>Math.abs(dz))p.x=before.x;else p.z=before.z;
    if(g.fear!=null)g.fear=Math.min(100,Number(g.fear)+2);
   }
  }
  state.cooldown=Math.max(0,state.cooldown-dt);
  if(net&&net.connected&&net.role==='host'){const ev=pick();if(ev){apply(ev,false);send(ev);}}
 };
 const oldEntity=g.updateEntity.bind(g);
 g.updateEntity=function(dt){
  oldEntity(dt);if(!g.entity||!state.mutation)return;
  const ev=state.mutation,r=routeById(ev.blocked),e=g.entity.position;
  if(ev.kind==='FUNNEL'&&e){const target=g.player.position;const side=(target.x/S()-r.x)>0?1:-1;g.entity.position.x+=side*.12*S();}
 };
 setInterval(()=>{if(state.mutation&&performance.now()-state.lastChange>19000){state.mutation=null;ROUTES.forEach(r=>setDoor(r.id,false));clearFalse();}},1800);
 g.dynamicHouseLayout={state,apply,routes:ROUTES};
}
boot();
})();
