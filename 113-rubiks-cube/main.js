import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

    // ─── Constants ───────────────────────────────────────────────────────────────
    const CUBIE_SIZE = 1;
    const GAP = 0.06;
    const ANIM_DURATION = 300; // ms
    const STICKER_SIZE = 0.88;

    // Standard Rubik's cube face colors (MeshStandardMaterial needs 0-1 range)
    const COLORS = {
      white:  new THREE.Color(0xffffff),
      yellow: new THREE.Color(0xffd500),
      red:    new THREE.Color(0xc41e3a),
      orange: new THREE.Color(0xff5800),
      blue:   new THREE.Color(0x0051ba),
      green:  new THREE.Color(0x009b48),
      black:  new THREE.Color(0x111111),
    };

    // BoxGeometry face order: +x, -x, +y, -y, +z, -z
    const FACE_CONFIG = [
      { key: 'blue',   axis: '+x' },  // 0: right
      { key: 'green',  axis: '-x' },  // 1: left
      { key: 'white',  axis: '+y' },  // 2: top
      { key: 'yellow', axis: '-y' },  // 3: bottom
      { key: 'red',   axis: '+z' },  // 4: front
      { key: 'orange',axis: '-z' },  // 5: back
    ];

    const FACE_NAMES = {
      '+x': 'Right (Blue)',
      '-x': 'Left (Green)',
      '+y': 'Top (White)',
      '-y': 'Bottom (Yellow)',
      '+z': 'Front (Red)',
      '-z': 'Back (Orange)',
    };

    // ─── Scene Setup ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(5, 4, 6);
    camera.lookAt(0, 0, 0);

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.07;
    orbit.minDistance = 4;
    orbit.maxDistance = 20;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 8, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-5, -2, -5);
    scene.add(fillLight);

    // Floor shadow
    const floorGeo = new THREE.PlaneGeometry(20, 20);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.3 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.5;
    floor.receiveShadow = true;
    scene.add(floor);

    // ─── Cubie Builder ───────────────────────────────────────────────────────────
    // Geometry shared by all sticker planes
    const stickerGeo = new THREE.PlaneGeometry(STICKER_SIZE, STICKER_SIZE);

    function makeMaterial(color, emissiveIntensity = 0) {
      return new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity,
        roughness: 0.35,
        metalness: 0.1,
      });
    }

    function createCubie(cx, cy, cz) {
      const group = new THREE.Group();
      group.userData.isCubie = true;
      group.userData.gridPos = new THREE.Vector3(cx, cy, cz);
      group.userData.originalGridPos = new THREE.Vector3(cx, cy, cz);
      group.position.set(cx * (CUBIE_SIZE + GAP), cy * (CUBIE_SIZE + GAP), cz * (CUBIE_SIZE + GAP));

      // Black inner box
      const boxGeo = new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE);
      const boxMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.castShadow = true;
      group.add(box);

      // Sticker planes on each visible face
      const offsets = [
        { faceIdx: 0, pos: [CUBIE_SIZE/2 + 0.002, 0, 0], rot: [0, Math.PI/2, 0] },  // +x
        { faceIdx: 1, pos: [-CUBIE_SIZE/2 - 0.002, 0, 0], rot: [0, -Math.PI/2, 0] }, // -x
        { faceIdx: 2, pos: [0, CUBIE_SIZE/2 + 0.002, 0], rot: [-Math.PI/2, 0, 0] },  // +y
        { faceIdx: 3, pos: [0, -CUBIE_SIZE/2 - 0.002, 0], rot: [Math.PI/2, 0, 0] },  // -y
        { faceIdx: 4, pos: [0, 0, CUBIE_SIZE/2 + 0.002], rot: [0, 0, 0] },           // +z
        { faceIdx: 5, pos: [0, 0, -CUBIE_SIZE/2 - 0.002], rot: [0, Math.PI, 0] },   // -z
      ];

      const stickerMats = [];
      for (let i = 0; i < 6; i++) {
        stickerMats.push(null);
      }

      offsets.forEach(({ faceIdx, pos, rot }) => {
        const fc = FACE_CONFIG[faceIdx];
        // Determine if this face of the cubie is on the outer surface
        let colorKey = null;
        if (fc.axis === '+x' && cx === 1)  colorKey = 'blue';
        if (fc.axis === '-x' && cx === -1) colorKey = 'green';
        if (fc.axis === '+y' && cy === 1)  colorKey = 'white';
        if (fc.axis === '-y' && cy === -1) colorKey = 'yellow';
        if (fc.axis === '+z' && cz === 1)  colorKey = 'red';
        if (fc.axis === '-z' && cz === -1) colorKey = 'orange';

        const mat = colorKey
          ? makeMaterial(COLORS[colorKey])
          : makeMaterial(COLORS.black);

        stickerMats[faceIdx] = mat;

        const mesh = new THREE.Mesh(stickerGeo, mat);
        mesh.position.set(...pos);
        mesh.rotation.set(...rot);
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.userData.faceIdx = faceIdx;
        mesh.userData.colorKey = colorKey;
        mesh.userData.parentCubie = group;
        group.add(mesh);
      });

      group.userData.stickerMats = stickerMats;
      return group;
    }

    // ─── Cube Assembly ───────────────────────────────────────────────────────────
    const cubeRoot = new THREE.Group();
    scene.add(cubeRoot);
    window.cubeRoot = cubeRoot;

    const cubies = [];
    for (let cx = -1; cx <= 1; cx++) {
      for (let cy = -1; cy <= 1; cy++) {
        for (let cz = -1; cz <= 1; cz++) {
          const cubie = createCubie(cx, cy, cz);
          cubie.userData.gridPos.set(cx, cy, cz);
          cubeRoot.add(cubie);
          cubies.push(cubie);
        }
      }
    }

    // ─── Selection & Rotation State ─────────────────────────────────────────────
    let selectedFace = null;   // { axis: '+x'|'-x'|'+y'|'-y'|'+z'|'-z', value: -1|0|1 }
    let isAnimating = false;
    let selectionGroup = null; // temporary group for slice rotation

    // Highlight helpers
    const highlightMats = cubies.flatMap(c => c.userData.stickerMats.filter(Boolean));
    let prevEmissive = new Map(highlightMats.map(m => [m, m.emissiveIntensity]));

    function setHighlight(axis, value, on) {
      cubies.forEach(c => {
        const pos = c.userData.gridPos;
        let matches = false;
        if (axis === '+x' && pos.x === value) matches = true;
        if (axis === '-x' && pos.x === -value) matches = true;
        if (axis === '+y' && pos.y === value) matches = true;
        if (axis === '-y' && pos.y === -value) matches = true;
        if (axis === '+z' && pos.z === value) matches = true;
        if (axis === '-z' && pos.z === -value) matches = true;

        if (matches) {
          const mats = c.userData.stickerMats;
          mats.forEach((m, i) => {
            if (!m) return;
            const fc = FACE_CONFIG[i];
            // Only highlight the stickers on the selected face
            if (fc.axis === axis) {
              m.emissiveIntensity = on ? 0.5 : prevEmissive.get(m);
            }
          });
        }
      });
    }

    function clearSelection() {
      if (selectedFace) {
        setHighlight(selectedFace.axis, Math.abs(selectedFace.value), false);
        selectedFace = null;
        document.getElementById('selection-info').classList.remove('visible');
        document.getElementById('dir-controls').classList.remove('visible');
        document.getElementById('face-name').textContent = '--';
      }
    }

    function selectFace(axis, value) {
      clearSelection();
      selectedFace = { axis, value };
      setHighlight(axis, Math.abs(value), true);
      const sign = value < 0 ? '-' : '+';
      const name = FACE_NAMES[sign + axis.replace('-', '')];
      document.getElementById('face-name').textContent = name;
      document.getElementById('selection-info').classList.add('visible');
      document.getElementById('dir-controls').classList.add('visible');
    }

    // ─── Rotation ────────────────────────────────────────────────────────────────
    function getSliceCubies(axis, value) {
      return cubies.filter(c => {
        const p = c.userData.gridPos;
        if (axis === 'x') return Math.round(p.x) === value;
        if (axis === 'y') return Math.round(p.y) === value;
        if (axis === 'z') return Math.round(p.z) === value;
      });
    }

    function rotateSlice(axis, value, clockwise, callback) {
      if (isAnimating) return;
      isAnimating = true;
      orbit.enabled = false;

      const sliceCubies = getSliceCubies(axis, value);
      selectionGroup = new THREE.Group();
      cubeRoot.add(selectionGroup);
      sliceCubies.forEach(c => selectionGroup.add(c));

      // Determine axis vector and angle sign
      const axisVec = axis === 'x' ? new THREE.Vector3(1,0,0)
                    : axis === 'y' ? new THREE.Vector3(0,1,0)
                    : new THREE.Vector3(0,0,1);

      // For face-based rotation, clockwise is relative to looking at the face
      // The sign depends on which face we're rotating
      let angle = (clockwise ? 1 : -1) * Math.PI / 2;

      // Adjust angle sign based on which face was selected
      const faceSign = (axis === 'x' && value < 0) || (axis === 'y' && value < 0) || (axis === 'z' && value < 0) ? -1 : 1;
      angle *= faceSign;

      const startQuat = selectionGroup.quaternion.clone();
      const endQuat = new THREE.Quaternion().setFromAxisAngle(axisVec, angle).multiply(startQuat);

      const start = performance.now();

      function animate() {
        const t = Math.min((performance.now() - start) / ANIM_DURATION, 1);
        // Ease in-out
        const tEase = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        selectionGroup.quaternion.slerpQuaternions(startQuat, endQuat, tEase);

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          selectionGroup.quaternion.copy(endQuat);
          // Bake transforms
          cubeRoot.updateMatrixWorld(true);
          selectionGroup.updateMatrixWorld(true);

          sliceCubies.forEach(c => {
            // Get world position
            const worldPos = new THREE.Vector3();
            c.getWorldPosition(worldPos);
            const worldQuat = new THREE.Quaternion();
            c.getWorldQuaternion(worldQuat);

            selectionGroup.remove(c);
            cubeRoot.add(c);

            // Snap position to grid
            c.position.copy(worldPos);
            c.position.x = Math.round(c.position.x / (CUBIE_SIZE + GAP)) * (CUBIE_SIZE + GAP);
            c.position.y = Math.round(c.position.y / (CUBIE_SIZE + GAP)) * (CUBIE_SIZE + GAP);
            c.position.z = Math.round(c.position.z / (CUBIE_SIZE + GAP)) * (CUBIE_SIZE + GAP);

            // Snap rotation to nearest 90-degree increments
            const euler = new THREE.Euler().setFromQuaternion(worldQuat, 'XYZ');
            const snap = v => Math.round(v / (Math.PI / 2)) * (Math.PI / 2);
            euler.x = snap(euler.x);
            euler.y = snap(euler.y);
            euler.z = snap(euler.z);
            c.quaternion.setFromEuler(euler);

            // Update logical grid position
            c.userData.gridPos.set(
              Math.round(c.position.x / (CUBIE_SIZE + GAP)),
              Math.round(c.position.y / (CUBIE_SIZE + GAP)),
              Math.round(c.position.z / (CUBIE_SIZE + GAP))
            );
          });

          cubeRoot.remove(selectionGroup);
          selectionGroup = null;
          isAnimating = false;
          orbit.enabled = true;
          if (callback) callback();
        }
      }
      requestAnimationFrame(animate);
    }

    // ─── Raycasting / Click ──────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Collect all sticker meshes for raycasting
    const stickerMeshes = [];
    cubies.forEach(c => {
      c.children.forEach(child => {
        if (child.isMesh && child.userData.faceIdx !== undefined) {
          stickerMeshes.push(child);
        }
      });
    });

    function getPointerNDC(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    renderer.domElement.addEventListener('click', (e) => {
      if (isAnimating) return;
      getPointerNDC(e);
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(stickerMeshes);
      if (hits.length > 0) {
        const hit = hits[0].object;
        const cubie = hit.userData.parentCubie;
        const faceIdx = hit.userData.faceIdx;
        const fc = FACE_CONFIG[faceIdx];
        const gridPos = cubie.userData.gridPos;
        let value, axis;
        if (fc.axis === '+x') { axis = 'x'; value = Math.round(gridPos.x); }
        else if (fc.axis === '-x') { axis = 'x'; value = Math.round(gridPos.x); }
        else if (fc.axis === '+y') { axis = 'y'; value = Math.round(gridPos.y); }
        else if (fc.axis === '-y') { axis = 'y'; value = Math.round(gridPos.y); }
        else if (fc.axis === '+z') { axis = 'z'; value = Math.round(gridPos.z); }
        else if (fc.axis === '-z') { axis = 'z'; value = Math.round(gridPos.z); }
        selectFace(fc.axis, value);
      } else {
        clearSelection();
      }
    });

    // ─── Direction Controls ──────────────────────────────────────────────────────
    function applyRotation(clockwise) {
      if (!selectedFace || isAnimating) return;
      const { axis, value } = selectedFace;
      const cleanAxis = axis.replace('-', '').replace('+', '');
      const isNeg = axis.startsWith('-');
      rotateSlice(cleanAxis, isNeg ? -Math.abs(value) : Math.abs(value), clockwise, () => {
        // Keep selection active after rotation
      });
    }

    document.querySelectorAll('.dir-btn[data-dir]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dir = btn.dataset.dir;
        const clockwise = !dir.startsWith('-');
        applyRotation(clockwise);
      });
    });

    // Arrow key support
    window.addEventListener('keydown', (e) => {
      if (!selectedFace || isAnimating) return;
      switch (e.key) {
        case 'ArrowUp':    applyRotation(true);  e.preventDefault(); break;
        case 'ArrowDown':  applyRotation(false); e.preventDefault(); break;
        case 'ArrowLeft':  applyRotation(false); e.preventDefault(); break;
        case 'ArrowRight': applyRotation(true);  e.preventDefault(); break;
        case 'Escape':     clearSelection(); break;
      }
    });

    // ─── Reset ───────────────────────────────────────────────────────────────────
    function resetCube() {
      if (isAnimating) return;
      cubies.forEach(c => {
        c.userData.gridPos.copy(c.userData.originalGridPos);
        c.position.set(
          c.userData.originalGridPos.x * (CUBIE_SIZE + GAP),
          c.userData.originalGridPos.y * (CUBIE_SIZE + GAP),
          c.userData.originalGridPos.z * (CUBIE_SIZE + GAP)
        );
        c.quaternion.identity();
      });
      clearSelection();
    }

    document.getElementById('btn-reset').addEventListener('click', resetCube);

    // ─── Shuffle ─────────────────────────────────────────────────────────────────
    function shuffle() {
      if (isAnimating) return;
      clearSelection();
      const axes = ['x', 'y', 'z'];
      const values = [-1, 0, 1];
      const steps = 15 + Math.floor(Math.random() * 6); // 15-20

      let queue = [];
      for (let i = 0; i < steps; i++) {
        const axis = axes[Math.floor(Math.random() * 3)];
        const value = values[Math.floor(Math.random() * 3)];
        const clockwise = Math.random() > 0.5;
        queue.push({ axis, value, clockwise });
      }

      function runNext() {
        if (queue.length === 0) return;
        const { axis, value, clockwise } = queue.shift();
        rotateSlice(axis, value, clockwise, runNext);
      }
      runNext();
    }

    document.getElementById('btn-shuffle').addEventListener('click', shuffle);

    // ─── Render Loop ─────────────────────────────────────────────────────────────
    function render() {
      requestAnimationFrame(render);
      orbit.update();
      renderer.render(scene, camera);
    }
    render();

    // ─── Resize ───────────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ─── Expose to window ─────────────────────────────────────────────────────────
    window.cubies = cubies;
    window.scene = scene;
    window.camera = camera;
    window.renderer = renderer;
    window.rotateSlice = rotateSlice;
    window.shuffle = shuffle;
    window.resetCube = resetCube;