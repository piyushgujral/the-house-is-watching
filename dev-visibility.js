/* DEV VISIBILITY PATCH
 * Development-only: make the complete 3D house readable at all times.
 * This deliberately disables horror darkness while level design is underway.
 */
(function(){
  'use strict';
  function boot(){
    const g=window.houseGame,T=window.THREE;
    if(!g||!T||!g.scene||!g.renderer)return setTimeout(boot,50);
    if(g.__devVisibility)return;
    g.__devVisibility=true;

    /* Neutral fill lights across the level. */
    const lights=[
      [0,2.7,11,1.15,0xffd7a8],
      [-7,2.7,4,.95,0xffd2a0],[7,2.7,4,.95,0xffd2a0],
      [-7,2.7,-5,1.05,0xffe0b5],[7,2.7,-5,1.05,0xffe0b5],
      [-7,2.7,-11,.95,0xffd2a0],[7,2.7,-11,.95,0xffd2a0],
      [0,2.65,-1,.75,0xffe8c9]
    ];
    lights.forEach((a,i)=>{
      const l=new T.PointLight(a[4],a[3],10);l.position.set(a[0],a[1],a[2]);l.name='DevRoomLight_'+i;g.scene.add(l);
    });
    const hemi=new T.HemisphereLight(0xc8d5e8,0x4a3528,.62);hemi.name='DevHouseFill';g.scene.add(hemi);

    /* Remove the very heavy fog that is currently obscuring geometry. */
    g.scene.fog=null;
    g.scene.background=new T.Color(0x18202a);
    if(g.ambient)g.ambient.intensity=.55;

    /* Keep the flashlight available and useful, but do not allow it to be the
       only source of visibility during level construction. */
    const old=g.updatePlayer.bind(g);
    g.updatePlayer=function(dt){
      old(dt);
      this.flashlightOn=true;
      this.battery=100;
      if(this.flashlight){this.flashlight.visible=true;this.flashlight.intensity=3.8;this.flashlight.distance=24;}
    };
  }
  boot();
})();
