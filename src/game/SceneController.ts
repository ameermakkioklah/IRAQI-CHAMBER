import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  BotRig,
  createBotModel,
  createContactShadow,
  createMaterials,
  createParlorEnvironment,
  createRevolverModel,
  createRpsToken,
  MaterialPalette,
  RevolverRig,
  TokenRig,
} from './models';
import { soundEngine } from './sound';
import { createProceduralTextures, ProceduralTexturePack } from './textures';
import {
  Bot,
  CameraPreset,
  DuelPhase,
  GameScreen,
  Gun,
  HudSnapshot,
  Move,
  moveName,
  Player,
  RoundOutcome,
  winner,
} from './types';

// Zero-GC reusable math scratchpad
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _colorA = new THREE.Color();

interface Particle {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  scale: number;
  color: THREE.Color;
}

export interface DuelSceneController {
  startMatch: () => void;
  returnToTitle: () => void;
  togglePause: () => void;
  submitPlayerMove: (move: Move) => void;
  setCameraPreset: (preset: CameraPreset) => void;
  cycleCameraPreset: () => void;
  getSnapshot: () => HudSnapshot;
  dispose: () => void;
}

export interface DuelSceneCallbacks {
  onSnapshot: (snapshot: HudSnapshot) => void;
  onContextLost: (lost: boolean) => void;
}

