import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

    // ── Scene ──────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010a15);
    scene.fog = new THREE.FogExp2(0x010a15, 0.04);

    // ── Camera ──────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
    camera.position.set(0, 4, 10);

    // ── Renderer ────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    // ── Controls ────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;
    controls.minDistance = 5;
    controls.maxDistance = 20;

    // ── Lights ──────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0x0044ff, 0.3);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x00ffff, 1, 30);
    pointLight.position.set(0, 5, 5);
    scene.add(pointLight);

    // ── Grid Floor ──────────────────────────────────────────
    const gridHelper = new THREE.GridHelper(40, 40, 0x002244, 0x001833);
    gridHelper.position.y = -3;
    scene.add(gridHelper);

    const floorGeo = new THREE.PlaneGeometry(40, 40);
    const floorMat = new THREE.MeshBasicMaterial({
      color: 0x001428,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.01;
    scene.add(floor);

    // ── Panel Group ────────────────────────────────────────
    const panelGroup = new THREE.Group();
    scene.add(panelGroup);

    // ── Panel Frame ────────────────────────────────────────
    const panelW = 8, panelH = 5, panelD = 0.08;
    const frameGeo = new THREE.BoxGeometry(panelW, panelH, panelD);
    const edgesGeo = new THREE.EdgesGeometry(frameGeo);
    const frameMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
    const frameLines = new THREE.LineSegments(edgesGeo, frameMat);
    panelGroup.add(frameLines);

    // Panel fill (slight back panel)
    const backPanelGeo = new THREE.PlaneGeometry(panelW, panelH);
    const backPanelMat = new THREE.MeshBasicMaterial({
      color: 0x001020,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const backPanel = new THREE.Mesh(backPanelGeo, backPanelMat);
    backPanel.position.z = -panelD / 2 - 0.001;
    panelGroup.add(backPanel);

    // Inner frame border
    const innerFrameGeo = new THREE.BoxGeometry(panelW - 0.3, panelH - 0.3, 0.01);
    const innerEdges = new THREE.EdgesGeometry(innerFrameGeo);
    const innerMat = new THREE.LineBasicMaterial({ color: 0x0088cc, transparent: true, opacity: 0.4 });
    const innerLines = new THREE.LineSegments(innerEdges, innerMat);
    innerLines.position.z = 0.01;
    panelGroup.add(innerLines);

    // ── Corner Accents ─────────────────────────────────────
    function makeCorner(cx, cy) {
      const group = new THREE.Group();
      const mat = new THREE.LineBasicMaterial({ color: 0x00ffff });
      const pts = [
        new THREE.Vector3(cx * 0.5, cy * 0.2, 0),
        new THREE.Vector3(cx * 0.5, cy * 0.5, 0),
        new THREE.Vector3(cx * 0.2, cy * 0.5, 0),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      group.add(new THREE.Line(geo, mat));
      return group;
    }
    const corners = [
      [-panelW / 2, panelH / 2],
      [panelW / 2, panelH / 2],
      [-panelW / 2, -panelH / 2],
      [panelW / 2, -panelH / 2],
    ];
    corners.forEach(([x, y]) => {
      const c = makeCorner(Math.sign(x), Math.sign(y));
      c.position.set(x, y, 0.05);
      panelGroup.add(c);
    });

    // ── Canvas Texture Helper ──────────────────────────────
    function makeTextTexture(text, fontSize = 32, color = '#00ffff') {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 512;
      canvas.height = 128;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      return tex;
    }

    function makeLabel(text, width = 1.5, height = 0.3) {
      const tex = makeTextTexture(text, 36, '#00ffff');
      const geo = new THREE.PlaneGeometry(width, height);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      return new THREE.Mesh(geo, mat);
    }

    // ── Title Label ────────────────────────────────────────
    const titleLabel = makeLabel('SYS MONITOR v2.4', 3.5, 0.35);
    titleLabel.position.set(0, panelH / 2 - 0.35, 0.06);
    panelGroup.add(titleLabel);

    // ── Bar Chart ──────────────────────────────────────────
    const barData = [0.4, 0.7, 0.55, 0.85, 0.6, 0.9, 0.45, 0.75];
    const barCount = barData.length;
    const barMaxH = 2.2;
    const barGroup = new THREE.Group();
    const barMeshes = [];
    const barWireframes = [];

    for (let i = 0; i < barCount; i++) {
      const bh = barData[i] * barMaxH;
      const geo = new THREE.BoxGeometry(0.25, bh, 0.05);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00d4ff,
        transparent: true,
        opacity: 0.35,
        wireframe: false,
      });
      const mesh = new THREE.Mesh(geo, mat);

      const wfGeo = new THREE.EdgesGeometry(geo);
      const wfMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.9 });
      const wf = new THREE.LineSegments(wfGeo, wfMat);
      mesh.add(wf);

      const x = (i - (barCount - 1) / 2) * 0.65;
      mesh.position.set(x, -panelH / 2 + 0.4 + bh / 2, 0.05);
      barGroup.add(mesh);
      barMeshes.push(mesh);
      barWireframes.push(wf);
    }
    barGroup.position.set(-0.3, 0.3, 0);
    panelGroup.add(barGroup);

    // Bar labels (x-axis)
    const barLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    for (let i = 0; i < barCount; i++) {
      const lbl = makeLabel(barLabels[i], 0.2, 0.18);
      const x = (i - (barCount - 1) / 2) * 0.65;
      lbl.position.set(x, -panelH / 2 + 0.18, 0.06);
      barGroup.add(lbl);
    }

    // Chart title
    const chartTitle = makeLabel('THROUGHPUT', 1.8, 0.22);
    chartTitle.position.set(-0.3, panelH / 2 - 0.7, 0.06);
    panelGroup.add(chartTitle);

    // ── Radar Display ─────────────────────────────────────
    const radarGroup = new THREE.Group();
    const radarRadius = 1.1;
    const radarX = panelW / 2 - 1.5;
    const radarY = panelH / 2 - 1.5;

    // Radar base circle
    const radarCircleGeo = new THREE.CircleGeometry(radarRadius, 64);
    const radarCircleMat = new THREE.MeshBasicMaterial({
      color: 0x003355,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    const radarCircle = new THREE.Mesh(radarCircleGeo, radarCircleMat);
    radarGroup.add(radarCircle);

    // Radar rings
    for (let r = 1; r <= 3; r++) {
      const ringGeo = new THREE.RingGeometry((r / 3) * radarRadius - 0.005, (r / 3) * radarRadius + 0.005, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00aacc,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      radarGroup.add(ring);
    }

    // Radar cross lines
    const crossMat = new THREE.LineBasicMaterial({ color: 0x00aacc, transparent: true, opacity: 0.25 });
    const crossPts1 = [new THREE.Vector3(-radarRadius, 0, 0), new THREE.Vector3(radarRadius, 0, 0)];
    const crossGeo1 = new THREE.BufferGeometry().setFromPoints(crossPts1);
    radarGroup.add(new THREE.Line(crossGeo1, crossMat));
    const crossPts2 = [new THREE.Vector3(0, -radarRadius, 0), new THREE.Vector3(0, radarRadius, 0)];
    const crossGeo2 = new THREE.BufferGeometry().setFromPoints(crossPts2);
    radarGroup.add(new THREE.Line(crossGeo2, crossMat));

    // Radar border
    const radarBorderGeo = new THREE.RingGeometry(radarRadius - 0.02, radarRadius, 64);
    const radarBorderMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const radarBorder = new THREE.Mesh(radarBorderGeo, radarBorderMat);
    radarGroup.add(radarBorder);

    // Radar sweep line
    const sweepPts = [new THREE.Vector3(0, 0, 0.01), new THREE.Vector3(radarRadius, 0, 0.01)];
    const sweepGeo = new THREE.BufferGeometry().setFromPoints(sweepPts);
    const sweepMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.95 });
    const sweepLine = new THREE.Line(sweepGeo, sweepMat);
    radarGroup.add(sweepLine);

    // Radar sweep trail (fan shape using multiple lines)
    const trailCount = 30;
    const trailLines = [];
    for (let t = 1; t <= trailCount; t++) {
      const angleFrac = t / trailCount;
      const trailAngle = Math.PI * 2 * angleFrac;
      const trailPts = [
        new THREE.Vector3(0, 0, 0.01),
        new THREE.Vector3(radarRadius * 0.9 * Math.cos(trailAngle), radarRadius * 0.9 * Math.sin(trailAngle), 0.01),
      ];
      const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPts);
      const trailMat = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.3 * (1 - angleFrac),
      });
      const trailLine = new THREE.Line(trailGeo, trailMat);
      radarGroup.add(trailLine);
      trailLines.push(trailLine);
    }

    // Radar dots (targets)
    const radarDots = [];
    const dotPositions = [
      [0.5, 0.3], [-0.4, 0.6], [0.2, -0.5], [-0.6, -0.3], [0.7, 0.1],
    ];
    dotPositions.forEach(([dx, dy]) => {
      const dotGeo = new THREE.CircleGeometry(0.04, 16);
      const dotMat = new THREE.MeshBasicMaterial({
        color: 0xff4400,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.set(dx, dy, 0.02);
      radarGroup.add(dot);
      radarDots.push({ mesh: dot, angle: Math.atan2(dy, dx), dist: Math.sqrt(dx * dx + dy * dy) });

      // Glow ring
      const glowGeo = new THREE.RingGeometry(0.04, 0.07, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.set(dx, dy, 0.02);
      radarGroup.add(glow);
    });

    radarGroup.position.set(radarX, radarY, 0.05);
    panelGroup.add(radarGroup);

    // Radar label
    const radarLabel = makeLabel('RADAR', 0.8, 0.22);
    radarLabel.position.set(radarX, radarY - radarRadius - 0.2, 0.06);
    panelGroup.add(radarLabel);

    // ── Text Stats ─────────────────────────────────────────
    function makeStatLabel(text, x, y) {
      const lbl = makeLabel(text, 1.5, 0.2);
      lbl.position.set(x, y, 0.06);
      return lbl;
    }

    const statY1 = -panelH / 2 + 2.8;
    const statY2 = statY1 - 0.38;
    const statY3 = statY2 - 0.38;
    panelGroup.add(makeStatLabel('CPU: 67%', 2.5, statY1));
    panelGroup.add(makeStatLabel('MEM: 4.2GB', 2.5, statY2));
    panelGroup.add(makeStatLabel('NET: 12Mb/s', 2.5, statY3));

    // Status indicator dots
    const statusDots = [];
    const statusColors = [0x00ff88, 0xffaa00, 0xff4444];
    const statusY = [statY1, statY2, statY3];
    statusY.forEach((y, idx) => {
      const dotGeo = new THREE.CircleGeometry(0.06, 16);
      const dotMat = new THREE.MeshBasicMaterial({
        color: statusColors[idx],
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.set(2.5 - 1.0, y, 0.06);
      panelGroup.add(dot);
      statusDots.push(dot);
    });

    // ── Scan Line ──────────────────────────────────────────
    // Create a custom shader plane for scan line
    const scanVertShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    const scanFragShader = `
      uniform float uTime;
      uniform float uSpeed;
      varying vec2 vUv;

      void main() {
        float scanPos = mod(uTime * uSpeed * 0.15, 1.0);
        float dist = abs(vUv.x - scanPos);
        float intensity = smoothstep(0.06, 0.0, dist);
        float glow = smoothstep(0.12, 0.0, dist) * 0.4;
        vec3 color = vec3(0.0, 0.9, 1.0);
        float alpha = intensity + glow;
        gl_FragColor = vec4(color, alpha * 0.6);
      }
    `;

    const scanMat = new THREE.ShaderMaterial({
      vertexShader: scanVertShader,
      fragmentShader: scanFragShader,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 1.0 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const scanGeo = new THREE.PlaneGeometry(panelW, panelH);
    const scanPlane = new THREE.Mesh(scanGeo, scanMat);
    scanPlane.position.z = 0.07;
    panelGroup.add(scanPlane);

    // ── Scan Line Horizontal Sweep ────────────────────────
    const hscanVertShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    const hscanFragShader = `
      uniform float uTime;
      uniform float uSpeed;
      varying vec2 vUv;

      void main() {
        float scanPos = mod(uTime * uSpeed * 0.1, 1.0);
        float dist = abs(vUv.y - scanPos);
        float intensity = smoothstep(0.04, 0.0, dist);
        float glow = smoothstep(0.08, 0.0, dist) * 0.3;
        vec3 color = vec3(0.0, 0.8, 1.0);
        float alpha = intensity + glow;
        gl_FragColor = vec4(color, alpha * 0.4);
      }
    `;

    const hscanMat = new THREE.ShaderMaterial({
      vertexShader: hscanVertShader,
      fragmentShader: hscanFragShader,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 1.0 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const hscanGeo = new THREE.PlaneGeometry(panelW, panelH);
    const hscanPlane = new THREE.Mesh(hscanGeo, hscanMat);
    hscanPlane.position.z = 0.08;
    panelGroup.add(hscanPlane);

    // ── Flickering Particles ──────────────────────────────
    const particleCount = 120;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * panelW;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * panelH;
      particlePositions[i * 3 + 2] = 0.09;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 0.03,
      transparent: true,
      opacity: 0.5,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    panelGroup.add(particles);

    // ── Speed Slider ─────────────────────────────────────
    let animSpeed = 1.0;
    const speedSlider = document.getElementById('speed-slider');
    const speedVal = document.getElementById('speed-val');
    speedSlider.addEventListener('input', () => {
      animSpeed = parseFloat(speedSlider.value);
      speedVal.textContent = animSpeed.toFixed(1) + 'x';
      sweepMat.uniforms.opacity = 0.95;
      scanMat.uniforms.uSpeed.value = animSpeed;
      hscanMat.uniforms.uSpeed.value = animSpeed;
    });

    // ── Resize Handler ────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });

    // ── Attach to window ─────────────────────────────────
    window.scene = scene;
    window.camera = camera;
    window.renderer = renderer;
    window.controls = controls;
    window.panelGroup = panelGroup;

    // ── Animation Loop ────────────────────────────────────
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);

      const t = clock.getElapsedTime();
      const s = animSpeed;

      // Animate bar heights
      barMeshes.forEach((mesh, i) => {
        const baseH = barData[i];
        const wave = Math.sin(t * s * 1.5 + i * 0.7) * 0.08;
        const newH = Math.max(0.05, baseH + wave) * barMaxH;
        mesh.scale.y = newH / (barData[i] * barMaxH);
        mesh.position.y = -panelH / 2 + 0.4 + newH / 2;
      });

      // Animate bar wireframe colors
      barWireframes.forEach((wf, i) => {
        const hue = (t * s * 0.5 + i * 0.1) % 1;
        const color = new THREE.Color().setHSL(0.5 + hue * 0.1, 1, 0.6);
        wf.material.color = color;
      });

      // Rotate radar sweep
      const sweepAngle = t * s * 1.2;
      sweepLine.rotation.z = sweepAngle;
      trailLines.forEach((tl, i) => {
        tl.rotation.z = sweepAngle;
        const trailColor = new THREE.Color().setHSL(0.5 + (i / trailCount) * 0.1, 1, 0.5);
        tl.material.color = trailColor;
      });

      // Pulse radar dots
      radarDots.forEach((d, i) => {
        const pulse = 0.8 + Math.sin(t * s * 2 + i) * 0.2;
        d.mesh.scale.setScalar(pulse);
      });

      // Animate status dots
      statusDots.forEach((dot, i) => {
        const pulse = 0.7 + Math.sin(t * s * 3 + i * 1.2) * 0.3;
        dot.material.opacity = pulse;
      });

      // Animate particles
      const posArr = particles.geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        posArr[i * 3 + 1] += Math.sin(t * s + i * 0.3) * 0.001;
        posArr[i * 3] += Math.cos(t * s * 0.5 + i * 0.2) * 0.0005;
      }
      particles.geometry.attributes.position.needsUpdate = true;
      particleMat.opacity = 0.3 + Math.sin(t * s) * 0.15;

      // Scan line shader time
      scanMat.uniforms.uTime.value = t;
      scanMat.uniforms.uSpeed.value = s;
      hscanMat.uniforms.uTime.value = t;
      hscanMat.uniforms.uSpeed.value = s;

      // Slight panel float
      panelGroup.position.y = Math.sin(t * s * 0.5) * 0.08;

      // Frame glow pulse
      frameMat.opacity = 0.6 + Math.sin(t * s * 2) * 0.2;

      controls.update();
      renderer.render(scene, camera);
    }

    animate();