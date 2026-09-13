/* THE HOUSE IS WATCHING — Vertical Slice Systems Upgrade
 * Extends the existing Engine 9 runtime without replacing its working core.
 * Adds House Memory, controlled Watcher encounters, environmental events,
 * room tracking, hiding spots, better monster states and cinematic moments.
 */
(function(){
  'use strict';

  function install(){
    const game=window.houseGame;
    if(!game || !window.THREE) return false;
    const T=window.THREE;
    if(game.__systemsUpgradeInstalled) return true;
    game.__systemsUpgradeInstalled=true;

    /* ---------- House Memory ---------- */
    game.houseMemory={
      rooms:{}, routes:{}, doors:{}, objects:{},
      timeByRoom:{}, lastRoom:null, lastRoomAt:performance.now(),
      sprints:0, darkness:0, sightings:0, encounters:0, scares:0,
      repeatedRoute:0, fearPeaks:0, lastEventAt:0,
      roomName:function(x,z){
        if(z>7)return 'ENTRANCE';
        if(z>0)return x<0?'LIVING ROOM':'DINING ROOM';
        if(z>-7)return x<0?'KITCHEN':'BEDROOM';
        if(z>-12)return x<0?'BATHROOM':'UTILITY';
        return 'BASEMENT';
      }
    };

    game.encounter={type:null,cooldown:5,age:0,active:false,lastPosition:new T.Vector3(),peekTarget:new T.Vector3()};
    game.hidingSpots=[];
    game.environmentEvents={next:7,activeUntil:0};

    /* ---------- lightweight hiding spots ---------- */
    function addHideSpot(x,z,label){
      const g=new T.Group(); g.position.set(x,0,z); g.userData.hideSpot=true; g.userData.label=label;
      const m=new T.Mesh(new T.BoxGeometry(1.15,1.9,.7),new T.MeshStandardMaterial({color:0x17120f,roughness:1}));
      m.position.y=.95; g.add(m); game.scene.add(g);
      game.hidingSpots.push({group:g,x,z,label,used:0});
    }
    addHideSpot(-6,5,'CLOSET');
    addHideSpot(6,-4,'WARDROBE');
    addHideSpot(-8,-11,'STORAGE CLOSET');

    /* ---------- room memory ---------- */
    const oldPlayer=game.updatePlayer.bind(game);
    game.updatePlayer=function(dt){
      oldPlayer(dt);
      const room=this.houseMemory.roomName(this.player.x,this.player.z);
      const now=performance.now();
      if(this.houseMemory.lastRoom!==room){
        if(this.houseMemory.lastRoom){
          const elapsed=(now-this.houseMemory.lastRoomAt)/1000;
          this.houseMemory.timeByRoom[this.houseMemory.lastRoom]=(this.houseMemory.timeByRoom[this.houseMemory.lastRoom]||0)+elapsed;
        }
        this.houseMemory.rooms[room]=(this.houseMemory.rooms[room]||0)+1;
        if(this.houseMemory.lastRoom && this.houseMemory.lastRoom===room)this.houseMemory.repeatedRoute++;
        this.houseMemory.lastRoom=room; this.houseMemory.lastRoomAt=now;
      }
      if(this.running){this.houseMemory.sprints+=dt;this.memory.sprints+=dt*.35;}
      if(!this.flashlightOn)this.houseMemory.darkness+=dt;
    };

    /* ---------- controlled environmental events ---------- */
    function eventDoor(){
      const doors=[];
      game.scene.traverse(o=>{if(o.userData&&o.userData.horrorDoor)doors.push(o);});
      if(!doors.length)return;
      const d=doors[Math.floor(Math.random()*doors.length)];
      d.rotation.y=d.rotation.y>.4?0:.65;
      game.audio.creak();
      game.houseMemory.scares++;
    }
    function eventLight(){game.flickerEvent();game.houseMemory.scares++;}
    function eventKnock(){game.audio.creak();game.houseMemory.scares++;}
    function scheduleEvent(){
      if(game.state!=='PLAYING')return;
      const m=game.houseMemory;
      const intensity=Math.min(1,(m.encounters+m.sprints/8+m.darkness/25+m.scares)/10);
      const roll=Math.random();
      if(roll<.32)eventLight();
      else if(roll<.55)eventDoor();
      else eventKnock();
      game.environmentEvents.next=8+Math.random()*12-intensity*3;
      m.lastEventAt=performance.now();
    }
    const oldUpdateEntity=game.updateEntity.bind(game);
    game.updateEntity=function(dt){
      oldUpdateEntity(dt);
      if(this.state!=='PLAYING')return;
      const m=this.houseMemory,e=this.entity,g=this.entityGroup;
      this.encounter.cooldown-=dt;this.encounter.age+=dt;this.environmentEvents.next-=dt;
      if(this.environmentEvents.next<=0 && this.encounter.cooldown<0) scheduleEvent.call(this);

      /* Convert the original simple states into a controlled horror state machine. */
      const distance=this.player.distanceTo(g.position);
      if(e.state==='OBSERVE' && this.phase>=2 && distance<10 && this.encounter.cooldown<0){
        e.state='STALKING';this.encounter.type='DISTANT_WATCHER';this.encounter.active=true;this.encounter.cooldown=10+Math.random()*8;m.encounters++;m.sightings++;this.audio.whisper();
      }
      if(e.state==='STALKING'){
        const visible=this.isWatcherVisible();
        if(visible && distance<8){
          /* The Watcher backs away when discovered instead of immediately attacking. */
          this.tempDir.subVectors(this.player,g.position);this.tempDir.y=0;
          if(this.tempDir.lengthSq()>0){this.tempDir.normalize();g.position.addScaledVector(this.tempDir,-Math.min(2.4*dt,.12));}
          if(this.encounter.age>2.2){e.state='RETREATING';this.encounter.age=0;}
        } else if(!visible && this.encounter.age>1.4){
          /* Reposition once, then remain still. Never teleport every frame. */
          const angle=Math.random()*Math.PI*2,r=7+Math.random()*5;
          g.position.set(clamp(this.player.x+Math.cos(angle)*r,-10.5,10.5),0,clamp(this.player.z+Math.sin(angle)*r,-13,13));
          e.state='HIDING';this.encounter.age=0;
        }
      } else if(e.state==='HIDING'){
        if(this.encounter.age>3.5+Math.random()*3){e.state='OBSERVE';this.encounter.active=false;this.encounter.age=0;}
      } else if(e.state==='RETREATING'){
        if(this.encounter.age>1.4){e.state='OBSERVE';this.encounter.active=false;this.encounter.age=0;}
      }

      /* Behaviour remembers the player's habits. */
      const aggression=(m.sprints/18)+(m.darkness/80)+(m.sightings/8)+(this.fear/180);
      if(this.phase>=4 && aggression>1.0 && e.state==='OBSERVE' && this.encounter.cooldown<0 && Math.random()<dt*.035){
        e.state='HUNTING';this.encounter.age=0;m.encounters++;
      }
      if(e.state==='HUNTING'){
        this.tempDir.subVectors(this.player,g.position);this.tempDir.y=0;
        const d=this.tempDir.length();if(d>0)this.tempDir.normalize();
        g.lookAt(this.player.x,1.5,this.player.z);g.position.addScaledVector(this.tempDir,(e.speed*.72)*dt);
        if(d<2.8){e.state='CHASE';e.speed=Math.max(e.speed,3.05);this.encounter.age=0;}
        else if(this.encounter.age>5.5){e.state='OBSERVE';this.encounter.cooldown=12;this.encounter.age=0;}
      }
      if(e.state==='CHASE' && this.encounter.age>0){
        this.encounter.age+=dt;
      }
      if(this.fear>88 && this.houseMemory.fearPeaks<10){this.houseMemory.fearPeaks++;}
    };

    game.isWatcherVisible=function(){
      const to=this.tempDir.subVectors(this.entityGroup.position,this.camera.position);const d=to.length();if(d<.001)return false;to.normalize();this.camera.getWorldDirection(this.tempLook);return this.tempLook.dot(to)>.78;
    };

    /* ---------- add subtle horror doors ---------- */
    const doorMat=new T.MeshStandardMaterial({color:0x241713,roughness:.88});
    function addDoor(x,z,rot,label){
      const door=new T.Mesh(new T.BoxGeometry(.12,2.5,1.35),doorMat);door.position.set(x,1.25,z);door.rotation.y=rot;door.userData.horrorDoor=true;door.userData.label=label;game.scene.add(door);return door;
    }
    addDoor(-3.95,1.5,Math.PI/2,'LIVING ROOM DOOR');
    addDoor(3.95,1.5,-Math.PI/2,'DINING ROOM DOOR');
    addDoor(-3.95,-5,Math.PI/2,'KITCHEN DOOR');
    addDoor(3.95,-5,-Math.PI/2,'BEDROOM DOOR');

    /* ---------- small cinematic monster animation ---------- */
    const oldRender=game.renderer.render.bind(game.renderer);
    if(!game.renderer.__houseUpgradeRender){
      game.renderer.__houseUpgradeRender=true;
      game.renderer.render=function(scene,camera){
        const r=game.entityGroup;
        if(r){
          const t=game.clock.elapsedTime;
          const chase=game.entity.state==='CHASE'||game.entity.state==='HUNTING';
          r.rotation.z+=(Math.sin(t*(chase?10:1.6))*.012-r.rotation.z)*.12;
          r.scale.setScalar((chase?1:.94)+Math.sin(t*1.3)*.008);
        }
        return oldRender(scene,camera);
      };
    }

    /* ---------- quality-safe atmospheric particles ---------- */
    if(game.quality!=='low'){
      const count=game.quality==='high'?80:35;const geo=new T.BufferGeometry();const pos=new Float32Array(count*3);
      for(let i=0;i<count;i++){pos[i*3]=(Math.random()-.5)*20;pos[i*3+1]=Math.random()*2.7+.1;pos[i*3+2]=(Math.random()-.5)*26;}
      geo.setAttribute('position',new T.BufferAttribute(pos,3));
      const mat=new T.PointsMaterial({color:0x8a8278,size:.018,transparent:true,opacity:.16,depthWrite:false});
      const dust=new T.Points(geo,mat);dust.name='AtmosphericDust';game.scene.add(dust);
    }
    return true;
  }

  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  document.addEventListener('DOMContentLoaded',function(){
    const run=()=>{if(install())return;setTimeout(run,50);};run();
  });
})();
