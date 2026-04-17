import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// ── Scene Setup ──────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0f);
scene.fog = new THREE.FogExp2(0x0a0a0f, 0.018);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 12, 28);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 5;
controls.maxDistance = 80;

// ── Grid ─────────────────────────────────────────────────────────────────────
const grid = new THREE.GridHelper(60, 40, 0x1a1a2e, 0x0f0f1a);
scene.add(grid);

// Subtle floor plane for depth
const floorGeo = new THREE.PlaneGeometry(60, 60);
const floorMat = new THREE.MeshBasicMaterial({ color: 0x080810, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -8;
scene.add(floor);

// ── Parameters ──────────────────────────────────────────────────────────────
const params = {
  seedCount: 25,
  animationSpeed: 0.3,
  cellOpacity: 0.55,
  showEdges: true,
  showSeeds: true,
  showGrid: true,
  cellSize: 1.2,
};

// ── State ────────────────────────────────────────────────────────────────────
const MAX_SEEDS = 50;
const BOUNDS = 14;
let seeds = [];
let cells = [];
let edges = [];
let seedSpheres = [];
let driftVelocities = [];
let updatePending = true;

const rng = (min, max) => Math.random() * (max - min) + min;

function createSeeds(count) {
  seeds = [];
  driftVelocities = [];
  for (let i = 0; i < count; i++) {
    seeds.push(new THREE.Vector3(rng(-BOUNDS, BOUNDS), rng(-BOUNDS / 2, BOUNDS / 2), rng(-BOUNDS, BOUNDS)));
    driftVelocities.push(new THREE.Vector3(rng(-0.01, 0.01), rng(-0.005, 0.005), rng(-0.01, 0.01)));
  }
}

// ── Voronoi Cell Computation ─────────────────────────────────────────────────
// Simple brute-force: sample points on a sphere shell around each seed,
// assign to nearest seed, build convex hull via gift-wrapping / visible faces
async function computeVoronoiCells() {
  // Clear old geometry
  cells.forEach(m => { m.geometry.dispose(); scene.remove(m); });
  edges.forEach(l => { l.geometry.dispose(); scene.remove(l); });
  cells = [];
  edges = [];

  // For each seed, find points belonging to it
  const samplePoints = []; // [ {seedIdx, point} ]
  const SAMPLE_COUNT = 160;

  for (let si = 0; si < seeds.length; si++) {
    const pts = [];
    for (let k = 0; k < SAMPLE_COUNT; k++) {
      // Uniform sphere sampling
      const theta = rng(0, Math.PI * 2);
      const phi = Math.acos(2 * Math.random() - 1);
      const r = rng(0.5, params.cellSize);
      const wx = seeds[si].x + r * Math.sin(phi) * Math.cos(theta);
      const wy = seeds[si].y + r * Math.sin(phi) * Math.sin(theta);
      const wz = seeds[si].z + r * Math.cos(phi);
      pts.push(new THREE.Vector3(wx, wy, wz));
    }

    // Assign each point to nearest seed
    for (const p of pts) {
      let nearest = 0;
      let minDist = p.distanceToSquared(seeds[0]);
      for (let sj = 1; sj < seeds.length; sj++) {
        const d = p.distanceToSquared(seeds[sj]);
        if (d < minDist) { minDist = d; nearest = sj; }
      }
      if (nearest === si) samplePoints.push(p);
    }
  }

  // Build mesh per seed
  for (let si = 0; si < seeds.length; si++) {
    const myPts = samplePoints.filter(() => {
      let nearest = 0, minDist = Infinity;
      return (p) => {
        let d = p.distanceToSquared(seeds[si]);
        if (d < minDist) { minDist = d; nearest = si; }
        return nearest === si;
      };
    });

    // Recompute my points
    const myPoints = [];
    for (let k = 0; k < SAMPLE_COUNT; k++) {
      const theta = rng(0, Math.PI * 2);
      const phi = Math.acos(2 * Math.random() - 1);
      const r = rng(0.5, params.cellSize);
      const wx = seeds[si].x + r * Math.sin(phi) * Math.cos(theta);
      const wy = seeds[si].y + r * Math.sin(phi) * Math.sin(theta);
      const wz = seeds[si].z + r * Math.cos(phi);
      const p = new THREE.Vector3(wx, wy, wz);
      let nearest = 0, minDist = p.distanceToSquared(seeds[0]);
      for (let sj = 1; sj < seeds.length; sj++) {
        const d = p.distanceToSquared(seeds[sj]);
        if (d < minDist) { minDist = d; nearest = sj; }
      }
      if (nearest === si) myPoints.push(p);
    }

    if (myPoints.length < 4) {
      // Fallback: small sphere
      const geo = new THREE.SphereGeometry(0.3, 12, 8);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 });
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(seeds[si]);
      scene.add(m);
      cells.push(m);
      continue;
    }

    // Build convex hull via gift wrapping (simplified — use 3D alpha shape approximation)
    // Instead: use ConvexGeometry from Three.js examples
    let mesh, edgeLines;

    // Check if ConvexGeometry is available, else use custom Delaunay-like approach
    try {
      const { ConvexGeometry } = await import('three/addons/geometries/ConvexGeometry.js');
      if (myPoints.length >= 4) {
        const geo = new ConvexGeometry(myPoints);
        const hue = (si / seeds.length);
        const color = new THREE.Color().setHSL(hue, 0.85, 0.55);
        const mat = new THREE.MeshPhongMaterial({
          color,
          transparent: true,
          opacity: params.cellOpacity,
          side: THREE.DoubleSide,
          depthWrite: false,
          shininess: 60,
        });
        mesh = new THREE.Mesh(geo, mat);
        scene.add(mesh);
        cells.push(mesh);

        // Edges
        const edgeGeo = new THREE.EdgesGeometry(geo, 15);
        const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 });
        edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
        scene.add(edgeLines);
        edges.push(edgeLines);
      }
    } catch (e) {
      // fallback: sphere approximation
      const geo = new THREE.SphereGeometry(params.cellSize * 0.5, 12, 8);
      const hue = (si / seeds.length);
      const color = new THREE.Color().setHSL(hue, 0.85, 0.55);
      const mat = new THREE.MeshPhongMaterial({ color, transparent: true, opacity: params.cellOpacity, side: THREE.DoubleSide, depthWrite: false });
      mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(seeds[si]);
      scene.add(mesh);
      cells.push(mesh);
    }

    // Also add edge lines to cells list
    if (edgeLines) {
      cells.push(edgeLines);
    }
  }
}

