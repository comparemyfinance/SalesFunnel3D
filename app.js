const $ = (id) => document.getElementById(id);
const money = (n) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n);
const number = (n) => new Intl.NumberFormat('en-GB').format(Math.round(n));

const settings = {
  enquiriesPerDay: 12000,
  spawnRate: 8,
  vrnPct: 25,
  contactLossPct: 40,
  prequalPct: 50,
  termsPct: 45,
  docsPct: 75,
  introPct: 33,
  opsPct: 33,
  ebitdaPct: 34,
  clientValue: 948,
};

const state = {
  processed: 0,
  entered: 0,
  ntu: 0,
  won: 0,
  gross: 0,
  introValue: 0,
  opsValue: 0,
  ebitdaValue: 0,
  spawnAccumulator: 0,
  bubbles: [],
  chamberBubbles: [],
  wonEscrow: [],
  tubeTravellers: [],
  introFunnelBubbles: [],
  ntuRestingBubbles: [],
  opsBucketBubbles: [],
  ebitdaRestingBubbles: [],
};

const sceneHost = $('scene');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x06110d, 0.018);
const camera = new THREE.PerspectiveCamera(48, sceneHost.clientWidth / sceneHost.clientHeight, 0.1, 200);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(sceneHost.clientWidth, sceneHost.clientHeight);
sceneHost.appendChild(renderer.domElement);
renderer.domElement.style.touchAction = 'none';
renderer.domElement.style.cursor = 'grab';

const controls = {
  target: new THREE.Vector3(0, 2.5, 0),
  radius: 42,
  theta: 0,
  phi: 1.1,
  minRadius: 24,
  maxRadius: 72,
  minPhi: 0.3,
  maxPhi: Math.PI / 2.02,
  isDragging: false,
  pointerId: null,
  lastX: 0,
  lastY: 0,
  update() {
    const sinPhi = Math.sin(this.phi);
    camera.position.set(
      this.target.x + this.radius * sinPhi * Math.sin(this.theta),
      this.target.y + this.radius * Math.cos(this.phi),
      this.target.z + this.radius * sinPhi * Math.cos(this.theta)
    );
    camera.lookAt(this.target);
  },
};

controls.update();

renderer.domElement.addEventListener('pointerdown', (event) => {
  controls.isDragging = true;
  controls.pointerId = event.pointerId;
  controls.lastX = event.clientX;
  controls.lastY = event.clientY;
  renderer.domElement.style.cursor = 'grabbing';
  renderer.domElement.setPointerCapture(event.pointerId);
});

renderer.domElement.addEventListener('pointermove', (event) => {
  if (!controls.isDragging || event.pointerId !== controls.pointerId) return;
  const deltaX = event.clientX - controls.lastX;
  const deltaY = event.clientY - controls.lastY;
  controls.lastX = event.clientX;
  controls.lastY = event.clientY;
  controls.theta -= deltaX * 0.008;
  controls.phi = THREE.MathUtils.clamp(controls.phi + deltaY * 0.008, controls.minPhi, controls.maxPhi);
});

function releasePointer(event) {
  if (event.pointerId !== controls.pointerId) return;
  controls.isDragging = false;
  controls.pointerId = null;
  renderer.domElement.style.cursor = 'grab';
  if (renderer.domElement.hasPointerCapture(event.pointerId)) {
    renderer.domElement.releasePointerCapture(event.pointerId);
  }
}

renderer.domElement.addEventListener('pointerup', releasePointer);
renderer.domElement.addEventListener('pointercancel', releasePointer);
renderer.domElement.addEventListener('pointerleave', () => {
  if (!controls.isDragging) renderer.domElement.style.cursor = 'grab';
});

renderer.domElement.addEventListener('wheel', (event) => {
  event.preventDefault();
  const zoomFactor = event.deltaY > 0 ? 1.08 : 0.92;
  controls.radius = THREE.MathUtils.clamp(controls.radius * zoomFactor, controls.minRadius, controls.maxRadius);
}, { passive: false });

