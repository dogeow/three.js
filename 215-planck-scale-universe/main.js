import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
    import GUI from 'three/addons/libs/lil-gui.module.min.js';

    // ─── Scene Setup ─────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000005);
    scene.fog = new THREE.FogExp2(0x000005, 0.0);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1e-40,
      1e50
    );
    camera.position.set(0, 0, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'fixed';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.left = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    labelRenderer.domElement.style.zIndex = '5';
    document.body.appendChild(labelRenderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.zoomSpeed = 0.8;

    // ─── Scale Definitions ────────────────────────────────────────────────────
    // All scales are represented as camera distances (for zoom visualization)
    const SCALE_DEFS = {
      planck:      { name: 'Planck Length',       value: '1.6 × 10⁻³⁵ m', desc: 'The scale where quantum gravity dominates',       camZ: 1e-33,  label: 'Planck Length'        },
      nucleus:     { name: 'Atomic Nucleus',      value: '10⁻¹⁵ m',       desc: 'Protons and neutrons; the heart of atoms',         camZ: 1e-12,  label: 'Nucleus'               },
      atom:        { name: 'Atom',                 value: '10⁻¹⁰ m',        desc: 'Electron cloud orbiting a tiny nucleus',            camZ: 1e-6,   label: 'Atom'                  },
      human:       { name: 'Human',                value: '1.7 m',          desc: 'You are here — a curious sack of cells',           camZ: 3,      label: 'Human'                 },
      earth:       { name: 'Earth',                value: '1.3 × 10⁷ m',   desc: 'Our pale blue dot, home to 8 billion souls',      camZ: 3e7,    label: 'Earth'                 },
      sun:         { name: 'Sun',                  value: '7 × 10⁸ m',     desc: 'A middle-aged G-type star, 4.6 Gyr old',          camZ: 2e9,    label: 'Sun'                   },
      'solar-system': { name: 'Solar System',      value: '10¹³ m',         desc: 'Our cosmic neighbourhood — 1 light-day across',     camZ: 1e14,   label: 'Solar System'          },
      galaxy:      { name: 'Galaxy',               value: '10²¹ m',         desc: '100–400 billion stars swirling in a spiral',      camZ: 1e22,   label: 'Milky Way Galaxy'     },
      universe:    { name: 'Observable Universe',  value: '8.8 × 10²⁶ m', desc: 'The horizon of the visible cosmos',                camZ: 1e27,   label: 'Observable Universe'   },
    };

    // ─── Stars Background ────────────────────────────────────────────────────
    function buildStars(count, radius) {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      const col = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const r     = radius * (0.8 + Math.random() * 0.4);
        pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);
        // Slight color variation: blue-white to warm white
        const t = Math.random();
        col[i * 3]     = 0.7 + t * 0.3;
        col[i * 3 + 1] = 0.7 + t * 0.2;
        col[i * 3 + 2] = 0.8 + t * 0.2;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
      const mat = new THREE.PointsMaterial({
        size: 0.0005,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true,
      });
      return new THREE.Points(geo, mat);
    }

    const starField = buildStars(30000, 1e30);
    scene.add(starField);

    // ─── Scene Objects ────────────────────────────────────────────────────────
    const objectsGroup = new THREE.Group();
    scene.add(objectsGroup);

    // Helper: create a glowing sphere with a simple shader-like material
    function makeSphere(radius, color, emissiveIntensity = 0.6) {
      const geo = new THREE.SphereGeometry(radius, 32, 32);
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity,
        roughness: 0.4,
        metalness: 0.1,
      });
      return new THREE.Mesh(geo, mat);
    }

    // ── Planck scale: tiny flickering dot (quantum foam representation)
    const planckDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.01, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x4400ff, emissive: 0x2200cc, emissiveIntensity: 2, roughness: 0.2 })
    );
    objectsGroup.add(planckDot);

    // ── Nucleus: cluster of protons (small spheres)
    const nucleusGroup = new THREE.Group();
    const protonGeo = new THREE.SphereGeometry(0.03, 16, 16);
    const protonMat = new THREE.MeshStandardMaterial({ color: 0xff2244, emissive: 0xff0020, emissiveIntensity: 0.8, roughness: 0.3 });
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Mesh(protonGeo, protonMat);
      p.position.set(
        (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.15
      );
      nucleusGroup.add(p);
    }
    nucleusGroup.visible = false;
    objectsGroup.add(nucleusGroup);

    // ── Atom: nucleus + electron ring
    const atomGroup = new THREE.Group();
    atomGroup.add(nucleusGroup.clone());
    const ringGeo = new THREE.TorusGeometry(0.25, 0.004, 8, 80);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x0066ff, emissiveIntensity: 1.0, roughness: 0.2 });
    for (let a = 0; a < 3; a++) {
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = (a / 3) * Math.PI;
      ring.rotation.y = (a / 2) * Math.PI * 0.5;
      atomGroup.add(ring);
    }
    atomGroup.visible = false;
    objectsGroup.add(atomGroup);

    // ── Human figure (simplified stick-like)
    const humanGroup = new THREE.Group();
    const humanMat = new THREE.MeshStandardMaterial({ color: 0xffcc88, emissive: 0xff8844, emissiveIntensity: 0.15, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.6, 12), humanMat);
    body.position.y = 0.3;
    humanGroup.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), humanMat);
    head.position.y = 0.7;
    humanGroup.add(head);
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.55, 8), humanMat);
    legL.position.set(-0.08, -0.12, 0);
    legL.rotation.z = 0.1;
    humanGroup.add(legL);
    const legR = legL.clone();
    legR.position.set(0.08, -0.12, 0);
    legR.rotation.z = -0.1;
    humanGroup.add(legR);
    humanGroup.visible = false;
    objectsGroup.add(humanGroup);

    // ── Earth
    const earthMesh = makeSphere(1.0, 0x2288ff, 0.2);
    const earthAtmo = new THREE.Mesh(
      new THREE.SphereGeometry(1.04, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x2244aa, emissiveIntensity: 0.1, transparent: true, opacity: 0.15, side: THREE.BackSide })
    );
    const earthGroup = new THREE.Group();
    earthGroup.add(earthMesh, earthAtmo);
    earthGroup.visible = false;
    objectsGroup.add(earthGroup);

    // ── Sun
    const sunMesh = makeSphere(2.5, 0xffdd44, 3.0);
    const sunGlow = new THREE.Mesh(
      new THREE.SphereGeometry(3.0, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.06, side: THREE.BackSide })
    );
    const sunGroup = new THREE.Group();
    sunGroup.add(sunMesh, sunGlow);
    sunGroup.visible = false;
    objectsGroup.add(sunGroup);

    // ── Solar System (simplified: Sun + orbit rings + planets as dots)
    const solarGroup = new THREE.Group();
    const sunSmall = makeSphere(0.5, 0xffdd44, 2.5);
    solarGroup.add(sunSmall);
    const orbitColors = [0x4488ff, 0xffaa44, 0x4488ff, 0xff6644, 0xddaa66, 0xddcc88, 0x88ccff, 0x66aacc];
    const orbitRadii = [3, 4.5, 6, 8, 11, 15, 20, 25];
    const planetSizes = [0.06, 0.1, 0.07, 0.08, 0.3, 0.25, 0.2, 0.18];
    orbitRadii.forEach((r, i) => {
      const orbitRing = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.005, 8, 120),
        new THREE.MeshStandardMaterial({ color: orbitColors[i], emissive: orbitColors[i], emissiveIntensity: 0.3 })
      );
      orbitRing.rotation.x = Math.PI / 2;
      solarGroup.add(orbitRing);
      const planet = makeSphere(planetSizes[i], orbitColors[i], 0.2);
      const angle = Math.random() * Math.PI * 2;
      planet.position.set(r * Math.cos(angle), 0, r * Math.sin(angle));
      planet.userData.orbitRadius = r;
      planet.userData.orbitSpeed = (0.3 + Math.random() * 0.4) / r;
      solarGroup.add(planet);
    });
    solarGroup.visible = false;
    objectsGroup.add(solarGroup);

    // ── Galaxy (spiral arm representation)
    function buildGalaxy() {
      const group = new THREE.Group();
      const coreGeo = new THREE.SphereGeometry(0.8, 32, 32);
      const coreMat = new THREE.MeshStandardMaterial({ color: 0xffeedd, emissive: 0xffcc88, emissiveIntensity: 1.5, roughness: 0.2 });
      group.add(new THREE.Mesh(coreGeo, coreMat));

      const spiralArms = 4;
      const particlesPerArm = 2000;
      const galaxyGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(spiralArms * particlesPerArm * 3);
      const galaxyColors = new Float32Array(spiralArms * particlesPerArm * 3);

      for (let arm = 0; arm < spiralArms; arm++) {
        const armPhase = (arm / spiralArms) * Math.PI * 2;
        for (let i = 0; i < particlesPerArm; i++) {
          const idx = (arm * particlesPerArm + i) * 3;
          const t = i / particlesPerArm;
          const r = 0.8 + t * 7.0;
          const spinAngle = armPhase + t * 2.5;
          const spread = (1 - t) * 0.4 + 0.1;
          positions[idx]     = r * Math.cos(spinAngle) + (Math.random() - 0.5) * spread;
          positions[idx + 1] = (Math.random() - 0.5) * 0.3 * (1 - t);
          positions[idx + 2] = r * Math.sin(spinAngle) + (Math.random() - 0.5) * spread;

          const colorT = Math.random();
          galaxyColors[idx]     = 0.6 + colorT * 0.4;
          galaxyColors[idx + 1] = 0.5 + colorT * 0.3;
          galaxyColors[idx + 2] = 0.3 + colorT * 0.5;
        }
      }
      galaxyGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      galaxyGeo.setAttribute('color',    new THREE.BufferAttribute(galaxyColors, 3));
      const galaxyMat = new THREE.PointsMaterial({ size: 0.08, vertexColors: true, transparent: true, opacity: 0.85, sizeAttenuation: true });
      group.add(new THREE.Points(galaxyGeo, galaxyMat));

      // Halo
      const haloGeo = new THREE.SphereGeometry(7, 32, 32);
      const haloMat = new THREE.MeshStandardMaterial({ color: 0x223355, emissive: 0x112244, emissiveIntensity: 0.1, transparent: true, opacity: 0.08, side: THREE.BackSide });
      group.add(new THREE.Mesh(haloGeo, haloMat));
      return group;
    }
    const galaxyGroup = buildGalaxy();
    galaxyGroup.visible = false;
    objectsGroup.add(galaxyGroup);

    // ── Observable Universe (giant sphere with subtle glow, galaxy dots)
    function buildUniverse() {
      const group = new THREE.Group();
      const uniGeo = new THREE.SphereGeometry(20, 64, 64);
      const uniMat = new THREE.MeshStandardMaterial({
        color: 0x080820,
        emissive: 0x040410,
        emissiveIntensity: 0.1,
        transparent: true,
        opacity: 0.12,
        side: THREE.BackSide,
        wireframe: false,
      });
      group.add(new THREE.Mesh(uniGeo, uniMat));

      // Tiny galaxy dots on the inside surface
      const dotCount = 2000;
      const dotGeo = new THREE.BufferGeometry();
      const dotPos = new Float32Array(dotCount * 3);
      for (let i = 0; i < dotCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const r     = 19.5 + Math.random() * 0.5;
        dotPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
        dotPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        dotPos[i * 3 + 2] = r * Math.cos(phi);
      }
      dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3));
      const dotMat = new THREE.PointsMaterial({ size: 0.06, color: 0xaaccff, transparent: true, opacity: 0.7 });
      group.add(new THREE.Points(dotGeo, dotMat));
      return group;
    }
    const universeGroup = buildUniverse();
    universeGroup.visible = false;
    objectsGroup.add(universeGroup);

    // ─── Labels (CSS2D) ──────────────────────────────────────────────────────
    function makeLabel(text, color = '#a8c8ff') {
      const div = document.createElement('div');
      div.style.cssText = `
        color: ${color};
        font-size: 12px;
        font-family: 'Segoe UI', system-ui, sans-serif;
        background: rgba(0,0,20,0.65);
        border: 1px solid rgba(100,120,255,0.2);
        border-radius: 4px;
        padding: 3px 8px;
        pointer-events: none;
        white-space: nowrap;
        backdrop-filter: blur(4px);
      `;
      div.textContent = text;
      const obj = new CSS2DObject(div);
      return obj;
    }

    const labels = {};

    // Add a label anchored to a mesh
    function addLabel(name, mesh, text, offset = new THREE.Vector3(0, 0.3, 0)) {
      const lbl = makeLabel(text);
      lbl.position.copy(offset);
      mesh.add(lbl);
      labels[name] = lbl;
    }

    addLabel('planck-lbl', planckDot, 'Planck Length (1.6×10⁻³⁵ m)');
    addLabel('nucleus-lbl', nucleusGroup, 'Atomic Nucleus (1–10 fm)');
    addLabel('atom-lbl', atomGroup, 'Atom (~0.1 nm)');
    addLabel('human-lbl', humanGroup, 'Human (~1.7 m)', new THREE.Vector3(0, 0.9, 0));
    addLabel('earth-lbl', earthGroup, 'Earth (r = 6,371 km)', new THREE.Vector3(0, 1.2, 0));
    addLabel('sun-lbl', sunGroup, 'Sun (r = 696,000 km)', new THREE.Vector3(0, 2.8, 0));
    addLabel('ss-lbl', solarGroup, 'Solar System (~90 AU)', new THREE.Vector3(0, 5, 0));
    addLabel('galaxy-lbl', galaxyGroup, 'Milky Way (~100 kly)', new THREE.Vector3(0, 8, 0));
    addLabel('universe-lbl', universeGroup, 'Observable Universe (93 Gly)', new THREE.Vector3(0, 22, 0));

    // Hide all labels initially
    Object.values(labels).forEach(l => (l.visible = false));

    // ─── Lighting ─────────────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0x111122, 1.0);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 2, 1e20);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0x4488ff, 1, 1e20);
    pointLight2.position.set(-10, -10, -10);
    scene.add(pointLight2);

    // ─── Camera Animation State ───────────────────────────────────────────────
    let currentScale = 'planck';
    let targetCamZ   = SCALE_DEFS.planck.camZ;
    let currentCamZ  = targetCamZ;
    let animSpeed    = 0.08;
    let labelVisible = true;

    function goToScale(key) {
      if (!SCALE_DEFS[key]) return;
      currentScale = key;
      targetCamZ   = SCALE_DEFS[key].camZ;

      // Update UI
      document.getElementById('scale-name').textContent  = SCALE_DEFS[key].name;
      document.getElementById('scale-value').textContent = SCALE_DEFS[key].value;
      document.getElementById('scale-desc').textContent  = SCALE_DEFS[key].desc;

      document.querySelectorAll('.scale-btn').forEach(b => b.classList.remove('active'));
      const btn = document.querySelector(`.scale-btn[data-scale="${key}"]`);
      if (btn) btn.classList.add('active');

      // Show correct object(s)
      const visibilityMap = {
        planck:      planckDot,
        nucleus:     nucleusGroup,
        atom:        atomGroup,
        human:       humanGroup,
        earth:       earthGroup,
        sun:         sunGroup,
        'solar-system': solarGroup,
        galaxy:      galaxyGroup,
        universe:    universeGroup,
      };
      const allObjs = [planckDot, nucleusGroup, atomGroup, humanGroup, earthGroup, sunGroup, solarGroup, galaxyGroup, universeGroup];
      allObjs.forEach(o => { o.visible = o === visibilityMap[key]; });

      // Show/hide labels
      Object.entries(labels).forEach(([k, l]) => {
        l.visible = labelVisible && k.startsWith(currentScale);
      });

      // Reset camera position for each scale
      camera.position.set(0, 0, targetCamZ * 2);
      camera.lookAt(0, 0, 0);
      controls.update();
    }

    // Button handlers
    document.querySelectorAll('.scale-btn').forEach(btn => {
      btn.addEventListener('click', () => goToScale(btn.dataset.scale));
    });

    // ─── GUI ──────────────────────────────────────────────────────────────────
    const gui = new GUI({ title: '🌌 Scale Controls' });
    gui.domElement.style.position = 'fixed';
    gui.domElement.style.top = '90px';
    gui.domElement.style.left = '10px';

    const animFolder = gui.addFolder('Animation');
    animFolder.add({ speed: animSpeed }, 'speed', 0.01, 0.3, 0.01).onChange(v => { animSpeed = v; }).name('Transition Speed');
    animFolder.open();

    const visFolder = gui.addFolder('Visibility');
    visFolder.add({ labels: true }, 'labels').onChange(v => {
      labelVisible = v;
      Object.values(labels).forEach(l => { l.visible = v; });
    }).name('Show Labels');
    visFolder.open();

    const renderFolder = gui.addFolder('Render');
    renderFolder.add({ bgStars: true }, 'bgStars').onChange(v => {
      starField.visible = v;
    }).name('Background Stars');
    renderFolder.open();

    // ─── Resize Handler ──────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      labelRenderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ─── Animation Loop ──────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    let elapsed = 0;

    function animate() {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      elapsed += delta;

      // Smooth camera zoom
      currentCamZ += (targetCamZ - currentCamZ) * animSpeed;
      const dir = camera.position.clone().normalize();
      camera.position.copy(dir.multiplyScalar(currentCamZ));
      camera.lookAt(0, 0, 0);

      // Gentle object rotation / pulsing
      planckDot.rotation.y  = elapsed * 0.5;
      planckDot.rotation.x  = elapsed * 0.3;
      planckDot.scale.setScalar(1 + 0.15 * Math.sin(elapsed * 4));

      nucleusGroup.rotation.y  = elapsed * 0.4;
      nucleusGroup.rotation.x  = elapsed * 0.2;

      atomGroup.rotation.y  = elapsed * 0.3;
      atomGroup.children[0].rotation.y = -elapsed * 0.5; // nucleus

      humanGroup.rotation.y = Math.sin(elapsed * 0.3) * 0.05;

      earthGroup.rotation.y = elapsed * 0.2;

      sunMesh.material.emissiveIntensity = 2.5 + Math.sin(elapsed * 2) * 0.5;

      solarGroup.rotation.y = elapsed * 0.03;
      solarGroup.children.forEach(child => {
        if (child.userData.orbitRadius) {
          const angle = elapsed * child.userData.orbitSpeed;
          child.position.set(
            child.userData.orbitRadius * Math.cos(angle),
            0,
            child.userData.orbitRadius * Math.sin(angle)
          );
        }
      });

      galaxyGroup.rotation.y = elapsed * 0.01;
      universeGroup.rotation.y = elapsed * 0.003;

      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    }

    // ─── Mount for Debugging ─────────────────────────────────────────────────
    window._3js = {
      scene, camera, renderer, controls,
      objectsGroup, labels,
      goToScale, SCALE_DEFS,
      planckDot, nucleusGroup, atomGroup, humanGroup,
      earthGroup, sunGroup, solarGroup, galaxyGroup, universeGroup,
    };

    // ─── Init ────────────────────────────────────────────────────────────────
    goToScale('planck');
    animate();

    console.log('[PlanckScaleUniverse] Ready. Try: _3js.goToScale("galaxy")');