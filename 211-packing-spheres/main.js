import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

    // ─── Renderer ───────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // ─── Scene & Camera ────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0e14);
    scene.fog = new THREE.FogExp2(0x0b0e14, 0.018);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(18, 14, 22);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 5;
    controls.maxDistance = 80;

    // ─── Lights ────────────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0x304060, 1.2);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffeedd, 2.5);
    sun.position.set(12, 25, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 80;
    sun.shadow.camera.left = sun.shadow.camera.bottom = -20;
    sun.shadow.camera.right = sun.shadow.camera.top = 20;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0x4466aa, 0.8);
    fill.position.set(-10, 5, -10);
    scene.add(fill);

    const rim = new THREE.PointLight(0x6699ff, 1.5, 50);
    rim.position.set(0, 15, -15);
    scene.add(rim);

    // ─── Container box (wireframe) ──────────────────────────────────────────────
    function buildContainer(size) {
      const geo = new THREE.BoxGeometry(size, size, size);
      const edges = new THREE.EdgesGeometry(geo);
      const mat = new THREE.LineBasicMaterial({ color: 0x334466, transparent: true, opacity: 0.5 });
      const wire = new THREE.LineSegments(edges, mat);
      wire.position.y = size / 2;
      return wire;
    }

    let containerWire = buildContainer(10);
    scene.add(containerWire);

    // ─── Sphere palette ────────────────────────────────────────────────────────
    const PALETTE = [
      0x4fc3f7, 0x29b6f6, 0x039be5,   // blues
      0x81d4fa, 0x4dd0e1, 0x26c6da,   // cyans
      0x80cbc4, 0x4db6ac, 0x26a69a,   // teals
      0x80bcd4, 0x64b5f6, 0x42a5f5,   // sky
      0x7e57c2, 0x5c6bc0, 0x7986cb,   // indigo
      0xb39ddb, 0x9575cd, 0x7e57c2,   // purple
    ];

    // ─── Packing algorithms ────────────────────────────────────────────────────
    /**
     * FCC — face-centered cubic (cubic close packing).
     * Layers stacked ABCABC… Each layer is a triangular grid.
     */
    function generateFCC(sphereRadius, containerSize) {
      const positions = [];
      const layerColors = [];
      const d = sphereRadius * 2;
      // layer height for tetrahedral stacking
      const layerH = sphereRadius * Math.sqrt(2 / 3) * 2; // = 2*r*sqrt(2/3)
      // horizontal spacing
      const dx = sphereRadius * 2;
      const dz = sphereRadius * Math.sqrt(3);

      let layer = 0;
      let y = sphereRadius;

      while (y + sphereRadius <= containerSize) {
        // stagger every other row
        const staggerX = (layer % 2 === 0) ? 0 : sphereRadius;
        const staggerZ = (layer % 2 === 0) ? 0 : sphereRadius * Math.sqrt(3) / 2;

        for (let xi = -1; xi * dx < containerSize + d; xi++) {
          for (let zi = -1; zi * dz < containerSize + d; zi++) {
            const x = xi * dx + staggerX;
            const z = zi * dz + staggerZ;
            if (x < -sphereRadius || x > containerSize + sphereRadius) continue;
            if (z < -sphereRadius || z > containerSize + sphereRadius) continue;

            // Skip some positions to create FCC pattern (remove body-centered sphere)
            // In layer 0: regular triangular; in layer 1: offset by half-step
            positions.push(x, y, z);
            const colorIdx = layer % PALETTE.length;
            layerColors.push(PALETTE[colorIdx]);
          }
        }
        // move to next layer — alternate between 2 offset patterns
        y += layerH;
        layer++;
      }

      return { positions, layerColors };
    }

    /**
     * HCP — hexagonal close packing (ABAB… stacking).
     */
    function generateHCP(sphereRadius, containerSize) {
      const positions = [];
      const layerColors = [];
      const dx = sphereRadius * 2;
      const dz = sphereRadius * Math.sqrt(3);
      const layerH = sphereRadius * Math.sqrt(2 / 3) * 2;

      let layer = 0;
      let y = sphereRadius;

      while (y + sphereRadius <= containerSize) {
        const staggerX = (layer % 2 === 0) ? 0 : sphereRadius;

        for (let xi = -1; xi * dx < containerSize + dx; xi++) {
          for (let zi = -1; zi * dz < containerSize + dz; zi++) {
            const x = xi * dx + staggerX;
            const z = zi * dz;
            if (x < -sphereRadius || x > containerSize + sphereRadius) continue;
            if (z < -sphereRadius || z > containerSize + sphereRadius) continue;

            positions.push(x, y, z);
            const colorIdx = layer % PALETTE.length;
            layerColors.push(PALETTE[colorIdx]);
          }
        }
        y += layerH;
        layer++;
      }

      return { positions, layerColors };
    }

    // ─── InstancedMesh ─────────────────────────────────────────────────────────
    const sphereGeo = new THREE.SphereGeometry(1, 24, 16);
    const sphereMat = new THREE.MeshStandardMaterial({
      metalness: 0.15,
      roughness: 0.35,
    });

    let instancedMesh = null;
    const dummy = new THREE.Object3D();

    function buildMesh(count) {
      if (instancedMesh) {
        scene.remove(instancedMesh);
        instancedMesh.geometry.dispose();
        instancedMesh = null;
      }
      if (count === 0) return;

      instancedMesh = new THREE.InstancedMesh(sphereGeo, sphereMat, count);
      instancedMesh.castShadow = true;
      instancedMesh.receiveShadow = true;
      instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(instancedMesh);
    }

    // ─── Params ────────────────────────────────────────────────────────────────
    const params = {
      algorithm: 'FCC',
      containerSize: 10,
      sphereRadius: 0.5,
      visible: true,
      autoRotate: false,
    };

    let sphereCount = 0;
    let packedPositions = [];
    let packedColors = [];

    function repack() {
      const { algorithm, containerSize, sphereRadius } = params;
      const result = algorithm === 'FCC'
        ? generateFCC(sphereRadius, containerSize)
        : generateHCP(sphereRadius, containerSize);

      packedPositions = result.positions;
      packedColors = result.layerColors;
      sphereCount = packedPositions.length / 3;

      // Update container wireframe
      scene.remove(containerWire);
      containerWire = buildContainer(containerSize);
      scene.add(containerWire);

      buildMesh(sphereCount);

      // Apply transforms & colors
      for (let i = 0; i < sphereCount; i++) {
        dummy.position.set(packedPositions[i * 3], packedPositions[i * 3 + 1], packedPositions[i * 3 + 2]);
        dummy.scale.setScalar(sphereRadius);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
        instancedMesh.setColorAt(i, new THREE.Color(packedColors[i]));
      }

      if (instancedMesh) {
        instancedMesh.instanceMatrix.needsUpdate = true;
        instancedMesh.instanceColor.needsUpdate = true;
      }

      document.getElementById('stats').textContent =
        `Algorithm: ${algorithm}  |  Spheres: ${sphereCount}  |  Radius: ${sphereRadius}`;
    }

    // ─── GUI ───────────────────────────────────────────────────────────────────
    const gui = new GUI({ title: 'Sphere Packing' });
    gui.add(params, 'algorithm', { 'FCC (ABC…)': 'FCC', 'HCP (ABAB…)': 'HCP' }).name('Algorithm').onChange(repack);
    gui.add(params, 'containerSize', 4, 20, 0.5).name('Container Size').onChange(repack);
    gui.add(params, 'sphereRadius', 0.2, 1.5, 0.05).name('Sphere Radius').onChange(repack);
    gui.add(params, 'visible').name('Show Spheres').onChange(v => {
      if (instancedMesh) instancedMesh.visible = v;
    });
    gui.add(params, 'autoRotate').name('Auto Rotate').onChange(v => {
      controls.autoRotate = v;
    });

    // ─── Resize ────────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ─── Animate ───────────────────────────────────────────────────────────────
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      controls.update();
      renderer.render(scene, camera);
    }

    repack();
    animate();

    // ─── Expose for debug ─────────────────────────────────────────────────────
    window.THREE = THREE;
    window.scene = scene;
    window.camera = camera;
    window.renderer = renderer;
    window.instancedMesh = instancedMesh;
    window.params = params;
    window.repack = repack;