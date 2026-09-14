/* DEVELOPMENT LIGHT MODE
 * Keep the prototype clearly visible while gameplay systems are being built.
 * No battery drain, no darkness, no forced flashlight-off state.
 */
(function(){
  'use strict';
  function boot(){
    const game=window.houseGame;
    if(!game||!game.renderer||!game.scene)return setTimeout(boot,50);
    if(game.__devLightMode)return;
    game.__devLightMode=true;
    game.flashlightOn=true;
    game.battery=100;
    game.__devLightTick=0;

    const oldUpdatePlayer=game.updatePlayer.bind(game);
    game.updatePlayer=function(dt){
      oldUpdatePlayer(dt);
      /* Development builds keep the player illuminated indefinitely. */
      this.flashlightOn=true;
      this.battery=100;
      if(this.flashlight){
        this.flashlight.visible=true;
        this.flashlight.intensity=3.6;
        this.flashlight.distance=22;
      }
      if(this.ambient)this.ambient.intensity=Math.max(.52,this.ambient.intensity);
    };

    /* Stop the atmosphere systems from intentionally blacking out the scene. */
    const oldFlicker=game.flickerEvent;
    game.flickerEvent=function(){
      if(this.tempLight)this.tempLight.intensity=Math.max(this.tempLight.intensity,.35);
      this.flashlightOn=true;
      this.battery=100;
    };

    const oldToggle=game.toggleLight;
    game.toggleLight=function(){
      this.flashlightOn=true;
      this.battery=100;
      if(this.flashlight)this.flashlight.intensity=3.6;
      if(this.audio)this.audio.click();
    };

    /* A modest developer fill light keeps rooms readable without removing the
       directional flashlight look. It can be removed later for final horror. */
    const fill=new THREE.HemisphereLight(0x8890a0,0x18120f,.32);
    fill.name='DevelopmentVisibilityLight';
    game.scene.add(fill);
  }
  boot();
})();
