/* THE HOUSE IS WATCHING — Engine 15: Watcher sensory AI.
 * Turns the creature into a hunter with sight, sound, memory and deliberate
 * search behavior. This layer augments the existing entity AI without owning
 * the renderer or replacing the core game loop.
 */
(function(){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const boot=()=>{
    const g=window.houseGame,T=window.THREE;
    if(!g||!T||!g.scene||!g.player||!g.entityGroup)return setTimeout(boot,80);
    if(g.__engine15)return; g.__engine15=true;

    const sense={lastSeen:-99,lastHeard:-99,confidence:0,searchX:0,searchZ:0,searchTimer:0,cooldown:2.5};
    g.watcherSense=sense;
    const ray=new T.Raycaster(), dir=new T.Vector3(), eye=new T.Vector3(), target=new T.Vector3();
    const obstacles=[];
    g.scene.traverse(o=>{
      if(o.isMesh && o.visible && !o.userData.watcherIgnore && !o.userData.hideSpot) obstacles.push(o);
    });

    function distance(){return Math.hypot(g.player.x-g.entityGroup.position.x,g.player.z-g.entityGroup.position.z);}
    function canSee(){
      const dx=g.player.x-g.entityGroup.position.x,dz=g.player.z-g.entityGroup.position.z;
      const d=Math.hypot(dx,dz); if(d>12)return false;
      eye.set(g.entityGroup.position.x,1.45,g.entityGroup.position.z);
      target.set(g.player.x,1.25,g.player.z); dir.copy(target).sub(eye); const len=dir.length();
      if(!len)return true; dir.normalize(); ray.set(eye,dir); ray.far=len-.15;
      const hits=ray.intersectObjects(obstacles,true);
      return hits.length===0;
    }
    function hear(){
      if(g.hidden)return 0;
      const d=distance(); let strength=0;
      if(g.running) strength=Math.max(strength,1.0-Math.min(d/14,1));
      else if(g.lastStep<.08) strength=Math.max(strength,.28-Math.min(d/18,.2));
      if(g.flashlightOn && d<7) strength=Math.max(strength,.12);
      return strength;
    }
    function moveToward(x,z,dt,speed){
      const dx=x-g.entityGroup.position.x,dz=z-g.entityGroup.position.z,d=Math.hypot(dx,dz); if(d<.2)return d;
      const step=Math.min(d,speed*dt); const nx=g.entityGroup.position.x+dx/d*step,nz=g.entityGroup.position.z+dz/d*step;
      /* Entity movement ignores player collision but stays inside the house. */
      g.entityGroup.position.x=clamp(nx,-10.8,10.8);g.entityGroup.position.z=clamp(nz,-13.5,13.5);
      g.entityGroup.rotation.y=Math.atan2(dx,dz);
      return d-step;
    }
    function setSearch(){
      const a=Math.random()*Math.PI*2,r=3.5+Math.random()*5.5;
      sense.searchX=clamp(g.player.x+Math.cos(a)*r,-10,10);
      sense.searchZ=clamp(g.player.z+Math.sin(a)*r,-13,13);
      sense.searchTimer=0;
    }

    const oldEntity=g.updateEntity.bind(g);
    g.updateEntity=function(dt){
      oldEntity(dt);
      if(this.state!=='PLAYING'||this.hidden)return;
      sense.cooldown=Math.max(0,sense.cooldown-dt);
      const d=distance(), sight=canSee(), sound=hear();
      if(sight){
        sense.lastSeen=this.clock.elapsedTime;
        sense.confidence=clamp(sense.confidence+dt*(d<5?1.5:.65),0,1);
        sense.searchX=this.player.x;sense.searchZ=this.player.z;sense.searchTimer=0;
      }else if(sound>.05){
        sense.lastHeard=this.clock.elapsedTime;
        sense.confidence=clamp(sense.confidence+sound*.55,0,1);
        sense.searchX=this.player.x;sense.searchZ=this.player.z;sense.searchTimer=0;
      }else{
        sense.confidence=Math.max(0,sense.confidence-dt*.08);
        sense.searchTimer+=dt;
      }

      /* Don't override the final escape/death states. */
      if(this.entity.state==='CHASE'){
        const speed=this.hidden?0:3.0+Math.min(.8,this.fear/140);
        if(!this.hidden)moveToward(this.player.x,this.player.z,dt,speed);
        return;
      }

      if(sense.confidence>.72 && d<10){
        this.entity.state='HUNTING';
        moveToward(this.player.x,this.player.z,dt,2.35+this.fear/90);
        if(d<2.0 && sense.cooldown<=0){
          /* Let the existing game resolve the encounter if it has a death path. */
          sense.cooldown=3.0; this.fear=clamp(this.fear+18,0,100); this.audio.sting();
          if(this.entity&&this.entity.seen!==undefined)this.entity.seen=1;
        }
      }else if(sense.confidence>.25){
        this.entity.state='STALK';
        moveToward(sense.searchX,sense.searchZ,dt,1.45);
      }else if(sense.searchTimer<4.5 && (sense.lastSeen>-99||sense.lastHeard>-99)){
        this.entity.state='HIDING';
        if(sense.searchTimer<.08)setSearch();
        moveToward(sense.searchX,sense.searchZ,dt,1.05);
      }else{
        this.entity.state='OBSERVE';
      }

      /* The house remembers repeated sprinting: noisy players become easier
         to reacquire for the next encounter. */
      if(this.memory && this.memory.sprints>0){
        const bias=Math.min(.35,this.memory.sprints*.012);
        sense.confidence=clamp(sense.confidence+bias*dt,0,1);
      }
    };

    /* Lightweight debug/status feedback, useful during development and harmless
       on mobile. */
    const css=document.createElement('style');css.textContent='.watcher-status{position:fixed;top:14px;left:50%;transform:translateX(-50%);font:600 10px monospace;letter-spacing:2px;color:#bbb;opacity:0;z-index:40;pointer-events:none;text-shadow:0 1px 3px #000}.watcher-status.alert{opacity:.8}';document.head.appendChild(css);
    const label=document.createElement('div');label.className='watcher-status';document.body.appendChild(label);
    const oldHUD=thisUpdate=g.updateHUD?g.updateHUD.bind(g):null;
    if(oldHUD){g.updateHUD=function(){oldHUD();if(this.state!=='PLAYING'){label.textContent='';label.className='watcher-status';return;}const c=sense.confidence;if(c>.72){label.textContent='THE WATCHER KNOWS WHERE YOU ARE';label.className='watcher-status alert';}else if(c>.25){label.textContent='SOMETHING HEARD YOU';label.className='watcher-status alert';}else{label.textContent='';label.className='watcher-status';}};}
  };
  boot();
})();
