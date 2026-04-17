import * as THREE from 'three';
    import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

    // --- Scene Setup ---
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020510);
    scene.fog = new THREE.FogExp2(0x020510, 0.04);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 4, 10);
    camera.lookAt(0, 2, 0);

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0x102030, 0.5);
    scene.add(ambientLight);

    const mainLight = new THREE.PointLight(0x6699ff, 3, 30);
    mainLight.position.set(0, 8, 0);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    scene.add(mainLight);

    const rimLight = new THREE.PointLight(0x00ccff, 2, 20);
    rimLight.position.set(-5, 5, -5);
    scene.add(rimLight);

    const accentLight = new THREE.PointLight(0xff66cc, 1.5, 15);
    accentLight.position.set(5, 3, 3);
    scene.add(accentLight);

    // --- Caustic Floor ---
    const floorGeom = new THREE.PlaneGeometry(20, 20, 64, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0a1520,
      roughness: 0.2,
      metalness: 0.8,
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Caustic overlay plane
    const causticGeom = new THREE.PlaneGeometry(20, 20);
    const causticCanvas = document.createElement('canvas');
    causticCanvas.width = 512;
    causticCanvas.height = 512;
    const causticCtx = causticCanvas.getContext('2d');
    const causticTex = new THREE.CanvasTexture(causticCanvas);
    const causticMat = new THREE.MeshBasicMaterial({
      map: causticTex,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const causticPlane = new THREE.Mesh(causticGeom, causticMat);
    causticPlane.rotation.x = -Math.PI / 2;
    causticPlane.position.y = 0.01;
    scene.add(causticPlane);

    // --- Fountain Base ---
    const baseGeom = new THREE.CylinderGeometry(1.2, 1.5, 0.4, 32);
    const baseMat = new THREE.MeshPhysicalMaterial({
      color: 0x334455,
      roughness: 0.1,
      metalness: 0.9,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.position.y = 0.2;
    base.castShadow = true;
    base.receiveShadow = true;
    scene.add(base);

    // Inner nozzle
    const nozzleGeom = new THREE.CylinderGeometry(0.15, 0.25, 0.5, 16);
    const nozzleMat = new THREE.MeshPhysicalMaterial({
      color: 0x88aacc,
      roughness: 0.05,
      metalness: 1.0,
      clearcoat: 1.0,
    });
    const nozzle = new THREE.Mesh(nozzleGeom, nozzleMat);
    nozzle.position.y = 0.65;
    scene.add(nozzle);

    // --- Parameters ---
    const params = {
      gravity: -9.8,
      particleCount: 800,
      audioSensitivity: 0.5,
      jetHeight: 5.0,
      splashIntensity: 1.0,
      dropletOpacity: 0.7,
      causticSpeed: 1.0,
    };

    // --- Audio Analyzer ---
    let audioContext, analyser, dataArray, micStream;
    let micEnabled = false;
    let audioLevel = 0;

    const micBtn = document.getElementById('mic-btn');
    micBtn.addEventListener('click', async () => {
      if (micEnabled) return;
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext.createMediaStreamSource(micStream).connect(analyser);
        micEnabled = true;
        micBtn.textContent = 'Microphone Active';
        micBtn.classList.add('active');
      } catch (e) {
        micBtn.textContent = 'Mic Error - Try Again';
      }
    });

    function getAudioLevel() {
      if (!micEnabled || !analyser) return 0;
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      return (sum / dataArray.length / 255) * params.audioSensitivity;
    }

    // --- Mouse/Touch Interaction ---
    const mouse = new THREE.Vector2();
    const mouseWorld = new THREE.Vector3();
    let mouseActive = false;

    const raycaster = new THREE.Raycaster();
    const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1);

    function updateMouseWorld(clientX, clientY) {
      mouse.x = (clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      raycaster.ray.intersectPlane(interactionPlane, mouseWorld);
    }

    window.addEventListener('mousedown', (e) => {
      mouseActive = true;
      updateMouseWorld(e.clientX, e.clientY);
    });
    window.addEventListener('mousemove', (e) => {
      if (mouseActive) updateMouseWorld(e.clientX, e.clientY);
    });
    window.addEventListener('mouseup', () => { mouseActive = false; });

    window.addEventListener('touchstart', (e) => {
      mouseActive = true;
      updateMouseWorld(e.touches[0].clientX, e.touches[0].clientY);
    });
    window.addEventListener('touchmove', (e) => {
      if (mouseActive) updateMouseWorld(e.touches[0].clientX, e.touches[0].clientY);
    });
    window.addEventListener('touchend', () => { mouseActive = false; });

    // --- Verlet Particle System ---
    class Particle {
      constructor() {
        this.pos = new THREE.Vector3();
        this.prevPos = new THREE.Vector3();
        this.vel = new THREE.Vector3();
        this.acc = new THREE.Vector3();
        this.life = 0;
        this.maxLife = 1;
        this.size = 0.1;
        this.isSplash = false;
        this.mesh = null;
      }
    }

    const particles = [];
    const MAX_PARTICLES = 1200;
    const splashParticles = [];

    // Shared geometry and materials
    const dropletGeom = new THREE.SphereGeometry(1, 8, 8);
    const dropletMat = new THREE.MeshPhysicalMaterial({
      color: 0xaaddff,
      roughness: 0.0,
      metalness: 0.0,
      transmission: 0.9,
      thickness: 0.5,
      ior: 1.33,
      transparent: true,
      opacity: params.dropletOpacity,
    });

    const splashGeom = new THREE.SphereGeometry(1, 6, 6);
    const splashMat = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.6,
    });

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const mesh = new THREE.Mesh(dropletGeom, dropletMat.clone());
      mesh.scale.setScalar(0.06);
      mesh.visible = false;
      scene.add(mesh);
      const p = new Particle();
      p.mesh = mesh;
      particles.push(p);
    }

    // Splash mesh pool
    const splashMeshes = [];
    for (let i = 0; i < 200; i++) {
      const mesh = new THREE.Mesh(splashGeom, splashMat.clone());
      mesh.scale.setScalar(0.04);
      mesh.visible = false;
      scene.add(mesh);
      splashMeshes.push(mesh);
    }

    let particleIndex = 0;
    let splashIndex = 0;

    function emitParticle(x, y, z, vx, vy, vz, isSplash = false) {
      if (isSplash) {
        const sp = splashMeshes[splashIndex % splashMeshes.length];
        splashIndex++;
        sp.position.set(x, y, z);
        sp.visible = true;
        sp.userData.vel = new THREE.Vector3(vx, vy, vz);
        sp.userData.life = 1.0;
        sp.userData.isSplash = true;
      } else {
        const p = particles[particleIndex % MAX_PARTICLES];
        particleIndex++;
        p.pos.set(x, y, z);
        p.prevPos.copy(p.pos);
        p.vel.set(vx, vy, vz);
        p.acc.set(0, params.gravity, 0);
        p.life = 1.0;
        p.maxLife = 2.5 + Math.random() * 1.5;
        p.size = 0.05 + Math.random() * 0.06;
        p.isSplash = false;
        p.mesh.visible = true;
        p.mesh.scale.setScalar(p.size);
        p.mesh.position.copy(p.pos);
        // Vary color based on audio
        const hue = 0.55 + getAudioLevel() * 0.15;
        p.mesh.material.color.setHSL(hue, 0.7, 0.7);
        p.mesh.material.opacity = params.dropletOpacity;
      }
    }

    function updateParticles(dt) {
      const gravity = new THREE.Vector3(0, params.gravity, 0);
      const audioMod = 1.0 + getAudioLevel() * 2.0;

      // Emit main stream
      const emitCount = Math.floor(params.particleCount * 0.15);
      for (let i = 0; i < emitCount; i++) {
        const spread = 0.1;
        const x = (Math.random() - 0.5) * spread;
        const z = (Math.random() - 0.5) * spread;
        const speed = params.jetHeight * audioMod * (0.9 + Math.random() * 0.2);
        const angle = Math.random() * Math.PI * 2;
        const vx = Math.cos(angle) * speed * 0.1;
        const vy = speed;
        const vz = Math.sin(angle) * speed * 0.1;

        // Mouse push force
        if (mouseActive) {
          const dx = mouseWorld.x - x;
          const dz = mouseWorld.z - z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < 3) {
            const force = (3 - dist) / 3 * 3;
            vx += dx / dist * force;
            vz += dz / dist * force;
          }
        }

        emitParticle(x, 0.9, z, vx, vy, vz);
      }

      // Update main particles (Verlet)
      for (const p of particles) {
        if (!p.mesh.visible) continue;

        p.life -= dt / p.maxLife;
        if (p.life <= 0 || p.pos.y < 0) {
          p.mesh.visible = false;
          // Emit splash
          if (p.pos.y < 0.2 && p.pos.y > -0.1) {
            const splashCount = Math.floor(3 * params.splashIntensity);
            for (let i = 0; i < splashCount; i++) {
              const angle = Math.random() * Math.PI * 2;
              const spd = 1.5 + Math.random() * 2;
              emitParticle(
                p.pos.x, 0.1, p.pos.z,
                Math.cos(angle) * spd,
                1.0 + Math.random() * 2,
                Math.sin(angle) * spd,
                true
              );
            }
          }
          continue;
        }

        // Verlet integration
        const temp = p.pos.clone();
        const vel = p.pos.clone().sub(p.prevPos);
        vel.add(gravity.clone().multiplyScalar(dt * dt));
        p.pos.add(vel);
        p.prevPos.copy(temp);

        // Mouse push (repulsion)
        if (mouseActive) {
          const dx = p.pos.x - mouseWorld.x;
          const dz = p.pos.z - mouseWorld.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < 2.5 && dist > 0.01) {
            const force = (2.5 - dist) / 2.5 * 8 * dt;
            p.pos.x += dx / dist * force;
            p.pos.z += dz / dist * force;
          }
        }

        p.mesh.position.copy(p.pos);
        // Fade out
        p.mesh.material.opacity = Math.min(params.dropletOpacity, p.life * 1.5);
        p.mesh.scale.setScalar(p.size * (0.8 + p.life * 0.4));
      }

      // Update splash particles
      for (const mesh of splashMeshes) {
        if (!mesh.visible) continue;
        mesh.userData.life -= dt * 2.0;
        if (mesh.userData.life <= 0) {
          mesh.visible = false;
          continue;
        }
        mesh.userData.vel.y += params.gravity * dt;
        mesh.position.add(mesh.userData.vel.clone().multiplyScalar(dt));
        if (mesh.position.y < 0.05) {
          mesh.visible = false;
        }
        mesh.material.opacity = mesh.userData.life * 0.6;
        mesh.scale.setScalar(0.04 * mesh.userData.life);
      }
    }

    // --- Caustic Pattern ---
    let causticTime = 0;
    function updateCaustics(dt) {
      causticTime += dt * params.causticSpeed;
      const ctx = causticCtx;
      const w = causticCanvas.width;
      const h = causticCanvas.height;
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const audioMod = 1.0 + getAudioLevel();

      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + causticTime * 0.5;
        const radius = 80 + Math.sin(causticTime * 2 + i * 0.7) * 40 * audioMod;
        const cx2 = cx + Math.cos(angle) * radius;
        const cy2 = cy + Math.sin(angle) * radius;

        const grad = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, 60 * audioMod);
        const hue = 200 + Math.sin(causticTime + i) * 30;
        grad.addColorStop(0, `hsla(${hue}, 80%, 70%, 0.3)`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      causticTex.needsUpdate = true;
    }

    // --- GUI ---
    const gui = new GUI();
    gui.add(params, 'gravity', -20, -2, 0.1).name('Gravity');
    gui.add(params, 'particleCount', 100, 1200, 10).name('Particle Count');
    gui.add(params, 'audioSensitivity', 0, 2, 0.05).name('Audio Sensitivity');
    gui.add(params, 'jetHeight', 1, 10, 0.1).name('Jet Height');
    gui.add(params, 'splashIntensity', 0.1, 2, 0.1).name('Splash Intensity');
    gui.add(params, 'dropletOpacity', 0.1, 1, 0.05).name('Droplet Opacity');
    gui.add(params, 'causticSpeed', 0.1, 3, 0.1).name('Caustic Speed');

    // --- Animation Loop ---
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.033);

      updateParticles(dt);
      updateCaustics(dt);

      // Animate lights based on audio
      const audioMod = 1.0 + getAudioLevel();
      mainLight.intensity = 3 * audioMod;
      mainLight.color.setHSL(0.6 + getAudioLevel() * 0.1, 0.8, 0.5 + getAudioLevel() * 0.2);

      renderer.render(scene, camera);
    }

    animate();