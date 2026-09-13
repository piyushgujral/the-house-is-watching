import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const $ = id => document.getElementById(id);
const state = { started:false, fuse:false, key:false, doll:false, escaped:false, dead:false, flashlight:true, battery:100, running:false, stamina:100, fear:8, chapter:0 };
const pressed = Object.create(null);
const moveInput = {x:0,y:0};
let yaw=0, pitch=0, lookPointer=null, last=performance.now(), lastScare=0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020202);
scene.fog = new THREE.Fog(0x070605, 9, 42);
const camera = new THREE.PerspectiveCamera(72, innerWidth/innerHeight, 0.05, 70);
camera.position.set(0,1.65,8.4);
camera.rotation.order='YXZ';
const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
$('scene').appendChild(renderer.domElement);

const mat={
 wall:new THREE.MeshStandardMaterial({color:0x211d19,roughness:1}),
 wood:new THREE.MeshStandardMaterial({color:0x321b10,roughness:.92}),
 floor:new THREE.MeshStandardMaterial({color:0x120d0a,roughness:1}),
 ceiling:new THREE.MeshStandardMaterial({color:0x080706,roughness:1}),
 cloth:new THREE.MeshStandardMaterial({color:0x302522,roughness:1}),
 metal:new THREE.MeshStandardMaterial({color:0xc2c0b6,metalness:.5,roughness:.3}),
 gold:new THREE.MeshStandardMaterial({color:0xc49d43,metalness:.55,roughness:.28}),
 black:new THREE.MeshStandardMaterial({color:0x020202,roughness:1})
};
const colliders=[]; const interactables=[];
function cube(name,x,y,z,w,h,d,material,solid=false){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material); m.name=name; m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; scene.add(m);
 if(solid) colliders.push({x,z,w,d});
 return m;
}
function addRoom(z,width=7,depth=7){
 cube('floor',0,-.1,z,width,.2,depth,mat.floor);
 cube('ceiling',0,3.5,z,width,.2,depth,mat.ceiling);
}
// Main connected house: every doorway is physically open, so the player can traverse the whole map.
addRoom(7); addRoom(0); addRoom(-7); addRoom(-14); addRoom(-21);
// Outer side walls, split around doorways.
for(const z of [7,0,-7]){ cube('leftWall',-3.9,1.75,z,0.22,3.5,7,mat.wall,true); cube('rightWall',3.9,1.75,z,0.22,3.5,7,mat.wall,true); }
for(const z of [-14,-21]){ cube('leftWall',-4.8,1.75,z,0.22,3.5,7,mat.wall,true); cube('rightWall',4.8,1.75,z,0.22,3.5,7,mat.wall,true); }
// Back wall only at the start and far end. Internal boundaries remain open.
cube('frontWall',0,1.75,10.5,7.8,3.5,.22,mat.wall,true);
cube('endWall',0,1.75,-24.5,9.6,3.5,.22,mat.wall,true);
function doorway(z,w=2.6){ cube('doorHeader',0,2.9,z,w+.45,.22,.32,mat.wood); cube('doorL',-w/2,1.45,z,.18,2.9,.32,mat.wood); cube('doorR',w/2,1.45,z,.18,2.9,.32,mat.wood); }
for(const z of [3.5,-3.5,-10.5,-17.5]) doorway(z);
// Furniture and landmarks.
cube('sofa',-2.2,.65,6.0,2.4,1.1,1.1,mat.cloth,true);
cube('cabinet',2.25,1.15,1.0,1.15,2.3,.7,mat.wood,true);
cube('table',-2.1,.65,-1.7,2.4,1.1,1.15,mat.wood,true);
cube('wardrobe',2.2,1.45,-8.2,1.4,2.9,.85,mat.wood,true);
cube('bed',-2.0,.55,-15.1,3.1,.8,2.0,mat.cloth,true);
cube('desk',2.15,.7,-19.2,2.2,1.4,.8,mat.wood,true);
// Lamps.
for(const z of [7,0,-7,-14,-21]){
 const p=new THREE.PointLight(0xd4ad73,1.15,6.4); p.position.set(0,3.0,z); p.castShadow=true; p.shadow.mapSize.set(256,256); scene.add(p);
 cube('lamp',0,3.08,z,.12,.12,.12,new THREE.MeshBasicMaterial({color:0xffdba3}));
}
scene.add(new THREE.HemisphereLight(0x55504a,0x010101,.22));

function item(name,x,y,z,material,kind){const m=cube(name,x,y,z,.38,.38,.3,material);m.userData.kind=kind;interactables.push(m);return m;}
const fuse=item('fuse',2.25,1.72,5.9,mat.metal,'fuse');
const key=item('key',-2.1,1.25,-1.7,mat.gold,'key'); key.visible=false;
const doll=item('doll',2.15,.78,-13.8,mat.cloth,'doll'); doll.visible=false;
const exit=item('exit',0,1.5,-24.15,2.6,3,.22,mat.black); exit.userData.kind='exit'; interactables.push(exit);
// Hide spot: the wardrobe is also usable after the doll phase.
const hideSpot=cube('hide',2.2,1.45,-8.2,1.55,2.95,.95,mat.wood); hideSpot.userData.kind='hide'; interactables.push(hideSpot);

