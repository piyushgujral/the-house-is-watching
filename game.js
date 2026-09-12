const state={x:50,y:58,speed:1.2,fuse:false,changed:false,escaped:false,keys:{}};
const statusEl=document.getElementById('status');
const objectiveEl=document.getElementById('objective');
const messageEl=document.getElementById('message');
const scene=document.getElementById('scene');
const fuse=document.getElementById('fuse');
const shadow=document.getElementById('shadow');
const exitDoor=document.getElementById('exitDoor');

function say(text,ms=2200){messageEl.textContent=text;clearTimeout(say.timer);say.timer=setTimeout(()=>messageEl.textContent='',ms)}
function render(){document.documentElement.style.setProperty('--px',state.x+'%');document.documentElement.style.setProperty('--py',state.y+'%')}
function move(dx,dy){if(state.escaped)return;state.x=Math.max(8,Math.min(92,state.x+dx*state.speed));state.y=Math.max(16,Math.min(78,state.y+dy*state.speed));render()}
function interact(){
  if(state.escaped)return;
  const nearFuse=Math.abs(state.x-68)<10&&Math.abs(state.y-40)<14;
  const nearExit=Math.abs(state.x-50)<13&&Math.abs(state.y-30)<20;
  if(!state.fuse&&nearFuse){
    state.fuse=true;fuse.classList.add('found');fuse.textContent='✓';
    objectiveEl.textContent='Objective: Reach the exit.';statusEl.textContent='The electricity is back.';
    say('You found the fuse. Something heard you.',2600);
    setTimeout(triggerChange,900);return;
  }
  if(state.fuse&&nearExit){
    state.escaped=true;objectiveEl.textContent='ESCAPED';statusEl.textContent='V0.1 complete';say('You escaped... for now.',5000);return;
  }
  if(!state.fuse)say('I need to search the room.');else say('The exit is somewhere ahead.');
}
function triggerChange(){
  if(state.changed)return;state.changed=true;scene.classList.add('house-changed');shadow.classList.add('show');
  say('THE HOUSE HAS CHANGED.',2500);
  setTimeout(()=>shadow.classList.add('move'),800);
  setTimeout(()=>{statusEl.textContent='The hallway feels different.';},1500);
}
window.addEventListener('keydown',e=>{state.keys[e.key.toLowerCase()]=true;if(['e','enter'].includes(e.key.toLowerCase()))interact()});
window.addEventListener('keyup',e=>state.keys[e.key.toLowerCase()]=false);
setInterval(()=>{let dx=0,dy=0;if(state.keys.w||state.keys.arrowup)dy-=1;if(state.keys.s||state.keys.arrowdown)dy+=1;if(state.keys.a||state.keys.arrowleft)dx-=1;if(state.keys.d||state.keys.arrowright)dx+=1;if(dx||dy){const n=Math.hypot(dx,dy);move(dx/n,dy/n)}},30);

document.querySelectorAll('[data-key]').forEach(btn=>{const k=btn.dataset.key;const down=e=>{e.preventDefault();state.keys[k]=true};const up=e=>{e.preventDefault();state.keys[k]=false};btn.addEventListener('touchstart',down,{passive:false});btn.addEventListener('touchend',up,{passive:false});btn.addEventListener('mousedown',down);btn.addEventListener('mouseup',up);btn.addEventListener('mouseleave',up)});
document.getElementById('interactBtn').addEventListener('click',interact);
fuse.addEventListener('click',interact);exitDoor.addEventListener('click',interact);
render();say('Find the fuse. And stay together.',3000);
