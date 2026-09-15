/* THE HOUSE IS WATCHING — Engine 22: Major Gameplay Layer
 * A cohesive room-state, puzzle, pursuit and extraction system.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame,T=window.THREE;if(!g||!T||!g.scene||!g.player||!g.interactables)return setTimeout(boot,100);if(g.__engine22)return;g.__engine22=true;
 const S={started:false,panel:null,fuses:0,breaker:false,chase:false,exitReady:false,exitTimer:0,door:null,route:[],lastRoom:'',rooms:{},t:0};g.majorGameplay=S;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const mat=(c,e=0)=>new T.MeshStandardMaterial({color:c,roughness:.78,emissive:e,emissiveIntensity:e?1.2:0});
 const root=new T.Group();root.name='MajorGameplay';g.scene.add(root);
 function box(x,y,z,w,h,d,m){const q=new T.Mesh(new T.BoxGeometry(w,h,d),m);q.position.set(x,y,z);root.add(q);return q;}
 // Three-room landmarks make the enlarged house readable.
 const rooms=[['ENTRY',0,9],['HALL',0,2],['BEDROOM',-7,-4],['STUDY',7,-4],['RITUAL',0,-10],['BACK',0,-16]];
 rooms.forEach(r=>{S.rooms[r[0]]={x:r[1],z:r[2],visits:0};});
 // Fuse panel: a physical multi-switch puzzle that replaces a single instant objective.
 const panel=new T.Group();panel.position.set(-9,1.8,9);panel.visible=false;S.panel=panel;root.add(panel);
 panel.add(new T.Mesh(new T.BoxGeometry(1.35,1.7,.18),mat(0x181818)));
 for(let i=0;i<3;i++){const sw=new T.Mesh(new T.BoxGeometry(.22,.5,.12),mat(0x55504a));sw.position.set(-.42+i*.42,0,.12);sw.userData.index=i;panel.add(sw);}
 function activatePanel(){panel.visible=true;g.updateObjective('RESTORE POWER: FIND THE THREE BREAKER SWITCHES.');}
 const panelObj={id:'BreakerPanel',label:'USE BREAKER PANEL',group:panel,body:panel,removed:false,action:function(){if(!S.started||S.breaker)return;S.fuses++;if(S.fuses<3){g.flashPrompt('BREAKER '+S.fuses+'/3 — THE HOUSE RESISTS');g.fear=Math.min(100,g.fear+3);if(g.audio)g.audio.click();}else{S.breaker=true;g.flashPrompt('POWER RESTORED');g.updateObjective('FIND THE KEY IN THE STUDY.');g.phase=Math.max(g.phase,1);if(g.audio)g.audio.sting();}}};g.interactables.push(panelObj);
 // Seal hunt gets explicit room direction and a final extraction sequence.
 const oldCollect=g.collect.bind(g);g.collect=function(id){oldCollect(id);if(id==='Fuse'||id==='Generator'){if(!S.started){S.started=true;activatePanel();}}};
 const oldEscape=g.escape.bind(g);g.escape=function(){if(S.chase&&!S.exitReady){this.flashPrompt('THE HOUSE WILL NOT LET YOU LEAVE');return;}if(S.exitReady){this.win();return;}oldEscape();};
 function room(){const x=g.player.x,z=g.player.z;if(z>7)return 'ENTRY';if(z>0)return 'HALL';if(z>-7)return x<0?'BEDROOM':'STUDY';if(z>-13)return 'RITUAL';return 'BACK';}
 function distance(){return Math.hypot(g.player.x-g.entityGroup.position.x,g.player.z-g.entityGroup.position.z);}
 function triggerFinal(){if(S.chase)return;S.chase=true;S.exitReady=false;S.exitTimer=0;g.phase=6;g.updateObjective('THE HOUSE IS COLLAPSING. REACH THE FRONT DOOR.');if(g.entity){g.entity.state='CHASE';g.entity.speed=3.35;}if(g.audio)g.audio.sting();g.flashPrompt('RUN. DO NOT LOOK BACK.');}
 // A timed extraction state gives the ending an actual gameplay climax.
 const oldPlayer=g.updatePlayer.bind(g);g.updatePlayer=function(dt){oldPlayer(dt);if(this.state!=='PLAYING')return;S.t+=dt;const r=room();if(r!==S.lastRoom){S.rooms[r].visits++;S.lastRoom=r;if(S.chase){this.fear=Math.min(100,this.fear+2);}}
   if(S.chase){S.exitTimer+=dt;const d=distance();if(d<5.5)this.fear=Math.min(100,this.fear+7*dt);if(S.exitTimer>2&&d>10){S.exitReady=true;this.updateObjective('THE FRONT DOOR IS OPEN — ESCAPE NOW.');}}
 };
 // Watcher pressure reacts to room transitions instead of only raw distance.
 const oldEntity=g.updateEntity.bind(g);g.updateEntity=function(dt){oldEntity(dt);if(this.state!=='PLAYING'||!this.entity)return;const r=room();if(S.rooms[r]&&S.rooms[r].visits>2&&this.entity.state==='OBSERVE'&&Math.random()<dt*.018){this.entity.state='STALK';this.entity.seen=0;this.fear=Math.min(100,this.fear+2);this.flashPrompt('IT KNOWS THIS ROOM.');}}
 // Give the final chase visible environmental feedback without requiring assets.
 const oldLoop=g.loop.bind(g);g.loop=function(){if(this.state==='PLAYING'){const now=this.clock.elapsedTime;if(S.chase){const pulse=.5+.5*Math.sin(now*10);root.children.forEach(o=>{if(o.userData.collapse)o.scale.y=1-pulse*.12;});if(Math.floor(now)%4===0&&distance()>7&&Math.random()<.012){this.audio&&this.audio.creak&&this.audio.creak();this.flashPrompt('THE HOUSE IS CLOSING IN');}}}oldLoop.apply(this,arguments);};
 // Activate the new system after the core engine is ready; keep it dormant until gameplay starts.
 setTimeout(()=>{if(g.state==='PLAYING')S.started=true;},200);
}
boot();
})();