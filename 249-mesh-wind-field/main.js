import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import GUI from 'three/addons/libs/lil-gui.module.min.js';

    // ─────────────────────────────────────────────────────────────────────────
    // SIMPLEX NOISE (3D) — embedded, no dependency needed
    // Based on Stefan Gustavson's implementation
    // ─────────────────────────────────────────────────────────────────────────
    class SimplexNoise {
      constructor(seed = Math.random() * 65536) {
        this._p = new Uint8Array(256);
        this._perm = new Uint8Array(512);
        this._permMod12 = new Uint8Array(512);

        // Seeded shuffle
        const s = [];
        for (let i = 0; i < 256; i++) s[i] = i;
        let n = seed;
        for (let i = 255; i > 0; i--) {
          n = (n * 16807) % 2147483647;
          const j = n % (i + 1);
          [s[i], s[j]] = [s[j], s[i]];
        }
        for (let i = 0; i < 256; i++) this._p[i] = s[i];
        for (let i = 0; i < 512; i++) {
          this._perm[i]      = this._p[i & 255];
          this._permMod12[i] = this._perm[i] % 12;
        }
      }

      // Gradient vectors for 3D
      static grad3 = [
        [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
        [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
        [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
      ];

      // 3D Simplex noise
      noise3D(x, y, z) {
        const F3 = 1/3, G3 = 1/6;
        const { _perm: p, _permMod12: p12 } = this;

        // Skew input space
        const s = (x+y+z)*F3;
        const i = Math.floor(x+s), j = Math.floor(y+s), k = Math.floor(z+s);
        const t = (i+j+k)*G3;
        const x0 = x-(i-t), y0 = y-(j-t), z0 = z-(k-t);

        // Determine simplex
        let i1, j1, k1, i2, j2, k2;
        if (x0 >= y0) {
          if (y0 >= z0)       { i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; }
          else if (x0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; }
          else                { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; }
        } else {
          if (y0 < z0)        { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; }
          else if (x0 < z0)  { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; }
          else               { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; }
        }

        const x1=x0-i1+G3, y1=y0-j1+G3, z1=z0-k1+G3;
        const x2=x0-i2+2*G3, y2=y0-j2+2*G3, z2=z0-k2+2*G3;
        const x3=x0-1+3*G3, y3=y0-1+3*G3, z3=z0-1+3*G3;

        const ii=i&255, jj=j&255, kk=k&255;

        let n = 0;
        const dot = (g, x,y,z) => g[0]*x + g[1]*y + g[2]*z;

        let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
        if (t0 > 0) {
          t0 *= t0;
          const gi0 = p12[ii+p[jj+p[kk]]];
          n += t0*t0 * dot(SimplexNoise.grad3[gi0], x0,y0,z0);
        }

        let t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
        if (t1 > 0) {
          t1 *= t1;
          const gi1 = p12[ii+i1+p[jj+j1+p[kk+k1]]];
          n += t1*t1 * dot(SimplexNoise.grad3[gi1], x1,y1,z1);
        }

        let t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
        if (t2 > 0) {
          t2 *= t2;
          const gi2 = p12[ii+i2+p[jj+j2+p[kk+k2]]];
          n += t2*t2 * dot(SimplexNoise.grad3[gi2], x2,y2,z2);
        }

        let t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
        if (t3 > 0) {
          t3 *= t3;
          const gi3 = p12[ii+1+p[jj+1+p[kk+1]]];
          n += t3*t3 * dot(SimplexNoise.grad3[gi3], x3,y3,z3);
        }

        // Scale to [-1, 1]
        return 32 * n;
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SCENE SETUP
    // ─────────────────────────────────────────────────────────────────────────
    const scene    = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e17);
    scene.fog        = new THREE.FogExp2(0x0a0e17, 0.018);

    const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500);
    camera.position.set(35, 25, 35);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    document.body.appendChild(renderer.domElement);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping  = true;
    controls.dampingFactor  = 0.06;
    controls.maxPolarAngle  = Math.PI * 0.48;
    controls.minDistance    = 8;
    controls.maxDistance     = 120;

    // ─────────────────────────────────────────────────────────────────────────
    // PARAMETERS
    // ─────────────────────────────────────────────────────────────────────────
    const params = {
      windSpeed   : 1.5,
      turbulence  : 1.2,
      arrowDensity: 18,       // arrows per row/col (grid = density^2)
      arrowScale  : 0.55,
      gustRadius  : 8,
      gustStrength: 4.0,
      timeFlow    : true,
    };

    const GRID = params.arrowDensity;
    const COUNT = GRID * GRID;   // total arrows

    // ─────────────────────────────────────────────────────────────────────────
    // GROUND PLANE + GRID
    // ─────────────────────────────────────────────────────────────────────────
    // Subtle grid helper
    const gridHelper = new THREE.GridHelper(60, 30, 0x1a2744, 0x111d35);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Ground mesh (very faint)
    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshBasicMaterial({
      color: 0x0d1520,
      transparent: true,
      opacity: 0.6,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    scene.add(ground);

    // ─────────────────────────────────────────────────────────────────────────
    // INSTANCED ARROWS  (ConeGeometry → InstancedMesh)
    // ─────────────────────────────────────────────────────────────────────────
    // Arrow: cone tip + short cylinder shaft
    const arrowGroup = new THREE.Group();

    const coneGeo  = new THREE.ConeGeometry(0.12, 0.4, 6);
    const shaftGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 6);

    // Offset shaft so the whole arrow is centered on its base
    shaftGeo.translate(0, -0.375, 0);
    coneGeo.translate(0, -0.15, 0);  // cone tip up

    // Merge geometries manually into one BufferGeometry
    const mergedGeo = mergeGeometries([shaftGeo, coneGeo]);

    // Material template (used for color reference via instanceColor)
    const arrowMat = new THREE.MeshPhongMaterial({
      vertexColors: true,
      shininess: 60,
    });

    const instancedArrows = new THREE.InstancedMesh(mergedGeo, arrowMat, COUNT);
    instancedArrows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instancedArrows.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(COUNT * 3), 3
    );
    scene.add(instancedArrows);

    // ─────────────────────────────────────────────────────────────────────────
    // SIMPLEX NOISE + POSITION GRID
    // ─────────────────────────────────────────────────────────────────────────
    const simplex  = new SimplexNoise(42);
    const time     = { value: 0 };

    // Store base (grid) positions
    const basePositions = [];
    const spacing = 60 / GRID;

    for (let ix = 0; ix < GRID; ix++) {
      for (let iz = 0; iz < GRID; iz++) {
        basePositions.push({
          x: (ix - GRID / 2 + 0.5) * spacing,
          z: (iz - GRID / 2 + 0.5) * spacing,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WIND GUST SYSTEM
    // ─────────────────────────────────────────────────────────────────────────
    const gusts = []; // { x, z, age, maxAge }

    // Raycaster for click → gust
    const raycaster  = new THREE.Raycaster();
    const mouseNDC   = new THREE.Vector2();
    const clickPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    function onPointerDown(e) {
      mouseNDC.x =  (e.clientX / innerWidth)  * 2 - 1;
      mouseNDC.y = -(e.clientY / innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouseNDC, camera);

      const hit = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(clickPlane, hit)) {
        // Only add gust if drag distance is small (distinguish click vs drag)
        gusts.push({ x: hit.x, z: hit.z, age: 0, maxAge: 2.5 });
      }
    }

    let dragStart = null;
    function onPointerMove(e) {
      if (e.buttons !== 1) return;
      if (dragStart === null) {
        dragStart = { x: e.clientX, y: e.clientY };
        return;
      }
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      if (Math.sqrt(dx*dx + dy*dy) > 6) {
        // It's a drag — skip gust creation
        gusts.length = 0;
        dragStart    = null;
      }
    }
    function onPointerUp(e) {
      if (!dragStart) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      if (Math.sqrt(dx*dx + dy*dy) < 7) {
        onPointerDown(e);
      }
      dragStart = null;
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup',   onPointerUp);

    // ─────────────────────────────────────────────────────────────────────────
    // COLOR MAPPING  (blue=slow, red=fast)
    // ─────────────────────────────────────────────────────────────────────────
    const _col = new THREE.Color();
    function speedColor(speed, maxSpeed) {
      const t = Math.min(speed / maxSpeed, 1);
      // t=0 → blue, t=0.5 → cyan, t=1 → red
      _col.setHSL(0.6 - t * 0.6, 0.9, 0.55);
      return _col;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ANIMATION LOOP
    // ─────────────────────────────────────────────────────────────────────────
    const dummy   = new THREE.Object3D();
    const upVec   = new THREE.Vector3(0, 1, 0);
    const dirVec  = new THREE.Vector3();
    const maxSpeed = params.windSpeed * 2;

    function animate() {
      requestAnimationFrame(animate);

      if (params.timeFlow) time.value += 0.012;

      // ── Age & cull old gusts ──
      for (let i = gusts.length - 1; i >= 0; i--) {
        gusts[i].age += 0.016;
        if (gusts[i].age > gusts[i].maxAge) gusts.splice(i, 1);
      }

      // ── Update each arrow instance ──
      for (let i = 0; i < COUNT; i++) {
        const bp = basePositions[i];

        // 3D noise sample: x, z from grid, y from time
        const nx = (bp.x * 0.06) + time.value * 0.3;
        const ny =  bp.z * 0.06;
        const nz =  time.value * 0.2;

        const angle1 = simplex.noise3D(nx,             ny,             nz)   * Math.PI * 2;
        const angle2 = simplex.noise3D(nx + 31.7,  ny + 17.3,  nz + 11.1) * Math.PI * 2;
        const angle3 = simplex.noise3D(nx + 71.3,  ny + 53.9,  nz + 23.7) * Math.PI * 2;

        const windAngle = (angle1 + angle2 * params.turbulence * 0.5 + angle3 * params.turbulence * 0.25)
                          / (1 + params.turbulence * 0.75);

        const speed = (0.5 + 0.5 * (Math.sin(angle2 * 1.3 + angle1) * 0.5 + 0.5)) * params.windSpeed;

        // ── Gust influence ──
        let gustBoost = 0;
        for (const g of gusts) {
          const dx   = bp.x - g.x;
          const dz   = bp.z - g.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          const envelope = Math.max(0, 1 - dist / params.gustRadius);
          const falloff  = Math.sin((g.age / g.maxAge) * Math.PI); // bell curve
          gustBoost += envelope * falloff * params.gustStrength;
        }

        const totalSpeed = Math.min(speed + gustBoost, maxSpeed * 1.5);
        const dirAngle  = windAngle;

        dirVec.set(Math.cos(dirAngle), 0.2, Math.sin(dirAngle)).normalize();

        // ── Position ──
        dummy.position.set(bp.x, 0, bp.z);

        // ── Orientation: align +Y arrow to wind direction ──
        dummy.quaternion.setFromUnitVectors(upVec, dirVec);

        // ── Scale ──
        const sc = params.arrowScale * (0.4 + 0.6 * (totalSpeed / maxSpeed));
        dummy.scale.set(sc, sc, sc);

        dummy.updateMatrix();
        instancedArrows.setMatrixAt(i, dummy.matrix);

        // ── Color ──
        const col = speedColor(totalSpeed, maxSpeed);
        instancedArrows.instanceColor.setXYZ(i, col.r, col.g, col.b);
      }

      instancedArrows.instanceMatrix.needsUpdate = true;
      instancedArrows.instanceColor.needsUpdate = true;

      controls.update();
      renderer.render(scene, camera);
    }

    animate();

    // ─────────────────────────────────────────────────────────────────────────
    // AUTO-RESIZE
    // ─────────────────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // lil-gui CONTROLS
    // ─────────────────────────────────────────────────────────────────────────
    const gui = new GUI({ title: 'Wind Field Controls' });

    const folderWind = gui.addFolder('Wind');
    folderWind.add(params, 'windSpeed',   0.1, 5.0, 0.1).name('Wind Speed');
    folderWind.add(params, 'turbulence',   0.0, 3.0, 0.05).name('Turbulence');
    folderWind.add(params, 'timeFlow').name('Animate Flow');

    const folderArrow = gui.addFolder('Arrows');
    folderArrow.add(params, 'arrowDensity', 5, 30, 1).name('Density').onChange(() => {
      // Density change requires scene rebuild — warn user
      console.warn('Density change requires page refresh for full effect.');
    });
    folderArrow.add(params, 'arrowScale', 0.1, 2.0, 0.05).name('Arrow Scale');

    const folderGust = gui.addFolder('Gust');
    folderGust.add(params, 'gustRadius',   2, 20, 0.5).name('Radius');
    folderGust.add(params, 'gustStrength', 0.5, 10, 0.5).name('Strength');

    gui.open();

    // ─────────────────────────────────────────────────────────────────────────
    // UTILITY: merge BufferGeometry objects (like THREE.BufferGeometryUtils)
    // ─────────────────────────────────────────────────────────────────────────
    function mergeGeometries(geos) {
      let totalVerts = 0, totalIndices = 0;
      geos.forEach(g => {
        totalVerts   += g.attributes.position.count;
        if (g.index) totalIndices += g.index.count;
      });

      const positions  = new Float32Array(totalVerts * 3);
      const normals    = new Float32Array(totalVerts * 3);
      const indices    = totalIndices > 0 ? new Uint32Array(totalIndices) : null;

      let vOff = 0, iOff = 0, vBase = 0;
      for (const g of geos) {
        const pos = g.attributes.position.array;
        const nor = g.attributes.normal.array;
        positions.set(pos, vOff * 3);
        normals.set(nor, vOff * 3);
        if (g.index) {
          const idx = g.index.array;
          for (let k = 0; k < idx.length; k++) indices[iOff + k] = idx[k] + vBase;
          iOff += idx.length;
        }
        vBase += g.attributes.position.count;
        vOff  += g.attributes.position.count;
      }

      const merged = new THREE.BufferGeometry();
      merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      merged.setAttribute('normal',   new THREE.BufferAttribute(normals,   3));
      if (indices) merged.setIndex(new THREE.BufferAttribute(indices, 1));
      return merged;
    }