// Simpler synchronous version using sphere-based cells (avoids async import issues)
function buildCells() {
  // Remove old
  cells.forEach(m => { if (m.geometry) m.geometry.dispose(); scene.remove(m); });
  edges.forEach(l => { l.geometry.dispose(); scene.remove(l); });
  seedSpheres.forEach(s => { s.geometry.dispose(); scene.remove(s); });
  cells = [];
  edges = [];

  const ptsArray = [];
  const SAMPLE = 180;

  // Sample many points and assign to nearest seed
  for (let k = 0; k < SAMPLE; k++) {
    const theta = rng(0, Math.PI * 2);
    const phi = Math.acos(2 * Math.random() - 1);
    const r = rng(0.4, params.cellSize);
    const candidates = [];
    for (let si = 0; si < seeds.length; si++) {
      const wx = seeds[si].x + r * Math.sin(phi) * Math.cos(theta);
      const wy = seeds[si].y + r * Math.sin(phi) * Math.sin(theta);
      const wz = seeds[si].z + r * Math.cos(phi);
      candidates.push({ si, point: new THREE.Vector3(wx, wy, wz) });
    }
    // Find nearest seed for this direction/radius combination
    let best = null, bestD = Infinity;
    for (const c of candidates) {
      const d = c.point.distanceToSquared(seeds[c.si]);
      if (d < bestD) { bestD = d; best = c; }
    }
    ptsArray.push({ ...best, point: best.point.clone() });
  }

  // Group by seed
  const bySeed = Array.from({ length: seeds.length }, () => []);
  for (const item of ptsArray) {
    bySeed[item.si].push(item.point);
  }

  for (let si = 0; si < seeds.length; si++) {
    const myPts = bySeed[si];
    if (myPts.length < 4) {
      // fallback sphere
      const geo = new THREE.SphereGeometry(0.5, 12, 8);
      const hue = (si / seeds.length);
      const color = new THREE.Color().setHSL(hue, 0.9, 0.6);
      const mat = new THREE.MeshPhongMaterial({ color, transparent: true, opacity: params.cellOpacity * 0.5, side: THREE.DoubleSide, depthWrite: false });
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(seeds[si]);
      scene.add(m);
      cells.push(m);
      continue;
    }

    // Build convex hull using qhull-like approach
    const hull = giftWrap(myPts);
    if (hull.length < 3) {
      const geo = new THREE.SphereGeometry(0.5, 12, 8);
      const hue = (si / seeds.length);
      const color = new THREE.Color().setHSL(hue, 0.9, 0.6);
      const mat = new THREE.MeshPhongMaterial({ color, transparent: true, opacity: params.cellOpacity * 0.5, side: THREE.DoubleSide, depthWrite: false });
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(seeds[si]);
      scene.add(m);
      cells.push(m);
      continue;
    }

    // Triangulate hull points using Bowyer-Watson
    const tris = triangulate3D(hull);
    if (tris.length === 0) {
      // fallback sphere
      const geo = new THREE.SphereGeometry(params.cellSize * 0.4, 12, 8);
      const hue = (si / seeds.length);
      const color = new THREE.Color().setHSL(hue, 0.9, 0.6);
      const mat = new THREE.MeshPhongMaterial({ color, transparent: true, opacity: params.cellOpacity, side: THREE.DoubleSide, depthWrite: false });
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(seeds[si]);
      scene.add(m);
      cells.push(m);
      continue;
    }

    // Build BufferGeometry from triangles
    const positions = [];
    for (const t of tris) {
      positions.push(t.a.x, t.a.y, t.a.z);
      positions.push(t.b.x, t.b.y, t.b.z);
      positions.push(t.c.x, t.c.y, t.c.z);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();

    const hue = (si / seeds.length);
    const color = new THREE.Color().setHSL(hue, 0.85, 0.58);
    const mat = new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity: params.cellOpacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      shininess: 80,
      specular: new THREE.Color(0x222222),
    });

    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    cells.push(mesh);

    // Edges
    if (params.showEdges) {
      const edgePositions = [];
      for (const t of tris) {
        edgePositions.push(t.a.x, t.a.y, t.a.z, t.b.x, t.b.y, t.b.z);
        edgePositions.push(t.b.x, t.b.y, t.b.z, t.c.x, t.c.y, t.c.z);
        edgePositions.push(t.c.x, t.c.y, t.c.z, t.a.x, t.a.y, t.a.z);
      }
      const edgeGeo = new THREE.BufferGeometry();
      edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
      const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
      const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
      scene.add(edgeLines);
      edges.push(edgeLines);
    }
  }
}