// Flashlight is parented to the camera. Target is also parented to camera, which makes direction reliable on mobile and desktop.
const flashlight=new THREE.SpotLight(0xfff4dc,7,22,Math.PI/7,.58,1.15);
const flashlightTarget=new THREE.Object3D(); flashlightTarget.position.set(0,0,-14);
camera.add(flashlight); camera.add(flashlightTarget); flashlight.target=flashlightTarget; flashlight.castShadow=true; flashlight.shadow.mapSize.set(512,512); flashlight.position.set(0,0,0);
scene.add(camera);

// Watcher.
const watcher=new THREE.Group();
const wb=cube('watcherBody',0,1.2,0,.82,2.35,.52,mat.black); wb.parent=watcher;
const wh=new THREE.Mesh(new THREE.SphereGeometry(.4,16,12),mat.black); wh.position.y=2.58; watcher.add(wh);
for(const x of [-.14,.14]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.045,8,8),new THREE.MeshBasicMaterial({color:0xffffff})); eye.position.set(x,2.63,-.36); watcher.add(eye);}
scene.add(watcher); watcher.visible=false;
const watcherTarget=new THREE.Vector3();

function updateHud(){
 const f=Math.max(0,Math.min(100,Math.round(state.fear))); $('fear').textContent=f+'%'; $('fearBar').style.width=f+'%'; $('batteryBar').style.width=Math.round(state.battery)+'%';
 $('objective').textContent=!state.fuse?'Find the fuse.':!state.key?'Find the house key.':!state.doll?'Find the watcher doll.':'Reach the front door and escape.';
 $('inventory').textContent=state.doll?'WATCHER DOLL':state.key?'HOUSE KEY':state.fuse?'FUSE':'EMPTY HANDS';
 [['checkFuse',state.fuse],['checkKey',state.key],['checkDoll',state.doll],['checkEscape',state.escaped]].forEach(([id,on])=>$(id)?.classList.toggle('done',on));
 const r=$('runBtn'); if(r) r.style.opacity=state.stamina>4?'1':'.45';
}
function message(text){const e=$('status');if(!e)return;e.textContent=text;clearTimeout(message.t);message.t=setTimeout(()=>e.textContent='READY',2300);}
function setFlash(on){state.flashlight=!!on && state.battery>0; flashlight.visible=state.flashlight;}
function startGame(){if(state.started)return;state.started=true;$('boot').classList.add('hidden');setFlash(true);message('The door locked. Find the fuse.');updateHud();renderer.domElement.focus();}
$('startBtn')?.addEventListener('click',startGame); $('startBtn')?.addEventListener('pointerup',e=>{e.preventDefault();startGame();});

