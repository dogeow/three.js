import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import GUI from 'three/addons/libs/lil-gui.module.min.js';

    // ============================================================
    // Planet Data
    // ============================================================
    const PLANET_DATA = [
      {
        name: 'Mercury', color: 0x999999, radius: 0.4,
        orbitRadius: 10, period: 2, phase: 0,
        eccentricity: 0.2, hasRings: false, moons: []
      },
      {
        name: 'Venus', color: 0xe6c87a, radius: 0.9,
        orbitRadius: 16, period: 4, phase: 1.2,
        eccentricity: 0.007, hasRings: false, moons: []
      },
      {
        name: 'Earth', color: 0x4a90d9, radius: 1.0,
        orbitRadius: 22, period: 6, phase: 2.5,
        eccentricity: 0.017, hasRings: false, moons: [
          { name: 'Moon', color: 0xaaaaaa, radius: 0.3, orbitRadius: 2.5, period: 0.8, phase: 0 }
        ]
      },
      {
        name: 'Mars', color: 0xc1440e, radius: 0.5,
        orbitRadius: 30, period: 8, phase: 0.8,
        eccentricity: 0.093, hasRings: false, moons: []
      },
      {
        name: 'Jupiter', color: 0xd4a574, radius: 3.5,
        orbitRadius: 50, period: 18, phase: 3.0,
        eccentricity: 0.049, hasRings: false, moons: [
          { name: 'Io', color: 0xe8d66a, radius: 0.35, orbitRadius: 5.5, period: 0.4, phase: 0 },
          { name: 'Europa', color: 0xc8b89a, radius: 0.3, orbitRadius: 7.0, period: 0.6, phase: 1.0 },
          { name: 'Ganymede', color: 0x9a8870, radius: 0.45, orbitRadius: 9.0, period: 0.9, phase: 2.0 },
          { name: 'Callisto', color: 0x6a5a4a, radius: 0.4, orbitRadius: 11.0, period: 1.3, phase: 0.5 }
        ]
      },
      {
        name: 'Saturn', color: 0xf4d59e, radius: 3.0,
        orbitRadius: 70, period: 32, phase: 4.5,
        eccentricity: 0.056, hasRings: true, moons: [
          { name: 'Titan', color: 0xd4a040, radius: 0.5, orbitRadius: 7.0, period: 0.6, phase: 0 },
          { name: 'Enceladus', color: 0xd0e8f0, radius: 0.25, orbitRadius: 5.0, period: 0.4, phase: 1.5 }
        ]
      },
      {
        name: 'Uranus', color: 0x89cff0, radius: 2.0,
        orbitRadius: 90, period: 64, phase: 5.2,
        eccentricity: 0.046, hasRings: false, moons: []
      },
      {
        name: 'Neptune', color: 0x3f54ba, radius: 1.9,
        orbitRadius: 110, period: 90, phase: 1.0,
        eccentricity: 0.010, hasRings: false, moons: [
          { name: 'Triton', color: 0xa8c8e8, radius: 0.45, orbitRadius: 4.5, period: 0.7, phase: 0 }
        ]
      }
    ];

    // ============================================================
    // Scene Setup
    // ============================================================
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(0, 30, 60);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 600;
    controls.target.set(0, 0, 0);

    // ============================================================
    // Starfield Background
    // ============================================================
    function createStarfield() {
      const starCount = 12000;
      const positions = new Float32Array(starCount * 3);
      const colors = new Float32Array(starCount * 3);
      const sizes = new Float32Array(starCount);

      for (let i = 0; i < starCount; i++) {
        // Distribute on a large sphere
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 1500 + Math.random() * 500;

        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        // Slightly varied star colors (white to light blue/yellow)
        const t = Math.random();
        if (t < 0.6) {
          colors[i * 3] = 1.0; colors[i * 3 + 1] = 1.0; colors[i * 3 + 2] = 1.0;
        } else if (t < 0.8) {
          colors[i * 3] = 0.8; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 1.0;
        } else {
          colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.95; colors[i * 3 + 2] = 0.8;
        }

        sizes[i] = 0.5 + Math.random() * 2.0;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const mat = new THREE.PointsMaterial({
        size: 1.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        sizeAttenuation: false
      });

      return new THREE.Points(geo, mat);
    }

    scene.add(createStarfield());

    // ============================================================
    // Lighting
    // ============================================================
    const ambientLight = new THREE.AmbientLight(0x111133, 0.3);
    scene.add(ambientLight);

    // Sun's point light
    const sunLight = new THREE.PointLight(0xfff8e7, 3.0, 800, 1.0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 500;
    scene.add(sunLight);

    const sunLightHelper = new THREE.PointLightHelper(sunLight, 1);

    // ============================================================
    // Sun
    // ============================================================
    const SUN_RADIUS = 5.0;

    function createSun() {
      const group = new THREE.Group();
      group.name = 'Sun';

      // Core emissive sphere
      const sunGeo = new THREE.SphereGeometry(SUN_RADIUS, 64, 64);
      const sunMat = new THREE.MeshBasicMaterial({
        color: 0xffee88
      });
      const sunMesh = new THREE.Mesh(sunGeo, sunMat);
      sunMesh.name = 'SunCore';
      group.add(sunMesh);

      // Glow layers
      const glowColors = [0xffee55, 0xffaa22, 0xff6600];
      const glowOpacities = [0.3, 0.15, 0.08];
      const glowSizes = [1.15, 1.35, 1.6];

      glowColors.forEach((color, i) => {
        const glowGeo = new THREE.SphereGeometry(SUN_RADIUS * glowSizes[i], 32, 32);
        const glowMat = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: glowOpacities[i],
          side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.name = `SunGlow${i}`;
        group.add(glow);
      });

      // Corona effect with particles
      const coronaCount = 500;
      const coronaPositions = new Float32Array(coronaCount * 3);
      for (let i = 0; i < coronaCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = SUN_RADIUS * 1.2 + Math.random() * SUN_RADIUS * 0.8;
        coronaPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        coronaPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        coronaPositions[i * 3 + 2] = r * Math.cos(phi);
      }
      const coronaGeo = new THREE.BufferGeometry();
      coronaGeo.setAttribute('position', new THREE.BufferAttribute(coronaPositions, 3));
      const coronaMat = new THREE.PointsMaterial({
        color: 0xffcc44,
        size: 0.15,
        transparent: true,
        opacity: 0.6
      });
      const corona = new THREE.Points(coronaGeo, coronaMat);
      corona.name = 'Corona';
      group.add(corona);

      return group;
    }

    const sunGroup = createSun();
    scene.add(sunGroup);

    // ============================================================
    // Ring Texture Generator
    // ============================================================
    function createRingTexture() {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 1;
      const ctx = c.getContext('2d');

      const grad = ctx.createLinearGradient(0, 0, 512, 0);
      grad.addColorStop(0.00, 'rgba(0,0,0,0)');
      grad.addColorStop(0.05, 'rgba(210,180,140,0.2)');
      grad.addColorStop(0.12, 'rgba(220,190,150,0.9)');
      grad.addColorStop(0.22, 'rgba(180,150,100,0.5)');
      grad.addColorStop(0.30, 'rgba(230,200,160,1.0)');
      grad.addColorStop(0.40, 'rgba(160,130,80,0.6)');
      grad.addColorStop(0.50, 'rgba(240,210,170,1.0)');
      grad.addColorStop(0.60, 'rgba(170,140,90,0.5)');
      grad.addColorStop(0.70, 'rgba(200,170,120,0.8)');
      grad.addColorStop(0.80, 'rgba(150,120,70,0.4)');
      grad.addColorStop(0.88, 'rgba(210,180,140,0.9)');
      grad.addColorStop(0.95, 'rgba(180,150,100,0.2)');
      grad.addColorStop(1.00, 'rgba(0,0,0,0)');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 1);

      // Add subtle banding
      for (let i = 0; i < 512; i += 8) {
        const alpha = 0.03 + Math.random() * 0.05;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fillRect(i, 0, 4, 1);
      }

      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      return tex;
    }

    function createSaturnRing(planetRadius) {
      const ringGeo = new THREE.RingGeometry(
        planetRadius * 1.35,
        planetRadius * 2.6,
        128
      );

      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xd4c49e,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        map: createRingTexture()
      });

      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.rotation.z = 0.15; // Slight tilt like real Saturn
      return ring;
    }

    // ============================================================
    // Atmosphere Glow
    // ============================================================
    function createAtmosphere(color, radius) {
      const atmosGeo = new THREE.SphereGeometry(radius * 1.05, 32, 32);
      const atmosMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide
      });
      return new THREE.Mesh(atmosGeo, atmosMat);
    }

    // ============================================================
    // Orbital Path
    // ============================================================
    function createOrbitPath(radius, eccentricity = 0) {
      const segments = 256;
      const points = [];
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const r = radius * (1 - eccentricity * eccentricity) / (1 + eccentricity * Math.cos(angle));
        points.push(new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: 0x4455aa,
        transparent: true,
        opacity: 0.18
      });
      return new THREE.LineLoop(geo, mat);
    }

    // ============================================================
    // Create Moon
    // ============================================================
    function createMoon(moonData, planetGroup, moonMeshes) {
      const moonGeo = new THREE.SphereGeometry(moonData.radius, 24, 24);
      const moonMat = new THREE.MeshStandardMaterial({
        color: moonData.color,
        roughness: 0.8,
        metalness: 0.1
      });
      const moonMesh = new THREE.Mesh(moonGeo, moonMat);
      moonMesh.castShadow = true;

      // Orbit pivot
      const pivot = new THREE.Object3D();
      pivot.add(moonMesh);
      moonMesh.position.x = moonData.orbitRadius;

      moonMeshes.push({
        mesh: moonMesh,
        pivot: pivot,
        data: moonData,
        group: planetGroup
      });

      return pivot;
    }

    // ============================================================
    // Create Planet
    // ============================================================
    const planetObjects = [];
    const moonObjects = [];
    const orbitPaths = [];
    const ringObjects = [];
    const atmosphereObjects = [];

    function createPlanet(data) {
      const group = new THREE.Group();
      group.name = data.name;

      // Planet mesh
      const geo = new THREE.SphereGeometry(data.radius, 48, 48);
      const mat = new THREE.MeshStandardMaterial({
        color: data.color,
        roughness: 0.7,
        metalness: 0.1
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      // Atmosphere
      const atmos = createAtmosphere(data.color, data.radius);
      group.add(atmos);
      atmosphereObjects.push({ obj: atmos, data });

      // Saturn ring
      if (data.hasRings) {
        const ring = createSaturnRing(data.radius);
        group.add(ring);
        ringObjects.push({ obj: ring, data });
      }

      // Moons
      const moonPivot = new THREE.Object3D();
      data.moons.forEach(moonData => {
        const moonRoot = createMoon(moonData, group, moonObjects);
        moonPivot.add(moonRoot);
      });
      if (data.moons.length > 0) {
        group.add(moonPivot);
      }

      // Orbit path
      const orbitPath = createOrbitPath(data.orbitRadius, data.eccentricity);
      scene.add(orbitPath);
      orbitPaths.push(orbitPath);

      // Orbit pivot for the whole planet
      const orbitPivot = new THREE.Object3D();
      group.position.x = data.orbitRadius;
      orbitPivot.add(group);

      planetObjects.push({
        group: group,
        orbitPivot: orbitPivot,
        mesh: mesh,
        data: data
      });

      return orbitPivot;
    }

    // ============================================================
    // Build Solar System
    // ============================================================
    const solarGroup = new THREE.Group();
    scene.add(solarGroup);

    PLANET_DATA.forEach(data => {
      const orbitPivot = createPlanet(data);
      solarGroup.add(orbitPivot);
    });

    // ============================================================
    // GUI
    // ============================================================
    const params = {
      timeScale: 0.5,
      showOrbits: true,
      showRings: true,
      showMoons: true,
      planetScale: 1.0,
      distanceScale: 1.0,
      autoRotate: false,
      rotationSpeed: 1.0
    };

    const gui = new GUI({ title: '控制面板 Controls' });
    gui.domElement.style.setProperty('--width', '260px');

    const timeFolder = gui.addFolder('时间 Time');
    timeFolder.add(params, 'timeScale', 0.0, 5.0, 0.01).name('时间速度 Time Scale');
    timeFolder.add(params, 'autoRotate').name('自动旋转 Auto Rotate');
    timeFolder.add(params, 'rotationSpeed', 0.1, 5.0, 0.1).name('自转速度 Rotation Speed');

    const displayFolder = gui.addFolder('显示 Display');
    displayFolder.add(params, 'showOrbits').name('轨道线 Orbits').onChange(v => {
      orbitPaths.forEach(p => { p.visible = v; });
    });
    displayFolder.add(params, 'showRings').name('土星环 Rings').onChange(v => {
      ringObjects.forEach(r => { r.obj.visible = v; });
    });
    displayFolder.add(params, 'showMoons').name('卫星 Moons').onChange(v => {
      moonObjects.forEach(m => { m.pivot.visible = v; });
    });

    const scaleFolder = gui.addFolder('缩放 Scale');
    scaleFolder.add(params, 'planetScale', 0.1, 3.0, 0.05).name('行星大小 Planet Size').onChange(applyScale);
    scaleFolder.add(params, 'distanceScale', 0.1, 2.0, 0.05).name('轨道距离 Distance').onChange(applyScale);

    function applyScale() {
      planetObjects.forEach(obj => {
        const data = obj.data;
        const visualRadius = data.radius * params.planetScale;
        obj.mesh.scale.setScalar(visualRadius / data.radius);

        // Update atmosphere
        const atmos = obj.group.children.find(c => c.name && c.name.includes('atmos'));
        if (atmos) {
          atmos.scale.setScalar(visualRadius / data.radius * 1.05 / (data.radius));
        }
      });

      // Update orbit paths
      orbitPaths.forEach((path, i) => {
        const data = PLANET_DATA[i];
        path.scale.setScalar(params.distanceScale);
      });

      // Update planet orbit pivot scale
      planetObjects.forEach((obj, i) => {
        obj.orbitPivot.scale.setScalar(params.distanceScale);
      });
    }

    // ============================================================
    // Animation Loop
    // ============================================================
    let time = 0;
    let lastTime = performance.now();

    function getOrbitalPosition(a, e, t, period, phase) {
      const angle = (t / period) * Math.PI * 2 + phase;
      const r = a * (1 - e * e) / (1 + e * Math.cos(angle));
      return [
        Math.cos(angle) * r,
        Math.sin(angle) * r
      ];
    }

    function animate() {
      requestAnimationFrame(animate);

      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (params.timeScale > 0) {
        time += delta * params.timeScale;
      }

      // Animate sun rotation and corona
      sunGroup.rotation.y += delta * 0.1 * params.rotationSpeed;
      const corona = sunGroup.getObjectByName('Corona');
      if (corona) corona.rotation.y -= delta * 0.05;

      // Animate planets
      planetObjects.forEach(obj => {
        const data = obj.data;

        // Self rotation
        obj.mesh.rotation.y += delta * params.rotationSpeed * (data.name === 'Jupiter' ? 1.5 : 0.5);

        // Atmosphere pulse
        const atmos = obj.group.children.find(c => c.name && c.name.includes('SunGlow') === false && c.geometry && c.geometry.type === 'SphereGeometry' && c.material && c.material.side === THREE.BackSide);
        // Find atmosphere by checking BackSide material
        obj.group.children.forEach(child => {
          if (child.material && child.material.side === THREE.BackSide && child.geometry && child.geometry.type === 'SphereGeometry' && child !== obj.mesh) {
            const pulse = 1 + Math.sin(time * 2) * 0.02;
            child.scale.setScalar(pulse);
          }
        });

        // Orbital position
        const [x, z] = getOrbitalPosition(data.orbitRadius, data.eccentricity, time, data.period, data.phase);
        obj.orbitPivot.rotation.y = 0; // Reset rotation
        obj.group.position.set(x, 0, z);
      });

      // Animate moons
      moonObjects.forEach(m => {
        const [mx, mz] = getOrbitalPosition(m.data.orbitRadius, 0, time, m.data.period, m.data.phase);
        m.mesh.position.set(mx, 0, mz);
      });

      // Animate sun glow
      sunGroup.children.forEach(child => {
        if (child.name && child.name.startsWith('SunGlow')) {
          const idx = parseInt(child.name.replace('SunGlow', ''));
          const pulse = 1 + Math.sin(time * (1.5 + idx * 0.5)) * 0.03 * (idx + 1);
          child.scale.setScalar(pulse);
        }
      });

      controls.update();
      renderer.render(scene, camera);
    }

    // ============================================================
    // Resize Handler
    // ============================================================
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ============================================================
    // Start
    // ============================================================
    // Apply initial scale
    applyScale();

    // Hide loading
    const loading = document.getElementById('loading');
    loading.style.opacity = '0';
    setTimeout(() => { loading.style.display = 'none'; }, 800);

    animate();