import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

    // ─── Scene Setup ───────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    scene.fog = new THREE.FogExp2(0x0a0a0f, 0.012);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(35, 25, 35);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 120;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;

    // ─── Lights ─────────────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0x4060a0, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff4e0, 2.5);
    sunLight.position.set(40, 60, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 200;
    sunLight.shadow.camera.left = -60;
    sunLight.shadow.camera.right = 60;
    sunLight.shadow.camera.top = 60;
    sunLight.shadow.camera.bottom = -60;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x8090c0, 0.4);
    fillLight.position.set(-20, 15, -15);
    scene.add(fillLight);

    // ─── Parameters ────────────────────────────────────────────────────────
    const params = {
      width: 6,
      depth: 5,
      floors: 18,
      windowDensity: 0.72,
      isNight: false,
      regenerate: () => build(),
    };

    let isNight = false;

    // ─── Building Group ─────────────────────────────────────────────────────
    let buildingGroup = new THREE.Group();
    scene.add(buildingGroup);

    // ─── Materials ─────────────────────────────────────────────────────────
    const concreteMaterial = new THREE.MeshStandardMaterial({
      color: 0x8a8880,
      roughness: 0.85,
      metalness: 0.05,
    });

    const concreteDarkMaterial = new THREE.MeshStandardMaterial({
      color: 0x606060,
      roughness: 0.9,
      metalness: 0.02,
    });

    const concreteLightMaterial = new THREE.MeshStandardMaterial({
      color: 0xa8a8a0,
      roughness: 0.8,
      metalness: 0.05,
    });

    // Window materials (InstancedMesh will swap emissive per instance)
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2a,
      roughness: 0.1,
      metalness: 0.8,
    });

    // ─── Build ─────────────────────────────────────────────────────────────
    function seededRandom(seed) {
      let s = seed;
      return function () {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
      };
    }

    function build() {
      // Clear old building
      while (buildingGroup.children.length) {
        const child = buildingGroup.children[0];
        child.traverse(obj => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
          }
        });
        buildingGroup.remove(child);
      }

      const rng = seededRandom(params.width * 100 + params.depth * 10 + params.floors);
      const W = params.width;
      const D = params.depth;
      const floors = params.floors;
      const floorHeight = 1.0;
      const buildingHeight = floors * floorHeight;

      // ── Main Body ──────────────────────────────────────────────────────────
      const bodyGeo = new THREE.BoxGeometry(W, buildingHeight, D);
      const body = new THREE.Mesh(bodyGeo, concreteMaterial);
      body.position.y = buildingHeight / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      buildingGroup.add(body);

      // ── Setback Top Floor ───────────────────────────────────────────────────
      if (W > 4 && D > 4) {
        const setbackH = floorHeight * 1.5;
        const setbackGeo = new THREE.BoxGeometry(W * 0.8, setbackH, D * 0.8);
        const setback = new THREE.Mesh(setbackGeo, concreteLightMaterial);
        setback.position.y = buildingHeight + setbackH / 2;
        setback.castShadow = true;
        setback.receiveShadow = true;
        buildingGroup.add(setback);
      }

      // ── Cornice / Parapet ────────────────────────────────────────────────────
      const corniceH = 0.35;
      const corniceGeo = new THREE.BoxGeometry(W + 0.4, corniceH, D + 0.4);
      const cornice = new THREE.Mesh(corniceGeo, concreteDarkMaterial);
      cornice.position.y = buildingHeight + corniceH / 2;
      cornice.castShadow = true;
      buildingGroup.add(cornice);

      // ── Roof Slab ───────────────────────────────────────────────────────────
      const roofGeo = new THREE.BoxGeometry(W * 0.7, 0.2, D * 0.7);
      const roof = new THREE.Mesh(roofGeo, concreteDarkMaterial);
      roof.position.y = buildingHeight + corniceH + 0.1;
      roof.castShadow = true;
      roof.receiveShadow = true;
      buildingGroup.add(roof);

      // ── Roof Details ─────────────────────────────────────────────────────────
      const roofDetailGroup = new THREE.Group();
      roofDetailGroup.position.y = buildingHeight + corniceH + 0.3;

      // Elevator penthouse
      const pentGeo = new THREE.BoxGeometry(W * 0.18, floorHeight * 1.2, D * 0.18);
      const pent = new THREE.Mesh(pentGeo, concreteDarkMaterial);
      pent.position.set(W * 0.2, floorHeight * 0.6, D * 0.15);
      pent.castShadow = true;
      roofDetailGroup.add(pent);

      // Stairwell housing
      const stairGeo = new THREE.BoxGeometry(W * 0.25, floorHeight * 0.9, D * 0.22);
      const stair = new THREE.Mesh(stairGeo, concreteLightMaterial);
      stair.position.set(-W * 0.25, floorHeight * 0.45, -D * 0.25);
      stair.castShadow = true;
      roofDetailGroup.add(stair);

      // Antenna cluster
      const antennaMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6, metalness: 0.8 });
      for (let i = 0; i < 3; i++) {
        const antH = 1.5 + rng() * 2.5;
        const antGeo = new THREE.CylinderGeometry(0.04, 0.04, antH, 6);
        const ant = new THREE.Mesh(antGeo, antennaMat);
        ant.position.set(
          (i - 1) * W * 0.12,
          floorHeight * 1.2 + antH / 2,
          (i === 0 ? 1 : -1) * D * 0.1
        );
        ant.castShadow = true;
        roofDetailGroup.add(ant);
      }

      // AC units on roof
      for (let i = 0; i < 6; i++) {
        const acW = 0.4 + rng() * 0.4;
        const acD = 0.4 + rng() * 0.4;
        const acH = 0.25 + rng() * 0.2;
        const acGeo = new THREE.BoxGeometry(acW, acH, acD);
        const ac = new THREE.Mesh(acGeo, concreteDarkMaterial);
        const angle = rng() * Math.PI * 2;
        const r = 1.5 + rng() * (Math.min(W, D) * 0.3);
        ac.position.set(
          Math.cos(angle) * r,
          acH / 2,
          Math.sin(angle) * r
        );
        ac.castShadow = true;
        roofDetailGroup.add(ac);
      }

      buildingGroup.add(roofDetailGroup);

      // ── Balconies ───────────────────────────────────────────────────────────
      const balconyDepth = 0.5;
      const balconyH = 0.08;
      const balconyMat = concreteLightMaterial;

      for (let f = 1; f < floors; f += 2) {
        const y = f * floorHeight;

        // Front balcony row
        const balGeoF = new THREE.BoxGeometry(W * 0.6, balconyH, balconyDepth);
        const balF = new THREE.Mesh(balGeoF, balconyMat);
        balF.position.set(0, y + floorHeight / 2, D / 2 + balconyDepth / 2);
        balF.castShadow = true;
        balF.receiveShadow = true;
        buildingGroup.add(balF);

        // Railing
        const railGeo = new THREE.BoxGeometry(W * 0.6, 0.4, 0.03);
        const railMat = new THREE.MeshStandardMaterial({ color: 0x909090, roughness: 0.4, metalness: 0.7 });
        const railF = new THREE.Mesh(railGeo, railMat);
        railF.position.set(0, y + floorHeight / 2 + 0.24, D / 2 + balconyDepth);
        buildingGroup.add(railF);

        // Side balcony (random)
        if (rng() > 0.4) {
          const balGeoS = new THREE.BoxGeometry(balconyDepth, balconyH, D * 0.45);
          const balS = new THREE.Mesh(balGeoS, balconyMat);
          balS.position.set(W / 2 + balconyDepth / 2, y + floorHeight / 2, 0);
          balS.castShadow = true;
          balS.receiveShadow = true;
          buildingGroup.add(balS);
        }
      }

      // ── Windows (InstancedMesh) ──────────────────────────────────────────────
      const winW = 0.55;
      const winH = 0.7;
      const winD = 0.08;
      const winSpacingX = 1.3;
      const winSpacingY = 1.0;

      const colsX = Math.max(1, Math.floor((W - 1.2) / winSpacingX));
      const colsZ = Math.max(1, Math.floor((D - 1.2) / winSpacingX));
      const rows = Math.max(1, Math.floor((buildingHeight - 2) / winSpacingY));

      // Total windows (4 sides)
      const totalWindows = (colsX * rows + colsZ * rows) * 2;
      const windowGeo = new THREE.BoxGeometry(winW, winH, winD);

      const windowMesh = new THREE.InstancedMesh(windowGeo, windowMaterial, totalWindows);
      windowMesh.castShadow = false;
      windowMesh.receiveShadow = false;

      const dummy = new THREE.Object3D();
      const colors = new Float32Array(totalWindows * 3);
      const emissives = new Float32Array(totalWindows * 3);
      let idx = 0;

      function placeWindow(x, y, z, nx, ny, nz, sideIdx) {
        dummy.position.set(x, y, z);
        dummy.scale.set(1, 1, 1);
        dummy.lookAt(x + nx, y + ny, z + nz);
        dummy.updateMatrix();
        windowMesh.setMatrixAt(idx, dummy.matrix);

        // Window color variation
        const warmth = 0.6 + rng() * 0.4;
        const baseBrightness = isNight ? 0.8 : 0.1;
        const r = warmth * baseBrightness;
        const g = (warmth * 0.85 + 0.15) * baseBrightness;
        const b = (warmth * 0.4 + 0.1) * baseBrightness;

        colors[idx * 3] = r;
        colors[idx * 3 + 1] = g;
        colors[idx * 3 + 2] = b;

        // Emissive
        emissives[idx * 3] = r * (isNight ? 1.5 : 0.0);
        emissives[idx * 3 + 1] = g * (isNight ? 1.2 : 0.0);
        emissives[idx * 3 + 2] = b * (isNight ? 0.6 : 0.0);

        idx++;
      }

      // Front & Back windows (Z axis)
      const startX = -W / 2 + 0.8;
      const startZ = -D / 2 + 0.8;
      const startY = 1.2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < colsX; c++) {
          const x = startX + c * winSpacingX;
          const y = startY + r * winSpacingY;

          if (rng() < params.windowDensity) {
            // Front
            placeWindow(x, y, D / 2 + winD, 0, 0, 1, 0);
            // Back
            placeWindow(x, y, -D / 2 - winD, 0, 0, -1, 1);
          }
        }
      }

      // Side windows (X axis)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < colsZ; c++) {
          const z = startZ + c * winSpacingX;
          const y = startY + r * winSpacingY;

          if (rng() < params.windowDensity) {
            // Right
            placeWindow(W / 2 + winD, y, z, 1, 0, 0, 2);
            // Left
            placeWindow(-W / 2 - winD, y, z, -1, 0, 0, 3);
          }
        }
      }

      windowMesh.instanceMatrix.needsUpdate = true;
      windowMesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
      windowMesh.instanceColor.needsUpdate = true;

      // Apply emissive via material
      windowMaterial.emissive.setScalar(isNight ? 1.0 : 0.0);
      windowMaterial.emissiveIntensity = isNight ? 0.9 : 0.0;
      windowMaterial.color.setStyle(isNight ? '#ffeecc' : '#1a1a2a');

      buildingGroup.add(windowMesh);

      // ── Ground Floor / Plinth ────────────────────────────────────────────────
      const plinthGeo = new THREE.BoxGeometry(W + 0.6, floorHeight * 0.8, D + 0.6);
      const plinth = new THREE.Mesh(plinthGeo, concreteDarkMaterial);
      plinth.position.y = floorHeight * 0.4;
      plinth.castShadow = true;
      plinth.receiveShadow = true;
      buildingGroup.add(plinth);

      // Entrance canopy
      const canopyGeo = new THREE.BoxGeometry(W * 0.35, 0.1, 1.2);
      const canopy = new THREE.Mesh(canopyGeo, concreteLightMaterial);
      canopy.position.set(0, floorHeight * 1.5, D / 2 + 0.8);
      canopy.castShadow = true;
      buildingGroup.add(canopy);

      // ── Scattered Surrounding Buildings (silhouettes) ─────────────────────────
      const bgMat = new THREE.MeshStandardMaterial({ color: 0x303035, roughness: 0.9 });
      const bgPositions = [
        { x: 25, z: 10, w: 4, d: 4, h: 12 },
        { x: -18, z: 20, w: 5, d: 5, h: 8 },
        { x: 15, z: -15, w: 3, d: 6, h: 15 },
        { x: -22, z: -12, w: 6, d: 4, h: 10 },
        { x: 30, z: -5, w: 4, d: 4, h: 20 },
        { x: -10, z: 25, w: 5, d: 5, h: 6 },
        { x: 8, z: 30, w: 7, d: 5, h: 9 },
      ];

      bgPosData = bgPositions;
      bgPosData.forEach(bp => {
        const geo = new THREE.BoxGeometry(bp.w, bp.h, bp.d);
        const mesh = new THREE.Mesh(geo, bgMat);
        mesh.position.set(bp.x, bp.h / 2, bp.z);
        mesh.receiveShadow = true;
        buildingGroup.add(mesh);
      });
    }

    build();

    // ─── Ground & Sky ───────────────────────────────────────────────────────
    const gridHelper = new THREE.GridHelper(80, 40, 0x333344, 0x222233);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 1.0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    // ─── Sky Gradient ─────────────────────────────────────────────────────────
    const skyGeo = new THREE.SphereGeometry(150, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0a0a1a) },
        bottomColor: { value: new THREE.Color(0x1a1a2e) },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y * 0.5 + 0.5;
          gl_FragColor = vec4(mix(bottomColor, topColor, h), 1.0);
        }
      `,
      side: THREE.BackSide,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    // ─── Day/Night Toggle ───────────────────────────────────────────────────
    function setDayNight(night) {
      isNight = night;
      if (night) {
        scene.background.setHex(0x05050f);
        scene.fog.color.setHex(0x05050f);
        ambientLight.intensity = 0.15;
        ambientLight.color.setHex(0x2030a0);
        sunLight.intensity = 0.3;
        sunLight.color.setHex(0x8090c0);
        fillLight.intensity = 0.1;
        windowMaterial.emissive.setScalar(1.0);
        windowMaterial.emissiveIntensity = 0.9;
        windowMaterial.color.setStyle('#ffeecc');
        renderer.toneMappingExposure = 0.8;
      } else {
        scene.background.setHex(0x0a0a0f);
        scene.fog.color.setHex(0x0a0a0f);
        ambientLight.intensity = 0.6;
        ambientLight.color.setHex(0x4060a0);
        sunLight.intensity = 2.5;
        sunLight.color.setHex(0xfff4e0);
        fillLight.intensity = 0.4;
        windowMaterial.emissive.setScalar(0.0);
        windowMaterial.emissiveIntensity = 0.0;
        windowMaterial.color.setHex(0x1a1a2a);
        renderer.toneMappingExposure = 1.2;
      }
    }

    // ─── GUI ─────────────────────────────────────────────────────────────────
    const gui = new GUI({ title: 'Architecture Generator' });
    gui.domElement.style.setProperty('font-family', 'Courier New, monospace');

    const buildingFolder = gui.addFolder('Building');
    buildingFolder.add(params, 'width', 3, 10, 1).name('Width').onChange(() => build());
    buildingFolder.add(params, 'depth', 3, 10, 1).name('Depth').onChange(() => build());
    buildingFolder.add(params, 'floors', 5, 30, 1).name('Floors').onChange(() => build());

    const facadeFolder = gui.addFolder('Facade');
    facadeFolder.add(params, 'windowDensity', 0.3, 1.0, 0.01).name('Window Density').onChange(() => build());
    facadeFolder.add(params, 'isNight').name('Night Mode').onChange(v => setDayNight(v));

    gui.add(params, 'regenerate').name('⟳ Regenerate');

    // ─── Resize ─────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ─── Animation ───────────────────────────────────────────────────────────
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();