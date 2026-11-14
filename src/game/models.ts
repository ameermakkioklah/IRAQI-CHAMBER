import * as THREE from 'three';
import { Move } from './types';
import { ProceduralTexturePack } from './textures';

export interface RevolverRig {
  root: THREE.Group;
  gunPivot: THREE.Group;
  cylinderGroup: THREE.Group;
  hammerPivot: THREE.Group;
  triggerPivot: THREE.Group;
  muzzlePoint: THREE.Object3D;
  brassBulletMesh: THREE.Mesh;
  setBulletSlot: (slotIndex: number) => void;
}

export interface BotRig {
  root: THREE.Group;
  torsoGroup: THREE.Group;
  headGroup: THREE.Group;
  eyeLeftMat: THREE.MeshStandardMaterial;
  eyeRightMat: THREE.MeshStandardMaterial;
  rightArmPivot: THREE.Group;
  forearmPivot: THREE.Group;
  handAnchor: THREE.Group;
}

export interface TokenRig {
  root: THREE.Group;
  visualGroup: THREE.Group;
  hitProxy: THREE.Mesh;
  plinthRingMat: THREE.MeshStandardMaterial;
  move: Move;
}

export interface MaterialPalette {
  bluedSteel: THREE.MeshPhysicalMaterial;
  brushedChrome: THREE.MeshPhysicalMaterial;
  agedBrass: THREE.MeshPhysicalMaterial;
  walnutWood: THREE.MeshStandardMaterial;
  darkIron: THREE.MeshStandardMaterial;
  basaltStone: THREE.MeshStandardMaterial;
  parchment: THREE.MeshStandardMaterial;
  crimsonWax: THREE.MeshStandardMaterial;
  velvetTray: THREE.MeshStandardMaterial;
}

export function createMaterials(textures: ProceduralTexturePack): MaterialPalette {
  return {
    bluedSteel: new THREE.MeshPhysicalMaterial({
      color: 0x1e2631,
      metalness: 0.94,
      roughness: 0.24,
      anisotropy: 0.75,
      bumpMap: textures.brushedMetalBump,
      bumpScale: 0.004,
      clearcoat: 0.35,
      clearcoatRoughness: 0.2,
    }),
    brushedChrome: new THREE.MeshPhysicalMaterial({
      color: 0xc8ced6,
      metalness: 0.96,
      roughness: 0.16,
      anisotropy: 0.8,
      bumpMap: textures.brushedMetalBump,
      bumpScale: 0.003,
    }),
    agedBrass: new THREE.MeshPhysicalMaterial({
      color: 0xd4a853,
      metalness: 0.92,
      roughness: 0.22,
      anisotropy: 0.7,
    }),
    walnutWood: new THREE.MeshStandardMaterial({
      map: textures.walnutAlbedo,
      roughnessMap: textures.walnutRoughness,
      roughness: 0.58,
      metalness: 0.04,
    }),
    darkIron: new THREE.MeshStandardMaterial({
      color: 0x181a1f,
      metalness: 0.85,
      roughness: 0.44,
    }),
    basaltStone: new THREE.MeshStandardMaterial({
      color: 0x3b3e46,
      metalness: 0.1,
      roughness: 0.84,
      flatShading: true,
    }),
    parchment: new THREE.MeshStandardMaterial({
      map: textures.parchmentAlbedo,
      roughness: 0.88,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
    crimsonWax: new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.36,
      metalness: 0.08,
    }),
    velvetTray: new THREE.MeshStandardMaterial({
      color: 0x2b0c12,
      roughness: 0.92,
      metalness: 0.02,
    }),
  };
}

export function createContactShadow(
  textures: ProceduralTexturePack,
  radius: number,
  opacity = 0.5,
): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(radius * 2, radius * 2);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    alphaMap: textures.contactShadowAlpha,
    transparent: true,
    depthWrite: false,
    opacity,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.004;
  return mesh;
}

/**
 * 11-part composite 6-chamber revolver with articulated cylinder, hammer, trigger, and live brass round.
 * Oriented so barrel points along +Z in gunPivot local space (easy lookAt aiming).
 */
