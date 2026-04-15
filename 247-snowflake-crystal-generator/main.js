import * as THREE from 'three';
import { OrbitControls }    from 'three/addons/controls/OrbitControls.js';
import { EffectComposer }   from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }       from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass }  from 'three/addons/postprocessing/UnrealBloomPass.js';

// ─────────────────────────────────────────────────────────────────────────────
// Scene / Camera / Renderer
// ─────────────────────────────────────────────────────────────────────────────
const scene    = new THREE.Scene();
const camera   = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping        = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// ─────────────────────────────────────────────────────────────────────────────
// Post-processing — UnrealBloom for emissive glow
// ─────────────────────────────────────────────────────────────────────────────
const composer   = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(innerWidth, innerHeight),
  1.4,   // strength
  0.5,   // radius
  0.2    // threshold
);
composer.addPass(bloomPass);

// ─────────────────────────────────────────────────────────────────────────────
// OrbitControls
// ─────────────────────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping    = true;
controls.dampingFactor     = 0.05;
controls.minDistance       = 2;
controls.maxDistance       = 12;
controls.autoRotate        = false;          // tumble handled manually

// ─────────────────────────────────────────────────────────────────────────────
// Starfield background
// ─────────────────────────────────────────────────────────────────────────────
function buildStarfield() {
  const count  = 6000;
  const geo    = new THREE.BufferGeometry();
  const pos    = new Float32Array(count * 3);
  const sizes  = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // uniform sphere distribution
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = 80 + Math.random() * 60;
    pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);
    sizes[i]       = 0.5 + Math.random() * 1.5;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.PointsMaterial({
    color:          0xffffff,
    size:           0.15,
    sizeAttenuation: true,
    transparent:   true,
    opacity:        0.9,
  });

  return new THREE.Points(geo, mat);
}

scene.add(buildStarfield());

// ─────────────────────────────────────────────────────────────────────────────
// Koch Snowflake Geometry
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Subdivide an icosahedron triangle face using Koch-like iteration.
 * Each edge is split at midpoints and the two new corners are pushed
 * outward along the face normal, creating a crystalline fractal bump.
 *
 * @param {THREE.Vector3[]} triangle  - Array of 3 Vector3 (the face corners)
 * @param {THREE.Vector3}   faceNormal - Face normal direction
 * @param {number}          iterations - Number of subdivision rounds
 * @param {number}          seed       - Random seed for variant generation
 * @returns {THREE.Vector3[]}         - Array of new triangle corners
 */
function kochSubdivideTriangle(triangle, faceNormal, iterations, seed) {
  let vertices = [...triangle];

  for (let iter = 0; iter < iterations; iter++) {
    const next = [];
    const n    = vertices.length;

    for (let i = 0; i < n; i++) {
      const a = vertices[i];
      const b = vertices[(i + 1) % n];

      // Edge midpoint
      const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);

      // Outward perturbation along face normal (randomised per edge)
      const rng    = pseudoRandom(seed + i * 31 + iter * 17);
      const scale  = 0.12 + rng() * 0.10;
      const bump   = faceNormal.clone().multiplyScalar(scale * (rng() > 0.5 ? 1 : -1));

      next.push(a.clone());          // original vertex
      next.push(mid.clone());       // midpoint
      next.push(mid.clone().add(bump)); // raised midpoint
    }

    vertices = next;
  }

  return vertices;
}

/**
 * Simple deterministic pseudo-random generator (Mulberry32).
 * Returns a function that yields [0, 1).
 */