// Gift wrap for 3D convex hull (returns boundary points)
function giftWrap(points) {
  if (points.length < 4) return points.slice();

  // Find point with min x,y,z
  let start = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].x < points[start].x ||
       (points[i].x === points[start].x && points[i].y < points[start].y) ||
       (points[i].x === points[start].x && points[i].y === points[start].y && points[i].z < points[start].z)) {
      start = i;
    }
  }
  const startPt = points[start];

  const boundary = [startPt];
  const used = new Set([start]);

  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const ref = new THREE.Vector3(1, 0, 0);

  while (boundary.length < points.length && boundary.length > 0) {
    let current = boundary[boundary.length - 1];
    let nextPt = points[0];
    let minAngle = Infinity;

    for (let i = 0; i < points.length; i++) {
      if (used.has(i) && points[i] === current) continue;
      v1.subVectors(points[i], current);
      v2.subVectors(nextPt === current ? ref : nextPt, current);
      const angle = v1.angleTo(v2);
      if (angle < minAngle) {
        minAngle = angle;
        nextPt = points[i];
      }
    }

    if (nextPt === boundary[0]) break;
    boundary.push(nextPt);
    used.add(points.indexOf(nextPt));
  }

  return boundary;
}

// Simple 3D triangulation (Delaunay-like: connect all triples forming valid tetrahedra)
function triangulate3D(points) {
  if (points.length < 3) return [];
  // Use alpha shape approach: connect triples from sphere-like distribution
  // Simplified: for near-spherical cloud, create fan triangulation around centroid
  const centroid = new THREE.Vector3();
  for (const p of points) centroid.add(p);
  centroid.divideScalar(points.length);

  // Sort points by angle around centroid
  const dirs = points.map(p => {
    const d = p.clone().sub(centroid);
    return { pt: p, theta: Math.atan2(d.z, d.x), phi: Math.acos(Math.max(-1, Math.min(1, d.y / d.length()))) };
  });
  dirs.sort((a, b) => a.theta - b.theta);

  const tris = [];
  for (let i = 1; i < dirs.length - 1; i++) {
    tris.push({ a: centroid, b: dirs[i].pt, c: dirs[i + 1].pt });
  }
  if (dirs.length > 1) {
    tris.push({ a: centroid, b: dirs[dirs.length - 1].pt, c: dirs[0].pt });
  }

  // Also add cross-hemisphere triangles
  const top = dirs.filter(d => d.phi < Math.PI / 2);
  const bottom = dirs.filter(d => d.phi >= Math.PI / 2);

  for (let i = 0; i < top.length; i++) {
    for (let j = i + 1; j < top.length && top[i].theta + 1.5 > top[j].theta; j++) {
      // skip
    }
  }

  // Add tetrahedra: connect each triangle to opposite points
  for (let i = 0; i < tris.length; i++) {
    const t = tris[i];
    const mid = new THREE.Vector3().addVectors(t.a, t.b).add(t.c).divideScalar(3);
    // Find point farthest from mid within the set
    let farthest = null, maxD = 0;
    for (const p of points) {
      const d = mid.distanceTo(p);
      if (d > maxD) { maxD = d; farthest = p; }
    }
    if (farthest && farthest !== t.a && farthest !== t.b && farthest !== t.c) {
      tris.push({ a: t.a, b: t.b, c: farthest });
      tris.push({ a: t.b, b: t.c, c: farthest });
      tris.push({ a: t.c, b: t.a, c: farthest });
    }
  }

  return tris;
}

