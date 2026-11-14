import * as THREE from 'three';

export interface ProceduralTexturePack {
  baizeAlbedo: THREE.CanvasTexture;
  baizeBump: THREE.CanvasTexture;
  walnutAlbedo: THREE.CanvasTexture;
  walnutRoughness: THREE.CanvasTexture;
  brushedMetalBump: THREE.CanvasTexture;
  parchmentAlbedo: THREE.CanvasTexture;
  contactShadowAlpha: THREE.CanvasTexture;
  iraqiFlagAlbedo: THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTexturePack {
  const aniso = Math.max(1, maxAnisotropy);

  // 1. Emerald-charcoal baize felt with inlaid brass duel ring & 6 chamber ticks
  const baizeCanvas = document.createElement('canvas');
  baizeCanvas.width = 1024;
  baizeCanvas.height = 1024;
  const bCtx = baizeCanvas.getContext('2d')!;

  const grad = bCtx.createRadialGradient(512, 512, 40, 512, 512, 520);
  grad.addColorStop(0, '#164133');
  grad.addColorStop(0.6, '#0f2f25');
  grad.addColorStop(1, '#081b15');
  bCtx.fillStyle = grad;
  bCtx.fillRect(0, 0, 1024, 1024);

  // Subtle felt weave noise
  for (let i = 0; i < 18000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const shade = Math.random() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)';
    bCtx.fillStyle = shade;
    bCtx.fillRect(x, y, 2, 2);
  }

  // Inlaid brass duel circle & 6-chamber radial markings
  bCtx.strokeStyle = 'rgba(212, 168, 83, 0.42)';
  bCtx.lineWidth = 3;
  bCtx.beginPath();
  bCtx.arc(512, 512, 210, 0, Math.PI * 2);
  bCtx.stroke();

  bCtx.strokeStyle = 'rgba(212, 168, 83, 0.22)';
  bCtx.lineWidth = 1.5;
  bCtx.beginPath();
  bCtx.arc(512, 512, 185, 0, Math.PI * 2);
  bCtx.stroke();

  bCtx.beginPath();
  bCtx.arc(512, 512, 340, 0, Math.PI * 2);
  bCtx.stroke();

  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const x1 = 512 + Math.cos(angle) * 185;
    const y1 = 512 + Math.sin(angle) * 185;
    const x2 = 512 + Math.cos(angle) * 210;
    const y2 = 512 + Math.sin(angle) * 210;
    bCtx.strokeStyle = 'rgba(212, 168, 83, 0.48)';
    bCtx.lineWidth = 2.5;
    bCtx.beginPath();
    bCtx.moveTo(x1, y1);
    bCtx.lineTo(x2, y2);
    bCtx.stroke();