scene.add(new THREE.AmbientLight(0xc8ffe1, 1.45));
const key = new THREE.DirectionalLight(0xd8ffef, 2.1);
key.position.set(10, 20, 12);
scene.add(key);
const rim = new THREE.PointLight(0x39ff9c, 15, 95, 2);
rim.position.set(-14, 18, 10);
scene.add(rim);
const cyanLight = new THREE.PointLight(0x66fff2, 13, 78, 2);
cyanLight.position.set(15, 10, -8);
scene.add(cyanLight);

function glowMaterial(color, opacity = 0.3) {
  return new THREE.MeshPhysicalMaterial({
    color,
    transparent: true,
    opacity,
    metalness: 0.08,
    roughness: 0.15,
    transmission: 0.88,
    thickness: 1.3,
    clearcoat: 1,
    emissive: color,
    emissiveIntensity: 0.32,
    side: THREE.DoubleSide,
  });
}

function tube(radiusTop, radiusBottom, height, color) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 48, 1, true), glowMaterial(color));
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.65 })
  );
  mesh.add(edges);
  return mesh;
}

function bucket(radius, height, color) {
  const group = new THREE.Group();
  const shell = tube(radius, radius * 0.9, height, color);
  shell.position.y = height / 2;
  group.add(shell);

  const base = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.92, 48),
    glowMaterial(color, 0.34)
  );
  base.rotation.x = -Math.PI / 2;
  base.position.y = 0.1;
  group.add(base);

  return group;
}

