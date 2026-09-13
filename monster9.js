/* THE HOUSE IS WATCHING — Watcher visual upgrade. */
(function(){
  'use strict';
  function buildWatcher(THREE,root){
    while(root.children.length) root.remove(root.children[0]);
    const skin=new THREE.MeshStandardMaterial({color:0x171313,roughness:1});
    const cloth=new THREE.MeshStandardMaterial({color:0x050505,roughness:1});
    const hairMat=new THREE.MeshStandardMaterial({color:0x010101,roughness:1});
    const eyes=new THREE.MeshBasicMaterial({color:0xf4ffff});
    const torso=new THREE.Mesh(new THREE.CylinderGeometry(.34,.22,2.25,9),cloth); torso.scale.z=.72; torso.position.y=1.65; root.add(torso);
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(.12,.16,.3,7),skin); neck.position.y=2.82; root.add(neck);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.31,12,8),skin); head.scale.set(.78,1.25,.82); head.position.y=3.15; root.add(head);
    const hair=new THREE.Mesh(new THREE.SphereGeometry(.39,12,8),hairMat); hair.scale.set(1,1.65,.95); hair.position.set(0,3.22,-.02); root.add(hair);
    for(let i=0;i<18;i++){const s=new THREE.Mesh(new THREE.CylinderGeometry(.018,.035,.85+Math.random()*1.05,5),hairMat);s.position.set((Math.random()-.5)*.52,2.65-Math.random()*.25,.08+(Math.random()-.5)*.22);s.rotation.z=(Math.random()-.5)*.38;s.rotation.x=(Math.random()-.5)*.2;root.add(s)}
    for(const x of[-.105,.105]){const e=new THREE.Mesh(new THREE.SphereGeometry(.055,8,6),eyes);e.position.set(x,3.18,.285);root.add(e)}
    for(const side of[-1,1]){
      const arm=new THREE.Mesh(new THREE.CylinderGeometry(.075,.11,2.25,7),cloth);arm.position.set(side*.43,1.62,.02);arm.rotation.z=side*.11;root.add(arm);
      const hand=new THREE.Mesh(new THREE.SphereGeometry(.13,7,5),skin);hand.scale.y=1.35;hand.position.set(side*.48,.45,.04);root.add(hand);
      for(let j=0;j<3;j++){const claw=new THREE.Mesh(new THREE.CylinderGeometry(.012,.025,.34,5),skin);claw.position.set(side*(.46+(j-1)*.055),.2,.06);claw.rotation.z=side*(.12+(j-1)*.1);root.add(claw)}
    }
    for(const side of[-1,1]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.1,.13,1.55,7),cloth);leg.position.set(side*.14,.35,0);root.add(leg)}
    root.scale.setScalar(.88);root.userData.watcherVisual=true;root.userData.baseY=0;root.userData.animateWatcher=true;
  }
  function install(){
    if(!window.THREE)return false;
    let found=null;
    if(window.scene && window.scene.isScene) found=window.scene;
    const canv=document.querySelector('#game-container canvas');
    if(!canv)return false;
    /* The game creates the entity immediately after its Scene. Observe the DOM only
       until the renderer exists, then find the uniquely positioned entity group. */
    const oldRender=THREE.WebGLRenderer.prototype.render;
    if(oldRender.__watcherPatched)return true;
    function render(scene,camera){
      if(scene && !scene.userData.watcherInstalled){
        let target=null;
        scene.traverse(o=>{if(!target && o.isGroup && Math.abs(o.position.x-9)<.2 && Math.abs(o.position.z+8)<.2)target=o});
        if(target){buildWatcher(THREE,target);scene.userData.watcherInstalled=true;window.__WATCHER_ROOT=target}
      }
      if(window.__WATCHER_ROOT){const r=window.__WATCHER_ROOT,t=performance.now()/1000;r.position.y=Math.sin(t*1.7)*.018;r.rotation.z=Math.sin(t*1.45)*.012}
      return oldRender.call(this,scene,camera);
    }
    render.__watcherPatched=true;THREE.WebGLRenderer.prototype.render=render;return true;
  }
  const timer=setInterval(()=>{if(install())clearInterval(timer)},50);
})();
