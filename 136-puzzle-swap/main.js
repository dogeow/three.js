import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);

    const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 9, 7);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // --- Lighting ---
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x4f8aff, 0.4);
    rimLight.position.set(-5, 5, -5);
    scene.add(rimLight);

    // --- OrbitControls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minPolarAngle = Math.PI / 8;
    controls.maxPolarAngle = Math.PI / 2.4;
    controls.minDistance = 5;
    controls.maxDistance = 18;
    controls.enablePan = false;

    // --- Board ---
    const BOARD_SIZE = 4;
    const TILE_SIZE = 1.0;
    const GAP = 0.06;
    const STEP = TILE_SIZE + GAP;
    const BOARD_OFFSET = (BOARD_SIZE - 1) * STEP / 2;

    // Board base (recessed slot)
    const boardBaseGeo = new THREE.BoxGeometry(
      BOARD_SIZE * STEP + 0.4,
      0.2,
      BOARD_SIZE * STEP + 0.4
    );
    const boardBaseMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.9,
      metalness: 0.1
    });
    const boardBase = new THREE.Mesh(boardBaseGeo, boardBaseMat);
    boardBase.position.y = -0.12;
    boardBase.receiveShadow = true;
    scene.add(boardBase);

    // Empty slot indicator (dark recess)
    const slotGeo = new THREE.BoxGeometry(TILE_SIZE * 0.98, 0.05, TILE_SIZE * 0.98);
    const slotMat = new THREE.MeshStandardMaterial({ color: 0x0d0d1a, roughness: 1, metalness: 0 });
    const slotMesh = new THREE.Mesh(slotGeo, slotMat);
    slotMesh.position.y = 0.01;
    slotMesh.receiveShadow = true;
    scene.add(slotMesh);

    // Board border frame
    const frameThickness = 0.15;
    const frameHeight = 0.22;
    const frameColor = 0x2a2a4a;
    const frameMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.5, metalness: 0.4 });

    const frameParts = [
      // top
      { w: BOARD_SIZE * STEP + 0.4, d: frameThickness, x: 0, z: -(BOARD_SIZE * STEP + 0.4) / 2 },
      // bottom
      { w: BOARD_SIZE * STEP + 0.4, d: frameThickness, x: 0, z: (BOARD_SIZE * STEP + 0.4) / 2 },
      // left
      { w: frameThickness, d: BOARD_SIZE * STEP + 0.4 - 2 * frameThickness, x: -(BOARD_SIZE * STEP + 0.4) / 2, z: 0 },
      // right
      { w: frameThickness, d: BOARD_SIZE * STEP + 0.4 - 2 * frameThickness, x: (BOARD_SIZE * STEP + 0.4) / 2, z: 0 },
    ];
    frameParts.forEach(p => {
      const g = new THREE.BoxGeometry(p.w, frameHeight, p.d);
      const m = new THREE.Mesh(g, frameMat);
      m.position.set(p.x, frameHeight / 2 - 0.1, p.z);
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
    });

    // Subtle floor plane
    const floorGeo = new THREE.PlaneGeometry(40, 40);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x060610, roughness: 1 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.22;
    floor.receiveShadow = true;
    scene.add(floor);

    // --- Tile Creation ---
    const tiles = [];

    function gridToWorld(row, col) {
      return {
        x: col * STEP - BOARD_OFFSET,
        z: row * STEP - BOARD_OFFSET
      };
    }

    function worldToGrid(x, z) {
      const col = Math.round((x + BOARD_OFFSET) / STEP);
      const row = Math.round((z + BOARD_OFFSET) / STEP);
      return { row, col };
    }

    function createLabelTexture(number) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      // Rounded rect background
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      const r = 24;
      ctx.roundRect(8, 8, 240, 240, r);
      ctx.fill();

      // Number
      ctx.fillStyle = '#0a0a1a';
      ctx.font = 'bold 120px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(number), 128, 138);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    }

    function createTileMesh(number) {
      const geo = new THREE.BoxGeometry(TILE_SIZE * 0.96, 0.18, TILE_SIZE * 0.96);

      // HSL gradient based on number
      const hue = ((number - 1) / 15) * 0.65 + 0.55; // blue to red-ish
      const sat = 0.65;
      const light = 0.52;
      const color = new THREE.Color().setHSL(hue, sat, light);

      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.35,
        metalness: 0.15,
        map: createLabelTexture(number)
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.number = number;
      return mesh;
    }

    function initTiles() {
      // Clear existing tiles
      tiles.forEach(t => scene.remove(t.mesh));
      tiles.length = 0;

      for (let i = 1; i <= BOARD_SIZE * BOARD_SIZE - 1; i++) {
        const pos = gridToWorld(
          Math.floor((i - 1) / BOARD_SIZE),
          (i - 1) % BOARD_SIZE
        );
        const mesh = createTileMesh(i);
        mesh.position.set(pos.x, 0.09, pos.z);
        scene.add(mesh);
        tiles.push({
          mesh,
          number: i,
          gridRow: Math.floor((i - 1) / BOARD_SIZE),
          gridCol: (i - 1) % BOARD_SIZE,
          animating: false,
          animProgress: 0,
          fromPos: new THREE.Vector3(),
          toPos: new THREE.Vector3()
        });
      }

      updateSlot();
    }

    function updateSlot() {
      const empty = getEmptyPos();
      const wp = gridToWorld(empty.row, empty.col);
      slotMesh.position.set(wp.x, 0.01, wp.z);
    }

    // --- Game Logic ---
    let emptyRow = BOARD_SIZE - 1;
    let emptyCol = BOARD_SIZE - 1;
    let moveCount = 0;
    let timerSeconds = 0;
    let timerInterval = null;
    let gameStarted = false;
    let gameSolved = false;

    function getEmptyPos() {
      return { row: emptyRow, col: emptyCol };
    }

    function getAdjacentToEmpty() {
      const adj = [];
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of dirs) {
        const r = emptyRow + dr;
        const c = emptyCol + dc;
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          adj.push({ row: r, col: c });
        }
      }
      return adj;
    }

    function findTileAt(row, col) {
      return tiles.find(t => !t.animating && t.gridRow === row && t.gridCol === col);
    }

    function moveTile(tile) {
      if (tile.animating || gameSolved) return;

      if (!gameStarted) {
        gameStarted = true;
        timerInterval = setInterval(() => {
          timerSeconds++;
          updateTimerDisplay();
        }, 1000);
      }

      // Record from position
      tile.fromPos.copy(tile.mesh.position);

      // Update grid positions
      const oldRow = tile.gridRow;
      const oldCol = tile.gridCol;
      tile.gridRow = emptyRow;
      tile.gridCol = emptyCol;
      emptyRow = oldRow;
      emptyCol = oldCol;

      // Target position
      const wp = gridToWorld(tile.gridRow, tile.gridCol);
      tile.toPos.set(wp.x, 0.09, wp.z);
      tile.animating = true;
      tile.animProgress = 0;

      moveCount++;
      updateMoveDisplay();
      updateSlot();
    }

    // --- Animation ---
    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function updateAnimations(dt) {
      tiles.forEach(tile => {
        if (!tile.animating) return;
        tile.animProgress += dt / 0.15; // 150ms
        if (tile.animProgress >= 1) {
          tile.animProgress = 1;
          tile.animating = false;
          tile.mesh.position.copy(tile.toPos);
          checkWin();
        } else {
          const t = easeOutCubic(tile.animProgress);
          tile.mesh.position.lerpVectors(tile.fromPos, tile.toPos, t);
        }
      });
    }

    // --- Win Detection ---
    function checkWin() {
      for (const tile of tiles) {
        const expectedRow = Math.floor((tile.number - 1) / BOARD_SIZE);
        const expectedCol = (tile.number - 1) % BOARD_SIZE;
        if (tile.gridRow !== expectedRow || tile.gridCol !== expectedCol) return;
      }

      gameSolved = true;
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }

      const minutes = Math.floor(timerSeconds / 60);
      const seconds = timerSeconds % 60;
      document.getElementById('winMsg').textContent =
        `Solved in ${moveCount} moves and ${minutes}:${seconds.toString().padStart(2, '0')}!`;
      document.getElementById('win-overlay').classList.add('show');

      spawnCelebration();
    }

    // --- Celebration Particles ---
    const celebrationParticles = [];

    function spawnCelebration() {
      const count = 120;
      const geo = new THREE.SphereGeometry(0.05, 4, 4);
      for (let i = 0; i < count; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(Math.random(), 0.9, 0.6),
          transparent: true,
          opacity: 1
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
          (Math.random() - 0.5) * 2,
          0.5,
          (Math.random() - 0.5) * 2
        );
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        mesh.userData.vel = new THREE.Vector3(
          Math.cos(angle) * speed,
          3 + Math.random() * 5,
          Math.sin(angle) * speed
        );
        mesh.userData.life = 0;
        mesh.userData.maxLife = 1.5 + Math.random() * 1;
        scene.add(mesh);
        celebrationParticles.push(mesh);
      }
    }

    function updateParticles(dt) {
      for (let i = celebrationParticles.length - 1; i >= 0; i--) {
        const p = celebrationParticles[i];
        p.userData.life += dt;
        p.userData.vel.y -= 9.8 * dt;
        p.position.addScaledVector(p.userData.vel, dt);
        p.material.opacity = 1 - p.userData.life / p.userData.maxLife;
        if (p.userData.life >= p.userData.maxLife) {
          scene.remove(p);
          p.geometry.dispose();
          p.material.dispose();
          celebrationParticles.splice(i, 1);
        }
      }
    }

    // --- Shuffle ---
    function shuffleTiles() {
      // Perform N random valid moves to ensure solvability
      const N = 200;
      let prevRow = -1, prevCol = -1;
      for (let i = 0; i < N; i++) {
        const adj = getAdjacentToEmpty().filter(p => !(p.row === prevRow && p.col === prevCol));
        if (adj.length === 0) continue;
        const target = adj[Math.floor(Math.random() * adj.length)];
        const tile = findTileAt(target.row, target.col);
        if (!tile) continue;
        prevRow = emptyRow;
        prevCol = emptyCol;
        // Do the move instantly (no animation for shuffle)
        tile.gridRow = emptyRow;
        tile.gridCol = emptyCol;
        emptyRow = target.row;
        emptyCol = target.col;
        const wp = gridToWorld(tile.gridRow, tile.gridCol);
        tile.mesh.position.set(wp.x, 0.09, wp.z);
      }
      updateSlot();
    }

    function resetGame() {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      moveCount = 0;
      timerSeconds = 0;
      gameStarted = false;
      gameSolved = false;
      emptyRow = BOARD_SIZE - 1;
      emptyCol = BOARD_SIZE - 1;
      document.getElementById('win-overlay').classList.remove('show');
      updateMoveDisplay();
      updateTimerDisplay();
      initTiles();
      shuffleTiles();
    }

    // --- UI ---
    function updateMoveDisplay() {
      document.getElementById('moveCount').textContent = moveCount;
    }

    function updateTimerDisplay() {
      const m = Math.floor(timerSeconds / 60);
      const s = timerSeconds % 60;
      document.getElementById('timer').textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }

    document.getElementById('shuffleBtn').addEventListener('click', () => {
      resetGame();
    });
    document.getElementById('resetBtn').addEventListener('click', () => {
      resetGame();
    });
    document.getElementById('playAgainBtn').addEventListener('click', () => {
      resetGame();
    });

    // --- Raycasting ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let mouseDownPos = new THREE.Vector2();

    function onMouseDown(e) {
      mouseDownPos.set(e.clientX, e.clientY);
      isDragging = false;
    }

    function onMouseMove(e) {
      if (Math.abs(e.clientX - mouseDownPos.x) > 5 || Math.abs(e.clientY - mouseDownPos.y) > 5) {
        isDragging = true;
      }
    }

    function onMouseUp(e) {
      if (isDragging) return;
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshList = tiles.map(t => t.mesh);
      const hits = raycaster.intersectObjects(meshList);
      if (hits.length === 0) return;

      const hitMesh = hits[0].object;
      const tile = tiles.find(t => t.mesh === hitMesh);
      if (!tile) return;

      // Check if adjacent to empty
      const adj = getAdjacentToEmpty();
      const isAdj = adj.some(p => p.row === tile.gridRow && p.col === tile.gridCol);
      if (isAdj) {
        moveTile(tile);
      }
    }

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);

    // Touch support
    function onTouchEnd(e) {
      if (!e.changedTouches.length) return;
      const touch = e.changedTouches[0];
      mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshList = tiles.map(t => t.mesh);
      const hits = raycaster.intersectObjects(meshList);
      if (hits.length === 0) return;

      const hitMesh = hits[0].object;
      const tile = tiles.find(t => t.mesh === hitMesh);
      if (!tile) return;

      const adj = getAdjacentToEmpty();
      const isAdj = adj.some(p => p.row === tile.gridRow && p.col === tile.gridCol);
      if (isAdj) {
        moveTile(tile);
      }
    }
    renderer.domElement.addEventListener('touchend', onTouchEnd);

    // --- Resize ---
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // --- Animation Loop ---
    const clock = new THREE.Clock();
    let prevTime = 0;

    function animate() {
      requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      const dt = Math.min(time - prevTime, 0.05);
      prevTime = time;

      controls.update();
      updateAnimations(dt);
      updateParticles(dt);

      renderer.render(scene, camera);
    }

    // --- Expose to window ---
    window.scene = scene;
    window.camera = camera;
    window.renderer = renderer;
    window.controls = controls;
    window.tiles = tiles;

    // --- Init ---
    resetGame();
    animate();