export function createRevolverModel(mats: MaterialPalette): RevolverRig {
  const root = new THREE.Group();
  const gunPivot = new THREE.Group();
  root.add(gunPivot);

  // Center of mass roughly around the cylinder window
  const frameGroup = new THREE.Group();
  gunPivot.add(frameGroup);

  // 1. Main frame housing (extruded silhouette around cylinder window)
  const frameShape = new THREE.Shape();
  frameShape.moveTo(-0.34, -0.14);
  frameShape.lineTo(0.28, -0.14);
  frameShape.lineTo(0.32, -0.02);
  frameShape.lineTo(0.32, 0.24);
  frameShape.lineTo(-0.28, 0.24);
  frameShape.lineTo(-0.34, 0.14);
  frameShape.closePath();

  // Cutout window for the cylinder
  const windowHole = new THREE.Path();
  windowHole.moveTo(-0.18, -0.06);
  windowHole.lineTo(0.21, -0.06);
  windowHole.lineTo(0.21, 0.18);
  windowHole.lineTo(-0.18, 0.18);
  windowHole.closePath();
  frameShape.holes.push(windowHole);

  const frameGeo = new THREE.ExtrudeGeometry(frameShape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.012,
    bevelSegments: 2,
  });
  frameGeo.center();
  // Extrude is in XY with depth Z; rotate so length is along +Z
  frameGeo.rotateY(-Math.PI / 2);
  const frameMesh = new THREE.Mesh(frameGeo, mats.bluedSteel);
  frameMesh.position.set(0, 0.06, -0.02);
  frameMesh.castShadow = true;
  frameMesh.receiveShadow = true;
  frameGroup.add(frameMesh);

  // 2. Sculpted Walnut Grip (angled backward along -Z, -Y)
  const gripShape = new THREE.Shape();
  gripShape.moveTo(-0.08, 0.0);
  gripShape.lineTo(0.1, 0.0);
  gripShape.lineTo(0.22, -0.44);
  gripShape.quadraticCurveTo(0.18, -0.52, 0.04, -0.52);
  gripShape.lineTo(-0.06, -0.46);
  gripShape.closePath();

  const gripGeo = new THREE.ExtrudeGeometry(gripShape, {
    depth: 0.15,
    bevelEnabled: true,
    bevelThickness: 0.022,
    bevelSize: 0.018,
    bevelSegments: 3,
  });
  gripGeo.center();
  gripGeo.rotateY(-Math.PI / 2);
  const gripMesh = new THREE.Mesh(gripGeo, mats.walnutWood);
  gripMesh.position.set(0, -0.24, -0.36);
  gripMesh.castShadow = true;
  gripMesh.receiveShadow = true;
  frameGroup.add(gripMesh);

  // 3. Brass grip medallion screw
  const screwGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.195, 16);
  screwGeo.rotateZ(Math.PI / 2);
  const screwMesh = new THREE.Mesh(screwGeo, mats.agedBrass);
  screwMesh.position.set(0, -0.25, -0.37);
  frameGroup.add(screwMesh);

  // 4. Trigger Guard Loop
  const guardGeo = new THREE.TorusGeometry(0.11, 0.016, 10, 24);
  guardGeo.rotateY(Math.PI / 2);
  const guardMesh = new THREE.Mesh(guardGeo, mats.agedBrass);
  guardMesh.scale.set(1.25, 0.9, 1);
  guardMesh.position.set(0, -0.16, -0.14);
  guardMesh.castShadow = true;
  frameGroup.add(guardMesh);

  // 5. Articulated Trigger
  const triggerPivot = new THREE.Group();
  triggerPivot.position.set(0, -0.09, -0.11);
  const triggerShape = new THREE.Shape();
  triggerShape.moveTo(0, 0);
  triggerShape.quadraticCurveTo(0.04, -0.08, 0.0, -0.14);
  triggerShape.lineTo(-0.025, -0.13);
  triggerShape.quadraticCurveTo(0.01, -0.07, -0.02, 0);
  triggerShape.closePath();
  const triggerGeo = new THREE.ExtrudeGeometry(triggerShape, {
    depth: 0.026,
    bevelEnabled: true,
    bevelSize: 0.004,
    bevelThickness: 0.004,
  });
  triggerGeo.translate(0, 0, -0.013);
  triggerGeo.rotateY(-Math.PI / 2);
  const triggerMesh = new THREE.Mesh(triggerGeo, mats.brushedChrome);
  triggerPivot.add(triggerMesh);
  frameGroup.add(triggerPivot);

  // 6. Articulated Hammer
  const hammerPivot = new THREE.Group();
  hammerPivot.position.set(0, 0.14, -0.27);
  const hammerShape = new THREE.Shape();
  hammerShape.moveTo(0, 0);
  hammerShape.lineTo(0.04, 0.11);
  hammerShape.lineTo(-0.05, 0.15);
  hammerShape.lineTo(-0.09, 0.12);
  hammerShape.lineTo(-0.04, 0.02);
  hammerShape.closePath();
  const hammerGeo = new THREE.ExtrudeGeometry(hammerShape, {
    depth: 0.032,
    bevelEnabled: true,
    bevelSize: 0.005,
    bevelThickness: 0.005,
  });
  hammerGeo.translate(0, 0, -0.016);
  hammerGeo.rotateY(-Math.PI / 2);
  const hammerMesh = new THREE.Mesh(hammerGeo, mats.brushedChrome);
  hammerMesh.castShadow = true;
  hammerPivot.add(hammerMesh);
  frameGroup.add(hammerPivot);

  // 7. Octagonal Barrel + Bore
  const barrelGroup = new THREE.Group();
  barrelGroup.position.set(0, 0.14, 0.56);
  const barrelGeo = new THREE.CylinderGeometry(0.068, 0.074, 0.78, 8);
  barrelGeo.rotateX(Math.PI / 2);
  const barrelMesh = new THREE.Mesh(barrelGeo, mats.bluedSteel);
  barrelMesh.castShadow = true;
  barrelMesh.receiveShadow = true;
  barrelGroup.add(barrelMesh);

  // Inner dark muzzle bore
  const boreGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.05, 16);
  boreGeo.rotateX(Math.PI / 2);
  const boreMesh = new THREE.Mesh(boreGeo, mats.darkIron);
  boreMesh.position.z = 0.375;
  barrelGroup.add(boreMesh);

  // 8. Underlug Ejector Rod
  const lugGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.62, 12);
  lugGeo.rotateX(Math.PI / 2);
  const lugMesh = new THREE.Mesh(lugGeo, mats.bluedSteel);
  lugMesh.position.set(0, -0.072, -0.05);
  lugMesh.castShadow = true;
  barrelGroup.add(lugMesh);

  // 9. Brass Front Sight Blade
  const sightGeo = new THREE.BoxGeometry(0.018, 0.048, 0.065);
  const sightMesh = new THREE.Mesh(sightGeo, mats.agedBrass);
  sightMesh.position.set(0, 0.075, 0.33);
  barrelGroup.add(sightMesh);

  frameGroup.add(barrelGroup);

  // Muzzle point for flash + smoke
  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, 0.14, 0.96);
  frameGroup.add(muzzlePoint);

  // 10. Fluted 6-Chamber Rotating Cylinder
  const cylinderGroup = new THREE.Group();
  cylinderGroup.position.set(0, 0.07, 0.0);

  const cylBodyGeo = new THREE.CylinderGeometry(0.155, 0.155, 0.32, 24);
  cylBodyGeo.rotateX(Math.PI / 2);
  const cylBody = new THREE.Mesh(cylBodyGeo, mats.brushedChrome);
  cylBody.castShadow = true;
  cylBody.receiveShadow = true;
  cylinderGroup.add(cylBody);

  // Central cylinder arbor pin
  const arborGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.39, 14);
  arborGeo.rotateX(Math.PI / 2);
  const arborMesh = new THREE.Mesh(arborGeo, mats.agedBrass);
  cylinderGroup.add(arborMesh);

  // 6 Chamber recesses & 6 exterior flutes
  const chamberRadius = 0.095;
  const chamberHoleGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.33, 14);
  chamberHoleGeo.rotateX(Math.PI / 2);

  const fluteGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.24, 10);
  fluteGeo.rotateX(Math.PI / 2);

  for (let i = 0; i < 6; i++) {
    // Top chamber is index 0 at angle = Math.PI / 2 (12 o'clock)
    const angle = Math.PI / 2 - (i * Math.PI) / 3;
    const cx = Math.cos(angle) * chamberRadius;
    const cy = Math.sin(angle) * chamberRadius;
    const hole = new THREE.Mesh(chamberHoleGeo, mats.darkIron);
    hole.position.set(cx, cy, 0);
    cylinderGroup.add(hole);

    const fluteAngle = angle + Math.PI / 6;
    const flute = new THREE.Mesh(fluteGeo, mats.bluedSteel);
    flute.position.set(Math.cos(fluteAngle) * 0.15, Math.sin(fluteAngle) * 0.15, 0);
    cylinderGroup.add(flute);
  }

  // 11. Brass Live Cartridge Primer Rim seated inside secret bulletSlot
  const bulletGeo = new THREE.CylinderGeometry(0.033, 0.033, 0.34, 14);
  bulletGeo.rotateX(Math.PI / 2);
  const brassBulletMesh = new THREE.Mesh(bulletGeo, mats.agedBrass);
  cylinderGroup.add(brassBulletMesh);

  const setBulletSlot = (slotIndex: number) => {
    const angle = Math.PI / 2 - (slotIndex * Math.PI) / 3;
    brassBulletMesh.position.set(
      Math.cos(angle) * chamberRadius,
      Math.sin(angle) * chamberRadius,
      -0.008,
    );
  };
  setBulletSlot(0);

  frameGroup.add(cylinderGroup);

  return {
    root,
    gunPivot,
    cylinderGroup,
    hammerPivot,
    triggerPivot,
    muzzlePoint,
    brassBulletMesh,
    setBulletSlot,
  };
}

