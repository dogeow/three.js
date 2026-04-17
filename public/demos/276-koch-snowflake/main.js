import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import GUI from 'three/addons/libs/lil-gui.module.min.js';

    // ─── Scene Setup ───────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0e14);
    scene.fog = new THREE.FogExp2(0x0b0e14, 0.055);

    const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 20;

    // ─── Lights ────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x334466, 1.2));

    const dirLight = new THREE.DirectionalLight(0x88aaff, 2.5);
    dirLight.position.set(5, 8, 5);
    scene.add(dirLight);

    const rimLight = new THREE.PointLight(0x4488ff, 3, 20);
    rimLight.position.set(-4, 2, -4);
    scene.add(rimLight);

    // ─── Parameters ────────────────────────────────────────────
    const params = {
      subdivision: 1,
      rotationSpeed: 0.25,
      lineThickness: 1.2,
      color: '#4fa3ff',
      glowIntensity: 1.4,
      autoRotate: true,
    };

    // ─── Koch Curve Algorithm ──────────────────────────────────
    function kochCurve(points, level) {
      if (level === 0) return points;

      const result = [];
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;

        const a = new THREE.Vector3(p1.x + dx / 3, p1.y + dy / 3, 0);
        const b = new THREE.Vector3(p1.x + dx * 2 / 3, p1.y + dy * 2 / 3, 0);

        const angle = Math.atan2(dy, dx) + Math.PI / 3;
        const len = Math.sqrt(dx * dx + dy * dy) / 3;
        const peak = new THREE.Vector3(
          a.x + Math.cos(angle) * len,
          a.y + Math.sin(angle) * len,
          0
        );

        result.push(p1, a, peak, b);
      }
      result.push(points[points.length - 1]);

      if (level > 1) return kochCurve(result, level - 1);
      return result;
    }

    function buildSnowflakeGeometry(level) {
      // Start with equilateral triangle (centered at origin)
      const size = 2.2;
      const h = size * Math.sqrt(3) / 2;
      const pts = [
        new THREE.Vector3(0, size * 0.6, 0),
        new THREE.Vector3(-h, -size * 0.3, 0),
        new THREE.Vector3(h, -size * 0.3, 0),
      ];
      const closed = [...pts, pts[0]];
      const curve = kochCurve(closed, level);
      return curve;
    }

    // ─── Snowflake Meshes ───────────────────────────────────────
    let lineGroup = new THREE.Group();
    scene.add(lineGroup);

    let glowMesh = null;

    function buildSnowflakeColorArray(pts) {
      const colors = [];
      const c = new THREE.Color(params.color);
      for (let i = 0; i < pts.length; i++) {
        const t = i / (pts.length - 1);
        const lerped = new THREE.Color().lerpColors(
          new THREE.Color(0x0a1a3a),
          c,
          t
        );
        colors.push(lerped.r, lerped.g, lerped.b);
      }
      return new Float32Array(colors);
    }

    function rebuildSnowflake() {
      // Remove old
      while (lineGroup.children.length) lineGroup.remove(lineGroup.children[0]);
      if (glowMesh) { scene.remove(glowMesh); glowMesh.geometry.dispose(); glowMesh = null; }

      const pts = buildSnowflakeGeometry(params.subdivision);

      // ── Line segments ─────────────────────────────────────────
      const positions = [];
      for (let i = 0; i < pts.length - 1; i++) {
        positions.push(pts[i].x, pts[i].y, pts[i].z);
        positions.push(pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(buildSnowflakeColorArray(pts), 3));

      const lineMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        linewidth: params.lineThickness,
        transparent: true,
        opacity: 0.95,
      });

      const lines = new THREE.LineSegments(geo, lineMat);
      lineGroup.add(lines);

      // ── Glow mesh (slightly scaled triangle fill) ─────────────
      const triPts = pts.slice(0, -1); // remove duplicate close point
      const triGeo = new THREE.BufferGeometry().setFromPoints(triPts);
      triGeo.setAttribute('color', new THREE.Float32BufferAttribute(buildSnowflakeColorArray(triPts), 3));

      const glowMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(params.color),
        emissive: new THREE.Color(params.color),
        emissiveIntensity: params.glowIntensity * 0.3,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      glowMesh = new THREE.Mesh(triGeo, glowMat);
      glowMesh.scale.setScalar(0.998);
      scene.add(glowMesh);

      // Update label
      document.getElementById('level-label').textContent = `LEVEL ${params.subdivision}`;
    }

    rebuildSnowflake();

    // ─── GUI ────────────────────────────────────────────────────
    const gui = new GUI({ title: '❄️ Koch Snowflake' });
    gui.domElement.style.setProperty('--bg-color', 'rgba(14,18,28,0.92)');
    gui.domElement.style.setProperty('--text-color', '#a8c8ff');

    gui.add(params, 'subdivision', 1, 6, 1).name('Subdivision').onChange(rebuildSnowflake);
    gui.add(params, 'rotationSpeed', 0, 1.5, 0.01).name('Rotation Speed');
    gui.add(params, 'lineThickness', 0.5, 4, 0.1).name('Line Thickness').onChange(v => {
      lineGroup.children.forEach(c => { if (c.material) c.material.linewidth = v; });
    });
    gui.addColor(params, 'color').name('Color').onChange(v => {
      rebuildSnowflake();
    });
    gui.add(params, 'glowIntensity', 0, 4, 0.05).name('Glow').onChange(v => {
      if (glowMesh) glowMesh.material.emissiveIntensity = v * 0.3;
    });
    gui.add(params, 'autoRotate').name('Auto Rotate');

    // ─── Click to increase level ────────────────────────────────
    renderer.domElement.addEventListener('click', () => {
      if (params.subdivision < 6) {
        params.subdivision++;
        gui.controllers.forEach(c => c.updateDisplay());
        rebuildSnowflake();
      }
    });

    // ─── Resize ────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });

    // ─── Stars background ───────────────────────────────────────
    const starGeo = new THREE.BufferGeometry();
    const starCount = 800;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3]     = (Math.random() - 0.5) * 80;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 80;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x667799, size: 0.06, transparent: true, opacity: 0.6 })));

    // ─── Animation ─────────────────────────────────────────────
    let t = 0;
    function animate() {
      requestAnimationFrame(animate);
      t += 0.016;

      if (params.autoRotate) {
        lineGroup.rotation.z = t * params.rotationSpeed * 0.15;
        if (glowMesh) glowMesh.rotation.z = t * params.rotationSpeed * 0.15;
      }

      // Pulse glow
      if (glowMesh) {
        glowMesh.material.opacity = 0.06 + Math.sin(t * 1.8) * 0.03;
      }

      controls.update();
      renderer.render(scene, camera);
    }
    animate();