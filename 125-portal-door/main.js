import * as THREE from 'three';
    import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

    // ─── Scene ───────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    scene.fog = new THREE.Fog(0x111111, 5, 30);

    // ─── Camera ──────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 100);
    camera.position.set(0, 1.7, 6);

    // ─── Renderer ────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // ─── Lights ──────────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.0);
    dirLight.position.set(5, 8, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 30;
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    scene.add(dirLight);

    // Portal point lights
    const pLight1 = new THREE.PointLight(0x00ffcc, 2, 4);
    pLight1.position.set(-4, 1.5, 0);
    scene.add(pLight1);

    const pLight2 = new THREE.PointLight(0xff6600, 2, 4);
    pLight2.position.set(4, 1.5, 0);
    scene.add(pLight2);

    // ─── Ground ──────────────────────────────────────────────────────────────
    const groundGeo = new THREE.PlaneGeometry(20, 20);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid helper
    const grid = new THREE.GridHelper(20, 20, 0x333333, 0x222222);
    grid.position.y = 0.001;
    scene.add(grid);

    // ─── Walls ──────────────────────────────────────────────────────────────
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.8 });

    function makeWall(w, h, d, x, y, z, ry = 0) {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(x, y, z);
      mesh.rotation.y = ry;
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      scene.add(mesh);
      return mesh;
    }

    // Back wall
    makeWall(20, 6, 0.3, 0, 3, -10);
    // Front wall
    makeWall(20, 6, 0.3, 0, 3, 10);
    // Left wall
    makeWall(0.3, 6, 20, -10, 3, 0);
    // Right wall
    makeWall(0.3, 6, 20, 10, 3, 0);

    // Ceiling
    const ceilGeo = new THREE.PlaneGeometry(20, 20);
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0x0d0d1a, roughness: 0.9 });
    const ceil = new THREE.Mesh(ceilGeo, ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 6;
    scene.add(ceil);

    // ─── Portal Class ────────────────────────────────────────────────────────
    const PORTAL_HALF_W = 0.85;
    const PORTAL_HALF_H = 1.4;

    class Portal {
      constructor(position, rotationY, color, otherPortal) {
        this.position = position.clone();
        this.rotationY = rotationY;
        this.otherPortal = otherPortal;

        this.group = new THREE.Group();
        this.group.position.copy(position);
        this.group.rotation.y = rotationY;

        // Portal frame (elliptical ring)
        const frameGeo = new THREE.TorusGeometry(1, 0.06, 16, 64);
        const frameMat = new THREE.MeshStandardMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 0.8,
          roughness: 0.2,
          metalness: 0.8
        });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.scale.set(PORTAL_HALF_W, PORTAL_HALF_H, 1);
        this.group.add(frame);

        // Outer decorative ring
        const outerGeo = new THREE.TorusGeometry(1.15, 0.03, 12, 64);
        const outerMat = new THREE.MeshStandardMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 0.4,
          roughness: 0.3,
          metalness: 0.7
        });
        const outer = new THREE.Mesh(outerGeo, outerMat);
        outer.scale.set(PORTAL_HALF_W, PORTAL_HALF_H, 1);
        this.group.add(outer);

        // Fill disc (renders the other side)
        const fillGeo = new THREE.CircleGeometry(0.92, 64);
        this.renderTarget = new THREE.WebGLRenderTarget(512, 512, {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
        });
        const fillMat = new THREE.MeshBasicMaterial({
          map: this.renderTarget.texture,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.95
        });
        this.fillMesh = new THREE.Mesh(fillGeo, fillMat);
        this.fillMesh.scale.set(PORTAL_HALF_W, PORTAL_HALF_H, 1);
        this.fillMesh.position.z = -0.05;
        this.group.add(this.fillMesh);

        // Glow sprite
        const glowCanvas = document.createElement('canvas');
        glowCanvas.width = glowCanvas.height = 128;
        const gCtx = glowCanvas.getContext('2d');
        const grad = gCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
        grad.addColorStop(0, `${color}88`);
        grad.addColorStop(1, 'transparent');
        gCtx.fillStyle = grad;
        gCtx.fillRect(0, 0, 128, 128);
        const glowTex = new THREE.CanvasTexture(glowCanvas);
        const glowGeo = new THREE.PlaneGeometry(3.5, 5);
        const glowMat = new THREE.MeshBasicMaterial({
          map: glowTex,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.z = -0.1;
        this.group.add(glow);

        scene.add(this.group);

        // Portal camera
        this.camera = new THREE.PerspectiveCamera(75, 1, 0.05, 100);
        this.updateCamera();
      }

      updateCamera() {
        // Position camera at the other portal
        const other = this.otherPortal;
        this.camera.position.copy(other.position);
        this.camera.position.y = 1.7;

        // Face same direction as other portal (but through to this side)
        // The "other" portal faces inward. We want to look through it.
        const dir = new THREE.Vector3(0, 0, 1);
        dir.applyEuler(new THREE.Euler(0, other.rotationY, 0));
        this.camera.lookAt(
          other.position.x + dir.x * 10,
          1.7,
          other.position.z + dir.z * 10
        );
      }

      // Check if a world position is inside the portal ellipse
      isInside(pos) {
        // Transform to portal local space
        const local = pos.clone().sub(this.position);
        const cos = Math.cos(-this.rotationY);
        const sin = Math.sin(-this.rotationY);
        const lx = local.x * cos - local.z * sin;
        const lz = local.x * sin + local.z * cos;
        const nx = lx / PORTAL_HALF_W;
        const nz = lz / PORTAL_HALF_H;
        return nx * nx + nz * nz < 1.0;
      }
    }

    // ─── Create Portals ──────────────────────────────────────────────────────
    const portal1 = new Portal(
      new THREE.Vector3(-4, 1.7, 0),
      0,
      0x00ffcc,
      null
    );

    const portal2 = new Portal(
      new THREE.Vector3(4, 1.7, 0),
      Math.PI,
      0xff6600,
      portal1
    );

    portal1.otherPortal = portal2;

    // ─── Simple Room Decorations ─────────────────────────────────────────────
    // Pillars near portals
    function makePillar(x, z) {
      const geo = new THREE.CylinderGeometry(0.15, 0.15, 6, 8);
      const mat = new THREE.MeshStandardMaterial({ color: 0x2a2a4a, roughness: 0.7 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, 3, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    }
    makePillar(-6, -8);
    makePillar(6, -8);
    makePillar(-6, 8);
    makePillar(6, 8);

    // ─── Player Controller ───────────────────────────────────────────────────
    const controls = new PointerLockControls(camera, renderer.domElement);
    scene.add(controls.getObject());

    const overlay = document.getElementById('overlay');
    overlay.addEventListener('click', () => controls.lock());

    controls.addEventListener('lock', () => { overlay.style.display = 'none'; });
    controls.addEventListener('unlock', () => { overlay.style.display = 'flex'; });

    const keys = { w: false, a: false, s: false, d: false };
    document.addEventListener('keydown', e => {
      if (e.code === 'KeyW') keys.w = true;
      if (e.code === 'KeyA') keys.a = true;
      if (e.code === 'KeyS') keys.s = true;
      if (e.code === 'KeyD') keys.d = true;
    });
    document.addEventListener('keyup', e => {
      if (e.code === 'KeyW') keys.w = false;
      if (e.code === 'KeyA') keys.a = false;
      if (e.code === 'KeyS') keys.s = false;
      if (e.code === 'KeyD') keys.d = false;
    });

    // Player state
    const player = {
      velocity: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      speed: 5,
      height: 1.7,
      radius: 0.4,
      lastPortal: null,
      cooldown: 0
    };

    // ─── Portal Teleportation ────────────────────────────────────────────────
    function teleportThrough(enteringPortal) {
      const exit = enteringPortal.otherPortal;
      if (!exit) return;

      // Get the direction the exit portal faces
      const exitDir = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, exit.rotationY, 0));
      // The entry direction
      const entryDir = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, enteringPortal.rotationY, 0));

      // New position: at the exit portal, pushed forward slightly
      const offset = exitDir.clone().multiplyScalar(2.0);
      camera.position.copy(exit.position).add(offset);
      camera.position.y = player.height;

      // Orient camera in the exit direction (mirror the entry direction)
      // We want to look in the direction the exit portal faces
      const lookTarget = camera.position.clone().add(exitDir);
      camera.lookAt(lookTarget);

      player.lastPortal = enteringPortal;
      player.cooldown = 0.5;
    }

    // ─── Collision with walls ────────────────────────────────────────────────
    const WALL_BOUNDS = 9.5; // slightly inside the 10-unit walls

    function clampToRoom(pos) {
      pos.x = Math.max(-WALL_BOUNDS, Math.min(WALL_BOUNDS, pos.x));
      pos.z = Math.max(-WALL_BOUNDS, Math.min(WALL_BOUNDS, pos.z));
    }

    // ─── Animation Loop ─────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    let teleportCooldown = 0;

    function animate() {
      requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);

      // Player movement
      if (controls.isLocked) {
        player.direction.set(0, 0, 0);
        if (keys.w) player.direction.z -= 1;
        if (keys.s) player.direction.z += 1;
        if (keys.a) player.direction.x -= 1;
        if (keys.d) player.direction.x += 1;
        player.direction.normalize();

        // Apply movement relative to camera facing
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        camDir.y = 0;
        camDir.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(camDir, new THREE.Vector3(0, 1, 0));

        const move = new THREE.Vector3();
        move.addScaledVector(camDir, -player.direction.z * player.speed * delta);
        move.addScaledVector(right, player.direction.x * player.speed * delta);

        camera.position.add(move);
        camera.position.y = player.height;
        clampToRoom(camera.position);

        // Animate portal light pulse
        const t = clock.elapsedTime;
        pLight1.intensity = 2 + Math.sin(t * 2) * 0.5;
        pLight2.intensity = 2 + Math.sin(t * 2 + Math.PI) * 0.5;
      }

      teleportCooldown -= delta;

      // Portal collision check
      if (teleportCooldown <= 0) {
        const p1Inside = portal1.isInside(camera.position);
        const p2Inside = portal2.isInside(camera.position);

        if (p1Inside && player.lastPortal !== portal1) {
          teleportThrough(portal1);
          teleportCooldown = 0.8;
        } else if (p2Inside && player.lastPortal !== portal2) {
          teleportThrough(portal2);
          teleportCooldown = 0.8;
        }
      }

      // Update portal cameras
      portal1.updateCamera();
      portal2.updateCamera();

      // Render portal views
      const prevBg = renderer.getClearColor(new THREE.Color());
      const prevRt = renderer.getRenderTarget();

      // Render portal 1's view (from portal2 camera)
      renderer.setRenderTarget(portal1.renderTarget);
      renderer.setClearColor(0x000000, 1);
      renderer.clear();
      renderer.render(scene, portal1.camera);

      // Render portal 2's view (from portal1 camera)
      renderer.setRenderTarget(portal2.renderTarget);
      renderer.setClearColor(0x000000, 1);
      renderer.clear();
      renderer.render(scene, portal2.camera);

      // Restore
      renderer.setRenderTarget(prevRt);
      renderer.setClearColor(prevBg);

      // Render main scene
      renderer.render(scene, camera);
    }

    animate();

    // ─── Resize ──────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });

    // ─── Expose globals ──────────────────────────────────────────────────────
    window.scene = scene;
    window.camera = camera;
    window.renderer = renderer;
    window.portal1 = portal1;
    window.portal2 = portal2;
    window.player = player;