/**
 * 10-part Clockwork Brass & Steel Automaton Opponent across the table.
 */
export function createBotModel(mats: MaterialPalette): BotRig {
  const root = new THREE.Group();

  // 1. Heavy Pedestal Plinth / Bust Base (bottom at y = 0)
  const baseGeo = new THREE.CylinderGeometry(0.42, 0.5, 0.16, 16);
  const baseMesh = new THREE.Mesh(baseGeo, mats.darkIron);
  baseMesh.position.y = 0.08;
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  root.add(baseMesh);

  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 0.16;
  root.add(torsoGroup);

  // 2. Tailored Armored Torso
  const torsoGeo = new THREE.CylinderGeometry(0.44, 0.34, 0.92, 12);
  const torsoMesh = new THREE.Mesh(torsoGeo, mats.bluedSteel);
  torsoMesh.position.y = 0.46;
  torsoMesh.scale.set(1.15, 1, 0.72);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  torsoGroup.add(torsoMesh);

  // 3. Brass Chest Gauge / Medallion Plate
  const chestPlateGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.06, 20);
  chestPlateGeo.rotateX(Math.PI / 2);
  const chestPlate = new THREE.Mesh(chestPlateGeo, mats.agedBrass);
  chestPlate.position.set(0, 0.56, 0.31);
  torsoGroup.add(chestPlate);

  // 4. Brass Neck Collar
  const collarGeo = new THREE.TorusGeometry(0.19, 0.045, 10, 24);
  collarGeo.rotateX(Math.PI / 2);
  const collarMesh = new THREE.Mesh(collarGeo, mats.agedBrass);
  collarMesh.position.y = 0.96;
  torsoGroup.add(collarMesh);

  // 5. Shoulder Pauldrons
  [-1, 1].forEach((side) => {
    const pauldronGeo = new THREE.SphereGeometry(0.19, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const pauldron = new THREE.Mesh(pauldronGeo, mats.agedBrass);
    pauldron.position.set(side * 0.52, 0.82, 0);
    pauldron.rotation.z = side * -0.45;
    pauldron.castShadow = true;
    torsoGroup.add(pauldron);
  });

  // 6. Articulated Automaton Head
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.06;
  torsoGroup.add(headGroup);

  const craniumGeo = new THREE.CylinderGeometry(0.22, 0.19, 0.36, 10);
  const cranium = new THREE.Mesh(craniumGeo, mats.brushedChrome);
  cranium.position.y = 0.22;
  cranium.castShadow = true;
  headGroup.add(cranium);

  // Brass visor brow
  const visorGeo = new THREE.BoxGeometry(0.38, 0.09, 0.24);
  const visor = new THREE.Mesh(visorGeo, mats.agedBrass);
  visor.position.set(0, 0.27, 0.12);
  headGroup.add(visor);

  // Jaw grille
  const jawGeo = new THREE.BoxGeometry(0.26, 0.1, 0.16);
  const jaw = new THREE.Mesh(jawGeo, mats.darkIron);
  jaw.position.set(0, 0.11, 0.14);
  headGroup.add(jaw);

  // 7. Optical Lens Eyes
  const eyeGeo = new THREE.CylinderGeometry(0.048, 0.048, 0.06, 16);
  eyeGeo.rotateX(Math.PI / 2);
  const eyeLeftMat = new THREE.MeshStandardMaterial({
    color: 0xffb347,
    emissive: 0xff8c1a,
    emissiveIntensity: 1.6,
    roughness: 0.2,
    metalness: 0.4,
  });
  const eyeRightMat = eyeLeftMat.clone();

  const eyeL = new THREE.Mesh(eyeGeo, eyeLeftMat);
  eyeL.position.set(-0.085, 0.23, 0.2);
  headGroup.add(eyeL);

  const eyeR = new THREE.Mesh(eyeGeo, eyeRightMat);
  eyeR.position.set(0.085, 0.23, 0.2);
  headGroup.add(eyeR);

  // 8. Articulated Right Mechanical Arm (raises & reveals Bot's RPS gesture)
  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(-0.54, 0.78, 0.06);
  torsoGroup.add(rightArmPivot);

  const upperArmGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.48, 12);
  const upperArm = new THREE.Mesh(upperArmGeo, mats.bluedSteel);
  upperArm.position.y = -0.22;
  upperArm.castShadow = true;
  rightArmPivot.add(upperArm);

  const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), mats.agedBrass);
  elbowJoint.position.y = -0.46;
  rightArmPivot.add(elbowJoint);

  const forearmPivot = new THREE.Group();
  forearmPivot.position.y = -0.46;
  rightArmPivot.add(forearmPivot);

  const forearmGeo = new THREE.CylinderGeometry(0.055, 0.045, 0.48, 12);
  forearmGeo.rotateX(Math.PI / 2);
  const forearm = new THREE.Mesh(forearmGeo, mats.brushedChrome);
  forearm.position.z = 0.24;
  forearm.castShadow = true;
  forearmPivot.add(forearm);

  const handAnchor = new THREE.Group();
  handAnchor.position.set(0, 0.04, 0.54);
  forearmPivot.add(handAnchor);

  // Left resting arm for silhouette balance
  const leftArmGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.54, 12);
  const leftArm = new THREE.Mesh(leftArmGeo, mats.bluedSteel);
  leftArm.position.set(0.54, 0.5, 0.14);
  leftArm.rotation.x = -0.5;
  leftArm.castShadow = true;
  torsoGroup.add(leftArm);

  return {
    root,
    torsoGroup,
    headGroup,
    eyeLeftMat,
    eyeRightMat,
    rightArmPivot,
    forearmPivot,
    handAnchor,
  };
}

