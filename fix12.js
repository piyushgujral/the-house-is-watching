/* Engine 12: flashlight regression fix. Keep the spotlight in world space because
   Engine 9 updates its position from the camera each frame. */
(function(){
  'use strict';
  function install(){
    const g=window.houseGame,T=window.THREE;
    if(!g||!T||!g.scene||!g.camera||!g.renderer)return false;
    if(g.__fix12)return true;
    g.__fix12=true;

    const light=g.flashlight;
    if(light){
      /* Undo the previous hotfix's camera parenting. Engine 9 intentionally writes
         world-space coordinates to this light every frame. */
      if(light.parent!==g.scene){
        const wp=new T.Vector3();light.getWorldPosition(wp);
        light.parent.remove(light);g.scene.add(light);light.position.copy(wp);
      }
      light.intensity=4.2;
      light.distance=24;
      light.angle=Math.PI/7;
      light.penumbra=.68;
      light.decay=1.15;
      light.visible=true;
      if(g.flashTarget){
        if(g.flashTarget.parent!==g.scene){
          const tp=new T.Vector3();g.flashTarget.getWorldPosition(tp);g.flashTarget.parent.remove(g.flashTarget);g.scene.add(g.flashTarget);g.flashTarget.position.copy(tp);
        }
      }
    }

    /* Guarantee the flashlight state is applied after every Engine 9 update. */
    const oldUpdate=g.updatePlayer&&g.updatePlayer.bind(g);
    if(oldUpdate){
      g.updatePlayer=function(dt){
        oldUpdate(dt);
        const l=this.flashlight;
        if(!l)return;
        l.visible=true;
        l.intensity=this.flashlightOn&&this.battery>0?4.2:0;
        l.distance=24;l.angle=Math.PI/7;l.penumbra=.68;l.decay=1.15;
        /* Engine 9 already positions the light/target from the camera. Re-apply
           after its state change so later extensions cannot leave a stale beam. */
        l.position.copy(this.camera.position);
        if(this.flashTarget){
          this.camera.getWorldDirection(this.tempLook);
          this.flashTarget.position.copy(this.camera.position).addScaledVector(this.tempLook,14);
        }
      };
    }

    /* Mobile and desktop buttons both call toggleLight; make its result explicit. */
    const oldToggle=g.toggleLight&&g.toggleLight.bind(g);
    if(oldToggle&&!g.__fix12Toggle){
      g.__fix12Toggle=true;
      g.toggleLight=function(){
        oldToggle();
        if(this.flashlight){this.flashlight.visible=true;this.flashlight.intensity=this.flashlightOn&&this.battery>0?4.2:0;}
      };
    }
    return true;
  }
  (function boot(){if(!install())setTimeout(boot,40)})();
})();