function pipeBetween(start, end, color, radius = 0.55) {
  const vector = end.clone().sub(start);
  const mesh = tube(radius, radius, vector.length(), color);
  mesh.position.copy(start.clone().add(end).multiplyScalar(0.5));
  mesh.rotation.z = -Math.atan2(vector.x, vector.y);
  return mesh;
}

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(36, 72),
  new THREE.MeshStandardMaterial({ color: 0x062117, metalness: 0.15, roughness: 0.85, emissive: 0x062117 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -13;
scene.add(floor);

const grid = new THREE.GridHelper(70, 28, 0x39ff9c, 0x0b2f1e);
grid.position.y = -12.96;
grid.material.opacity = 0.18;
grid.material.transparent = true;
scene.add(grid);

const mainFunnel = tube(4.29, 1.37, 10.39, 0x72ff8a);
mainFunnel.position.set(0, 5.25, 0);
scene.add(mainFunnel);

const midTube = tube(2.1, 2.1, 6.45, 0x72ff8a);
midTube.position.set(0, -3.17, 0);
scene.add(midTube);

const declinePipeConfigs = [
  {
    title: 'VRN / EXPERIAN',
    value: () => `${settings.vrnPct}%`,
    start: new THREE.Vector3(-2.2, 10.4, 0),
    end: new THREE.Vector3(-10.2, -5.25, 0),
    labelPos: new THREE.Vector3(-18.2, 10.0, 3.2),
  },
  {
    title: 'UNCONTACTABLE / NO RESPONSE',
    value: () => `${settings.contactLossPct}%`,
    start: new THREE.Vector3(-2.1, 7.1, 0),
    end: new THREE.Vector3(-10.2, -5.25, 0),
    labelPos: new THREE.Vector3(-18.2, 6.4, 3.2),
  },
  {
    title: 'PRE-QUAL SUCCESS',
    value: () => `${settings.prequalPct}%`,
    start: new THREE.Vector3(-1.8, 3.9, 0),
    end: new THREE.Vector3(-10.2, -5.25, 0),
    labelPos: new THREE.Vector3(-18.2, 2.7, 3.2),
  },
  {
    title: 'NO LENDER TERMS',
    value: () => `${100 - settings.termsPct}%`,
    start: new THREE.Vector3(-1.5, 1.1, 0),
    end: new THREE.Vector3(-10.2, -5.25, 0),
    labelPos: new THREE.Vector3(-18.2, -0.8, 3.2),
  },
];
const declinePipes = declinePipeConfigs.map((config) => {
  const mesh = pipeBetween(config.start, config.end, 0x66fff2, 0.42);
  scene.add(mesh);
  return { ...config, mesh };
});

const declineFunnel = tube(3.8, 1.35, 9.5, 0x66fff2);
declineFunnel.position.set(-10.2, -10.0, 0);
scene.add(declineFunnel);

const valueChamber = new THREE.Mesh(
  new THREE.SphereGeometry(3.8, 44, 36),
  glowMaterial(0xdcff8f, 0.18)
);
valueChamber.position.set(0, -10.2, 0);
scene.add(valueChamber);
valueChamber.add(new THREE.LineSegments(
  new THREE.EdgesGeometry(valueChamber.geometry),
  new THREE.LineBasicMaterial({ color: 0xdcff8f, transparent: true, opacity: 0.58 })
));

const opsTube = tube(0.55, 0.55, 11.2, 0x66fff2);
opsTube.rotation.z = Math.PI / 2;
opsTube.position.set(9.2, -10.2, 0);
scene.add(opsTube);
const introPipeStart = new THREE.Vector3(3.9, -8.7, 0);
const introPipeEnd = new THREE.Vector3(13.9, -1.4, 0);
const introBridge = pipeBetween(introPipeStart, introPipeEnd, 0xff8df5);
scene.add(introBridge);
const introFunnel = tube(2.2, 0.78, 5.9, 0xff8df5);
introFunnel.position.set(14.8, -4.2, 0);
scene.add(introFunnel);
const opsDropTube = tube(0.65, 0.65, 5.6, 0x66fff2);
opsDropTube.position.set(14.8, -13.0, 0);
scene.add(opsDropTube);
const opsBucket = bucket(3.7, 6.2, 0x66fff2);
opsBucket.position.set(14.8, -21.3, 0);
scene.add(opsBucket);

function tickerPanel(width, height, color = '#f1ff88') {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);

  mesh.userData = {
    canvas,
    ctx,
    texture,
    color,
    text: '',
    scroll: 0,
    setText(nextText) {
      if (this.text !== nextText) {
        this.text = nextText;
        this.scroll = 0;
      }
    },
    draw(dt = 0) {
      this.scroll = (this.scroll + dt * 180) % 540;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(5, 14, 10, 0.82)';
      ctx.fillRect(0, 24, canvas.width, 208);
      ctx.strokeStyle = color;
      ctx.lineWidth = 8;
      ctx.strokeRect(20, 28, canvas.width - 40, 200);
      ctx.shadowBlur = 22;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.font = '700 104px Inter';
      ctx.textAlign = 'left';
      const band = `${this.text}    ${this.text}    ${this.text}    `;
      for (let x = -this.scroll; x < canvas.width + 540; x += 540) {
        ctx.fillText(band, x, 158);
      }
      texture.needsUpdate = true;
    },
  };

  mesh.userData.setText('');
  mesh.userData.draw();
  return mesh;
}

const clientTicker = tickerPanel(5.3, 1.08);
clientTicker.visible = false;

function textSprite(text, color = '#effff4', scale = 3.9) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale * 2.6, scale * 1.1, 1);
  sprite.userData = {
    canvas,
    ctx,
    color,
    title: text,
    subtitle: '',
    render(nextSubtitle = '') {
      if (this.subtitle === nextSubtitle) return;
      this.subtitle = nextSubtitle;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = 'center';
      ctx.fillStyle = color;
      ctx.shadowBlur = 24;
      ctx.shadowColor = color;
      ctx.font = '700 88px Inter';
      ctx.fillText(text, canvas.width / 2, 120);
      if (nextSubtitle) {
        ctx.font = '600 62px Inter';
        ctx.fillText(nextSubtitle, canvas.width / 2, 230);
      }
      texture.needsUpdate = true;
    },
  };
  sprite.userData.subtitle = null;
  sprite.userData.render('');
  return sprite;
}

