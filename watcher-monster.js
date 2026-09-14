/* THE HOUSE IS WATCHING — AUTHORITATIVE WATCHER
 * Human-scale cinematic horror creature. Three.js r128 compatible.
 * This file owns the visual only; existing gameplay AI continues to own entityGroup/state.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.entityGroup)return setTimeout(boot,100);
 if(g.__authoritativeWatcher)return; g.__authoritativeWatcher=true;

 // Retire every older visual attached to the AI entity.
 g.entityGroup.visible=false;
 g.entityGroup.traverse(o=>{o.visible=false;});
 if(g.watcherVisual)g.watcherVisual.visible=false;

 const root=new T.Group();root.name='WATCHER_AUTHORITATIVE_1_78M';g.scene.add(root);g.watcherVisual=root;
 const skin=new T.MeshStandardMaterial({color:0x9b938b,roughness:.92,metalness:0});
 const skinDark=new T.MeshStandardMaterial({color:0x3b302d,roughness:1});
 const cloth=new T.MeshStandardMaterial({color:0x121013,roughness:.98,side:T.DoubleSide});
 const cloth2=new T.MeshStandardMaterial({color:0x292328,roughness:1,side:T.DoubleSide});
 const hair=new T.MeshStandardMaterial({color:0x030304,roughness:1,side:T.DoubleSide});
 const socket=new T.MeshStandardMaterial({color:0x080607,roughness:1});
 const eye=new T.MeshBasicMaterial({color:0xfff2cf});
 const blood=new T.MeshStandardMaterial({color:0x35100f,roughness:1});

 function add(parent,geo,mat,p,s,r){const m=new T.Mesh(geo,mat);if(p)m.position.set(...p);if(s)m.scale.set(...s);if(r)m.rotation.set(...r);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function bone(parent,a,b,r,mat){const A=new T.Vector3(...a),B=new T.Vector3(...b),d=B.clone().sub(A),len=d.length();const m=add(parent,new T.CylinderGeometry(r,r*.78,len,7),mat);m.position.copy(A.clone().add(B).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return m;}
 function faceTexture(){
  const c=document.createElement('canvas');c.width=256;c.height=256;const x=c.getContext('2d');
  x.fillStyle='#aaa49b';x.fillRect(0,0,256,256);
  const v=x.createRadialGradient(128,112,25,128,128,150);v.addColorStop(0,'rgba(210,205,195,.2)');v.addColorStop(.55,'rgba(65,52,48,.35)');v.addColorStop(1,'rgba(18,12,12,.92)');x.fillStyle=v;x.fillRect(0,0,256,256);
  x.fillStyle='#100a0a';x.beginPath();x.ellipse(92,96,27,19,0,0,Math.PI*2);x.ellipse(164,96,27,19,0,0,Math.PI*2);x.fill();
  x.fillStyle='rgba(35,20,18,.6)';for(let i=0;i<220;i++)x.fillRect(Math.random()*256,Math.random()*256,1+Math.random()*2,1+Math.random()*3);
  x.strokeStyle='#160a0a';x.lineWidth=4;x.beginPath();x.moveTo(78,170);x.quadraticCurveTo(128,187,178,170);x.stroke();
  return new T.CanvasTexture(c);
 }
 const faceMat=new T.MeshStandardMaterial({map:faceTexture(),roughness:.95,side:T.FrontSide});

 // Skeleton-style hierarchy, calibrated to 1.78m.
 const hips=new T.Group();hips.position.y=.78;root.add(hips);
 const torsoGroup=new T.Group();torsoGroup.position.y=.08;hips.add(torsoGroup);
 const torso=add(torsoGroup,new T.CylinderGeometry(.105,.17,.48,10,2),cloth,[0,.25,0],[1,1,.62]);
 const chest=add(torsoGroup,new T.SphereGeometry(.19,12,8),cloth,[0,.42,0],[.82,.72,.55]);
 add(hips,new T.SphereGeometry(.16,10,7),cloth,[0,.02,0],[1,.55,.7]);

 // Long, layered dress instead of a solid cone.
 const dressGroup=new T.Group();dressGroup.position.y=.02;hips.add(dressGroup);
 add(dressGroup,new T.CylinderGeometry(.16,.28, .72,12,2,true),cloth,[0,-.34,0],[1,1,.66]);
 const strips=[];
 for(let i=0;i<18;i++){
  const a=i/18*Math.PI*2,rad=.23+(i%4)*.025,h=.35+(i%6)*.075;
  const s=add(dressGroup,new T.PlaneGeometry(.085,h),i%3===0?cloth2:cloth,[Math.cos(a)*rad,-.69+h*.15,Math.sin(a)*rad*.62],[1,1,1],[0,-a+Math.PI/2,(i%2?.08:-.08)]);strips.push(s);
 }
 for(let i=0;i<7;i++)add(dressGroup,new T.PlaneGeometry(.035,.18+(i%3)*.08),blood,[(i-3)*.07,-.53+(i%2)*-.12,.20],[1,1,1],[0,(i-3)*.15,0]);

 // Legs, partly hidden by dress.
 function leg(sign){const hip=new T.Group();hip.position.set(sign*.075,-.02,0);hips.add(hip);bone(hip,[0,0,0],[0,-.34,0],.042,skinDark);const knee=new T.Group();knee.position.y=-.34;hip.add(knee);bone(knee,[0,0,0],[0,-.34,0],.032,skinDark);add(knee,new T.BoxGeometry(.065,.04,.14),skin,[0,-.37,.035]);}
 leg(-1);leg(1);

 // Neck + face.
 const headGroup=new T.Group();headGroup.position.set(0,.72,.01);torsoGroup.add(headGroup);
 bone(headGroup,[0,.43,0],[0,.56,0],.052,skinDark);
 const head=add(headGroup,new T.SphereGeometry(.145,18,14),faceMat,[0,.66,.02],[.78,1.15,.72]);
 add(headGroup,new T.SphereGeometry(.115,16,12),faceMat,[0,.65,.115],[.8,1.1,.4]);
 for(const sx of [-1,1]){add(headGroup,new T.SphereGeometry(.038,10,8),socket,[sx*.05,.70,.19],[1,.8,.4]);add(headGroup,new T.SphereGeometry(.012,8,6),eye,[sx*.05,.70,.215]);}
 add(headGroup,new T.ConeGeometry(.018,.055,6),skinDark,[0,.65,.22],[1,1,.7],[Math.PI/2,0,0]);
 add(headGroup,new T.BoxGeometry(.085,.018,.012),socket,[0,.58,.205]);

 // Hair curtain: front locks, side locks and rear mass.
 const hairGroup=new T.Group();headGroup.add(hairGroup);
 add(hairGroup,new T.SphereGeometry(.18,14,10),hair,[0,.69,-.02],[1,1.15,.82]);
 const locks=[];
 for(let i=0;i<30;i++){
  const side=i%2?-1:1,n=Math.floor(i/2),x=side*(.075+(n%7)*.018),z=.09+(n%3)*.025,h=.48+(n%8)*.065;
  const q=add(hairGroup,new T.PlaneGeometry(.035,h),hair,[x,.60-h*.22,z],[1,1,1],[.04,(n%4-2)*.05,side*.08]);locks.push(q);
 }
 for(let i=0;i<8;i++){const q=add(hairGroup,new T.PlaneGeometry(.045,.35+(i%4)*.08),hair,[(i-3.5)*.035,.48,.18],[1,1,1],[0,(i-4)*.05,0]);locks.push(q);}

 // Long articulated arms and five hooked fingers.
 const armParts=[];
 function arm(sign){
  const shoulder=new T.Group();shoulder.position.set(sign*.17,.43,0);torsoGroup.add(shoulder);
  const upper=bone(shoulder,[0,0,0],[sign*.035,-.25,.01],.046,skin);
  const elbow=new T.Group();elbow.position.set(sign*.035,-.25,.01);shoulder.add(elbow);
  const fore=bone(elbow,[0,0,0],[sign*.02,-.34,.02],.035,skin);
  const hand=new T.Group();hand.position.set(sign*.02,-.35,.02);elbow.add(hand);
  add(hand,new T.SphereGeometry(.055,10,8),skin,[0,-.035,.02],[.7,1,.5]);
  for(let f=0;f<5;f++){const fingerG=new T.Group();fingerG.position.x=(f-2)*.012;hand.add(fingerG);const len=.075+(f===2?.015:0);armParts.push(bone(fingerG,[0,-.065,.02],[sign*(f-2)*.009,-.065-len,.025],.006,skinDark));}
  armParts.push(shoulder,elbow,hand,upper,fore);
 }
 arm(-1);arm(1);

 const eyeLight=new T.PointLight(0xffe8bd,.45,1.6);eyeLight.position.set(0,.70,.26);headGroup.add(eyeLight);
 root.userData.tickAnimation=function(time,delta,state){
  const b=Math.sin(time*1.8);chest.scale.x=.82+b*.025;torso.scale.x=1+b*.018;
  torsoGroup.rotation.z=Math.sin(time*.7)*.018;torsoGroup.rotation.y=Math.cos(time*.5)*.014;
  headGroup.rotation.z=.055+Math.sin(time*.9)*.035;headGroup.rotation.x=Math.sin(time*1.25)*.018;
  armParts.forEach((p,i)=>{if(p&&p.rotation)p.rotation.x+=Math.sin(time*1.15+i*.4)*delta*.003;});
  locks.forEach((p,i)=>p.rotation.z+=Math.sin(time*1.1+i*.3)*delta*.002);
  eyeLight.intensity=.38+Math.sin(time*3.2)*.08;
  if(state==='CHASE'){headGroup.rotation.x=.18;armParts[0].rotation.x=.28;armParts[1].rotation.x=.28;}
 };

 const oldUpdate=g.updateEntity.bind(g);
 g.updateEntity=function(dt){oldUpdate(dt);if(this.state!=='PLAYING'){root.visible=false;return;}root.visible=true;root.position.copy(this.entityGroup.position);root.position.y-=.78;root.rotation.y=this.entityGroup.rotation.y;root.userData.tickAnimation(this.clock.elapsedTime,dt,this.entity&&this.entity.state||'WATCHING');};

 // Do not allow development placement to put the creature inside the camera.
 const oldLoop=g.loop;
 g.loop=function(){
  if(this.state==='PLAYING'&&this.player){const dx=this.entityGroup.position.x-this.player.x,dz=this.entityGroup.position.z-this.player.z;if(dx*dx+dz*dz>225)this.entityGroup.position.set(this.player.x+2.8,this.player.y,this.player.z-8);}
  oldLoop.apply(this,arguments);
 };
}
boot();
})();