/**
 * Composite 3–6 part sculpted 3D RPS Token (Rock, Paper, or Scissors) on a brass medallion plinth.
 */
export function createRpsToken(
  move: Move,
  mats: MaterialPalette,
  interactive = true,
): TokenRig {
  const root = new THREE.Group();

  // Brass Plinth Pedestal (bottom at y = 0)
  const plinthGeo = new THREE.CylinderGeometry(0.28, 0.31, 0.06, 24);
  const plinthMesh = new THREE.Mesh(plinthGeo, mats.darkIron);
  plinthMesh.position.y = 0.03;
  plinthMesh.castShadow = true;
  plinthMesh.receiveShadow = true;
  root.add(plinthMesh);

  const plinthRingMat = mats.agedBrass.clone();
  const ringGeo = new THREE.TorusGeometry(0.275, 0.018, 10, 28);
  ringGeo.rotateX(Math.PI / 2);
  const ringMesh = new THREE.Mesh(ringGeo, plinthRingMat);
  ringMesh.position.y = 0.058;
  root.add(ringMesh);

  const visualGroup = new THREE.Group();
  visualGroup.position.y = 0.06;
  root.add(visualGroup);

  if (move === 1) {
    // ROCK: Multi-faceted carved basalt monolith + pyrite gold vein shard + stepped stone cap
    const coreGeo = new THREE.DodecahedronGeometry(0.21, 0);
    const core = new THREE.Mesh(coreGeo, mats.basaltStone);
    core.position.y = 0.2;
    core.scale.set(1.05, 0.92, 1.0);
    core.rotation.set(0.3, 0.5, 0.2);
    core.castShadow = true;
    visualGroup.add(core);

    const shardGeo = new THREE.OctahedronGeometry(0.11, 0);
    const shard = new THREE.Mesh(shardGeo, mats.agedBrass);
    shard.position.set(0.11, 0.24, 0.08);
    shard.rotation.set(0.5, 0.2, -0.4);
    visualGroup.add(shard);

    const baseStoneGeo = new THREE.CylinderGeometry(0.19, 0.23, 0.09, 7);
    const baseStone = new THREE.Mesh(baseStoneGeo, mats.basaltStone);
    baseStone.position.y = 0.045;
    baseStone.castShadow = true;
    visualGroup.add(baseStone);
  } else if (move === 2) {
    // PAPER: Curled parchment scroll + wooden roller dowels + crimson wax seal
    const scrollGroup = new THREE.Group();
    scrollGroup.position.y = 0.22;
    scrollGroup.rotation.x = -0.35;

    const sheetGeo = new THREE.PlaneGeometry(0.34, 0.36, 12, 12);
    const pos = sheetGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const zCurve = Math.sin((y + 0.18) * 9) * 0.025;
      pos.setZ(i, zCurve);
    }
    sheetGeo.computeVertexNormals();
    const sheet = new THREE.Mesh(sheetGeo, mats.parchment);
    sheet.castShadow = true;
    scrollGroup.add(sheet);

    const dowelGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.4, 12);
    dowelGeo.rotateZ(Math.PI / 2);
    const topDowel = new THREE.Mesh(dowelGeo, mats.walnutWood);
    topDowel.position.set(0, 0.18, 0.01);
    scrollGroup.add(topDowel);

    const botDowel = new THREE.Mesh(dowelGeo, mats.walnutWood);
    botDowel.position.set(0, -0.18, 0.01);
    scrollGroup.add(botDowel);

    const sealGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.022, 16);
    sealGeo.rotateX(Math.PI / 2);
    const seal = new THREE.Mesh(sealGeo, mats.crimsonWax);
    seal.position.set(0.07, -0.07, 0.025);
    scrollGroup.add(seal);

    visualGroup.add(scrollGroup);
  } else {
    // SCISSORS: Forged twin-blade steel shears + brass finger loops + central pivot rivet
    const shearGroup = new THREE.Group();
    shearGroup.position.y = 0.24;
    shearGroup.rotation.x = -0.25;

    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(-0.02, -0.05);
    bladeShape.lineTo(0.025, -0.05);
    bladeShape.lineTo(0.018, 0.22);
    bladeShape.lineTo(-0.01, 0.27);
    bladeShape.lineTo(-0.022, 0.18);
    bladeShape.closePath();

    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
      depth: 0.014,
      bevelEnabled: true,
      bevelSize: 0.003,
      bevelThickness: 0.003,
    });
    bladeGeo.translate(0, 0, -0.007);

    const leftAssembly = new THREE.Group();
    leftAssembly.rotation.z = 0.38;
    const bladeL = new THREE.Mesh(bladeGeo, mats.brushedChrome);
    bladeL.castShadow = true;
    leftAssembly.add(bladeL);

    const loopGeo = new THREE.TorusGeometry(0.055, 0.014, 10, 20);
    const loopL = new THREE.Mesh(loopGeo, mats.agedBrass);
    loopL.position.set(-0.01, -0.11, 0);
    leftAssembly.add(loopL);

    const rightAssembly = new THREE.Group();
    rightAssembly.rotation.z = -0.38;
    rightAssembly.position.z = 0.016;
    const bladeR = new THREE.Mesh(bladeGeo, mats.brushedChrome);
    bladeR.scale.x = -1;
    bladeR.castShadow = true;
    rightAssembly.add(bladeR);

    const loopR = new THREE.Mesh(loopGeo, mats.agedBrass);
    loopR.position.set(0.01, -0.11, 0);
    rightAssembly.add(loopR);

    const rivetGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.045, 14);
    rivetGeo.rotateX(Math.PI / 2);
    const rivet = new THREE.Mesh(rivetGeo, mats.agedBrass);
    rivet.position.z = 0.008;

    shearGroup.add(leftAssembly, rightAssembly, rivet);
    visualGroup.add(shearGroup);
  }

  // Invisible raycast collision cylinder on Layer 1
  const proxyGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.62, 12);
  const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
  const hitProxy = new THREE.Mesh(proxyGeo, proxyMat);
  hitProxy.position.y = 0.31;
  if (interactive) {
    hitProxy.layers.set(1);
    hitProxy.userData.move = move;
  }
  root.add(hitProxy);

  return {
    root,
    visualGroup,
    hitProxy,
    plinthRingMat,
    move,
  };
}

