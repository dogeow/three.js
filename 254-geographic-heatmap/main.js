import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
    import GUI from 'lil-gui';

    // ─── Scene setup ───────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    scene.fog = new THREE.Fog(0x0a0a0f, 60, 120);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(0, 35, 45);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    document.body.appendChild(labelRenderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 10;
    controls.maxDistance = 100;
    controls.maxPolarAngle = Math.PI / 2.1;

    // ─── Lighting ──────────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0x334466, 0.8);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x4466aa, 0.4);
    fillLight.position.set(-15, 10, -10);
    scene.add(fillLight);

    // ─── Color scales ──────────────────────────────────────────────────────────
    const SCALES = {
      thermal: [
        new THREE.Color(0x1a00ff),
        new THREE.Color(0x00aaff),
        new THREE.Color(0x00ffaa),
        new THREE.Color(0xaaff00),
        new THREE.Color(0xff6600),
        new THREE.Color(0xff0000),
      ],
      cool: [
        new THREE.Color(0x000033),
        new THREE.Color(0x003366),
        new THREE.Color(0x0099cc),
        new THREE.Color(0x66ccff),
        new THREE.Color(0xccf2ff),
        new THREE.Color(0xffffff),
      ],
      warm: [
        new THREE.Color(0x1a0000),
        new THREE.Color(0x660000),
        new THREE.Color(0xcc3300),
        new THREE.Color(0xff8800),
        new THREE.Color(0xffdd00),
        new THREE.Color(0xffffaa),
      ],
      viridis: [
        new THREE.Color(0x440154),
        new THREE.Color(0x3b528b),
        new THREE.Color(0x21918c),
        new THREE.Color(0x5ec962),
        new THREE.Color(0xfde725),
      ],
    };

    function getColor(value, scale) {
      const colors = SCALES[scale] || SCALES.thermal;
      const t = Math.max(0, Math.min(1, value));
      const idx = t * (colors.length - 1);
      const i = Math.min(Math.floor(idx), colors.length - 2);
      const f = idx - i;
      return colors[i].clone().lerp(colors[i + 1], f);
    }

    // ─── Ground plane with grid ────────────────────────────────────────────────
    const GRID = 20;
    const CELL = 2;
    const HALF = (GRID * CELL) / 2;

    const groundGeo = new THREE.PlaneGeometry(GRID * CELL + 4, GRID * CELL + 4);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0d0d18,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    scene.add(ground);

    // Border lines (country-like outline)
    const borderPoints = [
      new THREE.Vector3(-HALF - 1, 0, -HALF - 1),
      new THREE.Vector3( HALF + 1, 0, -HALF - 1),
      new THREE.Vector3( HALF + 1, 0,  HALF + 1),
      new THREE.Vector3(-HALF - 1, 0,  HALF + 1),
      new THREE.Vector3(-HALF - 1, 0, -HALF - 1),
    ];
    const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPoints);
    const borderLine = new THREE.Line(borderGeo, new THREE.LineBasicMaterial({ color: 0x445566, linewidth: 2 }));
    borderLine.position.y = 0.01;
    scene.add(borderLine);

    // Grid lines on ground
    const gridLineMat = new THREE.LineBasicMaterial({ color: 0x1a2233, transparent: true, opacity: 0.6 });
    const gridLines = [];
    for (let i = 0; i <= GRID; i++) {
      const x = -HALF + i * CELL;
      const hGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 0, -HALF - 1),
        new THREE.Vector3(x, 0, HALF + 1),
      ]);
      gridLines.push(new THREE.Line(hGeo, gridLineMat));
      const vGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-HALF - 1, 0, x),
        new THREE.Vector3(HALF + 1, 0, x),
      ]);
      gridLines.push(new THREE.Line(vGeo, gridLineMat));
    }
    gridLines.forEach(l => { l.position.y = 0.02; scene.add(l); });

    // ─── Generate procedural data ─────────────────────────────────────────────
    function generateData() {
      const data = [];
      for (let x = 0; x < GRID; x++) {
        for (let z = 0; z < GRID; z++) {
          // Clustered random values using sine modulators for organic look
          const cx = (x - GRID / 2) / (GRID / 2);
          const cz = (z - GRID / 2) / (GRID / 2);
          const dist = Math.sqrt(cx * cx + cz * cz);
          const base = (Math.sin(x * 0.7 + 1.3) * Math.cos(z * 0.9 + 0.7) + 1) / 2;
          const noise = Math.random() * 0.4;
          const value = Math.max(0, Math.min(1, base * (1 - dist * 0.5) + noise));
          data.push({ x, z, value });
        }
      }
      return data;
    }

    // ─── Build bar mesh ────────────────────────────────────────────────────────
    const barGroup = new THREE.Group();
    scene.add(barGroup);
    const labels = [];

    const params = {
      colorScale: 'thermal',
      autoRotate: false,
      barThickness: 0.75,
      labelThreshold: 0.55,
      rotationSpeed: 0.3,
    };

    let data = generateData();

    function buildBars() {
      // Remove old bars
      while (barGroup.children.length) {
        barGroup.remove(barGroup.children[0]);
      }
      labels.forEach(l => scene.remove(l));
      labels.length = 0;

      const thickness = params.barThickness;
      const gap = CELL - thickness;

      data.forEach(({ x, z, value }) => {
        const height = value * 18 + 0.08;
        const geo = new THREE.BoxGeometry(thickness, height, thickness);
        geo.translate(0, height / 2, 0);

        const color = getColor(value, params.colorScale);
        const mat = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.4,
          metalness: 0.2,
          emissive: color.clone().multiplyScalar(0.15),
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
          -HALF + x * CELL + gap / 2,
          0,
          -HALF + z * CELL + gap / 2
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.value = value;
        barGroup.add(mesh);

        // CSS2D label for high bars
        if (value >= params.labelThreshold) {
          const labelDiv = document.createElement('div');
          labelDiv.className = 'label-inner';
          labelDiv.textContent = value.toFixed(2);
          const label = new CSS2DObject(labelDiv);
          label.position.set(0, height + 0.5, 0);
          mesh.add(label);
          labels.push(label);
        }
      });
    }

    buildBars();

    // ─── GUI ───────────────────────────────────────────────────────────────────
    const gui = new GUI({ title: '🌡️ Heatmap Controls' });
    gui.add(params, 'colorScale', Object.keys(SCALES)).name('Color Scale').onChange(() => {
      updateColors();
    });
    gui.add(params, 'autoRotate').name('Auto Rotate');
    gui.add(params, 'rotationSpeed', 0.1, 2.0).name('Rotate Speed');
    gui.add(params, 'barThickness', 0.3, 1.4, 0.05).name('Bar Thickness').onChange(() => buildBars());
    gui.add(params, 'labelThreshold', 0.0, 1.0, 0.05).name('Label Threshold').onChange(() => buildBars());
    gui.add({ regenerate: () => { data = generateData(); buildBars(); } }, 'regenerate').name('🔄 Regenerate Data');

    function updateColors() {
      barGroup.children.forEach(mesh => {
        const value = mesh.userData.value;
        const color = getColor(value, params.colorScale);
        mesh.material.color = color;
        mesh.material.emissive = color.clone().multiplyScalar(0.15);
      });
    }

    // ─── Axis helpers ──────────────────────────────────────────────────────────
    function buildAxisLine(start, end, color) {
      const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color }));
      scene.add(line);
    }
    buildAxisLine(new THREE.Vector3(-HALF - 2, 0, -HALF - 2), new THREE.Vector3(HALF + 2, 0, -HALF - 2), 0xff4444);
    buildAxisLine(new THREE.Vector3(-HALF - 2, 0, -HALF - 2), new THREE.Vector3(-HALF - 2, 0, HALF + 2), 0x44ff44);

    // Axis labels
    function makeTextSprite(text, x, y, z, color) {
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = color;
      ctx.font = 'bold 36px monospace';
      ctx.fillText(text, 10, 44);
      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(x, y, z);
      sprite.scale.set(4, 2, 1);
      scene.add(sprite);
    }
    makeTextSprite('Lng', HALF + 3, 1, -HALF - 2, '#ff6666');
    makeTextSprite('Lat', -HALF - 2, 1, HALF + 3, '#66ff66');

    // ─── Resize handler ────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      labelRenderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ─── Animation loop ────────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      if (params.autoRotate) {
        barGroup.rotation.y += params.rotationSpeed * delta;
      }
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    }
    animate();