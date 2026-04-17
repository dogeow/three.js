import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    // Camera
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 12);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    scene.add(dirLight);

    const fillLight = new THREE.PointLight(0x6c5ce7, 0.4, 30);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    // Wall
    const wallGeo = new THREE.PlaneGeometry(20, 15, 1, 1);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.rotation.x = 0;
    wall.receiveShadow = true;
    scene.add(wall);

    // Floor (for shadow reference)
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 1,
      metalness: 0,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -7.5;
    floor.receiveShadow = true;
    scene.add(floor);

    // Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Splat collection
    const splats = [];
    let splatsGroup = new THREE.Group();
    scene.add(splatsGroup);

    // UI elements
    const colorPicker = document.getElementById('colorPicker');
    const sizeSlider = document.getElementById('sizeSlider');
    const sizeVal = document.getElementById('sizeVal');
    const undoBtn = document.getElementById('undoBtn');
    const clearBtn = document.getElementById('clearBtn');
    const countEl = document.getElementById('count');

    sizeSlider.addEventListener('input', () => {
      sizeVal.textContent = sizeSlider.value;
    });

    // Generate splat canvas texture
    function createSplatTexture(color, size) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      ctx.clearRect(0, 0, size, size);

      // Parse color
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);

      // Darken color for edge
      const darkR = Math.max(0, r - 40);
      const darkG = Math.max(0, g - 40);
      const darkB = Math.max(0, b - 40);

      const cx = size / 2;
      const cy = size / 2;
      const baseRadius = size * 0.42;

      // Draw main blob with irregular edge
      ctx.beginPath();
      const segments = 24;
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const variance = 0.7 + Math.random() * 0.6;
        const rx = baseRadius * variance;
        const ry = baseRadius * (0.7 + Math.random() * 0.6);
        const x = cx + Math.cos(angle) * rx;
        const y = cy + Math.sin(angle) * ry;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      const grad = ctx.createRadialGradient(cx - size * 0.1, cy - size * 0.1, 0, cx, cy, baseRadius * 1.2);
      grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
      grad.addColorStop(0.6, `rgba(${r},${g},${b},0.9)`);
      grad.addColorStop(1, `rgba(${darkR},${darkG},${darkB},0.7)`);
      ctx.fillStyle = grad;
      ctx.fill();

      // Draw drips and smaller blobs
      const dripCount = Math.floor(Math.random() * 4) + 2;
      for (let d = 0; d < dripCount; d++) {
        const dx = (Math.random() - 0.5) * baseRadius * 1.5;
        const dy = (Math.random() - 0.5) * baseRadius * 1.5;
        const dr = baseRadius * (0.15 + Math.random() * 0.25);

        ctx.beginPath();
        const dSegs = 12;
        for (let i = 0; i <= dSegs; i++) {
          const a = (i / dSegs) * Math.PI * 2;
          const v = 0.7 + Math.random() * 0.6;
          const x = cx + dx + Math.cos(a) * dr * v;
          const y = cy + dy + Math.sin(a) * dr * v * 0.8;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(${r},${g},${b},0.85)`;
        ctx.fill();
      }

      // Tiny specks
      const specks = Math.floor(Math.random() * 8) + 4;
      for (let s = 0; s < specks; s++) {
        const sx = cx + (Math.random() - 0.5) * baseRadius * 2.2;
        const sy = cy + (Math.random() - 0.5) * baseRadius * 2.2;
        const sr = baseRadius * (0.03 + Math.random() * 0.06);
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${0.4 + Math.random() * 0.4})`;
        ctx.fill();
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    }

    function updateCount() {
      countEl.textContent = `Splats: ${splats.length}`;
    }

    function addSplat(point, normal) {
      const size = parseInt(sizeSlider.value);
      const color = colorPicker.value;
      const texture = createSplatTexture(color, size);

      const geo = new THREE.PlaneGeometry(size * 0.07, size * 0.07);
      const mat = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);

      mesh.position.copy(point);

      // Align to wall surface
      mesh.lookAt(point.clone().add(normal));

      // Random rotation around normal
      mesh.rotateZ(Math.random() * Math.PI * 2);

      mesh.castShadow = true;

      mesh.userData.splatIndex = splats.length;
      splatsGroup.add(mesh);
      splats.push(mesh);
      updateCount();
    }

    // Click handler
    function onPointerDown(event) {
      if (event.button !== 0) return;

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(wall);

      if (intersects.length > 0) {
        const hit = intersects[0];
        addSplat(hit.point, hit.face.normal);
      }
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    // Undo
    undoBtn.addEventListener('click', () => {
      if (splats.length === 0) return;
      const last = splats.pop();
      splatsGroup.remove(last);
      last.geometry.dispose();
      last.material.dispose();
      if (last.material.map) last.material.map.dispose();
      updateCount();
    });

    // Clear all
    clearBtn.addEventListener('click', () => {
      splats.forEach(s => {
        s.geometry.dispose();
        s.material.dispose();
        if (s.material.map) s.material.map.dispose();
        splatsGroup.remove(s);
      });
      splats.length = 0;
      updateCount();
    });

    // Resize
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });

    // Attach to window for debugging
    window.scene = scene;
    window.camera = camera;
    window.renderer = renderer;
    window.controls = controls;
    window.splats = splats;

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();