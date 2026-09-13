/* Engine 11 hotfix: reliable flashlight + guaranteed Watcher visibility. */
(function(){
  'use strict';
  function install(){
    const g=window.houseGame,T=window.THREE;
    if(!g||!T||!g.scene||!g.camera||!g.renderer)return false;
    if(g.__fix11)return true; g.__fix11=true;

    /* Flashlight: explicitly attach to camera so the beam follows the player's view. */
    if(g.flashlight){
      g.flashlight.intensity=3.8; g.flashlight.distance=22; g.flashlight.angle=Math.PI/7; g.flashlight.penumbra=.72; g.flashlight.decay=1.35;
      if(g.flashlight.parent!==g.camera){
        if(g.flashlight.parent)g.flashlight.parent.remove(g.flashlight);
        g.camera.add(g.flashlight);
      }
      g.flashlight.position.set(.08,-.04,.02);
      g.flashlight.target.position.set(0,0,-12);
      g.camera.add(g.flashlight.target);
      g.flashlight.target.position.set(0,0,-12);
      g.flashlight.visible=true;
    }
    /* Keep a low-cost fill light aligned with the camera; this prevents the world
       from becoming unreadable when the spotlight is toggled or shadowing is poor. */
    if(!g.__fix11Fill){
      const fill=new T.PointLight(0xbfc8d6,.22,8,1.7); g.camera.add(fill); fill.position.set(0,0,0); g.__fix11Fill=fill;
    }

    /* Replace the fragile position-based monster hook with a stable visible Watcher. */
    let root=g.entityGroup;
    if(!root){
      root=new T.Group(); root.name='Watcher'; g.entityGroup=root; g.scene.add(root);
      if(g.entity)g.entity.group=root;
    }
    while(root.children.length)root.remove(root.children[0]);
    const skin=new T.MeshStandardMaterial({color:0x4a4140,roughness:.92,metalness:0});
    const cloth=new T.MeshStandardMaterial({color:0x09090a,roughness:1});
    const hair=new T.MeshStandardMaterial({color:0x020202,roughness:1});
    const eye=new T.MeshBasicMaterial({color:0xdffaff});
    const add=(mesh,x,y,z)=>{mesh.position.set(x,y,z);root.add(mesh);return mesh};
    const body=add(new T.Mesh(new T.CylinderGeometry(.23,.34,2.45,12),cloth),0,1.65,0);body.scale.z=.65;
    add(new T.Mesh(new T.CylinderGeometry(.105,.13,.34,10),skin),0,2.98,0);
    const head=add(new T.Mesh(new T.SphereGeometry(.34,16,12),skin),0,3.32,-.01);head.scale.set(.72,1.2,.78);
    const hairCap=add(new T.Mesh(new T.SphereGeometry(.43,16,12),hair),0,3.38,-.02);hairCap.scale.set(.92,1.48,.92);
    for(let i=0;i<26;i++){
      const strand=add(new T.Mesh(new T.CylinderGeometry(.012,.025,.75+Math.random()*.95,5),hair),(Math.random()-.5)*.48,2.98-Math.random()*.22,.12+(Math.random()-.5)*.18);
      strand.rotation.z=(Math.random()-.5)*.25;strand.rotation.x=(Math.random()-.5)*.15;
    }
    for(const x of[-.105,.105])add(new T.Mesh(new T.SphereGeometry(.065,10,8),eye),x,3.35,.285);
    for(const s of[-1,1]){
      const arm=add(new T.Mesh(new T.CylinderGeometry(.055,.095,2.55,9),cloth),s*.43,1.62,.01);arm.rotation.z=s*.13;
      add(new T.Mesh(new T.SphereGeometry(.115,9,7),skin),s*.48,.34,.02);
      for(let j=-2;j<=2;j++)add(new T.Mesh(new T.CylinderGeometry(.009,.018,.42,5),skin),s*(.48+j*.045),.04,.04);
    }
    for(const s of[-1,1])add(new T.Mesh(new T.CylinderGeometry(.075,.11,1.7,8),cloth),s*.13,.42,0);
    root.scale.setScalar(1.05);root.visible=true;root.userData.watcherVisual=true;
    if(g.entity){g.entity.state=g.entity.state||'OBSERVE';g.entityGroup=root;}

    /* Put the Watcher in a corridor the player can actually see shortly after starting. */
    const placeWatcher=()=>{
      if(g.state!=='PLAYING')return;
      const p=g.player, forward=g.tempLook||new T.Vector3();g.camera.getWorldDirection(forward);forward.y=0;
      if(forward.lengthSq()<.01)forward.set(0,0,-1);forward.normalize();
      const x=Math.max(-9,Math.min(9,p.x+forward.x*11));
      const z=Math.max(-12,Math.min(12,p.z+forward.z*11));
      root.position.set(x,0,z);root.lookAt(p.x,1.5,p.z);root.visible=true;
      if(g.entity){g.entity.state='OBSERVE';g.entityGroup=root;}
      g.__fix11Placed=true;
    };
    setTimeout(placeWatcher,1800);
    /* If the normal AI hides it, periodically restore a distant silhouette rather
       than allowing the player to have a permanently invisible monster. */
    const oldUpdate=g.updateEntity&&g.updateEntity.bind(g);
    if(oldUpdate&&!g.__fix11Update){
      g.__fix11Update=true;
      g.updateEntity=function(dt){
        oldUpdate(dt);
        if(this.state==='PLAYING'&&root){
          if(!root.visible)root.visible=true;
          const d=this.player.distanceTo(root.position);
          if(d>24||d<3){ if(this.__fix11Reposition<=0){this.__fix11Reposition=8;placeWatcher();} }
          this.__fix11Reposition=(this.__fix11Reposition||0)-dt;
          const t=this.clock.elapsedTime;root.position.y=Math.sin(t*1.4)*.012;root.rotation.z=Math.sin(t*1.7)*.008;
        }
      };
    }
    return true;
  }
  const boot=()=>{if(install())return;setTimeout(boot,50)};boot();
})();
