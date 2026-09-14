/* THE HOUSE IS WATCHING — Watcher Development 15
 * Visible development monster: tall, thin humanoid with long hair, pale face,
 * hollow eyes, elongated arms/fingers and ragged clothing. No external assets.
 * Adds readable animation and state-driven positioning without changing the core map.
 */
(function(){
 'use strict';
 function boot(){
  const g=window.houseGame,T=window.THREE;
  if(!g||!T||!g.scene||!g.entityGroup)return setTimeout(boot,60);
  if(g.__monster15)return; g.__monster15=true;

  const oldGroup=g.entityGroup;
  oldGroup.clear();
  oldGroup.scale.set(1.15,1.15,1.15);

  const skin=new T.MeshStandardMaterial({color:0xb9b2a7,roughness:.82,metalness:0});
  const dark=new T.MeshStandardMaterial({color:0x09090a,roughness:1});
  const hair=new T.MeshStandardMaterial({color:0x020203,roughness:1});
  const eye=new T.MeshStandardMaterial({color:0xf4f7ff,emissive:0x99ccff,emissiveIntensity:2.4});
  const mouthMat=new T.MeshStandardMaterial({color:0x171316,roughness:1});
  const claw=new T.MeshStandardMaterial({color:0x24201e,roughness:.75});

  const body=new T.Mesh(new T.CylinderGeometry(.25,.18,2.15,10),dark);body.position.y=1.35;oldGroup.add(body);
  const chest=new T.Mesh(new T.BoxGeometry(.48,.78,.28),dark);chest.position.set(0,1.52,.02);chest.rotation.z=.04;oldGroup.add(chest);
  const head=new T.Mesh(new T.SphereGeometry(.29,16,12),skin);head.position.set(0,2.55,.02);head.scale.set(.78,1.16,.78);oldGroup.add(head);
  const face=new T.Mesh(new T.SphereGeometry(.235,14,10),skin);face.position.set(0,2.52,.205);face.scale.set(.82,1.08,.45);oldGroup.add(face);
  for(const x of [-.095,.095]){const e=new T.Mesh(new T.SphereGeometry(.038,8,6),eye);e.position.set(x,2.59,.405);oldGroup.add(e);}
  const mouth=new T.Mesh(new T.BoxGeometry(.13,.045,.025),mouthMat);mouth.position.set(0,2.37,.405);oldGroup.add(mouth);

  /* Hair curtain: individual tapered strands make the silhouette readable. */
  for(let i=0;i<13;i++){
   const x=(i-6)*.052;
   const h=1.05+Math.abs(i-6)*.07;
   const strand=new T.Mesh(new T.CylinderGeometry(.025,.045,h,6),hair);
   strand.position.set(x,2.08-(Math.abs(i-6)*.015),.08+(i%3)*.015);
   strand.rotation.x=(i-6)*.035;strand.rotation.z=(i-6)*.018;oldGroup.add(strand);
  }

  function arm(side){
   const s=side;
   const upper=new T.Mesh(new T.CylinderGeometry(.075,.055,1.22,8),skin);upper.position.set(s*.40,1.42,0);upper.rotation.z=s*.16;oldGroup.add(upper);
   const fore=new T.Mesh(new T.CylinderGeometry(.055,.038,1.18,8),skin);fore.position.set(s*.54,.72,.01);fore.rotation.z=s*.06;oldGroup.add(fore);
   for(let i=0;i<4;i++){
    const f=new T.Mesh(new T.CylinderGeometry(.018,.008,.46,6),claw);f.position.set(s*(.54+(i-1.5)*.055),.08,.02+(i%2)*.015);f.rotation.z=s*(.08+(i-1.5)*.035);oldGroup.add(f);
   }
  }
  arm(-1);arm(1);
  const legMat=dark;
  for(const s of [-1,1]){const leg=new T.Mesh(new T.CylinderGeometry(.09,.065,1.45,8),legMat);leg.position.set(s*.12,.45,0);oldGroup.add(leg);}

  const halo=new T.PointLight(0xcce8ff,1.0,3.5);halo.position.set(0,2.45,.15);oldGroup.add(halo);
  g.entityGroup.userData.monsterModel=true;
  g.entityGroup.visible=true;

  const oldEntity=g.updateEntity.bind(g);
  g.updateEntity=function(dt){
   oldEntity(dt);
   if(this.state!=='PLAYING')return;
   const t=this.clock.elapsedTime;
   /* Unnatural breathing and hanging-arm motion. */
   const pulse=1+Math.sin(t*1.7)*.025;
   body.scale.x=pulse; chest.scale.x=pulse;
   oldGroup.rotation.z=Math.sin(t*.8)*.018;
   oldGroup.position.y=Math.sin(t*1.35)*.025;
   for(let i=0;i<oldGroup.children.length;i++){
    const c=oldGroup.children[i];
    if(i>8)c.rotation.x+=Math.sin(t*1.1+i)*dt*.025;
   }
   halo.intensity=.7+Math.sin(t*3.5)*.25;
  };

  /* Development placement: keep the creature visible at a safe distance so
     its proportions can be evaluated while the AI is still being built. */
  const oldLoop=g.loop;
  g.loop=function(){
   if(this.__monsterDevVisible&&this.state==='PLAYING'){
    const target=this.player;
    const dx=this.entityGroup.position.x-target.x,dz=this.entityGroup.position.z-target.z;
    if(dx*dx+dz*dz>260){this.entityGroup.position.set(target.x+4,target.y-1.6,target.z-7);}
   }
   oldLoop.apply(this,arguments);
  };
  g.__monsterDevVisible=true;
 }
 boot();
})();
