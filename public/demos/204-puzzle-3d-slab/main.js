import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import GUI from 'three/addons/libs/lil-gui.module.min.js';

    /* ============================================================
       常量 & 配置
    ============================================================ */
    const GRID      = 4;          // 4×4 网格
    const TILE_W    = 1.8;        // 方块宽度
    const TILE_H    = 0.45;       // 方块厚度（3D 厚度）
    const GAP       = 0.12;       // 方块间距
    const STEP      = TILE_W + GAP; // 每次移动的偏移量
    const ANIM_DFLT = 0.30;       // 默认动画时长（秒）

    // 漂亮调色板：16 种颜色（索引 0 保留给空格）
    const PALETTE = [
      null,                       // 0: 空位（不渲染）
      '#FF6B6B',  // 1  珊瑚红
      '#FF9F43',  // 2  橙黄
      '#FECA57',  // 3  明黄
      '#48DBFB',  // 4  天蓝
      '#00D2D3',  // 5  青绿
      '#1DD1A1',  // 6  薄荷绿
      '#10AC84',  // 7  翠绿
      '#EE5A24',  // 8  橙红
      '#FF9FF3',  // 9  粉紫
      '#54A0FF',  // 10 宝蓝
      '#5F27CD',  // 11 靛蓝
      '#C8D6E5',  // 12 浅灰蓝
      '#8395A7',  // 13 灰蓝
      '#576574',  // 14 深灰
      '#222F3E',  // 15 近黑
    ];

    /* ============================================================
       场景初始化
    ============================================================ */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1a1a2e');

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 9, 7);
    camera.lookAt(0, 0, 0);

    // 轨道控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 5;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI / 2.1;

    /* ============================================================
       光照
    ============================================================ */
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(6, 12, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far  = 50;
    sun.shadow.camera.left = sun.shadow.camera.bottom = -8;
    sun.shadow.camera.right = sun.shadow.camera.top  =  8;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0x88aaff, 0.4);
    fill.position.set(-6, 4, -6);
    scene.add(fill);

    /* ============================================================
       底板（棋盘底座）
    ============================================================ */
    const boardGeo = new THREE.BoxGeometry(
      STEP * GRID + GAP * 2 + 0.2,
      0.25,
      STEP * GRID + GAP * 2 + 0.2
    );
    const boardMat = new THREE.MeshStandardMaterial({
      color: 0x16213e,
      roughness: 0.8,
      metalness: 0.2,
    });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.y = -(TILE_H * 0.5 + 0.13);
    board.receiveShadow = true;
    scene.add(board);

    // 底板装饰边框
    const borderGeo = new THREE.BoxGeometry(
      STEP * GRID + GAP * 2 + 0.3,
      0.06,
      STEP * GRID + GAP * 2 + 0.3
    );
    const borderMat = new THREE.MeshStandardMaterial({
      color: 0x0f3460,
      roughness: 0.5,
      metalness: 0.6,
    });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.position.y = -(TILE_H * 0.5 + 0.06);
    scene.add(border);

    /* ============================================================
       游戏状态
    ============================================================ */
    // state[idx] = tileNumber（0 表示空格）
    // idx: 0=top-left, 15=bottom-right（按行展开）
    let state  = [];
    let moves  = 0;
    let animSpeed = ANIM_DFLT;
    let isAnimating = false;
    let isWon = false;

    // 存储所有方块的网格对象（按 tileNumber 索引，1-15）
    const tileMeshes = {};

    /* ---------- 辅助函数 ---------- */

    // idx -> 3D 世界坐标（方块中心）
    function idxToPos(idx) {
      const col = idx % GRID;
      const row = Math.floor(idx / GRID);
      const cx  = (col - (GRID - 1) / 2) * STEP;
      const cz  = (row - (GRID - 1) / 2) * STEP;
      return new THREE.Vector3(cx, 0, cz);
    }

    // 找到空格位置（state 中的 0）
    function emptyIdx() {
      return state.indexOf(0);
    }

    // 判断 tileIdx 是否可以滑动（与空格相邻）
    function canSlide(tileIdx) {
      const e = emptyIdx();
      const tc = tileIdx % GRID, tr = Math.floor(tileIdx / GRID);
      const ec = e    % GRID, er = Math.floor(e    / GRID);
      return (Math.abs(tc - ec) + Math.abs(tr - er)) === 1;
    }

    // 交换 state 中的两个位置
    function swapState(a, b) {
      [state[a], state[b]] = [state[b], state[a]];
    }

    // 判断是否胜利（1-15 顺序排列，空格在最后）
    function checkWin() {
      for (let i = 0; i < 15; i++) if (state[i] !== i + 1) return false;
      return state[15] === 0;
    }

    // 更新 UI 计数器
    function updateUI() {
      document.getElementById('move-counter').textContent = `移动次数：${moves}`;
    }

    /* ---------- 创建方块 ---------- */

    function createTile(number) {
      const geo = new THREE.BoxGeometry(TILE_W, TILE_H, TILE_W);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(PALETTE[number]),
        roughness: 0.35,
        metalness: 0.15,
        emissive: new THREE.Color(PALETTE[number]),
        emissiveIntensity: 0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow    = true;
      mesh.receiveShadow = true;

      // 数字贴图（Canvas 渲染文字）
      const cv  = document.createElement('canvas');
      cv.width  = 256;
      cv.height = 256;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = 'transparent';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = 'bold 130px sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(number), 128, 136);

      const tex = new THREE.CanvasTexture(cv);
      const labelMat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
      });

      // 正面 label
      const labelGeo = new THREE.PlaneGeometry(TILE_W * 0.72, TILE_W * 0.72);
      const label = new THREE.Mesh(labelGeo, labelMat);
      label.position.set(0, TILE_H * 0.5 + 0.001, 0);
      label.rotation.x = -Math.PI / 2;
      mesh.add(label);

      mesh.userData.number = number;
      return mesh;
    }

    // 初始化 / 重置拼图
    function initPuzzle() {
      // 清除旧方块
      Object.values(tileMeshes).forEach(m => scene.remove(m));
      for (const n in tileMeshes) delete tileMeshes[n];

      // 默认顺序 state = [1,2,...,15,0]
      state = Array.from({ length: 15 }, (_, i) => i + 1);
      state.push(0);
      moves = 0;
      isWon = false;
      updateUI();
      document.getElementById('win-overlay').classList.remove('visible');

      // 创建方块并放置
      state.forEach((num, idx) => {
        if (num === 0) return;
        const mesh = createTile(num);
        const pos  = idxToPos(idx);
        mesh.position.set(pos.x, TILE_H * 0.5, pos.z);
        scene.add(mesh);
        tileMeshes[num] = mesh;
      });
    }

    /* ---------- 滑动动画 ---------- */

    // 将指定数字的方块平滑移动到 targetIdx 位置
    function slideTile(number, targetIdx, onDone) {
      const mesh = tileMeshes[number];
      const from = mesh.position.clone();
      const to   = idxToPos(targetIdx);
      to.y = TILE_H * 0.5;

      const dur  = animSpeed; // 秒
      const t0   = performance.now();

      function tick(now) {
        const t = Math.min((now - t0) / 1000 / dur, 1);
        // ease 缓动
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        mesh.position.lerpVectors(from, to, ease);
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          mesh.position.copy(to);
          if (onDone) onDone();
        }
      }
      requestAnimationFrame(tick);
    }

    // 处理点击
    function onPointerDown(event) {
      if (isAnimating || isWon) return;

      const rect   = renderer.domElement.getBoundingClientRect();
      const mouse  = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width)  * 2 - 1,
        -((event.clientY - rect.top)  / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(Object.values(tileMeshes));
      if (!hits.length) return;

      const number = hits[0].object.userData.number;
      const idx    = state.indexOf(number);
      if (!canSlide(idx)) return;

      const e   = emptyIdx();
      isAnimating = true;

      slideTile(number, e, () => {
        swapState(idx, e);
        moves++;
        updateUI();
        isAnimating = false;
        if (checkWin()) triggerWin();
      });
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    /* ---------- 胜利动画 ---------- */

    function triggerWin() {
      isWon = true;
      document.getElementById('win-moves').textContent = `用了 ${moves} 步`;
      document.getElementById('win-overlay').classList.add('visible');

      // 所有方块发光 + 上升
      Object.values(tileMeshes).forEach(mesh => {
        const mat = mesh.material;
        mat.emissiveIntensity = 0.6;
        const baseY = mesh.position.y;
        const t0 = performance.now();
        const dur = 600;
        function rise(now) {
          const t = Math.min((now - t0) / dur, 1);
          const ease = 1 - Math.pow(1 - t, 3);
          mesh.position.y = baseY + ease * 0.45;
          if (t < 1) requestAnimationFrame(rise);
        }
        requestAnimationFrame(rise);
      });

      // 2 秒后自动关闭发光
      setTimeout(() => {
        Object.values(tileMeshes).forEach(mesh => {
          mesh.material.emissiveIntensity = 0;
          mesh.position.y = TILE_H * 0.5;
        });
      }, 2500);
    }

    /* ---------- 洗牌（确保有解） ---------- */

    // 随机打乱，模拟多次合法滑动以保证有解
    function shuffle() {
      if (isAnimating) return;
      // 先重置再打乱
      state = Array.from({ length: 15 }, (_, i) => i + 1);
      state.push(0);

      // 随机做 200 次合法滑动
      for (let i = 0; i < 200; i++) {
        const e   = emptyIdx();
        const ec  = e % GRID, er = Math.floor(e / GRID);
        const neighbors = [];
        if (ec > 0)     neighbors.push(e - 1);
        if (ec < 3)     neighbors.push(e + 1);
        if (er > 0)     neighbors.push(e - GRID);
        if (er < 3)     neighbors.push(e + GRID);
        const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
        swapState(e, pick);
      }
      moves = 0;
      isWon = false;
      updateUI();
      document.getElementById('win-overlay').classList.remove('visible');

      // 同步网格位置到 state
      Object.entries(tileMeshes).forEach(([num, mesh]) => {
        const idx = state.indexOf(Number(num));
        const pos = idxToPos(idx);
        mesh.position.set(pos.x, TILE_H * 0.5, pos.z);
        mesh.material.emissiveIntensity = 0;
      });
    }

    /* ============================================================
       lil-gui 控制面板
    ============================================================ */
    const gui = new GUI({ title: '控制面板' });

    gui.add({ shuffle }, 'shuffle').name('🎲 洗牌重开');
    gui.add({ get animSpeed() { return animSpeed; }, set animSpeed(v) { animSpeed = v; } }, 'animSpeed', 0.05, 1.0, 0.05).name('动画速度').onChange(v => {
      animSpeed = v;
    });

    /* ============================================================
       window.debug 暴露调试状态
    ============================================================ */
    window.debug = {
      get state()   { return [...state]; },
      get moves()   { return moves; },
      get isWon()   { return isWon; },
      get isAnimating() { return isAnimating; },
      shuffle,
      init: initPuzzle,
    };

    /* ============================================================
       响应窗口大小变化
    ============================================================ */
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    /* ============================================================
       渲染循环
    ============================================================ */
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }

    /* ============================================================
       启动
    ============================================================ */
    initPuzzle();
    animate();

    console.info('[15-puzzle] 已加载，window.debug 可查看状态。');