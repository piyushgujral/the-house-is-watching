/* THE HOUSE IS WATCHING — WATCHER V2
 * Procedural in-game character matching the approved concept:
 * human-scale gaunt body, pale elongated arms, black wet hair, long torn dress,
 * narrow pale face, glowing eyes, long claw fingers. No external assets.
 * The visual has its own root so older renderer patches cannot replace it.
 */
(function(){
 'use strict';
 function boot(){
  const g=window.houseGame,T=window.THREE;
  if(!g||!T||!g.scene||!g.entityGroup)return setTimeout(boot,80);
  if(g.__watcherV2)return; g.__watcherV2=true;

  /* Keep entityGroup for the existing AI; retire its crude visible geometry. */
  g.entityGroup.visible=false;
  g.entityGroup.children.forEach(function(c){c.visible=false;});

  const root=new T.Group(); root.name='WATCHER_V2_VISUAL'; g.scene.add(root); g.watcherVisual=root;
  const skin=new T.MeshStandardMaterial({color:0x9c9289,roughness:.92});
  const skinDark=new T.MeshStandardMaterial({color:0x655d58,roughness:1});
  const dress=new T.MeshStandardMaterial({color:0x0b0a0b,roughness:.96});
  const dress2=new T.MeshStandardMaterial({color:0x171517,roughness:1});
  const hair=new T.MeshStandardMaterial({color:0x030303,roughness:.98});
  const eye=new T.MeshStandardMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:4.5});
  const mouth=new T.MeshStandardMaterial({color:0x120c0d,roughness:1});
  const blood=new T.MeshStandardMaterial({color:0x351315,roughness:1});
  const finger=new T.MeshStandardMaterial({color:0x4a403d,roughness:1});

  function mesh(geo,mat,p,s,r){
   const m=new T.Mesh(geo,mat); if(p)m.position.set(p[0],p[1],p[2]); if(s)m.scale.set(s[0],s[1],s[2]); if(r)m.rotation.set(r[0],r[1],r[2]); m.castShadow=true;m.receiveShadow=true;root.add(m);return m;
  }
  function cyl(rt,rb,h,mat,p,seg){return mesh(new T.CylinderGeometry(rt,rb,h,seg||10),mat,p);}
  function joint(a,b,r,mat){
   const av=new T.Vector3(a[0],a[1],a[2]),bv=new T.Vector3(b[0],b[1],b[2]);
   const d=bv.clone().sub(av),len=d.length();
   const m=cyl(r,r*.82,len,mat,[0,0,0],8);
   m.position.copy(av.clone().add(bv).multiplyScalar(.5));
   m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());
   return m;
  }

  /* Human-scale legs and narrow torso. */
  joint([-.12,0,0],[-.14,.72,0],.105,dress);
  joint([.12,0,0],[.14,.72,0],.105,dress);
  cyl(.11,.10,.16,dress2,[-.14,-.05,.08],9);
  cyl(.11,.10,.16,dress2,[.14,-.05,.08],9);
  const torso=mesh(new T.CylinderGeometry(.24,.34,1.08,12),dress,[0,1.12,0],[1,.98,.62]);
  mesh(new T.SphereGeometry(.27,12,8),dress,[0,.70,0],[1,.72,.62]);

  /* Long torn black dress made from overlapping tapered cloth panels. */
  const skirt=mesh(new T.ConeGeometry(.47,.98,12,1,true),dress,[0,.82,0],[1,1,.70]);
  for(let i=0;i<15;i++){
   const ang=(i/15)*Math.PI*2,rad=.32+.045*(i%3);
   const x=Math.sin(ang)*rad,z=Math.cos(ang)*rad*.68;
   const panel=mesh(new T.ConeGeometry(.11,.95+(i%4)*.12,5,1,true),i%2?dress:dress2,[x,.55+(i%3)*.08,z],[.8,1,.55],[0,ang,0]);
   panel.scale.y=(.55+(i%5)*.10)/.95;
  }
  for(let i=0;i<8;i++){
   const tear=mesh(new T.ConeGeometry(.028,.34+(i%3)*.11,5,1,true),skinDark,[(i-3.5)*.09,.45+(i%2)*.08,.36],[1,1,.25]);
   tear.rotation.z=i%2?.12:-.12;
  }

  /* Narrow neck, pale face, deep sockets, glowing eyes and mouth slit. */
  cyl(.10,.12,.25,skin,[0,1.72,.01],9);
  const head=mesh(new T.SphereGeometry(.245,18,14),skin,[0,1.99,.015],[.78,1.18,.72]);
  const face=mesh(new T.SphereGeometry(.205,18,12),skin,[0,1.98,.185],[.82,1.12,.38]);
  for(const x of [-.075,.075]){
   mesh(new T.SphereGeometry(.047,10,8),mouth,[x,2.03,.345],[1,.78,.32]);
   mesh(new T.SphereGeometry(.018,8,6),eye,[x,2.03,.365],[1,1,.5]);
  }
  mesh(new T.ConeGeometry(.035,.11,7),skinDark,[0,1.98,.38],[1,1,.7],[Math.PI/2,0,0]);
  mesh(new T.BoxGeometry(.13,.026,.018),mouth,[0,1.88,.366]);

  /* Dense black hair curtain. */
  const hairStrands=[];
  for(let i=0;i<31;i++){
   const a=(i/31)*Math.PI*2,rad=.18+.08*(i%4)/3;
   const x=Math.sin(a)*rad,z=Math.cos(a)*rad*.62,h=1.18+(i%7)*.08;
   const strand=mesh(new T.CylinderGeometry(.018,.035,h,6),hair,[x,1.50+(i%4)*.06,z]);
   strand.rotation.z=Math.sin(a)*.11; strand.rotation.x=Math.cos(a)*.09; hairStrands.push(strand);
  }
  for(let i=0;i<11;i++){
   const x=(i-5)*.045,h=.78+(Math.abs(i-5)%4)*.12;
   const lock=mesh(new T.CylinderGeometry(.025,.048,h,6),hair,[x,1.48-h*.18,.27]);
   lock.rotation.z=(i-5)*.035; hairStrands.push(lock);
  }

  /* Very long articulated arms and five-finger hands. */
  const armParts=[];
  function makeArm(s){
   const shoulder=[s*.29,1.55,0],elbow=[s*.43,.98,.01],wrist=[s*.50,.35,.035];
   armParts.push(joint(shoulder,elbow,.085,skin));
   armParts.push(joint(elbow,wrist,.068,skin));
   mesh(new T.SphereGeometry(.092,9,7),skin,elbow,[1,.85,1]);
   for(let i=0;i<5;i++){
    const fx=s*(.50+(i-2)*.043),fz=.055+Math.abs(i-2)*.012;
    const start=[fx,wrist[1]-.02,fz],end=[fx+s*(i-2)*.018,.05,fz+.015];
    const f=joint(start,end,.014,finger);f.rotation.z+=s*(i-2)*.025;
    mesh(new T.ConeGeometry(.018,.08,6),finger,[end[0],end[1]-.035,end[2]],[1,1,1],[0,0,s*.35]);
   }
  }
  makeArm(-1);makeArm(1);

  for(let i=0;i<7;i++){
   const side=i%2?-1:1;
   const stain=mesh(new T.SphereGeometry(.022,6,5),blood,[side*(.43+(i%3)*.025),.65+(i%4)*.18,.075]);
   stain.scale.set(.7,1.8,.35);
  }

  const eyeLight=new T.PointLight(0xddeaff,1.0,2.2); eyeLight.position.set(0,2.03,.42); root.add(eyeLight);
  root.userData={type:'watcher',version:2,height:2.15};

  const clock=g.clock;
  const oldUpdate=g.updateEntity.bind(g);
  g.updateEntity=function(dt){
   oldUpdate(dt);
   if(this.state!=='PLAYING')return;
   root.position.copy(this.entityGroup.position); root.position.y-=.02; root.rotation.y=this.entityGroup.rotation.y;
   const t=clock.elapsedTime;
   const breathing=1+Math.sin(t*1.55)*.018; torso.scale.x=breathing; skirt.scale.x=breathing;
   root.position.y+=Math.sin(t*1.3)*.012;
   head.rotation.z=Math.sin(t*.72)*.025; face.rotation.z=head.rotation.z;
   hairStrands.forEach(function(h,i){h.rotation.z+=Math.sin(t*1.1+i*.37)*.0012;});
   armParts.forEach(function(a,i){a.rotation.z+=Math.sin(t*1.25+i*.4)*dt*.008;});
   eyeLight.intensity=1.0+Math.sin(t*3.4)*.25;
  };

  /* Development visibility: if the AI somehow spawns far away, move its real
     position closer so the model can be inspected while we build the AI. */
  const oldLoop=g.loop;
  g.loop=function(){
   if(this.state==='PLAYING'&&this.player){
    const dx=this.entityGroup.position.x-this.player.x,dz=this.entityGroup.position.z-this.player.z;
    if(dx*dx+dz*dz>360)this.entityGroup.position.set(this.player.x+3.5,this.player.y,this.player.z-7);
   }
   oldLoop.apply(this,arguments);
  };
  root.visible=true;
 }
 boot();
})();