/**
 * Builds the backroom high-stakes parlor environment: octagonal baize & mahogany duel table,
 * velvet revolver tray, overhead brass banker lamp, parlor backdrop, and dust motes.
 */
export function createParlorEnvironment(
  textures: ProceduralTexturePack,
  mats: MaterialPalette,
): {
  envGroup: THREE.Group;
  dustPoints: THREE.Points;
} {
  const envGroup = new THREE.Group();

  // 1. Octagonal Mahogany Table Rim (table surface sits at Y = 0)
  const rimGeo = new THREE.CylinderGeometry(2.65, 2.52, 0.18, 8);
  const rimMesh = new THREE.Mesh(rimGeo, mats.walnutWood);
  rimMesh.position.y = -0.095;
  rimMesh.receiveShadow = true;
  rimMesh.castShadow = true;
  envGroup.add(rimMesh);

  // Brass corner bevel trim ring
  const brassTrimGeo = new THREE.CylinderGeometry(2.67, 2.67, 0.035, 8, 1, true);
  const brassTrim = new THREE.Mesh(brassTrimGeo, mats.agedBrass);
  brassTrim.position.y = -0.015;
  envGroup.add(brassTrim);

  // 2. Baize Felt Playing Surface (offset slightly above rim to prevent Z-fighting)
  const feltGeo = new THREE.CylinderGeometry(2.36, 2.36, 0.02, 32);
  const feltMat = new THREE.MeshStandardMaterial({
    map: textures.baizeAlbedo,
    bumpMap: textures.baizeBump,
    bumpScale: 0.008,
    roughness: 0.92,
    metalness: 0.02,
  });
  const feltMesh = new THREE.Mesh(feltGeo, feltMat);
  feltMesh.position.y = 0.0;
  feltMesh.receiveShadow = true;
  envGroup.add(feltMesh);

  // 3. Center Velvet & Brass Revolver Tray (sits at Y = 0.012)
  const trayFrameGeo = new THREE.CylinderGeometry(0.62, 0.66, 0.04, 24);
  const trayFrame = new THREE.Mesh(trayFrameGeo, mats.agedBrass);
  trayFrame.position.y = 0.02;
  trayFrame.receiveShadow = true;
  trayFrame.castShadow = true;
  envGroup.add(trayFrame);

  const trayVelvetGeo = new THREE.CylinderGeometry(0.57, 0.57, 0.044, 24);
  const trayVelvet = new THREE.Mesh(trayVelvetGeo, mats.velvetTray);
  trayVelvet.position.y = 0.021;
  trayVelvet.receiveShadow = true;
  envGroup.add(trayVelvet);

  // 4. Table Pedestal Column & Parlor Floor
  const pedestalGeo = new THREE.CylinderGeometry(0.45, 0.85, 2.2, 12);
  const pedestal = new THREE.Mesh(pedestalGeo, mats.walnutWood);
  pedestal.position.y = -1.25;
  envGroup.add(pedestal);

  const floorGeo = new THREE.CircleGeometry(28, 32);
  floorGeo.rotateX(-Math.PI / 2);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0d0e11,
    roughness: 0.85,
    metalness: 0.05,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.y = -2.35;
  floor.receiveShadow = true;
  envGroup.add(floor);

  // 5. Overhead Brass Parlor Shade (floating high above spotlight origin)
  const lampGroup = new THREE.Group();
  lampGroup.position.set(0, 4.35, 0);
  const cordGeo = new THREE.CylinderGeometry(0.018, 0.018, 3.0, 8);
  const cord = new THREE.Mesh(cordGeo, mats.darkIron);
  cord.position.y = 1.5;
  lampGroup.add(cord);

  const shadeGeo = new THREE.ConeGeometry(0.75, 0.36, 24, 1, true);
  const shadeMat = new THREE.MeshPhysicalMaterial({
    color: 0x164133,
    roughness: 0.22,
    metalness: 0.35,
    side: THREE.DoubleSide,
  });
  const shade = new THREE.Mesh(shadeGeo, shadeMat);
  lampGroup.add(shade);

  const shadeRimGeo = new THREE.TorusGeometry(0.75, 0.022, 10, 32);
  shadeRimGeo.rotateX(Math.PI / 2);
  const shadeRim = new THREE.Mesh(shadeRimGeo, mats.agedBrass);
  shadeRim.position.y = -0.18;
  lampGroup.add(shadeRim);

  const bulbGeo = new THREE.SphereGeometry(0.11, 14, 12);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffdf9e });
  const bulb = new THREE.Mesh(bulbGeo, bulbMat);
  bulb.position.y = -0.06;
  lampGroup.add(bulb);
  envGroup.add(lampGroup);

  // 6. Decorative Parlor Chairs / Pillars in background fog
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.35;
    const dist = 7.5;
    const pillarGeo = new THREE.CylinderGeometry(0.28, 0.34, 8, 8);
    const pillar = new THREE.Mesh(pillarGeo, mats.darkIron);
    pillar.position.set(Math.cos(a) * dist, 1.65, Math.sin(a) * dist);
    envGroup.add(pillar);
  }

  // 7. Tabletop Iraqi Flag Desk Stand (5-part composite grounded on left baize flank)
  const flagStand = createIraqiFlagStand(textures, mats);
  flagStand.position.set(-1.32, 0.01, -0.34);
  flagStand.rotation.y = 0.42;
  envGroup.add(flagStand);

  // 8. Ambient Dust Motes in the Lamp Cone
  const dustCount = 120;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 4.5;
    dustPos[i * 3 + 1] = 0.2 + Math.random() * 3.4;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 4.5;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xf7d794,
    size: 0.024,
    transparent: true,
    opacity: 0.45,
    sizeAttenuation: true,
    depthWrite: false,
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  envGroup.add(dustPoints);

  return { envGroup, dustPoints };
}

