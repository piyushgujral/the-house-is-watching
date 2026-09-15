/* THE HOUSE IS WATCHING — Engine 16: Watcher Director + world-scale navigation.
 * Final gameplay layer after the visual Watcher is loaded.
 * Fixes the hard-coded navigation bounds left by the original sensory prototype,
 * adds obstacle-aware pursuit, stuck recovery, encounter pacing and house reactions.
 */
(function(){
  'use strict';

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const boot=()=>{
    const g=window.houseGame,T=window.THREE;
    if(!g||!T||!g.scene||!g.player||!g.entityGroup)return setTimeout(boot,80);
    if(g.__engine16)return; g.__engine16=true;

    const sense=g.watcherSense||(g.watcherSense={lastSeen:-99,lastHeard:-99,confidence:0,searchX:0,searchZ:0,searchTimer:0,cooldown:2.5});
    const root=g.entityGroup;
    const ray=new T.Raycaster();
    const a=new T.Vector3(),b=new T.Vector3(),d=new T.Vector3();
    const obstacles=[];
    g.scene.traverse(o=>{if(o.isMesh&&o.visible&&!o.userData.watcherIgnore&&!o.userData.hideSpot)obstacles.push(o);});

    // game9 was authored in a 24 x 30 house; realism10 scales the scene.
    // Keep the Watcher in the same effective world as the enlarged house.
    const sx=Math.abs(g.scene.scale.x||1), sz=Math.abs(g.scene.scale.z||1);
    const bounds={minX:-12*sx+1.2,maxX:12*sx-1.2,minZ:-15*sz+1.2,maxZ:15*sz-1.2};
    g.watcherBounds=bounds;

    const state={
      lastX:root.position.x,lastZ:root.position.z,stuck:0,
      nextEncounter:5+Math.random()*4,
      lastReaction:-99,
      pulse:0,
      searchAngle:Math.random()*Math.PI*2
    };
    g.watcherDirector=state;

    function dist(){return Math.hypot(g.player.x-root.position.x,g.player.z-root.position.z);}
    function elapsed(){return g.clock&&typeof g.clock.elapsedTime==='number'?g.clock.elapsedTime:0;}
    function clampRoot(){
      root.position.x=clamp(root.position.x,bounds.minX,bounds.maxX);
      root.position.z=clamp(root.position.z,bounds.minZ,bounds.maxZ);
    }
    function clearPath(x,z){
      a.set(root.position.x,1.25,root.position.z);
      b.set(x,1.2,z); d.copy(b).sub(a); const len=d.length();
      if(len<.35)return true;
      d.normalize();ray.set(a,d);ray.far=Math.max(.1,len-.3);
      return ray.intersectObjects(obstacles,true).length===0;
    }
    function move(x,z,dt,speed){
      let dx=x-root.position.x,dz=z-root.position.z,len=Math.hypot(dx,dz);
      if(len<.18)return;
      let tx=x,tz=z;
      // If the direct route is blocked, sample lateral steering directions.
      if(!clearPath(x,z)){
        const ang=Math.atan2(dx,dz);
        const samples=[ang+0.72,ang-0.72,ang+1.35,ang-1.35];
        let found=false;
        for(const q of samples){
          const r=2.0;
          const cx=root.position.x+Math.sin(q)*r,cz=root.position.z+Math.cos(q)*r;
          if(cx>bounds.minX&&cx<bounds.maxX&&cz>bounds.minZ&&cz<bounds.maxZ&&clearPath(cx,cz)){tx=cx;tz=cz;found=true;break;}
        }
        if(!found)return;
        dx=tx-root.position.x;dz=tz-root.position.z;len=Math.hypot(dx,dz);
      }
      const step=Math.min(len,speed*dt);
      root.position.x+=dx/len*step;root.position.z+=dz/len*step;
      root.rotation.y=Math.atan2(dx,dz);
      clampRoot();
    }
    function chooseSearchPoint(){
      state.searchAngle+=1.9+Math.random()*1.4;
      const r=2.5+Math.random()*5.5;
      sense.searchX=clamp(g.player.x+Math.sin(state.searchAngle)*r,bounds.minX+1,bounds.maxX-1);
      sense.searchZ=clamp(g.player.z+Math.cos(state.searchAngle)*r,bounds.minZ+1,bounds.maxZ-1);
      sense.searchTimer=0;
    }
    function react(type){
      const now=elapsed();
      if(now-state.lastReaction<5)return;
      state.lastReaction=now;
      if(g.flickerEvent&&type==='sight'&&!g.__devLightMode)g.flickerEvent();
      if(g.audio&&g.audio.sting&&type==='close')g.audio.sting();
      state.pulse=1;
    }

    const oldEntity=g.updateEntity.bind(g);
    g.updateEntity=function(dt){
      oldEntity(dt);
      if(this.state!=='PLAYING')return;

      clampRoot();
      state.nextEncounter-=dt; state.pulse=Math.max(0,state.pulse-dt*2.5);
      const x=root.position.x,z=root.position.z;
      const moved=Math.hypot(x-state.lastX,z-state.lastZ);
      if(moved<0.025&&this.entity.state!=='OBSERVE')state.stuck+=dt;else state.stuck=Math.max(0,state.stuck-dt*1.5);
      state.lastX=x;state.lastZ=z;

      const distance=dist();
      const conf=sense.confidence||0;
      // Give the Watcher a deliberate response when it has enough information.
      if(!this.hidden){
        if(this.entity.state==='CHASE'){
          move(this.player.x,this.player.z,dt,3.15+Math.min(.9,this.fear/110));
          if(distance<2.8)react('close');
        }else if(conf>.72){
          this.entity.state='HUNTING';
          move(this.player.x,this.player.z,dt,2.15+this.fear/105);
          if(distance<4.2)react('sight');
        }else if(conf>.25){
          this.entity.state='STALK';
          move(sense.searchX,sense.searchZ,dt,1.35);
        }else if(sense.searchTimer<5&&(sense.lastSeen>-99||sense.lastHeard>-99)){
          this.entity.state='HIDING';
          if(sense.searchTimer<.12)chooseSearchPoint();
          move(sense.searchX,sense.searchZ,dt,1.0);
        }else{
          this.entity.state='OBSERVE';
        }
      }

      // Stuck recovery: do not teleport on top of the player. Re-route locally.
      if(state.stuck>1.35&&!this.hidden){
        state.stuck=0;
        const q=Math.random()*Math.PI*2,r=2.5+Math.random()*3;
        const rx=clamp(root.position.x+Math.sin(q)*r,bounds.minX+1,bounds.maxX-1);
        const rz=clamp(root.position.z+Math.cos(q)*r,bounds.minZ+1,bounds.maxZ-1);
        if(clearPath(rx,rz)){root.position.x=rx;root.position.z=rz;}
      }

      // Encounter pacing: occasionally raise pressure after a quiet stretch,
      // but never force an unfair instant chase.
      if(state.nextEncounter<=0){
        state.nextEncounter=10+Math.random()*12;
        if(distance>5&&conf>.18){
          this.fear=clamp(this.fear+4,0,100);
          if(g.houseMemory)g.houseMemory.encounters=(g.houseMemory.encounters||0)+1;
        }
      }

      if(this.hidden){
        // The hidden player should create uncertainty, not a perfect target.
        this.entity.state='HIDING';
        sense.confidence=Math.max(0,sense.confidence-dt*.22);
      }
    };

    const oldHUD=g.updateHUD?g.updateHUD.bind(g):null;
    if(oldHUD){
      g.updateHUD=function(){
        oldHUD();
        if(this.state!=='PLAYING')return;
        const c=sense.confidence||0;
        const el=document.getElementById('interaction-prompt');
        if(c>.72&&el&&this.hidden){el.dataset.watcherPressure='1';}
      };
    }

    // A subtle screen pulse gives close encounters physical feedback without
    // making the development build artificially dark.
    const style=document.createElement('style');
    style.textContent='.watcher-pressure{position:fixed;inset:0;pointer-events:none;z-index:35;box-shadow:inset 0 0 70px rgba(255,255,255,.08);opacity:0;transition:opacity .08s}.watcher-pressure.on{opacity:1}';
    document.head.appendChild(style);
    const pulse=document.createElement('div');pulse.className='watcher-pressure';document.body.appendChild(pulse);
    g.watcherPressureElement=pulse;

    const oldLoop=g.loop;
    if(typeof oldLoop==='function'&&!g.__engine16Loop){
      // Do not replace the main loop; the gameplay wrapper above owns timing.
      g.__engine16Loop=true;
    }

    setInterval(()=>{
      if(g.state==='PLAYING'&&state.pulse>0){pulse.className='watcher-pressure on';}
      else pulse.className='watcher-pressure';
    },80);
  };
  boot();
})();
