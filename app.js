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
};

const sceneHost = $('scene');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x06110d, 0.026);
const camera = new THREE.PerspectiveCamera(48, sceneHost.clientWidth / sceneHost.clientHeight, 0.1, 200);
camera.position.set(0, 10, 34);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(sceneHost.clientWidth, sceneHost.clientHeight);
sceneHost.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 18;
controls.maxDistance = 58;
controls.maxPolarAngle = Math.PI / 2.05;
controls.target.set(0, 4, 0);

scene.add(new THREE.AmbientLight(0x9effca, 1.15));
const key = new THREE.DirectionalLight(0xb8ffe0, 1.65);
key.position.set(10, 20, 12);
scene.add(key);
const rim = new THREE.PointLight(0x39ff9c, 12, 90, 2);
rim.position.set(-14, 18, 10);
scene.add(rim);
const cyanLight = new THREE.PointLight(0x66fff2, 11, 70, 2);
cyanLight.position.set(15, 10, -8);
scene.add(cyanLight);

function glowMaterial(color, opacity = 0.22) {
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
    emissiveIntensity: 0.18,
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

const mainFunnel = tube(7.8, 2.25, 18, 0x72ff8a);
mainFunnel.position.set(0, 8, 0);
scene.add(mainFunnel);

const midTube = tube(2.1, 2.1, 4.5, 0x72ff8a);
midTube.position.set(0, -2.75, 0);
scene.add(midTube);

const declineBridge = tube(0.55, 0.55, 8.5, 0x66fff2);
declineBridge.rotation.z = -1.22;
declineBridge.position.set(-6.2, -3.8, 0);
scene.add(declineBridge);

const declineFunnel = tube(3.8, 1.35, 9.5, 0x66fff2);
declineFunnel.position.set(-13, -8, 0);
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

const introTube = tube(0.55, 0.55, 7.2, 0x7cff7a);
introTube.rotation.z = Math.PI / 2;
introTube.position.set(-7.25, -10.2, 0);
scene.add(introTube);
const opsTube = tube(0.55, 0.55, 7.2, 0x66fff2);
opsTube.rotation.z = Math.PI / 2;
opsTube.position.set(7.25, -10.2, 0);
scene.add(opsTube);
const ebitdaTube = tube(0.55, 0.55, 7.5, 0xf1ff88);
ebitdaTube.position.set(0, -17.2, 0);
scene.add(ebitdaTube);

function textSprite(text, color = '#effff4', scale = 3.9) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '700 92px Inter';
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.shadowBlur = 24;
  ctx.shadowColor = color;
  ctx.fillText(text, canvas.width / 2, 150);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale * 2.4, scale, 1);
  return sprite;
}

const labels = [
  ['ENQUIRIES', [0, 18.8, 0], '#aef7be'],
  ['MAIN FUNNEL', [8.8, 9.5, 0], '#7cff7a'],
  ['NTU / DECLINED', [-13, -1.8, 0], '#66fff2'],
  ['CLIENT VALUE', [0, -4.8, 0], '#f1ff88'],
  ['INTRODUCER', [-14.6, -7.2, 0], '#7cff7a'],
  ['OPS COSTS', [14.5, -7.2, 0], '#66fff2'],
  ['EBITDA', [0, -21.7, 0], '#f1ff88'],
].map(([text, pos, color]) => {
  const sprite = textSprite(text, color, text.length > 10 ? 2.5 : 3.2);
  sprite.position.set(...pos);
  scene.add(sprite);
  return sprite;
});

const bubbleGeo = new THREE.SphereGeometry(0.26, 20, 20);
function makeBubble(kind = 'main') {
  const palette = {
    main: 0x7cff7a,
    ntu: 0x66fff2,
    won: 0xdcff8f,
  };
  const mat = new THREE.MeshPhysicalMaterial({
    color: palette[kind],
    emissive: palette[kind],
    emissiveIntensity: 0.38,
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
  mesh.position.set(rand(-4.2, 4.2), 19.5, rand(-2.8, 2.8));
  scene.add(mesh);

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
function spiralPos(yTop, yBottom, radiusStart, radiusEnd, t, phaseShift = 0) {
  const y = lerp(yTop, yBottom, t);
  const radius = lerp(radiusStart, radiusEnd, t);
  const angle = t * Math.PI * 7.6 + phaseShift;
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
  mesh.position.copy(sourcePos);
  scene.add(mesh);
  state.tubeTravellers.push({ mesh, t: 0, duration: rand(1.2, 2.3), channel, start: sourcePos.clone() });
}

function settleValue(channel) {
  const value = settings.clientValue;
  state.gross += value;
  if (channel === 'intro') state.introValue += value * (settings.introPct / 100);
  if (channel === 'ops') state.opsValue += value * (settings.opsPct / 100);
  if (channel === 'ebitda') state.ebitdaValue += value * (settings.ebitdaPct / 100);
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
    mesh.rotation.x += dt * b.spin;
    mesh.rotation.y += dt * b.spin * 0.6;

    if (b.phase === 'dropIn') {
      const t = Math.min(b.age / 1.2, 1);
      mesh.position.y = lerp(19.5, 16.5, t);
      mesh.position.x += Math.sin(b.age * 6) * dt * 0.35;
      if (t >= 1) { b.phase = 'spiral'; b.age = 0; }
    } else if (b.phase === 'spiral') {
      const stageCount = 5;
      const totalT = Math.min(b.age / 4.8, 1);
      const stageT = Math.min(totalT * stageCount, stageCount - 0.001);
      const idx = Math.floor(stageT);
      const localT = stageT - idx;
      const yLevels = [16.5, 12.8, 9.1, 5.4, 1.8, -1.4];
      const rLevels = [6.2, 5.2, 4.35, 3.45, 2.7, 2.0];
      const pos = spiralPos(yLevels[idx], yLevels[idx + 1], rLevels[idx], rLevels[idx + 1], localT, b.wobble);
      mesh.position.copy(pos);
      if (b.outcome === 'ntu' && idx >= b.failStage) {
        b.phase = 'toDecline';
        b.age = 0;
        mesh.material.color.setHex(0x66fff2);
        mesh.material.emissive.setHex(0x66fff2);
      } else if (totalT >= 1 && b.outcome === 'won') {
        b.phase = 'toValue';
        b.age = 0;
        mesh.material.color.setHex(0xdcff8f);
        mesh.material.emissive.setHex(0xdcff8f);
      }
    } else if (b.phase === 'toDecline') {
      const t = Math.min(b.age / 1.25, 1);
      mesh.position.set(lerp(mesh.position.x, -9.2, t), lerp(mesh.position.y, -4.8, t), lerp(mesh.position.z, 0, t));
      if (t >= 1) b.phase = 'declineSpiral', b.age = 0;
    } else if (b.phase === 'declineSpiral') {
      const t = Math.min(b.age / 2.8, 1);
      const pos = spiralPos(-4.2, -11.7, 2.8, 0.95, t, b.wobble * 2);
      pos.x -= 13;
      mesh.position.copy(pos);
      if (t >= 1) {
        scene.remove(mesh);
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
    if (t.channel === 'intro') {
      m.position.set(lerp(t.start.x, -14.2, p), lerp(t.start.y, -10.2, p), 0);
    } else if (t.channel === 'ops') {
      m.position.set(lerp(t.start.x, 14.2, p), lerp(t.start.y, -10.2, p), 0);
    } else {
      m.position.set(0, lerp(t.start.y, -20.8, p), 0);
    }
    if (p >= 1) {
      settleValue(t.channel);
      scene.remove(m);
      state.tubeTravellers.splice(i, 1);
    }
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
