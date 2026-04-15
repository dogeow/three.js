import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

    // ─── Config ────────────────────────────────────────────────────────────────
    const BOID_COUNT = 200;
    const BOUNDS = { x: 30, y: 15, z: 30 };
    const SEP_DIST = 2.0, ALI_DIST = 5.0, COH_DIST = 6.0;
    const SEP_W = 1.5, ALI_W = 1.0, COH_W = 1.0;
    const MAX_SPEED_BASE = 0.08;
    const WAYPOINT_COUNT = 8;

    let maxSpeed = MAX_SPEED_BASE;

    // ─── Scene Setup ──────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010a05);
    scene.fog = new THREE.FogExp2(0x010a05, 0.025);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(0, 12, 28);
    camera.lookAt(0, 4, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 4, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI * 0.85;
    controls.minDistance = 5;
    controls.maxDistance = 80;
    controls.update();

    // ─── Lighting ─────────────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0x102010, 0.4);
    scene.add(ambientLight);

    const moonLight = new THREE.DirectionalLight(0x224422, 0.6);
    moonLight.position.set(-20, 30, 10);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.set(1024, 1024);
    moonLight.shadow.camera.near = 0.5;
    moonLight.shadow.camera.far = 80;
    moonLight.shadow.camera.left = -40;
    moonLight.shadow.camera.right = 40;
    moonLight.shadow.camera.top = 40;
    moonLight.shadow.camera.bottom = -40;
    scene.add(moonLight);

    // ─── Ground ──────────────────────────────────────────────────────────────
    const groundGeo = new THREE.PlaneGeometry(120, 120, 40, 40);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0a1a08,
      roughness: 0.95,
      metalness: 0.0,
    });
    // Slight height variation
    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i), z = posAttr.getZ(i);
      const h = Math.sin(x * 0.3) * Math.cos(z * 0.3) * 0.15 + Math.random() * 0.05;
      posAttr.setY(i, h);
    }
    groundGeo.computeVertexNormals();
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // ─── Trees ────────────────────────────────────────────────────────────────
    const treeGroup = new THREE.Group();

    function createTree(x, z, scale) {
      const g = new THREE.Group();
      const trunkGeo = new THREE.CylinderGeometry(0.15 * scale, 0.2 * scale, 2 * scale, 6);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x1a0f06, roughness: 1 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = scale;
      trunk.castShadow = true;
      g.add(trunk);

      const foliageMat = new THREE.MeshStandardMaterial({ color: 0x071207, roughness: 1 });
      const layers = 3;
      for (let i = 0; i < layers; i++) {
        const r = (1.4 - i * 0.3) * scale;
        const h = (1.8 - i * 0.2) * scale;
        const coneGeo = new THREE.ConeGeometry(r, h, 7);
        const cone = new THREE.Mesh(coneGeo, foliageMat);
        cone.position.y = 2 * scale + i * (1.2 * scale);
        cone.castShadow = true;
        g.add(cone);
      }

      g.position.set(x, 0, z);
      return g;
    }

    const treePositions = [
      [-18, -15, 1.2], [-15, -18, 0.9], [-20, -10, 1.4], [18, -16, 1.1],
      [15, -19, 1.3], [20, -8, 0.8], [-16, 14, 1.0], [-19, 17, 1.5],
      [-22, 0, 1.2], [22, 2, 1.0], [5, -22, 0.9], [-8, 21, 1.3],
      [12, 20, 1.1], [0, -24, 1.4], [16, 18, 0.7], [-10, -22, 1.0],
      [24, -12, 1.2], [-24, 8, 0.9], [10, -20, 1.3], [-6, 23, 1.1],
    ];
    treePositions.forEach(([x, z, s]) => treeGroup.add(createTree(x, z, s)));
    scene.add(treeGroup);

    // ─── Boids Data ──────────────────────────────────────────────────────────
    const boids = [];
    const waypoints = [];

    function rand(min, max) { return min + Math.random() * (max - min); }

    function initWaypoints() {
      waypoints.length = 0;
      for (let i = 0; i < WAYPOINT_COUNT; i++) {
        waypoints.push(new THREE.Vector3(
          rand(-BOUNDS.x, BOUNDS.x),
          rand(1, BOUNDS.y),
          rand(-BOUNDS.z, BOUNDS.z)
        ));
      }
    }

    function createBoid(i) {
      return {
        position: new THREE.Vector3(rand(-BOUNDS.x, BOUNDS.x), rand(1, BOUNDS.y), rand(-BOUNDS.z, BOUNDS.z)),
        velocity: new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(maxSpeed),
        acceleration: new THREE.Vector3(),
        phase: Math.random() * Math.PI * 2,
        isLeader: i < 5,
      };
    }

    for (let i = 0; i < BOID_COUNT; i++) boids.push(createBoid(i));
    initWaypoints();

    let currentWaypoint = 0;
    function getWaypoint() { return waypoints[currentWaypoint]; }
    function advanceWaypoint() {
      currentWaypoint = (currentWaypoint + 1) % waypoints.length;
      // Set new random target for current waypoint
      waypoints[currentWaypoint].set(
        rand(-BOUNDS.x, BOUNDS.x),
        rand(1, BOUNDS.y),
        rand(-BOUNDS.z, BOUNDS.z)
      );
    }

    // ─── Firefly Mesh (InstancedMesh) ─────────────────────────────────────────
    const fireflyGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const fireflyMat = new THREE.MeshStandardMaterial({
      color: 0x223300,
      emissive: new THREE.Color(0xaaff33),
      emissiveIntensity: 1.5,
      roughness: 0.5,
      metalness: 0.0,
    });
    const fireflyMesh = new THREE.InstancedMesh(fireflyGeo, fireflyMat, BOID_COUNT);
    fireflyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(fireflyMesh);

    // Leader point lights
    const leaderLights = [];
    for (let i = 0; i < 5; i++) {
      const pl = new THREE.PointLight(0xaaff33, 0.8, 6);
      scene.add(pl);
      leaderLights.push(pl);
    }

    // ─── Boid Simulation ──────────────────────────────────────────────────────
    const _sep = new THREE.Vector3();
    const _ali = new THREE.Vector3();
    const _coh = new THREE.Vector3();
    const _way = new THREE.Vector3();
    const _diff = new THREE.Vector3();
    const _tmp = new THREE.Vector3();
    const _zero = new THREE.Vector3();
    const _dummy = new THREE.Object3D();

    let waypointTimer = 0;

    function updateBoids(dt) {
      waypointTimer += dt;
      if (waypointTimer > 4.0) {
        waypointTimer = 0;
        advanceWaypoint();
        initWaypoints();
      }

      const target = getWaypoint();

      for (let i = 0; i < boids.length; i++) {
        const b = boids[i];

        _sep.set(0, 0, 0); _ali.set(0, 0, 0); _coh.set(0, 0, 0);
        let sepCount = 0, aliCount = 0, cohCount = 0;

        for (let j = 0; j < boids.length; j++) {
          if (i === j) continue;
          const other = boids[j];
          _tmp.subVectors(b.position, other.position);
          const d = _tmp.length();

          if (d < SEP_DIST && d > 0.001) {
            _tmp.normalize().divideScalar(d);
            _sep.add(_tmp);
            sepCount++;
          }
          if (d < ALI_DIST) {
            _ali.add(other.velocity);
            aliCount++;
          }
          if (d < COH_DIST) {
            _coh.add(other.position);
            cohCount++;
          }
        }

        b.acceleration.set(0, 0, 0);

        if (sepCount > 0) { _sep.divideScalar(sepCount).multiplyScalar(SEP_W); b.acceleration.add(_sep); }
        if (aliCount > 0) { _ali.divideScalar(aliCount).subtract(b.velocity).multiplyScalar(ALI_W); b.acceleration.add(_ali); }
        if (cohCount > 0) {
          _coh.divideScalar(cohCount).subtract(b.position).multiplyScalar(COH_W);
          b.acceleration.add(_coh);
        }

        // Attraction to waypoint
        _way.subVectors(target, b.position);
        const wd = _way.length();
        if (wd > 0.1) {
          _way.normalize().multiplyScalar(0.06);
          b.acceleration.add(_way);
        }

        // Gentle upward bias
        b.acceleration.y += 0.001;

        // Speed limit
        b.velocity.add(b.acceleration);
        const sp = b.velocity.length();
        if (sp > maxSpeed * 1.5) b.velocity.multiplyScalar((maxSpeed * 1.5) / sp);
        if (sp < maxSpeed * 0.3) b.velocity.multiplyScalar((maxSpeed * 0.3) / Math.max(sp, 0.001));

        // Boundary steering
        const margin = 3, turn = 0.15;
        if (b.position.x < -BOUNDS.x + margin) b.velocity.x += turn;
        if (b.position.x >  BOUNDS.x - margin) b.velocity.x -= turn;
        if (b.position.y < 1)                 b.velocity.y += turn;
        if (b.position.y > BOUNDS.y - margin)  b.velocity.y -= turn;
        if (b.position.z < -BOUNDS.z + margin) b.velocity.z += turn;
        if (b.position.z >  BOUNDS.z - margin) b.velocity.z -= turn;

        b.position.add(b.velocity);

        // Update instance matrix
        _dummy.position.copy(b.position);
        _dummy.lookAt(b.position.clone().add(b.velocity));
        _dummy.updateMatrix();
        fireflyMesh.setMatrixAt(i, _dummy.matrix);
      }

      fireflyMesh.instanceMatrix.needsUpdate = true;
    }

    function updateGlow(time) {
      for (let i = 0; i < boids.length; i++) {
        const b = boids[i];
        const intensity = 0.6 + 0.7 * Math.sin(time * 3.5 + b.phase);
        fireflyMat.emissiveIntensity = 1.2 + intensity * 0.8;

        if (i < leaderLights.length) {
          leaderLights[i].position.copy(b.position);
          leaderLights[i].intensity = 0.3 + 0.6 * Math.sin(time * 4 + b.phase);
        }
      }
    }

    // ─── UI ───────────────────────────────────────────────────────────────────
    const countEl = document.getElementById('countDisplay');
    const fpsEl = document.getElementById('fpsDisplay');
    const speedSlider = document.getElementById('speedSlider');
    const speedVal = document.getElementById('speedVal');

    countEl.textContent = BOID_COUNT;

    speedSlider.addEventListener('input', () => {
      maxSpeed = MAX_SPEED_BASE * parseFloat(speedSlider.value);
      speedVal.textContent = parseFloat(speedSlider.value).toFixed(1);
    });

    // ─── Resize ───────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ─── Animation Loop ───────────────────────────────────────────────────────
    let lastTime = 0, fpsTimer = 0, frameCount = 0;

    function animate(timestamp) {
      requestAnimationFrame(animate);

      const time = timestamp * 0.001;
      const dt = Math.min(time - lastTime, 0.05);
      lastTime = time;

      updateBoids(dt);
      updateGlow(time);
      controls.update();

      // FPS
      frameCount++;
      fpsTimer += dt;
      if (fpsTimer >= 0.5) {
        fpsEl.textContent = Math.round(frameCount / fpsTimer);
        frameCount = 0;
        fpsTimer = 0;
      }

      renderer.render(scene, camera);
    }

    animate(0);

    // ─── Expose to window ─────────────────────────────────────────────────────
    window.scene = scene;
    window.camera = camera;
    window.renderer = renderer;
    window.controls = controls;
    window.fireflyMesh = fireflyMesh;
    window.boids = boids;
    window.waypoints = waypoints;