const labels = [
  { text: 'ENQUIRIES', pos: [-8.3, 8.8, 0], color: '#aef7be', scale: 3.0, value: () => number(state.entered) },
  { text: 'MAIN FUNNEL', pos: [8.1, 8.8, 0], color: '#7cff7a', scale: 2.6 },
  { text: 'NTU / DECLINED', pos: [-13.2, -1.8, 3.6], color: '#66fff2', scale: 2.5, value: () => number(state.ntu) },
  { text: 'INTRODUCER', pos: [14.8, 0.6, 3.2], color: '#ff9cf5', scale: 2.6, value: () => money(state.introValue) },
  { text: 'OPS COSTS', pos: [20.8, -18.8, 4.0], color: '#66fff2', scale: 2.7, value: () => money(state.opsValue) },
  { text: 'EBITDA SPHERE', pos: [0, -4.4, 4.4], color: '#f1ff88', scale: 2.7, value: () => money(state.ebitdaValue) },
].map(({ text, pos, color, scale, value }) => {
  const sprite = textSprite(text, color, scale);
  sprite.position.set(...pos);
  sprite.userData.getValue = value || null;
  scene.add(sprite);
  return sprite;
});

const stageLabels = declinePipes.map(({ title, value, labelPos }) => {
  const sprite = textSprite(title, '#66fff2', 1.45);
  sprite.position.copy(labelPos);
  sprite.userData.getValue = value;
  scene.add(sprite);
  return sprite;
});

const bubbleGeo = new THREE.SphereGeometry(0.26, 20, 20);
function randomBubbleColor(kind = 'main') {
  const hueRanges = {
    main: [0, 1],
    ntu: [0, 1],
    won: [0, 1],
  };
  const [minHue, maxHue] = hueRanges[kind] || hueRanges.main;
  const hue = minHue + Math.random() * (maxHue - minHue);
  const color = new THREE.Color();
  color.setHSL(hue, 0.9, kind === 'won' ? 0.68 : 0.6);
  return color;
}

function makeBubble(kind = 'main') {
  const color = randomBubbleColor(kind);
  const mat = new THREE.MeshPhysicalMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.46,
    roughness: 0.05,
    metalness: 0,
    transparent: true,
    opacity: 0.95,
    transmission: 0.65,
    thickness: 0.7,
  });
  return new THREE.Mesh(bubbleGeo, mat);
}

function rand(min, max) { return min + Math.random() * (max - min); }
function chance(pct) { return Math.random() * 100 < pct; }

function spawnEnquiryBubble() {
  const mesh = makeBubble('main');
  mesh.position.set(rand(-2.5, 2.5), 15.9, rand(-1.55, 1.55));
  scene.add(mesh);
  state.entered += 1;

  const outcomes = {
    vrnDecline: chance(settings.vrnPct),
    contactLoss: false,
    prequalLoss: false,
    termsLoss: false,
    docsLoss: false,
  };
  if (!outcomes.vrnDecline) {
    outcomes.contactLoss = chance(settings.contactLossPct);
    if (!outcomes.contactLoss) {
      outcomes.prequalLoss = !chance(settings.prequalPct);
      if (!outcomes.prequalLoss) {
        outcomes.termsLoss = !chance(settings.termsPct);
        if (!outcomes.termsLoss) {
          outcomes.docsLoss = !chance(settings.docsPct);
        }
      }
    }
  }

  const result = outcomes.vrnDecline || outcomes.contactLoss || outcomes.prequalLoss || outcomes.termsLoss || outcomes.docsLoss ? 'ntu' : 'won';
  const failStage = outcomes.vrnDecline ? 0 : outcomes.contactLoss ? 1 : outcomes.prequalLoss ? 2 : outcomes.termsLoss ? 3 : outcomes.docsLoss ? 4 : 5;

  state.bubbles.push({
    mesh,
    phase: 'dropIn',
    age: 0,
    spin: rand(0.8, 2.1),
    wobble: rand(0.4, 1.4),
    outcome: result,
    failStage,
  });
}