export function createDuelScene(
  mountEl: HTMLDivElement,
  callbacks: DuelSceneCallbacks,
): DuelSceneController {
  // 1. Software WebGL probe (renderer string only; free probe context immediately)
  const isSoftwareGl = (() => {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  })();

  // 2. Renderer setup
  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.setSize(mountEl.clientWidth || window.innerWidth, mountEl.clientHeight || window.innerHeight);
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  mountEl.appendChild(renderer.domElement);

  const onContextLost = (e: Event) => {
    e.preventDefault();
    callbacks.onContextLost(true);
  };
  const onContextRestored = () => {
    callbacks.onContextLost(false);
  };
  renderer.domElement.addEventListener('webglcontextlost', onContextLost);
  renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

  // 3. Scene, fog, camera, and RoomEnvironment IBL
  const scene = new THREE.Scene();
  const bgColor = new THREE.Color(0x0b0c0f);
  scene.background = bgColor;
  scene.fog = new THREE.FogExp2(0x0b0c0f, 0.082);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  scene.environment = pmremGenerator.fromScene(roomEnv, 0.04).texture;
  roomEnv.dispose();
  pmremGenerator.dispose();

  const aspect = (mountEl.clientWidth || window.innerWidth) / (mountEl.clientHeight || window.innerHeight);
  const camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 60);
  camera.position.set(0, 2.5, 4.2);
  camera.lookAt(0, 0.4, 0);

  // 4. Studio 3-Point + Overhead Parlor Lighting Rig (<= 3 shadow casters)
  const hemiLight = new THREE.HemisphereLight(0x8aa4c8, 0x261a14, 0.65);
  scene.add(hemiLight);

  const overheadSpot = new THREE.SpotLight(0xffe1ad, 28, 16, Math.PI * 0.34, 0.62, 1.5);
  overheadSpot.position.set(0, 4.15, 0.15);
  overheadSpot.target.position.set(0, 0, 0);
  overheadSpot.castShadow = true;
  overheadSpot.shadow.mapSize.set(1024, 1024);
  overheadSpot.shadow.bias = -0.0004;
  overheadSpot.shadow.normalBias = 0.02;
  scene.add(overheadSpot);
  scene.add(overheadSpot.target);

  const keyDir = new THREE.DirectionalLight(0xffdca8, 1.25);
  keyDir.position.set(3.2, 4.4, 2.8);
  keyDir.castShadow = true;
  keyDir.shadow.mapSize.set(1024, 1024);
  keyDir.shadow.camera.left = -3.2;
  keyDir.shadow.camera.right = 3.2;
  keyDir.shadow.camera.top = 3.2;
  keyDir.shadow.camera.bottom = -3.2;
  keyDir.shadow.camera.near = 0.5;
  keyDir.shadow.camera.far = 14;
  keyDir.shadow.bias = -0.0005;
  keyDir.shadow.normalBias = 0.02;
  scene.add(keyDir);

  const rimLight = new THREE.DirectionalLight(0x7aa4d4, 0.9);
  rimLight.position.set(-2.8, 2.6, -3.5);
  scene.add(rimLight);

  const muzzleFlashLight = new THREE.PointLight(0xffaa44, 0, 8, 2);
  scene.add(muzzleFlashLight);

  // 5. Procedural Textures, Materials, Environment & Hero Models
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const textures: ProceduralTexturePack = createProceduralTextures(maxAniso);
  const mats: MaterialPalette = createMaterials(textures);

  const { envGroup, dustPoints } = createParlorEnvironment(textures, mats);
  scene.add(envGroup);

  // Hero Revolver on central velvet tray
  const revolver: RevolverRig = createRevolverModel(mats);
  revolver.root.position.set(0, 0.17, 0);
  scene.add(revolver.root);
  const revolverShadow = createContactShadow(textures, 0.6, 0.52);
  revolverShadow.position.y = 0.044;
  scene.add(revolverShadow);

  // Automaton Bot across the table (Z = -2.28, facing +Z)
  const botRig: BotRig = createBotModel(mats);
  botRig.root.position.set(0, -0.45, -2.35);
  botRig.root.scale.setScalar(1.22);
  scene.add(botRig.root);

  // Interactive Player RPS Tokens along front baize arc
  const tokenPositions: Record<Move, THREE.Vector3> = {
    1: new THREE.Vector3(-0.82, 0.012, 1.28),
    2: new THREE.Vector3(0.0, 0.012, 1.38),
    3: new THREE.Vector3(0.82, 0.012, 1.28),
  };

  const playerTokens: Record<Move, TokenRig> = {
    1: createRpsToken(1, mats, true),
    2: createRpsToken(2, mats, true),
    3: createRpsToken(3, mats, true),
  };

  ([1, 2, 3] as Move[]).forEach((m) => {
    const token = playerTokens[m];
    token.root.position.copy(tokenPositions[m]);
    const cShadow = createContactShadow(textures, 0.34, 0.45);
    token.root.add(cShadow);
    scene.add(token.root);
  });

  // Clash Stage Tokens (spawned/shown in center duel arena during reveal)
  const playerClashTokens: Record<Move, TokenRig> = {
    1: createRpsToken(1, mats, false),
    2: createRpsToken(2, mats, false),
    3: createRpsToken(3, mats, false),
  };
  const botClashTokens: Record<Move, TokenRig> = {
    1: createRpsToken(1, mats, false),
    2: createRpsToken(2, mats, false),
    3: createRpsToken(3, mats, false),
  };
  ([1, 2, 3] as Move[]).forEach((m) => {
    playerClashTokens[m].root.visible = false;
    botClashTokens[m].root.visible = false;
    scene.add(playerClashTokens[m].root);
    scene.add(botClashTokens[m].root);
  });

  // Pooled InstancedMesh Particle System (sparks / embers / clash bursts)
  const PARTICLE_COUNT = 48;
  const particleGeo = new THREE.OctahedronGeometry(0.025, 0);
  const particleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const particleMesh = new THREE.InstancedMesh(particleGeo, particleMat, PARTICLE_COUNT);
  particleMesh.frustumCulled = false;
  particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const particles: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      active: false,
      pos: new THREE.Vector3(0, -10, 0),
      vel: new THREE.Vector3(),
      life: 0,
      maxLife: 1,
      scale: 0,
      color: new THREE.Color(0xffb84d),
    });
    _dummy.position.set(0, -10, 0);
    _dummy.scale.setScalar(0.0001);
    _dummy.updateMatrix();
    particleMesh.setMatrixAt(i, _dummy.matrix);
    particleMesh.setColorAt(i, _colorA.setHex(0xffb84d));
  }
  particleMesh.instanceMatrix.needsUpdate = true;
  if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
  particleMesh.computeBoundingSphere();
  scene.add(particleMesh);

  // Expanding Smoke Ring Puff on Gunshot
  const smokeGeo = new THREE.SphereGeometry(0.18, 16, 12);
  const smokeMat = new THREE.MeshStandardMaterial({
    color: 0xc5c8d0,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const smokePuff = new THREE.Mesh(smokeGeo, smokeMat);
  smokePuff.visible = false;
  scene.add(smokePuff);

  // Pre-warm shaders on real GPUs
  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }

  // 6. Game State & Animation Kinematics State
  let gun = new Gun();
  let player = new Player('You');
  let bot = new Bot();

  let screen: GameScreen = 'title';
  let phase: DuelPhase = 'awaiting_move';
  let round = 1;
  let playerMove: Move | null = null;
  let botMove: Move | null = null;
  let lastOutcome: RoundOutcome | null = null;
  let lastLoser: 'player' | 'bot' | null = null;
  let lastFired: boolean | null = null;
  let clicksSurvived = 0;
  let tiesCount = 0;
  let headline = 'Roulette Rock-Paper-Scissors';
  let subline = '1 live round in 6 chambers. Loser pulls the trigger.';
  let cameraPreset: CameraPreset = 'duel';

  // Phase timing & kinematic targets
  let phaseTimer = 0;
  let countdownStep = 0;
  let hitstopTimer = 0;
  let shakeIntensity = 0;
  let hoveredMove: Move | null = null;
  let smokeLife = 0;

  // Revolver kinematic state (damped every frame)
  let cylAngleCurrent = 0;
  let cylAngleTarget = 0;
  let hammerAngleTarget = 0;
  let triggerAngleTarget = 0;
  let revolverYTarget = 0.17;
  let revolverYawTarget = Math.PI * 0.25;
  let revolverPitchTarget = 0;
  let revolverRollTarget = Math.PI * 0.5; // lying flat on tray initially
  let revolverZTarget = 0;
  let revolverRecoil = 0;

  // Bot kinematic state
  let botHeadPitchTarget = 0.12;
  let botHeadYawTarget = 0;
  let botTorsoPitchTarget = 0;
  let botArmRaiseTarget = 0.15;
  let botEyeHexTarget = 0xff9f2e;

  // Camera kinematic state
  const camPosCurrent = new THREE.Vector3(0, 2.35, 3.85);
  const camTargetCurrent = new THREE.Vector3(0, 0.35, -0.2);
  const camPosGoal = new THREE.Vector3(0, 2.35, 3.85);
  const camTargetGoal = new THREE.Vector3(0, 0.35, -0.2);

  function spawnBurst(origin: THREE.Vector3, count: number, hexColor: number, speed: number): void {
    let spawned = 0;
    for (let i = 0; i < particles.length && spawned < count; i++) {
      const p = particles[i];
      if (!p.active) {
        p.active = true;
        p.pos.copy(origin);
        p.vel.set(
          (Math.random() - 0.5) * speed,
          (0.35 + Math.random() * 0.85) * speed * 0.7,
          (Math.random() - 0.5) * speed,
        );
        p.life = 0;
        p.maxLife = 0.35 + Math.random() * 0.45;
        p.scale = 0.7 + Math.random() * 0.9;
        p.color.setHex(hexColor);
        spawned++;
      }
    }
  }

  function hideClashTokens(): void {
    ([1, 2, 3] as Move[]).forEach((m) => {
      playerClashTokens[m].root.visible = false;
      botClashTokens[m].root.visible = false;
    });
  }

  function emitSnapshot(): void {
    callbacks.onSnapshot({
      screen,
      phase,
      round,
      playerAlive: player.isAlive(),
      botAlive: bot.isAlive(),
      currentSlot: gun.getCurrentSlot(),
      bulletSlot: gun.getBulletSlot(),
      remainingChambers: gun.getRemainingChambers(),
      shotProbability: gun.getShotProbability(),
      playerMove,
      botMove,
      lastOutcome,
      lastLoser,
      lastFired,
      headline,
      subline,
      clicksSurvived,
      tiesCount,
      cameraPreset,
    });
  }

  function resetMatchState(): void {
    gun = new Gun();
    player = new Player('You');
    bot = new Bot();
    revolver.setBulletSlot(gun.getBulletSlot());
    round = 1;
    playerMove = null;
    botMove = null;
    lastOutcome = null;
    lastLoser = null;
    lastFired = null;
    clicksSurvived = 0;
    tiesCount = 0;
    phase = 'awaiting_move';
    phaseTimer = 0;
    countdownStep = 0;
    hitstopTimer = 0;
    shakeIntensity = 0;
    hideClashTokens();

    // Cylinder spin reset
    cylAngleTarget = Math.PI * 4;
    cylAngleCurrent = 0;
    hammerAngleTarget = 0;
    triggerAngleTarget = 0;
    revolverYTarget = 0.17;
    revolverZTarget = 0;
    revolverYawTarget = Math.PI * 0.28;
    revolverPitchTarget = 0;
    revolverRollTarget = Math.PI * 0.5;
    revolverRecoil = 0;

    botHeadPitchTarget = 0.1;
    botHeadYawTarget = 0;
    botTorsoPitchTarget = 0;
    botArmRaiseTarget = 0.12;
    botEyeHexTarget = 0xff9f2e;

    headline = 'Choose Your Hand';
    subline = 'Select Rock, Paper, or Scissors on the table or press 1 · 2 · 3';
  }

  function startMatch(): void {
    soundEngine.playCylinderSpin();
    resetMatchState();
    screen = 'playing';
    emitSnapshot();
  }

  function returnToTitle(): void {
    resetMatchState();
    screen = 'title';
    emitSnapshot();
  }

  function togglePause(): void {
    if (screen === 'playing') {
      screen = 'paused';
      emitSnapshot();
    } else if (screen === 'paused') {
      screen = 'playing';
      emitSnapshot();
    }
  }

  function setCameraPreset(preset: CameraPreset): void {
    cameraPreset = preset;
    emitSnapshot();
  }

  function cycleCameraPreset(): void {
    const order: CameraPreset[] = ['duel', 'cylinder', 'overhead'];
    const idx = order.indexOf(cameraPreset);
    cameraPreset = order[(idx + 1) % order.length];
    emitSnapshot();
  }

  function submitPlayerMove(move: Move): void {
    if (screen !== 'playing' || phase !== 'awaiting_move') return;
    if (!player.isAlive() || !bot.isAlive()) return;

    soundEngine.playSelect();
    playerMove = move;
    botMove = bot.chooseMove();
    lastOutcome = null;
    lastLoser = null;
    lastFired = null;

    phase = 'countdown';
    phaseTimer = 0;
    countdownStep = 0;
    headline = 'Hands Ready';
    subline = 'Rock... Paper... Scissors...';
    botEyeHexTarget = 0x38bdf8;
    botArmRaiseTarget = 1.05;
    emitSnapshot();
  }

  // 7. Pointer Raycasting for Player Tokens on Layer 1
  const raycaster = new THREE.Raycaster();
  raycaster.layers.set(1);
  const pointerNdc = new THREE.Vector2();
  const hoverTargets = ([1, 2, 3] as Move[]).map((m) => playerTokens[m].hitProxy);
  let lastHoverCheck = 0;

  function updatePointerNdc(e: PointerEvent): void {
    const rect = renderer.domElement.getBoundingClientRect();
    pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  const onPointerMove = (e: PointerEvent) => {
    if (screen !== 'playing' || phase !== 'awaiting_move') {
      if (hoveredMove !== null) {
        hoveredMove = null;
        renderer.domElement.style.cursor = 'default';
      }
      return;
    }
    const now = performance.now();
    if (now - lastHoverCheck < 35) return;
    lastHoverCheck = now;

    updatePointerNdc(e);
    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObjects(hoverTargets, false);
    const nextHover = hits.length > 0 ? (hits[0].object.userData.move as Move) : null;
    if (nextHover !== hoveredMove) {
      hoveredMove = nextHover;
      renderer.domElement.style.cursor = hoveredMove ? 'pointer' : 'default';
      if (hoveredMove) soundEngine.playHover();
    }
  };

  const onPointerDown = (e: PointerEvent) => {
    if (screen !== 'playing' || phase !== 'awaiting_move') return;
    updatePointerNdc(e);
    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObjects(hoverTargets, false);
    if (hits.length > 0) {
      const m = hits[0].object.userData.move as Move;
      submitPlayerMove(m);
    }
  };

  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);

  // 8. Resize handling
  const onResize = () => {
    const w = mountEl.clientWidth || window.innerWidth;
    const h = mountEl.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  };
  window.addEventListener('resize', onResize);

  // 9. Duel Phase State Machine Advancement
  function advanceDuelState(dt: number): void {
    if (screen !== 'playing') return;
    phaseTimer += dt;

    if (phase === 'countdown') {
      const stepIndex = Math.floor(phaseTimer / 0.24) + 1;
      if (stepIndex > countdownStep && stepIndex <= 3) {
        countdownStep = stepIndex;
        soundEngine.playCountdownTap(countdownStep);
        botArmRaiseTarget = countdownStep % 2 === 1 ? 1.22 : 0.78;
      }

      if (phaseTimer >= 0.75 && playerMove && botMove) {
        phase = 'reveal';
        phaseTimer = 0;

        // Show clash tokens in center arena
        hideClashTokens();
        const pTok = playerClashTokens[playerMove];
        const bTok = botClashTokens[botMove];
        pTok.root.visible = true;
        bTok.root.visible = true;
        pTok.root.position.set(0, 0.35, 0.72);
        bTok.root.position.set(0, 0.35, -0.72);
        pTok.root.scale.setScalar(1.25);
        bTok.root.scale.setScalar(1.25);

        botArmRaiseTarget = 0.45;

        const outcome = winner(playerMove, botMove);
        lastOutcome = outcome;
        soundEngine.playClash(outcome);

        if (outcome === 0) {
          tiesCount++;
          headline = `Tie — Both Played ${moveName(playerMove)}`;
          subline = 'No trigger pulled. Draw again.';
          botEyeHexTarget = 0xfbbf24;
          spawnBurst(_vec3A.set(0, 0.42, 0), 14, 0xfbbf24, 2.2);
        } else if (outcome === 1) {
          lastLoser = 'bot';
          headline = `${moveName(playerMove)} Beats ${moveName(botMove)}`;
          subline = 'You win the round. Bot must pull the trigger...';
          botEyeHexTarget = 0xef4444;
          spawnBurst(_vec3A.set(0, 0.42, -0.35), 18, 0x34d399, 2.8);
        } else {
          lastLoser = 'player';
          headline = `${moveName(botMove)} Beats ${moveName(playerMove)}`;
          subline = 'Bot wins the round. You must pull the trigger...';
          botEyeHexTarget = 0x34d399;
          spawnBurst(_vec3A.set(0, 0.42, 0.35), 18, 0xef4444, 2.8);
        }
        emitSnapshot();
      }
    } else if (phase === 'reveal') {
      // Animate clash tokens slamming together slightly
      if (playerMove && botMove) {
        const pTok = playerClashTokens[playerMove];
        const bTok = botClashTokens[botMove];
        const t = Math.min(phaseTimer / 0.3, 1);
        const zSep = THREE.MathUtils.lerp(0.72, 0.36, t);
        pTok.root.position.z = zSep;
        bTok.root.position.z = -zSep;
        pTok.root.position.y = 0.32 + Math.sin(t * Math.PI) * 0.14;
        bTok.root.position.y = 0.32 + Math.sin(t * Math.PI) * 0.14;
      }

      if (phaseTimer >= 1.1) {
        hideClashTokens();
        if (lastOutcome === 0) {
          // Tie: immediately reset to awaiting_move
          round++;
          playerMove = null;
          botMove = null;
          phase = 'awaiting_move';
          phaseTimer = 0;
          botArmRaiseTarget = 0.12;
          botEyeHexTarget = 0xff9f2e;
          headline = 'Tie — Draw Again';
          subline = 'Choose Rock, Paper, or Scissors.';
          emitSnapshot();
        } else {
          // Loser must pull the trigger
          phase = 'trigger_aim';
          phaseTimer = 0;
          revolverRollTarget = 0; // stand upright!
          revolverYTarget = 0.72;
          if (lastLoser === 'bot') {
            // Aim barrel (-Z) toward Bot
            revolverYawTarget = Math.PI;
            revolverZTarget = -0.32;
            revolverPitchTarget = -0.06;
            botHeadPitchTarget = -0.1;
            headline = 'Bot Takes the Revolver';
            subline = `Chamber ${gun.getCurrentSlot() + 1} of 6 (${gun.getShotProbability()}% live)`;
          } else {
            // Aim barrel (+Z) toward Player
            revolverYawTarget = 0;
            revolverZTarget = 0.32;
            revolverPitchTarget = -0.08;
            botHeadPitchTarget = 0.15;
            headline = 'Your Turn at the Trigger';
            subline = `Chamber ${gun.getCurrentSlot() + 1} of 6 (${gun.getShotProbability()}% live)`;
          }
          emitSnapshot();
        }
      }
    } else if (phase === 'trigger_aim') {
      if (phaseTimer >= 0.7) {
        phase = 'trigger_cock';
        phaseTimer = 0;
        hammerAngleTarget = 0.65;
        soundEngine.playHammerCock();
        headline = lastLoser === 'bot' ? 'Bot Cocks the Hammer...' : 'Hammer Cocked...';
        emitSnapshot();
      }
    } else if (phase === 'trigger_cock') {
      if (phaseTimer >= 0.78) {
        // Pull trigger!
        triggerAngleTarget = -0.45;
        hammerAngleTarget = 0.0;
        const fired = gun.pullTrigger();
        lastFired = fired;
        cylAngleTarget = Math.PI * 4 + gun.getCurrentSlot() * (Math.PI / 3);

        phase = 'trigger_result';
        phaseTimer = 0;

        if (fired) {
          soundEngine.playGunshot();
          hitstopTimer = 0.065;
          shakeIntensity = 0.24;
          revolverRecoil = 0.42;

          // Muzzle flash & sparks
          revolver.muzzlePoint.getWorldPosition(_vec3A);
          muzzleFlashLight.position.copy(_vec3A);
          muzzleFlashLight.intensity = 18;
          smokePuff.position.copy(_vec3A);
          smokePuff.scale.setScalar(0.4);
          smokePuff.visible = true;
          smokeLife = 1.0;
          spawnBurst(_vec3A, 32, 0xffb347, 5.5);

          if (lastLoser === 'bot') {
            bot.die();
            botTorsoPitchTarget = -0.55;
            botHeadPitchTarget = 0.65;
            botEyeHexTarget = 0x111111;
            headline = 'BANG! Automaton Eliminated';
            subline = `Live round found in chamber ${gun.getCurrentSlot()}. You survive.`;
            soundEngine.playOutcome(true);
          } else {
            player.die();
            headline = 'BANG! Chamber Fired';
            subline = `Live round found in chamber ${gun.getCurrentSlot()}. Match over.`;
            soundEngine.playOutcome(false);
          }
        } else {
          soundEngine.playDryClick();
          clicksSurvived++;
          revolverRecoil = 0.07;
          shakeIntensity = 0.025;
          headline = lastLoser === 'bot' ? '*Click* — Bot Is Safe' : '*Click* — You Survived';
          subline = `${gun.getRemainingChambers()} chambers remaining.`;
        }
        emitSnapshot();
      }
    } else if (phase === 'trigger_result') {
      if (phaseTimer >= 0.22) {
        triggerAngleTarget = 0;
      }

      if (lastFired) {
        if (phaseTimer >= 1.55) {
          phase = 'finished';
          screen = player.isAlive() ? 'victory' : 'gameover';
          emitSnapshot();
        }
      } else {
        if (phaseTimer >= 1.35) {
          // Return revolver to velvet tray and start next RPS round
          round++;
          playerMove = null;
          botMove = null;
          phase = 'awaiting_move';
          phaseTimer = 0;

          revolverRollTarget = Math.PI * 0.5;
          revolverYTarget = 0.17;
          revolverZTarget = 0;
          revolverPitchTarget = 0;
          revolverYawTarget = Math.PI * 0.28 + (round % 3) * 0.15;

          botHeadPitchTarget = 0.1;
          botArmRaiseTarget = 0.12;
          botEyeHexTarget = 0xff9f2e;

          headline = `Round ${round} — Choose Your Hand`;
          subline = `Chamber ${gun.getCurrentSlot() + 1} of 6 up next (${gun.getShotProbability()}% live).`;
          emitSnapshot();
        }
      }
    }
  }

  // 10. Frame Loop (with software-WebGL afterDraw pacing)
  let frameId = 0;
  let lastTime = performance.now();
  let elapsedTotal = 0;
  let disposed = false;

  function afterDraw(cb: () => void) {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        frameId = window.setTimeout(cb, 80);
      }
    };
    frameId = window.setTimeout(poll, 5);
  }

  function updateFrame(rawDt: number): void {
    const dt = Math.min(rawDt, 0.05);
    elapsedTotal += dt;

    // Hitstop simulation freeze on heavy gunshot impact
    if (hitstopTimer > 0) {
      hitstopTimer -= dt;
      return;
    }

    advanceDuelState(dt);

    // Damped Revolver Kinematics
    revolver.root.position.y = THREE.MathUtils.damp(revolver.root.position.y, revolverYTarget, 8, dt);
    revolver.root.position.z = THREE.MathUtils.damp(revolver.root.position.z, revolverZTarget, 8, dt);
    revolver.root.rotation.y = THREE.MathUtils.damp(revolver.root.rotation.y, revolverYawTarget, 7, dt);

    revolverRecoil = THREE.MathUtils.damp(revolverRecoil, 0, 12, dt);
    revolver.gunPivot.rotation.z = THREE.MathUtils.damp(revolver.gunPivot.rotation.z, revolverRollTarget, 9, dt);
    revolver.gunPivot.rotation.x = THREE.MathUtils.damp(
      revolver.gunPivot.rotation.x,
      revolverPitchTarget - revolverRecoil,
      14,
      dt,
    );
    revolver.gunPivot.position.z = THREE.MathUtils.damp(
      revolver.gunPivot.position.z,
      -revolverRecoil * 0.28,
      14,
      dt,
    );

    cylAngleCurrent = THREE.MathUtils.damp(cylAngleCurrent, cylAngleTarget, 11, dt);
    revolver.cylinderGroup.rotation.z = cylAngleCurrent;
    revolver.hammerPivot.rotation.x = THREE.MathUtils.damp(
      revolver.hammerPivot.rotation.x,
      hammerAngleTarget,
      16,
      dt,
    );
    revolver.triggerPivot.rotation.x = THREE.MathUtils.damp(
      revolver.triggerPivot.rotation.x,
      triggerAngleTarget,
      18,
      dt,
    );

    // Contact shadow follows revolver height softly
    revolverShadow.position.z = revolver.root.position.z;
    const shadowFade = THREE.MathUtils.clamp(1 - (revolver.root.position.y - 0.17) * 0.85, 0.15, 0.55);
    (revolverShadow.material as THREE.MeshBasicMaterial).opacity = shadowFade;

    // Bot Idle & Reactive Kinematics
    const breath = bot.isAlive() ? Math.sin(elapsedTotal * 1.9) * 0.025 : 0;
    botRig.torsoGroup.rotation.x = THREE.MathUtils.damp(
      botRig.torsoGroup.rotation.x,
      botTorsoPitchTarget + breath,
      6,
      dt,
    );
    botRig.headGroup.rotation.x = THREE.MathUtils.damp(
      botRig.headGroup.rotation.x,
      botHeadPitchTarget + breath * 0.6,
      7,
      dt,
    );
    botRig.headGroup.rotation.y = THREE.MathUtils.damp(
      botRig.headGroup.rotation.y,
      botHeadYawTarget + (bot.isAlive() ? Math.sin(elapsedTotal * 0.7) * 0.06 : 0.22),
      4,
      dt,
    );
    botRig.rightArmPivot.rotation.x = THREE.MathUtils.damp(
      botRig.rightArmPivot.rotation.x,
      -botArmRaiseTarget,
      10,
      dt,
    );
    _colorA.setHex(botEyeHexTarget);
    botRig.eyeLeftMat.emissive.lerp(_colorA, 1 - Math.exp(-8 * dt));
    botRig.eyeRightMat.emissive.copy(botRig.eyeLeftMat.emissive);
    botRig.eyeLeftMat.emissiveIntensity = bot.isAlive() ? 1.6 : 0.05;
    botRig.eyeRightMat.emissiveIntensity = bot.isAlive() ? 1.6 : 0.05;

    // Interactive Player Token Hover / Selection Lift
    ([1, 2, 3] as Move[]).forEach((m) => {
      const tok = playerTokens[m];
      const isHovered = hoveredMove === m && screen === 'playing' && phase === 'awaiting_move';
      const isSelected = playerMove === m && phase !== 'awaiting_move';
      const liftY = isHovered ? 0.095 : isSelected ? 0.065 : 0.012;
      const targetScale = isHovered ? 1.12 : 1.0;

      tok.root.position.y = THREE.MathUtils.damp(tok.root.position.y, liftY, 12, dt);
      const nextScale = THREE.MathUtils.damp(tok.root.scale.x, targetScale, 12, dt);
      tok.root.scale.setScalar(nextScale);
      tok.visualGroup.rotation.y = THREE.MathUtils.damp(
        tok.visualGroup.rotation.y,
        isHovered ? Math.sin(elapsedTotal * 3.5) * 0.22 : 0,
        8,
        dt,
      );
      _colorA.setHex(isHovered || isSelected ? 0xffd166 : 0xd4a853);
      tok.plinthRingMat.color.lerp(_colorA, 1 - Math.exp(-10 * dt));
      tok.plinthRingMat.emissive.setHex(isHovered || isSelected ? 0x6b4b12 : 0x000000);
    });

    // Camera Goal Selection (Title orbit vs Duel presets vs Trigger tension angles)
    if (screen === 'title') {
      const angle = elapsedTotal * 0.24;
      camPosGoal.set(Math.sin(angle) * 2.8, 1.85 + Math.sin(elapsedTotal * 0.35) * 0.12, Math.cos(angle) * 2.8);
      camTargetGoal.set(0, 0.25, -0.15);
    } else if (phase === 'trigger_aim' || phase === 'trigger_cock' || phase === 'trigger_result') {
      if (lastLoser === 'player') {
        camPosGoal.set(0.26, 1.18, 2.25);
        camTargetGoal.set(0, 0.65, 0.15);
      } else {
        camPosGoal.set(0.75, 1.38, 1.95);
        camTargetGoal.set(0, 0.65, -0.85);
      }
    } else if (cameraPreset === 'cylinder') {
      camPosGoal.set(1.15, 1.12, 1.35);
      camTargetGoal.set(0, 0.22, 0.0);
    } else if (cameraPreset === 'overhead') {
      camPosGoal.set(0, 3.85, 1.55);
      camTargetGoal.set(0, 0.0, 0.1);
    } else {
      // 'duel' preset
      camPosGoal.set(0, 2.15, 3.55);
      camTargetGoal.set(0, 0.36, -0.22);
    }

    camPosCurrent.x = THREE.MathUtils.damp(camPosCurrent.x, camPosGoal.x, 5.5, dt);
    camPosCurrent.y = THREE.MathUtils.damp(camPosCurrent.y, camPosGoal.y, 5.5, dt);
    camPosCurrent.z = THREE.MathUtils.damp(camPosCurrent.z, camPosGoal.z, 5.5, dt);

    camTargetCurrent.x = THREE.MathUtils.damp(camTargetCurrent.x, camTargetGoal.x, 6.5, dt);
    camTargetCurrent.y = THREE.MathUtils.damp(camTargetCurrent.y, camTargetGoal.y, 6.5, dt);
    camTargetCurrent.z = THREE.MathUtils.damp(camTargetCurrent.z, camTargetGoal.z, 6.5, dt);

    // Decaying camera shake
    shakeIntensity = THREE.MathUtils.damp(shakeIntensity, 0, 9, dt);
    _vec3B.copy(camPosCurrent);
    if (shakeIntensity > 0.001) {
      _vec3B.x += (Math.random() - 0.5) * shakeIntensity;
      _vec3B.y += (Math.random() - 0.5) * shakeIntensity;
    }
    camera.position.copy(_vec3B);
    camera.lookAt(camTargetCurrent);

    // Muzzle flash & smoke decay
    muzzleFlashLight.intensity = THREE.MathUtils.damp(muzzleFlashLight.intensity, 0, 22, dt);
    if (smokeLife > 0) {
      smokeLife = Math.max(0, smokeLife - dt * 0.85);
      smokePuff.position.y += dt * 0.45;
      smokePuff.scale.addScalar(dt * 1.45);
      smokeMat.opacity = smokeLife * 0.42;
      if (smokeLife <= 0) smokePuff.visible = false;
    }

    // Floating dust drift
    dustPoints.rotation.y = elapsedTotal * 0.04;

    // Update pooled particles
    let particlesDirty = false;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (!p.active) continue;
      particlesDirty = true;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        _dummy.position.set(0, -10, 0);
        _dummy.scale.setScalar(0.0001);
      } else {
        p.vel.y -= 9.5 * dt;
        p.pos.addScaledVector(p.vel, dt);
        if (p.pos.y < 0.02) {
          p.pos.y = 0.02;
          p.vel.y *= -0.35;
          p.vel.x *= 0.7;
          p.vel.z *= 0.7;
        }
        const fade = 1 - p.life / p.maxLife;
        _dummy.position.copy(p.pos);
        _dummy.rotation.set(p.life * 8, p.life * 5, 0);
        _dummy.scale.setScalar(p.scale * fade);
        particleMesh.setColorAt(i, p.color);
      }
      _dummy.updateMatrix();
      particleMesh.setMatrixAt(i, _dummy.matrix);
    }
    if (particlesDirty) {
      particleMesh.instanceMatrix.needsUpdate = true;
      if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
    }
  }

  function tick(): void {
    if (disposed) return;
    const now = performance.now();
    const rawDt = (now - lastTime) / 1000;
    lastTime = now;

    updateFrame(rawDt);
    renderer.render(scene, camera);

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }
  }

  emitSnapshot();
  if (isSoftwareGl) {
    afterDraw(tick);
  } else {
    frameId = requestAnimationFrame(tick);
  }

  return {
    startMatch,
    returnToTitle,
    togglePause,
    submitPlayerMove,
    setCameraPreset,
    cycleCameraPreset,
    getSnapshot: () => ({
      screen,
      phase,
      round,
      playerAlive: player.isAlive(),
      botAlive: bot.isAlive(),
      currentSlot: gun.getCurrentSlot(),
      bulletSlot: gun.getBulletSlot(),
      remainingChambers: gun.getRemainingChambers(),
      shotProbability: gun.getShotProbability(),
      playerMove,
      botMove,
      lastOutcome,
      lastLoser,
      lastFired,
      headline,
      subline,
      clicksSurvived,
      tiesCount,
      cameraPreset,
    }),
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
      textures.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mountEl) {
        mountEl.removeChild(renderer.domElement);
      }
    },
  };
}
