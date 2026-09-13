/**
 * THE HOUSE IS WATCHING - Engine 8.0 Master Architecture
 * Repository: piyushgujral/the-house-is-watching
 * Platforms: Desktop (WASD + Mouse) & Mobile (Dual Touch Joystick / Drag Look)
 */

(function () {
  'use strict';

  // --- 1. PROCEDURAL AUDIO SYNTHESIZER ---
  class ProceduralAudioEngine {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.ambientGain = null;
      this.isMuted = false;
    }

    init() {
      if (this.ctx) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.startAmbientDrones();
    }

    startAmbientDrones() {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      this.ambientGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(42, this.ctx.currentTime);
      this.ambientGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      osc.connect(this.ambientGain);
      this.ambientGain.connect(this.masterGain);
      osc.start();
    }

    playFootstep() {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(65 + Math.random() * 20, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(12, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.13);
    }

    playDoorCreak() {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(180, this.ctx.currentTime + 0.45);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.52);
    }

    playStinger() {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(550, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, this.ctx.currentTime + 0.65);
      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.7);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.72);
    }

    playHeartbeat(rateMod = 1.0) {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(58, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(22, this.ctx.currentTime + 0.16);
      gain.gain.setValueAtTime(Math.min(0.6, 0.3 * rateMod), this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    }
  }

  // --- 2. PROCEDURAL TEXTURES ---
  function createWallTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e1c1b';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 450; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#151413' : '#262422';
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 3, 8 + Math.random() * 12);
    }
    return new THREE.CanvasTexture(canvas);
  }

  function createFloorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1b140f';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#090705';
    ctx.lineWidth = 3;
    for (let y = 0; y < 256; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
    return new THREE.CanvasTexture(canvas);
  }

  // --- 3. MASTER GAME CLASS ---
  class HouseGame {
    constructor() {
      this.container = document.getElementById('game-container');
      this.audio = new ProceduralAudioEngine();
      this.state = 'START';

      // Persistent Settings
      this.quality = localStorage.getItem('hw_quality') || 'medium';
      this.sensitivity = parseFloat(localStorage.getItem('hw_sens') || '1.2');

      // Vitals & State
      this.fear = 0;
      this.stamina = 100;
      this.battery = 100;
      this.flashlightOn = true;
      this.isSprinting = false;
      this.isMobileRunning = false;

      // Objectives & Items
      this.objectivePhase = 1;
      this.inventory = [];

      // Timing
      this.clock = new THREE.Clock();
      this.lastHeartbeat = 0;
      this.lastStepTime = 0;

      // Inputs & Physics
      this.keys = {};
      this.mouseLook = { yaw: 0, pitch: 0 };
      this.isPointerLocked = false;
      this.joystickDelta = { x: 0, y: 0 };
      this.colliders = [];
      this.interactiveObjects = [];
      this.playerRadius = 0.45;

      this.initThree();
      this.buildHouse();
      this.initEntity();
      this.bindEvents();
      this.setupMobile();
      this.checkOrientation();
      this.updateObjectivesUI();
    }

    initThree() {
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x040406, 0.12);

      this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 50);
      this.playerPos = new THREE.Vector3(0, 1.6, 12);
      this.camera.position.copy(this.playerPos);

      this.renderer = new THREE.WebGLRenderer({
        antialias: this.quality === 'high',
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.applyQualitySettings();
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 0.9;
      this.container.appendChild(this.renderer.domElement);

      this.flashlight = new THREE.SpotLight(0xffecd0, 2.5, 14, Math.PI / 6, 0.45, 1.2);
      this.flashlightTarget = new THREE.Object3D();
      this.scene.add(this.flashlightTarget);
      this.flashlight.target = this.flashlightTarget;
      this.scene.add(this.flashlight);

      this.ambientLight = new THREE.AmbientLight(0x0a0a0f, 0.25);
      this.scene.add(this.ambientLight);

      this.hallwayLight = new THREE.PointLight(0xffb070, 0, 9);
      this.hallwayLight.position.set(0, 2.7, 4);
      this.scene.add(this.hallwayLight);
    }

    applyQualitySettings() {
      let pr = Math.min(window.devicePixelRatio, 1.0);
      if (this.quality === 'medium') pr = Math.min(window.devicePixelRatio, 1.25);
      if (this.quality === 'high') pr = Math.min(window.devicePixelRatio, 1.5);
      this.renderer.setPixelRatio(pr);
    }

    buildHouse() {
      const wallMat = new THREE.MeshStandardMaterial({ map: createWallTexture(), roughness: 0.85 });
      const floorMat = new THREE.MeshStandardMaterial({ map: createFloorTexture(), roughness: 0.7 });
      const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.9 });

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 30), floorMat);
      floor.rotation.x = -Math.PI / 2;
      this.scene.add(floor);

      const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(24, 30), ceilingMat);
      ceiling.position.y = 3.0;
      ceiling.rotation.x = Math.PI / 2;
      this.scene.add(ceiling);

      const addWall = (x, z, w, d, h = 3.0) => {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
        wall.position.set(x, h / 2, z);
        this.scene.add(wall);
        this.colliders.push(new THREE.Box3().setFromObject(wall));
        return wall;
      };

      // Outer Perimeter
      addWall(0, -15, 24, 0.4);
      addWall(0, 15, 24, 0.4);
      addWall(-12, 0, 0.4, 30);
      addWall(12, 0, 0.4, 30);

      // Rooms & Corridors
      addWall(-3, 10, 0.4, 10);
      addWall(3, 10, 0.4, 10);
      addWall(-7, 4, 10, 0.4);
      addWall(7, 4, 10, 0.4);
      addWall(-4, -4, 0.4, 8);
      addWall(4, -4, 0.4, 8);

      // Interactive Items
      this.spawnInteractive('Fuse', new THREE.Vector3(-8, 0.8, 10), 0xffcc33, () => this.collectFuse());
      this.spawnInteractive('Generator', new THREE.Vector3(8, 1.0, 10), 0x4488ff, () => this.activateGenerator());
      this.spawnInteractive('BasementKey', new THREE.Vector3(-8, 0.5, -2), 0xddaa44, () => this.collectKey());
      this.spawnInteractive('DollArtifact', new THREE.Vector3(0, 0.6, -12), 0xcc2222, () => this.collectArtifact());
      this.spawnInteractive('ExitDoor', new THREE.Vector3(0, 1.2, 14.8), 0x88ff88, () => this.tryEscape());
    }

    spawnInteractive(id, pos, color, action) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.35, 0.35),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25 })
      );
      mesh.position.copy(pos);
      this.scene.add(mesh);
      this.interactiveObjects.push({ id, mesh, action });
    }

    initEntity() {
      this.entityGroup = new THREE.Group();
      const bodyMat = new THREE.MeshBasicMaterial({ color: 0x020202 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.15, 2.4, 8), bodyMat);
      body.position.y = 1.2;
      this.entityGroup.add(body);

      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xeeffff });
      const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
      leftEye.position.set(-0.08, 2.2, 0.22);
      const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
      rightEye.position.set(0.08, 2.2, 0.22);
      this.entityGroup.add(leftEye);
      this.entityGroup.add(rightEye);

      this.entityGroup.position.set(0, 0, -8);
      this.scene.add(this.entityGroup);

      this.entity = {
        state: 'STALKING',
        speed: 2.1,
        aggression: 1.0,
        seenTimer: 0
      };
    }

    collectFuse() {
      this.inventory.push('Fuse');
      this.audio.playFootstep();
      this.removeInteractive('Fuse');
      this.objectivePhase = 2;
      this.updateObjectivesUI('Bring the fuse to the East Wing Generator.');
    }

    activateGenerator() {
      if (!this.inventory.includes('Fuse')) {
        this.flashPrompt('REQUIRES FUSE');
        return;
      }
      this.audio.playDoorCreak();
      this.hallwayLight.intensity = 1.5;
      this.objectivePhase = 3;
      this.removeInteractive('Generator');
      this.updateObjectivesUI('Power restored. Find the Basement Key in the Master Bedroom.');
      this.entity.aggression = 1.6;
      this.audio.playStinger();
    }

    collectKey() {
      if (this.objectivePhase < 3) return;
      this.inventory.push('BasementKey');
      this.removeInteractive('BasementKey');
      this.objectivePhase = 4;
      this.updateObjectivesUI('Unlock the North Ritual room and retrieve the Watcher Doll.');
    }

    collectArtifact() {
      if (!this.inventory.includes('BasementKey')) {
        this.flashPrompt('DOOR LOCKED');
        return;
      }
      this.inventory.push('WatcherDoll');
      this.removeInteractive('DollArtifact');
      this.objectivePhase = 5;
      this.updateObjectivesUI('IT IS AWAKE. RUN TO THE FRONT ENTRANCE ESCAPE!');
      this.entity.state = 'CHASE';
      this.entity.speed = 3.65;
      this.audio.playStinger();
    }

    tryEscape() {
      if (this.objectivePhase === 5 && this.inventory.includes('WatcherDoll')) {
        this.triggerWin();
      } else {
        this.flashPrompt('THE DOOR IS JAMMED SHUT');
      }
    }

    removeInteractive(id) {
      const idx = this.interactiveObjects.findIndex(o => o.id === id);
      if (idx !== -1) {
        this.scene.remove(this.interactiveObjects[idx].mesh);
        this.interactiveObjects.splice(idx, 1);
      }
      this.updateInventoryUI();
    }

    updateEntity(delta) {
      if (this.state !== 'PLAYING') return;
      const dist = this.playerPos.distanceTo(this.entityGroup.position);
      const dirToEntity = new THREE.Vector3().subVectors(this.entityGroup.position, this.playerPos).normalize();
      const lookDir = new THREE.Vector3();
      this.camera.getWorldDirection(lookDir);
      const dot = lookDir.dot(dirToEntity);
      const isObserved = dot > 0.85 && dist < 12 && this.flashlightOn && this.battery > 0;

      if (dist < 10) {
        this.fear = Math.min(100, this.fear + (10 - dist) * 4.2 * delta);
      } else {
        this.fear = Math.max(0, this.fear - 3.2 * delta);
      }

      switch (this.entity.state) {
        case 'STALKING':
          this.entityGroup.lookAt(this.playerPos.x, 0, this.playerPos.z);
          if (isObserved) {
            this.entity.seenTimer += delta;
            if (this.entity.seenTimer > 0.6) {
              this.entityGroup.position.set(
                this.playerPos.x + (Math.random() - 0.5) * 16,
                0,
                this.playerPos.z + (Math.random() - 0.5) * 16
              );
              this.entity.seenTimer = 0;
            }
          }
          if (this.objectivePhase >= 3 && Math.random() < 0.005) {
            this.entity.state = 'CHASE';
          }
          break;

        case 'CHASE':
          this.entityGroup.lookAt(this.playerPos.x, 0, this.playerPos.z);
          const step = dirToEntity.multiplyScalar(this.entity.speed * delta);
          this.entityGroup.position.add(step);

          if (dist < 1.25) {
            this.triggerDeath();
          }
          break;
      }

      if (this.hallwayLight.intensity > 0) {
        this.hallwayLight.intensity = 1.2 + (Math.random() - 0.5) * 0.6;
      }
    }

    updatePlayer(delta) {
      if (this.state !== 'PLAYING') return;

      const wantsRun = (this.keys['ShiftLeft'] || this.isMobileRunning) && this.stamina > 10;
      this.isSprinting = wantsRun;
      const moveSpeed = this.isSprinting ? 4.8 : 2.5;

      if (this.isSprinting) {
        this.stamina = Math.max(0, this.stamina - 18 * delta);
      } else {
        this.stamina = Math.min(100, this.stamina + 10 * delta);
      }

      if (this.flashlightOn && this.battery > 0) {
        this.battery = Math.max(0, this.battery - 0.8 * delta);
        if (this.battery === 0) {
          this.flashlight.intensity = 0;
        }
      }

      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = this.mouseLook.yaw;
      this.camera.rotation.x = this.mouseLook.pitch;

      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mouseLook.yaw);
      const side = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mouseLook.yaw);

      const move = new THREE.Vector3();
      if (this.keys['KeyW']) move.add(forward);
      if (this.keys['KeyS']) move.sub(forward);
      if (this.keys['KeyD']) move.add(side);
      if (this.keys['KeyA']) move.sub(side);

      if (Math.abs(this.joystickDelta.x) > 0.08 || Math.abs(this.joystickDelta.y) > 0.08) {
        move.add(side.clone().multiplyScalar(this.joystickDelta.x));
        move.add(forward.clone().multiplyScalar(-this.joystickDelta.y));
      }

      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(moveSpeed * delta);
        const nextX = this.playerPos.x + move.x;
        const nextZ = this.playerPos.z + move.z;

        if (!this.checkWallCollision(nextX, this.playerPos.z)) {
          this.playerPos.x = nextX;
        }
        if (!this.checkWallCollision(this.playerPos.x, nextZ)) {
          this.playerPos.z = nextZ;
        }

        this.lastStepTime += delta * (this.isSprinting ? 1.6 : 1.0);
        if (this.lastStepTime > 0.5) {
          this.audio.playFootstep();
          this.lastStepTime = 0;
        }
      }

      const bob = move.lengthSq() > 0 ? Math.sin(this.clock.getElapsedTime() * (this.isSprinting ? 14 : 9)) * 0.04 : 0;
      this.camera.position.set(this.playerPos.x, 1.6 + bob, this.playerPos.z);

      this.flashlight.position.copy(this.camera.position);
      const flashDir = new THREE.Vector3();
      this.camera.getWorldDirection(flashDir);
      this.flashlightTarget.position.copy(this.camera.position).add(flashDir);

      this.checkInteractionRay();
    }

    checkWallCollision(x, z) {
      const pBox = new THREE.Box3(
        new THREE.Vector3(x - this.playerRadius, 0.2, z - this.playerRadius),
        new THREE.Vector3(x + this.playerRadius, 2.5, z + this.playerRadius)
      );
      for (let i = 0; i < this.colliders.length; i++) {
        if (this.colliders[i].intersectsBox(pBox)) return true;
      }
      return false;
    }

    checkInteractionRay() {
      const ray = new THREE.Raycaster();
      ray.setFromCamera({ x: 0, y: 0 }, this.camera);
      const meshes = this.interactiveObjects.map(o => o.mesh);
      const hits = ray.intersectObjects(meshes);

      const prompt = document.getElementById('interaction-prompt');
      if (hits.length > 0 && hits[0].distance < 2.5) {
        this.currentInteractable = this.interactiveObjects.find(o => o.mesh === hits[0].object);
        prompt.classList.remove('hidden');
      } else {
        this.currentInteractable = null;
        prompt.classList.add('hidden');
      }
    }

    triggerInteract() {
      if (this.currentInteractable) {
        this.currentInteractable.action();
      }
    }

    updateHUD() {
      document.getElementById('stamina-bar-fill').style.width = `${this.stamina}%`;
      document.getElementById('fear-bar-fill').style.width = `${this.fear}%`;
      document.getElementById('battery-bar-fill').style.width = `${this.battery}%`;

      const vignette = document.getElementById('vignette');
      const fearRatio = this.fear / 100;
      vignette.style.boxShadow = `inset 0 0 ${100 + fearRatio * 120}px rgba(0,0,0,${0.85 + fearRatio * 0.15})`;

      if (this.fear > 50 && this.clock.getElapsedTime() - this.lastHeartbeat > (1.2 - fearRatio * 0.7)) {
        this.audio.playHeartbeat(fearRatio);
        this.lastHeartbeat = this.clock.getElapsedTime();
      }
    }

    updateObjectivesUI(text) {
      if (text) document.getElementById('objective-text').innerText = text;
    }

    updateInventoryUI() {
      for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`inv-slot-${i}`);
        slot.innerText = this.inventory[i] ? this.inventory[i] : 'EMPTY';
      }
    }

    flashPrompt(msg) {
      const prompt = document.getElementById('interaction-prompt');
      const label = document.getElementById('interaction-label');
      label.innerText = msg;
      prompt.classList.remove('hidden');
      setTimeout(() => {
        label.innerText = 'INTERACT';
        prompt.classList.add('hidden');
      }, 1200);
    }

    triggerDeath() {
      this.state = 'DEAD';
      document.exitPointerLock?.();
      document.getElementById('hud').classList.add('hidden');
      document.getElementById('death-screen').classList.remove('hidden');
      this.audio.playStinger();
    }

    triggerWin() {
      this.state = 'WON';
      document.exitPointerLock?.();
      document.getElementById('hud').classList.add('hidden');
      document.getElementById('victory-screen').classList.remove('hidden');
    }

    checkOrientation() {
      const warning = document.getElementById('orientation-warning');
      if (this.isMobileDevice() && window.innerHeight > window.innerWidth) {
        warning.classList.remove('hidden');
      } else {
        warning.classList.add('hidden');
      }
    }

    bindEvents() {
      window.addEventListener('resize', () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.applyQualitySettings();
        this.checkOrientation();
      });

      window.addEventListener('orientationchange', () => {
        setTimeout(() => this.checkOrientation(), 150);
      });

      // Settings DOM Bindings
      const qualitySelect = document.getElementById('select-quality');
      if (qualitySelect) {
        qualitySelect.value = this.quality;
        qualitySelect.addEventListener('change', e => {
          this.quality = e.target.value;
          localStorage.setItem('hw_quality', this.quality);
          this.applyQualitySettings();
        });
      }

      const sensSlider = document.getElementById('slider-sens');
      if (sensSlider) {
        sensSlider.value = this.sensitivity;
        sensSlider.addEventListener('input', e => {
          this.sensitivity = parseFloat(e.target.value);
          localStorage.setItem('hw_sens', this.sensitivity.toString());
        });
      }

      // Keyboard Controls
      window.addEventListener('keydown', e => {
        this.keys[e.code] = true;
        if (e.code === 'KeyE') this.triggerInteract();
        if (e.code === 'KeyF' && this.battery > 0) {
          this.flashlightOn = !this.flashlightOn;
          this.flashlight.intensity = this.flashlightOn ? 2.5 : 0;
        }
      });
      window.addEventListener('keyup', e => {
        this.keys[e.code] = false;
      });

      // Pointer Lock
      this.container.addEventListener('click', () => {
        if (this.state === 'PLAYING' && !this.isMobileDevice()) {
          this.container.requestPointerLock();
        }
      });

      document.addEventListener('pointerlockchange', () => {
        this.isPointerLocked = document.pointerLockElement === this.container;
      });

      document.addEventListener('mousemove', e => {
        if (!this.isPointerLocked) return;
        const factor = 0.002 * this.sensitivity;
        this.mouseLook.yaw -= e.movementX * factor;
        this.mouseLook.pitch -= e.movementY * factor;
        this.mouseLook.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, this.mouseLook.pitch));
      });

      // UI Flow
      document.getElementById('btn-play').addEventListener('click', () => {
        this.audio.init();
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');
        this.state = 'PLAYING';
        if (!this.isMobileDevice()) {
          this.container.requestPointerLock();
        } else {
          document.getElementById('mobile-controls').classList.remove('hidden');
        }
      });

      document.getElementById('btn-restart-death').addEventListener('click', () => location.reload());
      document.getElementById('btn-restart-victory').addEventListener('click', () => location.reload());

      document.getElementById('btn-how-to').addEventListener('click', () => {
        document.getElementById('modal-howto').classList.remove('hidden');
      });
      document.getElementById('btn-close-howto').addEventListener('click', () => {
        document.getElementById('modal-howto').classList.add('hidden');
      });
    }

    setupMobile() {
      const joystickZone = document.getElementById('joystick-zone');
      const thumb = document.getElementById('joystick-thumb');
      const maxR = 40;
      let touchId = null;
      let startX = 0, startY = 0;

      joystickZone.addEventListener('touchstart', e => {
        e.preventDefault();
        const t = e.changedTouches[0];
        touchId = t.identifier;
        startX = t.clientX;
        startY = t.clientY;
      });

      joystickZone.addEventListener('touchmove', e => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === touchId) {
            let dx = t.clientX - startX;
            let dy = t.clientY - startY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > maxR) {
              dx = (dx / dist) * maxR;
              dy = (dy / dist) * maxR;
            }
            thumb.style.transform = `translate(${dx}px, ${dy}px)`;
            this.joystickDelta.x = dx / maxR;
            this.joystickDelta.y = dy / maxR;
          }
        }
      });

      const resetJoy = () => {
        touchId = null;
        thumb.style.transform = `translate(0px, 0px)`;
        this.joystickDelta = { x: 0, y: 0 };
      };
      joystickZone.addEventListener('touchend', resetJoy);
      joystickZone.addEventListener('touchcancel', resetJoy);

      const lookZone = document.getElementById('touch-look-zone');
      let lookTouchId = null;
      let lastLookX = 0, lastLookY = 0;

      lookZone.addEventListener('touchstart', e => {
        const t = e.changedTouches[0];
        lookTouchId = t.identifier;
        lastLookX = t.clientX;
        lastLookY = t.clientY;
      });

      lookZone.addEventListener('touchmove', e => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === lookTouchId) {
            const dx = t.clientX - lastLookX;
            const dy = t.clientY - lastLookY;
            lastLookX = t.clientX;
            lastLookY = t.clientY;

            const factor = 0.005 * this.sensitivity;
            this.mouseLook.yaw -= dx * factor;
            this.mouseLook.pitch -= dy * factor;
            this.mouseLook.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, this.mouseLook.pitch));
          }
        }
      });

      document.getElementById('btn-mobile-interact').addEventListener('touchstart', e => {
        e.preventDefault();
        this.triggerInteract();
      });

      document.getElementById('btn-mobile-flash').addEventListener('touchstart', e => {
        e.preventDefault();
        if (this.battery > 0) {
          this.flashlightOn = !this.flashlightOn;
          this.flashlight.intensity = this.flashlightOn ? 2.5 : 0;
        }
      });

      const runBtn = document.getElementById('btn-mobile-run');
      runBtn.addEventListener('touchstart', e => {
        e.preventDefault();
        this.isMobileRunning = true;
      });
      runBtn.addEventListener('touchend', () => { this.isMobileRunning = false; });
    }

    isMobileDevice() {
      return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 850;
    }

    start() {
      const animate = () => {
        requestAnimationFrame(animate);
        const delta = Math.min(this.clock.getDelta(), 0.1);

        this.updatePlayer(delta);
        this.updateEntity(delta);
        this.updateHUD();

        this.renderer.render(this.scene, this.camera);
      };
      animate();
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    const game = new HouseGame();
    game.start();
  });
})();