function updateProjection() {
  const afterVRN = settings.enquiriesPerDay * (1 - settings.vrnPct / 100);
  const contactable = afterVRN * (1 - settings.contactLossPct / 100);
  const prequal = contactable * (settings.prequalPct / 100);
  const terms = prequal * (settings.termsPct / 100);
  const docs = terms * (settings.docsPct / 100);
  const ntu = settings.enquiriesPerDay - docs;
  $('projection').innerHTML = `
    <div><strong>${number(settings.enquiriesPerDay)}</strong> enquiries enter the funnel daily</div>
    <div><strong>${number(afterVRN)}</strong> survive VRN/finance check</div>
    <div><strong>${number(contactable)}</strong> remain contactable</div>
    <div><strong>${number(prequal)}</strong> pass pre-qual</div>
    <div><strong>${number(terms)}</strong> receive lender terms</div>
    <div><strong>${number(docs)}</strong> complete with docs</div>
    <div><strong>${number(ntu)}</strong> flow into NTU / decline</div>
    <div><strong>${money(docs * settings.clientValue)}</strong> gross client value / day</div>
  `;
}

function updateOutputs() {
  $('processedCount').textContent = number(state.processed);
  $('ntuCount').textContent = number(state.ntu);
  $('wonCount').textContent = number(state.won);
  $('grossValue').textContent = money(state.gross);
  $('introValue').textContent = money(state.introValue);
  $('opsValue').textContent = money(state.opsValue);
  $('ebitdaValue').textContent = money(state.ebitdaValue);
  [...labels, ...stageLabels].forEach((label) => {
    const nextValue = label.userData.getValue ? label.userData.getValue() : '';
    label.userData.render(nextValue);
  });
}

function applyControls() {
  Object.keys(settings).forEach((key) => {
    const el = $(key);
    if (!el) return;
    const value = Number(el.value);
    settings[key] = value;
  });
  ['vrnPct', 'contactLossPct', 'prequalPct', 'termsPct', 'docsPct'].forEach((id) => {
    $(id + 'Out').textContent = `${settings[id]}%`;
  });
  const total = settings.introPct + settings.opsPct + settings.ebitdaPct;
  if (total !== 100) {
    $('projection').innerHTML = '<strong>Value split must equal 100%</strong>';
  } else {
    updateProjection();
  }
}

document.querySelectorAll('input').forEach((input) => input.addEventListener('input', applyControls));
applyControls();
updateOutputs();

function lerp(a, b, t) { return a + (b - a) * t; }
const restingCapacity = {
  ntu: 56,
  intro: 42,
  ops: 52,
  ebitda: 64,
};

function restingLimit(channel) {
  const ratio = Math.min(state.entered / settings.enquiriesPerDay, 1);
  return Math.ceil(restingCapacity[channel] * ratio);
}

function canRest(channel) {
  const stores = {
    ntu: state.ntuRestingBubbles,
    intro: state.introFunnelBubbles.filter((bubble) => bubble.phase === 'rest'),
    ops: state.opsBucketBubbles,
    ebitda: state.ebitdaRestingBubbles,
  };
  return stores[channel].length < restingLimit(channel);
}

function pathPosition(points, t) {
  if (points.length === 1) return points[0].clone();
  const segments = points.length - 1;
  const scaled = Math.min(t, 1) * segments;
  const index = Math.min(Math.floor(scaled), segments - 1);
  const localT = scaled - index;
  return new THREE.Vector3(
    lerp(points[index].x, points[index + 1].x, localT),
    lerp(points[index].y, points[index + 1].y, localT),
    lerp(points[index].z, points[index + 1].z, localT)
  );
}

function spiralPos(yTop, yBottom, radiusStart, radiusEnd, t, phaseShift = 0) {
  const y = lerp(yTop, yBottom, t);
  const radius = lerp(radiusStart, radiusEnd, t);
  const angle = t * Math.PI * 3.8 + phaseShift;
  return new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius * 0.7);
}

function routeWonBubble() {
  const mesh = makeBubble('won');
  mesh.scale.setScalar(1.08);
  mesh.position.set(0, -6, 0);
  scene.add(mesh);
  state.wonEscrow.push({ mesh, t: 0, duration: rand(0.8, 1.5) });
}

