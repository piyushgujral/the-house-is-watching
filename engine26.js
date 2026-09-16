/* THE HOUSE IS WATCHING — Engine 26: Co-op Foundation
 * Large gameplay architecture chunk: local party simulation, player state,
 * shared objectives, downed/revive flow, teammate HUD and Watcher targeting hooks.
 * Network transport is intentionally abstract so a real WebSocket/WebRTC layer
 * can replace the local party without rewriting the gameplay state model.
 */
(function(){
'use strict';
function boot(){
 const g=window.houseGame;
 if(!g||!g.scene||!g.player)return setTimeout(boot,150);
 if(g.__engine26)return;g.__engine26=true;
 const root=document.createElement('div');root.id='coop-foundation-hud';root.style.cssText='position:fixed;left:18px;top:112px;min-width:205px;padding:9px 11px;background:rgba(4,4,6,.55);border:1px solid rgba(210,190,170,.2);font:700 10px/1.55 monospace;letter-spacing:1.2px;color:#d9cabb;z-index:34;pointer-events:none;display:none';root.innerHTML='<div style="font-size:9px;opacity:.55;letter-spacing:2px">HOUSE PARTY</div><div id="coop-members"></div><div id="coop-objective" style="margin-top:5px;opacity:.72"></div>';document.body.appendChild(root);
 const members=new Map();
 const local={id:'local',name:'YOU',state:'ALIVE',health:100,revive:0,room:'ENTRY',noise:0,lastSeen:0};members.set(local.id,local);
 const state={mode:'SOLO_READY',partyId:null,sharedStage:0,sharedFlags:{},revives:0,downedCount:0,signal:0};
 function room(){const s=g.scene.scale&&g.scene.scale.x||1,p=g.player,z=p.z/s,x=p.x/s;return z>7?'ENTRY':z>0?'HALL':z>-7?(x<0?'BEDROOM':'STUDY'):z>-13?'RITUAL':'BACK';}
 function syncCampaign(){const c=g.campaign;if(!c)return;state.sharedStage=c.stage||0;state.sharedFlags=Object.assign({},c.flags||{});local.room=room();local.noise=Number(c.pressure||0);}
 function ensureMember(id,name){if(!members.has(id))members.set(id,{id,name:name||('PLAYER '+(members.size+1)),state:'ALIVE',health:100,revive:0,room:'ENTRY',noise:0,lastSeen:0});return members.get(id);}
 function down(id){const m=members.get(id);if(!m||m.state==='DOWNED'||m.state==='DEAD')return;m.state='DOWNED';m.health=0;m.revive=12;state.downedCount++;if(g.worldOverhaul&&g.worldOverhaul.say)g.worldOverhaul.say(m.id==='local'?'YOU ARE DOWN. FIND HELP.':m.name+' IS DOWN.');}
 function revive(id){const m=members.get(id);if(!m||m.state!=='DOWNED')return false;m.state='ALIVE';m.health=45;m.revive=0;state.revives++;state.downedCount=Math.max(0,state.downedCount-1);if(g.worldOverhaul&&g.worldOverhaul.say)g.worldOverhaul.say(m.name+' IS BACK ON THEIR FEET');return true;}
 function updateRevives(dt){members.forEach(m=>{if(m.state==='DOWNED'){m.revive-=dt;if(m.revive<=0){m.state='DEAD';state.downedCount=Math.max(0,state.downedCount-1);if(g.worldOverhaul&&g.worldOverhaul.say)g.worldOverhaul.say(m.name+' WAS LOST TO THE HOUSE');}}});}
 function nearestTarget(){let best=local,bd=Infinity,s=g.scene.scale&&g.scene.scale.x||1;members.forEach(m=>{if(m.state==='DEAD'||m.id==='local'||!m.object)return;const p=m.object.position,d=Math.hypot(g.player.x-p.x,g.player.z-p.z)/s;if(d<bd){bd=d;best=m;}});return best;}
 function render(){const el=root.querySelector('#coop-members'),obj=root.querySelector('#coop-objective');el.innerHTML=Array.from(members.values()).map(m=>'<div>'+ (m.state==='DOWNED'?'DOWN':m.state==='DEAD'?'LOST':m.name)+' <span style="opacity:.45">'+m.room+'</span></div>').join('');const c=g.campaign,e=g.houseEndgame;obj.textContent=e&&e.started&&!e.finished?'SEALS: '+(e.seals||0)+'/3':c?('STAGE '+c.stage):state.mode;root.style.display=(members.size>1||state.mode!=='SOLO_READY')?'block':'none';}
 g.coop={state,members,addRemotePlayer:(id,name)=>{const m=ensureMember(id,name);state.mode='PARTY';render();return m;},updateRemotePlayer:(id,data)=>{const m=ensureMember(id);Object.assign(m,data,{lastSeen:performance.now()});render();},removeRemotePlayer:id=>{members.delete(id);if(members.size===1)state.mode='SOLO_READY';render();},down,revive,nearestTarget,sync:syncCampaign};
 const oldUpdatePlayer=g.updatePlayer.bind(g),oldUpdateEntity=g.updateEntity.bind(g);
 g.updatePlayer=function(dt){oldUpdatePlayer(dt);if(this.state!=='PLAYING')return;syncCampaign();updateRevives(dt);render();};
 g.updateEntity=function(dt){oldUpdateEntity(dt);if(this.state!=='PLAYING'||!this.entity)return;const target=nearestTarget();if(target&&target.id!=='local'&&this.entity.state==='HUNTING')this.entity.targetId=target.id;if(this.entity.state==='CHASE')this.entity.targetId='local';};
 g.coopFoundation={state,members,render};
}
boot();
})();