    const cx = 512 + Math.cos(angle) * 120;
    const cy = 512 + Math.sin(angle) * 120;
    bCtx.strokeStyle = 'rgba(212, 168, 83, 0.16)';
    bCtx.lineWidth = 1.5;
    bCtx.beginPath();
    bCtx.arc(cx, cy, 18, 0, Math.PI * 2);
    bCtx.stroke();
  }

  const baizeAlbedo = new THREE.CanvasTexture(baizeCanvas);
  baizeAlbedo.colorSpace = THREE.SRGBColorSpace;
  baizeAlbedo.anisotropy = aniso;

  // Baize bump map (linear)
  const baizeBumpCanvas = document.createElement('canvas');
  baizeBumpCanvas.width = 512;
  baizeBumpCanvas.height = 512;
  const bbCtx = baizeBumpCanvas.getContext('2d')!;
  bbCtx.fillStyle = '#808080';
  bbCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 16000; i++) {
    const v = 105 + Math.floor(Math.random() * 48);
    bbCtx.fillStyle = `rgb(${v},${v},${v})`;
    bbCtx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  const baizeBump = new THREE.CanvasTexture(baizeBumpCanvas);
  baizeBump.wrapS = THREE.RepeatWrapping;
  baizeBump.wrapT = THREE.RepeatWrapping;
  baizeBump.repeat.set(3, 3);
  baizeBump.anisotropy = aniso;

  // 2. Dark walnut / mahogany wood grain
  const walnutCanvas = document.createElement('canvas');
  walnutCanvas.width = 512;
  walnutCanvas.height = 512;
  const wCtx = walnutCanvas.getContext('2d')!;
  wCtx.fillStyle = '#331c12';
  wCtx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y++) {
    const wave = Math.sin(y * 0.04) * 10 + Math.sin(y * 0.17) * 4;
    const tone = Math.sin((y + wave) * 0.12);
    const r = Math.floor(48 + tone * 16 + Math.random() * 4);
    const g = Math.floor(24 + tone * 8 + Math.random() * 3);
    const b = Math.floor(15 + tone * 5 + Math.random() * 2);
    wCtx.fillStyle = `rgb(${r},${g},${b})`;
    wCtx.fillRect(0, y, 512, 1);
  }
  // Fine dark wood pores
  for (let i = 0; i < 900; i++) {
    wCtx.fillStyle = 'rgba(18, 8, 4, 0.25)';
    wCtx.fillRect(Math.random() * 512, Math.random() * 512, 24 + Math.random() * 60, 1);
  }

  const walnutAlbedo = new THREE.CanvasTexture(walnutCanvas);
  walnutAlbedo.colorSpace = THREE.SRGBColorSpace;
  walnutAlbedo.wrapS = THREE.RepeatWrapping;
  walnutAlbedo.wrapT = THREE.RepeatWrapping;
  walnutAlbedo.anisotropy = aniso;

  const walnutRoughCanvas = document.createElement('canvas');
  walnutRoughCanvas.width = 256;
  walnutRoughCanvas.height = 256;
  const wrCtx = walnutRoughCanvas.getContext('2d')!;
  wrCtx.fillStyle = '#707070';
  wrCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y++) {
    const v = 90 + Math.floor(Math.sin(y * 0.22) * 24 + Math.random() * 14);
    wrCtx.fillStyle = `rgb(${v},${v},${v})`;
    wrCtx.fillRect(0, y, 256, 1);
  }
  const walnutRoughness = new THREE.CanvasTexture(walnutRoughCanvas);
  walnutRoughness.wrapS = THREE.RepeatWrapping;
  walnutRoughness.wrapT = THREE.RepeatWrapping;
  walnutRoughness.anisotropy = aniso;

  // 3. Brushed metal directional grain
  const metalCanvas = document.createElement('canvas');
  metalCanvas.width = 256;
  metalCanvas.height = 256;
  const mCtx = metalCanvas.getContext('2d')!;
  mCtx.fillStyle = '#808080';
  mCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y++) {
    const v = 112 + Math.floor(Math.random() * 32);
    mCtx.fillStyle = `rgb(${v},${v},${v})`;
    mCtx.fillRect(0, y, 256, 1);
  }
  const brushedMetalBump = new THREE.CanvasTexture(metalCanvas);
  brushedMetalBump.wrapS = THREE.RepeatWrapping;
  brushedMetalBump.wrapT = THREE.RepeatWrapping;
  brushedMetalBump.anisotropy = aniso;

  // 4. Parchment scroll texture for Paper token
  const parchCanvas = document.createElement('canvas');
  parchCanvas.width = 512;
  parchCanvas.height = 512;
  const pCtx = parchCanvas.getContext('2d')!;
  pCtx.fillStyle = '#e7dcc5';
  pCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4000; i++) {
    pCtx.fillStyle = Math.random() > 0.5 ? 'rgba(130, 102, 68, 0.06)' : 'rgba(255,255,255,0.06)';
    pCtx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
  }
  pCtx.strokeStyle = '#6b4f35';
  pCtx.lineWidth = 6;
  pCtx.strokeRect(28, 28, 456, 456);
  pCtx.strokeStyle = 'rgba(107, 79, 53, 0.45)';
  pCtx.lineWidth = 2;
  pCtx.strokeRect(42, 42, 428, 428);

  // Decorative inked script lines
  pCtx.strokeStyle = 'rgba(54, 38, 26, 0.72)';
  pCtx.lineWidth = 5;
  pCtx.lineCap = 'round';
  for (let line = 0; line < 5; line++) {
    const y = 120 + line * 52;
    pCtx.beginPath();
    pCtx.moveTo(88, y);
    for (let x = 100; x <= 410; x += 28) {
      pCtx.lineTo(x, y + Math.sin(x * 0.14 + line) * 4);
    }
    pCtx.stroke();
  }
  const parchmentAlbedo = new THREE.CanvasTexture(parchCanvas);
  parchmentAlbedo.colorSpace = THREE.SRGBColorSpace;
  parchmentAlbedo.anisotropy = aniso;

  // 5. Contact shadow soft radial alpha map
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 256;
  shadowCanvas.height = 256;
  const sCtx = shadowCanvas.getContext('2d')!;
  const sGrad = sCtx.createRadialGradient(128, 128, 12, 128, 128, 124);
  sGrad.addColorStop(0, 'rgba(0,0,0,0.85)');
  sGrad.addColorStop(0.55, 'rgba(0,0,0,0.35)');
  sGrad.addColorStop(1, 'rgba(0,0,0,0)');
  sCtx.fillStyle = sGrad;
  sCtx.fillRect(0, 0, 256, 256);
  const contactShadowAlpha = new THREE.CanvasTexture(shadowCanvas);

  // 6. Iraqi Flag cloth texture (3:2 aspect ratio, woven fabric + geometric Kufic Takbir)
  const flagCanvas = document.createElement('canvas');
  flagCanvas.width = 900;
  flagCanvas.height = 600;
  const fCtx = flagCanvas.getContext('2d')!;

  // Tri-color horizontal bands
  fCtx.fillStyle = '#CE1126';
  fCtx.fillRect(0, 0, 900, 200);
  fCtx.fillStyle = '#F8F7F4';
  fCtx.fillRect(0, 200, 900, 200);
  fCtx.fillStyle = '#111215';
  fCtx.fillRect(0, 400, 900, 200);

  // Geometric Kufic calligraphy "الله أكبر" in #007A3D centered in white band (y: 200..400)
  fCtx.fillStyle = '#007A3D';
  fCtx.strokeStyle = '#007A3D';
  const sw = 15; // stroke thickness

  // Helper for crisp Kufic bars
  const bar = (x: number, y: number, w: number, h: number) => {
    fCtx.fillRect(x, y, w, h);
  };

  // --- Right word: الله (x: 475 .. 675) ---
  // Alif (rightmost vertical)
  bar(652, 238, sw, 118);
  // Lam-Lam-Ha connected base
  bar(492, 341, 134, sw);
  // First Lam (right)
  bar(611, 238, sw, 118);
  // Second Lam (middle)
  bar(562, 238, sw, 118);
  // Final Ha loop (left side of word)
  bar(492, 286, sw, 70);
  bar(492, 286, 46, sw);
  bar(523, 286, sw, 70);

  // --- Left word: أكبر (x: 225 .. 445) ---
  // Alif with Hamza on right side of word
  bar(428, 250, sw, 106);
  // Hamza mark above Alif
  bar(420, 224, 28, 9);
  bar(420, 224, 9, 18);
  bar(420, 235, 22, 7);

  // Kaf (stepped angular Kufic form)
  bar(334, 341, 74, sw);
  bar(393, 276, sw, 80);
  bar(352, 276, 56, sw);
  bar(352, 244, 52, sw);
  bar(393, 244, sw, 42);

  // Ba + Ra (connecting into descending tail on left)
  bar(258, 341, 90, sw);
  // Ba tooth
  bar(302, 304, sw, 52);
  // Ba dot below
  bar(302, 366, sw, 13);
  // Ra descending hook
  bar(258, 304, sw, 72);
  bar(222, 361, 51, sw);

  // Subtle woven linen grain across the entire flag
  for (let y = 0; y < 600; y += 2) {
    fCtx.fillStyle = y % 4 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.035)';
    fCtx.fillRect(0, y, 900, 1);
  }
  for (let x = 0; x < 900; x += 3) {
    fCtx.fillStyle = 'rgba(0,0,0,0.02)';
    fCtx.fillRect(x, 0, 1, 600);
  }

  const iraqiFlagAlbedo = new THREE.CanvasTexture(flagCanvas);
  iraqiFlagAlbedo.colorSpace = THREE.SRGBColorSpace;
  iraqiFlagAlbedo.anisotropy = aniso;

  return {
    baizeAlbedo,
    baizeBump,
    walnutAlbedo,
    walnutRoughness,
    brushedMetalBump,
    parchmentAlbedo,
    contactShadowAlpha,
    iraqiFlagAlbedo,
    dispose: () => {
      baizeAlbedo.dispose();
      baizeBump.dispose();
      walnutAlbedo.dispose();
      walnutRoughness.dispose();
      brushedMetalBump.dispose();
      parchmentAlbedo.dispose();
      contactShadowAlpha.dispose();
      iraqiFlagAlbedo.dispose();
    },
  };
}
