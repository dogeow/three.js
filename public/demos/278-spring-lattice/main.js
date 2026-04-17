import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

    // --- Config ---
    const cfg = {
      gridSize: 8,
      spacing: 1.2,
      stiffness: 0.3,
      damping: 0.92,
      gravity: -0.015,
      showLines: true,
      particleRadius: 0.18,
    };

    // --- Scene ---
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x0a0a0f);
    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0x334466, 1.2));
    const dirLight = new THREE.DirectionalLight(0x88aaff, 1.5);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);
    const pointLight = new THREE.PointLight(0x4488ff, 2, 80);
    pointLight.position.set(0, 10, 0);
    scene.add(pointLight);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(18, 14, 18);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 4, 0);

    // --- Particle class (Verlet) ---
    class Particle {
      constructor(x, y, z, fixed = false) {
        this.pos = new THREE.Vector3(x, y, z);
        this.prevPos = new THREE.Vector3(x, y, z);
        this.vel = new THREE.Vector3();
        this.acc = new THREE.Vector3();
        this.fixed = fixed;
        this.grabbed = false;
      }

      applyForce(fx, fy, fz) {
        if (this.fixed || this.grabbed) return;
        this.acc.x += fx;
        this.acc.y += fy;
        this.acc.z += fz;
      }

      update(damping) {
        if (this.fixed || this.grabbed) return;
        this.vel.subVectors(this.pos, this.prevPos).multiplyScalar(damping);
        this.prevPos.copy(this.pos);
        this.pos.add(this.vel);
        this.pos.add(this.acc);
        this.acc.set(0, 0, 0);
      }

      getVelocity() {
        return this.vel.length();
      }
    }

    // --- Spring ---
    class Spring {
      constructor(a, b, restLength) {
        this.a = a;
        this.b = b;
        this.restLength = restLength;
      }

      apply(stiffness) {
        const dx = this.b.pos.x - this.a.pos.x;
        const dy = this.b.pos.y - this.a.pos.y;
        const dz = this.b.pos.z - this.a.pos.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.0001;
        const force = (dist - this.restLength) * stiffness;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;

        if (!this.a.fixed && !this.a.grabbed) this.a.applyForce(fx, fy, fz);
        if (!this.b.fixed && !this.b.grabbed) this.b.applyForce(-fx, -fy, -fz);
      }
    }

    // --- Build lattice ---
    let particles = [];
    let springs = [];
    let instancedMesh;
    let lineSegments;
    let linePositions;
    let particleCount = 0;

    const colorLow = new THREE.Color(0x1a3a6a);
    const colorMid = new THREE.Color(0x44aaff);
    const colorHigh = new THREE.Color(0xff4422);

    function buildLattice() {
      // Remove old
      if (instancedMesh) scene.remove(instancedMesh);
      if (lineSegments) scene.remove(lineSegments);

      particles = [];
      springs = [];

      const gs = cfg.gridSize;
      const sp = cfg.spacing;
      const offset = (gs - 1) * sp * 0.5;

      for (let x = 0; x < gs; x++) {
        for (let y = 0; y < gs; y++) {
          for (let z = 0; z < gs; z++) {
            const fixed = (y === gs - 1);
            particles.push(new Particle(
              x * sp - offset,
              y * sp,
              z * sp - offset,
              fixed
            ));
          }
        }
      }

      particleCount = gs * gs * gs;

      // Springs: connect adjacent in 6 directions
      const idx = (x, y, z) => x * gs * gs + y * gs + z;
      for (let x = 0; x < gs; x++) {
        for (let y = 0; y < gs; y++) {
          for (let z = 0; z < gs; z++) {
            if (x < gs - 1) springs.push(new Spring(particles[idx(x, y, z)], particles[idx(x + 1, y, z)], sp));
            if (y < gs - 1) springs.push(new Spring(particles[idx(x, y, z)], particles[idx(x, y + 1, z)], sp));
            if (z < gs - 1) springs.push(new Spring(particles[idx(x, y, z)], particles[idx(x, y, z + 1)], sp));
          }
        }
      }

      // InstancedMesh
      const geo = new THREE.SphereGeometry(cfg.particleRadius, 10, 7);
      const mat = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 80 });
      instancedMesh = new THREE.InstancedMesh(geo, mat, particleCount);
      instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

      const col = new THREE.Color();
      for (let i = 0; i < particleCount; i++) {
        col.setRGB(0.2, 0.5, 1.0);
        instancedMesh.setColorAt(i, col);
      }
      if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
      scene.add(instancedMesh);

      // LineSegments
      linePositions = new Float32Array(springs.length * 2 * 3);
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
      const lineMat = new THREE.LineBasicMaterial({ color: 0x224466, transparent: true, opacity: 0.35 });
      lineSegments = new THREE.LineSegments(lineGeo, lineMat);
      lineSegments.visible = cfg.showLines;
      scene.add(lineSegments);
    }

    function updatePhysics() {
      // Gravity
      for (const p of particles) {
        p.applyForce(0, cfg.gravity, 0);
      }

      // Spring forces
      for (const s of springs) {
        s.apply(cfg.stiffness);
      }

      // Integrate
      for (const p of particles) {
        p.update(cfg.damping);
      }

      // Update instanced mesh
      const dummy = new THREE.Object3D();
      const col = new THREE.Color();
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        dummy.position.copy(p.pos);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);

        const speed = p.getVelocity();
        if (speed < 0.08) {
          col.copy(colorLow);
        } else if (speed < 0.4) {
          col.lerpColors(colorLow, colorMid, (speed - 0.08) / 0.32);
        } else {
          col.lerpColors(colorMid, colorHigh, Math.min((speed - 0.4) / 0.6, 1));
        }
        instancedMesh.setColorAt(i, col);
      }
      instancedMesh.instanceMatrix.needsUpdate = true;
      if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;

      // Update lines
      if (cfg.showLines) {
        for (let i = 0; i < springs.length; i++) {
          const s = springs[i];
          linePositions[i * 6 + 0] = s.a.pos.x;
          linePositions[i * 6 + 1] = s.a.pos.y;
          linePositions[i * 6 + 2] = s.a.pos.z;
          linePositions[i * 6 + 3] = s.b.pos.x;
          linePositions[i * 6 + 4] = s.b.pos.y;
          linePositions[i * 6 + 5] = s.b.pos.z;
        }
        lineSegments.geometry.attributes.position.needsUpdate = true;
      }
    }

    // --- Mouse interaction ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const planeIntersect = new THREE.Vector3();
    let grabbed = null;

    function onMouseDown(e) {
      if (e.button !== 0) return;
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObject(instancedMesh);
      if (hits.length > 0) {
        const idx = hits[0].instanceId;
        grabbed = particles[idx];
        if (grabbed) {
          grabbed.grabbed = true;
          controls.enabled = false;
          plane.constant = -grabbed.pos.y;
        }
      }
    }

    function onMouseMove(e) {
      if (!grabbed) return;
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      raycaster.ray.intersectPlane(plane, planeIntersect);
      grabbed.pos.copy(planeIntersect);
      grabbed.prevPos.copy(planeIntersect);
    }

    function onMouseUp() {
      if (grabbed) {
        grabbed.grabbed = false;
        grabbed = null;
        controls.enabled = true;
      }
    }

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Touch
    window.addEventListener('touchstart', e => { if (e.touches.length === 1) onMouseDown({ button: 0, clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }); }, { passive: true });
    window.addEventListener('touchmove', e => { if (e.touches.length === 1) onMouseMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }); }, { passive: true });
    window.addEventListener('touchend', onMouseUp, { passive: true });

    // --- GUI ---
    const gui = new GUI({ title: 'Spring Lattice', width: 240 });
    gui.domElement.style.setProperty('--bg-color', 'rgba(10,10,20,0.9)');
    gui.domElement.style.setProperty('--text-color', 'rgba(180,220,255,0.9)');
    gui.domElement.style.setProperty('--title-color', 'rgba(100,200,255,0.9)');
    gui.domElement.style.setProperty('--widget-color', 'rgba(40,80,120,0.8)');
    gui.domElement.style.setProperty('--hover-color', 'rgba(60,120,180,0.8)');
    gui.domElement.style.setProperty('--focus-color', 'rgba(80,150,220,0.8)');
    gui.domElement.style.setProperty('--number-color', 'rgba(100,200,255,0.7)');
    gui.domElement.style.setProperty('--string-color', 'rgba(180,220,255,0.9)');

    const pFolder = gui.addFolder('Structure');
    pFolder.add(cfg, 'gridSize', 3, 15, 1).name('Grid Size').onFinishChange(buildLattice);
    pFolder.add(cfg, 'spacing', 0.5, 3, 0.1).name('Spacing').onFinishChange(buildLattice);
    pFolder.open();

    const sFolder = gui.addFolder('Physics');
    sFolder.add(cfg, 'stiffness', 0.01, 1.0, 0.01).name('Stiffness');
    sFolder.add(cfg, 'damping', 0.7, 0.99, 0.01).name('Damping');
    sFolder.add(cfg, 'gravity', -0.1, 0.0, 0.005).name('Gravity');
    sFolder.open();

    gui.add(cfg, 'showLines').name('Show Springs').onChange(v => { lineSegments.visible = v; });

    // --- Resize ---
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // --- Init ---
    buildLattice();

    // --- Animate ---
    function animate() {
      requestAnimationFrame(animate);
      updatePhysics();
      controls.update();
      renderer.render(scene, camera);
    }
    animate();