/**
 * 5-part composite tabletop Iraqi Flag stand: turned pedestal, brass mast, finial, grommet rings,
 * and sculpted 3:2 draped cloth banner. Bottom-center grounded at y = 0.
 */
export function createIraqiFlagStand(
  textures: ProceduralTexturePack,
  mats: MaterialPalette,
): THREE.Group {
  const group = new THREE.Group();

  // Contact shadow grounding
  const shadow = createContactShadow(textures, 0.28, 0.46);
  group.add(shadow);

  // 1. Turned tiered pedestal base (LatheGeometry, y = 0 .. 0.085)
  const basePoints = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.16, 0.0),
    new THREE.Vector2(0.16, 0.02),
    new THREE.Vector2(0.13, 0.032),
    new THREE.Vector2(0.11, 0.052),
    new THREE.Vector2(0.048, 0.068),
    new THREE.Vector2(0.032, 0.085),
    new THREE.Vector2(0.0, 0.085),
  ];
  const baseGeo = new THREE.LatheGeometry(basePoints, 24);
  const baseMesh = new THREE.Mesh(baseGeo, mats.agedBrass);
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // 2. Slender brushed brass flagpole mast
  const mastHeight = 0.86;
  const mastGeo = new THREE.CylinderGeometry(0.012, 0.016, mastHeight, 14);
  const mastMesh = new THREE.Mesh(mastGeo, mats.brushedChrome);
  mastMesh.position.y = 0.08 + mastHeight / 2;
  mastMesh.castShadow = true;
  group.add(mastMesh);

  // 3. Gold finial collar & orb at mast top
  const finialOrb = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 12), mats.agedBrass);
  finialOrb.position.y = 0.08 + mastHeight + 0.018;
  finialOrb.castShadow = true;
  group.add(finialOrb);

  // 4. Mounting grommet rings securing the hoist edge
  const ringGeo = new THREE.TorusGeometry(0.019, 0.005, 8, 16);
  ringGeo.rotateX(Math.PI / 2);
  [0.88, 0.52].forEach((ry) => {
    const ring = new THREE.Mesh(ringGeo, mats.agedBrass);
    ring.position.y = ry;
    group.add(ring);
  });

  // 5. Gently draped & waving 3:2 Iraqi flag cloth banner
  const flagWidth = 0.62;
  const flagHeight = 0.413;
  const flagGeo = new THREE.PlaneGeometry(flagWidth, flagHeight, 20, 12);
  const pos = flagGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i); // -w/2 .. +w/2
    const y = pos.getY(i);
    const u = (x + flagWidth / 2) / flagWidth; // 0 at mast, 1 at fly edge
    // Smooth cloth wave & natural gravity drape toward the fly edge
    const waveZ = Math.sin(u * Math.PI * 2.3 + y * 2.2) * (0.042 * u);
    const droopY = -Math.pow(u, 1.55) * 0.055;
    pos.setZ(i, waveZ);
    pos.setY(i, y + droopY);
  }
  flagGeo.computeVertexNormals();

  const flagMat = new THREE.MeshStandardMaterial({
    map: textures.iraqiFlagAlbedo,
    roughness: 0.84,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const flagMesh = new THREE.Mesh(flagGeo, flagMat);
  // Attach left edge (u=0) right against the mast
  flagMesh.position.set(flagWidth / 2 + 0.012, 0.70, 0);
  flagMesh.castShadow = true;
  flagMesh.receiveShadow = true;
  group.add(flagMesh);

  return group;
}
