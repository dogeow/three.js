import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import GUI from 'three/addons/libs/lil-gui.module.min.js';

    // ─── Constants ─────────────────────────────────────────────────────────────
    const RING_RADIUS = 22;
    const RING_TUBE_RADIUS = 0.55;
    const MAGNET_COUNT = 16;
    const CAVITY_COUNT = 4;
    const BUNCHES_PER_RING = 8;
    const PARTICLES_PER_BUNCH = 120;
    const TOTAL_PARTICLES = BUNCHES_PER_RING * PARTICLES_PER_BUNCH;

    // ─── Scene Setup ──────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000510, 0.018);

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 30, 48);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.04;
    controls.minDistance = 10;
    controls.maxDistance = 120;
    controls.target.set(0, 0, 0);

    // ─── Background ────────────────────────────────────────────────────────────
    const bgVert = `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }
    `;
    const bgFrag = `
      uniform float uTime;
      varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      void main(){
        vec2 uv = (vUv - 0.5) * 2.0;
        float r = length(uv);
        vec3 col = mix(vec3(0.01,0.02,0.06), vec3(0.0,0.0,0.02), r * 0.8);
        // subtle star field
        float s = hash(floor(vUv * 400.0));
        if(s > 0.998) col += vec3(0.4,0.5,0.7) * (s - 0.998) * 500.0;
        // animated faint grid rings
        float rings = sin(r * 30.0 - uTime * 0.3) * 0.5 + 0.5;
        col += vec3(0.0, 0.05, 0.12) * rings * 0.03 * smoothstep(0.3, 1.0, r);
        gl_FragColor = vec4(col, 1.0);
      }
    `;
    const bgMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        vertexShader: bgVert, fragmentShader: bgFrag,
        uniforms: { uTime: { value: 0 } },
        depthWrite: false, depthTest: false
      })
    );
    bgMesh.frustumCulled = false;
    bgMesh.renderOrder = -1;
    scene.add(bgMesh);

    // ─── Accelerator Ring (Beam Tube) ───────────────────────────────────────────
    const ringCurve = new THREE.EllipseCurve(0, 0, RING_RADIUS, RING_RADIUS, 0, 2 * Math.PI, false, 0);
    const ringPoints3D = ringCurve.getPoints(256).map(p => new THREE.Vector3(p.x, 0, p.y));

    // Outer tube
    const tubeGeo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(ringPoints3D, true),
      512, RING_TUBE_RADIUS, 12, true
    );
    const tubeMat = new THREE.MeshPhongMaterial({
      color: 0x224466,
      emissive: 0x001133,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      shininess: 80
    });
    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    scene.add(tubeMesh);

    // Inner glow tube
    const innerTubeGeo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(ringPoints3D, true),
      512, RING_TUBE_RADIUS * 0.3, 8, true
    );
    const innerTubeMat = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    scene.add(new THREE.Mesh(innerTubeGeo, innerTubeMat));

    // Ring frame (torus edges)
    const torusGeo = new THREE.TorusGeometry(RING_RADIUS, 0.08, 8, 128);
    const torusMat = new THREE.MeshPhongMaterial({ color: 0x1a3a5c, emissive: 0x002244, shininess: 120 });
    scene.add(new THREE.Mesh(torusGeo, torusMat));

    // ─── Dipole Magnets ────────────────────────────────────────────────────────
    const magnetColors = [0xff3344, 0x3355ff, 0xff5533, 0x2266ff];
    const magnetGroup = new THREE.Group();
    const magnets = [];

    for (let i = 0; i < MAGNET_COUNT; i++) {
      const angle = (i / MAGNET_COUNT) * Math.PI * 2;
      const x = Math.cos(angle) * RING_RADIUS;
      const z = Math.sin(angle) * RING_RADIUS;

      const magnetW = 2.2, magnetH = 2.0, magnetD = 1.2;
      const geo = new THREE.BoxGeometry(magnetW, magnetH, magnetD);
      const col = magnetColors[i % magnetColors.length];
      const mat = new THREE.MeshPhongMaterial({
        color: col,
        emissive: new THREE.Color(col).multiplyScalar(0.3),
        shininess: 60
      });
      const mesh = new THREE.Mesh(geo, mat);

      // N/S pole stripe
      const stripeGeo = new THREE.BoxGeometry(magnetW * 0.08, magnetH * 0.9, magnetD * 1.01);
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.x = magnetW * 0.46;
      mesh.add(stripe);

      mesh.position.set(x, 0, z);
      mesh.rotation.y = -angle;

      mesh.userData = { baseAngle: angle, index: i };
      magnets.push(mesh);
      magnetGroup.add(mesh);
    }
    scene.add(magnetGroup);

    // ─── RF Cavities ───────────────────────────────────────────────────────────
    const cavityGroup = new THREE.Group();
    const cavities = [];

    for (let i = 0; i < CAVITY_COUNT; i++) {
      const angle = (i / CAVITY_COUNT) * Math.PI * 2 + Math.PI / CAVITY_COUNT;
      const x = Math.cos(angle) * RING_RADIUS;
      const z = Math.sin(angle) * RING_RADIUS;

      // Cavity body (cylinder on its side along the ring tangent)
      const cavGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 16);
      const cavMat = new THREE.MeshPhongMaterial({
        color: 0xccaa44,
        emissive: 0x332200,
        shininess: 100
      });
      const cavMesh = new THREE.Mesh(cavGeo, cavMat);

      // Copper inner rings
      for (let r = 0; r < 3; r++) {
        const ringGeo = new THREE.TorusGeometry(0.52, 0.05, 8, 16);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xffcc44,
          transparent: true,
          opacity: 0.8 - r * 0.2,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = -0.5 + r * 0.5;
        ring.rotation.x = Math.PI / 2;
        cavMesh.add(ring);
      }

      cavMesh.position.set(x, 0, z);
      cavMesh.rotation.z = angle - Math.PI / 2;
      cavMesh.rotation.y = 0;

      // Glow sprite for cavity
      const glowCanvas = document.createElement('canvas');
      glowCanvas.width = 64; glowCanvas.height = 64;
      const gctx = glowCanvas.getContext('2d');
      const grd = gctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, 'rgba(255,200,80,0.8)');
      grd.addColorStop(0.4, 'rgba(255,150,50,0.3)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      gctx.fillStyle = grd;
      gctx.fillRect(0, 0, 64, 64);
      const glowTex = new THREE.CanvasTexture(glowCanvas);

      const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
      }));
      glowSprite.scale.set(4, 4, 1);
      glowSprite.position.copy(cavMesh.position);

      cavities.push({ mesh: cavMesh, glow: glowSprite, phase: i / CAVITY_COUNT * Math.PI * 2 });
      cavityGroup.add(cavMesh);
      scene.add(glowSprite);
    }
    scene.add(cavityGroup);

    // ─── Proton Bunches (InstancedMesh) ─────────────────────────────────────────
    const bunchGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const bunchMat = new THREE.MeshBasicMaterial({
      color: 0x00eeff,
      transparent: true,
      opacity: 0.95
    });
    const bunchMesh = new THREE.InstancedMesh(bunchGeo, bunchMat, TOTAL_PARTICLES);
    bunchMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(bunchMesh);

    // Bunch colors
    const bunchColors = new Float32Array(TOTAL_PARTICLES * 3);
    const cyanColor = new THREE.Color(0x00eeff);
    for (let i = 0; i < TOTAL_PARTICLES; i++) {
      bunchColors[i * 3] = cyanColor.r;
      bunchColors[i * 3 + 1] = cyanColor.g;
      bunchColors[i * 3 + 2] = cyanColor.b;
      bunchMesh.setColorAt(i, cyanColor);
    }
    bunchMesh.instanceColor.needsUpdate = true;

    // Particle data: which bunch, offset within bunch, random jitter
    const particleData = [];
    for (let b = 0; b < BUNCHES_PER_RING; b++) {
      for (let p = 0; p < PARTICLES_PER_BUNCH; p++) {
        particleData.push({
          bunch: b,
          offset: (p / PARTICLES_PER_BUNCH) * Math.PI * 2,
          jitterR: (Math.random() - 0.5) * 0.25,
          jitterA: (Math.random() - 0.5) * 0.12,
          jitterZ: (Math.random() - 0.5) * 0.25
        });
      }
    }

    // ─── Synchrotron Radiation Trails ───────────────────────────────────────────
    const TRAIL_LENGTH = 80; // segments per bunch trail
    const TRAIL_VISUAL_POINTS = TRAIL_LENGTH * BUNCHES_PER_RING;

    const trailPositions = new Float32Array(TRAIL_VISUAL_POINTS * 6); // xyz * 2 for LineSegments
    const trailColors = new Float32Array(TRAIL_VISUAL_POINTS * 6);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));

    const trailMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const trailLines = new THREE.LineSegments(trailGeo, trailMat);
    scene.add(trailLines);

    // Store trail history for each bunch
    const trailHistory = [];
    for (let b = 0; b < BUNCHES_PER_RING; b++) {
      const history = [];
      for (let t = 0; t < TRAIL_LENGTH; t++) {
        const angle = (b / BUNCHES_PER_RING) * Math.PI * 2;
        history.push(new THREE.Vector3(
          Math.cos(angle) * RING_RADIUS,
          0,
          Math.sin(angle) * RING_RADIUS
        ));
      }
      trailHistory.push(history);
    }

    // ─── Beam Current / Radiation Glow Sprites ─────────────────────────────────
    const radiationSprites = [];
    for (let b = 0; b < BUNCHES_PER_RING; b++) {
      const rc = document.createElement('canvas');
      rc.width = 64; rc.height = 64;
      const rctx = rc.getContext('2d');
      const rg = rctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      rg.addColorStop(0, 'rgba(0,240,255,0.9)');
      rg.addColorStop(0.3, 'rgba(0,180,255,0.4)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      rctx.fillStyle = rg;
      rctx.fillRect(0, 0, 64, 64);
      const rt = new THREE.CanvasTexture(rc);

      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: rt, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
      }));
      sp.scale.set(0, 0, 1);
      scene.add(sp);
      radiationSprites.push(sp);
    }

    // ─── Particle-Accelerator Field Lines (B-field visualization) ──────────────
    const fieldLinePoints = [];
    const numFieldLines = 24;
    for (let i = 0; i < numFieldLines; i++) {
      const angle = (i / numFieldLines) * Math.PI * 2;
      const mx = Math.cos(angle) * RING_RADIUS;
      const mz = Math.sin(angle) * RING_RADIUS;
      // Field lines curve outward from magnet
      for (let s = 0; s < 20; s++) {
        const t = s / 20;
        const r = RING_RADIUS + (t - 0.5) * 6;
        fieldLinePoints.push(new THREE.Vector3(
          Math.cos(angle) * r,
          (Math.sin(t * Math.PI) * 1.5) * (i % 2 === 0 ? 1 : -1),
          Math.sin(angle) * r
        ));
      }
    }
    const fieldGeo = new THREE.BufferGeometry().setFromPoints(fieldLinePoints);
    const fieldLines = new THREE.Line(fieldGeo, new THREE.LineBasicMaterial({
      color: 0x334466, transparent: true, opacity: 0.25, depthWrite: false
    }));
    scene.add(fieldLines);

    // ─── Lights ────────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x112244, 0.8));
    const dirLight = new THREE.DirectionalLight(0x4488ff, 0.6);
    dirLight.position.set(20, 30, 10);
    scene.add(dirLight);
    const pointLight = new THREE.PointLight(0x00ccff, 1.5, 60);
    scene.add(pointLight);

    // ─── GUI ───────────────────────────────────────────────────────────────────
    const params = {
      gamma: 1.41,          // relativistic gamma (β = sqrt(1-1/γ²))
      beamCurrent: 0.5,     // relative beam current
      radiationIntensity: 1.0,
      showFieldLines: false,
      showCavities: true,
      trailLength: 0.8,
      orbitSpeed: 1.0,
      colorMode: 'cyan'
    };

    const gui = new GUI({ title: 'Accelerator Controls' });
    gui.add(params, 'gamma', 1.05, 10.0, 0.01).name('γ (Gamma)').onChange(() => updateGammaDisplay());
    gui.add(params, 'beamCurrent', 0.0, 1.0, 0.01).name('Beam Current');
    gui.add(params, 'radiationIntensity', 0.0, 3.0, 0.05).name('Radiation');
    gui.add(params, 'showFieldLines').name('Show B-Field');
    gui.add(params, 'showCavities').name('Show Cavities');
    gui.add(params, 'trailLength', 0.0, 1.0, 0.01).name('Trail Length');
    gui.add(params, 'orbitSpeed', 0.1, 5.0, 0.05).name('Orbit Speed');
    gui.add(params, 'colorMode', ['cyan', 'gold', 'green', 'pink']).name('Beam Color');
    gui.close();

    function updateGammaDisplay() {
      const beta = Math.sqrt(1 - 1 / (params.gamma * params.gamma));
      document.getElementById('gammaDisplay').textContent =
        `γ=${params.gamma.toFixed(2)}  β=${beta.toFixed(3)}c`;
    }

    // ─── Bunch angle state ──────────────────────────────────────────────────────
    // Proper synchrotron frequency: ω_s ∝ √(V·(Δp/p)) ... simplified here
    // The orbital angular velocity = (c·β)/R
    // Due to time dilation, lab-frame frequency f_lab = f_rest / γ
    const bunchAngles = [];
    for (let b = 0; b < BUNCHES_PER_RING; b++) {
      bunchAngles.push((b / BUNCHES_PER_RING) * Math.PI * 2);
    }

    // ─── Trail update ───────────────────────────────────────────────────────────
    const dummy = new THREE.Object3D();

    function updateTrails(bunchIdx, newPos) {
      const history = trailHistory[bunchIdx];
      // Shift history
      for (let t = TRAIL_LENGTH - 1; t > 0; t--) {
        history[t].copy(history[t - 1]);
      }
      history[0].copy(newPos);
    }

    function flushTrailsToGeometry() {
      let lineVertIdx = 0;
      const maxAlpha = params.radiationIntensity * params.trailLength;

      for (let b = 0; b < BUNCHES_PER_RING; b++) {
        const history = trailHistory[b];
        for (let t = 0; t < TRAIL_LENGTH - 1; t++) {
          if (lineVertIdx >= TRAIL_VISUAL_POINTS) break;

          const alpha = maxAlpha * Math.pow(1 - t / TRAIL_LENGTH, 1.5);
          const r0 = history[t], r1 = history[t + 1];
          const idx = lineVertIdx * 6;

          trailPositions[idx] = r0.x; trailPositions[idx + 1] = r0.y; trailPositions[idx + 2] = r0.z;
          trailPositions[idx + 3] = r1.x; trailPositions[idx + 4] = r1.y; trailPositions[idx + 5] = r1.z;

          const cr = 0, cg = 0.9 * alpha, cb = 1.0 * alpha;
          trailColors[idx] = cr; trailColors[idx + 1] = cg; trailColors[idx + 2] = cb;
          trailColors[idx + 3] = cr * 0.5; trailColors[idx + 4] = cg * 0.5; trailColors[idx + 5] = cb * 0.5;

          lineVertIdx++;
        }
      }

      // Zero out remainder
      for (let i = lineVertIdx; i < TRAIL_VISUAL_POINTS; i++) {
        const idx = i * 6;
        trailPositions.fill(0, idx, idx + 6);
        trailColors.fill(0, idx, idx + 6);
      }

      trailGeo.attributes.position.needsUpdate = true;
      trailGeo.attributes.color.needsUpdate = true;
      trailGeo.setDrawRange(0, lineVertIdx * 2);
    }

    // ─── Animation ─────────────────────────────────────────────────────────────
    let time = 0;
    const baseOrbitSpeed = 0.0003; // radians per ms, at β≈1

    function animate(ms) {
      requestAnimationFrame(animate);
      time = ms * 0.001; // seconds

      // Relativistic beta
      const beta = Math.sqrt(1 - 1 / (params.gamma * params.gamma));
      // Orbital angular speed in lab frame (time-dilated): ω_lab = (c·β/γR)
      // = baseOrbitSpeed * (beta / gamma) for normalized units
      const omega = baseOrbitSpeed * beta / params.gamma * params.orbitSpeed * 60;

      // Beam color
      const beamColorMap = {
        cyan: new THREE.Color(0x00eeff),
        gold: new THREE.Color(0xffcc44),
        green: new THREE.Color(0x44ff88),
        pink: new THREE.Color(0xff66cc)
      };
      const currentBeamColor = beamColorMap[params.colorMode];

      // Update bunch angles and particle positions
      for (let b = 0; b < BUNCHES_PER_RING; b++) {
        bunchAngles[b] += omega * 16.67; // ~60fps step

        const bunchAngle = bunchAngles[b];
        const cx = Math.cos(bunchAngle) * RING_RADIUS;
        const cz = Math.sin(bunchAngle) * RING_RADIUS;

        // Update InstancedMesh particles for this bunch
        for (let p = 0; p < PARTICLES_PER_BUNCH; p++) {
          const pd = particleData[b * PARTICLES_PER_BUNCH + p];
          const jitterAngle = bunchAngle + pd.offset + pd.jitterA;
          const jitterR = RING_RADIUS + pd.jitterR;
          const px = Math.cos(jitterAngle) * jitterR;
          const pz = Math.sin(jitterAngle) * jitterR;

          dummy.position.set(px, pd.jitterZ, pz);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          bunchMesh.setMatrixAt(b * PARTICLES_PER_BUNCH + p, dummy.matrix);

          // Color tint by energy (gamma)
          const colorT = (params.gamma - 1) / 9; // 0..1 over γ 1..10
          const tintedColor = currentBeamColor.clone().lerp(new THREE.Color(0xffffff), colorT * 0.3);
          bunchMesh.setColorAt(b * PARTICLES_PER_BUNCH + p, tintedColor);
        }

        // Trail position (center of bunch)
        updateTrails(b, new THREE.Vector3(cx, 0, cz));

        // Radiation sprite
        const sprite = radiationSprites[b];
        sprite.position.set(cx, 0, cz);
        const intensity = params.radiationIntensity * params.beamCurrent;
        const spriteSize = (2 + colorT * 4) * intensity;
        sprite.scale.set(spriteSize, spriteSize, 1);
        sprite.material.opacity = Math.min(1, intensity * 0.8);
      }

      bunchMesh.instanceMatrix.needsUpdate = true;
      if (bunchMesh.instanceColor) bunchMesh.instanceColor.needsUpdate = true;

      // Update trails
      flushTrailsToGeometry();

      // Animate cavities
      const cavVisible = params.showCavities;
      cavities.forEach((cav, i) => {
        cav.mesh.visible = cavVisible;
        cav.glow.visible = cavVisible;
        const pulse = 0.5 + 0.5 * Math.sin(time * 8 + cav.phase * Math.PI * 2);
        cav.glow.material.opacity = 0.4 + pulse * 0.6;
        cav.glow.scale.set(3 + pulse * 2, 3 + pulse * 2, 1);
      });

      // Field lines
      fieldLines.visible = params.showFieldLines;

      // Background
      bgMesh.material.uniforms.uTime.value = time;

      // Point light orbits with the beam
      const avgAngle = bunchAngles.reduce((a, b) => a + b, 0) / BUNCHES_PER_RING;
      pointLight.position.set(
        Math.cos(avgAngle) * (RING_RADIUS + 3),
        2,
        Math.sin(avgAngle) * (RING_RADIUS + 3)
      );

      controls.update();
      renderer.render(scene, camera);
    }

    animate(0);

    // ─── Resize ─────────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Initial gamma display
    updateGammaDisplay();