import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
    import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
    import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

    // ─── Lens Distortion Shader ─────────────────────────────────────────────
    const LensDistortionShader = {
      name: 'LensDistortionShader',
      uniforms: {
        tDiffuse:   { value: null },
        uType:      { value: 0.0 },   // 0=none 1=barrel 2=pincushion 3=wave
        uStrength:  { value: 0.3 },
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        precision highp float;

        uniform sampler2D tDiffuse;
        uniform float uType;
        uniform float uStrength;

        varying vec2 vUv;

        void main() {
          vec2 uv = vUv;

          if (uType < 0.5) {
            // None
            gl_FragColor = texture2D(tDiffuse, uv);
            return;
          }

          vec2 center = vec2(0.5, 0.5);
          vec2 delta = uv - center;
          float r = length(delta);
          float r2 = r * r;

          if (uType < 1.5) {
            // Barrel distortion: push outward, k > 0
            float k = uStrength * 0.8;
            float factor = 1.0 + k * r2;
            uv = center + delta * factor;
          } else if (uType < 2.5) {
            // Pincushion distortion: pull inward, k > 0
            float k = uStrength * 0.8;
            float factor = 1.0 / (1.0 + k * r2);
            uv = center + delta * factor;
          } else {
            // Wave distortion: sin-based warping
            float freq = 8.0 + uStrength * 12.0;
            float amp  = uStrength * 0.06;
            vec2 wave = sin(delta * freq) * amp;
            uv = clamp(uv + wave, 0.0, 1.0);
          }

          // Sample with black border on out-of-bounds
          if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
          } else {
            gl_FragColor = texture2D(tDiffuse, uv);
          }
        }
      `,
    };

    // ─── Scene Setup ─────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a14, 0.025);

    const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
    camera.position.set(0, 6, 14);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // ─── Controls ────────────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 3;
    controls.maxDistance = 40;

    // ─── Lighting ─────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x334466, 1.2));

    const sun = new THREE.DirectionalLight(0xffeedd, 2.0);
    sun.position.set(8, 14, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = -15;
    sun.shadow.camera.right = 15;
    sun.shadow.camera.top = 15;
    sun.shadow.camera.bottom = -15;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0x4466ff, 0.5);
    fill.position.set(-6, 4, -8);
    scene.add(fill);

    // ─── Grid Floor ──────────────────────────────────────────────────────────
    const grid = new THREE.GridHelper(40, 40, 0x224466, 0x112233);
    grid.position.y = 0;
    scene.add(grid);

    const floorGeo = new THREE.PlaneGeometry(40, 40);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x080c14,
      roughness: 0.9,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // ─── Colored Boxes in a Circle ───────────────────────────────────────────
    const boxColors = [0xff6b6b, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xc77dff, 0xff9f43, 0x00cec9, 0xfd79a8];
    const ringGroup = new THREE.Group();
    scene.add(ringGroup);

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    boxColors.forEach((col, i) => {
      const angle = (i / boxColors.length) * Math.PI * 2;
      const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.3, metalness: 0.4 });
      const box = new THREE.Mesh(boxGeo, mat);
      box.position.set(Math.cos(angle) * 5, 0.5, Math.sin(angle) * 5);
      box.castShadow = true;
      box.receiveShadow = true;
      box.userData.rotSpeed = 0.4 + Math.random() * 0.4;
      ringGroup.add(box);
    });

    // ─── Central Pillar ──────────────────────────────────────────────────────
    const pillarGeo = new THREE.CylinderGeometry(0.4, 0.5, 4, 16);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.2, metalness: 0.8 });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.y = 2;
    pillar.castShadow = true;
    scene.add(pillar);

    // ─── Emissive Glowing Orbs ────────────────────────────────────────────────
    const orbGroup = new THREE.Group();
    scene.add(orbGroup);

    const orbData = [
      { color: 0x00ffaa, y: 1.2,  r: 0.18 },
      { color: 0xff4488, y: 0.9,  r: 0.15 },
      { color: 0x44aaff, y: 1.5,  r: 0.20 },
      { color: 0xffaa00, y: 1.0,  r: 0.14 },
    ];

    orbData.forEach(({ color, y, r }) => {
      const orbGeo = new THREE.SphereGeometry(r, 20, 20);
      const orbMat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 3.0,
        roughness: 0,
        metalness: 0,
      });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.set((Math.random() - 0.5) * 8, y, (Math.random() - 0.5) * 8);
      orb.userData.floatSpeed = 0.8 + Math.random() * 0.6;
      orb.userData.floatOffset = Math.random() * Math.PI * 2;
      orbGroup.add(orb);

      // Point light for each orb
      const pl = new THREE.PointLight(color, 1.5, 5);
      pl.position.copy(orb.position);
      orb.userData.light = pl;
      scene.add(pl);
    });

    // ─── Outer Ring of Torus Objects ─────────────────────────────────────────
    const torusGroup = new THREE.Group();
    scene.add(torusGroup);

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const tGeo = new THREE.TorusGeometry(0.4, 0.12, 12, 24);
      const tMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(i / 8, 0.7, 0.5),
        roughness: 0.2,
        metalness: 0.6,
      });
      const torus = new THREE.Mesh(tGeo, tMat);
      torus.position.set(Math.cos(angle) * 9, 1.2, Math.sin(angle) * 9);
      torus.rotation.x = Math.PI / 4;
      torus.rotation.y = angle;
      torus.castShadow = true;
      torus.userData.rotAxis = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize();
      torus.userData.rotSpeed = 0.3 + Math.random() * 0.5;
      torusGroup.add(torus);
    }

    // ─── Post-Processing ──────────────────────────────────────────────────────
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const distortionPass = new ShaderPass(LensDistortionShader);
    composer.addPass(distortionPass);

    // ─── UI ───────────────────────────────────────────────────────────────────
    const typeMap = { 'btn-none': 0, 'btn-barrel': 1, 'btn-pincushion': 2, 'btn-wave': 3 };
    const buttons = document.querySelectorAll('#ui button');
    const strengthSlider = document.getElementById('strength');
    const strengthVal = document.getElementById('strengthVal');

    function setType(type) {
      buttons.forEach(b => b.classList.toggle('active', b.id === type));
      distortionPass.uniforms.uType.value = typeMap[type];
    }

    buttons.forEach(btn => {
      btn.addEventListener('click', () => setType(btn.id));
    });

    strengthSlider.addEventListener('input', () => {
      const v = parseFloat(strengthSlider.value);
      distortionPass.uniforms.uStrength.value = v;
      strengthVal.textContent = v.toFixed(2);
    });

    // ─── Resize ───────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
      composer.setSize(innerWidth, innerHeight);
    });

    // ─── Animation ───────────────────────────────────────────────────────────
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      controls.update();

      // Rotate ring of boxes
      ringGroup.rotation.y = t * 0.12;

      // Rotate each box on its own axis
      ringGroup.children.forEach(box => {
        box.rotation.x += 0.01 * box.userData.rotSpeed;
        box.rotation.y += 0.015 * box.userData.rotSpeed;
      });

      // Float orbs and sync lights
      orbGroup.children.forEach((orb, i) => {
        const s = orb.userData.floatSpeed;
        const off = orb.userData.floatOffset;
        orb.position.y += Math.sin(t * s + off) * 0.003;
        if (orb.userData.light) {
          orb.userData.light.position.y = orb.position.y;
        }
      });

      // Rotate torus ring
      torusGroup.rotation.y = t * 0.08;
      torusGroup.children.forEach(tor => {
        tor.rotateOnAxis(tor.userData.rotAxis, 0.01 * tor.userData.rotSpeed);
      });

      // Rotate pillar
      pillar.rotation.y = t * 0.2;

      composer.render();
    }

    animate();

    // ─── Expose to window ────────────────────────────────────────────────────
    window.scene = scene;
    window.camera = camera;
    window.renderer = renderer;
    window.controls = controls;
    window.composer = composer;