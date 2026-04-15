import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

    // ─── Config ────────────────────────────────────────────────────────────────
    const CONFETTI_COLORS = [
      0xff6b6b, // red
      0xff8fab, // pink
      0xffd93d, // yellow
      0x6bcb77, // green
      0x4d96ff, // blue
      0xc77dff, // purple
      0xff9f43, // orange
      0x00d2d3, // cyan
    ];

    const params = {
      particleCount: 1200,
      gravity: 0.98,
      wind: 0.3,
      confettiSize: 0.22,
      spinSpeed: 3.0,
      showGround: true,
    };

    // ─── Scene Setup ───────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.018);

    const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200);
    camera.position.set(0, 8, 28);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
    controls.target.set(0, 5, 0);

    // ─── Background Gradient ──────────────────────────────────────────────────
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 2;
    bgCanvas.height = 512;
    const bgCtx = bgCanvas.getContext('2d');
    const bgGrad = bgCtx.createLinearGradient(0, 0, 0, 512);
    bgGrad.addColorStop(0, '#0a0a2e');
    bgGrad.addColorStop(0.4, '#1a0a3e');
    bgGrad.addColorStop(1, '#0a1a0a');
    bgCtx.fillStyle = bgGrad;
    bgCtx.fillRect(0, 0, 2, 512);
    const bgTex = new THREE.CanvasTexture(bgCanvas);
    scene.background = bgTex;

    // ─── Lights ───────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dirLight = new THREE.DirectionalLight(0xfff0dd, 1.2);
    dirLight.position.set(10, 30, 10);
    scene.add(dirLight);
    const pointLight = new THREE.PointLight(0xc77dff, 2, 50);
    pointLight.position.set(-10, 15, 5);
    scene.add(pointLight);
    const pointLight2 = new THREE.PointLight(0xff6b6b, 1.5, 50);
    pointLight2.position.set(10, 10, -10);
    scene.add(pointLight2);

    // ─── Ground with CONFETTI text ────────────────────────────────────────────
    function createGroundText() {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 256;
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, 1024, 256);

      // Gradient text
      const grad = ctx.createLinearGradient(0, 0, 1024, 0);
      grad.addColorStop(0, '#ff6b6b');
      grad.addColorStop(0.2, '#ffd93d');
      grad.addColorStop(0.4, '#6bcb77');
      grad.addColorStop(0.6, '#4d96ff');
      grad.addColorStop(0.8, '#c77dff');
      grad.addColorStop(1, '#ff8fab');

      ctx.font = 'bold 160px Arial Black, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(255,255,255,0.3)';
      ctx.shadowBlur = 20;
      ctx.fillText('CONFETTI', 512, 128);

      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1, 1);

      const geo = new THREE.PlaneGeometry(40, 10);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        transparent: true,
        roughness: 0.6,
        metalness: 0.1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = -2;
      return mesh;
    }

    const ground = createGroundText();
    scene.add(ground);

    // Subtle grid on ground
    const gridHelper = new THREE.GridHelper(60, 30, 0x222244, 0x111122);
    gridHelper.position.y = -1.99;
    scene.add(gridHelper);

    // ─── Confetti Particle System ──────────────────────────────────────────────
    let confettiMesh = null;
    let particleData = [];

    function createConfettiMaterial() {
      return new THREE.MeshStandardMaterial({
        side: THREE.DoubleSide,
        roughness: 0.7,
        metalness: 0.2,
      });
    }

    function initConfetti(count) {
      if (confettiMesh) {
        scene.remove(confettiMesh);
        confettiMesh.geometry.dispose();
        confettiMesh.material.dispose();
        confettiMesh = null;
      }

      particleData = [];

      const geo = new THREE.PlaneGeometry(params.confettiSize, params.confettiSize * 1.8);
      confettiMesh = new THREE.InstancedMesh(geo, createConfettiMaterial(), count);
      confettiMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

      const dummy = new THREE.Object3D();
      const color = new THREE.Color();

      for (let i = 0; i < count; i++) {
        const spread = 30;
        const x = (Math.random() - 0.5) * spread;
        const y = Math.random() * 40 - 5;
        const z = (Math.random() - 0.5) * spread;

        const rx = Math.random() * Math.PI * 2;
        const ry = Math.random() * Math.PI * 2;
        const rz = Math.random() * Math.PI * 2;

        dummy.position.set(x, y, z);
        dummy.rotation.set(rx, ry, rz);
        dummy.scale.setScalar(0.5 + Math.random() * 1.0);
        dummy.updateMatrix();
        confettiMesh.setMatrixAt(i, dummy.matrix);

        color.setHex(CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]);
        confettiMesh.setColorAt(i, color);

        particleData.push({
          position: new THREE.Vector3(x, y, z),
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            Math.random() * 2 + 1,
            (Math.random() - 0.5) * 4
          ),
          rotation: new THREE.Euler(rx, ry, rz),
          angularVelocity: new THREE.Vector3(
            (Math.random() - 0.5) * params.spinSpeed,
            (Math.random() - 0.5) * params.spinSpeed,
            (Math.random() - 0.5) * params.spinSpeed
          ),
          scale: dummy.scale.x,
          floor: -2 + Math.random() * 0.5,
          swayOffset: Math.random() * Math.PI * 2,
          swayFreq: 0.5 + Math.random() * 1.5,
          color: color.clone(),
        });
      }

      confettiMesh.instanceMatrix.needsUpdate = true;
      confettiMesh.instanceColor.needsUpdate = true;
      scene.add(confettiMesh);
      window.confetti = confettiMesh;
    }

    initConfetti(params.particleCount);

    // ─── GUI ───────────────────────────────────────────────────────────────────
    const gui = new GUI({ title: '🎊 Confetti Controls' });
    gui.add(params, 'particleCount', 100, 3000, 1).name('Particle Count').onChange(v => initConfetti(v));
    gui.add(params, 'gravity', 0, 3, 0.01).name('Gravity');
    gui.add(params, 'wind', 0, 2, 0.01).name('Wind');
    gui.add(params, 'confettiSize', 0.05, 0.6, 0.01).name('Size').onChange(() => {
      confettiMesh.geometry.dispose();
      confettiMesh.geometry = new THREE.PlaneGeometry(params.confettiSize, params.confettiSize * 1.8);
    });
    gui.add(params, 'spinSpeed', 0, 8, 0.1).name('Spin Speed');
    gui.add(params, 'showGround').name('Show Ground').onChange(v => {
      ground.visible = v;
      gridHelper.visible = v;
    });

    // ─── Resize ────────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    });

    // ─── Animation Loop ───────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();

    function animate() {
      requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const delta = Math.min(clock.getDelta(), 0.05);

      controls.update();

      if (confettiMesh) {
        for (let i = 0; i < particleData.length; i++) {
          const p = particleData[i];

          // Gravity
          p.velocity.y -= params.gravity * 0.016;

          // Wind with sway
          const sway = Math.sin(elapsed * p.swayFreq + p.swayOffset) * params.wind * 0.3;
          p.velocity.x += sway * 0.02;
          p.velocity.z += Math.cos(elapsed * p.swayFreq * 0.7 + p.swayOffset) * params.wind * 0.015;

          // Apply velocity
          p.position.x += p.velocity.x * 0.016;
          p.position.y += p.velocity.y * 0.016;
          p.position.z += p.velocity.z * 0.016;

          // Rotation
          p.rotation.x += p.angularVelocity.x * params.spinSpeed * 0.016;
          p.rotation.y += p.angularVelocity.y * params.spinSpeed * 0.016;
          p.rotation.z += p.angularVelocity.z * params.spinSpeed * 0.016;

          // Floor bounce / respawn
          if (p.position.y < p.floor) {
            if (Math.abs(p.velocity.y) > 0.5) {
              p.velocity.y *= -0.3;
              p.velocity.x *= 0.8;
              p.velocity.z *= 0.8;
            } else {
              // Respawn at top
              p.position.set(
                (Math.random() - 0.5) * 30,
                35 + Math.random() * 10,
                (Math.random() - 0.5) * 30
              );
              p.velocity.set(
                (Math.random() - 0.5) * 4,
                Math.random() * 2 + 0.5,
                (Math.random() - 0.5) * 4
              );
              p.angularVelocity.set(
                (Math.random() - 0.5) * params.spinSpeed,
                (Math.random() - 0.5) * params.spinSpeed,
                (Math.random() - 0.5) * params.spinSpeed
              );
              col.setHex(CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]);
              confettiMesh.setColorAt(i, col);
              confettiMesh.instanceColor.needsUpdate = true;
            }
          }

          // Bounds check (respawn if too far)
          if (Math.abs(p.position.x) > 40 || Math.abs(p.position.z) > 40) {
            p.position.set(
              (Math.random() - 0.5) * 30,
              30 + Math.random() * 10,
              (Math.random() - 0.5) * 30
            );
            p.velocity.set(
              (Math.random() - 0.5) * 4,
              Math.random() * 2,
              (Math.random() - 0.5) * 4
            );
          }

          dummy.position.copy(p.position);
          dummy.rotation.copy(p.rotation);
          dummy.scale.setScalar(p.scale);
          dummy.updateMatrix();
          confettiMesh.setMatrixAt(i, dummy.matrix);
        }
        confettiMesh.instanceMatrix.needsUpdate = true;
      }

      // Animate point lights
      pointLight.position.x = Math.sin(elapsed * 0.5) * 12;
      pointLight.position.z = Math.cos(elapsed * 0.5) * 12;
      pointLight2.position.x = Math.cos(elapsed * 0.3) * 10;
      pointLight2.position.z = Math.sin(elapsed * 0.3) * 10;

      renderer.render(scene, camera);
    }

    animate();

    // Fade out title after a few seconds
    setTimeout(() => {
      const title = document.getElementById('title');
      const sub = document.getElementById('subtitle');
      title.style.transition = 'opacity 2s ease';
      sub.style.transition = 'opacity 2s ease';
      title.style.opacity = '0';
      sub.style.opacity = '0';
      setTimeout(() => {
        title.style.display = 'none';
        sub.style.display = 'none';
      }, 2000);
    }, 4000);