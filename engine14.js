/* THE HOUSE IS WATCHING — Engine 14: hiding + survival tension.
 * Adds a real hide/unhide interaction using the existing closets/wardrobes,
 * muffles player movement while hidden, and makes the Watcher search instead
 * of instantly resolving every close encounter.
 */
(function(){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function install(){
    const game=window.houseGame,T=window.THREE;
    if(!game||!T||!game.scene||!game.player)return false;
    if(game.__engine14)return true;
    game.__engine14=true;
    game.hidden=false;
    game.hideSpot=null;
    game.hideBlend=0;
    game.hideCooldown=0;
    game.searchTimer=0;

    const spots=[];
    function spot(x,z,label){
      const root=new T.Group();root.position.set(x,0,z);root.userData.hideSpot=true;
      const wood=new T.MeshStandardMaterial({color:0x15100e,roughness:.95});
      const box=new T.Mesh(new T.BoxGeometry(1.05,2.05,.72),wood);box.position.y=1.025;root.add(box);
      const seam=new T.Mesh(new T.BoxGeometry(.025,1.8,.02),new T.MeshBasicMaterial({color:0x050505}));seam.position.set(0,1.02,.37);root.add(seam);
      root.visible=false;game.scene.add(root);
      spots.push({root,x,z,label});
    }
    /* Invisible interaction anchors: the existing game already contains
       visual furniture here, so we don't add duplicate blocking geometry. */
    spot(-6,5,'CLOSET');spot(6,-4,'WARDROBE');spot(-8,-11,'STORAGE CLOSET');

    function nearest(){
      let best=null,bd=1.65;
      for(const s of spots){const d=Math.hypot(game.player.x-s.x,game.player.z-s.z);if(d<bd){bd=d;best=s;}}
      return best;
    }
    function prompt(show,text){
      const p=document.getElementById('interaction-prompt'),l=document.getElementById('interaction-label'),k=document.getElementById('interaction-key');
      if(!p||!l)return;
      if(show){k.textContent=game.isMobileDevice&&game.isMobileDevice()?'USE':'[E]';l.textContent=text;p.classList.remove('hidden');}
      else if(!game.current)p.classList.add('hidden');
    }
    function enterHide(s){
      if(!s||game.hidden||game.hideCooldown>0||game.state!=='PLAYING')return;
      game.hidden=true;game.hideSpot=s;game.hideBlend=0;game.searchTimer=0;
      game.memory.hides=(game.memory.hides||0)+1;
      if(game.houseMemory)game.houseMemory.hides=(game.houseMemory.hides||0)+1;
      game.audio.click();
      game.flashPrompt('HIDDEN — STAY QUIET');
      /* Move the player just inside the hiding anchor while preserving the
         current room and avoiding a hard camera snap. */
      game.player.x=s.x;game.player.z=s.z+.48;
    }
    function leaveHide(){
      if(!game.hidden)return;
      game.hidden=false;game.hideCooldown=.9;game.audio.creak();game.flashPrompt('LEAVING COVER');
      game.hideSpot=null;
    }
    game.toggleHide=function(){if(game.hidden)leaveHide();else enterHide(nearest());};

    const oldPlayer=game.updatePlayer.bind(game);
    game.updatePlayer=function(dt){
      if(this.hidden){
        /* Freeze movement while concealed; camera remains low enough to sell
           the feeling of being inside a closet without changing the level. */
        this.running=false;this.mobileRun=false;this.joy.x=0;this.joy.y=0;
        this.look.pitch=clamp(this.look.pitch,-1.0,.9);
        this.camera.rotation.order='YXZ';this.camera.rotation.y=this.look.yaw;this.camera.rotation.x=this.look.pitch;
        this.hideBlend=Math.min(1,this.hideBlend+dt*5);
        this.camera.position.set(this.player.x,1.28,this.player.z);
        if(this.flashlight)this.flashlight.intensity=this.flashlightOn?0.45:0;
        if(this.flashlightTarget)this.flashlightTarget.visible=false;
        if(this.battery>0&&this.flashlightOn)this.battery=Math.max(0,this.battery-.25*dt);
      }else{
        oldPlayer(dt);
      }
      this.hideCooldown=Math.max(0,this.hideCooldown-dt);
    };

    const oldInteraction=game.updateInteraction.bind(game);
    game.updateInteraction=function(dt){
      if(this.hidden){
        oldInteraction(dt);
        this.__hideTarget=true;
        prompt(true,'LEAVE '+(this.hideSpot?this.hideSpot.label:'COVER'));
        return;
      }
      oldInteraction(dt);
      if(this.state!=='PLAYING'||this.current)return;
      const s=nearest();
      if(s){this.__hideTarget=s;prompt(true,'HIDE IN '+s.label);}
      else this.__hideTarget=null;
    };

    const oldInteract=game.interactNow.bind(game);
    game.interactNow=function(){
      if(this.__hideTarget&&!this.current&&this.state==='PLAYING'){
        if(this.hidden)leaveHide();else enterHide(this.__hideTarget);
        this.__hideTarget=null;return;
      }
      oldInteract();
    };

    /* While hidden, the Watcher cannot finish a chase by contact alone. It
       waits nearby briefly, then retreats, creating a deliberate hide-and-listen
       moment instead of a cheap instant death. */
    const oldEntity=game.updateEntity.bind(game);
    game.updateEntity=function(dt){
      oldEntity(dt);
      if(this.state!=='PLAYING')return;
      if(this.hidden){
        const d=this.player.distanceTo(this.entityGroup.position);
        if(this.entity.state==='CHASE'||this.entity.state==='HUNTING'){
          this.searchTimer+=dt;
          if(d<3.6){
            this.fear=clamp(this.fear+dt*1.4,0,100);
            if(this.searchTimer>2.8){this.entity.state='HIDING';this.entityGroup.position.set(this.player.x+6,0,this.player.z+4);this.searchTimer=0;}
          }
        }else if(d<5){
          this.fear=clamp(this.fear+dt*.35,0,100);
        }
      }else if(this.entity.state==='HIDING'&&this.entityGroup){
        /* Give the player a short aftermath window after escaping cover. */
        this.searchTimer+=dt;
        if(this.searchTimer>3.5){this.entity.state='OBSERVE';this.searchTimer=0;}
      }
    };

    /* Add a small hidden-state vignette and status text without requiring new
       HTML. */
    const style=document.createElement('style');style.textContent='.house-hidden-vignette{position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle,transparent 20%,rgba(0,0,0,.72) 100%);opacity:0;z-index:25;transition:opacity .2s}.house-hidden-label{position:fixed;left:50%;bottom:18%;transform:translateX(-50%);font:600 11px monospace;letter-spacing:3px;color:#aaa;opacity:0;z-index:26;pointer-events:none}';document.head.appendChild(style);
    const vig=document.createElement('div');vig.className='house-hidden-vignette';document.body.appendChild(vig);
    const lab=document.createElement('div');lab.className='house-hidden-label';lab.textContent='HOLD YOUR BREATH';document.body.appendChild(lab);
    const oldHUD=game.updateHUD?game.updateHUD.bind(game):null;
    if(oldHUD){game.updateHUD=function(){oldHUD();vig.style.opacity=this.hidden?'1':'0';lab.style.opacity=this.hidden?'0.85':'0';};}
    return true;
  }
  function boot(){if(!install())setTimeout(boot,60);}boot();
})();
