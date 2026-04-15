import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import GUI from 'three/addons/libs/lil-gui.module.min.js';

    /* ─────────────────────────────── 场景初始化 ─────────────────────────────── */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a12);
    // 轻微雾效，增加纵深感
    scene.fog = new THREE.FogExp2(0x0a0a12, 0.018);

    /* ─────────────────────────────── 相机 ─────────────────────────────── */
    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    camera.position.set(0, 0, 28);

    /* ─────────────────────────────── 渲染器 ─────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    /* ─────────────────────────────── 曝光 & 色调 ─────────────────────────────── */
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    /* ─────────────────────────────── 轨道控制器 ─────────────────────────────── */
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 5;
    controls.maxDistance = 80;
    controls.target.set(0, 0, 0);

    /* ─────────────────────────────── 灯光 ─────────────────────────────── */
    // 环境光
    const ambientLight = new THREE.AmbientLight(0x334466, 0.6);
    scene.add(ambientLight);

    // 主方向光（冷蓝）
    const dirLight1 = new THREE.DirectionalLight(0x88aaff, 2.5);
    dirLight1.position.set(15, 20, 10);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    // 补光（暖紫）
    const dirLight2 = new THREE.DirectionalLight(0xff88cc, 1.2);
    dirLight2.position.set(-15, -10, -10);
    scene.add(dirLight2);

    // 底部点光源（青色）
    const pointLight = new THREE.PointLight(0x44ffcc, 1.5, 50);
    pointLight.position.set(0, -20, 5);
    scene.add(pointLight);

    /* ─────────────────────────────── 参数 ─────────────────────────────── */
    const params = {
      rotationSpeed : 0.008,   // 旋转速度（弧度/帧）
      helixRadius   : 3.0,     // 螺旋半径
      pitch         : 3.4,      // 螺距（一圈的高度）
      basePairs     : 20,       // 碱基对数量
      sphereRadius  : 0.28,     // 骨架球半径
      rungOpacity   : 1.0,      // 碱基对不透明度（gui 用）
    };

    /* ─────────────────────────────── 材质 ─────────────────────────────── */
    // 骨架材质（糖-磷酸骨架）
    const backboneMat = new THREE.MeshStandardMaterial({
      color: 0x4488ff,
      metalness: 0.35,
      roughness: 0.4,
      envMapIntensity: 1.0,
    });

    // A-T 碱基对材质（红色系）
    const atBaseMat = new THREE.MeshStandardMaterial({
      color: 0xff4455,
      metalness: 0.2,
      roughness: 0.45,
      emissive: 0x440011,
      emissiveIntensity: 0.3,
    });

    // G-C 碱基对材质（绿色系）
    const gcBaseMat = new THREE.MeshStandardMaterial({
      color: 0x44ff88,
      metalness: 0.2,
      roughness: 0.45,
      emissive: 0x003311,
      emissiveIntensity: 0.3,
    });

    // 标签球材质（5' / 3' 端点）
    const labelMat = new THREE.MeshStandardMaterial({
      color: 0xffdd44,
      metalness: 0.5,
      roughness: 0.3,
      emissive: 0x443300,
      emissiveIntensity: 0.5,
    });

    /* ─────────────────────────────── DNA 几何体组 ─────────────────────────────── */
    const dnaGroup = new THREE.Group();
    scene.add(dnaGroup);

    // 保存碱基对引用，用于动态更新
    const rungMeshes = [];  // { mesh, p1, p2 }

    /**
     * 根据当前参数重建整个 DNA 结构
     */
    function buildDNA() {
      // 清除旧内容
      while (dnaGroup.children.length > 0) {
        const child = dnaGroup.children[0];
        child.geometry?.dispose();
        dnaGroup.remove(child);
      }
      rungMeshes.length = 0;

      const { helixRadius, pitch, basePairs, sphereRadius } = params;
      const totalHeight = basePairs * pitch;
      const angleStep = (Math.PI * 2) / 10; // 每碱基对对应 36°（10 个点成完整圆）

      // ── 骨架球位置数组 ──
      const strand1Positions = [];
      const strand2Positions = [];

      // ── 创建骨架球 ──
      const sphereGeo = new THREE.SphereGeometry(sphereRadius, 18, 18);

      for (let i = 0; i < basePairs; i++) {
        const angle = i * angleStep;
        const y = (i / basePairs) * totalHeight - totalHeight / 2;

        // 链 1
        const x1 = Math.cos(angle) * helixRadius;
        const z1 = Math.sin(angle) * helixRadius;
        strand1Positions.push(new THREE.Vector3(x1, y, z1));

        const s1 = new THREE.Mesh(sphereGeo, backboneMat.clone());
        s1.position.set(x1, y, z1);
        s1.castShadow = true;
        dnaGroup.add(s1);

        // 链 2（相位差 π）
        const x2 = Math.cos(angle + Math.PI) * helixRadius;
        const z2 = Math.sin(angle + Math.PI) * helixRadius;
        strand2Positions.push(new THREE.Vector3(x2, y, z2));

        const s2 = new THREE.Mesh(sphereGeo, backboneMat.clone());
        s2.position.set(x2, y, z2);
        s2.castShadow = true;
        dnaGroup.add(s2);

        // ── 碱基对（每隔一定间隔交替 A-T / G-C）──
        const isAT = i % 2 === 0;
        const baseMat = isAT ? atBaseMat.clone() : gcBaseMat.clone();
        const baseRadius = 0.15;

        // 碱基对短棒：连接两条链
        const rungGeo = new THREE.CylinderGeometry(baseRadius, baseRadius, helixRadius * 2, 10);
        const rung = new THREE.Mesh(rungGeo, baseMat);
        rung.position.set(0, y, 0);
        rung.rotation.z = Math.PI / 2; // 沿 X 轴对齐
        rung.rotation.y = angle;      // 按当前角度旋转
        dnaGroup.add(rung);

        // 保存引用（用于动态调整）
        rungMeshes.push({
          mesh: rung,
          p1: new THREE.Vector3(x1, y, z1),
          p2: new THREE.Vector3(x2, y, z2),
          angle,
          isAT,
        });
      }

      // ── 连接骨架球之间的骨架管 ──
      const tubeRadius = sphereRadius * 0.55;
      const tubeGeo = new THREE.CylinderGeometry(tubeRadius, tubeRadius, 1, 8);

      for (let strand = 0; strand < 2; strand++) {
        const positions = strand === 0 ? strand1Positions : strand2Positions;
        for (let i = 0; i < positions.length - 1; i++) {
          const p1 = positions[i];
          const p2 = positions[i + 1];
          const mid = p1.clone().add(p2).multiplyScalar(0.5);
          const dir = p2.clone().sub(p1);
          const len = dir.length();

          const tube = new THREE.Mesh(tubeGeo, backboneMat.clone());
          tube.position.copy(mid);
          tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
          tube.scale.y = len;
          dnaGroup.add(tube);
        }
      }

      // ── 5' / 3' 端点标签球 ──
      const labelGeo = new THREE.SphereGeometry(sphereRadius * 1.8, 20, 20);

      // 5' 端（链 1 起点）
      const label5 = new THREE.Mesh(labelGeo, labelMat.clone());
      label5.position.copy(strand1Positions[0]);
      dnaGroup.add(label5);

      // 3' 端（链 1 终点）
      const label3 = new THREE.Mesh(labelGeo, labelMat.clone());
      label3.position.copy(strand1Positions[strand1Positions.length - 1]);
      dnaGroup.add(label3);

      // 中心对齐
      dnaGroup.position.y = 0;
    }

    /* ─────────────────────────────── 构建初始 DNA ─────────────────────────────── */
    buildDNA();

    /* ─────────────────────────────── lil-gui 控制面板 ─────────────────────────────── */
    const gui = new GUI({ title: 'DNA 控制面板' });

    // 旋转速度
    gui.add(params, 'rotationSpeed', 0, 0.05, 0.001).name('旋转速度');

    // 螺旋半径
    gui.add(params, 'helixRadius', 1, 6, 0.1).name('螺旋半径').onChange(() => {
      updateRungs();
    });

    // 螺距
    gui.add(params, 'pitch', 1, 8, 0.1).name('螺距').onChange(() => {
      rebuildForPitchAndCount();
    });

    // 碱基对数量
    gui.add(params, 'basePairs', 4, 40, 1).name('碱基对数量').onChange(() => {
      rebuildForPitchAndCount();
    });

    // 不透明度（视觉效果用）
    gui.add(params, 'rungOpacity', 0, 1, 0.01).name('碱基透明度').onChange(v => {
      rungMeshes.forEach(r => {
        r.mesh.material.transparent = true;
        r.mesh.material.opacity = v;
      });
    });

    const _resetActions = {
      reset: () => {
        params.rotationSpeed = 0.008;
        params.helixRadius = 3.0;
        params.pitch = 3.4;
        params.basePairs = 20;
        gui.controllersRecursive().forEach(c => c.updateDisplay());
        rebuildForPitchAndCount();
      }
    };
    gui.add(_resetActions, 'reset').name('重置参数');

    /* ─────────────────────────────── 重建辅助函数 ─────────────────────────────── */
    function rebuildForPitchAndCount() {
      buildDNA();
    }

    /**
     * 更新碱基对的长度（当半径变化时）
     */
    function updateRungs() {
      rungMeshes.forEach(r => {
        const angle = r.angle;
        const x1 = Math.cos(angle) * params.helixRadius;
        const z1 = Math.sin(angle) * params.helixRadius;
        const x2 = Math.cos(angle + Math.PI) * params.helixRadius;
        const z2 = Math.sin(angle + Math.PI) * params.helixRadius;

        r.p1.set(x1, r.p1.y, z1);
        r.p2.set(x2, r.p2.y, z2);

        // 更新 rung 的朝向和长度
        const dir = r.p2.clone().sub(r.p1);
        const len = dir.length();
        r.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        r.mesh.scale.y = len;
      });
    }

    /* ─────────────────────────────── 暴露全局调试对象 ─────────────────────────────── */
    window.scene = scene;
    window.camera = camera;
    window.renderer = renderer;
    window.gui = gui;

    /* ─────────────────────────────── 响应窗口 resize ─────────────────────────────── */
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    /* ─────────────────────────────── 动画循环 ─────────────────────────────── */
    function animate() {
      requestAnimationFrame(animate);

      // Y 轴旋转
      dnaGroup.rotation.y += params.rotationSpeed;

      // 端点球脉动效果
      const t = Date.now() * 0.001;
      dnaGroup.children.forEach((child, idx) => {
        if (child.geometry && child.geometry.type === 'SphereGeometry') {
          const scale = 1 + 0.08 * Math.sin(t * 2.5 + idx * 0.3);
          child.scale.setScalar(scale);
        }
      });

      controls.update();
      renderer.render(scene, camera);
    }

    animate();