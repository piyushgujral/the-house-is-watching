/* THE HOUSE IS WATCHING — WATCHER V3
 * Rebuilt for the approved in-game horror silhouette.
 * Human-scale organic humanoid: pale damaged face, dense black hair,
 * long arms, thin claw fingers, narrow shoulders and torn dress.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;
 if(!g||!T||!g.scene||!g.entityGroup)return setTimeout(boot,100);
 if(g.__watcherV3)return;g.__watcherV3=true;
 if(g.watcherVisual)g.watcherVisual.visible=false;
 g.entityGroup.visible=false;
 const root=new T.Group();root.name='THE_WATCHER_V3';g.scene.add(root);g.watcherVisual=root;
 const mat=(c,r)=>new T.MeshStandardMaterial({color:c,roughness:r||.9,metalness:0});
 const flesh=mat(0x817871,.96),fleshLight=mat(0xa49a91,.9),fleshDark=mat(0x3b3431,1);
 const cloth=mat(0x080709,1),cloth2=mat(0x151216,1),cloth3=mat(0x242024,.98),hair=mat(0x010101,1),black=mat(0x030203,1),blood=mat(0x351011,1);
 const eye=new T.MeshStandardMaterial({color:0xfffff5,emissive:0xffffdd,emissiveIntensity:5,roughness:.4});
 function add(geo,m,p,s,r){const x=new T.Mesh(geo,m);if(p)x.position.set(...p);if(s)x.scale.set(...s);if(r)x.rotation.set(...r);x.castShadow=true;x.receiveShadow=true;root.add(x);return x;}
 function bone(a,b,r,m){const A=new T.Vector3(...a),B=new T.Vector3(...b),d=B.clone().sub(A),n=d.length();const x=add(new T.CylinderGeometry(r,r*.78,n,10),m);x.position.copy(A.clone().add(B).multiplyScalar(.5));x.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return x;}
 function sphere(r,m,p,s){return add(new T.SphereGeometry(r,16,12),m,p,s);}
 bone([-.105,0,.015],[-.12,.69,.01],.095,cloth);bone([.105,0,.015],[.12,.69,.01],.095,cloth);
 add(new T.BoxGeometry(.18,.09,.34),black,[-.12,.02,.09]);add(new T.BoxGeometry(.18,.09,.34),black,[.12,.02,.09]);
 /* Layered cloth torso instead of a featureless cylinder. */
 const torso=add(new T.CylinderGeometry(.20,.28,.86,14,3),cloth,[0,1.18,0],[.88,1,.60]);
 const skirt=add(new T.ConeGeometry(.48,.96,16,3,true),cloth,[0,.73,0],[1,.98,.68]);
 for(let i=0;i<18;i++){
  const a=i/18*Math.PI*2,rad=.30+(i%4)*.035,x=Math.sin(a)*rad,z=Math.cos(a)*rad*.68,h=.58+(i%6)*.12;
  add(new T.ConeGeometry(.10,.72,6,2,true),i%3===0?cloth3:cloth2,[x,.48+(i%3)*.07,z],[.72,h/.72,.5],[0,a,0]);
 }
 for(let i=0;i<13;i++){const x=(i-6)*.075,h=.30+(i%5)*.13;add(new T.BoxGeometry(.045,h,.035),cloth3,[x,.23+h*.25,.20+(i%2)*.035],[1,1,.5],[0,(i-6)*.05,i%2?.08:-.08]);}
 /* Long neck and narrow, visibly damaged face. */
 bone([0,1.60,0],[0,1.78,0],.095,fleshDark);
 const head=sphere(.27,fleshLight,[0,2.02,.015],[.78,1.12,.72]);
 const cheek=sphere(.235,fleshLight,[0,1.99,.18],[.78,1.08,.38]);
 for(const x of [-.085,.085]){sphere(.061,black,[x,2.07,.335],[1,.78,.42]);sphere(.020,eye,[x,2.07,.368],[1,1,.45]);}
 add(new T.ConeGeometry(.045,.13,7),fleshDark,[0,2.00,.365],[1,1,.7],[Math.PI/2,0,0]);
 add(new T.BoxGeometry(.15,.032,.025),black,[0,1.91,.365]);sphere(.15,flesh,[0,1.91,.17],[1,.48,.55]);
 /* Hair curtain with thick irregular locks. */
 const locks=[];
 for(let i=0;i<43;i++){
  const side=i<21?-1:1,idx=i<21?i:i-21,x=side*(.10+(idx%8)*.035),z=.12+(idx%4)*.045,h=.92+(idx%9)*.10;
  const lock=add(new T.CylinderGeometry(.022,.045,h,7),hair,[x,1.57-h*.20,z]);lock.rotation.z=side*(.025+(idx%5)*.018);lock.rotation.x=(idx%3-1)*.035;locks.push(lock);
 }
 add(new T.SphereGeometry(.31,14,10),hair,[0,2.05,-.02],[1,1.08,.8]);
 /* Extremely long articulated arms and separate five-finger hands. */
 const armParts=[];
 function arm(s){
  const shoulder=[s*.27,1.48,0],elbow=[s*.43,.98,.025],wrist=[s*.50,.39,.07];
  armParts.push(bone(shoulder,elbow,.082,flesh));armParts.push(bone(elbow,wrist,.064,fleshLight));sphere(.087,fleshDark,elbow,[1,.9,1]);
  for(let i=0;i<5;i++){const spread=(i-2)*.045,px=s*(.50+spread),p1=[px,.38-(i%3)*.015,.075],p2=[px+s*(i-2)*.020,.105,.095+Math.abs(i-2)*.008];armParts.push(bone(p1,p2,.013,fleshDark));add(new T.ConeGeometry(.016,.075,7),fleshDark,[p2[0],p2[1]-.035,p2[2]],[1,1,1],[0,0,s*(i-2)*.25]);}
 }
 arm(-1);arm(1);
 for(let i=0;i<9;i++){const s=i%2?-1:1,st=sphere(.018,blood,[s*(.34+(i%4)*.055),.72+(i%4)*.13,.075],[.65,2.2,.35]);st.rotation.z=s*.25;}
 const eyeGlow=new T.PointLight(0xfff1cf,1.25,2.5);eyeGlow.position.set(0,2.06,.43);root.add(eyeGlow);
 root.userData={type:'watcher',version:3,height:2.25};root.visible=true;
 const oldUpdate=g.updateEntity.bind(g),clock=g.clock;
 g.updateEntity=function(dt){oldUpdate(dt);if(this.state!=='PLAYING'){root.visible=false;return;}root.visible=true;root.position.copy(this.entityGroup.position);root.rotation.y=this.entityGroup.rotation.y;const t=clock.elapsedTime;torso.scale.x=.88*(1+Math.sin(t*1.45)*.018);skirt.scale.x=1+Math.sin(t*1.15)*.012;head.rotation.z=Math.sin(t*.65)*.035;cheek.rotation.z=head.rotation.z;root.position.y+=Math.sin(t*1.25)*.009;locks.forEach((q,i)=>q.rotation.z+=Math.sin(t*1.1+i*.31)*dt*.0015);armParts.forEach((q,i)=>q.rotation.z+=Math.sin(t*1.35+i*.27)*dt*.006);eyeGlow.intensity=1.05+Math.sin(t*3.1)*.22;};
 const oldLoop=g.loop;g.loop=function(){if(this.state==='PLAYING'&&this.player){const dx=this.entityGroup.position.x-this.player.x,dz=this.entityGroup.position.z-this.player.z;if(dx*dx+dz*dz>225)this.entityGroup.position.set(this.player.x+2.8,this.player.y,this.player.z-8);}oldLoop.apply(this,arguments);};
}
boot();
})();