function blocked(x,z){
 if(x<-3.48 || x>3.48) return true;
 for(const c of colliders){const ax=c.x-c.w/2-.32,bx=c.x+c.w/2+.32,az=c.z-c.d/2-.32,bz=c.z+c.d/2+.32;if(x>ax&&x<bx&&z>az&&z<bz)return true;}
 return false;
}
function move(dt){
 if(!state.started||state.dead||state.escaped)return;
 let x=(pressed.d?1:0)-(pressed.a?1:0)+(pressed.arrowright?1:0)-(pressed.arrowleft?1:0)+moveInput.x;
 let z=(pressed.s?1:0)-(pressed.w?1:0)+(pressed.arrowdown?1:0)-(pressed.arrowup?1:0)+moveInput.y;
 const len=Math.hypot(x,z);
 if(len<.01){state.stamina=Math.min(100,state.stamina+dt*22);return;}
 x/=len;z/=len;
 const sprint=state.running&&state.stamina>2;
 const speed=sprint?4.35:2.25;
 if(sprint)state.stamina=Math.max(0,state.stamina-dt*31);else state.stamina=Math.min(100,state.stamina+dt*19);
 const dx=(Math.cos(yaw)*x+Math.sin(yaw)*z)*speed*dt;
 const dz=(-Math.sin(yaw)*x+Math.cos(yaw)*z)*speed*dt;
 const nx=camera.position.x+dx,nz=camera.position.z+dz;
 if(!blocked(nx,camera.position.z))camera.position.x=nx;
 if(!blocked(camera.position.x,nz))camera.position.z=nz;
}
function interact(){
 if(!state.started||state.dead||state.escaped)return;
 const ray=new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(0,0),camera);
 const hit=ray.intersectObjects(interactables,false).find(h=>h.distance<3.2);
 if(!hit){message('Move closer and look directly at the object.');return;}
 const k=hit.object.userData.kind;
 if(k==='fuse'&&!state.fuse){state.fuse=true;hit.object.visible=false;state.chapter=1;state.fear+=10;key.visible=true;watcher.visible=true;watcher.position.set(-2,1,-1);message('POWER RESTORED. Something heard you.');}
 else if(k==='key'&&state.fuse&&!state.key){state.key=true;hit.object.visible=false;state.chapter=2;state.fear+=12;doll.visible=true;watcher.visible=false;message('The key was not here before.');}
 else if(k==='doll'&&state.key&&!state.doll){state.doll=true;hit.object.visible=false;state.chapter=3;state.fear+=20;watcher.visible=true;watcher.position.set(0,1,-18);message('RUN. DO NOT TURN AROUND.');}
 else if(k==='exit'&&state.fuse&&state.key&&state.doll){state.escaped=true;$('win').classList.remove('hidden');message('YOU ESCAPED. THE HOUSE REMEMBERS.');}
 else if(k==='exit')message('The door is locked.');
 else if(k==='hide')message('Press and hold the H key or use the wardrobe when hiding is enabled.');
 updateHud();
}
function toggleFlash(){
 if(!state.started||state.dead)return;
 if(state.flashlight){setFlash(false);message('Flashlight OFF.');}
 else if(state.battery>0){setFlash(true);message('Flashlight ON.');}
 else message('The battery is empty.');
}
function watcherAI(dt,now){
 if(!watcher.visible)return;
 const dx=camera.position.x-watcher.position.x,dz=camera.position.z-watcher.position.z,dist=Math.hypot(dx,dz);
 watcher.lookAt(camera.position.x,1.4,camera.position.z);
 if(state.chapter<3){if(dist<4.5&&now-lastScare>5000){state.fear=Math.min(100,state.fear+8);lastScare=now;message('Footsteps behind you.');}return;}
 const speed=state.running?1.0:1.42;
 if(dist>1.4){const step=Math.min(dist,dt*speed);watcher.position.x+=dx/dist*step;watcher.position.z+=dz/dist*step;}
 if(dist<2.5)state.fear=Math.min(100,state.fear+dt*10);
 if(dist<1.0){state.dead=true;$('death').classList.remove('hidden');message('IT FOUND YOU.');}
}
function tick(now){
 const dt=Math.min(.05,(now-last)/1000);last=now;
 if(state.started&&!state.dead&&!state.escaped){
   move(dt);
   if(state.flashlight){state.battery=Math.max(0,state.battery-dt*1.0);if(state.battery<=0){setFlash(false);message('FLASHLIGHT BATTERY EMPTY.');}}
   watcherAI(dt,now);
   if(state.fuse)state.fear=Math.min(100,state.fear+dt*.012);
   if(state.fear>=100){state.dead=true;$('death').classList.remove('hidden');message('THE HOUSE BROKE YOU.');}
 }
 updateHud(); renderer.render(scene,camera); requestAnimationFrame(tick);
}

// Keyboard: use keydown/up on window so controls work even when the canvas is not focused.
addEventListener('keydown',e=>{const k=e.key.toLowerCase();pressed[k]=true;if(k==='f')toggleFlash();if(k==='e'||k==='enter')interact();if(k==='shift')state.running=true;});
addEventListener('keyup',e=>{const k=e.key.toLowerCase();pressed[k]=false;if(k==='shift')state.running=false;});
// Mobile buttons use pointer capture and never rely on click timing.
function holdButton(id,on,off){const b=$(id);if(!b)return;const down=e=>{e.preventDefault();b.setPointerCapture?.(e.pointerId);on();};const up=e=>{e.preventDefault();off();};b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',off);}
holdButton('up',()=>moveInput.y=-1,()=>{if(moveInput.y<0)moveInput.y=0;});
holdButton('down',()=>moveInput.y=1,()=>{if(moveInput.y>0)moveInput.y=0;});
holdButton('left',()=>moveInput.x=-1,()=>{if(moveInput.x<0)moveInput.x=0;});
holdButton('right',()=>moveInput.x=1,()=>{if(moveInput.x>0)moveInput.x=0;});
holdButton('runBtn',()=>state.running=true,()=>state.running=false);
$('lightBtn')?.addEventListener('pointerdown',e=>{e.preventDefault();toggleFlash();});
$('interactBtn')?.addEventListener('pointerdown',e=>{e.preventDefault();interact();});
$('retryBtn')?.addEventListener('click',()=>location.reload()); $('againBtn')?.addEventListener('click',()=>location.reload());
// Touch/mouse look. UI buttons are excluded.
renderer.domElement.addEventListener('pointerdown',e=>{if(!state.started||e.target.closest('button'))return;lookPointer={id:e.pointerId,x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture?.(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(!lookPointer||e.pointerId!==lookPointer.id)return;yaw-=(e.clientX-lookPointer.x)*.0045;pitch-=(e.clientY-lookPointer.y)*.0045;pitch=Math.max(-1.22,Math.min(1.22,pitch));camera.rotation.set(pitch,yaw,0);lookPointer.x=e.clientX;lookPointer.y=e.clientY;});
renderer.domElement.addEventListener('pointerup',()=>lookPointer=null); renderer.domElement.addEventListener('pointercancel',()=>lookPointer=null); renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
updateHud(); requestAnimationFrame(tick);