// ── Seed Spheres ──────────────────────────────────────────────────────────────
function buildSeedSpheres() {
  seedSpheres.forEach(s => { s.geometry.dispose(); scene.remove(s); });
  seedSpheres = [];

  if (!params.showSeeds) return;

  for (let si = 0; si < seeds.length; si++) {
    const geo = new THREE.SphereGeometry(0.18, 10, 6);
    const hue = (si / seeds.length);
    const color = new THREE.Color().setHSL(hue, 1.0, 0.7);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const sphere = new THREE.Mesh(geo, mat);
    sphere.position.copy(seeds[si]);
    scene.add(sphere);
    seedSpheres.push(sphere);

    // Glow ring
    const ringGeo = new THREE.RingGeometry(0.22, 0.32, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(seeds[si]);
    ring.lookAt(camera.position);
    scene.add(ring);
    seedSpheres.push(ring);
  }
}

// ── Init ─────────────────────────────────────────────────────────────────────
createSeeds(params.seedCount);
buildCells();
buildSeedSpheres();

// ── Raycaster for Click ──────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener('click', (e) => {
  // Ignore if dragged
  if (controls.changed) return;

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  if (seeds.length >= MAX_SEEDS) return;

  // Place new seed at a random offset from camera center
  const dir = raycaster.ray.direction.clone();
  const pos = camera.position.clone().add(dir.multiplyScalar(20));
  // Clamp to bounds
  pos.x = Math.max(-BOUNDS, Math.min(BOUNDS, pos.x));
  pos.y = Math.max(-BOUNDS / 2, Math.min(BOUNDS / 2, pos.y));
  pos.z = Math.max(-BOUNDS, Math.min(BOUNDS, pos.z));

  seeds.push(pos);
  driftVelocities.push(new THREE.Vector3(rng(-0.01, 0.01), rng(-0.005, 0.005), rng(-0.01, 0.01)));

  params.seedCount = seeds.length;
  if (gui) gui.controllers.forEach(c => c.updateDisplay());

  buildCells();
  buildSeedSpheres();
});