function addChamberBubble() {
  const mesh = makeBubble('won');
  mesh.scale.setScalar(rand(0.95, 1.18));
  mesh.position.set(rand(-1, 1), -10.2 + rand(-1, 1), rand(-1, 1));
  scene.add(mesh);
  state.chamberBubbles.push({
    mesh,
    vel: new THREE.Vector3(rand(-2.2, 2.2), rand(-2.2, 2.2), rand(-2.2, 2.2)),
    age: 0,
    exitAt: rand(1.5, 4.0),
  });
}

function dispatchTraveller(sourcePos) {
  const total = settings.introPct + settings.opsPct + settings.ebitdaPct;
  if (total !== 100) return;
  const roll = Math.random() * 100;
  let channel = 'intro';
  if (roll < settings.introPct) channel = 'intro';
  else if (roll < settings.introPct + settings.opsPct) channel = 'ops';
  else channel = 'ebitda';

  const mesh = makeBubble(channel === 'intro' ? 'main' : channel === 'ops' ? 'ntu' : 'won');
  mesh.scale.setScalar(1.05);
  const paths = {
    intro: [
      introPipeStart.clone(),
      introPipeEnd.clone(),
    ],
    ops: [
      new THREE.Vector3(3.6, -10.2, 0),
      new THREE.Vector3(14.8, -10.2, 0),
      new THREE.Vector3(14.8, -16.9, 0),
    ],
    ebitda: [
      sourcePos.clone(),
      new THREE.Vector3(rand(-1.4, 1.4), -10.2 + rand(-1.4, 1.4), rand(-1.4, 1.4)),
    ],
  };
  mesh.position.copy(paths[channel][0]);
  scene.add(mesh);
  state.tubeTravellers.push({ mesh, t: 0, duration: rand(1.3, 2.2), channel, path: paths[channel] });
}

