/* THE HOUSE IS WATCHING — Engine 13: interactive house layer.
 * Adds usable doors, room-based scares, a stalking heartbeat cue and safer
 * encounter pacing without replacing the core renderer/game loop.
 */
(function(){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  function install(){
    const game=window.houseGame,T=window.THREE;
    if(!game||!T||!game.scene)return false;
    if(game.__engine13)return true;
    game.__engine13=true;

    game.doors=[];
    const doorMat=new T.MeshStandardMaterial({color:0x211613,roughness:.92});
    const knobMat=new T.MeshStandardMaterial({color:0x6e5b45,metalness:.55,roughness:.38});

    function makeDoor(name,x,z,rot){
      const root=new T.Group();root.name=name;root.position.set(x,0,z);root.rotation.y=rot;root.userData.houseDoor=true;
      const panel=new T.Mesh(new T.BoxGeometry(1.28,2.45,.10),doorMat);panel.position.set(0,1.225,0);root.add(panel);
      const knob=new T.Mesh(new T.SphereGeometry(.055,8,6),knobMat);knob.position.set(.48,1.18,.08);root.add(knob);
      game.scene.add(root);
      const door={root,panel,name,open:false,angle:0,target:0,cooldown:0};game.doors.push(door);
      return door;
    }

    /* Doors sit in the existing visual openings and provide a clear interaction layer. */
    makeDoor('Living Room Door',-3.94,.35,Math.PI/2);
    makeDoor('Dining Room Door',3.94,.35,-Math.PI/2);
    makeDoor('Kitchen Door',-3.94,-7.05,Math.PI/2);
    makeDoor('Bedroom Door',3.94,-7.05,-Math.PI/2);

    function nearestDoor(){
      let best=null,bd=2.0;
      for(const d of game.doors){
        const p=d.root.position,dist=Math.hypot(game.player.x-p.x,game.player.z-p.z);
        if(dist<bd){bd=dist;best=d;}
      }
      return best;
    }

    function toggleDoor(d){
      if(!d)return;
      d.open=!d.open;d.target=d.open?-1.12:0;d.cooldown=1.2;
      game.audio.creak();
      if(game.houseMemory)game.houseMemory.doors[d.name]=(game.houseMemory.doors[d.name]||0)+1;
      if(game.fear<82 && Math.random()<.35)game.fear=clamp(game.fear+5,0,100);
    }

    const oldInteraction=game.updateInteraction.bind(game);
    game.updateInteraction=function(dt){
      oldInteraction(dt);
      const d=nearestDoor();
      if(!d||d.cooldown>0||this.state!=='PLAYING')return;
      const item=this.current;
      /* Door interaction only wins when no physical pickup is being aimed at. */
      if(!item){this.__doorTarget=d;const p=document.getElementById('interaction-prompt');const k=document.getElementById('interaction-key');const l=document.getElementById('interaction-label');k.textContent=this.isMobileDevice()?'USE':'[E]';l.textContent=d.open?'CLOSE '+d.name.toUpperCase():'OPEN '+d.name.toUpperCase();p.classList.remove('hidden');}
    };

    const oldInteract=game.interactNow.bind(game);
    game.interactNow=function(){
      if(this.__doorTarget&&!this.current&&this.state==='PLAYING'){toggleDoor(this.__doorTarget);this.__doorTarget=null;return;}
      oldInteract();
    };

    const oldPlayer=game.updatePlayer.bind(game);
    game.updatePlayer=function(dt){
      oldPlayer(dt);
      for(const d of this.doors){
        d.cooldown=Math.max(0,d.cooldown-dt);
        d.angle+=(d.target-d.angle)*Math.min(1,dt*9);
        d.panel.rotation.y=d.angle;
      }
    };

    /* The house reacts to a player's current room. The effect is intentionally
       sparse so scares remain memorable rather than becoming background noise. */
    game.__engine13RoomTimer=3+Math.random()*3;
    const oldEntity=game.updateEntity.bind(game);
    game.updateEntity=function(dt){
      oldEntity(dt);
      if(this.state!=='PLAYING')return;
      this.__engine13RoomTimer-=dt;
      if(this.__engine13RoomTimer>0)return;
      this.__engine13RoomTimer=4.5+Math.random()*7.5;
      const m=this.houseMemory;if(!m)return;
      const room=m.lastRoom||'HALLWAY';
      const intensity=Math.min(1,(m.sprints/20)+(m.darkness/70)+(this.fear/160));
      if(Math.random()<.42+intensity*.22){
        this.audio.creak();
        m.scares++;
        if(this.fear>48&&Math.random()<.35)this.audio.heartbeat(this.fear/100);
      }
      /* When the player repeatedly runs the same route, make a distant watcher
         encounter more likely, but never force an immediate attack. */
      if(room&&m.sprints>2&&Math.random()<.18){
        const r=this.entityGroup.position;
        const dx=this.player.x-r.x,dz=this.player.z-r.z;
        if(dx*dx+dz*dz>70){
          const side=Math.random()<.5?-1:1;
          r.set(clamp(this.player.x+side*(8+Math.random()*3),-10.5,10.5),0,clamp(this.player.z-(6+Math.random()*4),-13,13));
          this.entity.state='OBSERVE';
          this.audio.whisper();
          m.sightings++;
        }
      }
    };

    /* Make the flashlight physically useful: the Watcher becomes harder to see
       when the beam is off, but the beam does not reveal it constantly. */
    const oldToggle=game.toggleLight.bind(game);
    game.toggleLight=function(){oldToggle();if(this.flashlight)this.flashlight.visible=true;};

    return true;
  }
  function boot(){if(!install())setTimeout(boot,60);}boot();
})();