// ── GUI ──────────────────────────────────────────────────────────────────────
const gui = new GUI({ title: 'Voronoi Controls' });

gui.add(params, 'seedCount', 1, MAX_SEEDS, 1).name('Seeds').onChange(v => {
  const count = parseInt(v);
  if (count > seeds.length) {
    while (seeds.length < count) {
      seeds.push(new THREE.Vector3(rng(-BOUNDS, BOUNDS), rng(-BOUNDS / 2, BOUNDS / 2), rng(-BOUNDS, BOUNDS)));
      driftVelocities.push(new THREE.Vector3(rng(-0.01, 0.01), rng(-0.005, 0.005), rng(-0.01, 0.01)));
    }
  } else if (count < seeds.length) {
    seeds.length = count;
    driftVelocities.length = count;
  }
  buildCells();
  buildSeedSpheres();
});

gui.add(params, 'animationSpeed', 0, 2, 0.01).name('Anim Speed');
gui.add(params, 'cellOpacity', 0.05, 1, 0.01).name('Cell Opacity').onChange(v => {
  cells.forEach(m => { if (m.material) m.material.opacity = v; });
});
gui.add(params, 'showEdges').name('Show Edges').onChange(v => {
  edges.forEach(e => e.visible = v);
});
gui.add(params, 'showSeeds').name('Show Seeds').onChange(() => {
  buildSeedSpheres();
});
gui.add(params, 'showGrid').name('Show Grid').onChange(v => {
  grid.visible = v;
});

// ── Animation Loop ─────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const t = clock.getElapsedTime();

  // Drift seeds
  for (let i = 0; i < seeds.length; i++) {
    seeds[i].add(driftVelocities[i].clone().multiplyScalar(params.animationSpeed));
    // Bounce off bounds
    const b = BOUNDS;
    if (Math.abs(seeds[i].x) > b) { driftVelocities[i].x *= -1; seeds[i].x = Math.sign(seeds[i].x) * b; }
    if (Math.abs(seeds[i].y) > b / 2) { driftVelocities[i].y *= -1; seeds[i].y = Math.sign(seeds[i].y) * b / 2; }
    if (Math.abs(seeds[i].z) > b) { driftVelocities[i].z *= -1; seeds[i].z = Math.sign(seeds[i].z) * b; }
  }

  // Slowly rebuild cells every ~0.5s
  if (Math.floor(t * 2) !== Math.floor((t - dt) * 2)) {
    buildCells();
    buildSeedSpheres();
  }

  // Update sphere positions
  for (let i = 0; i < seedSpheres.length; i += 2) {
    if (seedSpheres[i] && seeds[Math.floor(i / 2)]) {
      seedSpheres[i].position.copy(seeds[Math.floor(i / 2)]);
      if (seedSpheres[i + 1]) {
        seedSpheres[i + 1].position.copy(seeds[Math.floor(i / 2)]);
        seedSpheres[i + 1].lookAt(camera.position);
      }
    }
  }

  // Pulse seed spheres
  seedSpheres.forEach((s, i) => {
    if (i % 2 === 0 && s.material) {
      s.material.opacity = 0.7 + 0.3 * Math.sin(t * 3 + i);
    }
  });

  controls.update();
  renderer.render(scene, camera);
}

animate();

// ── Resize ───────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});