function pseudoRandom(seed) {
  let s = seed >>> 0;
  return function () {
    s += 0x6D2B79F5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build a BufferGeometry of Koch-perturbed icosahedron faces.
 * Each triangular face is subdivided `iterations` times and triangulated.
 */
function buildKochGeometry(iterations, seed) {
  const rng    = pseudoRandom(seed);
  const detail = 1; // icosahedron detail (1 = 20 faces, cheap and clean)

  // IcosahedronGeometry gives BufferGeometry with position attribute
  const icoGeo = new THREE.IcosahedronGeometry(1.0, detail);

  // For each original triangle face, compute the new vertices
  const faceNormal = new THREE.Vector3();

  // We'll rebuild the entire position array by iterating original triangles
  const posAttr = icoGeo.attributes.position;
  const newPos  = [];
  const indices = [];

  // Number of original triangles in IcosahedronGeometry at detail=1
  // detail=1 → 20 faces (indexed)
  const faceCount = posAttr.count / 3; // 20

  for (let f = 0; f < faceCount; f++) {
    const i0 = f * 3;
    const i1 = f * 3 + 1;
    const i2 = f * 3 + 2;

    const a = new THREE.Vector3(posAttr.getX(i0), posAttr.getY(i0), posAttr.getZ(i0));
    const b = new THREE.Vector3(posAttr.getX(i1), posAttr.getY(i1), posAttr.getZ(i1));
    const c = new THREE.Vector3(posAttr.getX(i2), posAttr.getY(i2), posAttr.getZ(i2));

    // Face normal (points outward for a sphere-centred icosahedron)
    faceNormal.crossVectors(
      new THREE.Vector3().subVectors(b, a),
      new THREE.Vector3().subVectors(c, a)
    ).normalize();

    // Subdivide
    const subdivided = kochSubdivideTriangle([a, b, c], faceNormal, iterations, seed + f * 999);

    // Triangulate the fan of the subdivided polygon
    const base = newPos.length / 3;
    for (let v = 0; v < subdivided.length; v++) {
      newPos.push(subdivided[v].x, subdivided[v].y, subdivided[v].z);
    }
    // Fan triangulation (first vertex is common)
    for (let v = 1; v < subdivided.length - 1; v++) {
      indices.push(base, base + v, base + v + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(newPos, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ─────────────────────────────────────────────────────────────────────────────
// Snowflake Mesh
// ─────────────────────────────────────────────────────────────────────────────

/** Create a glowing snowflake mesh with random seed */
function createSnowflake(seed) {
  // Koch iterations (4 = good balance of detail vs vertex count)
  const geo = buildKochGeometry(4, seed);

  // Emissive ice-blue material
  const mat = new THREE.MeshStandardMaterial({
    color:             0x80c8ff,
    emissive:          new THREE.Color(0.3, 0.7, 1.0),
    emissiveIntensity: 0.8,
    roughness:         0.2,
    metalness:         0.1,
    side:              THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geo, mat);

  // Gentle tumble animation state (Euler angles)
  mesh.userData.tumble = {
    rx: (Math.random() - 0.5) * 0.3,
    ry: (Math.random() - 0.5) * 0.3,
    rz: (Math.random() - 0.5) * 0.2,
  };

  return mesh;
}

// Initial snowflake
let snowflake = createSnowflake(Date.now() % 10000);
scene.add(snowflake);

// Soft point lights to illuminate the snowflake
const light1 = new THREE.PointLight(0x88ccff, 3, 20);
light1.position.set(3, 4, 5);
scene.add(light1);

const light2 = new THREE.PointLight(0xff88cc, 2, 20);
light2.position.set(-4, -3, 2);
scene.add(light2);

const ambient = new THREE.AmbientLight(0x223355, 0.6);
scene.add(ambient);

// ─────────────────────────────────────────────────────────────────────────────
// Click → new random snowflake
// ─────────────────────────────────────────────────────────────────────────────
window.addEventListener('click', () => {
  scene.remove(snowflake);
  snowflake.geometry.dispose();
  snowflake.material.dispose();

  snowflake = createSnowflake(Math.floor(Math.random() * 99999));
  scene.add(snowflake);
});

// ─────────────────────────────────────────────────────────────────────────────
// Auto-resize
// ─────────────────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  const w = innerWidth, h = innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloomPass.resolution.set(w, h);
});

// ─────────────────────────────────────────────────────────────────────────────
// Animation loop
// ─────────────────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

(function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Tumble the snowflake with gentle, slightly irregular rotation
  if (snowflake.userData.tumble) {
    const t = snowflake.userData.tumble;
    snowflake.rotation.x += t.rx * delta + Math.sin(elapsed * 0.4) * 0.0003;
    snowflake.rotation.y += t.ry * delta + Math.cos(elapsed * 0.3) * 0.0004;
    snowflake.rotation.z += t.rz * delta;
  }

  controls.update();
  composer.render();
})();