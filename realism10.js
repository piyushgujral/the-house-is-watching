/* THE HOUSE IS WATCHING — Realism Pass 10
 * Enlarges the playable house and replaces the placeholder Watcher with a
 * more faithful tall, gaunt humanoid silhouette. Keeps the existing gameplay.
 */
(function(){
  'use strict';

  function mat(T,color,rough=.85,emissive=0x000000,ei=0){
    return new T.MeshStandardMaterial({color,roughness:rough,metalness:0,emissive,emissiveIntensity:ei});
  }

  function buildWatcher(T,root){
    while(root.children.length) root.remove(root.children[0]);
    root.scale.setScalar(1);
    root.rotation.set(0,0,0);

    const skin=mat(T,0x756a66,.96);
    const skinDark=mat(T,0x342e2c,1);
    const cloth=mat(T,0x090909,.98);
    const cloth2=mat(T,0x141211,.94);
    const hair=mat(T,0x020202,1);
    const eye=mat(T,0xe8f4ef,.3,0xd9ffff,2.2);

    // Long, narrow torso: the creature should read as human at first glance.
    const torso=new T.Mesh(new T.CylinderGeometry(.34,.25,2.45,10),cloth);
    torso.scale.z=.72; torso.position.y=1.72; root.add(torso);

    const chest=new T.Mesh(new T.BoxGeometry(.52,1.45,.34),cloth2);
    chest.position.set(0,1.85,.03); chest.rotation.z=.015; root.add(chest);

    const neck=new T.Mesh(new T.CylinderGeometry(.105,.145,.34,8),skinDark);
    neck.position.y=3.02; root.add(neck);

    const head=new T.Mesh(new T.SphereGeometry(.34,16,12),skin);
    head.scale.set(.76,1.18,.78); head.position.set(0,3.34,.015); head.rotation.z=-.09; root.add(head);

    // Hair mass + individual long locks. Hair deliberately obscures most of the face.
    const hairCap=new T.Mesh(new T.SphereGeometry(.42,16,12),hair);
    hairCap.scale.set(.98,1.35,.94); hairCap.position.set(0,3.47,-.015); root.add(hairCap);
    for(let i=0;i<26;i++){
      const len=.9+Math.random()*1.35;
      const lock=new T.Mesh(new T.CylinderGeometry(.018,.038,len,5),hair);
      const x=(Math.random()-.5)*.62;
      const z=.12+(Math.random()-.5)*.3;
      lock.position.set(x,3.0-Math.random()*.28,z);
      lock.rotation.z=(Math.random()-.5)*.28;
      lock.rotation.x=(Math.random()-.5)*.22;
      root.add(lock);
    }

    // Hollow eyes: visible only through gaps in the hair.
    [-.105,.105].forEach(x=>{
      const e=new T.Mesh(new T.SphereGeometry(.055,8,6),eye);
      e.position.set(x,3.37,.275); root.add(e);
    });

    // Arms are deliberately too long and hang below the knees.
    [-1,1].forEach(side=>{
      const upper=new T.Mesh(new T.CylinderGeometry(.075,.115,1.45,8),cloth);
      upper.position.set(side*.39,1.88,.02); upper.rotation.z=side*.10; root.add(upper);
      const fore=new T.Mesh(new T.CylinderGeometry(.065,.095,1.48,8),cloth);
      fore.position.set(side*.48,.72,.035); fore.rotation.z=side*.035; root.add(fore);
      const hand=new T.Mesh(new T.SphereGeometry(.115,8,6),skinDark);
      hand.scale.set(.75,1.35,.8); hand.position.set(side*.50,-.02,.045); root.add(hand);
      for(let j=0;j<4;j++){
        const claw=new T.Mesh(new T.CylinderGeometry(.009,.018,.34,5),skin);
        claw.position.set(side*(.47+(j-1.5)*.045),-.25,.08+(j%2)*.025);
        claw.rotation.z=side*(.08+(j-1.5)*.045); root.add(claw);
      }
    });

    // Thin, slightly bowed legs.
    [-1,1].forEach(side=>{
      const thigh=new T.Mesh(new T.CylinderGeometry(.095,.13,1.25,8),cloth);
      thigh.position.set(side*.13,.62,0); thigh.rotation.z=side*.035; root.add(thigh);
      const shin=new T.Mesh(new T.CylinderGeometry(.07,.105,1.18,8),cloth);
      shin.position.set(side*.15,-.55,.03); shin.rotation.z=side*.06; root.add(shin);
      const foot=new T.Mesh(new T.BoxGeometry(.16,.11,.48),cloth);
      foot.position.set(side*.15,-1.18,.12); root.add(foot);
    });

    root.userData.watcherVisual=true;
    root.userData.realismPass=10;
  }

  function install(){
    const g=window.houseGame, T=window.THREE;
    if(!g||!T||!g.scene||!g.entityGroup)return false;
    if(g.__realism10)return true;
    g.__realism10=true;

    // --------- Make the house feel like a real building ---------
    const WORLD=1.72;
    g.scene.scale.setScalar(WORLD);
    g.player.x*=WORLD; g.player.z*=WORLD;
    g.entityGroup.position.x*=WORLD; g.entityGroup.position.z*=WORLD;
    g.camera.far=105; g.camera.updateProjectionMatrix();
    g.scene.fog.density=.043;

    // Existing collision boxes must follow the enlarged world.
    if(Array.isArray(g.colliders)){
      g.colliders.forEach(b=>{
        b.min.multiplyScalar(WORLD); b.max.multiplyScalar(WORLD);
      });
    }

    // Existing interactable positions are already children of the scaled scene.
    // Add architectural dressing at the new, larger scale.
    const wood=mat(T,0x241b17,.9);
    const trim=mat(T,0x3a2922,.82);
    const plaster=mat(T,0x38322d,1);
    const glass=new T.MeshStandardMaterial({color:0x202b2b,roughness:.3,metalness:.05,transparent:true,opacity:.28});

    function box(x,y,z,w,h,d,m=wood){
      const q=new T.Mesh(new T.BoxGeometry(w,h,d),m); q.position.set(x,y,z); g.scene.add(q); return q;
    }
    function windowUnit(x,y,z,rot){
      const group=new T.Group(); group.position.set(x,y,z); group.rotation.y=rot||0;
      const frame=trim;
      group.add(new T.Mesh(new T.BoxGeometry(1.9,.11,.11),frame));
      group.add(new T.Mesh(new T.BoxGeometry(1.9,.11,.11),frame));
      const pane=new T.Mesh(new T.BoxGeometry(1.65,1.25,.045),glass); pane.position.y=1.15; group.add(pane);
      const v=new T.Mesh(new T.BoxGeometry(.08,1.3,.07),frame);v.position.set(0,1.15,.02);group.add(v);
      const h=new T.Mesh(new T.BoxGeometry(1.75,.07,.07),frame);h.position.set(0,1.15,.02);group.add(h);
      group.children[0].position.y=.45;group.children[1].position.y=1.85;
      g.scene.add(group); return group;
    }
    function doorway(x,z,rot){
      const group=new T.Group();group.position.set(x,yFix(0),z);group.rotation.y=rot||0;
      boxLocal(group,-1.0,1.5,0,.14,3.0,trim);boxLocal(group,1.0,1.5,0,.14,3.0,trim);boxLocal(group,0,2.93,0,2.15,.14,trim);g.scene.add(group);return group;
    }
    function boxLocal(parent,x,y,z,w,h,d,m){const q=new T.Mesh(new T.BoxGeometry(w,h,d),m);q.position.set(x,y,z);parent.add(q);return q;}
    function yFix(y){return y;}

    // Large windows on exterior walls. Coordinates are in the enlarged world.
    windowUnit(-20.5,0,-13.0,Math.PI/2);
    windowUnit(20.5,0,-4.5,Math.PI/2);
    windowUnit(-20.5,0,6.0,Math.PI/2);
    windowUnit(20.5,0,7.0,Math.PI/2);

    // Main interior door frames create believable room transitions.
    doorway(-6.8,1.7,Math.PI/2);
    doorway(6.8,1.7,-Math.PI/2);
    doorway(-6.8,-8.6,Math.PI/2);
    doorway(6.8,-8.6,-Math.PI/2);

    // Staircase toward a dark basement landing.
    const stairGroup=new T.Group();
    for(let i=0;i<8;i++){
      const s=new T.Mesh(new T.BoxGeometry(3.4,.25,.72),wood);
      s.position.set(8.1,.13+i*.27,-16.1-i*.62);stairGroup.add(s);
    }
    g.scene.add(stairGroup);

    // Ceiling beams, rugs and larger furniture make rooms read at human scale.
    for(let z of [11.2,2.8,-5.8,-13.1]){
      box(-6.8,5.05,z,17.5,.24,.28,trim);
    }
    const rugMat=mat(T,0x241e1b,1);
    box(0,.018,7.8,6.2,.035,2.8,rugMat);
    box(0,.018,-3.2,7.0,.035,3.2,rugMat);
    box(-7.2,.018,-10.8,4.2,.035,2.2,rugMat);

    // Wall-mounted picture frames / environmental storytelling.
    for(const p of [[-10.9,2.0,3.8],[10.9,2.0,3.8],[-10.9,2.0,-6.8],[10.9,2.0,-10.5]]){
      box(p[0],p[1],p[2],.12,1.5,1.05,trim);
      box(p[0]+(p[0]<0?.07:-.07),p[1],p[2],.03,1.25,.8,plaster);
    }

    // Replace the previous silhouette with the intended Watcher proportions.
    buildWatcher(T,g.entityGroup);
    g.entityGroup.scale.setScalar(.92);

    // A very faint eye glow, not a neon effect.
    const eyeLight=new T.PointLight(0xc9ffff,.16,2.6);eyeLight.position.set(0,3.35,.35);g.entityGroup.add(eyeLight);

    // Ensure the Watcher animation is visible but restrained.
    const baseUpdate=g.updateEntity.bind(g);
    g.updateEntity=function(dt){
      baseUpdate(dt);
      const r=this.entityGroup;if(!r)return;
      const t=this.clock.elapsedTime;const chase=this.entity.state==='CHASE'||this.entity.state==='HUNTING';
      r.position.y=Math.sin(t*(chase?7:1.4))*(chase?.035:.012);
      r.rotation.z+=(Math.sin(t*(chase?6:1.2))*(chase?.025:.008)-r.rotation.z)*.08;
      const target=chase?1.02:1.0;r.scale.x+=(.92*target-r.scale.x)*.05;r.scale.y+=(.92*target-r.scale.y)*.05;r.scale.z+=(.92*target-r.scale.z)*.05;
    };

    return true;
  }

  document.addEventListener('DOMContentLoaded',function(){
    const wait=()=>{if(install())return;setTimeout(wait,50);};wait();
  });
})();