function settleValue(channel) {
  const value = settings.clientValue;
  state.gross += value;
  state.introValue += value * (settings.introPct / 100);
  state.opsValue += value * (settings.opsPct / 100);
  state.ebitdaValue += value * (settings.ebitdaPct / 100);
}

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.033);
  controls.update();

  state.spawnAccumulator += dt * settings.spawnRate;
  while (state.spawnAccumulator >= 1) {
    spawnEnquiryBubble();
    state.spawnAccumulator -= 1;
  }

  for (let i = state.bubbles.length - 1; i >= 0; i--) {
    const b = state.bubbles[i];
    b.age += dt;
    const mesh = b.mesh;
    mesh.rotation.x += dt * b.spin * 0.5;
    mesh.rotation.y += dt * b.spin * 0.3;

    if (b.phase === 'dropIn') {
      const t = Math.min(b.age / 1.2, 1);
      mesh.position.y = lerp(15.9, 13.7, t);
      mesh.position.x += Math.sin(b.age * 6) * dt * 0.35;
      if (t >= 1) { b.phase = 'spiral'; b.age = 0; }
    } else if (b.phase === 'spiral') {
      const stageCount = 5;
      const totalT = Math.min(b.age / 4.8, 1);
      const stageT = Math.min(totalT * stageCount, stageCount - 0.001);
      const idx = Math.floor(stageT);
      const localT = stageT - idx;
      const yLevels = [13.7, 11.63, 9.57, 7.43, 5.15, 2.8];
      const rLevels = [3.48, 2.98, 2.55, 2.11, 1.68, 1.34];
      const pos = spiralPos(yLevels[idx], yLevels[idx + 1], rLevels[idx], rLevels[idx + 1], localT, b.wobble);
      mesh.position.copy(pos);
      if (b.outcome === 'ntu' && idx >= b.failStage) {
        const pipe = declinePipes[Math.min(b.failStage, declinePipes.length - 1)];
        b.phase = 'toDecline';
        b.path = [
          mesh.position.clone(),
          pipe.start.clone(),
          pipe.end.clone(),
        ];
        b.age = 0;
      } else if (totalT >= 1 && b.outcome === 'won') {
        b.phase = 'toValue';
        b.age = 0;
      }
    } else if (b.phase === 'toDecline') {
      const t = Math.min(b.age / 1.25, 1);
      mesh.position.copy(pathPosition(b.path, t));
      if (t >= 1) b.phase = 'declineSpiral', b.age = 0;
    } else if (b.phase === 'declineSpiral') {
      const t = Math.min(b.age / 2.8, 1);
      const pos = spiralPos(-5.4, -13.6, 2.8, 0.95, t, b.wobble * 2);
      pos.x -= 10.2;
      mesh.position.copy(pos);
      if (t >= 1) {
        if (canRest('ntu')) {
          state.ntuRestingBubbles.push({
            mesh,
            target: new THREE.Vector3(rand(-10.95, -9.2), rand(-14.25, -13.2), rand(-0.9, 0.9)),
          });
        } else {
          scene.remove(mesh);
        }
        state.bubbles.splice(i, 1);
        state.ntu += 1;
        state.processed += 1;
      }
    } else if (b.phase === 'toValue') {
      const t = Math.min(b.age / 1.45, 1);
      mesh.position.set(0, lerp(-1.4, -8.5, t), 0);
      mesh.scale.setScalar(lerp(1, 1.15, t));
      if (t >= 1) {
        scene.remove(mesh);
        state.bubbles.splice(i, 1);
        state.won += 1;
        state.processed += 1;
        routeWonBubble();
      }
    }
  }

  for (let i = state.wonEscrow.length - 1; i >= 0; i--) {
    const b = state.wonEscrow[i];
    b.t += dt / b.duration;
    const t = Math.min(b.t, 1);
    b.mesh.position.set(0, lerp(-8.6, -10.2, t), Math.sin(t * Math.PI) * 0.2);
    if (t >= 1) {
      scene.remove(b.mesh);
      state.wonEscrow.splice(i, 1);
      addChamberBubble();
    }
  }

  for (let i = state.chamberBubbles.length - 1; i >= 0; i--) {
    const b = state.chamberBubbles[i];
    b.age += dt;
    b.mesh.position.addScaledVector(b.vel, dt);
    b.vel.multiplyScalar(0.997);
    const center = new THREE.Vector3(0, -10.2, 0);
    const local = b.mesh.position.clone().sub(center);
    const len = local.length();
    const limit = 3.25;
    if (len > limit) {
      local.normalize();
      b.mesh.position.copy(center.clone().add(local.multiplyScalar(limit)));
      b.vel.reflect(local.normalize()).multiplyScalar(0.96);
    }
    b.vel.x += Math.sin(b.age * 5 + i) * dt * 0.9;
    b.vel.y += Math.cos(b.age * 4 + i * 0.7) * dt * 0.9;
    b.vel.z += Math.sin(b.age * 6 + i * 0.2) * dt * 0.65;

    for (let j = i - 1; j >= 0; j--) {
      const other = state.chamberBubbles[j];
      const delta = b.mesh.position.clone().sub(other.mesh.position);
      const dist = delta.length();
      if (dist > 0 && dist < 0.65) {
        const normal = delta.normalize();
        b.vel.addScaledVector(normal, 0.5);
        other.vel.addScaledVector(normal, -0.5);
      }
    }

    if (b.age > b.exitAt) {
      const pos = b.mesh.position.clone();
      scene.remove(b.mesh);
      state.chamberBubbles.splice(i, 1);
      dispatchTraveller(pos);
    }
  }

  for (let i = state.tubeTravellers.length - 1; i >= 0; i--) {
    const t = state.tubeTravellers[i];
    t.t += dt / t.duration;
    const p = Math.min(t.t, 1);
    const m = t.mesh;
    m.position.copy(pathPosition(t.path, p));
    if (p >= 1) {
      if (t.channel === 'intro') {
        state.introFunnelBubbles.push({
          mesh: m,
          phase: 'flow',
          age: 0,
          duration: rand(1.4, 2.1),
          wobble: rand(0.2, 1.1),
        });
      } else if (t.channel === 'ops') {
        settleValue('ops');
        if (canRest('ops')) {
          state.opsBucketBubbles.push({
            mesh: m,
            age: 0,
            settleTarget: new THREE.Vector3(rand(11.8, 17.8), rand(-24.0, -22.0), rand(-2.4, 2.4)),
            drift: rand(0.35, 0.9),
          });
        } else {
          scene.remove(m);
        }
      } else {
        settleValue(t.channel);
        if (canRest('ebitda')) {
          state.ebitdaRestingBubbles.push({
            mesh: m,
            age: 0,
            settleTarget: new THREE.Vector3(rand(-1.15, 1.15), rand(-13.15, -12.0), rand(-1.15, 1.15)),
          });
        } else {
          scene.remove(m);
        }
      }
      state.tubeTravellers.splice(i, 1);
    }
  }

  for (let i = state.introFunnelBubbles.length - 1; i >= 0; i--) {
    const bubble = state.introFunnelBubbles[i];
    if (bubble.phase === 'flow') {
      bubble.age += dt;
      const t = Math.min(bubble.age / bubble.duration, 1);
      const pos = spiralPos(-1.4, -7.1, 1.55, 0.38, t, bubble.wobble);
      pos.x += 14.8;
      bubble.mesh.position.copy(pos);
      if (t >= 1) {
        settleValue('intro');
        if (canRest('intro')) {
          bubble.phase = 'rest';
          bubble.target = new THREE.Vector3(rand(14.35, 15.25), rand(-7.05, -6.35), rand(-0.45, 0.45));
        } else {
          scene.remove(bubble.mesh);
          state.introFunnelBubbles.splice(i, 1);
        }
      }
    } else {
      bubble.mesh.position.lerp(bubble.target, Math.min(dt * 4.5, 1));
    }
  }

  for (let i = state.opsBucketBubbles.length - 1; i >= 0; i--) {
    const bubble = state.opsBucketBubbles[i];
    bubble.age += dt;
    if (bubble.age < 0.85) {
      bubble.mesh.position.lerp(bubble.settleTarget, Math.min(dt * 5.5, 1));
    } else {
      bubble.mesh.position.x += Math.sin(bubble.age * bubble.drift + i) * dt * 0.05;
      bubble.mesh.position.y += Math.sin(bubble.age * (bubble.drift + 0.4) + i * 0.7) * dt * 0.03;
      bubble.mesh.position.z += Math.cos(bubble.age * bubble.drift + i * 0.3) * dt * 0.05;
    }

    bubble.mesh.position.x = THREE.MathUtils.clamp(bubble.mesh.position.x, 12.6, 17.0);
    bubble.mesh.position.y = THREE.MathUtils.clamp(bubble.mesh.position.y, -24.2, -21.6);
    bubble.mesh.position.z = THREE.MathUtils.clamp(bubble.mesh.position.z, -2.6, 2.6);
  }

  for (let i = state.ntuRestingBubbles.length - 1; i >= 0; i--) {
    const bubble = state.ntuRestingBubbles[i];
    bubble.mesh.position.lerp(bubble.target, Math.min(dt * 4.2, 1));
  }

  for (let i = state.ebitdaRestingBubbles.length - 1; i >= 0; i--) {
    const bubble = state.ebitdaRestingBubbles[i];
    bubble.age += dt;
    bubble.mesh.position.lerp(bubble.settleTarget, Math.min(dt * 3.8, 1));
    bubble.mesh.position.x += Math.sin(bubble.age * 0.9 + i) * dt * 0.02;
    bubble.mesh.position.y += Math.cos(bubble.age * 0.7 + i * 0.4) * dt * 0.008;
    bubble.mesh.position.z += Math.sin(bubble.age * 0.8 + i * 0.3) * dt * 0.02;
    bubble.mesh.position.y = THREE.MathUtils.clamp(bubble.mesh.position.y, -13.25, -11.85);
  }

  updateOutputs();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = sceneHost.clientWidth / sceneHost.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(sceneHost.clientWidth, sceneHost.clientHeight);
});
