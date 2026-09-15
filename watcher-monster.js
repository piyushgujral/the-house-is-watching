/* THE HOUSE IS WATCHING — WATCHER V3
 * Procedural cinematic creature for Three.js r128.
 * Gameplay AI remains authoritative in engine22.js.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.entityGroup)return setTimeout(boot,100);
 if(g.__watcherV3)return; g.__watcherV3=true;
 const old=g.entityGroup;old.visible=false;old.traverse(o=>o.visible=false);
 if(g.watcherVisual)g.watcherVisual.visible=false;
 const root=new T.Group();root.name='WATCHER_V3';root.userData.watcherIgnore=true;g.scene.add(root);g.watcherVisual=root;
 const skin=new T.MeshStandardMaterial({color:0x68615d,roughness:1,metalness:0});
 const skinDark=new T.MeshStandardMaterial({color:0x171416,roughness:1});
 const black=new T.MeshStandardMaterial({color:0x030304,roughness:1,side:T.DoubleSide});
 const cloth=new T.MeshStandardMaterial({color:0x080809,roughness:.96,side:T.DoubleSide});
 const torn=new T.MeshStandardMaterial({color:0x161116,roughness:1,side:T.DoubleSide});
 const mouthMat=new T.MeshStandardMaterial({color:0x070102,roughness:1,side:T.DoubleSide});
 const tooth=new T.MeshStandardMaterial({color:0xcfc6b6,roughness:.72});
 const eye=new T.MeshBasicMaterial({color:0xffe8c0});
 const blood=new T.MeshStandardMaterial({color:0x390708,roughness:1});
 const add=(p,geo,mat,pos,sc,rot)=>{const m=new T.Mesh(geo,mat);if(pos)m.position.set(...pos);if(sc)m.scale.set(...sc);if(rot)m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;m.userData.watcherIgnore=true;p.add(m);return m;};
 const bone=(p,a,b,r,mat)=>{const A=new T.Vector3(...a),B=new T.Vector3(...b),d=B.clone().sub(A),L=d.length();const m=add(p,new T.CylinderGeometry(r,r*.72,L,7),mat);m.position.copy(A).add(B).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return m;};
 const hips=new T.Group();hips.position.y=.92;root.add(hips);
 const body=new T.Group();body.position.y=.05;hips.add(body);
 add(body,new T.CylinderGeometry(.12,.24,.76,9),cloth,[0,.36,0],[.9,1,.55]);
 add(body,new T.SphereGeometry(.25,12,8),cloth,[0,.68,0],[.82,.72,.52]);
 const ribs=[];for(let i=0;i<6;i++){const y=.34+i*.115;ribs.push(add(body,new T.TorusGeometry(.17+i*.014,.012,5,14,Math.PI),skinDark,[0,y,.075],[1,.72,.55],[Math.PI/2,0,Math.PI]));}
 for(let i=0;i<7;i++)add(body,new T.SphereGeometry(.035,7,5),skinDark,[Math.sin(i*1.6)*.06,.1+i*.12,-.115]);
 const dress=new T.Group();dress.position.y=.02;hips.add(dress);add(dress,new T.CylinderGeometry(.18,.39,.92,12,2,true),cloth,[0,-.43,0],[1,1,.58]);
 const clothPieces=[];for(let i=0;i<24;i++){const a=i/24*Math.PI*2,r=.28+(i%4)*.025,h=.28+(i%6)*.075;clothPieces.push(add(dress,new T.PlaneGeometry(.075,h),i%5===0?torn:cloth,[Math.cos(a)*r,-.72+h*.15,Math.sin(a)*r*.58],[1,1,1],[0,-a+Math.PI/2,(i%2?.13:-.13)]));}
 for(let i=0;i<10;i++)add(dress,new T.PlaneGeometry(.028,.25+(i%4)*.08),blood,[(i-4.5)*.07,-.56-(i%2)*.06,.23],[1,1,1],[0,(i-4)*.16,0]);
 function leg(s){const hip=new T.Group();hip.position.set(s*.095,0,0);hips.add(hip);bone(hip,[0,0,0],[s*.055,-.43,0],.045,skinDark);const knee=new T.Group();knee.position.set(s*.055,-.43,0);hip.add(knee);bone(knee,[0,0,0],[s*.035,-.4,.01],.034,skinDark);add(knee,new T.BoxGeometry(.08,.045,.16),skin,[s*.035,-.44,.06],[1,1,1],[.15,0,0]);return hip;}
 const legL=leg(-1),legR=leg(1);
 const neck=new T.Group();neck.position.set(.02,.73,0);body.add(neck);bone(neck,[0,.36,0],[.02,.63,0],.075,skinDark);
 const head=new T.Group();head.position.set(0,.64,.02);neck.add(head);
 add(head,new T.SphereGeometry(.19,16,12),skin,[0,.05,0],[.86,1.25,.78],[0,0,-.1]);
 add(head,new T.SphereGeometry(.13,12,9),skinDark,[-.035,.18,.04],[1.05,1.15,.75],[0,0,.16]);
 add(head,new T.BoxGeometry(.26,.055,.05),skinDark,[0,.16,.17],[1,.7,1],[0,0,.08]);
 for(const s of[-1,1]){add(head,new T.SphereGeometry(.053,10,8),black,[s*.07,.12,.17],[1,.72,.35]);add(head,new T.SphereGeometry(.012,7,6),eye,[s*.07,.12,.196]);}
 const jaw=add(head,new T.SphereGeometry(.12,12,8),skin,[.015,-.02,.17],[1.25,.55,.72]);
 const mouth=add(head,new T.SphereGeometry(.096,12,8),mouthMat,[.015,-.02,.235],[1.15,.52,.35]);
 const teeth=[];for(let row=0;row<2;row++)for(let i=0;i<9;i++){const x=(i-4)*.019;teeth.push(add(head,new T.ConeGeometry(.009,.055,5),tooth,[x,row===0?.005:-.035,.27],[1,1,1],[row===0?Math.PI:0,0,0]));}
 const hair=new T.Group();head.add(hair);add(hair,new T.SphereGeometry(.24,14,10),black,[0,.15,-.02],[1.05,1.25,.9]);
 const locks=[];for(let i=0;i<38;i++){const s=i%2?-1:1,n=Math.floor(i/2),x=s*(.08+(n%9)*.017),h=.4+(n%8)*.07;locks.push(add(hair,new T.PlaneGeometry(.045,h),black,[x,.04-h*.2,.13+(n%3)*.018],[1,1,1],[.06,(n%5-2)*.08,s*.12]));}
 const arms=[],hands=[];
 function arm(s){const sh=new T.Group();sh.position.set(s*.2,.48,0);body.add(sh);const up=bone(sh,[0,0,0],[s*.06,-.38,.02],.055,skin);const el=new T.Group();el.position.set(s*.06,-.38,.02);sh.add(el);const fore=bone(el,[0,0,0],[s*.12,-.52,.07],.042,skin);const hand=new T.Group();hand.position.set(s*.12,-.53,.07);el.add(hand);add(hand,new T.SphereGeometry(.065,9,7),skin,[0,-.05,.02],[.75,1.2,.65]);for(let f=0;f<5;f++){const fg=new T.Group();fg.position.set((f-2)*.018,0,.02);hand.add(fg);bone(fg,[0,-.06,.02],[s*(f-2)*.022,-.06-(.14+(f===2?.05:0)),.08],.009,skinDark);}arms.push(sh,el);hands.push(hand);}
 arm(-1);arm(1);
 const eyeLight=new T.PointLight(0xffd8a0,.65,2.2);eyeLight.position.set(0,.1,.34);head.add(eyeLight);
 const shadow=new T.Mesh(new T.CircleGeometry(.62,20),new T.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.28,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.02;shadow.userData.watcherIgnore=true;root.add(shadow);
 const state={jaw:0,snap:0,phase:Math.random()*10};
 root.userData.tickAnimation=function(time,dt,mode){
  const hunting=mode==='CHASE'||mode==='HUNTING';const stalking=mode==='STALK'||mode==='INVESTIGATE';
  const speed=hunting?1.65:stalking?1.0:.45;const breathe=Math.sin(time*speed+state.phase);
  body.scale.x=1+breathe*.022;body.rotation.z=Math.sin(time*.55+state.phase)*.025;
  hips.rotation.z=Math.sin(time*.7+state.phase)*.018;hips.rotation.x=hunting?.045:0;
  // Deliberate asymmetry and an occasional head snap create an unnatural silhouette.
  const snapWave=Math.sin(time*1.17+state.phase);if(snapWave>.91)state.snap=1;else if(snapWave<.82)state.snap=0;
  head.rotation.z=.08+Math.sin(time*.48)*.028;head.rotation.y=state.snap*(hunting?.42:.25);head.rotation.x=(hunting?.12:stalking?.05:0)+Math.sin(time*.9)*.02;
  neck.rotation.z=.08+Math.sin(time*.62)*.035;
  state.jaw=hunting?.48:Math.max(0,(Math.sin(time*2.15+state.phase)-.76)*3.1);
  mouth.scale.y=.52+state.jaw*.5;jaw.position.y=-.02-state.jaw*.045;
  teeth.forEach((t,i)=>{const upper=i<9;t.position.y=(upper?.005:-.035)+(upper?-state.jaw*.03:state.jaw*.03);});
  arms[0].rotation.z=-.08+(hunting?.18:0)+Math.sin(time*.8)*.025;arms[1].rotation.z=.08-(hunting?.16:0)-Math.sin(time*.72)*.025;
  hands[0].rotation.x=Math.sin(time*1.1)*.08;hands[1].rotation.x=-Math.sin(time*.95)*.08;
  legL.rotation.z=Math.sin(time*(hunting?6:1.5))*.035;legR.rotation.z=-Math.sin(time*(hunting?6:1.5))*.035;
  clothPieces.forEach((p,i)=>{p.rotation.z+=(Math.sin(time*1.2+i*.31)*.0018*dt);});
  locks.forEach((p,i)=>{p.rotation.z+=(Math.sin(time*1.35+i*.2)*.0022*dt);});
  ribs.forEach((r,i)=>r.scale.x=1+breathe*.012);
  eyeLight.intensity=.52+Math.sin(time*5.4)*.16+(hunting?.3:0);
  shadow.scale.setScalar(hunting?1.12:1);
 };
 const oldUpdate=g.updateEntity.bind(g);
 g.updateEntity=function(dt){oldUpdate(dt);if(this.state!=='PLAYING'){root.visible=false;return;}root.visible=true;root.position.copy(this.entityGroup.position);root.position.y-=.78;root.rotation.y=this.entityGroup.rotation.y;root.userData.tickAnimation(this.clock.elapsedTime,dt,this.entity&&this.entity.state||'OBSERVE');};
 // No artificial teleport loop here: engine22 controls repositioning so the creature cannot appear on top of the player unfairly.
 root.userData.getMode=()=>g.entity&&g.entity.state||'OBSERVE';
}
boot();
})();