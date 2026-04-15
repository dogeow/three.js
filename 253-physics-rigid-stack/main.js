import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import * as CANNON from 'cannon-es';

    // ── Scene ────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(8, 10, 14);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // ── Lighting ─────────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-8, 5, -8);
    scene.add(fillLight);

    // ── Physics ──────────────────────────────────────────────────────────────
    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    (world.solver as any).iterations = 10;

    const fixedTimeStep = 1 / 60;
    let accumulator = 0;

    // ── Materials ─────────────────────────────────────────────────────────────
    const defaultMaterial = new CANNON.Material('default');
    const contactMaterial = new CANNON.ContactMaterial(defaultMaterial, defaultMaterial, {
      friction: 0.5,
      restitution: 0.1,
    });
    world.addContactMaterial(contactMaterial);
    world.defaultContactMaterial = contactMaterial;

    // ── Ground ────────────────────────────────────────────────────────────────
    // Visual
    const groundGeo = new THREE.PlaneGeometry(40, 40);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Physics
    const groundBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);

    // ── Visual platform ────────────────────────────────────────────────────────
    const platformGeo = new THREE.BoxGeometry(6, 0.4, 6);
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7 });
    const platformMesh = new THREE.Mesh(platformGeo, platformMat);
    platformMesh.position.y = 0.2;
    platformMesh.castShadow = true;
    platformMesh.receiveShadow = true;
    scene.add(platformMesh);

    // Physics platform body
    const platformBody = new CANNON.Body({ type: CANNON.Body.STATIC });
    platformBody.addShape(new CANNON.Box(new CANNON.Vec3(3, 0.2, 3)));
    platformBody.position.set(0, 0.2, 0);
    world.addBody(platformBody);

    // ── Box factory ────────────────────────────────────────────────────────────
    const boxColors = [
      0xe74c3c, 0xe67e22, 0xf1c40f, 0x2ecc71,
      0x3498db, 0x9b59b6, 0x1abc9c, 0xe91e63,
      0xff9800, 0x00bcd4,
    ];

    const boxes = [];

    function makeBox(size, position, quaternion) {
      // Visual
      const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
      const color = boxColors[Math.floor(Math.random() * boxColors.length)];
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      // Physics
      const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
      const body = new CANNON.Body({ mass: 1, material: defaultMaterial });
      body.addShape(new CANNON.Box(halfExtents));
      body.position.set(position.x, position.y, position.z);
      if (quaternion) {
        body.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
      }
      world.addBody(body);

      boxes.push({ mesh, body });
      return { mesh, body };
    }

    function buildTower() {
      const baseX = 0, baseY = 0.4, baseZ = 0;
      for (let i = 0; i < 12; i++) {
        const w = 2.2 - i * 0.08;
        const h = 0.6;
        const d = 2.2 - i * 0.08;
        const x = baseX + (Math.random() - 0.5) * 0.1;
        const y = baseY + i * 0.6 + h / 2;
        const z = baseZ + (Math.random() - 0.5) * 0.1;
        makeBox({ x: w, y: h, z: d }, { x, y, z }, null);
      }
    }

    function addBox() {
      const w = 0.8 + Math.random() * 1.4;
      const h = 0.6 + Math.random() * 0.8;
      const d = 0.8 + Math.random() * 1.4;
      const x = (Math.random() - 0.5) * 6;
      const y = 8 + Math.random() * 4;
      const z = (Math.random() - 0.5) * 6;
      const euler = new THREE.Euler(
        Math.random() * Math.PI * 0.4,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 0.4,
      );
      const q = new THREE.Quaternion().setFromEuler(euler);
      makeBox(
        { x: w, y: h, z: d },
        { x, y, z },
        { x: q.x, y: q.y, z: q.z, w: q.w },
      );
    }

    function reset() {
      for (const { mesh, body } of boxes) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.MeshStandardMaterial).dispose();
        world.removeBody(body);
      }
      boxes.length = 0;
      buildTower();
    }

    // Initial tower
    buildTower();

    // ── UI ─────────────────────────────────────────────────────────────────────
    document.getElementById('addBtn')!.addEventListener('click', addBox);
    document.getElementById('resetBtn')!.addEventListener('click', reset);

    // ── Resize ─────────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ── Loop ───────────────────────────────────────────────────────────────────
    let lastTime = performance.now();

    function animate() {
      requestAnimationFrame(animate);

      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      accumulator += delta;
      while (accumulator >= fixedTimeStep) {
        world.step(fixedTimeStep);
        accumulator -= fixedTimeStep;
      }

      for (const { mesh, body } of boxes) {
        mesh.position.copy(body.position as unknown as THREE.Vector3);
        mesh.quaternion.copy(body.quaternion as unknown as THREE.Quaternion);
      }

      controls.update();
      renderer.render(scene, camera);
    }

    animate();