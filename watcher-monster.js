/* THE HOUSE IS WATCHING — WATCHER V2
 * Cinematic procedural horror creature. Three.js r128 compatible.
 * Visual layer only; gameplay AI remains authoritative.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.entityGroup)return setTimeout(boot,100);
 if(g.__watcherV2)return; g.__watcherV2=true;
 g.entityGroup.visible=false; g.entityGroup.traverse(o=>o.visible=false);
 if(g.watcherVisual)g.watcherVisual.visible=false;
 const root=new T.Group();root.name='WATCHER_V2';g.scene.add(root);g.watcherVisual=root;
 const skin=new T.MeshStandardMaterial({color:0x5f5a56,roughness:1});
 const skinDark=new T.MeshStandardMaterial({color:0x181515,roughness:1});
 const black=new T.MeshStandardMaterial({color:0x050405,roughness:1,side:T.DoubleSide});
 const cloth=new T.MeshStandardMaterial({color:0x09090a,roughness:1,side:T.DoubleSide});
 const torn=new T.MeshStandardMaterial({color:0x151215,roughness:1,side:T.DoubleSide});
 const mouthMat=new T.MeshStandardMaterial({color:0x090303,roughness:1,side:T.DoubleSide});
 const tooth=new T.MeshStandardMaterial({color:0xd7d0c2,roughness:.7});
 const eye=new T.MeshBasicMaterial({color:0xffe8c0});
 const blood=new T.MeshStandardMaterial({color:0x3b0808,roughness:1});
 function add(p,geo,mat,pos,scale,rot){const m=new T.Mesh(geo,mat);if(pos)m.position.set(...pos);if(scale)m.scale.set(...scale);if(rot)m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;p.add(m);return m;}
 function bone(p,a,b,r,mat){const A=new T.Vector3(...a),B=new T.Vector3(...b),d=B.clone().sub(A),L=d.length();const m=add(p,new T.CylinderGeometry(r,r*.7,L,7),mat);m.position.copy(A.clone().add(B).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return m;}
 const hips=new T.Group();hips.position.y=.92;root.add(hips);
 const body=new T.Group();body.position.y=.05;hips.add(body);
 const torso=add(body,new T.CylinderGeometry(.12,.23,.72,9),cloth,[0,.34,0],[.9,1,.55]);
 const chest=add(body,new T.SphereGeometry(.25,12,8),cloth,[0,.66,0],[.8,.72,.52]);
 // Exposed rib-like arcs make the silhouette less human.
 for(let i=0;i<5;i++){const y=.34+i*.12;add(body,new T.TorusGeometry(.16+i*.012,.012,5,12,Math.PI),skinDark,[0,y,.07],[1,.7,.55],[Math.PI/2,0,Math.PI]);}
 // Crooked spine.
 for(let i=0;i<5;i++)add(body,new T.SphereGeometry(.035,7,5),skinDark,[Math.sin(i*1.7)*.055,.12+i*.14,-.11],[1,1,1]);
 const dress=new T.Group();dress.position.y=.02;hips.add(dress);
 add(dress,new T.CylinderGeometry(.18,.38,.9,12,2,true),cloth,[0,-.43,0],[1,1,.58]);
 for(let i=0;i<20;i++){const a=i/20*Math.PI*2,r=.28+(i%4)*.025,h=.3+(i%6)*.08;add(dress,new T.PlaneGeometry(.07,h),i%4===0?torn:cloth,[Math.cos(a)*r,-.72+h*.15,Math.sin(a)*r*.58],[1,1,1],[0,-a+Math.PI/2,(i%2?.13:-.13)]);}
 for(let i=0;i<9;i++)add(dress,new T.PlaneGeometry(.028,.28+(i%3)*.09),blood,[(i-4)*.07,-.57+(i%2)*-.08,.23],[1,1,1],[0,(i-4)*.16,0]);
 function leg(s){const hip=new T.Group();hip.position.set(s*.09,0,0);hips.add(hip);bone(hip,[0,0,0],[s*.05,-.42,0],.045,skinDark);const k=new T.Group();k.position.set(s*.05,-.42,0);hip.add(k);bone(k,[0,0,0],[s*.035,-.4,.01],.034,skinDark);add(k,new T.BoxGeometry(.07,.04,.15),skin,[s*.035,-.43,.05],[1,1,1],[.15,0,0]);}
 leg(-1);leg(1);
 const neck=new T.Group();neck.position.set(.02,.73,0);body.add(neck);
 bone(neck,[0,.36,0],[.02,.63,0],.075,skinDark);
 const head=new T.Group();head.position.set(0,.64,.02);neck.add(head);
 // Asymmetric skull: no normal human face.
 add(head,new T.SphereGeometry(.19,16,12),skin,[0,.05,0],[.86,1.25,.78],[0,0,-.1]);
 add(head,new T.SphereGeometry(.13,12,9),skinDark,[-.035,.18,.04],[1.05,1.15,.75],[0,0,.16]);
 const brow=add(head,new T.BoxGeometry(.26,.055,.05),skinDark,[0,.16,.17],[1,.7,1],[0,0,.08]);
 // Deep sockets and tiny pupils.
 for(const s of [-1,1]){add(head,new T.SphereGeometry(.052,10,8),black,[s*.07,.12,.17],[1,.72,.35]);add(head,new T.SphereGeometry(.012,7,6),eye,[s*.07,.12,.195]);}
 // Long split jaw with a mouth cavity.
 const jaw=add(head,new T.SphereGeometry(.12,12,8),skin,[.015,-.02,.17],[1.25,.55,.72]);
 const mouth=add(head,new T.SphereGeometry(.095,12,8),mouthMat,[.015,-.02,.235],[1.15,.52,.35]);
 const teeth=[];for(let i=0;i<9;i++){const x=(i-4)*.019;teeth.push(add(head,new T.ConeGeometry(.009,.055,5),tooth,[x,.005,.27],[1,1,1],[Math.PI,0,0]));}
 for(let i=0;i<9;i++){const x=(i-4)*.019;teeth.push(add(head,new T.ConeGeometry(.008,.045,5),tooth,[x,-.035,.27],[1,1,1],[0,0,0]));}
 const hair=new T.Group();head.add(hair);add(hair,new T.SphereGeometry(.24,14,10),black,[0,.15,-.02],[1.05,1.25,.9]);
 const locks=[];for(let i=0;i<34;i++){const s=i%2?-1:1,n=Math.floor(i/2),x=s*(.08+(n%8)*.017),h=.42+(n%7)*.075;locks.push(add(hair,new T.PlaneGeometry(.045,h),black,[x,.04-h*.2,.13+(n%3)*.018],[1,1,1],[.06,(n%5-2)*.08,s*.12]));}
 const armParts=[];
 function arm(s){const sh=new T.Group();sh.position.set(s*.2,.48,0);body.add(sh);const up=bone(sh,[0,0,0],[s*.06,-.38,.02],.055,skin);const el=new T.Group();el.position.set(s*.06,-.38,.02);sh.add(el);const fore=bone(el,[0,0,0],[s*.12,-.52,.07],.042,skin);const hand=new T.Group();hand.position.set(s*.12,-.53,.07);el.add(hand);add(hand,new T.SphereGeometry(.065,9,7),skin,[0,-.05,.02],[.75,1.2,.65]);for(let f=0;f<5;f++){const fg=new T.Group();fg.position.set((f-2)*.018,0,.02);hand.add(fg);const L=.14+(f===2?.05:0);armParts.push(bone(fg,[0,-.06,.02],[s*(f-2)*.02,-.06-L,.08],.009,skinDark));}armParts.push(sh,el,hand,up,fore);}
 arm(-1);arm(1);
 const eyesLight=new T.PointLight(0xffd8a0,.7,2);eyesLight.position.set(0,.1,.34);head.add(eyesLight);
 const jawGroup={open:0};
 root.userData.tickAnimation=function(time,dt,state){
  const hunting=state==='CHASE'||state==='HUNTING';
  const breathe=Math.sin(time*(hunting?7:2.1));
  body.scale.x=1+breathe*.018;body.rotation.z=Math.sin(time*.65)*.025;
  neck.rotation.z=.08+Math.sin(time*.8)*.035;
  // Unnatural head movement: mostly still, then sudden snap.
  const snap=Math.sin(time*1.35)>0.82?1:0;head.rotation.z=.08+Math.sin(time*.55)*.025;head.rotation.y=snap*.28;
  head.rotation.x=(hunting?.12:0)+Math.sin(time*1.1)*.018;
  jawGroup.open=hunting?.5:Math.max(0,(Math.sin(time*2.2)-.72)*3.2);
  mouth.scale.y=.52+jawGroup.open*.45;jaw.position.y=-.02-jawGroup.open*.045;
  teeth.forEach((t,i)=>{t.position.y=(i<9?.005:-.035)+(i<9?-jawGroup.open*.03:jawGroup.open*.03);});
  armParts.forEach((p,i)=>{if(p.rotation)p.rotation.x+=Math.sin(time*1.1+i*.31)*dt*.004;});
  locks.forEach((p,i)=>p.rotation.z+=Math.sin(time*1.25+i*.22)*dt*.003);
  eyesLight.intensity=.55+Math.sin(time*5.5)*.18+(hunting?.25:0);
 };
 const oldUpdate=g.updateEntity.bind(g);
 g.updateEntity=function(dt){oldUpdate(dt);if(this.state!=='PLAYING'){root.visible=false;return;}root.visible=true;root.position.copy(this.entityGroup.position);root.position.y-=.78;root.rotation.y=this.entityGroup.rotation.y;root.userData.tickAnimation(this.clock.elapsedTime,dt,this.entity&&this.entity.state||'WATCHING');};
 const oldLoop=g.loop;g.loop=function(){if(this.state==='PLAYING'&&this.player){const dx=this.entityGroup.position.x-this.player.x,dz=this.entityGroup.position.z-this.player.z;if(dx*dx+dz*dz>400)this.entityGroup.position.set(this.player.x+3.5,this.player.y,this.player.z-9);}oldLoop.apply(this,arguments);};
}
boot();
})();