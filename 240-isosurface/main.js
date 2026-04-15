import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
    import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

    // ─────────────────────────────────────────────────────────────────────────
    // Scene setup
    // ─────────────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0e14);

    const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
    camera.position.set(2.5, 2.0, 3.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    document.body.appendChild(renderer.domElement);

    // ─────────────────────────────────────────────────────────────────────────
    // OrbitControls
    // ─────────────────────────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 1.5;
    controls.maxDistance = 10;

    // ─────────────────────────────────────────────────────────────────────────
    // Lighting
    // ─────────────────────────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 8, 4);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x6ea8ff, 2.0, 8);
    pointLight.position.set(-3, 3, 2);
    scene.add(pointLight);

    // ─────────────────────────────────────────────────────────────────────────
    // MarchingCubes — the isosurface extractor
    //
    // MarchingCubes builds a mesh from an implicit scalar field.
    // The scene is partitioned into a grid of "cubes" (resolution × resolution × resolution).
    // At each cube corner the field value is evaluated; values above the `threshold`
    // are considered "inside" the surface. The algorithm then connects edge intersections
    // with linear interpolation to produce a triangle mesh approximating the true
    // isosurface.
    // ─────────────────────────────────────────────────────────────────────────
    const resolution = 48; // grid subdivisions per axis (higher → more detail, slower)
    const mc = new MarchingCubes(resolution, // grid resolution
                                  null,      // geometry (built internally)
                                  true,      // enable uvs — used for later texture mapping
                                  false,     // enable vertex colours
                                  500000);   // max vertex count before geometry refresh
    mc.isolation = 80;      // initial isovalue threshold (0–100 range maps to field values)
    scene.add(mc);

    // ─────────────────────────────────────────────────────────────────────────
    // Scalar field — the data the isosurface is extracted from
    //
    // The field is a combination of several radial basis functions (RBFs).
    // Each "blob" contributes a value that falls off with distance, so the
    // final field value at any point is the sum of all blob contributions.
    // The isosurface traces the set of points where this sum equals the threshold.
    // ─────────────────────────────────────────────────────────────────────────
    const blobList = [];

    /**
     * Adds a Gaussian blob (RBF) to the field at the given position.
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} strength  Positive = bump, negative = hole
     */
    function addBlob(x, y, z, strength) {
      blobList.push({ x, y, z, strength });
    }

    /** Clears all blobs and rebuilds the field in the MarchingCubes object. */
    function updateField() {
      // Reset the field (all values to 0)
      mc.reset();

      // Add each blob as a radial contribution.
      // The resolution parameter normalises the field so it sits in [0, resolution].
      for (const b of blobList) {
        mc.addBall(b.x, b.y, b.z, b.strength, resolution / 4);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Procedural blob placement
    // ─────────────────────────────────────────────────────────────────────────
    function buildDefaultField() {
      blobList.length = 0;

      // Seeded pseudo-random for reproducible layout
      const rng = (() => {
        let s = 42;
        return () => {
          s = (s * 1664525 + 1013904223) & 0xffffffff;
          return (s >>> 0) / 0xffffffff;
        };
      })();

      const count = 8;
      for (let i = 0; i < count; i++) {
        const x = (rng() - 0.5) * 0.9;
        const y = (rng() - 0.5) * 0.9;
        const z = (rng() - 0.5) * 0.9;
        const s = (rng() > 0.3 ? 1 : -1) * (0.6 + rng() * 0.7);
        addBlob(x, y, z, s);
      }

      // Soft cage — a large negative blob so the shape is partially hollowed
      addBlob(0, 0, 0, -1.8);

      updateField();
    }

    buildDefaultField();

    // ─────────────────────────────────────────────────────────────────────────
    // Material
    //
    // Using MeshStandardMaterial gives us PBR lighting (metallic/roughness)
    // which looks great on smooth organic isosurfaces.
    // ─────────────────────────────────────────────────────────────────────────
    const material = new THREE.MeshStandardMaterial({
      color: 0x4fc3f7,
      metalness: 0.25,
      roughness: 0.38,
    });
    mc.material = material;

    // ─────────────────────────────────────────────────────────────────────────
    // Helper: box wireframe to show the MarchingCubes bounding volume
    // ─────────────────────────────────────────────────────────────────────────
    const boundingBoxGeo = new THREE.BoxGeometry(1, 1, 1);
    const boundingBoxMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.06,
    });
    const boundingBox = new THREE.Mesh(boundingBoxGeo, boundingBoxMat);
    scene.add(boundingBox);

    // ─────────────────────────────────────────────────────────────────────────
    // GUI — lil-gui panels
    // ─────────────────────────────────────────────────────────────────────────
    const gui = new GUI({ title: 'Iso-surface Controls' });

    // ── Isovalue / Threshold ───────────────────────────────────────────────
    const isoFolder = gui.addFolder('Isosurface');
    isoFolder.add(mc, 'isolation', 0, 100, 0.5)
             .name('Threshold')
             .onChange(() => { /* MarchingCubes auto-updates */ });

    // ── Field complexity (number of blobs) ─────────────────────────────────
    const fieldFolder = gui.addFolder('Field Complexity');

    const fieldParams = { blobCount: 8 };
    fieldFolder.add(fieldParams, 'blobCount', 1, 24, 1)
                .name('Blob Count')
                .onChange((v) => {
                  blobList.length = 0;
                  const rng = (() => {
                    let s = Math.floor(v * 1000);
                    return () => {
                      s = (s * 1664525 + 1013904223) & 0xffffffff;
                      return (s >>> 0) / 0xffffffff;
                    };
                  })();
                  for (let i = 0; i < v; i++) {
                    const x = (rng() - 0.5) * 0.9;
                    const y = (rng() - 0.5) * 0.9;
                    const z = (rng() - 0.5) * 0.9;
                    const s = (rng() > 0.3 ? 1 : -1) * (0.6 + rng() * 0.7);
                    addBlob(x, y, z, s);
                  }
                  addBlob(0, 0, 0, -1.8);
                  updateField();
                });

    fieldFolder.add({ reset: buildDefaultField }, 'reset')
               .name('🔄 Reset Field');

    // ── Material ───────────────────────────────────────────────────────────
    const matFolder = gui.addFolder('Material');
    matFolder.addColor(material, 'color').name('Color');
    matFolder.add(material, 'metalness', 0, 1, 0.01).name('Metalness');
    matFolder.add(material, 'roughness', 0, 1, 0.01).name('Roughness');
    matFolder.add(material, 'wireframe').name('Wireframe');
    matFolder.add(material, 'flatShading').name('Flat Shading');

    // ── Display ───────────────────────────────────────────────────────────
    const dispFolder = gui.addFolder('Display');
    dispFolder.add(boundingBoxMat, 'visible').name('Show Bounding Box');
    dispFolder.add(ambientLight, 'intensity', 0, 2, 0.05).name('Ambient Light');
    dispFolder.add(dirLight, 'intensity', 0, 3, 0.05).name('Directional Light');
    dispFolder.add(pointLight, 'intensity', 0, 5, 0.1).name('Point Light');

    isoFolder.open();
    matFolder.open();

    // ─────────────────────────────────────────────────────────────────────────
    // Window resize handler
    // ─────────────────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Animation loop
    // ─────────────────────────────────────────────────────────────────────────
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }

    animate();