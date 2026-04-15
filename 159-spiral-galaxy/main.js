import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

    // ---- Renderer ----
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000);
    document.body.appendChild(renderer.domElement);

    // ---- Scene & Camera ----
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 40, 80);

    // ---- Controls ----
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.minDistance = 10;
    controls.maxDistance = 300;

    // ---- Galaxy parameters ----
    let armCount = 4;
    let rotationSpeed = 0.030;
    const baseStarCount = 6000;

    // ---- Star shader ----
    const vertexShader = `
      attribute float aSize;
      attribute float aBrightness;
      attribute vec3 aColor;

      varying float vBrightness;
      varying vec3 vColor;

      void main() {
        vBrightness = aBrightness;
        vColor = aColor;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float dist = -mvPosition.z;
        gl_PointSize = aSize * (280.0 / dist);
        gl_PointSize = clamp(gl_PointSize, 0.5, 8.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      varying float vBrightness;
      varying vec3 vColor;

      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float r = length(uv);
        if (r > 0.5) discard;

        float alpha = smoothstep(0.5, 0.0, r);
        alpha = pow(alpha, 1.4) * vBrightness;

        // Soft glow: slightly brighter core
        float core = smoothstep(0.25, 0.0, r);
        vec3 color = mix(vColor, vec3(1.0), core * 0.5) * (0.6 + vBrightness * 0.6);

        gl_FragColor = vec4(color, alpha);
      }
    `;

    // ---- Galaxy generation ----
    let galaxyMesh = null;
    let dustMeshes = [];
    let bulgeMesh = null;

    function buildGalaxy() {
      // Remove old
      if (galaxyMesh) {
        scene.remove(galaxyMesh);
        galaxyMesh.geometry.dispose();
        galaxyMesh.material.dispose();
        galaxyMesh = null;
      }
      if (bulgeMesh) {
        scene.remove(bulgeMesh);
        bulgeMesh.geometry.dispose();
        bulgeMesh.material.dispose();
        bulgeMesh = null;
      }
      dustMeshes.forEach(m => {
        scene.remove(m);
        m.geometry.dispose();
        m.material.dispose();
      });
      dustMeshes = [];

      const totalStars = baseStarCount;
      const positions = new Float32Array(totalStars * 3);
      const sizes = new Float32Array(totalStars);
      const brightnesses = new Float32Array(totalStars);
      const colors = new Float32Array(totalStars * 3);

      // Galaxy parameters
      const a = 0.8;   // scale factor in r = a * exp(b * theta)
      const b = 0.18;  // pitch factor
      const armSpread = 2.5; // gaussian spread perpendicular to arm
      const diskHeight = 3.0; // vertical scatter
      const radiusMax = 35;

      const starsPerArm = Math.floor(totalStars * 0.75 / armCount);
      const bulgeStars = Math.floor(totalStars * 0.25);

      let idx = 0;

      // Helper for random in range
      function rand(min, max) {
        return min + Math.random() * (max - min);
      }

      // Color palettes
      // Young stars: blue-white
      // Old stars: yellow-orange
      function starColor() {
        const r = Math.random();
        if (r < 0.5) {
          // blue-white young stars
          const t = Math.random();
          return {
            r: 0.7 + t * 0.3,
            g: 0.8 + t * 0.2,
            b: 1.0
          };
        } else {
          // yellow-orange old stars
          const t = Math.random();
          return {
            r: 1.0,
            g: 0.7 + t * 0.25,
            b: 0.3 + t * 0.4
          };
        }
      }

      // Arm stars
      for (let arm = 0; arm < armCount; arm++) {
        const armOffset = (arm / armCount) * Math.PI * 2;

        for (let i = 0; i < starsPerArm; i++) {
          // non-uniform distribution: more stars near center
          const t = Math.pow(Math.random(), 0.6);
          const r = t * radiusMax;

          if (r < 0.3) continue;

          const theta = armOffset + b * r + (Math.random() - 0.5) * armSpread * (1.0 / (r + 1.0));

          const x = r * Math.cos(theta);
          const z = r * Math.sin(theta);

          // Gaussian scatter perpendicular to arm (radial + tangential)
          const perp = (Math.random() - 0.5) * armSpread * (1.5 + r * 0.15);
          const tan = (Math.random() - 0.5) * armSpread * (1.0 + r * 0.1);

          // radial direction
          const rx = Math.cos(theta);
          const rz = Math.sin(theta);
          // tangential direction
          const tx = -Math.sin(theta);
          const tz = Math.cos(theta);

          const px = x + perp * rx + tan * tx;
          const pz = z + perp * rz + tan * tz;

          const py = (Math.random() - 0.5) * diskHeight * (1.0 + r * 0.08);

          const col = starColor();

          positions[idx * 3] = px;
          positions[idx * 3 + 1] = py;
          positions[idx * 3 + 2] = pz;

          sizes[idx] = rand(0.5, 2.5) * (1.0 + (1.0 - t) * 0.8);
          brightnesses[idx] = rand(0.3, 1.0);
          colors[idx * 3] = col.r;
          colors[idx * 3 + 1] = col.g;
          colors[idx * 3 + 2] = col.b;

          idx++;
        }
      }

      // Fill remaining slots with background disk stars
      let fillIdx = idx;
      while (fillIdx < totalStars - bulgeStars) {
        const r = rand(5, radiusMax);
        const theta = rand(0, Math.PI * 2);
        const px = r * Math.cos(theta) + (Math.random() - 0.5) * 3;
        const pz = r * Math.sin(theta) + (Math.random() - 0.5) * 3;
        const py = (Math.random() - 0.5) * diskHeight * 0.8;

        const col = starColor();

        positions[fillIdx * 3] = px;
        positions[fillIdx * 3 + 1] = py;
        positions[fillIdx * 3 + 2] = pz;
        sizes[fillIdx] = rand(0.3, 1.5);
        brightnesses[fillIdx] = rand(0.2, 0.7);
        colors[fillIdx * 3] = col.r;
        colors[fillIdx * 3 + 1] = col.g;
        colors[fillIdx * 3 + 2] = col.b;

        fillIdx++;
      }

      // Bulge stars (central dense cluster)
      const bulgeStart = fillIdx;
      for (let i = 0; i < bulgeStars; i++) {
        // spherical distribution, denser at center
        const u = Math.random();
        const v = Math.random();
        const theta_b = 2 * Math.PI * u;
        const phi_b = Math.acos(2 * v - 1);
        const r_b = Math.pow(Math.random(), 1.5) * 5;

        const px = r_b * Math.sin(phi_b) * Math.cos(theta_b);
        const py = r_b * Math.sin(phi_b) * Math.sin(theta_b) * 0.5;
        const pz = r_b * Math.cos(phi_b);

        // Bulge color: yellow-white
        const brightness = rand(0.5, 1.0);
        const t = Math.random();

        positions[(bulgeStart + i) * 3] = px;
        positions[(bulgeStart + i) * 3 + 1] = py;
        positions[(bulgeStart + i) * 3 + 2] = pz;
        sizes[bulgeStart + i] = rand(0.8, 3.0) * (1.5 - r_b / 5.0);
        brightnesses[bulgeStart + i] = brightness;

        // Yellow-white gradient
        colors[(bulgeStart + i) * 3] = 1.0;
        colors[(bulgeStart + i) * 3 + 1] = 0.85 + t * 0.15;
        colors[(bulgeStart + i) * 3 + 2] = 0.6 + t * 0.3;
      }

      const actualCount = Math.min(idx + fillIdx + bulgeStars, totalStars);

      // Build geometry
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions.slice(0, actualCount * 3), 3));
      geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes.slice(0, actualCount), 1));
      geometry.setAttribute('aBrightness', new THREE.BufferAttribute(brightnesses.slice(0, actualCount), 1));
      geometry.setAttribute('aColor', new THREE.BufferAttribute(colors.slice(0, actualCount * 3), 3));

      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      galaxyMesh = new THREE.Points(geometry, material);
      scene.add(galaxyMesh);

      // ---- Central bulge sphere glow ----
      const bulgeGeo = new THREE.SphereGeometry(2.5, 32, 32);
      const bulgeMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(1.0, 0.95, 0.8),
        transparent: true,
        opacity: 0.12,
      });
      bulgeMesh = new THREE.Mesh(bulgeGeo, bulgeMat);
      scene.add(bulgeMesh);

      // ---- Dust lanes ----
      const dustCount = 12;
      for (let d = 0; d < dustCount; d++) {
        const angle = (d / dustCount) * Math.PI * 2 + Math.random() * 0.3;
        const dist = rand(3, 10);
        const dx = Math.cos(angle) * dist;
        const dz = Math.sin(angle) * dist;
        const dy = (Math.random() - 0.5) * 1.5;

        const size = rand(2, 5);
        const dustGeo = new THREE.PlaneGeometry(size, size * 0.4);
        const dustMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(0.02, 0.01, 0.03),
          transparent: true,
          opacity: rand(0.3, 0.7),
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const dustMesh = new THREE.Mesh(dustGeo, dustMat);
        dustMesh.position.set(dx, dy, dz);
        dustMesh.rotation.x = Math.random() * Math.PI;
        dustMesh.rotation.z = Math.random() * Math.PI;
        scene.add(dustMesh);
        dustMeshes.push(dustMesh);
      }

      document.getElementById('starCount').textContent = actualCount.toLocaleString();
    }

    buildGalaxy();

    // ---- Animation loop ----
    let lastTime = performance.now();

    function animate() {
      requestAnimationFrame(animate);

      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      controls.update();

      if (galaxyMesh) {
        galaxyMesh.rotation.y += rotationSpeed * delta;
      }
      if (bulgeMesh) {
        bulgeMesh.rotation.y += rotationSpeed * delta * 0.5;
      }
      dustMeshes.forEach((dm, i) => {
        dm.rotation.z += (rotationSpeed * delta * 0.3) * (i % 2 === 0 ? 1 : -1);
      });

      renderer.render(scene, camera);
    }

    animate();

    // ---- UI Controls ----
    const armSlider = document.getElementById('armSlider');
    const speedSlider = document.getElementById('speedSlider');

    armSlider.addEventListener('input', () => {
      armCount = parseInt(armSlider.value);
      document.getElementById('armCount').textContent = armCount;
      buildGalaxy();
    });

    speedSlider.addEventListener('input', () => {
      const val = parseInt(speedSlider.value);
      rotationSpeed = val / 1000;
      document.getElementById('speedVal').textContent = (rotationSpeed * 100).toFixed(1) + '%';
    });

    // ---- Resize ----
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ---- Attach to window for debugging ----
    window.scene = scene;
    window.camera = camera;
    window.renderer = renderer;
    window.controls = controls;
    window.galaxyMesh = galaxyMesh;