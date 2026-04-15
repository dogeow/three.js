import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

    // --- Canvas setup ---
    const offscreen = document.createElement('canvas');
    const GRID = 100;
    offscreen.width = GRID;
    offscreen.height = GRID;
    const ctx = offscreen.getContext('2d');

    function hslColor(h, s, l) {
      return `hsl(${h},${s}%,${l}%)`;
    }

    const patterns = {
      circles() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, GRID, GRID);
        const cx = GRID / 2, cy = GRID / 2;
        for (let r = 5; r < 45; r += 6) {
          const hue = (r * 5) % 360;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.strokeStyle = hslColor(hue, 80, 60);
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        // center dot
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      },

      grid() {
        ctx.fillStyle = '#0a0a12';
        ctx.fillRect(0, 0, GRID, GRID);
        const step = 8;
        for (let x = step / 2; x < GRID; x += step) {
          for (let y = step / 2; y < GRID; y += step) {
            const hue = (x + y * 2) % 360;
            const sat = 60 + Math.sin(x * 0.3) * 30;
            const lit = 30 + Math.cos(y * 0.4) * 20;
            ctx.beginPath();
            ctx.rect(x - 2.5, y - 2.5, 5, 5);
            ctx.fillStyle = hslColor(hue, sat, lit);
            ctx.fill();
          }
        }
        // diagonal highlight
        for (let i = 0; i < GRID; i += step) {
          ctx.beginPath();
          ctx.rect(i + 1, i + 1, 3, 3);
          ctx.fillStyle = `rgba(255,255,255,${0.1 + (i / GRID) * 0.2})`;
          ctx.fill();
        }
      },

      text() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, GRID, GRID);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PARTICLE', GRID / 2, GRID / 2 - 12);
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = hslColor(180, 80, 65);
        ctx.fillText('TEXTURE', GRID / 2, GRID / 2 + 12);

        // border glow
        ctx.strokeStyle = 'rgba(100,200,255,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(5, 5, GRID - 10, GRID - 10);
      },

      spiral() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, GRID, GRID);
        const cx = GRID / 2, cy = GRID / 2;
        for (let t = 0; t < 60; t += 0.3) {
          const angle = t * 0.4;
          const radius = t * 0.7;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          const hue = (t * 8) % 360;
          const size = 1.5 + (t % 3);
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = hslColor(hue, 85, 55 + (t % 30));
          ctx.fill();
        }
      }
    };

    let currentPattern = 'circles';

    function generateCanvas() {
      if (patterns[currentPattern]) {
        patterns[currentPattern]();
      }
    }

    // Generate initial pattern
    generateCanvas();

    // --- Three.js setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.01, 100);
    camera.position.set(0, 0, 1.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 0.5;
    controls.maxDistance = 5;

    // --- Particle setup ---
    let particleSize = 0.04;
    const COUNT = GRID * GRID;

    const geometry = new THREE.SphereGeometry(particleSize, 6, 6);
    const material = new THREE.MeshStandardMaterial({ vertexColors: false });

    // We'll store positions and dummy for InstancedMesh
    const particleMesh = new THREE.InstancedMesh(geometry, material, COUNT);
    particleMesh.frustumCulled = false;

    // Create per-instance color attribute
    const colorArray = new Float32Array(COUNT * 3);
    const colorAttr = new THREE.InstancedBufferAttribute(colorArray, 3);
    geometry.setAttribute('instanceColor', colorAttr);

    scene.add(particleMesh);

    // Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xaaccff, 3.0, 10);
    pointLight.position.set(2, 2, 2);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0xffaacc, 2.0, 10);
    pointLight2.position.set(-2, -1, 2);
    scene.add(pointLight2);

    // --- Particle grid data ---
    const dummy = new THREE.Object3D();
    const positions = [];
    const offsets = []; // for shimmer phase per particle

    function buildParticles() {
      const spread = 1.0;
      let idx = 0;
      for (let row = 0; row < GRID; row++) {
        for (let col = 0; col < GRID; col++) {
          const x = (col / (GRID - 1) - 0.5) * spread;
          const y = (row / (GRID - 1) - 0.5) * spread;
          // slight z noise for depth
          const z = (Math.random() - 0.5) * 0.01;
          positions.push({ x, y, z });
          offsets.push(Math.random() * Math.PI * 2); // random phase
          idx++;
        }
      }
    }

    function updateParticleColors() {
      const imageData = ctx.getImageData(0, 0, GRID, GRID);
      const data = imageData.data;

      for (let row = 0; row < GRID; row++) {
        for (let col = 0; col < GRID; col++) {
          const pidx = row * GRID + col;
          const didx = pidx * 4; // RGBA from canvas
          const r = data[didx] / 255;
          const g = data[didx + 1] / 255;
          const b = data[didx + 2] / 255;
          colorArray[pidx * 3] = r;
          colorArray[pidx * 3 + 1] = g;
          colorArray[pidx * 3 + 2] = b;
        }
      }
      colorAttr.needsUpdate = true;
    }

    function updateInstanceMatrices(time) {
      for (let i = 0; i < positions.length; i++) {
        const p = positions[i];
        const phase = offsets[i];

        const shimmerX = Math.sin(time * 1.2 + phase) * 0.008;
        const shimmerY = Math.cos(time * 0.9 + phase * 1.3) * 0.008;
        const shimmerZ = Math.sin(time * 0.7 + phase * 0.8) * 0.004;

        dummy.position.set(
          p.x + shimmerX,
          p.y + shimmerY,
          p.z + shimmerZ
        );
        dummy.updateMatrix();
        particleMesh.setMatrixAt(i, dummy.matrix);
      }
      particleMesh.instanceMatrix.needsUpdate = true;
    }

    // Rebuild geometry when size changes
    function rebuildGeometry(size) {
      geometry.dispose();
      geometry.attributes.position.array.fill(0);
      const newGeo = new THREE.SphereGeometry(size, 6, 6);
      newGeo.setAttribute('instanceColor', colorAttr);
      particleMesh.geometry = newGeo;
    }

    buildParticles();
    updateParticleColors();

    // Initial matrix setup
    for (let i = 0; i < positions.length; i++) {
      dummy.position.copy(positions[i]);
      dummy.updateMatrix();
      particleMesh.setMatrixAt(i, dummy.matrix);
    }
    particleMesh.instanceMatrix.needsUpdate = true;

    // --- Animation loop ---
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      updateInstanceMatrices(t);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // --- Responsive ---
    window.addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });

    // --- Click to regenerate ---
    renderer.domElement.addEventListener('click', () => {
      generateCanvas();
      updateParticleColors();
    });

    // --- Pattern buttons ---
    document.querySelectorAll('.pattern-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.pattern-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentPattern = btn.dataset.pattern;
        generateCanvas();
        updateParticleColors();
      });
    });

    // --- Size slider ---
    const slider = document.getElementById('size-slider');
    const sizeVal = document.getElementById('size-val');

    slider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      sizeVal.textContent = v.toFixed(3);
      particleMesh.geometry.dispose();
      const newGeo = new THREE.SphereGeometry(v, 6, 6);
      newGeo.setAttribute('instanceColor', colorAttr);
      particleMesh.geometry = newGeo;
    });

    // --- Attach to window for debugging ---
    window.scene = scene;
    window.camera = camera;
    window.renderer = renderer;
    window.controls = controls;
    window.particleMesh = particleMesh;