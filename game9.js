/*
 * THE HOUSE IS WATCHING - Engine 9.0 Gameplay Upgrade
 * Zero-dependency Three.js horror vertical slice.
 * Designed for GitHub Pages, desktop + landscape mobile.
 */
(function(){
  'use strict';

  const $ = id => document.getElementById(id);
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

  class AudioEngine {
    constructor(){ this.ctx=null; this.master=null; this.ambient=null; }
    init(){
      if(this.ctx) { if(this.ctx.state==='suspended') this.ctx.resume(); return; }
      const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
      this.ctx=new AC(); this.master=this.ctx.createGain(); this.master.gain.value=.72; this.master.connect(this.ctx.destination);
      const o=this.ctx.createOscillator(), g=this.ctx.createGain(); o.type='sine'; o.frequency.value=38; g.gain.value=.035; o.connect(g).connect(this.master); o.start(); this.ambient=o;
    }
    tone(type,f1,f2,d,gain){
      if(!this.ctx) return; const now=this.ctx.currentTime, o=this.ctx.createOscillator(), g=this.ctx.createGain();
      o.type=type; o.frequency.setValueAtTime(f1,now); if(f2) o.frequency.exponentialRampToValueAtTime(f2,now+d);
      g.gain.setValueAtTime(gain,now); g.gain.exponentialRampToValueAtTime(.001,now+d); o.connect(g).connect(this.master); o.start(); o.stop(now+d+.02);
    }
    footstep(){this.tone('triangle',70+Math.random()*25,18,.11,.09);}
    creak(){this.tone('sawtooth',90,170,.5,.07);}
    sting(){this.tone('sawtooth',420,55,.65,.16);}
    heartbeat(strength){this.tone('sine',58,24,.17,.12+strength*.18);}
    whisper(){this.tone('sine',250,80,.35,.035);}
    click(){this.tone('square',180,90,.06,.035);}
  }

  function texture(base, lines){
    const c=document.createElement('canvas'); c.width=256; c.height=256; const x=c.getContext('2d');
    x.fillStyle=base; x.fillRect(0,0,256,256);
    x.globalAlpha=.35;
    for(let i=0;i<lines;i++){ x.fillStyle=i%2?'#080706':'#37302b'; x.fillRect(Math.random()*256,Math.random()*256,1+Math.random()*3,8+Math.random()*24); }
    x.globalAlpha=1; return new THREE.CanvasTexture(c);
  }

  class HouseGame {
    constructor(){
      this.state='START'; this.audio=new AudioEngine();
      this.quality=localStorage.getItem('hw_quality')||'medium'; this.sensitivity=parseFloat(localStorage.getItem('hw_sens')||'1.2');
      this.fear=0; this.stamina=100; this.battery=100; this.flashlightOn=true; this.running=false;
      this.phase=1; this.inventory=[]; this.memory={rooms:{},sprints:0,hides:0,lightsOff:0,encounters:0};
      this.keys=Object.create(null); this.joy={x:0,y:0}; this.look={yaw:0,pitch:0}; this.pointer=false; this.mobileRun=false;
      this.colliders=[]; this.interactables=[]; this.current=null; this.tempMove=new THREE.Vector3(); this.tempForward=new THREE.Vector3(); this.tempSide=new THREE.Vector3();
      this.tempDir=new THREE.Vector3(); this.tempLook=new THREE.Vector3(); this.ray=new THREE.Raycaster(); this.clock=new THREE.Clock(); this.lastStep=0; this.lastBeat=0; this.lastInteractionCheck=0; this.lastHUD={};
      this.initThree(); this.buildHouse(); this.initEntity(); this.bindEvents(); this.setupMobile(); this.updateObjective(); this.updateInventory(); this.checkOrientation();
    }

    initThree(){
      this.scene=new THREE.Scene(); this.scene.background=new THREE.Color(0x040405); this.scene.fog=new THREE.FogExp2(0x050507,.075);
      this.camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.08,60); this.player=new THREE.Vector3(0,1.6,11.5); this.camera.position.copy(this.player);
      this.renderer=new THREE.WebGLRenderer({antialias:this.quality==='high',powerPreference:'high-performance'}); this.renderer.setSize(innerWidth,innerHeight); this.container=$('game-container'); this.container.appendChild(this.renderer.domElement); this.applyQuality();
      this.renderer.outputColorSpace=THREE.SRGBColorSpace||undefined; this.renderer.toneMapping=THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure=.82;
      this.ambient=new THREE.AmbientLight(0x15151b,.3); this.scene.add(this.ambient);
      this.flashlight=new THREE.SpotLight(0xffecd0,2.8,16,Math.PI/6,.5,1.25); this.flashTarget=new THREE.Object3D(); this.scene.add(this.flashTarget,this.flashlight); this.flashlight.target=this.flashTarget;
      this.tempLight=new THREE.PointLight(0xff9b5d,0,8); this.tempLight.position.set(0,2.5,4); this.scene.add(this.tempLight);
    }
    applyQuality(){
      const pr=this.quality==='low'?1:this.quality==='high'?Math.min(devicePixelRatio,1.35):Math.min(devicePixelRatio,1.15); this.renderer.setPixelRatio(pr);
      this.renderer.shadowMap.enabled=this.quality!=='low'; this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    }
    material(map,rough=.8){return new THREE.MeshStandardMaterial({map,roughness:rough});}
    wall(x,z,w,d,door=false){
      if(door){ this.doorFrame(x,z,w,d); return; }
      const m=new THREE.Mesh(new THREE.BoxGeometry(w,3,d),this.wallMat); m.position.set(x,1.5,z); this.scene.add(m); this.colliders.push(new THREE.Box3().setFromObject(m));
    }
    doorFrame(x,z,w,d){
      const side=new THREE.Mesh(this.frameGeo,this.frameMat); side.position.set(x-w/2+.12,1.5,z); this.scene.add(side); const side2=side.clone(); side2.position.x=x+w/2-.12; this.scene.add(side2);
    }
    buildHouse(){
      this.wallMat=this.material(texture('#201d1b',420),.9); this.floorMat=this.material(texture('#17110d',80),.72); this.frameMat=new THREE.MeshStandardMaterial({color:0x251b17,roughness:.8}); this.frameGeo=new THREE.BoxGeometry(.18,3,.18);
      const floor=new THREE.Mesh(new THREE.PlaneGeometry(24,30),this.floorMat); floor.rotation.x=-Math.PI/2; this.scene.add(floor);
      const ceil=new THREE.Mesh(new THREE.PlaneGeometry(24,30),new THREE.MeshStandardMaterial({color:0x111114,roughness:1})); ceil.rotation.x=Math.PI/2; ceil.position.y=3; this.scene.add(ceil);
      // Perimeter with a real entrance opening.
      this.wall(-8,-15,8,.4); this.wall(8,-15,8,.4); this.wall(0,15,24,.4); this.wall(-12,0,.4,30); this.wall(12,0,.4,30);
      // Room divisions deliberately leave navigable door openings.
      this.wall(-4,4,.35,6); this.wall(-4,-8,.35,8); this.wall(4,4,.35,6); this.wall(4,-8,.35,8);
      this.wall(-8,7,8,.35); this.wall(8,7,8,.35); this.wall(-8,-1,8,.35); this.wall(8,-1,8,.35);
      this.wall(-8,-12,8,.35); this.wall(8,-12,8,.35);
      this.addLamp(0,11,1.1); this.addLamp(0,3,.55); this.addLamp(0,-5,.35); this.addLamp(0,-11,.3);
      this.addFurniture();
      this.interact('Fuse','FUSE',new THREE.Vector3(-8,1,10),0xe0ad32,()=>this.collect('Fuse'));
      this.interact('Generator','GENERATOR',new THREE.Vector3(8,1,10),0x3e83d8,()=>this.generator());
      this.interact('Key','MASTER KEY',new THREE.Vector3(-8,1,-4),0xd5a04a,()=>this.collect('Key'));
      this.interact('Doll','WATCHER DOLL',new THREE.Vector3(0,1,-10),0xa5222c,()=>this.collect('Doll'));
      this.interact('Battery1','BATTERY',new THREE.Vector3(8,1,-5),0xe8d24c,()=>this.collect('Battery1'));
      this.interact('Note','NOTE',new THREE.Vector3(-8,1,-9),0xd9d0b7,()=>this.readNote());
      this.interact('Exit','FRONT DOOR',new THREE.Vector3(0,1,14.5),0x75b98a,()=>this.escape());
    }
    addLamp(x,z,intensity){ const l=new THREE.PointLight(0xffad73,intensity,7); l.position.set(x,2.65,z); this.scene.add(l); l.userData.base=intensity; l.userData.flicker=Math.random()*10; }
    addFurniture(){
      const wood=new THREE.MeshStandardMaterial({color:0x241915,roughness:.9});
      const add=(x,z,w,d,h=.8)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),wood);m.position.set(x,h/2,z);this.scene.add(m);};
      add(-8,4,2.8,1); add(8,4,2.8,1); add(-8,-6,2.5,1); add(8,-7,2.2,1); add(-8,-10,1.8,.8); add(8,-11,1.8,.8);
    }
    interact(id,label,pos,color,action){
      const group=new THREE.Group(); group.position.copy(pos);
      const body=new THREE.Mesh(new THREE.BoxGeometry(.38,.5,.38),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.12,roughness:.65})); body.position.y=.1; group.add(body);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.32,.018,6,16),new THREE.MeshBasicMaterial({color:0xaaaaaa,transparent:true,opacity:.22})); ring.rotation.x=Math.PI/2; group.add(ring); this.scene.add(group);
      this.interactables.push({id,label,group,body,action,removed:false});
    }
    initEntity(){
      this.entityGroup=new THREE.Group(); const black=new THREE.MeshBasicMaterial({color:0x010101}); const body=new THREE.Mesh(new THREE.CylinderGeometry(.24,.14,2.5,7),black); body.position.y=1.25; this.entityGroup.add(body);
      const eye=new THREE.MeshBasicMaterial({color:0xeefcff}); for(const x of [-.08,.08]){const e=new THREE.Mesh(new THREE.SphereGeometry(.045,6,6),eye);e.position.set(x,2.18,.2);this.entityGroup.add(e);} this.entityGroup.position.set(9,0,-8); this.scene.add(this.entityGroup);
      this.entity={state:'OBSERVE',speed:1.8,seen:0,teleport:0};
    }
    collect(id){
      const o=this.interactables.find(v=>v.id===id); if(!o)return;
      if(id==='Battery1'){this.battery=100;this.audio.click();this.remove(id);this.flashPrompt('BATTERY RESTORED');return;}
      if(id==='Fuse'){this.inventory.push('Fuse');this.phase=2;this.remove(id);this.updateObjective('Take the fuse to the generator.');this.audio.click();return;}
      if(id==='Key'){if(this.phase<3){this.flashPrompt('THE BEDROOM IS STILL LOCKED');return;}this.inventory.push('Key');this.phase=4;this.remove(id);this.updateObjective('Unlock the ritual room and find the Watcher Doll.');this.audio.click();return;}
      if(id==='Doll'){if(!this.inventory.includes('Key')){this.flashPrompt('LOCKED — MASTER KEY REQUIRED');return;}this.inventory.push('Doll');this.phase=5;this.remove(id);this.updateObjective('IT WOKE UP. RUN TO THE FRONT DOOR.');this.entity.state='CHASE';this.entity.speed=3.4;this.audio.sting();return;}
    }
    generator(){
      if(!this.inventory.includes('Fuse')){this.flashPrompt('REQUIRES FUSE');return;} if(this.phase>=3)return;
      this.phase=3;this.remove('Generator');this.tempLight.intensity=1.6;this.updateObjective('Power restored. Find the Master Key.');this.entity.state='STALK';this.entity.speed=2.0;this.audio.creak();this.flickerEvent();
    }
    readNote(){this.memory.note=true;this.flashPrompt('"IT LEARNS THE PLACES YOU FEAR."');this.audio.whisper();}
    remove(id){const o=this.interactables.find(v=>v.id===id);if(!o||o.removed)return;o.removed=true;this.scene.remove(o.group);this.current=null;this.updateInventory();}
    updateObjective(text){ if(text) $('objective-text').textContent=text; else $('objective-text').textContent='Enter the house and restore power.'; }
    updateInventory(){for(let i=0;i<3;i++)$('inv-slot-'+i).textContent=this.inventory[i]||'EMPTY';}
    flashPrompt(msg){const p=$('interaction-prompt'),l=$('interaction-label');l.textContent=msg;p.classList.remove('hidden');clearTimeout(this.promptTimer);this.promptTimer=setTimeout(()=>{if(!this.current)p.classList.add('hidden');else l.textContent=this.current.label;},1100);}

    updatePlayer(dt){
      this.camera.rotation.order='YXZ'; this.camera.rotation.y=this.look.yaw; this.camera.rotation.x=this.look.pitch;
      const moving=this.keys.KeyW||this.keys.KeyA||this.keys.KeyS||this.keys.KeyD||Math.abs(this.joy.x)>.08||Math.abs(this.joy.y)>.08;
      const wantsRun=(this.keys.ShiftLeft||this.keys.ShiftRight||this.mobileRun)&&this.stamina>8&&moving; this.running=!!wantsRun;
      const speed=this.running?4.8:2.45; this.stamina=this.running?Math.max(0,this.stamina-20*dt):Math.min(100,this.stamina+12*dt);
      if(this.running && Math.random()<dt*.35)this.memory.sprints++;
      this.tempForward.set(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0),this.look.yaw); this.tempSide.set(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),this.look.yaw); this.tempMove.set(0,0,0);
      if(this.keys.KeyW)this.tempMove.add(this.tempForward); if(this.keys.KeyS)this.tempMove.sub(this.tempForward); if(this.keys.KeyD)this.tempMove.add(this.tempSide); if(this.keys.KeyA)this.tempMove.sub(this.tempSide);
      if(Math.abs(this.joy.x)>.08||Math.abs(this.joy.y)>.08){this.tempMove.addScaledVector(this.tempSide,this.joy.x);this.tempMove.addScaledVector(this.tempForward,-this.joy.y);}
      if(this.tempMove.lengthSq()>0){this.tempMove.normalize().multiplyScalar(speed*dt);const nx=this.player.x+this.tempMove.x,nz=this.player.z+this.tempMove.z;if(!this.collides(nx,this.player.z))this.player.x=nx;if(!this.collides(this.player.x,nz))this.player.z=nz;this.lastStep+=dt*(this.running?1.65:1);if(this.lastStep>.48){this.audio.footstep();this.lastStep=0;}}
      if(this.flashlightOn&&this.battery>0)this.battery=Math.max(0,this.battery-.75*dt); if(this.battery<=0)this.flashlightOn=false;
      const bob=moving?Math.sin(this.clock.elapsedTime*(this.running?14:9))*.035:0; this.camera.position.set(this.player.x,1.6+bob,this.player.z);
      this.flashlight.position.copy(this.camera.position);this.camera.getWorldDirection(this.tempLook);this.flashTarget.position.copy(this.camera.position).add(this.tempLook);
      this.flashlight.intensity=this.flashlightOn?2.8:0;
    }
    collides(x,z){const r=.42;for(let i=0;i<this.colliders.length;i++){const b=this.colliders[i];if(x>b.min.x-r&&x<b.max.x+r&&z>b.min.z-r&&z<b.max.z+r)return true;}return false;}
    updateInteraction(dt){
      this.lastInteractionCheck+=dt;if(this.lastInteractionCheck<.08)return;this.lastInteractionCheck=0;
      this.ray.setFromCamera({x:0,y:0},this.camera);let best=null,bestDist=2.5;
      for(let i=0;i<this.interactables.length;i++){const o=this.interactables[i];if(o.removed)continue;const d=o.group.position.distanceTo(this.player);if(d>2.8)continue;const hit=this.ray.intersectObject(o.body,false);if(hit.length&&hit[0].distance<bestDist){best=o;bestDist=hit[0].distance;}}
      this.current=best;const p=$('interaction-prompt');if(best){$('interaction-label').textContent=best.label;$('interaction-key').textContent=this.isMobileDevice()?'USE':'[E]';p.classList.remove('hidden');}else p.classList.add('hidden');
    }
    updateEntity(dt){
      if(this.state!=='PLAYING')return;const d=this.player.distanceTo(this.entityGroup.position);this.tempDir.subVectors(this.player,this.entityGroup.position);this.tempDir.y=0;const dist=this.tempDir.length();if(dist>0)this.tempDir.normalize();
      const dark=!this.flashlightOn; if(d<9)this.fear=clamp(this.fear+(9-d)*3.8*dt,0,100);else this.fear=Math.max(0,this.fear-2.5*dt);
      if(this.entity.state==='CHASE'){this.entityGroup.lookAt(this.player.x,1.2,this.player.z);this.entityGroup.position.addScaledVector(this.tempDir,this.entity.speed*dt);if(d<1.15)this.die();return;}
      this.entity.seen+=dt;this.entity.teleport+=dt;
      if(this.entity.state==='STALK'&&d<11&&this.entity.seen>2.5){this.entity.state='OBSERVE';this.entity.seen=0;}
      if(this.entity.state==='OBSERVE'&&this.entity.teleport>5){
        const angle=Math.random()*Math.PI*2, radius=6+Math.random()*6;this.entityGroup.position.set(clamp(this.player.x+Math.cos(angle)*radius,-10.5,10.5),0,clamp(this.player.z+Math.sin(angle)*radius,-13.5,13.5));this.entity.teleport=0;this.entity.seen=0;this.memory.encounters++;if(dark)this.audio.whisper();
      }
      if(this.phase>=3&&this.entity.teleport>8){this.entity.state='STALK';this.entity.teleport=0;}
      if(d<7&&this.clock.elapsedTime-this.lastBeat>Math.max(.45,1.25-this.fear/120)){this.audio.heartbeat(this.fear/100);this.lastBeat=this.clock.elapsedTime;}
      if(this.memory.sprints>3&&Math.random()<dt*.015)this.entity.state='CHASE';
    }
    flickerEvent(){this.flickerUntil=this.clock.elapsedTime+2.5;this.audio.sting();}
    updateLights(){const flick=this.flickerUntil&&this.clock.elapsedTime<this.flickerUntil;for(let i=0;i<this.scene.children.length;i++){const o=this.scene.children[i];if(o.isPointLight&&o.userData.base)o.intensity=flick?(Math.random()>.35?o.userData.base:0):o.userData.base;} }
    updateHUD(){
      const s=Math.round(this.stamina),b=Math.round(this.battery),f=Math.round(this.fear);if(this.lastHUD.s!==s){$('stamina-bar-fill').style.width=s+'%';this.lastHUD.s=s;}if(this.lastHUD.b!==b){$('battery-bar-fill').style.width=b+'%';this.lastHUD.b=b;}if(this.lastHUD.f!==f){$('fear-bar-fill').style.width=f+'%';this.lastHUD.f=f;}
      $('vignette').style.boxShadow=`inset 0 0 ${90+f*1.3}px rgba(0,0,0,${.78+f*.002})`;if(f>55)$('fear-glitch').style.opacity=((f-55)/45)*.16;else $('fear-glitch').style.opacity=0;
    }
    escape(){if(this.phase===5&&this.inventory.includes('Doll'))this.win();else this.flashPrompt('THE DOOR IS JAMMED SHUT');}
    die(){if(this.state!=='PLAYING')return;this.state='DEAD';document.exitPointerLock?.();$('hud').classList.add('hidden');$('death-screen').classList.remove('hidden');this.audio.sting();}
    win(){if(this.state!=='PLAYING')return;this.state='WON';document.exitPointerLock?.();$('hud').classList.add('hidden');$('victory-screen').classList.remove('hidden');}
    restart(){location.reload();}
    toggleLight(){if(this.battery<=0){this.flashPrompt('BATTERY EMPTY');return;}this.flashlightOn=!this.flashlightOn;if(!this.flashlightOn)this.memory.lightsOff++;this.audio.click();}
    checkOrientation(){const w=$('orientation-warning');if(this.isMobileDevice()&&innerHeight>innerWidth)w.classList.remove('hidden');else w.classList.add('hidden');}
    isMobileDevice(){return matchMedia('(pointer: coarse)').matches||innerWidth<850||/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);}

    bindEvents(){
      addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);this.applyQuality();this.checkOrientation();});
      addEventListener('orientationchange',()=>setTimeout(()=>this.checkOrientation(),120));
      addEventListener('keydown',e=>{this.keys[e.code]=true;if(e.code==='KeyE')this.interactNow();if(e.code==='KeyF')this.toggleLight();});
      addEventListener('keyup',e=>{this.keys[e.code]=false;});
      this.container.addEventListener('click',()=>{if(this.state==='PLAYING'&&!this.isMobileDevice())this.container.requestPointerLock?.();});
      document.addEventListener('pointerlockchange',()=>this.pointer=document.pointerLockElement===this.container);
      addEventListener('mousemove',e=>{if(!this.pointer)return;this.look.yaw-=e.movementX*.002*this.sensitivity;this.look.pitch=clamp(this.look.pitch-e.movementY*.002*this.sensitivity,-1.35,1.35);});
      $('btn-play').addEventListener('click',()=>{this.audio.init();this.state='PLAYING';$('start-screen').classList.add('hidden');$('hud').classList.remove('hidden');if(this.isMobileDevice())$('mobile-controls').classList.remove('hidden');else this.container.requestPointerLock?.();});
      $('btn-how-to').addEventListener('click',()=>$('modal-howto').classList.remove('hidden'));$('btn-close-howto').addEventListener('click',()=>$('modal-howto').classList.add('hidden'));
      $('btn-restart-death').addEventListener('click',()=>this.restart());$('btn-restart-victory').addEventListener('click',()=>this.restart());
      $('select-quality').value=this.quality;$('select-quality').addEventListener('change',e=>{this.quality=e.target.value;localStorage.setItem('hw_quality',this.quality);this.applyQuality();});
      $('slider-sens').value=this.sensitivity;$('slider-sens').addEventListener('input',e=>{this.sensitivity=parseFloat(e.target.value);localStorage.setItem('hw_sens',String(this.sensitivity));});
      $('btn-mobile-interact').addEventListener('pointerdown',e=>{e.preventDefault();this.interactNow();});$('btn-mobile-flash').addEventListener('pointerdown',e=>{e.preventDefault();this.toggleLight();});
      const run=$('btn-mobile-run');run.addEventListener('pointerdown',e=>{e.preventDefault();this.mobileRun=true;});['pointerup','pointercancel','pointerleave'].forEach(ev=>run.addEventListener(ev,()=>this.mobileRun=false));
    }
    interactNow(){if(this.current)this.current.action();}
    setupMobile(){
      const zone=$('joystick-zone'),thumb=$('joystick-thumb');let id=null,sx=0,sy=0;const max=42;
      const reset=()=>{id=null;this.joy.x=0;this.joy.y=0;thumb.style.transform='translate(0,0)';};
      zone.addEventListener('pointerdown',e=>{if(id!==null)return;e.preventDefault();zone.setPointerCapture?.(e.pointerId);id=e.pointerId;sx=e.clientX;sy=e.clientY;});
      zone.addEventListener('pointermove',e=>{if(e.pointerId!==id)return;e.preventDefault();let dx=e.clientX-sx,dy=e.clientY-sy,d=Math.hypot(dx,dy);if(d>max){dx=dx/d*max;dy=dy/d*max;}thumb.style.transform=`translate(${dx}px,${dy}px)`;this.joy.x=dx/max;this.joy.y=dy/max;});
      zone.addEventListener('pointerup',reset);zone.addEventListener('pointercancel',reset);zone.addEventListener('lostpointercapture',reset);
      const look=$('touch-look-zone');let lid=null,lx=0,ly=0;look.addEventListener('pointerdown',e=>{if(!this.isMobileDevice())return;e.preventDefault();look.setPointerCapture?.(e.pointerId);lid=e.pointerId;lx=e.clientX;ly=e.clientY;});
      look.addEventListener('pointermove',e=>{if(e.pointerId!==lid)return;e.preventDefault();const dx=e.clientX-lx,dy=e.clientY-ly;lx=e.clientX;ly=e.clientY;this.look.yaw-=dx*.005*this.sensitivity;this.look.pitch=clamp(this.look.pitch-dy*.005*this.sensitivity,-1.35,1.35);});look.addEventListener('pointerup',()=>lid=null);look.addEventListener('pointercancel',()=>lid=null);
    }
    start(){const loop=()=>{requestAnimationFrame(loop);const dt=Math.min(this.clock.getDelta(),.05);this.updatePlayer(dt);this.updateInteraction(dt);this.updateEntity(dt);this.updateLights();this.updateHUD();this.renderer.render(this.scene,this.camera);};loop();}
  }
  addEventListener('DOMContentLoaded',()=>{window.houseGame=new HouseGame();window.houseGame.start();});
})();
